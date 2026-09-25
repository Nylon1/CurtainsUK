export type VisualDatabaseError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
};

function errorParts(error: unknown) {
  if (error instanceof Error) return [error.message];
  if (!error || typeof error !== "object") return [] as string[];
  return ["code", "message", "details", "hint", "status"]
    .map((key) => (error as Record<string, unknown>)[key])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map(String)
    .filter((value) => value.trim().length > 0);
}

export function visualFailureReason(error: unknown) {
  return errorParts(error).join("_").replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 80) || "UNKNOWN_FAILURE";
}

export function isRetryableVisualDatabaseError(error: unknown) {
  const parts = errorParts(error).join(" ").toLowerCase();
  return /\b(57014|40001|40p01)\b/.test(parts)
    || parts.includes("statement timeout")
    || parts.includes("deadlock")
    || parts.includes("serialization")
    || parts.includes("connection")
    || parts.includes("http 500");
}

export async function retryVisualDatabase<T>(
  operation: () => Promise<{ data: T; error: unknown | null }>,
  options: { attempts?: number; retryDelayMilliseconds?: number; wait?: (milliseconds: number) => Promise<void>; onRetry?: (milliseconds: number) => void } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  // The production Browse refresh owns its advisory lock for about 14 seconds,
  // while a PostgREST request can time out at 8 seconds. Wait past that window
  // before an idempotent ledger retry instead of immediately colliding again.
  const retryDelayMilliseconds = options.retryDelayMilliseconds ?? 15_000;
  const wait = options.wait ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await operation();
    if (!result.error) return result.data;
    lastError = result.error;
    if (attempt === attempts || !isRetryableVisualDatabaseError(result.error)) throw result.error;
    options.onRetry?.(retryDelayMilliseconds);
    await wait(retryDelayMilliseconds);
  }
  throw lastError;
}
