import 'server-only';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { issueCustomerSession, verifyCustomerSession } from './customer-hci-session';
import { premiumHciCommand, premiumHciEnabled, premiumHciIntegration } from './hci-premium-integration';
import { consumeEndpointRateLimit } from './security/endpoint-rate-limit';
import { PRIVATE_NO_STORE_HEADERS } from './security/http';

const assetDirectory = resolve('lib/storefront/hci/premium');
const secret = () => process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ?? '';

export function premiumProxyPage() {
  if (!premiumHciEnabled()) return new Response(null, { status: 404 });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Fabric Intelligence | CurtainsUK</title><link rel="stylesheet" href="/apps/curtainsuk-decision/premium-asset?name=premium.css"></head><body><div id="curtainsuk-premium-root"></div><script>window.__CURTAINSUK_PREMIUM_PROXY__=true</script><script src="/apps/curtainsuk-decision/premium-asset?name=premium.js" defer></script></body></html>`;
  return new Response(html, { headers: { ...PRIVATE_NO_STORE_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });
}

export async function premiumProxyAsset(name: string) {
  if (!premiumHciEnabled()) return new Response(null, { status: 404 });
  const visual = /^[a-zA-Z0-9_-]+\.svg$/.test(name);
  if (!visual && !['premium.js', 'premium.css', 'living-room.jpg'].includes(name)) return new Response(null, { status: 404 });
  try {
    const path = visual ? resolve('lib/storefront/hci/visuals', name) : resolve(assetDirectory, name);
    const body = await readFile(path);
    return new Response(body, { headers: { ...PRIVATE_NO_STORE_HEADERS, 'Content-Type': visual ? 'image/svg+xml' : name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'image/jpeg', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 404 }); }
}

export function premiumProxySession() {
  if (!premiumHciEnabled()) throw Error('HCI_DISABLED');
  return { capability: issueCustomerSession(secret()).token };
}

export async function premiumProxyCommand(input: { capability?: string; command?: unknown }) {
  if (!premiumHciEnabled()) throw Error('HCI_DISABLED');
  const owner = verifyCustomerSession(input.capability, secret());
  if (!owner) throw Error('HCI_SESSION_REQUIRED');
  const command = premiumHciCommand(input.command);
  await consumeEndpointRateLimit(createHash('sha256').update(`cuk-premium-proxy-owner:${owner}`).digest('hex'), { limit: 60, windowSeconds: 60 });
  // The guarded RPC store rejects a different owner when resuming a session.
  void command;
  return premiumHciIntegration(owner, input.command);
}
