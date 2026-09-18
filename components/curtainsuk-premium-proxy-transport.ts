const root = '/apps/curtainsuk-decision/';
const capabilityKey = 'cuk-premium-proxy-capability-v1';
let capability: string | null = null;

/** Shopify app proxies omit cookies, so the existing signed customer session travels as a bounded capability. */
export function premiumProxyEnabled() {
  return typeof window !== 'undefined' && Boolean((window as Window & { __CURTAINSUK_PREMIUM_PROXY__?: boolean }).__CURTAINSUK_PREMIUM_PROXY__);
}

export function premiumProxyPath(operation: string) {
  return `${root}${operation}`;
}

export async function premiumProxyCapability() {
  if (capability) return capability;
  try { capability = sessionStorage.getItem(capabilityKey); } catch { /* Private browsing may deny storage. */ }
  if (capability) return capability;
  const response = await fetch(premiumProxyPath('premium-session'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  if (!response.ok) throw Error('Your consultation is temporarily unavailable.');
  const value = await response.json();
  if (typeof value.capability !== 'string') throw Error('Your consultation is temporarily unavailable.');
  capability = value.capability;
  try { sessionStorage.setItem(capabilityKey, capability!); } catch { /* In-memory session remains usable. */ }
  return capability;
}
