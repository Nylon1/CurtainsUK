/** Supplier-only read through the unchanged production adapter. No database credentials. */
import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

const sku = "4324/119";
const stockPath = "/webtex/Content/StockEnquiry/Default.aspx";
const evidence: { columns: unknown[]; fields: unknown[]; priceMarkerInResponse: boolean; responseCounts: unknown[] } = {
  columns: [], fields: [], priceMarkerInResponse: false, responseCounts: [],
};

async function main() {
  const username = process.env.PT_WEBTEX_USERNAME;
  const password = process.env.PT_WEBTEX_PASSWORD;
  if (!username || !password) throw new Error("PT_WEBTEX_CREDENTIALS_REQUIRED");
  const inspectFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    const path = new URL(String(input)).pathname;
    // No login bodies, cookies, credentials, account data, stock quantities or prices are logged.
    if (response.ok && path === stockPath) {
      const page = load(await response.clone().text());
      const data = page("#webtexPageLoadData").attr("value");
      if (data) {
        const xml = load(decodeURIComponent(data), { xmlMode: true });
        xml("DATA > COLUMNS").find("*").each((_, column) => {
          const attrs = xml(column).attr() ?? {};
          evidence.columns.push(Object.fromEntries(Object.entries(attrs)
            .filter(([key]) => /^(id|caption|title|header|text|name|field|heading|XMLATTRIBUTENAME)$/i.test(key))));
        });
      }
    }
    if (response.ok && path.startsWith(`${stockPath}/callbackSearch`)) {
      const packet = await response.clone().json() as { d?: unknown };
      if (typeof packet.d === "string") {
        evidence.priceMarkerInResponse = /price|sterling|\bGBP\b/i.test(decodeURIComponent(packet.d));
        const xml = load(packet.d, { xmlMode: true });
        evidence.responseCounts.push({path, total: xml("RETURNPACKET > TOTALROWS").text(), records: xml("results > Detail > record").length});
        xml("results > Detail > record").each((_, record) => {
          if (xml(record).attr("groupRow")?.toUpperCase() === "TRUE") return;
          const fields: Record<string, string> = {};
          xml(record).children("fd").each((__, field) => {
            const id = xml(field).attr("id")?.toUpperCase();
            if (id) fields[id] = decodeURIComponent(xml(field).attr("value") ?? "");
          });
          if (fields.C2?.trim() === sku) evidence.fields = Object.entries(fields).map(([id, value]) => ({
            id, present: value.trim().length > 0,
            stockUnit: /^\d+(?:\.\d+)?\s*M$/i.test(value.trim()),
            currencyUnit: /STERLING|\bGBP\b|£/.test(value),
            numericOnly: /^\d+(?:\.\d+)?$/.test(value.trim()),
            visibleDecimalPresent: /\d+\.\d+/.test(load(value).text()),
            ...(["C6", "C7"].includes(id) ? { priceCellTextStructure: load(value).text().replace(/\d/g, "#").slice(0, 120), priceCellMarkup: /<[^>]+>/.test(value) } : {}),
          }));
        });
      }
    }
    return response;
  };
  const session = new PtWebtexSession(inspectFetch);
  delete process.env.PT_WEBTEX_PASSWORD;
  await session.login(username, password);
  const result = await session.search("COLLECTION", "Revival");
  const matched = result.rows.filter(row => row.sku === sku);
  if (matched.length !== 1 || evidence.fields.length === 0) throw new Error("PT_EXACT_MISSING_SKU_RESPONSE_REQUIRED");
  // The existing approved price snapshots came from this portal's product-detail view.
  // Discover its declared parameter names; the supplier client passes the exact SKU twice.
  const detailPath = "/webtex/Content/ViewProductDetails/Default.aspx";
  const transport = session as unknown as { request(path: string): Promise<Response>; invoke(path: string, parameters: Record<string,string>): Promise<string> };
  const detailPage = await (await transport.request(detailPath)).text();
  const signature = detailPage.match(/callbackGetProductDetails\s*:\s*function\s*\(([^)]*)\)/)
    ?? detailPage.match(/callbackGetProductDetails\s*=\s*function\s*\(([^)]*)\)/);
  if (!signature) throw new Error("PT_PRODUCT_DETAIL_PROXY_NOT_FOUND");
  const parameterNames = signature[1].split(",").map(s => s.trim()).filter(s => /^l_/.test(s));
  if (parameterNames.length !== 2) throw new Error("PT_PRODUCT_DETAIL_PARAMETERS_CHANGED");
  const detailXml = load(await transport.invoke(`${detailPath}/callbackGetProductDetails`, Object.fromEntries(parameterNames.map(name => [name,sku]))), {xmlMode:true});
  const detailFields: Record<string,string> = {};
  detailXml("FIELDS fd").each((_,field) => { const id=detailXml(field).attr("id")?.toLowerCase(); if(id) detailFields[id]=decodeURIComponent(detailXml(field).attr("value") ?? ""); });
  const detailEvidence = { endpoint: `${detailPath}/callbackGetProductDetails`, parameterNames,
    status: detailXml("RETURNPACKET > STATUS").text(), fieldNames: Object.keys(detailFields),
    exactSkuInFields: Object.values(detailFields).some(value => value.trim() === sku),
    priceFields: Object.entries(detailFields).filter(([id])=>/price|freestock/.test(id)).map(([id,value])=>({id,
      numericPresent:/\d+(?:\.\d+)?/.test(load(value).text()), textStructure:load(value).text().replace(/\d/g,"#").slice(0,100)})) };
  console.log(JSON.stringify({ outcome: "PASS", sku, queryType: "COLLECTION",
    endpoint: `${stockPath}/callbackSearchCollection`, observedAt: result.observedAt,
    parsedStockPresent: /^\d+(?:\.\d+)?\s*M$/i.test(matched[0].stockText),
    supplierResponseShape: evidence, productDetail: detailEvidence, databaseWrites: 0, catalogueWrites: 0, pricingLogicChanged: false }));
}
main().catch(error => {
  const code = error instanceof Error && /^PT_[A-Z0-9_]+$/.test(error.message) ? error.message : "PT_READ_ONLY_PROOF_FAILED";
  console.error(JSON.stringify({ outcome: "FAILED", sku, code, supplierResponseShape: evidence, databaseWrites: 0 }));
  process.exitCode = 1;
});
