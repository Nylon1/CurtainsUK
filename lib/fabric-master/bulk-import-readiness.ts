export const BULK_IMPORT_GATES = [
  "AUTHORISED_IMAGERY",
  "CURRENT_COMMERCIAL_PRICES",
  "CURRENT_LIFECYCLE",
  "MERGE_RACE_PROTECTION",
  "DATABASE_CLOCK_VALIDATION",
] as const;

export type BulkImportGateId = (typeof BULK_IMPORT_GATES)[number];
export type BulkImportGateState = "PASS" | "FAIL" | "UNKNOWN";

export interface BulkImportGateEvidence {
  state: BulkImportGateState;
  checkedAt: string | null;
  evidenceReference: string | null;
  detail: string;
}

export interface BulkImportReadinessInput {
  supplierId: string;
  intendedColourways: number;
  gates: Record<BulkImportGateId, BulkImportGateEvidence>;
}

export interface BulkImportReadinessReport {
  supplierId: string;
  intendedColourways: number;
  status: "READY_FOR_BULK_IMPORT" | "BLOCKED";
  checkedAt: string;
  failedGates: BulkImportGateId[];
  unknownGates: BulkImportGateId[];
  gates: Array<{ id: BulkImportGateId } & BulkImportGateEvidence>;
}

function validIso(value: string | null) {
  return value !== null && Number.isFinite(Date.parse(value));
}

/**
 * Fail-closed launch gate for supplier catalogue expansion. A checkbox or an
 * inferred value is not evidence: every gate must carry a dated reference.
 */
export function evaluateBulkImportReadiness(
  input: BulkImportReadinessInput,
  now = new Date(),
): BulkImportReadinessReport {
  if (!input.supplierId.trim()) throw new Error("BULK_IMPORT_SUPPLIER_REQUIRED");
  if (!Number.isInteger(input.intendedColourways) || input.intendedColourways < 1) {
    throw new Error("BULK_IMPORT_SCOPE_REQUIRED");
  }

  const gates = BULK_IMPORT_GATES.map((id) => {
    const candidate = input.gates[id];
    const evidenceComplete = validIso(candidate.checkedAt) && Boolean(candidate.evidenceReference?.trim());
    return {
      id,
      ...candidate,
      state: candidate.state === "PASS" && !evidenceComplete ? "UNKNOWN" as const : candidate.state,
    };
  });
  const failedGates = gates.filter((gate) => gate.state === "FAIL").map((gate) => gate.id);
  const unknownGates = gates.filter((gate) => gate.state === "UNKNOWN").map((gate) => gate.id);

  return {
    supplierId: input.supplierId,
    intendedColourways: input.intendedColourways,
    status: failedGates.length === 0 && unknownGates.length === 0 ? "READY_FOR_BULK_IMPORT" : "BLOCKED",
    checkedAt: now.toISOString(),
    failedGates,
    unknownGates,
    gates,
  };
}

export function blockedBulkImportReadiness(input: {
  supplierId: string;
  intendedColourways: number;
  detailByGate: Partial<Record<BulkImportGateId, string>>;
}) {
  return evaluateBulkImportReadiness({
    supplierId: input.supplierId,
    intendedColourways: input.intendedColourways,
    gates: Object.fromEntries(BULK_IMPORT_GATES.map((id) => [id, {
      state: "UNKNOWN",
      checkedAt: null,
      evidenceReference: null,
      detail: input.detailByGate[id] ?? "Evidence has not yet been recorded.",
    }])) as Record<BulkImportGateId, BulkImportGateEvidence>,
  });
}
