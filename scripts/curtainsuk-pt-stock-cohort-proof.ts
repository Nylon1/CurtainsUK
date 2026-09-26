import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";
async function main() {
  const rows = JSON.parse(process.env.PT_PROOF_COHORT_JSON ?? "[]") as { sku: string; collection: string; mode?: string }[];
  const contractProof = rows.length === 1 && rows[0]?.mode === "PRODUCT_DETAIL_CONTRACT";
  const pageContractProof = rows.length === 1 && rows[0]?.mode === "PRODUCT_DETAIL_PAGE";
  const rawProductProof = rows.length === 1 && rows[0]?.mode === "PRODUCT_DETAIL_RAW";
  const productCohortProof = rows.length >= 2 && rows.length <= 100 && rows.every(row => row.mode === "PRODUCT_DETAIL_COHORT");
  if ((!contractProof && !pageContractProof && !rawProductProof && !productCohortProof && rows.length !== 50) || new Set(rows.map(r => r.sku)).size !== rows.length || rows.some(r => !/^\d{4}\/\d{3}$/.test(r.sku) || !r.collection.trim())) throw new Error("PT_COHORT_PROOF_INVALID");
  const session = new PtWebtexSession();
  const username = process.env.PT_WEBTEX_USERNAME ?? "", password = process.env.PT_WEBTEX_PASSWORD ?? "";
  delete process.env.PT_WEBTEX_PASSWORD;
  await session.login(username, password);
  if (contractProof) {
    const contract = await session.productDetailContract(rows[0].sku);
    console.log(JSON.stringify({ tested: 1, sku: rows[0].sku, contract, databaseWrites: 0 }));
    if (!contract.navigationSnippets.length) throw new Error("PT_PRODUCT_DETAIL_CONTRACT_INCOMPLETE");
    return;
  }
  if (pageContractProof) {
    const contract = await session.productDetailPageContract(rows[0].sku);
    console.log(JSON.stringify({ tested: 1, sku: rows[0].sku, contract, databaseWrites: 0 }));
    if (!contract.callbackSnippets.length) throw new Error("PT_PRODUCT_DETAIL_PAGE_CONTRACT_INCOMPLETE");
    return;
  }
  if (rawProductProof) {
    const product = await session.productDetailRaw(rows[0].sku);
    console.log(JSON.stringify({ tested: 1, product, databaseWrites: 0 }));
    if (product.status !== "DATA" || !Object.keys(product.fields).length) throw new Error("PT_PRODUCT_DETAIL_RAW_INCOMPLETE");
    return;
  }
  if (productCohortProof) {
    const results = [];
    for (const row of rows) {
      const product = await session.productDetailRaw(row.sku);
      const one = (name: string) => product.fields[name]?.[0]?.trim() ?? "";
      results.push({
        sku: row.sku,
        status: product.status,
        exactIdentity: one("PRODUCTCODE") === row.sku,
        description: one("PRODUCTDESC"),
        collection: one("COLLECTIONDESCS") || one("COLLECTION"),
        composition: one("COMPOSITION"),
        usableWidth: one("WIDTH"),
        fullWidth: one("GREYWIDTH"),
        horizontalRepeat: one("HORIZPTNREPEAT"),
        verticalRepeat: one("VERTPTNREPEAT"),
        standardPrice: one("PRICE"),
        cutPrice: one("CUTPRICE"),
        freeStock: one("FREESTOCK"),
        origin: one("ORIGINCODE"),
        weight: one("WEIGHT"),
        martindale: one("MARTINDALE"),
        imageFull: one("IMAGEFULL"),
      });
    }
    const data = results.filter(result => result.status === "DATA" && result.exactIdentity).length;
    const priced = results.filter(result => /^\d+(?:\.\d+)?$/.test(result.cutPrice)).length;
    const stocked = results.filter(result => /^\d+(?:\.\d+)? Metres$/i.test(result.freeStock)).length;
    const imaged = results.filter(result => Boolean(result.imageFull)).length;
    console.log(JSON.stringify({ tested: rows.length, data, priced, stocked, imaged, results, databaseWrites: 0 }));
    return;
  }
  const results: { sku: string; stockPresent: boolean; exactMatches: number }[] = [];
  for (const collection of new Set(rows.map(r => r.collection))) {
    const response = await session.search("COLLECTION", collection);
    for (const row of rows.filter(r => r.collection === collection)) {
      const matches = response.rows.filter(r => r.sku === row.sku);
      results.push({ sku: row.sku, exactMatches: matches.length, stockPresent: matches.length === 1 && /^\d+(?:\.\d+)?\s*M$/i.test(matches[0].stockText) });
    }
  }
  const ready = results.filter(r => r.stockPresent).length;
  console.log(JSON.stringify({ tested: rows.length, stockPresent: ready, results, databaseWrites: 0 }));
  if (ready !== rows.length) throw new Error("PT_COHORT_STOCK_INCOMPLETE");
}
main().catch(error => { console.error(error instanceof Error && /^PT_[A-Z0-9_]+$/.test(error.message) ? error.message : "PT_COHORT_PROOF_FAILED"); process.exitCode = 1; });
