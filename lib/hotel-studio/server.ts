import { readFile } from "node:fs/promises";
import path from "node:path";
import build from "../room-visualiser/build.json";
import { PANAZ_FABRICS, listedUse } from "./runtime/panaz-catalogue.mjs";

export const HOTEL_ASSETS: Record<string, string> = {
  "index.html": "text/html; charset=utf-8",
  "studio.css": "text/css; charset=utf-8",
  "studio.mjs": "text/javascript; charset=utf-8",
  "model.mjs": "text/javascript; charset=utf-8",
  "scene.mjs": "text/javascript; charset=utf-8",
  "exports.mjs": "text/javascript; charset=utf-8",
  "garden.webp": "image/webp",
  "pdf-lib.min.js": "text/javascript; charset=utf-8",
  "PDF-LIB-LICENSE.txt": "text/plain; charset=utf-8",
  "panaz-catalogue.mjs": "text/javascript; charset=utf-8",
  "fontkit.min.js": "text/javascript; charset=utf-8",
  "NotoSans-Regular.ttf": "font/ttf",
  "NotoSans-Bold.ttf": "font/ttf",
  "NOTO-LICENSE.txt": "text/plain",
  "FONTKIT-LICENSE.txt": "text/plain",
  ...Object.fromEntries(PANAZ_FABRICS.map((f) => [f.image, "image/jpeg"])),
};
const origin = "https://www.curtainsuk.com";
export function hotelPreviewAllowed(request: Request) {
  const host = new URL(request.url).hostname;
  return (
    process.env.VERCEL_ENV === "preview" ||
    (!process.env.VERCEL &&
      process.env.NODE_ENV !== "production" &&
      ["127.0.0.1", "localhost"].includes(host))
  );
}
export async function hotelAsset(
  request: Request,
  asset = "",
  preview = false,
) {
  const name = asset || "index.html";
  if (!Object.hasOwn(HOTEL_ASSETS, name))
    return new Response("Not found", { status: 404 });
  const body = await readFile(
    path.join(process.cwd(), "lib/hotel-studio/runtime", name),
  );
  const requestOrigin = new URL(request.url).origin;
  const assetBase = preview
    ? `${requestOrigin}/hotel-design-studio-preview/`
    : `${origin}/apps/curtainsuk-decision/hotel-studio/`;
  const rendererOrigin = preview
    ? requestOrigin
    : "https://curtainsuk-production-api.vercel.app";
  const config = {
    assetBase,
    rendererBase: `${rendererOrigin}${build.assetBase}`,
    catalogueOrigin: "https://curtainsuk-production-api.vercel.app",
    catalogueUrl: `${assetBase}catalog`,
    preview,
  };
  const html =
    name === "index.html"
      ? body
          .toString("utf8")
          .replace(
            "__HOTEL_CONFIG__",
            JSON.stringify(config).replaceAll("<", "\\u003c"),
          )
          .replaceAll("__HOTEL_BASE__", assetBase)
          .replaceAll(
            "__THREE_BASE__",
            `${rendererOrigin}${build.assetBase}vendor/`,
          )
      : null;
  return new Response(html ?? new Uint8Array(body), {
    headers: {
      "Content-Type": HOTEL_ASSETS[name],
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
/** Supplier snapshot, isolated from the domestic catalogue. No stock, price or approval claims. */
export async function hotelReviewCatalogue(request: Request) {
  const input = new URL(request.url).searchParams,
    q = (input.get("query") ?? "").slice(0, 200).toLowerCase(),
    item = input.get("item") ?? "curtains",
    range = (input.get("range") ?? "").slice(0, 100);
  const fabrics = PANAZ_FABRICS.filter(
    (f) =>
      f.availability !== "Discontinued" &&
      (!range ||
        (range === "sheers"
          ? f.productType === "Sheer"
          : f.design === range)) &&
      `${f.brand} ${f.design} ${f.colour} ${f.reference}`
        .toLowerCase()
        .includes(q),
  ).sort((a, b) => Number(listedUse(b, item)) - Number(listedUse(a, item)));
  return Response.json(
    {
      fabrics,
      nextCursor: null,
      observedAt: "2026-10-30",
      scope:
        "Selected Panaz plain FR colourways; supplier snapshot, not the complete or live catalogue.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
