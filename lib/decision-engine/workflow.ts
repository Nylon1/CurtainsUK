import type { CurtainConfiguration, GeometryType } from "./types";

const SPECIALIST_SHAPES: GeometryType[] = ["SYMMETRICAL_APEX", "TRIANGLE", "GABLE", "ANGLED_POLYGON"];

export function canProceedToPayment(configuration: CurtainConfiguration, geometryType: GeometryType): boolean {
  if (SPECIALIST_SHAPES.includes(geometryType) && configuration.technicalReviewState !== "APPROVED") return false;
  return configuration.customerApprovalState === "APPROVED";
}

export function canReleaseToManufacture(configuration: CurtainConfiguration, geometryType: GeometryType): boolean {
  return canProceedToPayment(configuration, geometryType) && configuration.paymentState === "PAID";
}
