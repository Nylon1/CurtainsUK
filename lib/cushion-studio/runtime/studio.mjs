import { createStudioScene, sizeOf } from "./scene.mjs";
import {
  coverageBounds,
  pipingPreviewSegments,
  squareDrapeFootprint,
  squareDrapeFitsSource,
  squarePreviewFootprint,
  squarePreviewFitsSource,
  CUSHION_VISUAL_SIZES,
  CUSHION_ACTIVE_SIZE_IDS,
  CUSHION_LEGACY_SIZE_REPLACEMENTS,
  SHAPED_CONSTRUCTION_VERSION,
  shapeDrapeFootprints,
  shapeDrapeFitsSource,
  roundPreviewFootprint,
  roundPreviewFitsSource,
} from "./geometry.mjs";
import { planArrangement } from "./arrangement.mjs";
import { quoteReviewState, cushionReviewMarkup } from "./review.mjs";
import {
  historySnapshot,
  restoreHistory,
  createVisualFillTrial,
  selectFilling,
  fillingLabel,
  selectRangeSize,
  insertSpecificationLabel,
} from "./state.mjs";
const visualFillTrial = createVisualFillTrial();
const config = {
  apiBase: "/api/cushion-studio",
  threeUrl: "/cushion-studio/vendor/three.module.js",
  ...window.CUSHION_STUDIO_CONFIG,
};
const OrderStore = window.CurtainsUKRooms;
const orderParams = new URLSearchParams(location.search);
let editingOrderId = orderParams.get("order_item"), orderRevision = null;
const myHomeUrl = config.myHomeUrl || "/pages/build-my-rooms";
async function addToOrder(scope) {
  if (!OrderStore) return notify("Design My Home could not be loaded. Reload before adding your cushion.");
  const pieces = scope === "piece" ? [current()] : design.pieces;
  if (!pieces.length || pieces.some(p => !p?.spec.fabricId)) return notify("Choose a fabric before adding your cushion.");
  try {
    const house = OrderStore.ensure();
    await OrderStore.addCushions(design, pieces.map(p => ({...p, fabric: {id:p.spec.fabricId, design:labelOf(fabricOf(p.spec)), colour: "", imageUrl:fabricOf(p.spec)?.imageUrl || null}, label:sizeOf(p.spec.sizeId).label})), {
      expectedRevision: editingOrderId ? orderRevision : house.revision,
      editItemId: editingOrderId || undefined,
      roomId: orderParams.get("room_id") || undefined,
    });
    const link = document.createElement("a"); link.href=myHomeUrl; link.target="_top"; link.click();
  } catch(error) { notify(error.message); }
}
const internalReview = config.ownerReview === true && new URLSearchParams(location.search).get("internalReview") === "1";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  clone = (x) => structuredClone(x),
  uid = () => crypto.randomUUID(),
  escape = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const KEY = "curtainsuk-cushion-design-v1",
  COMPARE = "curtainsuk-cushion-compare-v1";
const sizes = CUSHION_VISUAL_SIZES.map(({id,label}) => [id,label]);
const activeSizes = CUSHION_ACTIVE_SIZE_IDS.map(id => [id, sizeOf(id).label]);
const guides = [
  {
    name: "Quiet texture",
    description:
      "A generous 50 cm square in soft green, with a 28 × 48 cm stripe. A simple way to bring texture into a neutral room.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-dstr237715", "rectangle-28-48"],
    ],
  },
  {
    name: "A warm focal point",
    description:
      "Let a 45 cm Bird Weave square lead. Pair it with a smaller 35 cm Amalfi square to echo the room’s softer colours.",
    pieces: [
      ["sdg-dmlf236846", "square-45"],
      ["sdg-f1239-30", "square-35"],
    ],
  },
  {
    name: "Pattern, in balance",
    description:
      "Combine a 50 cm floral square with a 38 × 58 cm stripe. Different pattern scales keep the composition relaxed.",
    pieces: [
      ["sdg-mind237581", "square-50"],
      ["sdg-dstr237715", "rectangle-38-58"],
    ],
  },
];
let dialogTrigger = null;
let guideThumbnailRenderer;
let guideThumbnailObserver;
window.addEventListener("pagehide", () => {
  guideThumbnailRenderer?.then((renderer) => renderer.dispose()).catch(() => {});
  guideThumbnailRenderer = null;
  guideThumbnailObserver?.disconnect();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && $("#guide-cards")) {
    delete $("#guide-cards").dataset.signature;
    renderGuides();
  }
});
guides.push(
  {
    name: "A corner to settle into",
    scene: "corner",
    description:
      "Repeat a 50 cm green square at the two ends, then add a smaller patterned square and a stripe near the return. Leave clear sitting space; the guided layout keeps excess pieces in the tray.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-f1239-30", "square-50"],
      ["sdg-dmlf236846", "square-45"],
      ["sdg-dstr237715", "rectangle-28-48"],
    ],
  },
  {
    name: "A double bed, simply layered",
    scene: "double-bed",
    description:
      "Try two 50 cm squares with one 28 × 48 cm stripe in front. A restrained three-piece arrangement leaves the bedding visible. Sleeping pillows shown in the scene are props, not part of this set.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-f1239-30", "square-50"],
      ["sdg-dstr237715", "rectangle-28-48"],
    ],
  },
  {
    name: "A king bed, generously layered",
    scene: "king-bed",
    description:
      "Explore two 65 cm decorative squares with smaller patterned accents and a front rectangle. Compare against your own bed width; scene proportions are illustrative.",
    pieces: [
      ["sdg-f1239-30", "bed-square-65"],
      ["sdg-f1239-30", "bed-square-65"],
      ["sdg-mind237581", "square-45"],
      ["sdg-mind237581", "square-45"],
      ["sdg-dstr237715", "rectangle-28-48"],
    ],
  },
  {
    name: "Matching, with a quieter edge",
    scene: "sofa-2",
    description:
      "Use the same Bird Weave fabric twice for a deliberate matching scheme. Self piping repeats the fabric at the edge. Each cushion has matching upright faces. Motif placement between separate cushions may vary.",
    pieces: [
      ["sdg-dmlf236846", "square-45", "self"],
      ["sdg-dmlf236846", "square-45", "self"],
    ],
  },
  {
    name: "Coordinate with the room",
    scene: "sofa-3",
    description:
      "Choose a colour already present in your curtains, rug or upholstery, then repeat it in a plain texture and a different pattern scale. This green, warm brick and stone example is a starting point; compare real samples beside your furnishings in daylight.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-dmlf236846", "square-45"],
      ["sdg-dstr237715", "rectangle-28-48"],
    ],
  },
);
let setQuote = null,
  purchaseEnabled = false,
  previewMaterials = {},
  checkoutKey = null;
let fabrics = [],
  totalFabrics = 0,
  nextOffset = null,
  design = {
    version: 1,
    id: uid(),
    name: "My cushion design",
    scene: "sofa-2",
    colours: { furniture: "#b9b8a5", wall: "#e8e3d8", floor: "#b5a18a" },
    pieces: [],
  },
  selectedId = null,
  mode = "configurator",
  face = "front",
  inspectionAngle = "three-quarter",
  camera = "wide",
  scene = null,
  history = [],
  quotes = [],
  quoteRequest = 0,
  searchRequest = 0,
  catalogueIds = [],
  catalogueExpanded = false,
  catalogueLoading = false,
  revision = 0,
  quoteTimer,
  statusTimer,
  searchTimer,
  reviewScope = "set",
  quoteLoading = false,
  comparison = null;
