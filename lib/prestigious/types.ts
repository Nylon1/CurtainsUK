import type { FabricSpec, Money } from "@/lib/decision-engine/types";
import type { SupplierAvailabilityState, SupplierCustomerAvailability } from "@/lib/supplier-sync/types";

export type PrestigiousPriceVerificationStatus = "VERIFIED" | "PRICE_REQUIRES_VERIFICATION";

export type PrestigiousStockState = SupplierAvailabilityState;

export type CustomerFabricAvailability = SupplierCustomerAvailability;

export interface PrestigiousPublicFabric extends FabricSpec {
  fullWidthMm: number;
  supplierDesignCode: string;
  colourwayCode: string;
  storefrontName: string;
  storefrontDescription: string;
  swatchColour: string;
  image: string;
  priceVerificationStatus: PrestigiousPriceVerificationStatus;
  customerAvailability: CustomerFabricAvailability;
}

export interface PrestigiousBatchStock {
  batchReference: string;
  usableMetres: number;
  pieces: number;
}

/** Server/admin-only. Never project this record into Shopify or customer APIs. */
export interface PrestigiousPrivateSupplierRecord {
  fabricSpecId: string;
  supplierSku: string;
  standardTradePriceExVat: Money | null;
  cutTradePriceExVat: Money | null;
  pdfDesignLevelPriceExVat: Money | null;
  costingPriceUsedExVat: Money | null;
  priceVerificationStatus: PrestigiousPriceVerificationStatus;
  priceEffectiveDate: string | null;
  totalFreeStockMetres: number | null;
  batches: PrestigiousBatchStock[];
  stockState: PrestigiousStockState;
  nextDueDate: string | null;
  nextDueMetres: number | null;
  verifiedAt: string | null;
  notes: string | null;
}

export interface PrestigiousStockVerificationInput {
  fabricSpecId: string;
  totalFreeStockMetres: number | null;
  batchReference: string | null;
  selectedBatchMetres: number | null;
  pieces: number | null;
  nextDueDate: string | null;
  nextDueMetres: number | null;
  standardTradePriceExVatMinor: number | null;
  cutTradePriceExVatMinor: number | null;
  notes: string | null;
  verifiedAt: string;
}

export interface StockEvaluation {
  internalState: PrestigiousStockState;
  customerState: CustomerFabricAvailability;
  stale: boolean;
  sufficientSingleBatch: boolean;
}
