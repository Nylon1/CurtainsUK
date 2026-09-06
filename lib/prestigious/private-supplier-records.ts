import type { FabricSpec, Money } from "@/lib/decision-engine/types";
import { PRESTIGIOUS_PILOT_FABRICS_BY_ID } from "./pilot-fabrics";
import type { PrestigiousPrivateSupplierRecord, PrestigiousStockVerificationInput } from "./types";

const gbp = (amountMinor: number): Money => ({ amountMinor, currency: "GBP" });

const initialRecords: PrestigiousPrivateSupplierRecord[] = [
  { fabricSpecId: "pt-4269-147", supplierSku: "4269/147", standardTradePriceExVat: gbp(2440), cutTradePriceExVat: gbp(3050), pdfDesignLevelPriceExVat: gbp(3050), costingPriceUsedExVat: gbp(3050), priceVerificationStatus: "VERIFIED", priceEffectiveDate: "2026-09-06", totalFreeStockMetres: 508, batches: [], stockState: "UNKNOWN", nextDueDate: null, nextDueMetres: null, verifiedAt: "2026-09-06T00:00:00.000Z", notes: "Portal total observed; single-batch metres require staff verification." },
  { fabricSpecId: "pt-4270-147", supplierSku: "4270/147", standardTradePriceExVat: gbp(1216), cutTradePriceExVat: gbp(1520), pdfDesignLevelPriceExVat: gbp(1520), costingPriceUsedExVat: gbp(1520), priceVerificationStatus: "VERIFIED", priceEffectiveDate: "2026-09-06", totalFreeStockMetres: 290, batches: [], stockState: "UNKNOWN", nextDueDate: null, nextDueMetres: null, verifiedAt: "2026-09-06T00:00:00.000Z", notes: "Portal total observed; single-batch metres require staff verification." },
  { fabricSpecId: "pt-4271-147", supplierSku: "4271/147", standardTradePriceExVat: gbp(2184), cutTradePriceExVat: gbp(2730), pdfDesignLevelPriceExVat: gbp(2730), costingPriceUsedExVat: gbp(2730), priceVerificationStatus: "VERIFIED", priceEffectiveDate: "2026-09-06", totalFreeStockMetres: 415, batches: [], stockState: "UNKNOWN", nextDueDate: null, nextDueMetres: null, verifiedAt: "2026-09-06T00:00:00.000Z", notes: "Portal total observed; single-batch metres require staff verification." },
];

for (const fabric of PRESTIGIOUS_PILOT_FABRICS_BY_ID.values()) {
  if (!initialRecords.some((record) => record.fabricSpecId === fabric.id)) {
    const pdfPriceMinor = fabric.supplierDesignCode === "4269" ? 3050 : fabric.supplierDesignCode === "4270" ? 1520 : fabric.supplierDesignCode === "4271" ? 2730 : fabric.supplierDesignCode === "4272" ? 1520 : 1520;
    initialRecords.push({ fabricSpecId: fabric.id, supplierSku: fabric.uniqueSku, standardTradePriceExVat: null, cutTradePriceExVat: null, pdfDesignLevelPriceExVat: gbp(pdfPriceMinor), costingPriceUsedExVat: null, priceVerificationStatus: "PRICE_REQUIRES_VERIFICATION", priceEffectiveDate: null, totalFreeStockMetres: null, batches: [], stockState: "UNKNOWN", nextDueDate: null, nextDueMetres: null, verifiedAt: null, notes: null });
  }
}

const records = new Map(initialRecords.map((record) => [record.fabricSpecId, structuredClone(record)]));

export function listPrivateSupplierRecords() {
  return [...records.values()].map((record) => structuredClone(record));
}

export function getPrivateSupplierRecord(fabricSpecId: string) {
  const record = records.get(fabricSpecId);
  return record ? structuredClone(record) : null;
}

export function resolveFabricForServerPricing(fabric: FabricSpec): FabricSpec {
  const record = records.get(fabric.id);
  if (!record || record.priceVerificationStatus !== "VERIFIED" || !record.costingPriceUsedExVat || !record.priceEffectiveDate) {
    throw new Error("PRICE_REQUIRES_VERIFICATION");
  }
  return { ...fabric, supplierCostPerMetre: record.costingPriceUsedExVat, supplierCostEffectiveFrom: record.priceEffectiveDate };
}

export function recordManualVerification(input: PrestigiousStockVerificationInput) {
  const existing = records.get(input.fabricSpecId);
  if (!existing) throw new Error("Unknown Prestigious fabric");
  const batch = input.batchReference && input.selectedBatchMetres !== null
    ? [{ batchReference: input.batchReference, usableMetres: input.selectedBatchMetres, pieces: input.pieces ?? 0 }]
    : [];
  const cut = input.cutTradePriceExVatMinor === null ? existing.cutTradePriceExVat : gbp(input.cutTradePriceExVatMinor);
  const standard = input.standardTradePriceExVatMinor === null ? existing.standardTradePriceExVat : gbp(input.standardTradePriceExVatMinor);
  const next: PrestigiousPrivateSupplierRecord = {
    ...existing,
    standardTradePriceExVat: standard,
    cutTradePriceExVat: cut,
    costingPriceUsedExVat: cut,
    priceVerificationStatus: cut ? "VERIFIED" : "PRICE_REQUIRES_VERIFICATION",
    priceEffectiveDate: cut ? input.verifiedAt.slice(0, 10) : existing.priceEffectiveDate,
    totalFreeStockMetres: input.totalFreeStockMetres,
    batches: batch,
    stockState: batch.length ? "AVAILABLE" : input.nextDueDate ? "DUE" : input.totalFreeStockMetres === 0 ? "TEMPORARILY_UNAVAILABLE" : "UNKNOWN",
    nextDueDate: input.nextDueDate,
    nextDueMetres: input.nextDueMetres,
    verifiedAt: input.verifiedAt,
    notes: input.notes,
  };
  records.set(input.fabricSpecId, next);
  return structuredClone(next);
}
