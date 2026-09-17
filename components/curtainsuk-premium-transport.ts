/** The existing gateway commits exactly one CAS revision per successful command.
 * Its public projection currently omits revision. Retain the acknowledged revision
 * from the exact request, including retries, rather than using stale React state.
 * Never advance after a failed request or override a conflicting server revision.
 */
export function acknowledgedPremiumRevision(requestRevision: unknown, responseRevision: unknown): number {
  if (requestRevision !== null && (!Number.isSafeInteger(requestRevision) || Number(requestRevision) < 0))
    throw Error('INVALID_REQUEST_REVISION');
  const expected = requestRevision === null ? 0 : Number(requestRevision) + 1;
  if (responseRevision !== undefined && responseRevision !== expected)
    throw Error('UNEXPECTED_RESPONSE_REVISION');
  return expected;
}
