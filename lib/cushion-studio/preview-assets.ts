import { readFile } from "node:fs/promises";
import path from "node:path";

/** Explicit allowlist; no request-derived filesystem paths. */
export async function cushionPreviewAsset(
  asset: string,
  options = {
    base: "/cushion-studio-preview/",
    apiBase: "/api/cushion-studio",
    ownerPreview: true,
  },
) {
  const root = path.join(process.cwd(), "lib/cushion-studio/runtime");
  if (asset.startsWith("range-review.") && !options.ownerPreview)
    return new Response("Not found", { status: 404 });
  const mime: Record<string, string> = {
    "range-review.html": "text/html; charset=utf-8",
    "range-review.mjs": "text/javascript; charset=utf-8",
    "index.html": "text/html; charset=utf-8",
    "studio.css": "text/css; charset=utf-8",
    "studio.mjs": "text/javascript; charset=utf-8",
    "scene.mjs": "text/javascript; charset=utf-8",
    "geometry.mjs": "text/javascript; charset=utf-8",
    "state.mjs": "text/javascript; charset=utf-8",
    "three.module.js": "text/javascript; charset=utf-8",
    "three.core.js": "text/javascript; charset=utf-8",
  };
  if (asset === "LICENSE.txt")
    return new Response(
      await readFile(
        path.join(
          process.cwd(),
          "lib/room-visualiser/runtime/vendor/LICENSE.txt",
        ),
        "utf8",
      ),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  if (asset === "arrangement.mjs")
    return new Response(
      await readFile(path.join(root, "arrangement.mjs"), "utf8"),
      {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  const filename = asset || "index.html";
  if (!Object.hasOwn(mime, filename))
    return new Response("Not found", { status: 404 });
  const file = filename.startsWith("three.")
    ? path.join(process.cwd(), "lib/room-visualiser/runtime/vendor", filename)
    : path.join(root, filename);
  let body: string = await readFile(file, "utf8");
  if (filename === "index.html" || filename === "range-review.html")
    body = body.replace(
      "<head>",
      `<head><base href="${options.base}"><meta name="robots" content="noindex,nofollow"><script>window.CUSHION_STUDIO_CONFIG=${JSON.stringify({ apiBase: options.apiBase, threeUrl: `${options.base}three.module.js`, ownerPreview: options.ownerPreview, ownerReview: options.ownerPreview }).replaceAll("<", "\\u003c")};</script>`,
    );
  return new Response(body, {
    headers: {
      "Content-Type": mime[filename],
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
