/** Server-confirmed cushion dispatch authority. Never inferred from curtain lead times. */
type CushionDispatchAuthority = {
  version: string;
  status: "confirmed";
  startsFrom: "order-confirmation" | "fabric-availability-confirmation";
  confirmedAt: string;
  approvalReference: string;
};

/** Existing saved working-day estimates intentionally retain their original shape. */
export type CushionWorkingDayDispatchEstimate = CushionDispatchAuthority & {
  unit?: "working-days";
  minimumWorkingDays: number;
  maximumWorkingDays: number;
  minimumCalendarWeeks?: never;
  maximumCalendarWeeks?: never;
};

export type CushionCalendarWeekDispatchEstimate = CushionDispatchAuthority & {
  unit: "calendar-weeks";
  minimumCalendarWeeks: number;
  maximumCalendarWeeks: number;
  minimumWorkingDays?: never;
  maximumWorkingDays?: never;
};

export type CushionDispatchEstimate =
  | CushionWorkingDayDispatchEstimate
  | CushionCalendarWeekDispatchEstimate;

/** Owner dispatch confirmation only; does not approve any workroom construction. */
export const OWNER_CONFIRMED_CUSHION_DISPATCH: Readonly<CushionCalendarWeekDispatchEstimate> =
  Object.freeze({
    version: "owner-dispatch-calendar-weeks-2026-10-15-v1",
    status: "confirmed",
    unit: "calendar-weeks",
    minimumCalendarWeeks: 3,
    maximumCalendarWeeks: 4,
    startsFrom: "order-confirmation",
    // Only the confirmation date is known; do not invent an exact time.
    confirmedAt: "2026-10-15",
    approvalReference: "owner-conversation-2026-10-15-dispatch-3-4-calendar-weeks",
  });

/** Missing or incomplete authority leaves exploration available but cannot enable buying. */
export function confirmedCushionDispatch(
  value: unknown,
): CushionDispatchEstimate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const calendarWeeks = v.unit === "calendar-weeks";
  const keys = [
    "version",
    "status",
    "unit",
    ...(calendarWeeks
      ? ["minimumCalendarWeeks", "maximumCalendarWeeks"]
      : ["minimumWorkingDays", "maximumWorkingDays"]),
    "startsFrom",
    "confirmedAt",
    "approvalReference",
  ];
  const minimum = calendarWeeks ? v.minimumCalendarWeeks : v.minimumWorkingDays;
  const maximum = calendarWeeks ? v.maximumCalendarWeeks : v.maximumWorkingDays;
  const dateOnly =
    typeof v.confirmedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.confirmedAt) &&
    Number.isFinite(Date.parse(v.confirmedAt)) &&
    new Date(v.confirmedAt).toISOString().slice(0, 10) === v.confirmedAt;
  if (
    Object.keys(v).some((key) => !keys.includes(key)) ||
    typeof v.version !== "string" ||
    !v.version.trim() ||
    v.version.length > 100 ||
    v.status !== "confirmed" ||
    (v.unit !== undefined && v.unit !== "working-days" && !calendarWeeks) ||
    !Number.isSafeInteger(minimum) ||
    !Number.isSafeInteger(maximum) ||
    Number(minimum) < 0 ||
    Number(maximum) < Number(minimum) ||
    Number(maximum) > (calendarWeeks ? 520 : 3660) ||
    (v.startsFrom !== "order-confirmation" &&
      v.startsFrom !== "fabric-availability-confirmation") ||
    typeof v.confirmedAt !== "string" ||
    (!dateOnly && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v.confirmedAt)) ||
    !Number.isFinite(Date.parse(v.confirmedAt)) ||
    typeof v.approvalReference !== "string" ||
    !v.approvalReference.trim() ||
    v.approvalReference.length > 200
  )
    return null;
  return structuredClone(v) as CushionDispatchEstimate;
}

/** Customer projection excludes staff confirmation provenance. Dispatch is not delivery. */
export function customerCushionDispatch(value: unknown) {
  const estimate = confirmedCushionDispatch(value);
  if (!estimate) return null;
  const { version, startsFrom } = estimate;
  const calendarWeeks = estimate.unit === "calendar-weeks";
  const minimum = calendarWeeks ? estimate.minimumCalendarWeeks : estimate.minimumWorkingDays;
  const maximum = calendarWeeks ? estimate.maximumCalendarWeeks : estimate.maximumWorkingDays;
  const range =
    minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
  const duration = calendarWeeks
    ? { unit: "calendar-weeks" as const, minimumCalendarWeeks: minimum, maximumCalendarWeeks: maximum }
    : { minimumWorkingDays: minimum, maximumWorkingDays: maximum };
  const unitLabel = calendarWeeks
    ? (maximum === 1 ? "calendar week" : "calendar weeks")
    : (maximum === 1 ? "working day" : "working days");
  const start =
    startsFrom === "order-confirmation"
      ? "order confirmation"
      : "confirmation that the fabric is available";
  return {
    version,
    ...duration,
    startsFrom,
    message: `Estimated cushion dispatch: ${range} ${unitLabel} after ${start}. This is a dispatch estimate, not a guaranteed delivery date.`,
  };
}
