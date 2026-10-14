/** Server-confirmed cushion dispatch authority. Never inferred from curtain lead times. */
export type CushionDispatchEstimate = {
  version: string;
  status: "confirmed";
  minimumWorkingDays: number;
  maximumWorkingDays: number;
  startsFrom: "order-confirmation" | "fabric-availability-confirmation";
  confirmedAt: string;
  approvalReference: string;
};

/** Missing or incomplete authority leaves exploration available but cannot enable buying. */
export function confirmedCushionDispatch(
  value: unknown,
): CushionDispatchEstimate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const keys = [
    "version",
    "status",
    "minimumWorkingDays",
    "maximumWorkingDays",
    "startsFrom",
    "confirmedAt",
    "approvalReference",
  ];
  if (
    Object.keys(v).some((key) => !keys.includes(key)) ||
    typeof v.version !== "string" ||
    !v.version.trim() ||
    v.version.length > 100 ||
    v.status !== "confirmed" ||
    !Number.isSafeInteger(v.minimumWorkingDays) ||
    !Number.isSafeInteger(v.maximumWorkingDays) ||
    Number(v.minimumWorkingDays) < 0 ||
    Number(v.maximumWorkingDays) < Number(v.minimumWorkingDays) ||
    Number(v.maximumWorkingDays) > 3660 ||
    (v.startsFrom !== "order-confirmation" &&
      v.startsFrom !== "fabric-availability-confirmation") ||
    typeof v.confirmedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v.confirmedAt) ||
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
  const { version, minimumWorkingDays, maximumWorkingDays, startsFrom } =
    estimate;
  const range =
    minimumWorkingDays === maximumWorkingDays
      ? String(minimumWorkingDays)
      : `${minimumWorkingDays}-${maximumWorkingDays}`;
  const start =
    startsFrom === "order-confirmation"
      ? "order confirmation"
      : "confirmation that the fabric is available";
  return {
    version,
    minimumWorkingDays,
    maximumWorkingDays,
    startsFrom,
    message: `Estimated cushion dispatch: ${range} working days after ${start}. This is a dispatch estimate, not a guaranteed delivery date.`,
  };
}
