/** Read-only first-party Webtex session proof; never writes Fabric Master. */
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main() {
  const username = process.env.PT_WEBTEX_USERNAME;
  const password = process.env.PT_WEBTEX_PASSWORD;
  if (!username || !password) throw new Error("PT_WEBTEX_CREDENTIALS_REQUIRED");
  const session = new PtWebtexSession();
  delete process.env.PT_WEBTEX_PASSWORD;
  await session.login(username, password);
  const result = await session.search("COLLECTION", "Rustic Persian");
  const sadira = result.rows.find((row) => row.sku === "4262/770");
  if (!sadira) throw new Error("PT_WEBTEX_CONTROL_SKU_MISSING");
  console.log(JSON.stringify({ outcome: "PASS", total: result.total, controlSku: sadira.sku, stock: sadira.stockText, observedAt: sadira.observedAt }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ outcome: "FAILED", code: error instanceof Error ? error.message : "PT_WEBTEX_UNEXPECTED_FAILURE" }));
  process.exitCode = 1;
});
