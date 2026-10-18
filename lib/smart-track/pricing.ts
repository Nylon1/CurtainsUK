import { createHash } from "node:crypto";
import { parseSmartTrackSpec, type SmartTrackSpec } from "./domain";
import {
  trackPackage,
  customerTrackPackage,
  type TrackPackage,
} from "./package";
import { checkTrackWeight, type GovernedCurtainWeight } from "./weight";
import { customerCushionDispatch } from "../cushion-studio/dispatch";
import { allocateVatFromGross } from "../storefront/shopify-draft-order-core";
import { CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS } from "../storefront/checkout-gates";
/** Server module, deliberately absent from every asset allowlist. Costs include VAT. */
const COSTS_GROSS_MINOR = [31000, 36000, 38000, 40000, 43000] as const;
export const TRACK_PRICE_VERSION = "smart-track-owner-2026-10-17-v1";
export const trackDigest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export type LinkedCurtainEvidence = {
  configurationId: string;
  specificationDigest: string;
  heading: string;
  opening: string;
  coverageCm: number;
  measurementBasis: string;
  weight?: GovernedCurtainWeight;
};
function precisionSupported(length: string, step: string) {
  const decimals = Math.max(
    length.split(".")[1]?.length ?? 0,
    step.split(".")[1]?.length ?? 0,
  );
  const integer = (n: string) =>
    BigInt(
      n
        .replace(".", "")
        .padEnd(
          n.replace(".", "").length + decimals - (n.split(".")[1]?.length ?? 0),
          "0",
        ),
    );
  return (
    integer(step) > BigInt(0) && integer(length) % integer(step) === BigInt(0)
  );
}
export function quoteSmartTrack(
  value: unknown,
  options: {
    package?: Readonly<TrackPackage>;
    linked?: LinkedCurtainEvidence;
    now?: Date;
  } = {},
) {
  const spec = parseSmartTrackSpec(value),
    p = options.package ?? trackPackage(spec.system),
    now = options.now ?? new Date();
  if (
    (spec.system === "FOREST_SHUTTLE_ION") !==
    (p.motorModel === "Forest Shuttle iOn")
  )
    throw Error("TRACK_PACKAGE_MISMATCH");
  const band = Math.ceil(Number(spec.lengthCm) / 100) - 1;
  const supplierGrossMinor =
    (COSTS_GROSS_MINOR[band] * (spec.heading === "WAVE" ? 110 : 100)) / 100;
  // Integer half-up rounding of the final unit product price; VAT is already included.
  const unitMinor = Math.floor((supplierGrossMinor * 100 + 35) / 70),
    goodsMinor = unitMinor * spec.quantity;
  const weight = checkTrackWeight(
    spec.weight,
    p.maximumLoadKg,
    spec.weight.mode === "CURTAINSUK" &&
      spec.weight.configurationId === options.linked?.configurationId
      ? options.linked.weight
      : undefined,
  );
  const issues: string[] = [];
  if (p.minimumLengthCm === null)
    issues.push(
      "The minimum track length is awaiting confirmation.",
    );
  else if (Number(spec.lengthCm) < p.minimumLengthCm)
    issues.push(`The minimum finished track length is ${p.minimumLengthCm} cm.`);
  if (p.precisionCm === null)
    issues.push("Cutting precision is awaiting confirmation. Your entered length is preserved.");
  else if (!precisionSupported(spec.lengthCm, p.precisionCm))
    issues.push(
      p.precisionCm === "1"
        ? "Enter your track length in whole centimetres. Your measurement has not been rounded."
        : "This exact length is outside the confirmed cutting specification. Please edit it; it has not been rounded.",
    );
  if (
    !p.controller ||
    !p.motorArticle ||
    !p.trackSystem ||
    !p.finish ||
    !p.bracketSpecification ||
    !p.carrierSpecification ||
    !p.approvalReference
  )
    issues.push(
      "Final track, control and mounting specifications are awaiting confirmation. All required hardware is included in the price.",
    );
  if (!p.mounting.includes(spec.mounting))
    issues.push("This mounting choice is not supplied in this package.");
  if (
    spec.heading === "WAVE" &&
    !p.waveSpacingMm?.includes(spec.waveSpacingMm!)
  )
    issues.push(
      "Wave carrier spacing needs confirmation against your curtain heading.",
    );
  if (!p.configurationLimitsConfirmed)
    issues.push(
      "The supplier must confirm the load limit for this track configuration.",
    );
  const declarationMatches = spec.weightConfirmation?.system === spec.system &&
    spec.weightConfirmation.maximumKg === p.maximumLoadKg;
  const conflictingWeight = weight.minimumKg !== null && weight.minimumKg > p.maximumLoadKg;
  const weightAcceptance = {
    accepted: !conflictingWeight && (declarationMatches || weight.compatibility === "WITHIN_LIMIT"),
    basis: declarationMatches ? "CUSTOMER_CONFIRMATION" as const
      : weight.compatibility === "WITHIN_LIMIT" ? "WEIGHT_EVIDENCE" as const : "UNCONFIRMED" as const,
    maximumKg: p.maximumLoadKg,
    conflictingWeight,
  };
  if (!weightAcceptance.accepted)
    issues.push(conflictingWeight
      ? `The entered or estimated weight exceeds ${p.maximumLoadKg} kg. Review the weight before ordering.`
      : `Confirm that the total curtain weight on each track does not exceed ${p.maximumLoadKg} kg.`);
  if (!p.dispatch) issues.push("Track dispatch time is awaiting confirmation.");
  if (!p.service)
    issues.push(
      "The supply and fitting service terms are awaiting confirmation.",
    );
  if (!spec.powerLocationChecked)
    issues.push(
      spec.system === "FOREST_SHUTTLE_ION"
        ? "Check access to remove and charge the battery beside the selected motor side."
        : "Check the mains connection location beside the selected motor side.",
    );
  if (!spec.measurementsConfirmed)
    issues.push("Review and confirm your exact track measurement.");
  if (spec.linkedCurtain) {
    const l = options.linked;
    if (!l || l.configurationId !== spec.linkedCurtain.configurationId)
      issues.push(
        "The linked curtain is unavailable. Relink it or configure for existing curtains.",
      );
    else {
      if (l.specificationDigest !== spec.linkedCurtain.specificationDigest)
        issues.push(
          "Your linked curtain has changed. Review the track length, heading, opening and weight again.",
        );
      if (l.heading !== spec.heading)
        issues.push(
          "The track heading must match the linked curtain; eyelet curtains are incompatible.",
        );
      if (l.opening !== spec.opening)
        issues.push("The opening arrangement differs from the linked curtain.");
      if (!spec.linkedCurtain.coverageConfirmed)
        issues.push(
          "Confirm the required track length separately from the curtain coverage measurement.",
        );
    }
  }
  const quoteId = trackDigest({
    spec,
    priceVersion: TRACK_PRICE_VERSION,
    package: p,
    unitMinor,
    weight,
    issues,
    linked: options.linked ?? null,
  });
  const dispatchEstimate = customerCushionDispatch(p.dispatch);
  return {
    spec,
    quoteId,
    unitMinor,
    goodsMinor,
    vatMinor: allocateVatFromGross(
      goodsMinor,
      CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS,
    ),
    weight,
    issues,
    ready: true,
    weightAcceptance,
    purchaseReady: issues.length === 0,
    package: customerTrackPackage(p),
    dispatchEstimate: dispatchEstimate ? {
      ...dispatchEstimate,
      message: dispatchEstimate.message.replace("cushion dispatch", "smart track dispatch"),
    } : null,
    priceVersion: TRACK_PRICE_VERSION,
    currency: "GBP" as const,
    vatIncluded: true as const,
    quotedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    delivery: {
      scope: "order" as const,
      grossMinor: 1295,
      message:
        "£12.95 including VAT once per order containing a smart track, within our approved delivery area.",
    },
  };
}
export type SmartTrackQuote = ReturnType<typeof quoteSmartTrack>;
export function trackSpecificationDigest(spec: SmartTrackSpec) {
  return trackDigest(parseSmartTrackSpec(spec));
}
