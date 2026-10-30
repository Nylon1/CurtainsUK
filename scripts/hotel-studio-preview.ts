/** Local review of the same studio source. No credentials, email or database writes. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hotelAsset, hotelReviewCatalogue } from "../lib/hotel-studio/server";
if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw Error("LOCAL_REVIEW_ONLY");
const port = Number(process.env.HOTEL_PREVIEW_PORT ?? 4368);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("INVALID_PORT");
createServer(async (req, res) => {
  try {
    if (
      ![`127.0.0.1:${port}`, `localhost:${port}`].includes(
        req.headers.host ?? "",
      ) ||
      req.method !== "GET"
    ) {
      res.writeHead(403);
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`),
      request = new Request(url);
    let response: Response;
    if (url.pathname === "/")
      response = Response.redirect(
        `${url.origin}/hotel-design-studio-preview/`,
        302,
      );
    else if (url.pathname === "/hotel-design-studio-preview/catalog")
      response = await hotelReviewCatalogue(request);
    else if (url.pathname.startsWith("/hotel-design-studio-preview/"))
      response = await hotelAsset(
        request,
        url.pathname.slice("/hotel-design-studio-preview/".length),
        true,
      );
    else if (url.pathname.startsWith("/room-visualiser/")) {
      const root = path.resolve("public/room-visualiser"),
        file = path.resolve(
          "public",
          decodeURIComponent(url.pathname).slice(1),
        );
      if (!file.startsWith(root + path.sep)) throw Error("PATH_DENIED");
      const types: Record<string, string> = {
        ".mjs": "text/javascript",
        ".js": "text/javascript",
        ".json": "application/json",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".bin": "application/octet-stream",
        ".glb": "model/gltf-binary",
        ".css": "text/css",
        ".html": "text/html",
      };
      response = new Response(new Uint8Array(await readFile(file)), {
        headers: {
          "Content-Type":
            types[path.extname(file)] ?? "application/octet-stream",
          "Cache-Control": "public,max-age=3600",
        },
      });
    } else response = new Response("Not found", { status: 404 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(404);
    res.end("This asset could not load.");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(
    `Hotel Studio review: http://127.0.0.1:${port}/hotel-design-studio-preview/`,
  ),
);
