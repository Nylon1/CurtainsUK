import { DecisionEngineValidationError } from "@/lib/decision-engine/errors";

const GENERIC_MESSAGE = "Please check your measurements and curtain choices, then try again.";

const VALIDATION_MESSAGES: Record<string, string> = {
  MEASUREMENT_REQUIRED: "Please enter the required width and drop in centimetres.",
  MEASUREMENT_TYPE_INVALID: "Please check your width and drop measurements in centimetres.",
  MEASUREMENT_INVALID: "Please enter positive width and drop measurements in centimetres.",
  MEASUREMENT_BELOW_MINIMUM: "A measurement is below the supported range. Please check it in centimetres.",
  MEASUREMENT_ABOVE_MAXIMUM: "A measurement is above the supported range. Please check it in centimetres.",
  WIDTH_BELOW_MINIMUM: "The width is below the supported range. Please check it in centimetres.",
  WIDTH_ABOVE_MAXIMUM: "The width is above the supported range. Please check it in centimetres.",
  DROP_BELOW_MINIMUM: "The drop is below the supported range. Please check it in centimetres.",
  DROP_ABOVE_MAXIMUM: "The drop is above the supported range. Please check it in centimetres.",
  SUSPICIOUS_MM_CM_INPUT: "Please check that your measurements are in centimetres, not millimetres.",
  MEASUREMENT_BASIS_NOT_ALLOWED: "Choose whether your fitted hardware is a track or a pole, then check its width.",
  HEADING_NOT_ALLOWED_FOR_WINDOW: "This heading is unavailable for the selected window. Please choose another heading.",
  HEADING_NOT_ALLOWED_FOR_FABRIC: "This heading is unavailable with the selected fabric. Please choose another heading.",
  LINING_NOT_ALLOWED_FOR_WINDOW: "This lining is unavailable for the selected window. Please choose another lining.",
  LINING_NOT_ALLOWED_FOR_FABRIC: "This lining is unavailable with the selected fabric. Please choose another lining.",
  CONSTRUCTION_NOT_ALLOWED: "Please choose a supported pair or single-curtain arrangement.",
  FABRIC_NOT_ACTIVE: "This fabric is no longer available to configure. Please choose another fabric.",
  FABRIC_DISCONTINUED: "This fabric is discontinued. Please choose another fabric.",
  FABRIC_NOT_SUITABLE_FOR_WINDOW: "This fabric is unavailable for the selected window. Please choose another fabric.",
};

/** Only fixed, customer-safe labels and codes leave the price service. */
export function priceRejectionDetails(error: unknown): { diagnosticCode: string; customerMessage: string } | null {
  if (error instanceof DecisionEngineValidationError) {
    const code = error.issues.find((issue) => Object.hasOwn(VALIDATION_MESSAGES, issue.code))?.code;
    return {
      diagnosticCode: code ? `CONFIGURATION_${code}` : "CONFIGURATION_INVALID",
      customerMessage: code ? VALIDATION_MESSAGES[code] : GENERIC_MESSAGE,
    };
  }
  if (error instanceof Error && error.message === "MTM_HARDWARE_MEASUREMENT_BASIS_INCOMPATIBLE") {
    return {
      diagnosticCode: "MEASUREMENT_BASIS_INCOMPATIBLE",
      customerMessage: "Choose whether your fitted hardware is a track or a pole, then check its width.",
    };
  }
  return null;
}
