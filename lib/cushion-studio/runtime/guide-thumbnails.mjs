import { createStudioScene } from "./scene.mjs";
import {
  sizeOf,
  SHAPED_CONSTRUCTION_VERSION,
  squarePreviewFitsSource,
  shapeDrapeFitsSource,
  roundPreviewFitsSource,
} from "./geometry.mjs";
import { defaultVisualFill } from "./state.mjs";

/**
 * One lazy WebGL context for all guide cards. Call render only for visible cards
 * (for example from IntersectionObserver), then use its URL in an ordinary img.
 * Supply the same normalized piece used by the guide's Start action. No spec,
 * placement, fabric calibration or geometry is changed here.
 *
 * Every product uses the same 70 cm physical frame and floor baseline. Keep
 * image boxes the same size to preserve the relative cushion sizes in a pairing.
 * A null URL means retain a clearly labelled fabric-photo/text fallback.
 */
export function createGuideThumbnailRenderer({
  threeUrl,
  width = 320,
  height = 280,
  maxEntries = 48,
  textureTimeoutMs = 15000,
  productBackdrop = null,
}) {
  if (!threeUrl) throw new Error("A Three.js module URL is required.");
  if (![width, height].every((n) => Number.isInteger(n) && n >= 64 && n <= 640))
    throw new Error("Thumbnail dimensions must be between 64 and 640 pixels.");
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 96)
    throw new Error("Thumbnail cache must contain between 1 and 96 entries.");
  const cache = new Map(), pending = new Map();
  let scene, host, starting, disposed = false, queue = Promise.resolve();
  let renderError = null;

  async function ensureScene() {
    if (scene) return scene;
    if (!starting) {
      host = document.createElement("div");
      host.setAttribute("aria-hidden", "true");
      host.inert = true;
      Object.assign(host.style, {
        position: "fixed", left: "-10000px", top: "0", pointerEvents: "none",
        width: `${width}px`, height: `${height}px`, contain: "strict",
      });
      document.body.append(host);
      starting = createStudioScene(host, {
        threeUrl, pixelRatio: 1, shadowMapSize: 1024, productFrameMm: 700, productBackdrop,
        onRenderError: (message) => { renderError = message; },
      }).then((value) => {
        if (disposed) {
          value.dispose({ releaseContext: true });
          host?.remove();
          throw new Error("Thumbnail renderer disposed.");
        }
        scene = value;
        return value;
      }).catch((error) => {
        host?.remove();
        starting = null;
        throw error;
      });
    }
    return starting;
  }

  function remember(key, result) {
    cache.delete(key);
    cache.set(key, result);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
    return result;
  }

  function render({ piece, fabrics, inspectionAngle = "three-quarter", previewMaterials }) {
    // Copy at request time: a later customer edit must not alter a queued card.
    const copy = structuredClone({ piece, fabrics, previewMaterials });
    const spec = copy.piece?.spec;
    if (!spec || !Array.isArray(copy.fabrics))
      return Promise.resolve({ url: null, width, height, error: "Missing guide cushion or fabrics." });
    const size = sizeOf(spec.sizeId);
    const dimensions = {
      width, height, finishedWidthMm: size.widthMm, finishedHeightMm: size.heightMm,
    };
    const failure = (error) => ({ ...dimensions, url: null, error });
    if (disposed) return Promise.resolve(failure("Thumbnail renderer disposed."));
    if (!["straight", "three-quarter", "side"].includes(inspectionAngle))
      return Promise.resolve(failure("Unsupported inspection angle."));
    const ids = new Set([spec.fabricId, spec.pipingFabricId]);
    const sources = copy.fabrics.filter((fabric) => ids.has(fabric.id));
    const main = sources.find((fabric) => fabric.id === spec.fabricId);
    if (!main?.imageUrl || !main.calibration || !main.previewReady)
      return Promise.resolve(failure("Calibrated fabric imagery is unavailable."));
    if (spec.edge === "contrast" && !sources.some((f) => f.id === spec.pipingFabricId && f.calibration && f.imageUrl))
      return Promise.resolve(failure("Contrast fabric imagery is unavailable."));
    const shaped = spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION;
    if ((size.shape === "square" && !squarePreviewFitsSource(size, main.calibration, spec.placementMm, defaultVisualFill(spec))) ||
        (shaped && !shapeDrapeFitsSource(size, main.calibration, spec.placementMm, spec.bolsterEndPlacementMm)) ||
        (shaped && size.shape === "round" && !roundPreviewFitsSource(size, main.calibration, spec.placementMm)))
      return Promise.resolve(failure("The selected placement exceeds the calibrated fabric image."));
    const { id: ignoredId, ...visualSpec } = spec;
    const key = JSON.stringify({
      spec: visualSpec, inspectionAngle, previewMaterials: copy.previewMaterials,
      sources: sources.map(({ id, imageUrl, calibration }) => ({ id, imageUrl, calibration })).sort((a, b) => a.id.localeCompare(b.id)),
    });
    if (cache.has(key)) return Promise.resolve(remember(key, cache.get(key)));
    if (pending.has(key)) return pending.get(key);
    const task = queue.then(async () => {
      // Yield between meshes so card batches do not monopolize interaction.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (disposed) return failure("Thumbnail renderer disposed.");
      try {
        const renderer = await ensureScene();
        renderError = null;
        renderer.update({
          scene: "sofa-2", colours: { wall: "#eee9e0", floor: "#e9e4da" },
          pieces: [copy.piece],
        }, sources, {
          selectedId: spec.id, mode: "configurator", face: "front",
          inspectionAngle, animateInspection: false,
          previewMaterials: copy.previewMaterials,
        });
        let timeout;
        try {
          await Promise.race([
            renderer.ready(),
            new Promise((_, reject) => {
              timeout = setTimeout(() => reject(new Error("Fabric thumbnail timed out.")), textureTimeoutMs);
            }),
          ]);
        } finally {
          clearTimeout(timeout);
        }
        if (disposed) return failure("Thumbnail renderer disposed.");
        if (renderError) throw new Error(renderError);
        return remember(key, { ...dimensions, url: renderer.capture("image/jpeg", 0.9), error: null });
      } catch (error) {
        return failure(error instanceof Error ? error.message : "Cushion thumbnail unavailable.");
      }
    });
    pending.set(key, task);
    queue = task.then(() => undefined, () => undefined);
    void task.finally(() => pending.delete(key));
    return task;
  }

  return {
    render,
    clearCache: () => cache.clear(),
    dispose: () => {
      disposed = true;
      cache.clear();
      pending.clear();
      scene?.dispose({ releaseContext: true });
      scene = null;
      host?.remove();
    },
  };
}
