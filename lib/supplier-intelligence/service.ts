import type { NormalizedSupplierSnapshot, SupplierStockUnit } from "@/lib/supplier-sync/types";
import { buildSupplierHealthReport } from "./health";
import { buildCustomerSafeSupplierProjection } from "./projection";
import { createManualApprovalEvent, createManualRejectionEvent, createValidationEvent } from "./promotion";
import type { SupplierIntelligenceRepository } from "./repository";
import type { DurableSupplierSnapshot, DurableSupplierSyncRun, SupplierValidationContext } from "./types";
import { validateSupplierIntelligenceSnapshot } from "./validation";

export class SupplierIntelligenceService {
  constructor(private readonly repository: SupplierIntelligenceRepository) {}

  async ingest(input: {
    run: DurableSupplierSyncRun;
    snapshot: NormalizedSupplierSnapshot;
    requiredPriceField: SupplierValidationContext["required_price_field"];
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const context = await this.repository.validationContext({
      supplierId: input.snapshot.supplier_id,
      supplierSku: input.snapshot.supplier_sku,
      sourceType: input.snapshot.source.type,
      requiredPriceField: input.requiredPriceField,
    });
    const validation = validateSupplierIntelligenceSnapshot(input.snapshot, context, now);
    const event = createValidationEvent(input.snapshot.snapshot_id, validation, now.toISOString());
    await this.repository.appendValidatedSnapshot({ run: input.run, snapshot: input.snapshot, validation, validationEvent: event });
    return { validation, event };
  }

  async recordFailedRun(run: DurableSupplierSyncRun) {
    if (run.status !== "FAILED" || run.snapshots_appended !== 0) throw new Error("INVALID_FAILED_SYNC_RUN");
    await this.repository.appendSyncRun(run);
    return run;
  }

  async manuallyApprove(input: { snapshotId: string; approvedBy: string; approvedAt?: Date; reason: string }) {
    const snapshot = await this.requireSnapshot(input.snapshotId);
    const policy = await this.repository.approvalPolicy(snapshot.supplier_id);
    if (!policy || policy.approval_mode !== "MANUAL") throw new Error("MANUAL_APPROVAL_NOT_ENABLED");
    const approvedAt = input.approvedAt ?? new Date();
    const context = await this.repository.validationContext({ supplierId: snapshot.supplier_id, supplierSku: snapshot.supplier_sku, sourceType: snapshot.source.type, requiredPriceField: policy.required_price_field });
    const validation = validateSupplierIntelligenceSnapshot(snapshot, context, approvedAt);
    const previous = await this.repository.previousApprovedSnapshotId(snapshot);
    const event = createManualApprovalEvent({ snapshot, validation, approvedBy: input.approvedBy, approvedAt: approvedAt.toISOString(), reason: input.reason, previousApprovedSnapshotId: previous });
    await this.repository.appendPromotionEvent(event);
    return event;
  }

  async manuallyReject(input: { snapshotId: string; rejectedBy: string; rejectedAt?: Date; reason: string }) {
    await this.requireSnapshot(input.snapshotId);
    const event = createManualRejectionEvent({ snapshotId: input.snapshotId, rejectedBy: input.rejectedBy, rejectedAt: (input.rejectedAt ?? new Date()).toISOString(), reason: input.reason });
    await this.repository.appendPromotionEvent(event);
    return event;
  }

  async projection(input: { supplierId: string; supplierSku: string; requirement: { quantity: number; stock_unit: SupplierStockUnit } | null; now?: Date }) {
    const dataset = await this.repository.dataset(input.supplierId);
    const approvedEvents = dataset.promotion_events.filter((event) => event.promotion_state === "APPROVED_FOR_PROJECTION").sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const approvedSnapshotId = approvedEvents.find((event) => dataset.snapshots.some((snapshot) => snapshot.snapshot_id === event.snapshot_id && snapshot.supplier_sku === input.supplierSku))?.snapshot_id;
    const snapshot = dataset.snapshots.find((item) => item.snapshot_id === approvedSnapshotId) ?? null;
    return buildCustomerSafeSupplierProjection({ snapshot, promotionEvents: dataset.promotion_events, requirement: input.requirement, now: input.now });
  }

  async health(supplierId?: string, now = new Date()) {
    return buildSupplierHealthReport(await this.repository.dataset(supplierId), { supplierId, now });
  }

  private async requireSnapshot(snapshotId: string): Promise<DurableSupplierSnapshot> {
    const snapshot = await this.repository.snapshot(snapshotId);
    if (!snapshot) throw new Error("SUPPLIER_SNAPSHOT_NOT_FOUND");
    return snapshot;
  }
}
