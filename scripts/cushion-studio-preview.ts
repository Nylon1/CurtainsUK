/** Local review only. Run with node --conditions=react-server --import tsx. */
import { createServer } from "node:http";
import { handleCushionApi } from "../lib/cushion-studio/server";
import { cushionPreviewAsset } from "../lib/cushion-studio/preview-assets";
import { localCushionPreviewUrl } from "../lib/cushion-studio/local-preview-url";

if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("CUSHION_LOCAL_PREVIEW_ONLY");
process.env.CUSHION_STUDIO_LOCAL_PREVIEW = "true";
const port = Number(process.env.CUSHION_STUDIO_PREVIEW_PORT ?? 4357);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535)
  throw new Error("CUSHION_PORT_INVALID");
const origin = `http://127.0.0.1:${port}`;
const server = createServer(async (incoming, outgoing) => {
  try {
    if (
      ![`127.0.0.1:${port}`, `localhost:${port}`].includes(
        incoming.headers.host ?? "",
      )
    ) {
      outgoing.writeHead(403);
      outgoing.end();
      return;
    }
    const url = localCushionPreviewUrl(incoming.headers.host, port, incoming.url ?? "/");
    const requestHeaders = new Headers();
    for (const [name, value] of Object.entries(incoming.headers))
      if (value)
        requestHeaders.set(
          name,
          Array.isArray(value) ? value.join(",") : value,
        );
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 131072) throw new Error("BODY_TOO_LARGE");
      chunks.push(chunk);
    }
    const request = new Request(url, {
      method: incoming.method,
      headers: requestHeaders,
      ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
    });
    let response: Response;
    if (url.pathname.startsWith("/api/cushion-studio/"))
      response = await handleCushionApi(
        request,
        url.pathname.slice("/api/cushion-studio/".length),
      );
    else if (url.pathname === "/")
      response = Response.redirect(`${url.origin}/cushion-studio-preview/`, 302);
    else if (url.pathname.startsWith("/cushion-studio-preview/"))
      response = await cushionPreviewAsset(
        url.pathname.slice("/cushion-studio-preview/".length),
      );
    else response = new Response("Not found", { status: 404 });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(400, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify({ code: "CUSHION_PREVIEW_REQUEST_REJECTED" }));
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Unpublished Cushion Studio review: ${origin}/cushion-studio-preview/`,
  ),
);
