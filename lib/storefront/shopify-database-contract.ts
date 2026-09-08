import "server-only";
import { listFabricMasterRecords } from "@/lib/fabric-master/repository";
import { retailFabricDetail } from "@/lib/fabric-master/retail-repository";
import { assertCustomerSafeProjection, projectCustomerSafeFabric } from "@/lib/fabric-master/projection";
import { buildShopifyCatalogPayload } from "./shopify-contract";

/** Read-only PostgreSQL projection consumed by the unpublished Dawn theme. */
export async function buildDatabaseShopifyCatalogPayload(fabricId?: string) {
  const base = buildShopifyCatalogPayload();
  // The configurator receives a bounded eligible selection. Retail browsing
  // uses the separate paginated projection.
  const records = await listFabricMasterRecords({ stagingCatalogOnly: true, storefrontOnly: true, limit: 48 });
  const fabrics = records.map((record) => {
    const fabric = projectCustomerSafeFabric(record);
    delete fabric.supplierSku;
    return fabric;
  });
  // One selected browse-ready fabric may enter measurements without a price.
  // Server pricing still requires a current approved cut-price snapshot, and
  // checkout separately checks stock for the actual calculated metres.
  if (fabricId && !fabrics.some((fabric) => fabric.id === fabricId)) {
    const selected = await retailFabricDetail(fabricId);
    if (selected) fabrics.push({ ...selected, configurable: true, feedEligible: false });
  }
  assertCustomerSafeProjection(fabrics);
  return {
    ...base,
    schemaVersion: "2.0.0",
    dataSource: "CURTAINSUK_PRIVATE_POSTGRES" as const,
    fabrics,
  };
}
