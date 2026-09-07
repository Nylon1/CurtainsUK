/** Read-only, loopback-only editorial preview. Never deployed as a public route. */
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { projectCustomerSafeFabric } from "../lib/fabric-master/projection";
import { factualRetailDescription, RETAIL_TAXONOMY, retailMetadata } from "../lib/fabric-master/retail";
import type { parsePrestigiousPublicProduct } from "../lib/fabric-master/prestigious-public";

const root = resolve("artifacts/phase5f/checkpoints");
const theme = resolve("shopify-theme/curtainsuk-dawn-16");
async function catalogue() {
  const media = JSON.parse(await readFile(resolve(root, "supplier-media.json"), "utf8")) as { sources: Record<string, { hash: string; width: number; height: number }> };
  const products = new Map<string, ReturnType<typeof parsePrestigiousPublicProduct>>();
  for (const path of (await readdir(root)).filter((f) => /^pt-[a-z-]+\.json$/.test(f))) {
    const state = JSON.parse(await readFile(resolve(root, path), "utf8"));
    for (const product of Object.values(state.results) as ReturnType<typeof parsePrestigiousPublicProduct>[]) products.set(product.record.fabric_id, product);
  }
  return [...products.values()].map((product) => {
    const record = { ...product.record, supplier_name: "Prestigious Textiles" };
    const safe = projectCustomerSafeFabric(record);
    const source = media.sources[product.images[0]];
    const images = source ? [{ imageType: "MAIN", url: `/media/${source.hash}.jpg`, width: source.width, height: source.height }] : [];
    return { ...safe, supplierSku: undefined, imageReferences: images.map((i) => i.url), images, description: factualRetailDescription(record), metadata: retailMetadata(record), headings: [], windowTypes: [], careInstructions: [], launchReady: false, configurable: false };
  }).sort((a, b) => `${a.design} ${a.colour}`.localeCompare(`${b.design} ${b.colour}`));
}
createServer(async (request, response) => {
  response.setHeader("X-Robots-Tag", "noindex, nofollow"); response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET" || !["127.0.0.1:3216", "localhost:3216"].includes(request.headers.host ?? "")) { response.writeHead(403).end(); return; }
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:3216");
    if (/^\/media\/[a-f0-9]{64}\.jpg$/.test(url.pathname)) { response.setHeader("Content-Type", "image/jpeg"); response.end(await readFile(resolve("artifacts/phase5f/media", url.pathname.slice(7)))); return; }
    if (["/curtainsuk-storefront.js", "/curtainsuk-storefront.css"].includes(url.pathname)) { response.setHeader("Content-Type", url.pathname.endsWith("js") ? "text/javascript" : "text/css"); response.end(await readFile(resolve(theme, "assets", url.pathname.slice(1)))); return; }
    if (url.pathname === "/api/catalog") {
      const all = await catalogue();
      const params = url.searchParams;
      const filtered = all.filter((f) => (!params.get("query") || `${f.design} ${f.colour} ${f.collection}`.toLowerCase().includes(params.get("query")!.toLowerCase()))
        && (!params.get("collection") || params.get("collection") === f.collection)
        && (!params.get("brand") || params.get("brand") === f.brand)
        && !["colour", "pattern", "style", "character"].some((key) => params.get(key))
        && params.get("availability") !== "CURRENT"
        && (!params.get("sample") || (params.get("sample") === "AVAILABLE" ? f.sampleAvailable === true : f.sampleAvailable === false)));
      const page = Math.max(1, Number(params.get("page")) || 1);
      const result = params.has("fabric") ? { fabric: all.find((f) => f.id === params.get("fabric")) ?? null } : { fabrics: filtered.slice((page - 1) * 24, page * 24), page, pageSize: 24, total: filtered.length, pages: Math.ceil(filtered.length / 24), facets: { brands: ["Prestigious Textiles"], collections: [...new Set(all.map((f) => f.collection))].sort(), ...RETAIL_TAXONOMY } };
      response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify(result)); return;
    }
    let section = await readFile(resolve(theme, "sections/curtainsuk-fabric-browser.liquid"), "utf8");
    section = section.replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/g, "").replace(/\{%[\s\S]*?%\}/g, "").replace(/\{\{ 'curtainsuk-storefront.css'[\s\S]*?\}\}/, '<link rel="stylesheet" href="/curtainsuk-storefront.css">').replace(/\{\{ 'curtainsuk-storefront.js'[\s\S]*?\}\}/, "/curtainsuk-storefront.js").replace(/\{\{ engine_base[^}]*\}\}/g, "/api").replace(/\{\{ section.id \}\}/g, "local-review");
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Local editorial preview"><title>CurtainsUK catalogue editorial preview</title><style>html{font-size:62.5%}body{margin:0;font:1.6rem/1.5 Arial,sans-serif;color:#23382e;background:#faf9f5}h1,h2,h3{font-family:Georgia,serif}header{padding:2rem 5%;border-bottom:1px solid #ddd;font-size:2.4rem}.preview-note{padding:1rem 5%;background:#f6eccc;font-size:1.3rem}button,input,select{font:inherit}[hidden]{display:none!important}</style></head><body><header>CurtainsUK</header><aside class="preview-note">Local editorial review · Real supplier photographs and factual description drafts · Shopify import and launch approval pending</aside>${section}<section data-cuk-sample-basket class="cuk-wrap"><h2>Your sample requests</h2><p data-cuk-sample-empty>No samples saved.</p><ul data-cuk-sample-list></ul><a data-cuk-resume href="/pages/curtain-visualiser">Continue My Curtains</a><p>Sample requests are saved locally. No payment is taken.</p></section></body></html>`);
  } catch { response.writeHead(503).end("Local preview unavailable"); }
}).listen(3216, "127.0.0.1", () => console.log("Local editorial preview: http://127.0.0.1:3216/pages/fabric-library"));
