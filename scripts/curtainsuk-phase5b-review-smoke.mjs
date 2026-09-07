import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const apiBase = process.argv[2];
const photoPath = process.argv[3];

if (!apiBase || !photoPath) {
  throw new Error("Usage: node scripts/curtainsuk-phase5b-review-smoke.mjs <shopify-api-base> <photo-path>");
}

const origin = "https://www.curtainsuk.com";
const configuration = {
  windowSlug: "apex-window",
  measurements: {
    coverage_width: 300,
    peak_height: 300,
    left_vertical: 200,
    right_vertical: 200,
    left_slope: 180.278,
    right_slope: 180.278,
  },
  fabricId: "pt-4269-147",
  heading: "WAVE",
  lining: "BLACKOUT",
  construction: "PAIR",
  fixingPosition: "Ceiling-mounted curtain track inside the reveal",
  stackDirection: "SPLIT",
  photoNames: [basename(photoPath)],
};

const calculationResponse = await fetch(`${apiBase}/specialist-review`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: origin,
  },
  body: JSON.stringify(configuration),
});
const calculation = await calculationResponse.json();
if (!calculationResponse.ok) throw new Error(`Specialist review preparation failed (${calculationResponse.status})`);

const absolutePhotoPath = resolve(photoPath);
const photoBytes = await readFile(absolutePhotoPath);
const payload = new FormData();
payload.set("configuration", JSON.stringify(configuration));
payload.set("calculation", JSON.stringify(calculation));
payload.set("contactName", "Phase 5B QA");
payload.set("contactEmail", "phase5b-qa@invalid.example");
payload.set("contactPhone", "");
payload.set("notes", "Synthetic non-production persistence smoke test. No payment or manufacture.");
payload.set("photos", new File([photoBytes], basename(photoPath), { type: "image/jpeg" }));

const submissionResponse = await fetch(`${apiBase}/review-request`, {
  method: "POST",
  headers: { Origin: origin },
  body: payload,
});
const receipt = await submissionResponse.json();
if (!submissionResponse.ok) throw new Error(`Review submission failed (${submissionResponse.status})`);

console.log(JSON.stringify({
  outcome: calculation.outcome,
  hasNumericPrice: [calculation.netAmountMinor, calculation.vatAmountMinor, calculation.totalAmountMinor]
    .some((value) => typeof value === "number"),
  paymentState: calculation.paymentState,
  productionState: calculation.productionState,
  requestId: receipt.requestId,
  configurationId: receipt.configurationId,
  reviewState: receipt.reviewState,
  submittedAt: receipt.submittedAt,
}, null, 2));
