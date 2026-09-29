import { verifyCustomerSession } from '../customer-hci-session';

type Environment = Record<string, string | undefined>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** Rehearsal allowlist, not another issuer or signing mechanism. Missing binding
 * is always closed; there is no implicit public mode when Naila is enabled. */
export function assertNailaRehearsalOwner(owner: string, sessionId: string, env: Environment = process.env) {
  // Explicit customer mode relaxes only the temporary rehearsal allowlist.
  // Callers still verify capability/Shopify signatures; HCI retains ownership checks.
  if (env.CURTAINSUK_NAILA_CUSTOMER_ACCESS_ENABLED === 'true') {
    if (env.CURTAINSUK_NAILA_ENABLED !== 'true' || !uuid.test(owner) || !uuid.test(sessionId))
      throw Error('HCI_DISABLED');
    return;
  }
  const allowedOwner = env.CURTAINSUK_NAILA_REHEARSAL_OWNER_ID;
  const allowedSession = env.CURTAINSUK_NAILA_REHEARSAL_SESSION_ID;
  if (env.CURTAINSUK_NAILA_ENABLED !== 'true' ||
    !allowedOwner || !uuid.test(allowedOwner) || !allowedSession || !uuid.test(allowedSession) ||
    owner !== allowedOwner || sessionId !== allowedSession) throw Error('HCI_DISABLED');
}

/** Same expiring signed capability used by the existing premium owner workflow. */
export function assertNailaRehearsalCapability(capability: string | undefined, sessionId: string | undefined,
  env: Environment = process.env) {
  let owner: string | null = null;
  try { owner = verifyCustomerSession(capability, env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ?? ''); }
  catch { /* Never expose configuration, token contents or signature failures. */ }
  if (!owner || !sessionId) throw Error('HCI_DISABLED');
  assertNailaRehearsalOwner(owner, sessionId, env);
  return owner;
}

/** GET proof travels in headers, never query strings, cookies or referrers. */
export function assertNailaRehearsalRequest(request: Request, env: Environment = process.env) {
  return assertNailaRehearsalCapability(
    request.headers.get('x-curtainsuk-naila-capability') ?? undefined,
    request.headers.get('x-curtainsuk-naila-session') ?? undefined,
    env,
  );
}
