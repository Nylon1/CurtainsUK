import { savedPremiumSession } from './curtainsuk-premium-transport';

export const fiSessionStorageKey = 'cuk-fi-premium-consultation-v1';
export const nailaPresentationStorageKey = 'cuk-naila-presentation-v1';

function savedNailaPresentationSession(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = JSON.parse(value) as { consultation?: { sessionId?: unknown } } | null;
    return savedPremiumSession(parsed?.consultation?.sessionId);
  } catch {
    return null;
  }
}

/**
 * FI now owns its own session key. During migration we may still resume the
 * historical shared key, except when Naila's saved presentation proves that
 * the shared session belongs to Naila.
 */
export function selectFiResumeSession(
  fiStoredSession: unknown,
  legacySharedSession: unknown,
  nailaPresentation: unknown,
): string | null {
  const fiSession = savedPremiumSession(fiStoredSession);
  if (fiSession) return fiSession;

  const legacySession = savedPremiumSession(legacySharedSession);
  if (!legacySession) return null;

  return savedNailaPresentationSession(nailaPresentation) === legacySession ? null : legacySession;
}

/**
 * A 409 while restoring an anonymous FI session with no action is not a safe
 * candidate for "retry the same request". Offer a new FI consultation instead.
 * In-journey CAS conflicts keep their existing reconciliation behaviour.
 */
export function isFiReadOnlyResumeConflict(
  status: number,
  sessionId: unknown,
  action: unknown,
  hasView: boolean,
): boolean {
  return status === 409 && !hasView && savedPremiumSession(sessionId) !== null && action === undefined;
}
