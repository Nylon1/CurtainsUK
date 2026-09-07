import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
import type {
  DurableSupplierSnapshot,
  DurableSupplierSyncRun,
  PromotionEvent,
  SupplierIntelligenceDataset,
  SupplierValidationContext,
  SupplierValidationResult,
} from "./types";

export interface SupplierIntelligenceRepository {
  appendSyncRun(run: DurableSupplierSyncRun): Promise<void>;
  validationContext(input: {
    supplierId: string;
    supplierSku: string;
    sourceType: string;
    requiredPriceField: SupplierValidationContext["required_price_field"];
  }): Promise<SupplierValidationContext>;
  appendValidatedSnapshot(input: {
    run: DurableSupplierSyncRun;
    snapshot: NormalizedSupplierSnapshot;
    validation: SupplierValidationResult;
    validationEvent: PromotionEvent;
  }): Promise<void>;
  appendPromotionEvent(event: PromotionEvent): Promise<void>;
  snapshot(snapshotId: string): Promise<DurableSupplierSnapshot | null>;
  promotionEvents(snapshotId?: string): Promise<PromotionEvent[]>;
  previousApprovedSnapshotId(snapshot: DurableSupplierSnapshot): Promise<string | null>;
  approvalPolicy(supplierId: string): Promise<import("./types").SupplierApprovalPolicy | null>;
  dataset(supplierId?: string): Promise<SupplierIntelligenceDataset>;
}
