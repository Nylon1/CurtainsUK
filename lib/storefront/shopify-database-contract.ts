import "server-only";
import { listFabricMasterRecords, fabricMasterRecordById } from "@/lib/fabric-master/repository";
import { assertCustomerSafeProjection, projectCustomerSafeFabric } from "@/lib/fabric-master/projection";
import { buildShopifyCatalogPayload } from "./shopify-contract";

/** Read-only PostgreSQL projection consumed by the unpublished Dawn theme. */
export async function buildDatabaseShopifyCatalogPayload(fabricId?: string) {
  const base = buildShopifyCatalogPayload();
  // The configurator receives a bounded eligible selection. Retail browsing
  // uses the separate paginated projection.
  const records = await listFabricMasterRecords({ stagingCatalogOnly: true, storefrontOnly: true, limit: 48 });
  if (fabricId && /^[a-zA-Z0-9-]{1,150}$/.test(fabricId) && !records.some((r) => r.fabric_id === fabricId)) {
    const selected = await fabricMasterRecordById(fabricId);
    if (selected?.staging_catalog_visible && selected.storefront_selectable) records.push(selected);
  }
  const fabrics = records.map((record) => {
    const fabric = projectCustomerSafeFabric(record);
    delete fabric.supplierSku;
    return fabric;
  });
  assertCustomerSafeProjection(fabrics);
  return {
    ...base,
    schemaVersion: "2.0.0",
    dataSource: "CURTAINSUK_PRIVATE_POSTGRES" as const,
    fabrics,
  };
}
