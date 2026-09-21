import "server-only";
import { commercialReadiness } from "@/lib/fabric-master/readiness-server";
import { fabricMasterRecordById, listFabricMasterRecords } from "@/lib/fabric-master/repository";
import { assertCustomerSafeProjection, projectCustomerSafeFabric } from "@/lib/fabric-master/projection";
import type { CustomerSafeFabricProjection } from "@/lib/fabric-master/types";
import { buildShopifyCatalogPayload } from "./shopify-contract";

const FABRIC_MASTER_ID = /^[a-zA-Z0-9-]{1,150}$/;

type ConfigurationFabric = Omit<CustomerSafeFabricProjection, "supplierSku"> & { selectableForReview: boolean };

type RequestedFabricResolution =
  | { id: string; status: "RESOLVED"; fabric: ConfigurationFabric }
  | { id: string; status: "NOT_CONFIGURABLE" | "NOT_FOUND" };

/**
 * Configuration is deliberately less editorial than the public fabric-detail
 * page. A deep link must resolve the canonical Fabric Master even when its
 * retail story or approved imagery is incomplete. The price endpoint still
 * retrieves the record and performs the fresh commercial checks server-side.
 */
async function resolveConfigurationFabric(fabricId: string): Promise<RequestedFabricResolution> {
  if (!FABRIC_MASTER_ID.test(fabricId)) throw new Error("FABRIC_REFERENCE_INVALID");
  const record = await fabricMasterRecordById(fabricId);
  if (!record) return { id: fabricId, status: "NOT_FOUND" };

  const readiness = await commercialReadiness([record]).catch(() => null);
  const commercial = readiness?.get(record.fabric_id);
  const { supplierSku: _supplierSku, ...fabric } = projectCustomerSafeFabric(record);
  assertCustomerSafeProjection(fabric);

  // A non-priceable or non-configurable master can be identified, but never
  // becomes a selectable configuration or a client-side source of commerce.
  if (!fabric.configurable || commercial?.priceReady !== true) {
    return { id: fabricId, status: "NOT_CONFIGURABLE" };
  }

  return {
    id: fabricId,
    status: "RESOLVED",
    fabric: {
      ...fabric,
      availability: commercial?.stockMessage ?? fabric.availability,
      configurationMessage: "Ready to configure",
      selectableForReview: true,
    },
  };
}

/** Read-only PostgreSQL projection consumed by the unpublished Dawn theme. */
export async function buildDatabaseShopifyCatalogPayload(fabricId?: string) {
  const base = buildShopifyCatalogPayload();
  // The configurator receives a bounded eligible selection. Retail browsing
  // uses the separate paginated projection.
  const records = await listFabricMasterRecords({ stagingCatalogOnly: true, storefrontOnly: true, limit: 48 });
  const readiness = await commercialReadiness(records).catch(()=>null);
  const fabrics: ConfigurationFabric[] = records.filter(r=>readiness?.get(r.fabric_id)?.commercialStockState!=="DISCONTINUED").map((record) => {
    const { supplierSku: _supplierSku, ...fabric } = projectCustomerSafeFabric(record);
    const status=readiness?.get(record.fabric_id);
    return { ...fabric, sampleAvailable:status?.sampleReady??false, availability:status?.stockMessage??"Check availability", selectableForReview: true };
  });
  let requestedFabric: RequestedFabricResolution | null = null;
  // A direct configurator link is an identity reference, never a commercial
  // payload. Resolve it from the Fabric Master rather than the retail-detail
  // projection, whose imagery/editorial launch gates are irrelevant to MTM.
  if (fabricId) {
    requestedFabric = await resolveConfigurationFabric(fabricId);
    const existingIndex = fabrics.findIndex((fabric) => fabric.id === fabricId);
    if (requestedFabric.status === "RESOLVED") {
      if (existingIndex >= 0) fabrics.splice(existingIndex, 1, requestedFabric.fabric);
      else fabrics.push(requestedFabric.fabric);
    } else if (existingIndex >= 0) {
      fabrics.splice(existingIndex, 1);
    }
  }
  assertCustomerSafeProjection(fabrics);
  return {
    ...base,
    schemaVersion: "2.0.0",
    dataSource: "CURTAINSUK_PRIVATE_POSTGRES" as const,
    fabrics,
    requestedFabric,
  };
}