function current() {
  return (
    design.pieces.find((p) => p.spec.id === selectedId) || design.pieces[0]
  );
}
function fabricOf(spec) {
  return fabrics.find((f) => f.id === spec?.fabricId);
}
function labelOf(f) {
  return [f?.design || f?.name, f?.colour || f?.colourway]
    .filter(Boolean)
    .join(" · ");
}
function notify(message) {
  $("#status").textContent = message;
  $("#status").hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => ($("#status").hidden = true), 6000);
}
async function api(path, body) {
  const response = await fetch(config.apiBase + path, {
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.error ||
        "We could not complete that request. Please try again.",
    );
    error.data = data;
    throw error;
  }
  return data;
}
function persist() {
  if (editingOrderId) return; // Editing an ordered snapshot must not overwrite the saved arrangement.
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        design,
        selectedId,
        mode,
        revision,
        knownRevisions: [...knownRevisions],
      }),
    );
  } catch {
    notify(
      "Browser storage is unavailable. Use Save design to keep a server copy.",
    );
  }
}
const knownRevisions = new Map();
function remember() {
  knownRevisions.set(design.id, revision);
  history.push(historySnapshot(design, { revision, selectedId, mode }));
  if (history.length > 40) history.shift();
}
function change(fn, { quote = true } = {}) {
  remember();
  fn();
  persist();
  render();
  if (quote) scheduleQuote();
}
function placementLimits(spec, fabric) {
  const size = sizeOf(spec.sizeId),
    bounds = coverageBounds(size, fabric?.calibration);
  if (spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION && fabric?.calibration) {
    const construction = shapeDrapeFootprints(size).body,
      visual = size.shape === "round" ? roundPreviewFootprint(size.widthMm) : construction,
      footprint = {minX:Math.min(construction.minX,visual.minX),minY:Math.min(construction.minY,visual.minY),maxX:Math.max(construction.maxX,visual.maxX),maxY:Math.max(construction.maxY,visual.maxY)};
    return {
      minX: Math.max(0, Math.ceil(-footprint.minX)),
      minY: Math.max(0, Math.ceil(-footprint.minY)),
      maxX: Math.floor(fabric.calibration.physicalWidthMm - footprint.maxX),
      maxY: Math.floor(fabric.calibration.physicalHeightMm - footprint.maxY),
    };
  }
  if (size.shape !== "square" || !fabric?.calibration)
    return { minX: 0, minY: 0, maxX: bounds.x, maxY: bounds.y };
  const construction = squareDrapeFootprint(size.widthMm, size.heightMm),
    visual = squarePreviewFootprint(size.widthMm, size.heightMm, visualFillTrial.resolve(spec)),
    footprint = {
      minX: Math.min(construction.minX, visual.minX),
      minY: Math.min(construction.minY, visual.minY),
      maxX: Math.max(construction.maxX, visual.maxX),
      maxY: Math.max(construction.maxY, visual.maxY),
    };
  return {
    minX: Math.ceil(-footprint.minX),
    minY: Math.ceil(-footprint.minY),
    maxX: Math.floor(fabric.calibration.physicalWidthMm - footprint.maxX),
    maxY: Math.floor(fabric.calibration.physicalHeightMm - footprint.maxY),
  };
}
function selectSize(spec, sizeId, { announce = false } = {}) {
  const previousSize = sizeOf(spec.sizeId);
  const previousFilling = fillingLabel(spec);
  const previousRange = spec.rangeVersion;
  const previousPlacement = JSON.stringify([spec.placementMm, spec.bolsterEndPlacementMm]);
  if (!selectRangeSize(spec, sizeId)) return;
  normalisePlacement(spec);
  const notice = $("#size-change-notice");
  if (announce && notice && (previousSize.id !== sizeId || previousFilling !== fillingLabel(spec) || previousRange !== spec.rangeVersion)) {
    const placementChanged = previousPlacement !== JSON.stringify([spec.placementMm, spec.bolsterEndPlacementMm]);
    notice.textContent = `Finished cover ${previousSize.id === sizeId ? `retained at ${previousSize.label}` : `changed from ${previousSize.label} to ${sizeOf(sizeId).label}`}. ${previousFilling !== fillingLabel(spec) ? `Filling choice changed from ${previousFilling} to ${fillingLabel(spec)}. ` : ""}The current range pairing now applies; insert fit and pricing will be rechecked. ${placementChanged ? "Artwork placement was adjusted to fit the available image. " : ""}Use Undo to restore the previous specification.`;
    notice.dataset.pieceId = spec.id;
    notice.dataset.sizeId = sizeId;
  }
}
function normalisePlacement(spec) {
  const bounds = placementLimits(spec, fabricOf(spec));
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return;
  spec.placementMm = {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, spec.placementMm.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, spec.placementMm.y)),
  };
  if (sizeOf(spec.sizeId).shape === "bolster" && !spec.bolsterEndPlacementMm)
    spec.bolsterEndPlacementMm = { ...spec.placementMm };
  if (spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION && sizeOf(spec.sizeId).shape === "bolster") {
    const end = shapeDrapeFootprints(sizeOf(spec.sizeId)).end, c = fabricOf(spec)?.calibration;
    if (c) spec.bolsterEndPlacementMm = {
      x: Math.max(Math.ceil(-end.minX), Math.min(Math.floor(c.physicalWidthMm-end.maxX), spec.bolsterEndPlacementMm.x)),
      y: Math.max(Math.ceil(-end.minY), Math.min(Math.floor(c.physicalHeightMm-end.maxY), spec.bolsterEndPlacementMm.y)),
    };
  }
}
function freshPiece(fabricId) {
  return {
    spec: {
      version: 1,
      id: uid(),
      sizeId: "square-45",
      manufacturingProfile: "flat-sewn-v1",
      rangeVersion: "standard-inserts-v1",
      fabricId,
      filling: "filled",
      fillingType: "polyester",
      edge: "unpiped",
      placementMm: {
        x: Math.ceil(-squareDrapeFootprint(450, 450).minX),
        y: Math.ceil(-squareDrapeFootprint(450, 450).minY),
      },
      quantity: 1,
    },
    position: {
      slot: design.pieces.length % 3,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    },
  };
}
function setMode(next) {
  mode = next;
  face = "front";
  persist();
  render();
  window.scrollTo({
    top: 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}
function prepareShell() {
  document.body.dataset.mode = mode;
  $("#compare").setAttribute("aria-label", "Keep this version for comparison");
  $("#review-dialog").setAttribute("aria-labelledby", "review-title");
  $("#review-dialog h2").id = "review-title";
  $(".nav-current").innerHTML =
    '<button id="nav-config" class="active">1. Cushion configurator</button><span>→</span><button id="nav-layout">2. Sofa layout</button>';
  const comparisonControl = document.createElement("fieldset");
  comparisonControl.id = "square-shape-comparison";
  comparisonControl.className = "config-only";
  comparisonControl.innerHTML =
    '<legend>Square fill comparison - visual only</legend><button type="button" data-preview-shape="baseline" aria-pressed="true">Earlier drape</button> <button type="button" data-preview-shape="soft-fullness" aria-pressed="false">Accepted fuller preview</button><p class="help">Internal visual comparison only. Cutting, consumption, matching, price and ordered construction stay unchanged.</p>';
  if (internalReview) $("#scene").parentElement.append(comparisonControl);
  comparisonControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preview-shape]");
    if (!button) return;
    visualFillTrial.choose(current()?.spec, button.dataset.previewShape);
    renderScene();
  });
  $("#nav-config").onclick = () => setMode("configurator");
  $("#nav-layout").onclick = () => setMode("layout");
  const workflow = document.createElement("div");
  workflow.className = "workflow";
  workflow.innerHTML =
    '<button id="add-to-layout" class="primary">Add to my layout <span>→</span></button><button id="edit-cushion" class="primary">Edit this cushion <span>↗</span></button><p class="help">Your configured cushion keeps its fabric, finish and pattern placement.</p>';
  $(".quote").before(workflow);
  const pipingNote = document.createElement("p");
  pipingNote.id = "piping-note";
  pipingNote.className = "help";
  pipingNote.textContent =
    "Piping coordinates with your fabric. Its final appearance may vary.";
  $("#edges").after(pipingNote);
  const name = document.createElement("label");
  name.className = "field design-name";
  name.innerHTML =
    'DESIGN NAME<input id="design-name" maxlength="120" value="My cushion design">';
  $("#pieces").after(name);
  const guideSection = document.createElement("section");
  guideSection.className = "style-guides";
  guideSection.innerHTML =
    '<p class="eyebrow">A PLACE TO BEGIN</p><h2>Thoughtful pairings.</h2><p>Real fabrics, considered combinations. Make one your own.</p><div id="guide-cards"></div>';
  $(".editorial").before(guideSection);
  const starting = document.createElement("details");
  starting.className = "starting-points";
  starting.open = true;
  starting.innerHTML =
    '<summary>Find your starting point <span>+</span></summary><div><button data-start="sofa"><strong>Style a sofa</strong><span>Build a considered arrangement</span></button><button data-start="bed"><strong>Style a bed</strong><span>Layer your finishing touches</span></button><button data-start="cushion"><strong>Design a cushion</strong><span>Begin with one beautiful detail</span></button><button data-start="refresh"><strong>Refresh my cushions</strong><span>New covers, familiar favourites</span></button></div>';
  $(".intro").before(starting);
  starting.onclick = (e) => {
    const b = e.target.closest("[data-start]");
    if (!b) return;
    const choice = b.dataset.start;
    starting.open = false;
    if (choice === "sofa" || choice === "bed")
      change(
        () => {
          design.scene = choice === "sofa" ? "sofa-2" : "double-bed";
          mode = "layout";
        },
        { quote: false },
      );
    else if (choice === "cushion") setMode("configurator");
    else {
      change(() => {
        if (current()) selectFilling(current().spec, "cover");
        mode = "configurator";
      });
      $("#practical-guidance").scrollIntoView({ behavior: "smooth" });
    }
  };
  const presets = document.createElement("div");
  presets.className = "layout-presets layout-only";
  presets.innerHTML =
    '<p class="eyebrow">BUILD AN ARRANGEMENT</p><div><button data-preset="simple">Simple · 2</button><button data-preset="balanced">Balanced · 3</button><button data-preset="layered">Layered · 5</button></div><p class="help">Start a new arrangement using your selected fabric. Undo returns to the previous set.</p>';
  $(".arrangement").before(presets);
  presets.onclick = (e) => {
    const b = e.target.closest("[data-preset]");
    if (!b || !current()) return;
    const shapes =
        b.dataset.preset === "simple"
          ? ["square-45", "square-45"]
          : b.dataset.preset === "balanced"
            ? ["square-50", "square-45", "rectangle-28-48"]
            : [
                "square-50",
                "square-50",
                "square-45",
                "square-35",
                "rectangle-28-48",
              ],
      template = clone(current().spec);
    change(() => {
      design.pieces = shapes.map((sizeId, i) => {
        const p = freshPiece(template.fabricId);
        p.spec = { ...clone(template), id: uid(), sizeId };
        p.position.slot = [0, 2, 4, 3, 5][i];
        selectSize(p.spec, sizeId);
        return p;
      });
      selectedId = design.pieces[0].spec.id;
      mode = "layout";
    });
  };
  const practical = document.createElement("section");
  practical.id = "practical-guidance";
  practical.className = "practical-guidance";
  practical.innerHTML =
    '<p class="eyebrow">A FEW CONSIDERED DETAILS</p><h2>A little guidance.</h2><div><details><summary>Choose sizes that work together</summary><p>Start with the clear seat or bed width. Combine a generous square with a smaller rectangle; the layout keeps pieces that do not fit in an unplaced tray.</p><button data-help-size="square-50">Explore a 50 cm square →</button><button data-help-size="rectangle-28-48">Explore a 28 × 48 cm rectangle →</button></details><details><summary>Cover only, or cover & filling?</summary><p>Choose a cover if you are keeping a suitable existing insert. New filled choices use a compatible standard insert where available. Check the insert and finished cover dimensions shown with your selection.</p><button data-help-fill="cover">Design a replacement cover →</button><button data-help-fill="filled">Design a filled cushion →</button></details><details><summary>Measure before you make</summary><p>Record your existing cover’s shape and finished width and height, and the insert dimensions. Check the clear space on your furniture. Choose the finished cover size that suits your space.</p><button data-help-size="square-45">Check shapes and dimensions →</button></details><details><summary>Mix pattern scales thoughtfully</summary><p>Pair a smaller stripe with a larger motif, or give a busy design room beside a plain texture. The original fabric image controls the scale; shared placement keeps the front and back upright and alike.</p><button data-help-guide="1">Explore a pattern and plain pairing →</button></details><details><summary>Care starts with the fabric</summary><p>Care instructions vary by fabric and filling. Follow the care label on your finished cushion before cleaning. Do not assume a cover is washable because it is removable.</p><button data-help-sample="true">Review the selected fabric →</button></details></div>';
  guideSection.after(practical);
  practical.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b || !current()) return;
    if (b.dataset.helpGuide) {
      $(
        `#guide-cards [data-guide-index="${Number(b.dataset.helpGuide)}"]`,
      )?.click();
      return;
    }
    change(() => {
      if (b.dataset.helpSize) {
        selectSize(current().spec, b.dataset.helpSize, { announce: true });
        normalisePlacement(current().spec);
      }
      if (b.dataset.helpFill) selectFilling(current().spec, b.dataset.helpFill);
      mode = "configurator";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = document.createElement("button");
  reset.id = "reset-design";
  reset.className = "text-link reset-design";
  reset.textContent = "Start a fresh design";
  name.after(reset);
  const tray = document.createElement("div");
  tray.id = "layout-tray";
  tray.className = "layout-only";
  reset.after(tray);
  const workroom = document.createElement("button");
  workroom.id = "workroom";
  workroom.className = "text-link workroom-button";
  workroom.textContent = "Workroom instructions & export";
  workroom.hidden = !config.ownerReview;
  $("#cut-plan").before(workroom);
  $(".editor-section.arrangement").classList.add("layout-only");
  $$(".editor-section:not(.arrangement)").forEach((e) =>
    e.classList.add("config-only"),
  );
  // Furniture choices belong with the arrangement options so the scene can
  // remain fully visible beside the editor on shorter laptop screens.
  $(".editor-section.arrangement").prepend($(".room-controls"));
  $(".room-controls").classList.add("layout-only");
  $("#add").title = "Create another cushion";
  $("#add-to-layout").onclick = () => {
    setMode("layout");
    notify("Your cushion is in the layout. Choose a position or add another.");
  };
  $("#edit-cushion").onclick = () => setMode("configurator");
  $("#floor").innerHTML =
    '<option value="#b5a18a">Natural oak</option><option value="#83715f">Smoked oak</option><option value="#d2cbbf">Warm stone</option><option value="#d7c7ae">Pale oak</option><option value="#6f5444">Walnut</option><option value="#a49c90">Grey oak</option><option value="#777c7b">Slate</option><option value="#e1dcd2">Chalk stone</option>';
  $("#furniture").innerHTML =
    '<option value="sofa-2">Two-seat sofa</option><option value="sofa-3">Three-seat sofa</option><option value="corner">Corner sofa</option><option value="armchair">Armchair</option><option value="double-bed">Double bed</option><option value="king-bed">King bed</option>';
  $("#shapes").innerHTML = [
    ["square", "Square"],
    ["rectangle", "Rectangle"],
    ["round", "Round"],
    ["bed", "Bed square"],
    ["bolster", "Bolster"],
  ]
    .map(([id, label]) => `<button data-shape="${id}">${label}</button>`)
    .join("");
  $('#edges [data-edge="none"]').dataset.edge = "unpiped";
  $("#fabrics").after(
    Object.assign(document.createElement("button"), {
      id: "more-fabrics",
      className: "text-link",
      textContent: "See more fabrics",
    }),
  );
  $("#more-fabrics").onclick = () => {
    clearTimeout(searchTimer);
    $("#fabric-filters").open = true;
    const append = catalogueExpanded;
    catalogueExpanded = true;
    loadCatalogue($("#fabric-search").value, append ? nextOffset : 0, append);
  };
  $("#fabric-filters").ontoggle = () => {
    if ($("#fabric-filters").open && !catalogueExpanded) {
      clearTimeout(searchTimer);
      catalogueExpanded = true;
      loadCatalogue($("#fabric-search").value);
    }
  };
  for (const key of ["colour", "pattern", "guidePrice"]) {
    $("#filter-" + key).onchange = () => {
      clearTimeout(searchTimer);
      catalogueExpanded = true;
      loadCatalogue($("#fabric-search").value);
    };
  }
  $("#clear-fabric-filters").onclick = () => {
    clearTimeout(searchTimer);
    $("#fabric-search").value = "";
    for (const key of ["colour", "pattern", "guidePrice"]) $("#filter-" + key).value = "";
    catalogueExpanded = true;
    loadCatalogue();
  };
  $("#retry-fabrics").onclick = () => loadCatalogue($("#fabric-search").value);
  const filling = document.createElement("label");
  filling.className = "field";
  filling.innerHTML =
    'Choose your cushion<select id="filling"><option value="filled">Cover & standard synthetic insert</option><option value="cover">Cover only</option></select><p id="insert-specification" class="help"></p>';
  $("#size-note").after(filling);
  const rangeNote = document.createElement("p");
  rangeNote.className = "help";
  rangeNote.id = "insert-range-note";
  rangeNote.textContent = "Sizes shown are finished cover dimensions, not pad dimensions. Choose a compatible insert where available. Saved designs keep their original size.";
  const sizeChange = document.createElement("p");
  sizeChange.id = "size-change-notice";
  sizeChange.className = "help";
  sizeChange.setAttribute("role", "status");
  $("#size-note").after(rangeNote, sizeChange);
  const caps = document.createElement("div");
  caps.id = "end-placement";
  caps.innerHTML =
    '<p class="help">Bolster end caps share one upright placement.</p><label class="field">End-cap across <span id="end-x-value"></span><input id="end-x" type="range" min="0" step="1"></label><label class="field">End-cap down <span id="end-y-value"></span><input id="end-y" type="range" min="0" step="1"></label>';
  $(".placement").append(caps);
  const front = document.createElement("button");
  front.id = "front";
  front.textContent = "Inspect front";
  front.className = "config-only";
  $("#flip").before(front);
  $("#flip").innerHTML = "Inspect back";
  $("#flip").classList.add("config-only");
  const inspectionStatus = document.createElement("span");
  inspectionStatus.id = "inspection-status";
  inspectionStatus.className = "config-only";
  inspectionStatus.setAttribute("role", "status");
  inspectionStatus.setAttribute("aria-live", "polite");
  inspectionStatus.style.cssText =
    "display:block;font-size:11px;padding:5px 8px";
  $("#flip").parentElement.after(inspectionStatus);
  $("#front").onclick = () => {
    face = "front";
    renderScene({ animateInspection: true });
    renderFaces();
  };
  $("#flip").onclick = () => {
    face = "back";
    renderScene({ animateInspection: true });
    renderFaces();
  };
  for (const [angle, label] of [
    ["three-quarter", "Three-quarter view"],
    ["side", "Side view"],
    ["straight", "Straight view"],
  ]) {
    const button = document.createElement("button");
    button.id = "inspect-angle-" + angle;
    button.className = "config-only";
    button.textContent = label;
    button.onclick = () => {
      inspectionAngle = angle;
      renderScene();
      renderFaces();
    };
    $("#flip").after(button);
  }
  for (const n of [1, 2]) {
    const end = document.createElement("button");
    end.id = "inspect-end-" + n;
    end.className = "config-only";
    end.textContent = "End cap " + n;
    end.onclick = () => {
      face = "end" + n;
      renderScene();
      renderFaces();
    };
    $("#flip").after(end);
  }
  swatches(
    "#upholstery",
    [
      ["Sage", "#b9b8a5"],
      ["Oat", "#d8cdbb"],
      ["Ink", "#354552"],
      ["Clay", "#a88674"],
      ["Forest", "#425b4b"],
      ["Charcoal", "#515458"],
      ["Blush", "#c49c96"],
      ["Denim", "#687c90"],
    ],
    "furniture",
  );
  swatches(
    "#walls",
    [
      ["Warm white", "#e8e3d8"],
      ["Parchment", "#d9cdb6"],
      ["Stone", "#c7c6bc"],
      ["Soft sage", "#d5ddce"],
      ["Dusty blue", "#ccd8df"],
      ["Plaster pink", "#e5d3cf"],
      ["Soft grey", "#dcdcdc"],
      ["Warm taupe", "#c1b2a3"],
    ],
    "wall",
  );
  swatches("#bed-covers", [
    ["Ivory", "#f7f4ed"], ["Oat linen", "#d8cdbb"],
    ["Sage linen", "#b9b8a5"], ["Deep blue", "#425771"],
    ["Terracotta", "#a96e58"], ["Rose", "#c49c96"],
    ["Graphite", "#656667"], ["White", "#fffdf8"],
  ], "bedCover");
}
function swatches(selector, values, key) {
  $(selector).innerHTML = values
    .map(
      ([label, value]) =>
        `<button data-colour="${value}" aria-label="${label}" title="${label}" style="background:${value}"></button>`,
    )
    .join("");
  $(selector).addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b)
      change(() => (design.colours[key] = b.dataset.colour), { quote: false });
  });
}
function renderFaces() {
  if (internalReview) $("#square-shape-comparison").hidden =
    mode !== "configurator" ||
    sizeOf(current()?.spec.sizeId).shape !== "square";
  const shape = sizeOf(current()?.spec.sizeId).shape;
  const bolster = shape === "bolster";
  for (const angle of ["straight", "three-quarter", "side"]) {
    const button = $("#inspect-angle-" + angle);
    button.hidden = false;
    button.classList.toggle("active", inspectionAngle === angle);
    button.setAttribute("aria-pressed", inspectionAngle === angle);
  }
  $("#front").textContent = bolster ? "Body view" : "Inspect front";
  $("#flip").textContent = bolster ? "Body reverse" : "Inspect back";
  $("#front").classList.toggle("active", face === "front");
  $("#flip").classList.toggle("active", face === "back");
  $("#front").setAttribute("aria-pressed", face === "front");
  $("#flip").setAttribute("aria-pressed", face === "back");
  for (const n of [1, 2]) {
    const b = $("#inspect-end-" + n);
    b.hidden = !bolster;
    b.classList.toggle("active", face === "end" + n);
    b.setAttribute("aria-pressed", face === "end" + n);
  }
}
function render() {
  document.body.dataset.mode = mode;
  const arrangement = planArrangement(design);
  for (const piece of design.pieces) {
    const placed = arrangement.placements.find((p) => p.id === piece.spec.id);
    piece.position.slot = placed?.slot ?? 31;
  }
  const piece = current(),
    spec = piece?.spec,
    shape = sizeOf(spec?.sizeId).shape;
  $("#nav-config").classList.toggle("active", mode === "configurator");
  $("#nav-layout").classList.toggle("active", mode === "layout");
  $("#nav-config").setAttribute("aria-pressed", String(mode === "configurator"));
  $("#nav-layout").setAttribute("aria-pressed", String(mode === "layout"));
  $(".intro .eyebrow").textContent =
    mode === "configurator"
      ? "01 / DESIGN YOUR CUSHION"
      : "02 / FIND ITS PLACE";
  $(".intro h1").innerHTML =
    mode === "configurator"
      ? "A little detail.<br><em>Entirely your own.</em>"
      : "A considered mix.<br><em>A different room.</em>";
  $(".intro>p").innerHTML =
    mode === "configurator"
      ? "Choose a shape, fabric and finish.<br>Then see it come together in your room."
      : "Bring your cushions together.<br>Find the arrangement that feels like home.";
  $(".scene-caption").textContent =
    mode === "configurator"
      ? "YOUR CUSHION, EVERY DETAIL"
      : "YOUR ROOM, REIMAGINED";
  $(".editor-heading h2").textContent =
    mode === "configurator" ? "Your cushion" : "Your arrangement";
  $(".intro-note strong").textContent =
    mode === "configurator"
      ? "Then arrange it in your room."
      : "A collection that feels like you.";
  $(".step-number").textContent = mode === "configurator" ? "01" : "02";
  $("#pieces").innerHTML = design.pieces
    .map(
      (p, i) =>
        `<button class="piece-tab ${p.spec.id === selectedId ? "active" : ""}" data-id="${escape(p.spec.id)}" aria-label="Select cushion ${i + 1}" aria-pressed="${p.spec.id === selectedId}">${i + 1}</button>`,
    )
    .join("");
  $("#editing-cushion").textContent = `Editing cushion ${Math.max(0, design.pieces.findIndex(p => p.spec.id === selectedId)) + 1}`;
  $("#undo").disabled = !history.length;
  $("#remove").disabled = design.pieces.length < 2;
  $("#furniture").value = design.scene;
  $("#floor").value = design.colours.floor;
  $("#bed-cover-controls").hidden = !design.scene.includes("bed");
  $(".scene-foot span:first-child").textContent =
    mode === "layout" && design.scene.includes("bed")
      ? "Approximate bed scene proportions. Bed and sleeping pillows are props, not included; measure your own furniture."
      : "Room furnishings are illustrative and not included · measure your own furniture";
  $("#design-name").value = design.name;
  for (const [selector, key] of [
    ["#upholstery", "furniture"],
    ["#walls", "wall"],
    ["#bed-covers", "bedCover"],
  ])
    $$(selector + " button").forEach((b) => {
      const colour = design.colours[key] || (key === "bedCover" ? "#f7f4ed" : "");
      b.classList.toggle("active", b.dataset.colour === colour);
      b.setAttribute("aria-pressed", b.dataset.colour === colour);
    });
  if (spec) {
    $$("[data-shape]").forEach((b) => {
      b.classList.toggle("active", b.dataset.shape === shape);
      b.setAttribute("aria-pressed", String(b.dataset.shape === shape));
    });
    const selectorSizes = [...activeSizes];
    if (!CUSHION_ACTIVE_SIZE_IDS.includes(spec.sizeId))
      selectorSizes.push([spec.sizeId, `${sizeOf(spec.sizeId).label} (saved size)`]);
    $("#size").innerHTML = selectorSizes
      .filter(([id]) => sizeOf(id).shape === shape)
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join("");
    $("#size").value = spec.sizeId;
    const sizeChange = $("#size-change-notice");
    if (sizeChange.dataset.pieceId !== spec.id || sizeChange.dataset.sizeId !== spec.sizeId) sizeChange.textContent = "";
    $("#filling").querySelector('[value="legacy-filled"]')?.remove();
    const savedFilling = spec.filling === "filled" && (!spec.rangeVersion || spec.fillingType !== "polyester" || spec.sizeId === "bolster-23-56");
    if (savedFilling) {
      const legacy = new Option(`${fillingLabel(spec)} (saved choice)`, "legacy-filled");
      $("#filling").append(legacy);
      $("#filling").value = "legacy-filled";
    } else $("#filling").value = spec.filling;
    $("#filling").querySelector('[value="filled"]').disabled = spec.sizeId === "bolster-23-56";
    const replacement = CUSHION_LEGACY_SIZE_REPLACEMENTS[spec.sizeId];
    const rangeNote = replacement
      ? `Your saved ${sizeOf(spec.sizeId).label} cover is retained unchanged. The current range offers ${sizeOf(replacement).label}; select it only if you want to change the cover size. `
      : "Sizes describe the finished cover, not the pad. ";
    const legacyNote = spec.filling === "filled" && !spec.rangeVersion
      ? "Your saved insert pairing is retained. Choose a size or filling explicitly to adopt the revised pairing and revalidate its fit. " : "";
    $("#size-note").textContent = rangeNote + legacyNote + (
      sizeOf(spec.sizeId).shape === "round"
        ? "A round cushion with a concealed zip."
        : sizeOf(spec.sizeId).shape === "bolster"
          ? `A cylindrical cushion with a concealed zip and matching ends. ${spec.sizeId === "bolster-19-44" ? "The finished cover is diameter 19 cm and length 44 cm, paired with a cylinder pad of diameter 20 cm and length 46 cm." : "Your saved dimensions and filling choice are retained. Select the new cylinder size explicitly to adopt its current insert pairing, or choose Cover only."}`
          : "");
    renderInsertSpecification();
    $$("[data-edge]").forEach((b) => {
      b.classList.toggle("active", b.dataset.edge === spec.edge);
      b.setAttribute("aria-pressed", b.dataset.edge === spec.edge);
    });
    $("#contrast-unavailable").hidden = spec.edge !== "contrast";
    $("#contrast-unavailable").textContent = spec.edge === "contrast"
      ? "This saved cushion has contrast piping, which is currently unavailable. Choose unpiped or self-piped before ordering."
      : "Contrast piping is currently unavailable.";
    $("#piping-note").hidden = spec.edge === "unpiped";
    $$("[data-place]").forEach((b, i) => {
      const active =
        piece.position.slot !== 31 && piece.position.slot % 3 === i;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderPlacement();
  }
  renderFaces();
  renderFabrics();
  renderScene();
  renderQuote();
  renderGuides();
  renderTray(arrangement);
}
function renderTray(arrangement) {
  const target = $("#layout-tray");
  target.replaceChildren();
  const count = document.createElement("p");
  count.className = "help";
  count.textContent = `${arrangement.placements.length} on the furniture · up to ${arrangement.capacity} clear positions, depending on cushion sizes.`;
  target.append(count);
  for (const item of arrangement.unplaced) {
    const index = design.pieces.findIndex((p) => p.spec.id === item.id),
      button = document.createElement("button");
    button.className = "unplaced-piece";
    button.textContent = `Cushion ${index + 1} · not placed. ${item.reason}`;
    button.onclick = () => {
      selectedId = item.id;
      render();
    };
    target.append(button);
  }
  if (arrangement.unplaced.length) {
    const note = document.createElement("p");
    note.className = "help";
    note.textContent =
      "These cushions remain in your design and quote. Choose larger furniture, reduce the size, or remove a cushion to make room.";
    target.append(note);
  }
  persist();
}
function renderGuides() {
  const target = $("#guide-cards");
  const signature = JSON.stringify(guides.map((guide) => guide.pieces.map(([id]) => fabrics.find((fabric) => fabric.id === id))));
  if (target.dataset.signature === signature) return;
  target.dataset.signature = signature;
  guideThumbnailObserver?.disconnect();
  target.replaceChildren();
  const renderCard = async (card, pieces) => {
    try {
      guideThumbnailRenderer ||= import("./guide-thumbnails.mjs").then(({ createGuideThumbnailRenderer }) => createGuideThumbnailRenderer({ threeUrl: config.threeUrl }));
      const renderer = await guideThumbnailRenderer;
      for (const [index, piece] of pieces.entries()) {
        if (!card.isConnected) return;
        const preview = card.querySelectorAll(".guide-cushion")[index];
        const result = await renderer.render({ piece, fabrics });
        if (!preview.isConnected) return;
        if (result.error || !result.url) {
          preview.querySelector("span").textContent = "Preview unavailable. Open this pairing to explore.";
          continue;
        }
        const img = preview.querySelector("img");
        img.src = result.url;
        img.hidden = false;
        preview.querySelector("span").hidden = true;
      }
    } catch {
      card.querySelectorAll(".guide-cushion span").forEach((span) => { if (!span.hidden) span.textContent = "Preview unavailable. Open this pairing to explore."; });
    }
  };
  const pending = new Map();
  guideThumbnailObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      guideThumbnailObserver.unobserve(entry.target);
      renderCard(entry.target, pending.get(entry.target));
    }
  }, { rootMargin: "100px" });
  for (const [guideIndex, guide] of guides.entries()) {
    const actual = guide.pieces.map(([id]) => fabrics.find((f) => f.id === id));
    if (actual.some((f) => !f)) continue;
    const card = document.createElement("article");
    const pieces = guidePieces(guide);
    const shown = [...new Map(actual.map((f) => [f.id, f])).values()];
    for (const tuple of guide.pieces) {
      const piping = fabrics.find((f) => f.id === tuple[3]);
      if (piping && !shown.some((f) => f.id === piping.id)) shown.push(piping);
    }
    card.innerHTML = `<div class="guide-cushions">${pieces.map((piece) => `<div class="guide-cushion"><img hidden alt="${escape(`${sizeOf(piece.spec.sizeId).label} cushion in ${labelOf(fabricOf(piece.spec))}`)}"><span>Preparing cushion preview...</span></div>`).join("")}</div><h3>${escape(guide.name)}</h3><p>${escape(guide.description)}</p><p class="guide-fabrics">${shown.map((f) => escape(labelOf(f))).join("<br>")}</p>`;
    const button = document.createElement("button");
    button.className = "text-link";
    button.dataset.guideIndex = guideIndex;
    button.textContent = "Start a new design with this pairing →";
    button.onclick = () => {
      change(() => {
        design = {
          ...design,
          id: uid(),
          name: guide.name,
          scene: guide.scene || design.scene,
          pieces: guidePieces(guide),
        };
        revision = 0;
        selectedId = design.pieces[0].spec.id;
        mode = "layout";
        face = "front";
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      notify(
        "Your pairing is ready to arrange. Edit either cushion to make it yours. Undo returns to your previous design.",
      );
    };
    card.append(button);
    target.append(card);
    pending.set(card, pieces);
    guideThumbnailObserver.observe(card);
  }
}
function guidePieces(guide) {
  return guide.pieces.map(([fabricId, sizeId, edge = "unpiped"], i) => {
    const piece = freshPiece(fabricId);
    selectSize(piece.spec, sizeId);
    piece.spec.edge = edge;
    piece.position.slot = (guide.scene === "corner" ? [0, 2, 8, 4] : [0, 2, 4, 3, 5])[i];
    normalisePlacement(piece.spec);
    return piece;
  });
}
function renderPlacement() {
  const spec = current()?.spec;
  if (!spec) return;
  const fabric = fabricOf(spec),
    size = sizeOf(spec.sizeId),
    bounds = placementLimits(spec, fabric);
  for (const [axis, input] of [
    ["x", "#offset-x"],
    ["y", "#offset-y"],
  ]) {
    // Preserve an older saved anchor visibly until an explicit placement edit.
    $(input).min = Math.min(
      bounds[axis === "x" ? "minX" : "minY"],
      spec.placementMm[axis],
    );
    $(input).max = Math.max(
      bounds[axis === "x" ? "maxX" : "maxY"],
      spec.placementMm[axis],
    );
    $(input).value = spec.placementMm[axis];
    $(input).disabled = !fabric?.calibration;
    $(input + "-value").textContent =
      (spec.placementMm[axis] / 10).toFixed(1) + " cm";
  }
  $("#end-placement").hidden = size.shape !== "bolster";
  for (const axis of ["x", "y"]) {
    const input = $("#end-" + axis),
      cap = spec.bolsterEndPlacementMm || spec.placementMm;
    const extent = (axis === "x" ? fabric?.calibration?.physicalWidthMm : fabric?.calibration?.physicalHeightMm) || 0;
    const footprint = spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION && size.shape === "bolster" ? shapeDrapeFootprints(size).end : null;
    const min = footprint ? -footprint[axis === "x" ? "minX" : "minY"] : 0;
    const max = Math.max(min, extent - (footprint ? footprint[axis === "x" ? "maxX" : "maxY"] : size.heightMm));
    input.min = Math.min(min, cap[axis]);
    input.max = Math.max(max, cap[axis]);
    input.value = cap[axis];
    input.disabled = !fabric?.calibration;
    $("#end-" + axis + "-value").textContent =
      (cap[axis] / 10).toFixed(1) + " cm";
  }
  const squareBounds =
    size.shape === "square" && fabric?.calibration
      ? squarePreviewFootprint(size.widthMm, size.heightMm, visualFillTrial.resolve(spec))
      : null;
  const squareReady =
    !squareBounds ||
    squarePreviewFitsSource(size, fabric?.calibration, spec.placementMm, visualFillTrial.resolve(spec));
  const shapedReady = spec.constructionProfile !== SHAPED_CONSTRUCTION_VERSION || !fabric?.calibration || (shapeDrapeFitsSource(size, fabric.calibration, spec.placementMm, spec.bolsterEndPlacementMm) && (size.shape !== "round" || roundPreviewFitsSource(size,fabric.calibration,spec.placementMm)));
  $("#calibration-note").textContent =
    !shapedReady
      ? "More original cloth is needed around this placement. Adjust the body or end-panel placement to remain inside the calibrated photograph. Artwork is withheld rather than stretched or repeated."
      : squareBounds && !squareReady
      ? `More original cloth is needed around this motif. Adjust placement: horizontal ${Math.ceil(-squareBounds.minX)}-${Math.floor(fabric.calibration.physicalWidthMm - squareBounds.maxX)} mm; vertical ${Math.ceil(-squareBounds.minY)}-${Math.floor(fabric.calibration.physicalHeightMm - squareBounds.maxY)} mm. Artwork is withheld rather than stretched or repeated.`
      : fabric?.calibration
        ? `Original cloth: ${fabric.calibration.physicalWidthMm / 10} cm wide × ${fabric.calibration.physicalHeightMm / 10} cm long. Placement stays within this image. No repeated or mirrored artwork.`
        : "Accurate preview awaits original image dimensions. This fabric remains available to explore.";
  $("#fabric-description").textContent = fabric
    ? labelOf(fabric) +
      (fabric.previewReady
        ? " · physical-scale preview"
        : " · preview calibration unavailable")
    : "";
  $("#samples").disabled = !fabric?.sampleAvailable;
}
function renderFabrics() {
  const items = catalogueIds.map((id) => fabrics.find((fabric) => fabric.id === id)).filter(Boolean);
  $("#fabrics").innerHTML =
    items
      .map(
        (f) =>
          `<button class="fabric-card ${f.id === current()?.spec.fabricId ? "active" : ""}" data-fabric="${escape(f.id)}" aria-pressed="${f.id === current()?.spec.fabricId}" title="${escape(labelOf(f))}">${f.imageUrl ? `<img src="${escape(f.imageUrl)}" alt="${escape(labelOf(f))}" loading="lazy" referrerpolicy="no-referrer">` : '<span class="fabric-colour"></span>'}<strong>${escape(f.design || f.name)}</strong><small>${escape(f.colour || f.colourway || f.brand)}</small></button>`,
      )
      .join("") ||
    (catalogueLoading ? '<p class="help">Finding your fabrics...</p>' : '<p class="help">No fabrics match. Try another filter or clear your search.</p>');
  $("#more-fabrics").hidden = nextOffset == null;
  $("#more-fabrics").disabled = catalogueLoading;
  $("#more-fabrics").textContent =
    nextOffset === 0
      ? "Explore the full fabric collection"
      : `See more fabrics (${totalFabrics} available)`;
}
function renderScene({ animateInspection = false } = {}) {
  if (scene) {
    const previewShape = visualFillTrial.resolve(current()?.spec);
    for (const option of $$("[data-preview-shape]"))
      option.setAttribute(
        "aria-pressed",
        option.dataset.previewShape === previewShape,
      );
    scene.update(design, fabrics, {
      mode,
      selectedId,
      face,
      inspectionAngle,
      previewShapes: visualFillTrial.forDesign(design),
      animateInspection,
      view: camera,
      previewMaterials,
    });
    const spec = current()?.spec,
      f = fabricOf(spec),
      size = sizeOf(spec?.sizeId),
      pipingFabric = fabrics.find(
        (f) =>
          f.id ===
          (spec?.edge === "contrast" ? spec?.pipingFabricId : spec?.fabricId),
      ),
      pipingPlan = previewMaterials[spec?.id]?.piping,
      perimeter =
        size.shape === "bolster"
          ? 2 * Math.PI * size.heightMm
          : size.shape === "round"
            ? Math.PI * size.widthMm
            : 2 * (size.widthMm + size.heightMm),
      exact = !!pipingPreviewSegments(
        pipingPlan,
        pipingFabric?.calibration,
        perimeter,
      );
    $("#piping-note").textContent = exact
      ? "Piping follows your selected fabric around the edge."
      : "Piping coordinates with your fabric. Its final appearance may vary.";
    if (size.shape === "square" && previewShape === "soft-fullness") {
      const footprint = squarePreviewFootprint(
        size.widthMm,
        size.heightMm,
        previewShape,
      );
      if (internalReview) $("#square-shape-comparison .help").textContent =
        `Accepted fuller preview: ${footprint.visibleWidthMm.toFixed(1)} x ${footprint.visibleHeightMm.toFixed(1)} mm of source artwork shown. This is not fabric consumption or an extra charge. Cutting, matching, price and ordered construction stay unchanged.`;
      $("#render-status").textContent = squarePreviewFitsSource(
        size,
        f?.calibration,
        spec.placementMm,
        previewShape,
      )
        ? "Calibrated fabric · matching upright faces"
        : "Preview unavailable at this placement · more original artwork needed";
    } else {
      if (internalReview) $("#square-shape-comparison .help").textContent =
        "Earlier drape is retained for internal comparison. Preview choices affect only this cushion’s appearance, including its layout view. Cutting, consumption and price stay unchanged.";
      $("#render-status").textContent = spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION
        ? shapeDrapeFitsSource(size, f?.calibration, spec.placementMm, spec.bolsterEndPlacementMm) && (size.shape !== "round" || roundPreviewFitsSource(size,f?.calibration,spec.placementMm))
          ? size.shape === "bolster" ? "Continuous body wrap · matching upright end panels" : "Calibrated fabric · matching upright faces"
          : "Preview unavailable at this placement · more original artwork needed"
        : f?.calibration
        ? size.shape === "square"
          ? squareDrapeFitsSource(size, f.calibration, spec.placementMm)
            ? "Cloth follows curved surface · matching upright faces"
            : "Adjust pattern placement · more original cloth needed"
          : spec?.edge === "unpiped" || exact
            ? "Original artwork · finite physical coverage"
            : "Body artwork to scale · piping colour indicative"
        : "Fabric preview awaiting calibration";
    }
  } else if (design.pieces.length) {
    $("#scene").innerHTML =
      '<div class="fallback"><h2>Your design is safe.</h2><p>3D is unavailable in this browser. You can still choose your fabric, size, finish and save your design.</p><div class="fallback-grid">' +
      design.pieces
        .map((p) => {
          const f = fabricOf(p.spec);
          return f?.imageUrl
            ? `<img src="${escape(f.imageUrl)}" alt="${escape(labelOf(f))}">`
            : "";
        })
        .join("") +
      "</div></div>";
  }
}
function scheduleQuote() {
  quoteRequest++;
  clearTimeout(quoteTimer);
  quoteLoading = true;
  quotes = [];
  setQuote = null;
  purchaseEnabled = false;
  previewMaterials = {};
  renderQuote();
  renderScene();
  quoteTimer = setTimeout(loadQuote, 220);
}
async function loadQuote() {
  const request = quoteRequest;
  try {
    const result = await api("/quote", {
      specs: design.pieces.map((p) => p.spec),
    });
    if (request !== quoteRequest) return;
    quotes = result.quotes || [];
    setQuote = result.setQuote || quotes[0];
    purchaseEnabled = result.purchaseEnabled === true;
    previewMaterials = Object.assign(
      {},
      ...quotes.map((q) => q.previewMaterials || {}),
      setQuote?.previewMaterials || {},
    );
    quoteLoading = false;
    renderQuote();
    renderScene();
  } catch (e) {
    if (request !== quoteRequest) return;
    quotes = [];
    quoteLoading = false;
    $("#quote-total").textContent = "Awaiting review";
    $("#quote-note").textContent = e.message;
  }
}
function money(amount) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount / 100);
}
function insertEvidenceFor(spec) {
  if (quoteLoading || spec.filling !== "filled") return null;
  const shared = setQuote?.items?.find((item) => item.specId === spec.id);
  if (shared) return shared.insertSpecification ?? null;
  const individual = quotes.find((quote) => quote.specs?.length === 1 && quote.specs[0].id === spec.id);
  return individual?.insertSpecification ?? individual?.items?.find((item) => item.specId === spec.id)?.insertSpecification ?? null;
}
function renderInsertSpecification() {
  const node = $("#insert-specification");
  const spec = current()?.spec;
  if (node) node.textContent = spec ? insertSpecificationLabel(spec, insertEvidenceFor(spec)) : "";
}
function renderQuote() {
  renderInsertSpecification();
  $("#workroom").hidden = !config.ownerReview;
  $("#cut-plan").hidden = !config.ownerReview;
  $("#workroom").disabled = quoteLoading || !quotes.length;
  if (!current()) return;
  $("#quote-total").textContent = quoteLoading
    ? "Calculating…"
    : "Awaiting confirmation";
  $("#quote-note").textContent =
    "Your design is kept in this browser. Add your chosen pieces to Design My Home to review your order.";
  $("#buy-set").innerHTML = "Review the set <span>↗</span>";
  $("#buy-piece").textContent = "Review this cushion";
  $("#add-piece-order").textContent = editingOrderId ? "Update my order" : "Add to my order";
  $("#add-set-order").hidden = Boolean(editingOrderId);
  $("#add-piece-order").disabled = !current()?.spec.fabricId;
  $("#add-set-order").disabled = !design.pieces.length || design.pieces.some(p=>!p.spec.fabricId);
  const selected =
    quotes.find(
      (q) =>
        q.spec?.id === selectedId ||
        q.specId === selectedId ||
        q.specs?.some((s) => s.id === selectedId),
    ) || quotes[0];
  $("#cut-plan-content").replaceChildren();
  if (selected) {
    const pre = document.createElement("p");
    const issues = selected.blockers || selected.issues || [];
    pre.textContent = Array.isArray(issues)
      ? issues
          .map((x) => (typeof x === "string" ? x : x.message || x.code))
          .join(" ")
      : "Your cutting plan is calculated from the server.";
    $("#cut-plan-content").append(pre);
    const facts = document.createElement("p");
    facts.textContent =
      "The cutting plan uses supplier cutting width, seam allowances and matching. Each configuration needs its recorded construction approval and verified fabric facts. Unconfirmed requirements prevent checkout only for affected configurations.";
    $("#cut-plan-content").append(facts);
    if (selected.cutPlan)
      renderCutPlan(selected.cutPlan, $("#cut-plan-content"));
  }
  const retail = mode === "configurator" ? selected : setQuote;
  if (!quoteLoading && retail?.ready && Number.isFinite(retail.totalMinor)) {
    $("#quote-total").textContent = money(retail.totalMinor - (retail.deliveryGrossMinor || 0));
    $("#quote-note").textContent = quoteReviewState(retail, purchaseEnabled).canBuy
      ? "Shared fabric and one delivery charge are recalculated in Design My Home."
      : "Your price is ready; ordering is awaiting the remaining confirmations.";
  } else if (!config.ownerReview && retail?.message)
    $("#quote-note").textContent = retail.message;
  $("#buy-set").disabled = quoteLoading || !design.pieces.length;
  $("#buy-piece").disabled = quoteLoading || !design.pieces.length;
}
function renderCutPlan(plan, target) {
  const verification = document.createElement("p");
  verification.className = plan.matchingVerified
    ? "matching-verified"
    : "matching-unverified";
  verification.textContent = plan.matchingVerified
    ? "Matching verified for this calculation. Construction approval may still be required."
    : "PROVISIONAL CUT PLAN: identical motif matching is not verified. Do not cut from this diagram.";
  target.append(verification);
  for (const fabric of plan.fabrics || []) {
    const section = document.createElement("div"),
      heading = document.createElement("p");
    heading.textContent =
      (labelOf(fabrics.find((f) => f.id === fabric.fabricId)) ||
        fabric.fabricId) + ` · cutting width ${fabric.cuttingWidthMm} mm`;
    section.append(heading);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      height = Math.max(300, ...fabric.pieces.map((p) => p.yMm + p.heightMm)),
      width = fabric.cuttingWidthMm || 1400;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      "Flat cloth cutting plan showing both matching cushion faces",
    );
    svg.style.cssText =
      "width:100%;background:#eee7d7;border:1px solid #cabda6;margin:10px 0";
    for (const p of fabric.pieces) {
      const rect = document.createElementNS(svg.namespaceURI, "rect");
      for (const [k, v] of Object.entries({
        x: p.xMm,
        y: p.yMm,
        width: p.widthMm,
        height: p.heightMm,
        fill: "#c2cbb9",
        stroke: "#576956",
        "stroke-width": 4,
      }))
        rect.setAttribute(k, v);
      if (p.rotation === 45 && p.stripLengthMm && p.stripWidthMm) {
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke-dasharray", "12 8");
        const cx = p.xMm + p.widthMm / 2, cy = p.yMm + p.heightMm / 2;
        const along = p.stripLengthMm / (2 * Math.SQRT2);
        const across = p.stripWidthMm / (2 * Math.SQRT2);
        const points = [
          [cx - along + across, cy - along - across],
          [cx + along + across, cy + along - across],
          [cx + along - across, cy + along + across],
          [cx - along - across, cy - along + across],
        ];
        const strip = document.createElementNS(svg.namespaceURI, "polygon");
        strip.setAttribute("points", points.map(point => point.join(",")).join(" "));
        strip.setAttribute("fill", "#c2cbb9");
        strip.setAttribute("stroke", "#576956");
        strip.setAttribute("stroke-width", "4");
        svg.append(strip);
      } else if (p.shape === "circle") {
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke-dasharray", "12 8");
        const circle = document.createElementNS(svg.namespaceURI, "ellipse");
        for (const [key, value] of Object.entries({
          cx: p.xMm + p.widthMm / 2,
          cy: p.yMm + p.heightMm / 2,
          rx: p.widthMm / 2,
          ry: p.heightMm / 2,
          fill: "#c2cbb9",
          stroke: "#576956",
          "stroke-width": 4,
        }))
          circle.setAttribute(key, value);
        svg.append(circle);
      }
      svg.append(rect);
      const text = document.createElementNS(svg.namespaceURI, "text");
      text.setAttribute("x", p.xMm + 15);
      text.setAttribute("y", p.yMm + 40);
      text.setAttribute("font-size", "25");
      text.textContent = p.role + (p.shape === "circle" ? " · circle" : "");
      svg.append(text);
      const line = document.createElement("p");
      line.textContent = p.rotation === 45
        ? `${p.role} · 45 degree bias strip ${p.stripLengthMm} × ${p.stripWidthMm} mm inside a conservative ${p.widthMm} mm square · at ${p.xMm}, ${p.yMm} mm`
        : `${p.role}${p.shape === "circle" ? " · circular cut (dashed rectangle is packing allowance)" : ""} · ${p.widthMm} × ${p.heightMm} mm · at ${p.xMm}, ${p.yMm} mm`;
      line.textContent += p.role === "piping" ? "" : p.seamAllowanceKnown === false
        ? " · NET ENVELOPE ONLY: seam allowance unknown; do not cut"
        : ` · includes ${p.seamAllowanceMm} mm seam allowance per edge`;
      section.append(line);
    }
    section.prepend(svg);
    const metres = document.createElement("p");
    metres.textContent = `Required: ${fabric.requiredMetres.toFixed(2)} m · ${fabric.orderedMetres == null ? "Ordering increment to confirm" : `Ordered: ${fabric.orderedMetres.toFixed(2)} m`}`;
    section.append(metres);
    target.append(section);
  }
  if (plan.instructions?.length) {
    const instructions = document.createElement("ul");
    instructions.setAttribute("aria-label", "Construction and cutting instructions");
    for (const text of plan.instructions) {
      const item = document.createElement("li");
      item.textContent = text;
      instructions.append(item);
    }
    target.append(instructions);
  }
  for (const proposal of plan.pipingProposals || []) {
    if (proposal.materialIncluded || !proposal.straightLayout) continue;
    const section = document.createElement("section"), heading = document.createElement("h4");
    heading.textContent = "Provisional straight-strip layout, not charged";
    section.append(heading);
    const summary = document.createElement("p");
    summary.textContent = `${proposal.specId}: ${(proposal.grossTargetLengthMm / 1000).toFixed(2)} m of strip per cushion, quantity ${proposal.quantity}. Additional full-width cloth in this shared planning layout: ${proposal.straightLayout.additionalRequiredMetres.toFixed(3)} m. Join consumption still needs confirmation.`;
    section.append(summary);
    for (const piece of proposal.straightLayout.pieces) {
      const line = document.createElement("p");
      line.textContent = `Strip ${piece.unit}: ${piece.widthMm} × ${piece.heightMm} mm at ${piece.xMm}, ${piece.yMm} mm on the main cloth layout.`;
      section.append(line);
    }
    target.append(section);
  }
}
async function loadCatalogue(q = "", offset = 0, append = false) {
  const request = ++searchRequest;
  catalogueLoading = true;
  if (!append) {
    catalogueIds = [];
    nextOffset = null;
  }
  $("#retry-fabrics").hidden = true;
  $("#fabric-results-status").textContent = "Finding your fabrics...";
  $("#fabrics").setAttribute("aria-busy", "true");
  renderFabrics();
  const params = new URLSearchParams({ q, offset: String(offset || 0) });
  for (const key of ["colour", "pattern", "guidePrice"]) {
    const value = $("#filter-" + key).value;
    if (value) params.set(key, value);
  }
  if (!catalogueExpanded && !q && !fabrics.length) params.set("examples", "1");
  try {
    const data = await api("/catalogue?" + params);
    if (request !== searchRequest) return;
    for (const item of data.items || []) {
      const old = fabrics.findIndex((f) => f.id === item.id);
      if (old >= 0) fabrics[old] = item;
      else fabrics.push(item);
    }
    catalogueIds = [...new Set([...(append ? catalogueIds : []), ...(data.items || []).map((item) => item.id)])];
    if (data.facets) renderFabricFilters(data.facets);
    totalFabrics = data.total || 0;
    nextOffset =
      data.source === "reviewed-source-records" ? 0 : data.nextOffset;
    catalogueLoading = false;
    $("#fabric-results-status").textContent = data.source === "reviewed-source-records"
      ? "A few fabrics to get you started. Explore the collection to filter by colour, pattern and price."
      : `${catalogueIds.length} of ${totalFabrics.toLocaleString()} matching fabrics`;
    renderFabrics();
    if (!design.pieces.length && fabrics.length) {
      const f = fabrics.find((f) => f.previewReady) || fabrics[0],
        piece = freshPiece(f.id);
      design.pieces.push(piece);
      selectedId = piece.spec.id;
      normalisePlacement(piece.spec);
      render();
      scheduleQuote();
    }
    if (data.message && !fabrics.length) {
      $("#fabric-description").textContent = data.message;
      $("#quote-note").textContent = data.message;
      $("#quote-total").textContent = "Catalogue unavailable";
    }
    return data;
  } catch (e) {
    if (request !== searchRequest) return;
    catalogueLoading = false;
    notify("Fabric catalogue: " + e.message);
    $("#fabric-results-status").textContent = "Fabrics could not load. Your cushion is unchanged. Please try again.";
    $("#retry-fabrics").hidden = false;
    renderFabrics();
  } finally {
    if (request === searchRequest) $("#fabrics").setAttribute("aria-busy", "false");
  }
}
function renderFabricFilters(facets) {
  for (const key of ["colour", "pattern", "guidePrice"]) {
    const select = $("#filter-" + key), selected = select.value;
    const oldLabel = select.selectedOptions[0]?.textContent || selected;
    const options = key === "guidePrice" ? (facets.priceTiers || [])
      : facets.discovery?.find((dimension) => dimension.key === key)?.options || [];
    select.innerHTML = `<option value="">All ${key === "colour" ? "colours" : key === "pattern" ? "patterns" : "tiers"}</option>` +
      options.map((option) => `<option value="${escape(option.value)}">${escape(option.label)}${key === "guidePrice" ? "" : ` (${option.count})`}</option>`).join("");
    if (selected && !options.some((option) => option.value === selected)) select.add(new Option(oldLabel, selected));
    select.value = selected;
  }
}
async function hydrateDesignFabrics() {
  const ids = [
    ...new Set(
      [
        ...design.pieces.flatMap((p) => [
          p.spec.fabricId,
          p.spec.pipingFabricId,
        ]),
        ...guides.flatMap((g) => g.pieces.map(([id]) => id)),
      ].filter(Boolean),
    ),
  ].filter((id) => !fabrics.some((f) => f.id === id));
  for (let i = 0; i < ids.length; i += 24) {
    try {
      const result = await api(
        "/catalogue?ids=" +
          ids
            .slice(i, i + 24)
            .map(encodeURIComponent)
            .join(","),
      );
      for (const f of result.items || [])
        if (!fabrics.some((old) => old.id === f.id)) fabrics.push(f);
    } catch {
      notify(
        "A saved fabric could not be loaded. Your cushion specifications are preserved.",
      );
    }
  }
}
function validSaved(value) {
  return (
    value?.version === 1 &&
    Array.isArray(value.pieces) &&
    value.pieces.length > 0 &&
    value.pieces.length <= 32 &&
    value.pieces.every(
      (p) =>
        p.spec?.version === 1 &&
        sizes.some(([id]) => id === p.spec.sizeId) &&
        p.spec.placementMm &&
        Number.isFinite(p.spec.placementMm.x) &&
        Number.isFinite(p.spec.placementMm.y) &&
        p.position,
    ) &&
    value.colours &&
    ["furniture", "wall", "floor"].every((key) =>
      /^#[a-f\d]{6}$/i.test(value.colours[key]),
    ) && (value.colours.bedCover === undefined || /^#[a-f\d]{6}$/i.test(value.colours.bedCover))
  );
}
async function save() {
  if (editingOrderId) return notify("Choose Update my order to keep this edit. Your saved arrangement remains unchanged.");
  design.name = $("#design-name").value.trim() || "My cushion design";
  persist();
  try {
    const result = await api("/designs", {
      design,
      expectedRevision: revision,
    });
    revision = result.saved.revision;
    knownRevisions.set(design.id, revision);
    persist();
    notify(
      "Design saved. Return to it from this browser or the saved-design list.",
    );
    return result.saved;
  } catch (e) {
    notify("Saved in this browser. Server save: " + e.message);
    if (e.data?.signInUrl)
      showActionLink("Sign in to save to your account", e.data.signInUrl);
    return null;
  }
}
async function restore() {
  if (editingOrderId) return notify("Return to Design My Home before opening a saved design.");
  dialogTrigger = document.activeElement;
  const dialog = $("#review-dialog");
  $("#review-content").replaceChildren();
  $("#confirm-review").hidden = true;
  dialog.querySelector("h2").textContent = "Return to a design";
  try {
    const result = await api("/designs");
    if (!result.designs?.length) {
      $("#review-content").textContent =
        "No saved designs yet. Save your current design to return to it later.";
    }
    for (const saved of result.designs || []) {
      const button = document.createElement("button");
      button.className = "saved-design";
      button.textContent = `${saved.design.name} · ${saved.design.pieces.length} cushion${saved.design.pieces.length === 1 ? "" : "s"} · ${new Date(saved.updatedAt).toLocaleDateString("en-GB")}`;
      button.onclick = async () => {
        if (!validSaved(saved.design)) {
          notify("This saved design needs an update before it can be opened.");
          return;
        }
        remember();
        design = clone(saved.design);
        revision = saved.revision;
        selectedId = design.pieces[0].spec.id;
        mode = "configurator";
        await hydrateDesignFabrics();
        persist();
        render();
        scheduleQuote();
        dialog.close();
        notify("Your design is ready to continue.");
      };
      $("#review-content").append(button);
    }
  } catch (e) {
    $("#review-content").textContent = e.message;
  }
  dialog.showModal();
}
function showActionLink(label, url) {
  try {
    const parsed = new URL(url, location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) return;
    const link = document.createElement("a");
    link.href = parsed.href;
    link.target = "_top";
    link.textContent = label;
    link.className = "action-link";
    const inDialog = $("#review-dialog").open;
    (inDialog ? $("#review-content") : $("#status")).append(
      document.createElement("br"),
      link,
    );
    if (!inDialog && !$("#status .dismiss-notice")) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "dismiss-notice";
      dismiss.textContent = "Dismiss";
      dismiss.setAttribute("aria-label", "Dismiss notification");
      dismiss.onclick = () => {
        $("#status").hidden = true;
        $("#status").replaceChildren();
      };
      $("#status").append(dismiss);
      $("#status").hidden = false;
    }
    clearTimeout(statusTimer);
  } catch {}
}
function reviewPlacement(spec) {
  const describe = (placement) =>
    `${placement.x / 10} cm across, ${placement.y / 10} cm down`;
  if (sizeOf(spec.sizeId).shape === "bolster")
    return `Continuous body placement: ${describe(spec.placementMm)}. Both matching end caps: ${describe(spec.bolsterEndPlacementMm ?? spec.placementMm)}.`;
  return `Shared front/back placement: ${describe(spec.placementMm)}.`;
}
function review(scope) {
  dialogTrigger = document.activeElement;
  reviewScope = scope;
  checkoutKey = uid();
  const pieces = scope === "piece" ? [current()] : design.pieces,
    quote =
      scope === "piece"
        ? quotes.find(
            (q) => q.specs?.length === 1 && q.specs[0].id === selectedId,
          )
        : setQuote,
    canBuy = quoteReviewState(quote, purchaseEnabled).canBuy;
  $("#review-dialog h2").textContent =
    scope === "piece" ? "Review your cushion" : "Review your arrangement";
  $("#confirm-review").hidden = false;
  $("#confirm-review").disabled = false;
  $("#confirm-review").textContent = editingOrderId ? "Update my order" : scope === "piece" ? "Add to my order" : "Add set to my order";
  $("#review-content").innerHTML = cushionReviewMarkup({
    pieces: pieces.map((piece) => ({
      id: piece.spec.id,
      number: design.pieces.findIndex((p) => p.spec.id === piece.spec.id) + 1,
      size: sizes.find(([id]) => id === piece.spec.sizeId)?.[1],
      fabric: labelOf(fabricOf(piece.spec)),
      finish: piece.spec.edge === "unpiped" ? "Unpiped" : piece.spec.edge === "self" ? "Self-piped" : "Contrast piping",
      filling: [fillingLabel(piece.spec), insertSpecificationLabel(piece.spec, insertEvidenceFor(piece.spec))].filter(Boolean).join(". "),
      quantity: piece.spec.quantity,
      placement: reviewPlacement(piece.spec),
    })),
    quote, purchaseEnabled, scope,
  });
  $("#confirm-review").onclick = () => addToOrder(editingOrderId ? "piece" : scope);
  $("#review-dialog").showModal();
}

