/** Private business policy. Never serialize inputs or effective metres publicly. */
export const DAILY_STOCK_POLICY = "curtainsuk-daily-aggregate-30m-v1";
/** Retain the last known position privately, but never sell from a stale morning check. */
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
  input: {
    aggregateMetres: number | null;
    confirmedUsageMetres: number;
    snapshotDate: string | null;
    discontinued: boolean;
    refreshFailed?: boolean;
  },
  now = new Date(),
) {
  const stale =
    input.refreshFailed === true ||
    input.snapshotDate === null ||
    (input.snapshotDate < ukDate(now) && morningDue(now));
  if (input.discontinued)
    return {
      status: "DISCONTINUED" as const,
      availability: "NO_LONGER_AVAILABLE" as const,
      label: "Currently unavailable",
      stale,
    };
  if (
    input.aggregateMetres === null ||
    !Number.isFinite(input.aggregateMetres) ||
    input.aggregateMetres < 0 ||
    !Number.isFinite(input.confirmedUsageMetres) ||
    input.confirmedUsageMetres < 0
  )
    return {
      status: "UNKNOWN" as const,
      availability: "AVAILABILITY_TO_BE_CONFIRMED" as const,
      label: "Availability to be confirmed",
      stale,
    };
  const available = input.aggregateMetres - input.confirmedUsageMetres > 30;
  return {
    status: available
      ? ("AVAILABLE" as const)
      : ("OUT_OF_STOCK_FOR_CURTAINSUK" as const),
    availability: available
      ? ("FABRIC_AVAILABLE" as const)
      : ("TEMPORARILY_UNAVAILABLE" as const),
    label: available ? "Fabric available" : "Currently unavailable",
    stale,
  };
}
