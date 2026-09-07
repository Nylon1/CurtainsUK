import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { emailEvidenceReady, reviewReference, summarizeEmailEvidence, type EmailEvidenceEvent } from "../email-evidence";

const received: EmailEvidenceEvent = { eventId: "event-1", state: "EVIDENCE_RECEIVED", revisionId: "revision-1", actorId: "staff-1", reason: "Synthetic receipt", createdAt: "2026-09-07T22:00:00Z" };
const reviewed: EmailEvidenceEvent = { ...received, eventId: "event-2", state: "EVIDENCE_REVIEWED" };
test("specialist approval requires email review for exactly the current revision", () => {
  assert.equal(emailEvidenceReady(summarizeEmailEvidence([], "revision-1", "apex-window")), false);
  assert.equal(emailEvidenceReady(summarizeEmailEvidence([received], "revision-1", "apex-window")), false);
  assert.equal(emailEvidenceReady(summarizeEmailEvidence([received, reviewed], "revision-1", "apex-window")), true);
  const amended = summarizeEmailEvidence([received, reviewed], "revision-2", "apex-window");
  assert.equal(amended.state, "EVIDENCE_RECEIVED");
  assert.equal(emailEvidenceReady(amended), false);
  assert.equal(reviewed.state, "EVIDENCE_REVIEWED", "history remains unchanged");
});
test("changing window type cannot remove original specialist evidence gate; staff-requested evidence also gates optional cases", () => {
  assert.equal(emailEvidenceReady(summarizeEmailEvidence([], "r", "apex-window", "standard-window")), false);
  assert.equal(emailEvidenceReady(summarizeEmailEvidence([], "r", "bay-window")), true);
  assert.equal(emailEvidenceReady(summarizeEmailEvidence([received], "revision-1", "bay-window")), false);
});
test("email references retain the full unique request identity", () => {
  assert.notEqual(reviewReference("12345678-0000-4000-8000-000000000001"), reviewReference("12345678-0000-4000-8000-000000000002"));
});
test("launch repository and customer form have no storage or scanner dependency", () => {
  const repository = readFileSync(new URL("../review-request-repository.ts", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../security/shopify-proxy-review-controller.ts", import.meta.url), "utf8");
  assert.doesNotMatch(repository, /\.storage\.|scanUploaded|evidence-persistence|uploadEvidence/);
  assert.match(repository, /REVIEW_UPLOADS_DISABLED/);
  assert.doesNotMatch(controller, /"notes", "photos"/);
});
