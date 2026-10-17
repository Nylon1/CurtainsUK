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
  if (p.minimumLengthCm === null || p.precisionCm === null)
    issues.push(
      "The minimum length and cutting precision are awaiting confirmation. Your entered length is preserved.",
    );
  else if (
    Number(spec.lengthCm) < p.minimumLengthCm ||
    !precisionSupported(spec.lengthCm, p.precisionCm)
  )
    issues.push(
      "This exact length is outside the confirmed cutting specification. Please edit it; it has not been rounded.",
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
  if (weight.compatibility !== "WITHIN_LIMIT") issues.push(weight.message);
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
    purchaseReady: issues.length === 0,
    package: customerTrackPackage(p),
    dispatchEstimate: customerCushionDispatch(p.dispatch),
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
