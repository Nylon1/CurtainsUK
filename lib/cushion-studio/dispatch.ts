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

/** Point of order is represented by successful order confirmation at checkout. */
export const OWNER_CONFIRMED_CURTAIN_DISPATCH: Readonly<CushionCalendarWeekDispatchEstimate> =
  Object.freeze({
    version: "owner-curtain-dispatch-calendar-weeks-2026-10-16-v1",
    status: "confirmed",
    unit: "calendar-weeks",
    minimumCalendarWeeks: 4,
    maximumCalendarWeeks: 5,
    startsFrom: "order-confirmation",
    confirmedAt: "2026-10-16",
    approvalReference: "owner-conversation-2026-10-16-curtains-4-5-weeks-from-point-of-order",
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

export type MyHomeDispatchComponent = {
  productType: "CURTAIN" | "CUSHION";
  estimate: CushionDispatchEstimate;
};

/** Hold the entire order until its latest product window. Unlike units or start
 * triggers are not silently converted: no holiday or supplier-date assumptions. */
export function combinedMyHomeDispatch(
  components: Array<{ productType: "CURTAIN" | "CUSHION"; estimate: unknown }>,
) {
  if (!components.length) return null;
  const confirmed: MyHomeDispatchComponent[] = [];
  for (const component of components) {
    if (!["CURTAIN", "CUSHION"].includes(component.productType)) return null;
    const estimate = confirmedCushionDispatch(component.estimate);
    if (!estimate) return null;
    confirmed.push({ productType: component.productType, estimate });
  }
  const units = new Set(confirmed.map(({estimate}) => estimate.unit ?? "working-days"));
  const starts = new Set(confirmed.map(({estimate}) => estimate.startsFrom));
  if (units.size !== 1 || starts.size !== 1) return null;
  const calendar = confirmed[0].estimate.unit === "calendar-weeks";
  const minimum = Math.max(...confirmed.map(({estimate}) => estimate.unit === "calendar-weeks" ? estimate.minimumCalendarWeeks : estimate.minimumWorkingDays));
  const maximum = Math.max(...confirmed.map(({estimate}) => estimate.unit === "calendar-weeks" ? estimate.maximumCalendarWeeks : estimate.maximumWorkingDays));
  const startsFrom = confirmed[0].estimate.startsFrom;
  const start = startsFrom === "order-confirmation" ? "order confirmation" : "confirmation that all required fabric is available";
  const unitLabel = calendar ? "calendar weeks" : "working days";
  return {
    version: "my-home-hold-together-v1" as const,
    policy: "hold-together" as const,
    unit: calendar ? "calendar-weeks" as const : "working-days" as const,
    minimum, maximum, startsFrom,
    components: confirmed,
    message: `All items are held and dispatched together. Estimated dispatch: ${minimum === maximum ? maximum : `${minimum}-${maximum}`} ${unitLabel} after ${start}, based on the latest product readiness estimate. This is not a guaranteed delivery date.`,
  };
}

export function customerMyHomeDispatch(value: ReturnType<typeof combinedMyHomeDispatch>) {
  if (!value) return null;
  const { components, ...safe } = value;
  return { ...safe, components: components.map(({productType,estimate}) => {
    const projected = customerCushionDispatch(estimate)!;
    return {productType,...projected,message:productType === "CURTAIN" ? projected.message.replace("cushion dispatch", "curtain dispatch") : projected.message};
  }) };
}
