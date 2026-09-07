export const EMAIL_EVIDENCE_STATES = ["EVIDENCE_NOT_RECEIVED", "EVIDENCE_RECEIVED", "EVIDENCE_REVIEWED"] as const;
export type EmailEvidenceState = typeof EMAIL_EVIDENCE_STATES[number];
export interface EmailEvidenceEvent {
  eventId: string;
  state: EmailEvidenceState;
  revisionId: string;
  actorId: string | null;
  reason: string;
  createdAt: string;
}
export interface EmailEvidence {
  required: boolean;
  state: EmailEvidenceState;
  latestEventId: string | null;
  reviewedRevisionId: string | null;
  events: EmailEvidenceEvent[];
}

// Full UUID, never a truncated reference that could collide.
export function reviewReference(requestId: string) { return `CUK-${requestId.toUpperCase()}`; }
export function reviewEmailInstructions(requestId: string) {
  return `Your project is saved. Email photos or drawings separately to our curtain team, with ${reviewReference(requestId)} in the subject. No payment has been taken. We will review the evidence before approving specialist work.`;
}
export function requiresEmailEvidence(slug: string) {
  return ["apex-window", "triangular-window", "gable-end-window", "awkward-unusual-window", "dormer-window", "curved-bow-window", "corner-window"].includes(slug);
}
export function summarizeEmailEvidence(events: EmailEvidenceEvent[], revisionId: string | null, originalWindow: string, effectiveWindow = originalWindow): EmailEvidence {
  const last = events.at(-1);
  const state = last?.state === "EVIDENCE_REVIEWED" && last.revisionId !== revisionId ? "EVIDENCE_RECEIVED" : last?.state ?? "EVIDENCE_NOT_RECEIVED";
  return {
    required: requiresEmailEvidence(originalWindow) || requiresEmailEvidence(effectiveWindow) || events.some((event) => event.actorId !== null),
    state,
    latestEventId: last?.eventId ?? null,
    reviewedRevisionId: state === "EVIDENCE_REVIEWED" ? last!.revisionId : null,
    events,
  };
}
export function emailEvidenceReady(evidence: EmailEvidence) {
  return !evidence.required || evidence.state === "EVIDENCE_REVIEWED";
}
