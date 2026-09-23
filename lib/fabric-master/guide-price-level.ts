/** Customer guide only. Bounds use the existing approved x3 guide minor units. */
export const GUIDE_PRICE_LEVELS = [
  { id: 'MID_RANGE', label: 'Mid Range', detail: 'Under £50 per metre', minimumMinor: 0, maximumMinor: 5_000 },
  { id: 'LUXURY', label: 'Luxury', detail: '£50 – £149.99 per metre', minimumMinor: 5_000, maximumMinor: 15_000 },
  { id: 'PREMIUM_LUXURY', label: 'Premium Luxury', detail: '£150 – £249.99 per metre', minimumMinor: 15_000, maximumMinor: 25_000 },
  { id: 'SUPER_LUXURY', label: 'Super Luxury', detail: '£250+ per metre', minimumMinor: 25_000, maximumMinor: null },
] as const;

export type GuidePriceLevel = (typeof GUIDE_PRICE_LEVELS)[number]['id'];

export function guidePriceLevel(value: unknown): GuidePriceLevel | null {
  return typeof value === 'string' && GUIDE_PRICE_LEVELS.some((level) => level.id === value)
    ? value as GuidePriceLevel
    : null;
}

export function guidePriceLevelDefinition(value: unknown) {
  const id = guidePriceLevel(value);
  return id ? GUIDE_PRICE_LEVELS.find((level) => level.id === id)! : null;
}
