import "server-only";
import { createHash } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import {
  integrationCommand,
  integrationView,
  HCI_INTEGRATION_BASELINE,
  integrationWindowContext,
} from "./hci-integration-contract";
export function integrationEnabled(env = process.env) {
  return (
    env.VERCEL_ENV === "preview" &&
    env.CURTAINSUK_DEPLOYMENT_STAGE === "STAGING" &&
    env.CURTAINSUK_HCI_MODE === "STAGING_INTERNAL" &&
    env.CURTAINSUK_HCI_INTEGRATION_ENABLED === "true"
  );
}
/** Called only after authenticated staff authorization and same-origin checks. */
export async function stagingHciIntegration(staffId: string, value: unknown) {
  if (!integrationEnabled()) throw Error("HCI_DISABLED");
  const command = integrationCommand(value),
    db = createSupplierServiceClient();
  const digest = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  const { data: prior, error: readError } = await db.rpc("hci_staging_read", {
    p_owner: staffId,
    p_session: command.sessionId,
    p_request: command.requestId,
  });
  if (readError) throw Error("HCI_STORAGE_UNAVAILABLE");
  if (prior?.request_id === command.requestId) {
    if (prior.request_digest !== digest) throw Error("HCI_SESSION_CONFLICT");
    return { ...prior.presentation, windowSlug: integrationWindowContext(prior.private_state) };
  }
  if (prior && !command.action) return { ...prior.presentation, windowSlug: integrationWindowContext(prior.private_state) };
  const expected = prior?.revision ?? -1;
  if (
    (prior && command.revision !== expected) ||
    (!prior && command.revision !== null)
  )
    throw Error("HCI_SESSION_CONFLICT");
  const endpoint = new URL(
    process.env.CURTAINSUK_HCI_SERVICE_URL ?? "https://invalid.invalid",
  );
  const secret = process.env.CURTAINSUK_HCI_SERVICE_TOKEN ?? "";
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    secret.length < 32 ||
    endpoint.hostname === "invalid.invalid"
  )
    throw Error("HCI_CONFIGURATION_INVALID");
  const owner = createHash("sha256")
    .update(`curtainsuk:staff:${staffId}`)
    .digest("hex");
  const upstream = await fetch(endpoint, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "x-vercel-protection-bypass":
        process.env.CURTAINSUK_HCI_PLATFORM_TOKEN ?? "",
    },
    body: JSON.stringify({
      sourceCommit: HCI_INTEGRATION_BASELINE,
      sessionId: command.sessionId,
      owner,
      state: prior?.private_state ?? null,
      action: command.action,
      recordedAt: new Date().toISOString(),
    }),
  });
  if (!upstream.ok) throw Error("HCI_SERVICE_UNAVAILABLE");
  const reader = upstream.body?.getReader();
  if (!reader) throw Error("HCI_CONTRACT_INVALID");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 2_000_000) {
        await reader.cancel();
        throw Error("HCI_CONTRACT_INVALID");
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const view = { ...integrationView(result.view), windowSlug: integrationWindowContext(result.state), revision: expected + 1 };
  if (
    view.sessionId !== command.sessionId ||
    result.state?.sessionId !== command.sessionId ||
    result.state?.owner !== owner ||
    result.state?.baseline !== HCI_INTEGRATION_BASELINE
  )
    throw Error("HCI_CONTRACT_INVALID");
  const { data, error } = await db.rpc("hci_staging_commit", {
    p_owner: staffId,
    p_session: command.sessionId,
    p_request: command.requestId,
    p_digest: digest,
    p_expected: expected,
    p_state: result.state,
    p_view: view,
  });
  if (error)
    throw Error(
      error.message.includes("HCI_SESSION_CONFLICT")
        ? "HCI_SESSION_CONFLICT"
        : "HCI_STORAGE_UNAVAILABLE",
    );
  return data;
}
