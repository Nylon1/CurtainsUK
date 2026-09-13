import test from "node:test";
import assert from "node:assert/strict";
import {
  integrationCommand,
  integrationView,
  integrationWindowContext,
} from "../hci-integration-contract";
const id = "11111111-1111-4111-8111-111111111111";

test("explicit consultation window choice survives resume without borrowing an older project", () => {
  for (const [answerId, expected] of [["standard", "standard-window"], ["bay", "bay-window"], ["awkward_shape", null]]) {
    assert.equal(integrationWindowContext({ commands: [{ type: "answer-discovery", questionId: "window", answerId }] }), expected);
  }
  assert.equal(integrationWindowContext({ commands: [] }), null);
});
test("staging accepts only commands, never browser histories, credentials, owner or rankings", () => {
  for (const field of ["owner", "state", "commands", "catalogue", "token"])
    assert.throws(() => integrationCommand({ requestId: id, [field]: {} }));
  assert.equal(integrationCommand({ requestId: id }).sessionId, id);
  assert.throws(() =>
    integrationCommand({
      requestId: id,
      action: { type: "react", fabricId: "a", reaction: "LIKE" },
    }),
  );
});
test("refinement preserves separate nullable reactions and exact fabric identity", () => {
  const a = integrationCommand({
    requestId: id,
    sessionId: id,
    revision: 2,
    action: {
      type: "refine",
      feedback: [
        {
          strategyId: "overall",
          fabricId: "exact:sku",
          strategyReaction: "LOVE",
          fabricReaction: null,
        },
      ],
    },
  });
  assert.equal(
    (a.action?.feedback as { fabricId: string }[])[0].fabricId,
    "exact:sku",
  );
});
test("public projection omits raw state and privileged attributes, rejects a drifting baseline", () => {
  const source = {
    version: "curtainsuk-hci-presentation-v2",
    sourceCommit: "41a9f3f",
    sessionId: id,
    phase: "directions",
    profileSummary: "Calm room",
    question: null,
    stimulusId: null,
    palette: null,
    directions: [
      {
        id: "overall",
        label: "Based on your taste",
        purpose: "Your taste.",
        status: "available",
        cards: [
          {
            fabricMasterId: "sdg-exact",
            supplierSku: "EXACT",
            reactionId: "canonical-exact",
            explanation: ["A calm colourway."],
            cutPrice: 99,
          },
        ],
      },
    ],
    ranking: { score: 90 },
    token: "private",
    state: { commands: [] },
  };
  const safe = JSON.stringify(integrationView(source));
  for (const forbidden of ["cutPrice", "score", "token", "commands"])
    assert(!safe.includes(forbidden));
  assert.throws(() => integrationView({ ...source, sourceCommit: "other" }));
});
test("the pinned HCI colour question supports its full eighteen answers", () => {
  const view = {
    version: "curtainsuk-hci-presentation-v2",
    sourceCommit: "41a9f3f",
    sessionId: id,
    phase: "discovery",
    profileSummary: "",
    question: {
      id: "colour",
      prompt: "Which colours?",
      answers: Array.from({ length: 18 }, (_, i) => ({
        id: String(i),
        label: "Colour " + i,
      })),
    },
    palette: null,
    directions: [],
    stimulusId: null,
  };
  assert.equal(integrationView(view).question?.answers.length, 18);
});
