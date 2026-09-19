import assert from "node:assert/strict";
import test from "node:test";
import { acceptVisualCandidate, hciVisualModel, reviewState, validateCandidate, visualPromptVersion, visualSchemaVersion, type VisualCandidate } from "../visual-enrichment";

const binding = {
  fabricId: "pt-1",
  canonicalFabricId: "pt-1",
  supplierId: "prestigious-textiles",
  brandId: "prestigious-textiles",
  designId: "pt-design-1",
  sku: "1/1",
  imageReference: "https://cdn.shopify.com/s/files/1/0256/4551/4861/files/example.jpg",
  expectedImageHash: "sha256:" + "a".repeat(64),
  sourceRecordKey: "fabric-master:pt-1",
};

function candidate(overrides: Partial<VisualCandidate> = {}): VisualCandidate {
  const observations = Object.fromEntries([
    "primaryColour","colourTemperature","lightness","saturation","contrast","colourComplexity","patternClass","patternScale","visualActivity","directionality","sheenAppearance","visualWeight",
  ].map((key) => [key, { value: key === "patternScale" || key === "directionality" ? "unknown" : key === "patternClass" ? "plain" : key === "primaryColour" ? "blue" : key === "colourTemperature" ? "cool" : key === "lightness" ? "light" : key === "saturation" ? "muted" : key === "contrast" ? "low" : key === "colourComplexity" ? "tonal" : key === "visualActivity" ? "minimal" : key === "sheenAppearance" ? "matte" : "light", confidence: key === "patternScale" || key === "directionality" ? "REVIEW" : "HIGH" }])) as Record<string, { value: string|string[]; confidence: "HIGH"|"REVIEW" }>;
  observations.secondaryColours = { value: ["cream"], confidence: "HIGH" };
  observations.motif = { value: [], confidence: "REVIEW" };
  observations.visualSurface = { value: ["smooth"], confidence: "HIGH" };
  observations.character = { value: ["calm"], confidence: "HIGH" };
  return { imageContext: "CLEAN_SWATCH", observations: observations as VisualCandidate["observations"], reviewFlags: [], ...overrides };
}

test("accepts the approved v1 lineage and produces stable provenance", () => {
  const visual = acceptVisualCandidate(candidate(), { binding, imageContentHash: binding.expectedImageHash, modelId: hciVisualModel, promptVersion: visualPromptVersion, schemaVersion: visualSchemaVersion, analysedAt: "2026-09-19T09:30:00.000Z" });
  assert.equal(visual.version, "colourway-visual-fingerprint-v1");
  assert.match(visual.outputHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(visual.evidenceId, /^sha256:[a-f0-9]{64}$/);
  assert.match(visual.digest, /^sha256:[a-f0-9]{64}$/);
});

test("rejects physical scale claims and duplicate primary/secondary colours", () => {
  assert.throws(() => validateCandidate(candidate({ observations: { ...candidate().observations, patternScale: { value: "small", confidence: "HIGH" } } })), /PHYSICAL_SCALE/);
  assert.throws(() => validateCandidate(candidate({ observations: { ...candidate().observations, secondaryColours: { value: ["blue"], confidence: "HIGH" } } })), /DUPLICATE_PRIMARY/);
});

test("marks review-needed candidates as proposed rather than approved", () => {
  assert.equal(reviewState(candidate()), "REVIEW_REQUIRED");
  assert.equal(reviewState(candidate({ reviewFlags: ["COLOUR_AMBIGUOUS"] })), "REVIEW_REQUIRED");
});

