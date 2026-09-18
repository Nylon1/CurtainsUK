/** Private business policy. Never serialize inputs or effective metres publicly. */
export const DAILY_STOCK_POLICY = "curtainsuk-stock-72h-at-least-30m-v2";
export const STOCK_VALIDITY_MS = 3 * 24 * 60 * 60 * 1000;
export type DailyStockInput = {
  aggregateMetres: number | null;
  confirmedUsageMetres: number;
  snapshotDate: string | null;
  checkedAt?: string | null;
  discontinued: boolean;
  refreshFailed?: boolean;
};
export function stockObservationCurrent(checkedAt: string | null | undefined, now = new Date()) {
  const checked = Date.parse(checkedAt ?? '');
  return Number.isFinite(checked) && checked <= now.getTime() && now.getTime() - checked <= STOCK_VALIDITY_MS;
}
/** A failed retrieval does not invalidate a genuine observation still within 72 hours. */
export function currentDailyStockAvailability(decision: ReturnType<typeof dailyStockDecision>) {
  return decision.stale && decision.status !== 'DISCONTINUED'
    ? 'AVAILABILITY_TO_BE_CONFIRMED' as const
    : decision.availability;
}
export function ukDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function morningDue(now = new Date()) {
  return (
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    ) >= 6
  );
}
export function dailyStockDecision(
  input: DailyStockInput,
  now = new Date(),
) {
  const stale = !stockObservationCurrent(input.checkedAt, now);
  if (input.discontinued)
    return {
      status: "DISCONTINUED" as const,
      availability: "NO_LONGER_AVAILABLE" as const,
      label: "Currently unavailable",
      stale,
    };
  const effectiveMetres = currentAvailableMetres(input, now);
  if (effectiveMetres === null)
    return {
      status: "CHECK_AVAILABILITY" as const,
      availability: "AVAILABILITY_TO_BE_CONFIRMED" as const,
      label: "Check availability",
      stale,
    };
  const available = effectiveMetres >= 30;
  return {
    status: available
      ? ("AVAILABLE" as const)
      : ("OUT_OF_STOCK" as const),
    availability: available
      ? ("FABRIC_AVAILABLE" as const)
      : ("TEMPORARILY_UNAVAILABLE" as const),
    label: available ? "Fabric available" : "Out of stock — awaiting supplier stock",
    stale,
  };
}

/** Private available-now quantity after confirmed CurtainsUK usage. */
export function currentAvailableMetres(input: DailyStockInput, now = new Date()): number | null {
  if (input.discontinued || !stockObservationCurrent(input.checkedAt, now)
      || input.aggregateMetres === null || !Number.isFinite(input.aggregateMetres)
      || input.aggregateMetres < 0 || !Number.isFinite(input.confirmedUsageMetres)
      || input.confirmedUsageMetres < 0) return null;
  return Math.max(0, input.aggregateMetres - input.confirmedUsageMetres);
}

/** Samples require fresh positive fabric stock, independently of the curtain 30m floor. */
export function sampleStockAvailable(input: DailyStockInput, now = new Date()) {
  const metres = currentAvailableMetres(input, now);
  return metres !== null && metres > 0;
}

/** Both the commercial curtain floor and this job's calculated metres must fit. */
export function curtainStockSufficient(input: DailyStockInput, requiredMetres: number, now = new Date()) {
  const metres = currentAvailableMetres(input, now);
  return Number.isFinite(requiredMetres) && requiredMetres > 0 && metres !== null
    && metres >= 30 && metres >= requiredMetres;
}
