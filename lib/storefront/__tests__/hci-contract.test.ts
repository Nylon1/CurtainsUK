import { test } from "node:test";
import assert from "node:assert/strict";
import { projectHciView, type HciPilotResponse } from "../hci-contract";
const fixture = (): HciPilotResponse => ({
  aggregate: { revision: 2, commandLog: [{ private: true }] },
  phase: "complete",
  question: null,
  stimulusId: null,
  summary: "A softer room.",
  cards: [
    {
      fabricId: "hci:1",
      curtainsUkFabricId: "sdg-exact",
      sku: "EXACT",
      brand: "Sanderson",
      design: "Design",
      colourway: "Colour",
      imageUrl: "https://supplier.invalid/private",
      reasons: ["Softer pattern"],
      colourEvidenceKnown: false,
    },
  ],
});
test("HCI boundary preserves ranked exact identity and unknowns without private engine payload", () => {
  const result = projectHciView(fixture(), "session-1");
  assert.equal(result.shortlist[0].fabricMasterId, "sdg-exact");
  assert.equal(result.shortlist[0].supplierSku, "EXACT");
  assert.equal(result.shortlist[0].rank, 1);
  assert.equal(result.shortlist[0].unknowns.length, 1);
  assert.doesNotMatch(
    JSON.stringify(result),
    /commandLog|supplier.invalid|imageUrl|aggregate/,
  );
});
test("ambiguous identities and unbounded shortlists fail closed", () => {
  const input = fixture();
  input.cards.push(input.cards[0]);
  assert.throws(() => projectHciView(input, "s"), /IDENTITY/);
  input.cards = Array(6).fill(input.cards[0]);
  assert.throws(() => projectHciView(input, "s"), /CONTRACT/);
});

test("Bay consultation context passes to configuration without adding HCI configuration decisions", () => {
  const input = fixture();
  input.aggregate.commandLog = [
    { type: "answer-discovery", questionId: "window", answerId: "bay" },
  ];
  const projected = projectHciView(input, "s");
  assert.equal(projected.windowSlug, "bay-window");
  assert.equal(projected.shortlist[0].fabricMasterId, "sdg-exact");
  assert.doesNotMatch(
    JSON.stringify(projected),
    /cutPrice|stockMetres|margin|pricingRules/,
  );
});
