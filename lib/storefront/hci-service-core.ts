import { createHash } from "node:crypto";
import type { HCI_HOSTED_RELEASE } from "./hci-release";

type Release = typeof HCI_HOSTED_RELEASE;
type Environment = Record<string, string | undefined>;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("HCI_CONTRACT_INVALID");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 160): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("HCI_CONTRACT_INVALID");
  return value;
}
function integer(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error("HCI_CONTRACT_INVALID");
  return Number(value);
}

export function hciHostedEnabled(env: Environment, release: Release): boolean {
  return (
    env.CURTAINSUK_HCI_MODE === "STAGING_INTERNAL" &&
    env.CURTAINSUK_DEPLOYMENT_STAGE === "STAGING" &&
    env.VERCEL_ENV === "preview" &&
    release.humanQuality === "READY" &&
    release.serviceContractReady
  );
}

/** Allowlisted UI command only. No client-supplied histories, owner IDs or catalogue data. */
export function hciServiceCommand(value: unknown) {
  const body = object(value);
  const requestId = text(body.requestId);
  if (!uuid.test(requestId)) throw new Error("HCI_CONTRACT_INVALID");
  const sessionId = body.sessionId == null ? null : text(body.sessionId);
  if (sessionId && !uuid.test(sessionId))
    throw new Error("HCI_CONTRACT_INVALID");
  const revision = body.revision == null ? null : integer(body.revision);
  let action: Record<string, string> | null = null;
  if (body.action != null) {
    const input = object(body.action);
    const type = text(input.type);
    if (type === "answer") action = { type, answerId: text(input.answerId) };
    else if (type === "recommend") action = { type };
    else if (type === "calibrate" || type === "react") {
      const reaction = text(input.reaction);
      if (!["LOVE", "LIKE", "NOT_SURE", "DISLIKE"].includes(reaction))
        throw new Error("HCI_CONTRACT_INVALID");
      action =
        type === "react"
          ? { type, reaction, fabricId: text(input.fabricId) }
          : { type, reaction };
    } else throw new Error("HCI_CONTRACT_INVALID");
    if (sessionId && revision === null) throw new Error("HCI_CONTRACT_INVALID");
  }
  return { requestId, sessionId, revision, action };
}

/** Future hosted API returns presentation only; never forward an upstream object verbatim. */
export function projectHostedHci(value: unknown, sourceCommit: string) {
  const body = object(value);
  if (
    body.version !== "curtainsuk-hci-presentation-v1" ||
    body.sourceCommit !== sourceCommit ||
    !["discovery", "calibration", "complete"].includes(String(body.phase))
  )
    throw new Error("HCI_CONTRACT_INVALID");
  const sessionId = text(body.sessionId);
  if (!uuid.test(sessionId)) throw new Error("HCI_CONTRACT_INVALID");
  if (!Array.isArray(body.shortlist) || body.shortlist.length > 5)
    throw new Error("HCI_CONTRACT_INVALID");
  const ids = new Set<string>();
  const list = (value: unknown, max: number) => {
    if (!Array.isArray(value) || value.length > max)
      throw new Error("HCI_CONTRACT_INVALID");
    return value.map((item) => text(item, 500));
  };
  const shortlist = body.shortlist.map((value, index) => {
    const card = object(value);
    const fabricMasterId = text(card.fabricMasterId);
    if (ids.has(fabricMasterId) || card.rank !== index + 1)
      throw new Error("HCI_CONTRACT_INVALID");
    ids.add(fabricMasterId);
    return {
      fabricMasterId,
      supplierSku: text(card.supplierSku),
      reactionId: text(card.reactionId),
      rank: index + 1,
      explanation: list(card.explanation, 3),
      unknowns: list(card.unknowns, 5),
    };
  });
  const q = body.question == null ? null : object(body.question);
  if (q && (!Array.isArray(q.answers) || q.answers.length > 12))
    throw new Error("HCI_CONTRACT_INVALID");
  const question = q
    ? {
        id: text(q.id),
        prompt: text(q.prompt, 1000),
        answers: (q.answers as unknown[]).map((value) => {
          const answer = object(value);
          return { id: text(answer.id), label: text(answer.label, 300) };
        }),
      }
    : null;
  const stimulusId = body.stimulusId == null ? null : text(body.stimulusId);
  if (stimulusId && !/^[a-zA-Z0-9_-]+$/.test(stimulusId))
    throw new Error("HCI_CONTRACT_INVALID");
  if (
    body.windowSlug != null &&
    !["standard-window", "bay-window"].includes(String(body.windowSlug))
  )
    throw new Error("HCI_CONTRACT_INVALID");
  return {
    version: "curtainsuk-hci-presentation-v1",
    sourceCommit,
    internalOnly: true,
    sessionId,
    revision: integer(body.revision),
    phase: body.phase as string,
    profileSummary:
      typeof body.profileSummary === "string" &&
      body.profileSummary.length === 0
        ? ""
        : text(body.profileSummary, 4000),
    windowSlug: body.windowSlug ?? null,
    question,
    stimulusId,
    shortlist,
  };
}

/** Dependency-injected transport for boundary tests; production entry point is server-only. */
export async function requestHostedHci(input: {
  env: Environment;
  release: Release;
  staffId: string;
  command: unknown;
  fetchImpl?: typeof fetch;
}) {
  if (!hciHostedEnabled(input.env, input.release))
    throw new Error("HCI_DISABLED");
  const command = hciServiceCommand(input.command);
  const endpoint = new URL(
    input.env.CURTAINSUK_HCI_SERVICE_URL ?? "https://invalid.invalid",
  );
  const secret = input.env.CURTAINSUK_HCI_SERVICE_TOKEN ?? "";
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.hostname === "invalid.invalid" ||
    endpoint.hostname === "localhost" ||
    !endpoint.hostname.includes(".") ||
    (endpoint.port && endpoint.port !== "443") ||
    secret.length < 32 ||
    !uuid.test(input.staffId)
  )
    throw new Error("HCI_CONFIGURATION_INVALID");
  // Stable across service-token rotation. Only the authenticated server supplies this owner.
  const owner = createHash("sha256")
    .update(`curtainsuk:staff:${input.staffId}`)
    .digest("hex");
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        version: "curtainsuk-hci-service-v1",
        owner,
        sourceCommit: input.release.sourceCommit,
        ...command,
      }),
    });
  } catch {
    throw new Error("HCI_SERVICE_UNAVAILABLE");
  }
  if (response.status === 409) throw new Error("HCI_SESSION_CONFLICT");
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("HCI_SERVICE_UNAVAILABLE");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("HCI_CONTRACT_INVALID");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32_768) {
        await reader.cancel();
        throw new Error("HCI_CONTRACT_INVALID");
      }
      chunks.push(value);
    }
    const view = projectHostedHci(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
      input.release.sourceCommit,
    );
    if (command.sessionId && view.sessionId !== command.sessionId)
      throw new Error("HCI_CONTRACT_INVALID");
    return view;
  } catch (error) {
    if (error instanceof Error && error.message === "HCI_CONTRACT_INVALID")
      throw error;
    throw new Error("HCI_SERVICE_UNAVAILABLE");
  } finally {
    reader.releaseLock();
  }
}
