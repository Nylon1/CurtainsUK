import { readFile } from "node:fs/promises";
import path from "node:path";
import { STANDARD_LINING_GSM } from "./domain";
/** No arbitrary files: server pricing and supplier decisions are never assets. */
export async function smartTrackAsset(
  asset: string,
  base = "/apps/curtainsuk-decision/smart-track/",
) {
  const name = asset || "index.html";
  const images = [
    "room-living.webp",
    "room-bedroom.webp",
    "room-dining.webp",
    "room-office.webp",
    "room-patio.webp",
    "curtain-wave.webp",
  ];
  if (images.includes(name))
    return new Response(
      await readFile(path.join(process.cwd(), "lib/smart-track/runtime", name)),
      {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  const allowed = [
    "index.html",
    "fitting.html",
    "studio.css",
    "guide.css",
    "guide.mjs",
    "studio.mjs",
    "state.mjs",
    "scene.mjs",
    "room-design.mjs",
    "cloth.mjs",
  ];
  const store = name === "my-home-store.js";
  if (!allowed.includes(name) && !store)
    return new Response(null, { status: 404 });
  let body = store
    ? await readFile(
        path.join(
          process.cwd(),
          "shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms-store.js",
        ),
        "utf8",
      )
    : await readFile(
        path.join(process.cwd(), "lib/smart-track/runtime", name),
        "utf8",
      );
  if (name.endsWith(".html"))
    body = body.replace(
      "<head>",
      `<head><base href="${base}"><script src="${base}my-home-store.js"></script><script>window.SMART_TRACK_CONFIG=${JSON.stringify({ apiBase: base + "api", release: "smart-track-v1", standardLiningGsm: STANDARD_LINING_GSM }).replaceAll("<", "\\u003c")};</script>`,
    );
  return new Response(body, {
    headers: {
      "Content-Type": name.endsWith(".html")
        ? "text/html; charset=utf-8"
        : name.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex,nofollow",
    },
  });
}
