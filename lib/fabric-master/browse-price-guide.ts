/** Browse-only presentation policy. Never used by configuration or checkout. */
export const BROWSE_PRICE_GUIDE_POLICY = 'curtainsuk-browse-guide-v1';
export const BROWSE_PRICE_GUIDE_DISCLOSURE = 'Price guide. Final price depends on measurements and options.';

// Rounded boundaries from the approved catalogue distribution, 19 September 2026:
// quartiles £48.99 / £84 / £129.51; 90th £185.49, 95th £220.50.
// Upper bounds are exclusive, so every price belongs to exactly one band.
export const BROWSE_PRICE_BANDS = [
  { value: 'under-50', label: 'Under £50', minimumMinor: 0, maximumMinor: 5000 },
  { value: '50-100', label: '£50 – under £100', minimumMinor: 5000, maximumMinor: 10000 },
  { value: '100-150', label: '£100 – under £150', minimumMinor: 10000, maximumMinor: 15000 },
  { value: '150-250', label: '£150 – under £250', minimumMinor: 15000, maximumMinor: 25000 },
  { value: '250-plus', label: '£250+', minimumMinor: 25000, maximumMinor: null },
] as const;

export function browsePriceBand(value: string | null) {
  if (!value) return null;
  const band = BROWSE_PRICE_BANDS.find(band => band.value === value);
  if (!band) throw new Error('BROWSE_PRICE_BAND_INVALID');
  return band;
}

/** Input is already a customer guide from the private query, never supplier cost. */
export function customerBrowseGuide(amountMinor: unknown) {
  return typeof amountMinor === 'number' && Number.isSafeInteger(amountMinor) && amountMinor > 0
    ? { amountMinor, currency: 'GBP' as const, policy: BROWSE_PRICE_GUIDE_POLICY }
    : null;
}
