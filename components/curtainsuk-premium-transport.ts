/** Resume reads do not increment CAS. Only the server's acknowledged revision is
 * authoritative; never infer successful persistence from a client-side counter. */
export function acknowledgedPremiumRevision(requestRevision: unknown, responseRevision: unknown, mutation = true): number {
  if (requestRevision !== null && (!Number.isSafeInteger(requestRevision) || Number(requestRevision) < 0))
    throw Error('INVALID_REQUEST_REVISION');
  if (!Number.isSafeInteger(responseRevision) || Number(responseRevision) < 0)
    throw Error('MISSING_RESPONSE_REVISION');
  if (mutation && responseRevision !== (requestRevision === null ? 0 : Number(requestRevision) + 1))
    throw Error('UNEXPECTED_RESPONSE_REVISION');
  return Number(responseRevision);
}

export const premiumSessionStorageKey = 'cuk-premium-consultation-v1';
/** Opaque identifier only. Authentication still requires the server's HttpOnly owner cookie. */
export function savedPremiumSession(value: unknown): string | null {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value) ? value : null;
}
