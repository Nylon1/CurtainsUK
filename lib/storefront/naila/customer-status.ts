/** Only these authored messages can reach the consultation. Never show a raw
 * HTTP response, contract exception, database message or local fixture error. */
export class NailaConnectionError extends Error {
  constructor(readonly reason: 'unavailable' | 'changed' | 'connection' | 'blocked') { super(reason); }
}
export function responseFailure(status: number, code: unknown): NailaConnectionError {
  if(status === 404 || status === 410 || code === 'Unknown review session')return new NailaConnectionError('unavailable');
  if([400,403,422].includes(status))return new NailaConnectionError('blocked');
  return new NailaConnectionError(status === 409 ? 'changed' : 'connection');
}
export function customerFailure(error: unknown, hasSavedSession: boolean) {
  const unavailable=error instanceof NailaConnectionError && error.reason==='unavailable';
  const blocked=error instanceof NailaConnectionError && error.reason==='blocked';
  return {
    retry: !unavailable && !blocked,
    restart: unavailable && hasSavedSession,
    message: unavailable
      ? 'I couldn’t reopen your saved consultation. You can begin a new one whenever you’re ready.'
      : blocked ? 'I can’t continue the consultation just now. You can still explore the fabrics yourself.'
      : error instanceof NailaConnectionError && error.reason==='changed'
        ? 'Your choices have been updated in another window. Let’s pick up from your saved place.'
        : `I’m having trouble connecting just now. Please try again in a moment.${hasSavedSession ? ' Your saved choices are still there.' : ''}`,
  };
}
