import { createCurtainConfiguration } from "../curtain-configuration";
import { calculatePrice } from "../pricing-engine";
import { WINDOW_TYPES_BY_SLUG } from "../seed/window-types";
import { STOREFRONT_FABRICS_BY_ID } from "../../storefront/fabrics";
import { buildStagingRuleSet } from "../../storefront/staging-pricing";

export function runPhase4ABayPricingGate() {
  const fabric = STOREFRONT_FABRICS_BY_ID.get("stage-fabric-harlow-sage");
  const windowType = WINDOW_TYPES_BY_SLUG.get("bay-window");
  if (!fabric || !windowType) throw new Error("Phase 4A Bay fixtures are missing");
  const configuration = createCurtainConfiguration({
    id: "phase4a-bay-harlow-sage",
    windowTypeSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH",
    fabricSpecId: fabric.id,
    colour: fabric.colour,
    heading: "WAVE",
    lining: "BLACKOUT",
    interlining: "NONE",
    construction: "PAIR",
    trackOrPole: "BAY_TRACK",
    trackComplexity: "MULTI_SEGMENT",
    numberOfSegments: 3,
    stackDirection: "SPLIT",
  });
  configuration.measurements = {
    coverage_width: 340,
    finished_drop: 220,
    bay_segment_widths: [80, 180, 80],
    bay_angles_degrees: [135, 135],
  };
  configuration.attachments.photoReferences = ["staging-local://bay-room.jpg"];

  const calculation = calculatePrice({
    configuration,
    windowType,
    fabric,
    rules: buildStagingRuleSet(),
    shippingZone: "UK_MAINLAND",
    mode: "CALIBRATION",
  });
  const byCode = (code: string) => calculation.components.find((item) => item.code === code);
  return {
    calculationVersion: calculation.calculationVersion,
    enteredWidthCm: 340,
    centreOverlapCm: 5,
    effectiveWidthCm: 345,
    fullness: 2,
    fabricWidths: calculation.fabricWidths.totalWidths,
    cutLengthCm: calculation.fabricCutLengthMm / 10,
    repeatAdjustedCutLengthCm: calculation.adjustedFabricCutLengthMm / 10,
    fabricMetres: calculation.fabricMetres,
    supplierFabricRateNetPerMetreMinor: calculation.fabricRateSnapshot.supplierCostNetPerMetre.amountMinor,
    faceFabricCostNetMinor: byCode("FABRIC")?.netAmount.amountMinor,
    liningMetres: byCode("LINING_MATERIAL")?.metadata?.metres,
    liningCostNetMinor: byCode("LINING_MATERIAL")?.netAmount.amountMinor,
    makeupCostNetMinor: byCode("BASE_LABOUR")?.netAmount.amountMinor,
    headingAdjustmentNetMinor: byCode("HEADING_ADJUSTMENT")?.netAmount.amountMinor,
    packagingCostNetMinor: byCode("PACKAGING")?.netAmount.amountMinor,
    directCostNetMinor: calculation.directCostNet.amountMinor,
    netSellingPriceMinor: calculation.netTotal.amountMinor,
    vatMinor: calculation.vat.amountMinor,
    grossBeforeRoundingMinor: calculation.grossBeforeRounding.amountMinor,
    finalPriceMinor: calculation.total.amountMinor,
    grossMarginPercent: calculation.grossMarginPercent,
    automaticComplexitySurchargesEnabled: buildStagingRuleSet().automaticComplexitySurchargesEnabled,
  };
}
