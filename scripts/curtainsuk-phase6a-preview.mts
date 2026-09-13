/** Loopback-only UX rehearsal. HCI runs unchanged in its own checkout/process. */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  projectHciView,
  HCI_SOURCE_COMMIT,
  type HciPilotResponse,
} from "../lib/storefront/hci-contract";
const source = process.env.HCI_SOURCE_DIR;
if (!source)
  throw new Error("Set HCI_SOURCE_DIR to the existing PR #24 checkout.");
if (
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim() !== HCI_SOURCE_COMMIT
)
  throw new Error("HCI source does not match the pinned PR #24 commit.");
const hci = "http://127.0.0.1:3001",
  port = 3260,
  origin = `http://127.0.0.1:${port}`;
const theme = resolve("shopify-theme/curtainsuk-dawn-16"),
  ui = resolve("lib/storefront/hci"),
  privateDir = resolve("artifacts/phase6a/private");
await mkdir(privateDir, { recursive: true });
// Render only HCI's existing first-party calibration component; no intelligence module is imported.
const require = createRequire(import.meta.url),
  ts = require("typescript");
for (const extension of [".ts", ".tsx"])
  require.extensions[extension] = (module, file: string) => {
    const text = require("node:fs").readFileSync(file, "utf8");
    (
      module as unknown as { _compile: (text: string, file: string) => void }
    )._compile(
      ts.transpileModule(text, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      file,
    );
  };
const { CalibrationVisual } = require(
  join(source, "src/components/CalibrationVisual.tsx"),
);
const React = require(join(source, "node_modules/react")),
  { renderToStaticMarkup } = require(
    join(source, "node_modules/react-dom/server"),
  );
type Session = {
  view: HciPilotResponse;
  results: Record<string, ReturnType<typeof projectHciView>>;
  updatedAt: string;
};
const locks = new Set<string>();
const uuid = (s: unknown): s is string =>
  typeof s === "string" && /^[a-f0-9-]{36}$/.test(s);
async function section(name: string) {
  let html = await readFile(join(theme, "sections", `${name}.liquid`), "utf8");
  html = html
    .replace(/{% schema %}[\s\S]*?{% endschema %}/g, "")
    .replace(/{%[\s\S]*?%}/g, "");
  html = html
    .replace(
      /{{ '([^']+\.css)'[^}]+}}/g,
      '<link rel="stylesheet" href="/theme-assets/$1">',
    )
    .replace(/{{ '([^']+\.js)'[^}]+}}/g, "/theme-assets/$1");
  html = html
    .replace(
      /{{ section.settings.consultation_url[^}]+}}/g,
      "/admin/curtain-consultation",
    )
    .replace(/{{ engine_base[^}]*}}/g, "/engine")
    .replace(
      /{{ settings.curtainsuk_review_email[^}]+}}/g,
      "enquiries@curtainsuk.com",
    )
    .replace(
      /{{ section.settings.review_request_path[^}]*}}/g,
      "review-request",
    )
    .replace(/{{ section.settings.initial_window[^}]*}}/g, "standard-window")
    .replace(
      /{{ section.settings.staging_checkout_host[^}]*}}/g,
      "curtainsuk-dev.myshopify.com",
    )
    .replace(/{{ section.id }}/g, "phase6a");
  return html;
}
createServer(async (req, res) => {
  const url = new URL(req.url || "/", origin);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (
    req.headers.host !== `127.0.0.1:${port}` ||
    (req.method !== "GET" && req.headers.origin !== origin)
  ) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (
      req.method === "POST" &&
      url.pathname === "/api/admin/curtain-consultation"
    ) {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 16000) {
          res.writeHead(413).end();
          return;
        }
      }
      const request = JSON.parse(body);
      const id = uuid(request.sessionId) ? request.sessionId : randomUUID();
      if (request.sessionId && !uuid(request.sessionId))
        throw new Error("Invalid consultation reference.");
      if (!uuid(request.requestId))
        throw new Error("Invalid request reference.");
      if (locks.has(id)) {
        res
          .writeHead(409)
          .end(
            JSON.stringify({
              error:
                "Your previous answer is still being considered. Please retry.",
            }),
          );
        return;
      }
      locks.add(id);
      try {
        const file = join(privateDir, `${id}.json`);
        let session: Session | undefined;
        try {
          session = JSON.parse(await readFile(file, "utf8"));
        } catch {
          if (request.sessionId)
            throw new Error(
              "This local consultation cannot be resumed. Start a new consultation.",
            );
        }
        if (
          session &&
          Date.now() - Date.parse(session.updatedAt) > 7 * 86400000
        )
          throw new Error(
            "This rehearsal session has expired. Start a new consultation.",
          );
        if (session?.results[request.requestId]) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(session.results[request.requestId]));
          return;
        }
        if (
          request.action &&
          request.revision !== session?.view.aggregate.revision
        )
          throw new Error(
            "This consultation changed in another tab. Refresh before answering again.",
          );
        const result = await fetch(`${hci}/api/internal-pilot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commands: session?.view.aggregate.commandLog || [],
            ...(request.action ? { action: request.action } : {}),
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (!result.ok)
          throw new Error(
            "HCI is temporarily unavailable. Your last accepted answers have been kept.",
          );
        const input = (await result.json()) as HciPilotResponse;
        const output = projectHciView(input, id);
        const updated: Session = {
          view: input,
          results: { ...session?.results, [request.requestId]: output },
          updatedAt: new Date().toISOString(),
        };
        await writeFile(`${file}.tmp`, JSON.stringify(updated), "utf8");
        await rename(`${file}.tmp`, file);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(output));
      } finally {
        locks.delete(id);
      }
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/hci-visual/")) {
      const id = decodeURIComponent(url.pathname.slice(12, -4));
      if (!/^[a-z0-9-]{1,70}$/.test(id))
        throw new Error("Invalid calibration reference");
      res.setHeader("Content-Type", "image/svg+xml");
      res.end(
        renderToStaticMarkup(
          React.createElement(CalibrationVisual, { stimulusId: id }),
        ).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '),
      );
      return;
    }
    if (
      req.method === "GET" &&
      /^\/hci-assets\/consultation\.(css|js)$/.test(url.pathname)
    ) {
      res.setHeader(
        "Content-Type",
        url.pathname.endsWith("css") ? "text/css" : "text/javascript",
      );
      res.end(await readFile(join(ui, url.pathname.split("/").pop()!)));
      return;
    }
    if (
      req.method === "GET" &&
      /^\/theme-assets\/curtainsuk-[a-z-]+\.(css|js)$/.test(url.pathname)
    ) {
      res.setHeader(
        "Content-Type",
        url.pathname.endsWith("css") ? "text/css" : "text/javascript",
      );
      res.end(
        await readFile(join(theme, "assets", url.pathname.split("/").pop()!)),
      );
      return;
    }
    if (
      url.pathname === "/catalog" ||
      /^\/engine\/(catalog|price|specialist-review|checkout-handoff|review-request|review-acceptance)$/.test(
        url.pathname,
      )
    ) {
      const operation =
        url.pathname === "/catalog" ? "catalog" : url.pathname.split("/").pop();
      if (!["GET", "POST"].includes(req.method || ""))
        throw new Error("Method unavailable");
      let body = "";
      if (req.method === "POST")
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 64000) throw new Error("Request too large");
        }
      const upstream = await fetch(
        `https://www.curtainsuk.com/apps/curtainsuk-decision/${operation}${url.search}`,
        {
          method: req.method,
          headers: {
            Accept: "application/json",
            "Content-Type": req.headers["content-type"] || "application/json",
          },
          ...(body ? { body } : {}),
          signal: AbortSignal.timeout(45000),
        },
      );
      res.statusCode = upstream.status;
      res.setHeader(
        "Content-Type",
        upstream.headers.get("content-type") || "application/json",
      );
      res.end(await upstream.text());
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    if (url.pathname === "/admin/curtain-consultation") {
      res.setHeader("Content-Type", "text/html;charset=utf-8");
      res.end(await readFile(join(ui, "consultation.html")));
      return;
    }
    const name =
      url.pathname === "/"
        ? "curtainsuk-home-hero"
        : url.pathname === "/pages/fabric-library"
          ? "curtainsuk-fabric-browser"
          : url.pathname === "/pages/curtain-visualiser"
            ? "curtainsuk-configurator"
            : null;
    if (!name) {
      res
        .writeHead(404)
        .end("This page belongs to the unpublished Dawn preview.");
      return;
    }
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CurtainsUK · Private UX rehearsal</title><style>html{font-size:62.5%}body{margin:0;font:1.6rem/1.6 Arial,sans-serif;background:#fbf9f4}button,input,select,textarea{font:inherit}[hidden]{display:none!important}header{padding:2rem 5%;border-bottom:1px solid #deded2;display:flex;justify-content:space-between;align-items:center}header a{font:2.8rem Georgia;color:#293b32;text-decoration:none}header span{font:1rem Arial;letter-spacing:.15em;max-width:14rem}header{gap:2rem}.cuk-form{min-width:0}</style></head><body><header><a href="/">CurtainsUK</a><span>UNPUBLISHED · PRIVATE REHEARSAL</span></header>${await section(name)}<section class="cuk-shell cuk-wrap" data-cuk-sample-basket><h2>Your samples</h2><p data-cuk-sample-empty>No samples saved yet.</p><ul data-cuk-sample-list></ul><a data-cuk-resume href="/pages/curtain-visualiser">Continue My Curtains</a><p>Sample intent only. No payment taken.</p></section></body></html>`,
    );
  } catch (error) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Rehearsal unavailable",
      }),
    );
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Private Phase 6A rehearsal: ${origin}`),
);
