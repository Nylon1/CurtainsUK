import type { DurableSupplierSnapshot, PromotionEvent, PromotionState, SupplierValidationResult } from "./types";

export function effectivePromotionState(snapshot: DurableSupplierSnapshot, events: readonly PromotionEvent[], now = new Date()): PromotionState {
  const precedence: Record<PromotionState, number> = { RAW_SHADOW: 0, VALIDATED: 1, APPROVED_FOR_PROJECTION: 2, REJECTED: 3, EXPIRED: 4 };
  const latest = events
    .filter((event) => event.snapshot_id === snapshot.snapshot_id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || precedence[b.promotion_state] - precedence[a.promotion_state])[0];
  const state = latest?.promotion_state ?? snapshot.initial_promotion_state;
  if (state === "APPROVED_FOR_PROJECTION") {
    const expiries = [snapshot.stock_expires_at, snapshot.price_expires_at, snapshot.lifecycle_expires_at].filter((value): value is string => value !== null);
    if (expiries.some((value) => Date.parse(value) <= now.getTime())) return "EXPIRED";
  }
  return state;
}

export function createValidationEvent(snapshotId: string, result: SupplierValidationResult, createdAt: string): PromotionEvent {
  return {
    event_id: `${snapshotId}:validation:${createdAt}`,
    snapshot_id: snapshotId,
    promotion_state: result.status === "VALIDATED" ? "VALIDATED" : "REJECTED",
    actor_type: "SYSTEM_VALIDATION",
    actor_id: null,
    reason: result.status === "VALIDATED" ? "Automated structural and freshness validation passed." : null,
    rejection_reason: result.status === "FAILED" ? result.errors.join(", ") : null,
    previous_approved_snapshot_id: null,
    created_at: createdAt,
  };
}

export function createManualApprovalEvent(input: {
  snapshot: DurableSupplierSnapshot;
  validation: SupplierValidationResult;
  approvedBy: string;
  approvedAt: string;
  reason: string;
  previousApprovedSnapshotId: string | null;
}): PromotionEvent {
  if (input.validation.status !== "VALIDATED") throw new Error("SNAPSHOT_VALIDATION_REQUIRED");
  if (!input.reason.trim()) throw new Error("APPROVAL_REASON_REQUIRED");
  return {
    event_id: `${input.snapshot.snapshot_id}:approval:${input.approvedAt}`,
    snapshot_id: input.snapshot.snapshot_id,
    promotion_state: "APPROVED_FOR_PROJECTION",
    actor_type: "MANUAL_STAFF",
    actor_id: input.approvedBy,
    reason: input.reason.trim(),
    rejection_reason: null,
    previous_approved_snapshot_id: input.previousApprovedSnapshotId,
    created_at: input.approvedAt,
  };
}

export function createManualRejectionEvent(input: { snapshotId: string; rejectedBy: string; rejectedAt: string; reason: string }): PromotionEvent {
  if (!input.reason.trim()) throw new Error("REJECTION_REASON_REQUIRED");
  return {
    event_id: `${input.snapshotId}:rejection:${input.rejectedAt}`,
    snapshot_id: input.snapshotId,
    promotion_state: "REJECTED",
    actor_type: "MANUAL_STAFF",
    actor_id: input.rejectedBy,
    reason: null,
    rejection_reason: input.reason.trim(),
    previous_approved_snapshot_id: null,
    created_at: input.rejectedAt,
  };
}