function showWorkroom() {
  if (!config.ownerReview) return;
  dialogTrigger = document.activeElement;
  const dialog = $("#review-dialog"),
    content = $("#review-content");
  dialog.classList.add("workroom-dialog");
  dialog.querySelector("h2").textContent = "Workroom planning sheet";
  $("#confirm-review").hidden = true;
  content.replaceChildren();
  const notice = document.createElement("p");
  notice.className = "workroom-notice";
  notice.textContent =
    "PLANNING ONLY: check each specification's recorded approvals and outstanding requirements before cutting. Supplier cutting width is separate from photographed width. Fabric-specific matching, piping consumption, compatible insert records and commercial terms require their own evidence.";
  content.append(notice);
  const title = document.createElement("h3");
  title.textContent = design.name;
  content.append(title);
  for (const [i, piece] of design.pieces.entries()) {
    const spec = piece.spec,
      fabric = fabricOf(spec),
      section = document.createElement("article");
    section.className = "workroom-piece";
    const heading = document.createElement("h3");
    heading.textContent = `Cushion ${i + 1} · ${sizes.find(([id]) => id === spec.sizeId)?.[1]}`;
    section.append(heading);
    const detail = document.createElement("p");
    detail.textContent = `${labelOf(fabric)} · Fabric ID ${spec.fabricId} · ${fillingLabel(spec)} · ${spec.edge} edge · quantity ${spec.quantity}.`;
    section.append(detail);
    if (spec.filling === "filled") {
      const insert = document.createElement("p");
      insert.textContent = insertSpecificationLabel(spec, insertEvidenceFor(spec));
      section.append(insert);
    }
    if (spec.edge === "contrast") {
      const line = document.createElement("p");
      line.textContent = `Piping: ${labelOf(fabrics.find((f) => f.id === spec.pipingFabricId))} (${spec.pipingFabricId}).`;
      section.append(line);
    }
    const instructions = document.createElement("p");
    instructions.textContent = sizeOf(spec.sizeId).shape === "bolster"
      ? `The two outward end caps must have identical upright, unmirrored artwork. The body is one continuous wrap, so its opposite views show successive portions of the fabric. Body motif anchor on original cloth: ${spec.placementMm.x} mm across, ${spec.placementMm.y} mm down. Do not mirror, rotate, tile or stretch the source artwork.`
      : `Front and back must be identical, upright and unmirrored. Shared nominal motif anchor on original cloth: ${spec.placementMm.x} mm across, ${spec.placementMm.y} mm down. Do not mirror, rotate, tile or stretch the source artwork.`;
    if (!spec.manufacturingProfile && sizeOf(spec.sizeId).shape === "square") {
      const dimensions = sizeOf(spec.sizeId),
        footprint = squareDrapeFootprint(
          dimensions.widthMm,
          dimensions.heightMm,
        );
      instructions.textContent += ` Curved-face source bounds relative to that anchor: ${footprint.minX.toFixed(2)}, ${footprint.minY.toFixed(2)} to ${footprint.maxX.toFixed(2)}, ${footprint.maxY.toFixed(2)} mm. Cutting includes this expanded cloth footprint and the per-size approved seam allowance recorded in the server cut plan.`;
    }
    if (!spec.manufacturingProfile && spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION) {
      const footprint = shapeDrapeFootprints(sizeOf(spec.sizeId));
      instructions.textContent += ` Construction profile ${spec.constructionProfile}: net ${footprint.body.cutShape} envelope ${footprint.body.visibleWidthMm.toFixed(2)} × ${footprint.body.visibleHeightMm.toFixed(2)} mm. This is the shaped cloth extent, not a confirmed cutting dimension. Use the server cut plan for the per-size seam allowance and approval state.`;
    }
    section.append(instructions);
    if (spec.manufacturingProfile === "flat-sewn-v1") {
      instructions.textContent += " Manufacturing profile flat-sewn-v1: finished dimensions measured flat. See the server cutting diagram for panels, per-edge allowances, closure and recorded approval status. Visual fullness does not increase fabric consumption or insert size. Inserts must be sold as compatible with the finished cover size.";
    }
    if (sizeOf(spec.sizeId).shape === "bolster") {
      const line = document.createElement("p"),
        cap = spec.bolsterEndPlacementMm || spec.placementMm;
      instructions.textContent += ` Bolster body uses one continuous upright, unmirrored cloth wrap with the joining seam underneath. Opposite body views show successive portions of this wrap; the two outward end panels have identical upright placement. Body origin ${spec.placementMm.x}, ${spec.placementMm.y} mm. Construction profile ${spec.constructionProfile || "legacy"}.`;
      const footprint = !spec.manufacturingProfile && spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION ? shapeDrapeFootprints(sizeOf(spec.sizeId)) : null;
      line.textContent = footprint
        ? `Net body ${footprint.body.visibleWidthMm.toFixed(2)} × ${footprint.body.visibleHeightMm.toFixed(2)} mm; two matching net circular ends Ø${footprint.end.visibleWidthMm.toFixed(2)} mm, sharing origin ${cap.x}, ${cap.y} mm. The domed ends complete the finished ${sizeOf(spec.sizeId).widthMm} mm overall length. Use the server cut plan for confirmed allowances; never cut from a net-only envelope.`
        : `Bolster body: one continuous ${sizeOf(spec.sizeId).widthMm} × ${(Math.PI * sizeOf(spec.sizeId).heightMm).toFixed(2)} mm visible strip, plus seam allowances. Two matching Ø${sizeOf(spec.sizeId).heightMm} mm end caps share origin ${cap.x}, ${cap.y} mm.`;
      section.append(line);
    }
    if (fabric?.imageUrl) {
      const image = document.createElement("img");
      image.className = "workroom-source";
      image.src = fabric.imageUrl;
      image.alt = `Original full-width cloth image: ${labelOf(fabric)}`;
      section.append(image);
      const caption = document.createElement("p");
      caption.textContent = fabric.calibration
        ? `Original source represents ${fabric.calibration.physicalWidthMm} × ${fabric.calibration.physicalHeightMm} mm. ${fabric.calibration.evidence}`
        : "Original physical image calibration is unavailable.";
      section.append(caption);
      const link = document.createElement("a");
      link.href = fabric.imageUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open original fabric image";
      section.append(link);
    }
    content.append(section);
  }
  for (const quote of setQuote ? [setQuote] : quotes) {
    const section = document.createElement("section");
    section.className = "workroom-cost";
    const heading = document.createElement("h3");
    heading.textContent = config.ownerReview
      ? "Cut plan & local owner cost basis"
      : "Cut plan";
    section.append(heading);
    if (config.ownerReview && typeof quote.knownCostMinor === "number") {
      const cost = document.createElement("p");
      cost.textContent = `Known cost components: ${money(quote.knownCostMinor)}. ${quote.totalCostMinor == null ? "Complete cost is unresolved." : `Calculated cost basis: ${money(quote.totalCostMinor)}.`} This is not a customer selling price.`;
      section.append(cost);
      for (const line of quote.costLines || []) {
        const p = document.createElement("p");
        p.textContent = line.label + " · " + money(line.amountMinor);
        section.append(p);
      }
      if (quote.staffPricing) {
        const p = document.createElement("p"),
          staff = quote.staffPricing;
        p.textContent = `Staff margin: target ${staff.targetMarginBasisPoints == null ? "not configured" : (staff.targetMarginBasisPoints / 100).toFixed(2) + "%"}; resulting after rounding and discount ${staff.resultingMarginBasisPoints == null ? "not calculable" : (staff.resultingMarginBasisPoints / 100).toFixed(2) + "%"}. Net discount: ${money(staff.discountNetMinor || 0)}.`;
        section.append(p);
        const delivery = document.createElement("p");
        delivery.textContent = `Customer delivery: ${quote.deliveryGrossMinor == null ? "not configured" : money(quote.deliveryGrossMinor) + " including VAT"}. Actual carrier expense (net): ${staff.carrierCostMinor == null ? "not recorded" : money(staff.carrierCostMinor)}. Delivery contribution (net): ${staff.deliveryContributionMinor == null ? "unknown until carrier expense is recorded" : money(staff.deliveryContributionMinor)}. Product margin excludes delivery.`;
        section.append(delivery);
      }
    }
    if (quote.cutPlan) renderCutPlan(quote.cutPlan, section);
    const issues = document.createElement("ul");
    for (const issue of quote.issues || []) {
      const li = document.createElement("li");
      li.textContent = issue;
      issues.append(li);
    }
    section.append(issues);
    content.append(section);
  }
  const actions = document.createElement("div");
  actions.className = "workroom-actions";
  const print = document.createElement("button");
  print.className = "outline";
  print.textContent = "Print workroom sheet";
  print.onclick = () => window.print();
  const download = document.createElement("button");
  download.className = "outline";
  download.textContent = "Download planning packet";
  download.onclick = () => {
    const ids = new Set(
        design.pieces.flatMap((p) => [p.spec.fabricId, p.spec.pipingFabricId]),
      ),
      packet = {
        version: 1,
        type: "cushion-workroom-planning",
        approvedForManufacture: false,
        generatedAt: new Date().toISOString(),
        design,
        quotes,
        setQuote,
        fabrics: fabrics
          .filter((f) => ids.has(f.id))
          .map((f) => ({
            id: f.id,
            design: f.design,
            colour: f.colour,
            imageUrl: f.imageUrl,
            calibration: f.calibration,
          })),
      },
      url = URL.createObjectURL(
        new Blob([JSON.stringify(packet, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `cushion-workroom-${design.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  actions.append(print, download);
  content.append(actions);
  dialog.showModal();
}
function wire() {
  $("#design-name").oninput = (e) => {
    design.name = e.target.value.trim() || "My cushion design";
    persist();
  };
  $("#review-dialog").addEventListener("close", () => {
    dialogTrigger?.focus();
    $("#review-dialog").classList.remove("workroom-dialog");
  });
  $("#reset-design").onclick = () =>
    change(() => {
      const fabricId = current()?.spec.fabricId || fabrics[0]?.id;
      design = {
        version: 1,
        id: uid(),
        name: "My cushion design",
        scene: "sofa-2",
        colours: { furniture: "#b9b8a5", wall: "#e8e3d8", floor: "#b5a18a" },
        pieces: [freshPiece(fabricId)],
      };
      design.pieces[0].position.slot = 1;
      selectedId = design.pieces[0].spec.id;
      revision = 0;
      mode = "configurator";
      face = "front";
    });
  $("#workroom").onclick = showWorkroom;
  $("#pieces").onclick = (e) => {
    const button = e.target.closest("[data-id]");
    if (button) {
      selectedId = button.dataset.id;
      face = "front";
      render();
      persist();
    }
  };
  $("#shapes").onclick = (e) => {
    const b = e.target.closest("[data-shape]");
    if (!b || !current()) return;
    change(() => {
      selectSize(current().spec, activeSizes.find(
        ([id]) => sizeOf(id).shape === b.dataset.shape,
      )[0], { announce: true });
      face = "front";
    });
  };
  $("#size").onchange = (e) =>
    change(() => {
      selectSize(current().spec, e.target.value, { announce: true });
      face = "front";
    });
  $("#filling").onchange = (e) =>
    change(() => {
      const spec = current().spec;
      selectFilling(spec, e.target.value);
      if (e.target.value === "legacy-filled") return;
      const notice = $("#size-change-notice");
      notice.textContent = "Your explicit filling choice now uses the current range pairing. Insert fit and pricing will be revalidated. Use Undo to restore the saved choice.";
      notice.dataset.pieceId = spec.id;
      notice.dataset.sizeId = spec.sizeId;
    });
  $("#fabrics").onclick = (e) => {
    const b = e.target.closest("[data-fabric]");
    if (!b || !current()) return;
    change(() => {
      current().spec.fabricId = b.dataset.fabric;
      normalisePlacement(current().spec);
    });
  };
  $("#fabric-search").oninput = () => {
    catalogueExpanded = true;
    ++searchRequest;
    clearTimeout(searchTimer);
    catalogueLoading = true;
    catalogueIds = [];
    nextOffset = 0;
    $("#fabric-results-status").textContent = "Finding your fabrics...";
    $("#fabrics").setAttribute("aria-busy", "true");
    renderFabrics();
    searchTimer = setTimeout(
      () => loadCatalogue($("#fabric-search").value),
      300,
    );
  };
  $("#edges").onclick = (e) => {
    const b = e.target.closest("[data-edge]");
    if (!b || b.disabled || b.dataset.edge === "contrast" || !current()) return;
    change(() => {
      current().spec.edge = b.dataset.edge;
    });
  };
  for (const axis of ["x", "y"])
    for (const prefix of ["offset", "end"]) {
      const el = $("#" + prefix + "-" + axis);
      el.addEventListener("pointerdown", () => remember());
      el.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow")) remember();
      });
      el.oninput = () => {
        const spec = current().spec,
          key = prefix === "end" ? "bolsterEndPlacementMm" : "placementMm";
        spec[key] = {
          ...(spec[key] || spec.placementMm),
          [axis]: Number(el.value),
        };
        persist();
        renderPlacement();
        renderScene();
        scheduleQuote();
      };
    }
  $("#add").onclick = () => {
    if (design.pieces.length >= 32) {
      notify("This design can hold up to 32 cushions.");
      return;
    }
    change(() => {
      const piece = freshPiece(current()?.spec.fabricId || fabrics[0]?.id);
      design.pieces.push(piece);
      selectedId = piece.spec.id;
      mode = "configurator";
    });
  };
  $("#duplicate").onclick = () =>
    change(() => {
      if (design.pieces.length >= 32) return;
      const piece = clone(current());
      piece.spec.id = uid();
      piece.position.slot = (piece.position.slot + 1) % 3;
      design.pieces.push(piece);
      selectedId = piece.spec.id;
    });
  $("#remove").onclick = () => {
    if (design.pieces.length < 2) return;
    change(() => {
      design.pieces = design.pieces.filter((p) => p.spec.id !== selectedId);
      selectedId = design.pieces[0].spec.id;
    });
  };
  $("#undo").onclick = () => {
    if (!history.length) return;
    knownRevisions.set(design.id, revision);
    const previous = restoreHistory(history.pop(), knownRevisions);
    design = previous.design;
    revision = previous.revision;
    selectedId = previous.selectedId;
    mode = previous.mode;
    persist();
    render();
    scheduleQuote();
  };
  $$("[data-place]").forEach(
    (b, i) =>
      (b.onclick = () =>
        change(() => (current().position.slot = i), { quote: false })),
  );
  $("#furniture").onchange = (e) =>
    change(() => (design.scene = e.target.value), { quote: false });
  $("#floor").onchange = (e) =>
    change(() => (design.colours.floor = e.target.value), { quote: false });
  $$("[data-camera]").forEach(
    (b) =>
      (b.onclick = () => {
        camera = b.dataset.camera;
        $$("[data-camera]").forEach((x) => {
          x.classList.toggle("active", x === b);
          x.setAttribute("aria-pressed", String(x === b));
        });
        renderScene();
      }),
  );
  $("#save").onclick = save;
  $("#restore").onclick = restore;
  $("#add-piece-order").onclick = () => addToOrder("piece");
  $("#add-set-order").onclick = () => addToOrder("set");
  $("#my-home-link").href = myHomeUrl;
  $("#buy-set").onclick = () => review("set");
  $("#buy-piece").onclick = () => review("piece");
  $("#close-review").onclick = () => $("#review-dialog").close();
  $("#confirm-review").onclick = async () => {
    await save();
    $("#review-dialog").close();
  };
  $("#compare").onclick = () => {
    comparison = {
      ...historySnapshot(design, { revision, selectedId, mode }),
      image: scene?.capture(),
    };
    try {
      sessionStorage.setItem(COMPARE, JSON.stringify(comparison));
    } catch {}
    renderComparison();
    notify(
      "Comparison kept. Continue editing, then compare with this version.",
    );
  };
  $("#samples").onclick = async () => {
    const f = fabricOf(current()?.spec);
    if (!f || $("#samples").disabled) return;
    $("#samples").disabled = true;
    try {
      const result = await api("/samples", { fabricId: f.id });
      if (
        result.purchaseEnabled === true &&
        !config.ownerReview &&
        result.variantId
      ) {
        const cartResponse = await fetch("/cart.js", { cache: "no-store" });
        if (!cartResponse.ok)
          throw Error("Unable to check your basket. Please retry.");
        const cart = await cartResponse.json(),
          existing = cart.items?.find(
            (line) =>
              line.variant_id === result.variantId &&
              line.properties?.["Fabric Master ID"] === f.id,
          );
        if (existing) {
          if (
            existing.quantity !== result.quantity ||
            existing.properties?.["_CurtainsUK identity signature"] !==
              result.properties?.["_CurtainsUK identity signature"]
          )
            throw Error(
              "Your basket contains this sample with different details. Review it before continuing.",
            );
        } else {
          const response = await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  id: result.variantId,
                  quantity: result.quantity,
                  properties: result.properties,
                },
              ],
            }),
          });
          if (!response.ok)
            throw Error(
              "Sample addition could not be confirmed. Review your basket before retrying.",
            );
        }
        const link = document.createElement("a");
        link.href = "/cart";
        link.target = "_top";
        link.click();
      } else {
        notify(result.message || "Review this fabric and its sample options.");
        if (f.fabricProfileUrl)
          showActionLink("Open " + labelOf(f), f.fabricProfileUrl);
      }
    } catch (e) {
      notify(e.message);
      if (f.fabricProfileUrl)
        showActionLink("Open " + labelOf(f), f.fabricProfileUrl);
    } finally {
      $("#samples").disabled = !fabricOf(current()?.spec)?.sampleAvailable;
    }
  };
}
function renderComparison() {
  const panel = $("#comparison");
  panel.hidden = !comparison;
  if (!comparison) return;
  panel.innerHTML = `<p>YOUR KEPT ${comparison.mode === "layout" ? "ARRANGEMENT" : "CUSHION"}</p>${comparison.image ? `<img src="${comparison.image}" alt="Saved comparison view">` : ""}<button id="restore-comparison">Use this version</button> · <button id="clear-comparison">Clear comparison</button>`;
  $("#restore-comparison").onclick = async () => {
    remember();
    const previous = restoreHistory(comparison, knownRevisions);
    design = previous.design;
    revision = previous.revision;
    selectedId = previous.selectedId;
    mode = previous.mode;
    await hydrateDesignFabrics();
    persist();
    render();
    scheduleQuote();
  };
  $("#clear-comparison").onclick = () => {
    comparison = null;
    sessionStorage.removeItem(COMPARE);
    renderComparison();
  };
}
async function start() {
  prepareShell();
  wire();
  if (editingOrderId) {
    for (const id of ["save","restore","add","duplicate","remove"]) $("#"+id).hidden=true;
    $("#buy-set").hidden=true;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!editingOrderId && !orderParams.has("new_order_product") && validSaved(saved?.design)) {
      design = saved.design;
      selectedId = design.pieces.some((p) => p.spec.id === saved.selectedId)
        ? saved.selectedId
        : design.pieces[0].spec.id;
      mode = saved.mode === "layout" ? "layout" : "configurator";
      revision = saved.revision || 0;
      for (const [id, value] of saved.knownRevisions || []) {
        if (typeof id === "string" && Number.isInteger(value) && value >= 0)
          knownRevisions.set(id, value);
      }
      knownRevisions.set(design.id, revision);
    }
  } catch {}
  try {
    comparison = JSON.parse(sessionStorage.getItem(COMPARE));
    if (!validSaved(comparison?.design)) comparison = null;
  } catch {}
  try {
    scene = await createStudioScene($("#scene"), {
      threeUrl: config.threeUrl,
      onSelect: (id) => {
        selectedId = id;
        render();
        persist();
      },
      onMove: (direction) => {
        if (current())
          change(
            () =>
              (current().position.slot = Math.max(
                0,
                Math.min(2, (current().position.slot % 3) + direction),
              )),
            { quote: false },
          );
      },
      onRenderError: notify,
      onInspectionStatus: (message) => {
        $("#inspection-status").textContent = message;
      },
    });
  } catch {
    notify(
      "3D is unavailable in this browser. Your design controls remain available.",
    );
  }
  if (editingOrderId) {
    try {
      const order=OrderStore.ensure(), item=OrderStore.orderItem(order,editingOrderId);
      if (!item || item.type !== "CUSHION") throw Error("This cushion is no longer in Design My Home. Return to your order before editing.");
      orderRevision=order.revision;
      design={...design,id:item.sourceDesignId,name:"Editing my ordered cushion",pieces:[{spec:{...clone(item.spec),quantity:item.quantity},position:{slot:0,offsetX:0,offsetY:0,rotation:0}}]};
      selectedId=design.pieces[0].spec.id;
    } catch(error) { notify(error.message); return; }
  }
  await loadCatalogue();
  const requestedFabric = new URLSearchParams(location.search).get("fabric");
  if (
    !editingOrderId && requestedFabric &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/.test(requestedFabric)
  ) {
    try {
      const result = await api(
          "/catalogue?ids=" + encodeURIComponent(requestedFabric),
        ),
        fabric = result.items?.find((f) => f.id === requestedFabric);
      if (fabric) {
        if (!fabrics.some((f) => f.id === fabric.id)) fabrics.push(fabric);
        remember();
        const piece = freshPiece(fabric.id);
        design = {
          ...design,
          id: uid(),
          name: labelOf(fabric) + " cushion",
          pieces: [piece],
        };
        selectedId = piece.spec.id;
        revision = 0;
        mode = "configurator";
      } else
        notify("That fabric is not currently available in Cushion Studio.");
    } catch {
      notify(
        "The linked fabric could not be loaded. You can still browse the collection.",
      );
    }
  }
  await hydrateDesignFabrics();
  if (design.pieces.length) {
    for (const p of design.pieces)
      if (fabricOf(p.spec) && sizeOf(p.spec.sizeId).shape !== "square")
        normalisePlacement(p.spec);
    render();
    scheduleQuote();
  }
  renderComparison();
  if (window.parent !== window) {
    document.body.classList.add("embedded-studio");
    const visual = document.querySelector(".visual");
    const workspace = document.querySelector(".workspace");
    const scene = document.querySelector("#scene");
    const fitPreview = (data) => {
      if (data?.type !== "cuk-cushion-viewport" || !Number.isFinite(data.availableHeight) || !Number.isFinite(data.offset)) return;
      if (matchMedia("(max-width: 760px)").matches) {
        scene.style.height = `${Math.max(220, Math.min(320, Math.floor(data.availableHeight * .42)))}px`;
        visual.style.removeProperty("--cuk-preview-shift");
        return;
      }
      const chrome = visual.offsetHeight - scene.offsetHeight;
      scene.style.height = `${Math.max(260, Math.min(720, Math.floor(data.availableHeight - chrome)))}px`;
      const boundary = Math.max(0, workspace.offsetHeight - visual.offsetHeight);
      const currentShift = Number.parseFloat(visual.style.getPropertyValue("--cuk-preview-shift")) || 0;
      const naturalTop = visual.getBoundingClientRect().top - currentShift;
      const desiredShift = data.offset - naturalTop;
      visual.style.setProperty("--cuk-preview-shift", `${Math.min(boundary, Math.max(0, desiredShift))}px`);
    };
    window.addEventListener("message", (event) => {
      if (event.origin === window.location.origin && event.source === window.parent) fitPreview(event.data);
    });
    const sendHeight = () =>
      window.parent.postMessage(
        {
          type: "cuk-cushion-height",
          height: Math.ceil(document.documentElement.scrollHeight),
        },
        "*",
      );
    new ResizeObserver(sendHeight).observe(document.body);
    sendHeight();
  }
}
start();
