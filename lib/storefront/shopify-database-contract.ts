import "server-only";
import { listFabricMasterRecords } from "@/lib/fabric-master/repository";
import { assertCustomerSafeProjection, projectCustomerSafeFabric } from "@/lib/fabric-master/projection";
import { buildShopifyCatalogPayload } from "./shopify-contract";

/** Read-only PostgreSQL projection consumed by the unpublished Dawn theme. */
export async function buildDatabaseShopifyCatalogPayload() {
  const base = buildShopifyCatalogPayload();
  const records = await listFabricMasterRecords({ storefrontOnly: true });
  const fabrics = records.map((record) => {
    const fabric = projectCustomerSafeFabric(record);
    return {
      ...fabric,
      supplierReference: fabric.supplierSku,
      uniqueSku: fabric.supplierSku,
    };
  });
  assertCustomerSafeProjection(fabrics);
  return {
    ...base,
    schemaVersion: "2.0.0",
    dataSource: "CURTAINSUK_PRIVATE_POSTGRES" as const,
    fabrics,
  };
}
