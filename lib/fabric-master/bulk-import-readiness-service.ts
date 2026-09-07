import "server-only";
import { listFabricMasterRecords } from "./repository";
import { evaluateBulkImportReadiness, type BulkImportGateEvidence } from "./bulk-import-readiness";

const DATABASE_GUARD_EVIDENCE = {
  checkedAt: "2026-09-07T00:00:00.000Z",
  evidenceReference: "phase5c:migration-and-regression-suite",
};

function coverageGate(input: {
  complete: number;
  expected: number;
  label: string;
  sourceReference?: string | null;
}): BulkImportGateEvidence {
  const complete = input.expected > 0 && input.complete === input.expected;
  return {
    state: complete && input.sourceReference ? "PASS" : "FAIL",
    checkedAt: complete && input.sourceReference ? new Date().toISOString() : null,
    evidenceReference: complete ? input.sourceReference ?? null : null,
    detail: `${input.complete.toLocaleString("en-GB")} of ${input.expected.toLocaleString("en-GB")} ${input.label}.`,
  };
}

export async function buildSupplierBulkImportReadiness() {
  const [prestigious, sanderson] = await Promise.all([
    listFabricMasterRecords({ supplierId: "prestigious-textiles" }),
    listFabricMasterRecords({ supplierId: "sanderson-design-group" }),
  ]);

  const inputs = [
    {
      supplierId: "prestigious-textiles",
      supplierName: "Prestigious Textiles",
      intendedColourways: prestigious.length,
      records: prestigious,
      imageryReference: "prestigious:authorised-public-product-imagery",
      note: "Pilot/Formation expansion remains blocked until every colourway has a verified cut price.",
    },
    {
      supplierId: "sanderson-design-group",
      supplierName: "Sanderson Design Group",
      intendedColourways: 9_680,
      records: sanderson,
      imageryReference: null,
      note: "The February catalogue workbook supplies specifications only; current imagery, commercial prices and lifecycle are still required.",
    },
  ];

  return inputs.map((input) => {
    const withImagery = input.records.filter((record) => record.imagery.length > 0).length;
    const withVerifiedPrice = input.records.filter((record) => record.price_verification_status === "VERIFIED").length;
    const withCurrentLifecycle = input.records.filter((record) => record.lifecycle_state === "CURRENT").length;
    const report = evaluateBulkImportReadiness({
      supplierId: input.supplierId,
      intendedColourways: input.intendedColourways,
      gates: {
        AUTHORISED_IMAGERY: coverageGate({ complete: withImagery, expected: input.intendedColourways, label: "have authorised imagery", sourceReference: input.imageryReference }),
        CURRENT_COMMERCIAL_PRICES: coverageGate({ complete: withVerifiedPrice, expected: input.intendedColourways, label: "have verified current commercial prices", sourceReference: `${input.supplierId}:approved-price-snapshots` }),
        CURRENT_LIFECYCLE: coverageGate({ complete: withCurrentLifecycle, expected: input.intendedColourways, label: "have a current lifecycle observation", sourceReference: `${input.supplierId}:current-lifecycle-source` }),
        MERGE_RACE_PROTECTION: {
          state: "PASS",
          ...DATABASE_GUARD_EVIDENCE,
          detail: "Optimistic current-master revision checks and row locks are present in the supplier-neutral bulk apply RPC.",
        },
        DATABASE_CLOCK_VALIDATION: {
          state: "PASS",
          ...DATABASE_GUARD_EVIDENCE,
          detail: "The Phase 5C migration binds future-date rejection to PostgreSQL clock_timestamp().",
        },
      },
    });
    return {
      ...report,
      supplierName: input.supplierName,
      importedRecords: input.records.length,
      counts: { withImagery, withVerifiedPrice, withCurrentLifecycle },
      note: input.note,
    };
  });
}
