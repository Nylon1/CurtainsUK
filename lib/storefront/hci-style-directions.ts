/**
 * Server-derived only. The browser never supplies an eligibility list.
 * A confirmed Interior Fabric Brief is the one point at which Style Directions
 * V2 needs a fresh Fabric Master eligibility projection.
 */
export function styleDirectionRequestContext(
  _state: { interiorBrief?: unknown; styleDirectionsV2?: unknown } | null | undefined,
  action?: Record<string, unknown>,
) {
  return {
    needsEligibility: action?.type === 'brief-confirm',
  };
}
