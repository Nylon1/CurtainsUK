export function requiresRetailGuideProjection(
  selectedPriceLevel: string | undefined,
  calibrationNeedsEligibility: boolean,
  styleDirectionsNeedEligibility: boolean,
) {
  return Boolean(selectedPriceLevel && (calibrationNeedsEligibility || styleDirectionsNeedEligibility));
}

export function parseRetailGuideProjection(value: unknown) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !/^[-a-zA-Z0-9]{1,150}$/.test(id)))
    throw Error('RETAIL_GUIDE_PRICE_PROJECTION_INVALID');
  const ids = value as string[];
  if (new Set(ids).size !== ids.length) throw Error('RETAIL_GUIDE_PRICE_PROJECTION_INVALID');
  return ids.sort();
}
