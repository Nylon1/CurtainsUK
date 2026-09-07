import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { planOrphanCleanup, planRetentionDeletion, type EvidenceRetentionRecord } from "./evidence-core";

const EVIDENCE_BUCKET = "curtainsuk-review-evidence-staging";
const PAGE_SIZE = 500;
const MAX_OBJECTS_PER_RUN = 10_000;

async function listStorageObjects(prefix = "", accumulator: { objectPath: string; createdAt: string }[] = []) {
  const storage = createSupplierServiceClient().storage.from(EVIDENCE_BUCKET);
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await storage.list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("EVIDENCE_MAINTENANCE_UNAVAILABLE");
    for (const item of data ?? []) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        // An object without a trustworthy creation timestamp is intentionally
        // omitted from deletion candidates; unknown age must fail safe.
        if (item.created_at) accumulator.push({ objectPath, createdAt: item.created_at });
        if (accumulator.length > MAX_OBJECTS_PER_RUN) throw new Error("EVIDENCE_MAINTENANCE_SCOPE_TOO_LARGE");
      } else {
        await listStorageObjects(objectPath, accumulator);
      }
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return accumulator;
}

async function evidenceRows() {
  const rows: Array<{ object_path: string; security_state: EvidenceRetentionRecord["state"]; retention_expires_at: string }> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await createSupplierServiceClient()
      .from("staging_review_evidence")
      .select("object_path,security_state,retention_expires_at")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("EVIDENCE_MAINTENANCE_UNAVAILABLE");
    rows.push(...(data ?? []) as typeof rows);
    if (!data || data.length < PAGE_SIZE) break;
    if (rows.length > MAX_OBJECTS_PER_RUN) throw new Error("EVIDENCE_MAINTENANCE_SCOPE_TOO_LARGE");
  }
  return rows;
}

export async function evidenceMaintenancePreview(now = new Date()) {
  const [objects, rows] = await Promise.all([listStorageObjects(), evidenceRows()]);
  const referenced = new Set(rows.map((row) => row.object_path));
  const orphans = planOrphanCleanup({ objects, referencedObjectPaths: referenced, now, graceHours: 48 });
  const expired = planRetentionDeletion(rows.map((row) => ({
    objectPath: row.object_path,
    state: row.security_state,
    retentionExpiresAt: row.retention_expires_at,
  })), now);
  return {
    generatedAt: now.toISOString(),
    policy: { orphanGraceHours: 48, maximumObjectsPerRun: MAX_OBJECTS_PER_RUN },
    objectCount: objects.length,
    referencedCount: referenced.size,
    orphanObjectPaths: orphans.map((item) => item.objectPath),
    expiredObjectPaths: expired.map((item) => item.objectPath),
  };
}

export async function removePlannedEvidenceOrphans(input: {
  expectedObjectPaths: readonly string[];
  reason: string;
}) {
  if (process.env.CURTAINSUK_EVIDENCE_ORPHAN_CLEANUP_ENABLED !== "true") {
    throw new Error("EVIDENCE_ORPHAN_CLEANUP_DISABLED");
  }
  const reason = input.reason.trim();
  if (!reason || reason.length > 1_000 || input.expectedObjectPaths.length > 100) {
    throw new Error("EVIDENCE_ORPHAN_CLEANUP_INVALID");
  }
  const preview = await evidenceMaintenancePreview();
  const currentOrphans = new Set(preview.orphanObjectPaths);
  const expected = [...new Set(input.expectedObjectPaths)];
  if (!expected.length || expected.some((path) => !currentOrphans.has(path))) {
    throw new Error("EVIDENCE_ORPHAN_CLEANUP_CHANGED");
  }
  const { error } = await createSupplierServiceClient().storage.from(EVIDENCE_BUCKET).remove(expected);
  if (error) throw new Error("EVIDENCE_ORPHAN_CLEANUP_FAILED");
  return { removed: expected.length, removedObjectPaths: expected };
}
