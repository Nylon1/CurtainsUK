import "server-only";
import { randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import {
  createEvidenceAccessTokenWithSecret,
  evidenceAccessTokenSha256,
  verifyEvidenceAccessTokenWithSecret,
} from "./evidence-access-token-core";

const EVIDENCE_BUCKET = "curtainsuk-review-evidence-staging";

interface EvidenceRow {
  evidence_id: string;
  object_path: string;
  file_name: string;
  detected_content_type: string;
  security_state: string;
  retention_expires_at: string;
  deleted_at: string | null;
}

function accessSecret() {
  const secret = process.env.CURTAINSUK_EVIDENCE_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error("EVIDENCE_ACCESS_NOT_CONFIGURED");
  return secret;
}

function assertCleanEvidence(row: EvidenceRow | null) {
  if (!row || row.security_state !== "CLEAN" || row.deleted_at || new Date(row.retention_expires_at).getTime() <= Date.now()) {
    throw new Error("EVIDENCE_ACCESS_DENIED");
  }
  return row;
}

async function rawEvidenceById(evidenceId: string) {
  const { data, error } = await createSupplierServiceClient()
    .from("staging_review_evidence")
    .select("evidence_id,object_path,file_name,detected_content_type,security_state,retention_expires_at,deleted_at")
    .eq("evidence_id", evidenceId)
    .maybeSingle();
  if (error) throw new Error("EVIDENCE_ACCESS_UNAVAILABLE");
  return data as EvidenceRow | null;
}

async function evidenceById(evidenceId: string) {
  return assertCleanEvidence(await rawEvidenceById(evidenceId));
}

async function accessLog(input: {
  evidenceId: string;
  actorId: string;
  action: "ISSUE_TOKEN" | "DOWNLOAD" | "DELETE_REQUESTED" | "DELETED" | "SCAN_RESULT";
  reason: string | null;
}) {
  const { error } = await createSupplierServiceClient().rpc("record_staging_review_evidence_access", {
    p_event: {
      event_id: randomUUID(),
      evidence_id: input.evidenceId,
      actor_id: input.actorId,
      action: input.action,
      reason: input.reason,
      metadata: {},
    },
  });
  if (error) throw new Error("EVIDENCE_AUDIT_LOG_FAILED");
}

export async function issueStaffEvidenceAccess(input: {
  evidenceId: string;
  actorId: string;
  reason: string;
}) {
  await evidenceById(input.evidenceId);
  const reason = input.reason.trim();
  if (!reason || reason.length > 500) throw new Error("EVIDENCE_ACCESS_REASON_REQUIRED");
  const nowSeconds = Math.floor(Date.now() / 1_000);
  const expiresAt = new Date((nowSeconds + 60) * 1_000).toISOString();
  const token = createEvidenceAccessTokenWithSecret({
    evidenceId: input.evidenceId,
    actorId: input.actorId,
  }, accessSecret(), { nowSeconds, ttlSeconds: 60 });
  const { data, error } = await createSupplierServiceClient().rpc("issue_staging_review_evidence_access_grant", {
    p_grant: {
      grant_id: randomUUID(),
      event_id: randomUUID(),
      token_sha256: evidenceAccessTokenSha256(token),
      evidence_id: input.evidenceId,
      actor_id: input.actorId,
      reason,
      expires_at: expiresAt,
    },
  });
  const grant = data as { grant_id?: unknown; expires_at?: unknown } | null;
  if (error || typeof grant?.grant_id !== "string" || typeof grant.expires_at !== "string") {
    throw new Error("EVIDENCE_ACCESS_UNAVAILABLE");
  }
  return { token, expiresInSeconds: 60 };
}

export async function retrieveStaffEvidence(input: {
  evidenceId: string;
  actorId: string;
  token: unknown;
}) {
  if (!verifyEvidenceAccessTokenWithSecret(input.token, {
    evidenceId: input.evidenceId,
    actorId: input.actorId,
  }, accessSecret())) throw new Error("EVIDENCE_ACCESS_DENIED");
  const token = input.token as string;
  const { data: consumed, error: consumeError } = await createSupplierServiceClient().rpc(
    "consume_staging_review_evidence_access_grant",
    {
      p_token_sha256: evidenceAccessTokenSha256(token),
      p_evidence_id: input.evidenceId,
      p_actor_id: input.actorId,
    },
  );
  if (consumeError || consumed !== true) throw new Error("EVIDENCE_ACCESS_DENIED");
  const row = await evidenceById(input.evidenceId);
  const { data, error } = await createSupplierServiceClient().storage.from(EVIDENCE_BUCKET).download(row.object_path);
  if (error || !data) throw new Error("EVIDENCE_ACCESS_UNAVAILABLE");
  await accessLog({ evidenceId: input.evidenceId, actorId: input.actorId, action: "DOWNLOAD", reason: null });
  return {
    bytes: await data.arrayBuffer(),
    contentType: row.detected_content_type,
    fileName: row.file_name,
  };
}

export async function requestEvidenceDeletion(input: {
  evidenceId: string;
  actorId: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 1_000) throw new Error("EVIDENCE_DELETION_REASON_REQUIRED");
  const { data, error } = await createSupplierServiceClient().rpc("request_staging_review_evidence_deletion", {
    p_evidence_id: input.evidenceId,
    p_actor_id: input.actorId,
    p_reason: reason,
  });
  const result = data as { security_state?: unknown; deletion_requested_at?: unknown } | null;
  if (error || result?.security_state !== "DELETION_REQUESTED" || typeof result.deletion_requested_at !== "string") {
    throw new Error("EVIDENCE_DELETION_FAILED");
  }
  return { state: "DELETION_REQUESTED" as const, requestedAt: result.deletion_requested_at };
}

export async function completeEvidenceDeletion(input: {
  evidenceId: string;
  actorId: string;
  reason: string;
}) {
  const evidence = await rawEvidenceById(input.evidenceId);
  if (!evidence || !["DELETION_REQUESTED", "DELETED"].includes(evidence.security_state)) {
    throw new Error("EVIDENCE_DELETION_DENIED");
  }
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 1_000) throw new Error("EVIDENCE_DELETION_REASON_REQUIRED");
  const database = createSupplierServiceClient();
  if (evidence.security_state !== "DELETED") {
    const { error: storageError } = await database.storage.from(EVIDENCE_BUCKET).remove([evidence.object_path]);
    if (storageError) throw new Error("EVIDENCE_DELETION_FAILED");
  }
  const { data, error } = await database.rpc("complete_staging_review_evidence_deletion", {
    p_evidence_id: input.evidenceId,
    p_actor_id: input.actorId,
    p_reason: reason,
  });
  const result = data as { security_state?: unknown; deleted_at?: unknown } | null;
  if (error || result?.security_state !== "DELETED" || typeof result.deleted_at !== "string") {
    throw new Error("EVIDENCE_DELETION_FAILED");
  }
  return { state: "DELETED" as const, deletedAt: result.deleted_at };
}

export function contentDispositionFileName(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100) || "evidence";
  return `attachment; filename="${fallback.replaceAll('"', "")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
