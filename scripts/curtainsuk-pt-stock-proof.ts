/** Read-only first-party Webtex session proof; never writes Fabric Master. */
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main() {
  const username = process.env.PT_WEBTEX_USERNAME;
  const password = process.env.PT_WEBTEX_PASSWORD;
  if (!username || !password) throw new Error("PT_WEBTEX_CREDENTIALS_REQUIRED");
  const session = new PtWebtexSession();
  delete process.env.PT_WEBTEX_PASSWORD;
  await session.login(username, password);
  const requestedSku = (process.env.PT_WEBTEX_PROOF_SKU ?? "").trim();
  if (requestedSku) {
    if (!/^\d{4}\/\d{3}$/.test(requestedSku)) throw new Error("PT_WEBTEX_PROOF_SKU_INVALID");
    // Match the routine worker's supplier-supported design-code route, then
    // require the requested complete colourway code before accepting evidence.
    const result = await session.search("DESIGN_CODE", requestedSku.slice(0, 4));
    const exact = result.rows.find((row) => row.sku === requestedSku);
    const metres = /^\d+(?:\.\d+)?\s*M$/i.test(exact?.stockText ?? "");
    if (!exact || !metres || exact.indicator.toUpperCase() === "D") throw new Error("PT_WEBTEX_EXACT_STOCK_UNAVAILABLE");
    console.log(JSON.stringify({ outcome: "PASS", exact: { sku: exact.sku, stockText: exact.stockText,
      observedAt: exact.observedAt, queryType: exact.queryType, queryValue: exact.queryValue } }));
    return;
  }
  const result = await session.search("COLLECTION", "Rustic Persian");
  const sadira = result.rows.find((row) => row.sku === "4262/770");
  if (!sadira) throw new Error("PT_WEBTEX_CONTROL_SKU_MISSING");
  const collections = [result];
  const metres = (text: string) => Number(/^(\d+(?:\.\d+)?)\s*M$/i.exec(text)?.[1] ?? NaN);
  for (const name of ["Cheviot", "Cavendish", "Grosvenor", "Chiltern", "Islington"]) {
    const rows = collections.flatMap((item) => item.rows);
    if (rows.some((row) => metres(row.stockText) > 0 && metres(row.stockText) < 30) &&
        rows.some((row) => metres(row.stockText) === 0)) break;
    collections.push(await session.search("COLLECTION", name));
  }
  const candidates = collections.flatMap((item) => item.rows);
  const below = candidates.find((row) => metres(row.stockText) > 0 && metres(row.stockText) < 30 && row.indicator !== "D");
  const zero = candidates.find((row) => metres(row.stockText) === 0 && row.indicator !== "D");
  if (!below || !zero || metres(sadira.stockText) < 30) throw new Error("PT_CANARY_STOCK_STATES_NOT_FOUND");
  console.log(JSON.stringify({ outcome: "PASS", control: { sku: sadira.sku, stock: sadira.stockText, observedAt: sadira.observedAt },
    canary: [sadira, below, zero].map((row) => ({ sku: row.sku, stockText: row.stockText, observedAt: row.observedAt,
      queryType: row.queryType, queryValue: row.queryValue })), collectionCounts: collections.map((item) => item.total) }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ outcome: "FAILED", code: error instanceof Error ? error.message : "PT_WEBTEX_UNEXPECTED_FAILURE" }));
  process.exitCode = 1;
});
