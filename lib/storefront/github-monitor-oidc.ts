import 'server-only';
import { createPublicKey, verify } from 'node:crypto';

const issuer = 'https://token.actions.githubusercontent.com';
const audience = 'curtainsuk:journey-health:v1';
const workflow = 'Nylon1/CurtainsUK/.github/workflows/customer-journey-monitor.yml@refs/heads/main';
const repositoryId = '1370547545';

function decode(segment: string): Record<string, unknown> {
  const value = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('MONITOR_AUTH_INVALID');
  return value;
}

export async function verifyGithubMonitorToken(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) throw Error('MONITOR_AUTH_INVALID');
  const token = authorization.slice(7);
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some(segment => !/^[A-Za-z0-9_-]+$/.test(segment)))
    throw Error('MONITOR_AUTH_INVALID');
  const [encodedHeader, encodedClaims, encodedSignature] = segments;
  const header = decode(encodedHeader);
  const claims = decode(encodedClaims);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(header.kid))
    throw Error('MONITOR_AUTH_INVALID');
  const configurationResponse = await fetch(`${issuer}/.well-known/openid-configuration`,
    { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
  if (!configurationResponse.ok) throw Error('MONITOR_AUTH_UNAVAILABLE');
  const configuration = await configurationResponse.json();
  if (configuration.issuer !== issuer || configuration.jwks_uri !== `${issuer}/.well-known/jwks`)
    throw Error('MONITOR_AUTH_UNAVAILABLE');
  const keysResponse = await fetch(configuration.jwks_uri,
    { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
  if (!keysResponse.ok) throw Error('MONITOR_AUTH_UNAVAILABLE');
  const keys = await keysResponse.json();
  const jwk = Array.isArray(keys.keys) ? keys.keys.find((key: Record<string, unknown>) =>
    key.kid === header.kid && key.kty === 'RSA' && key.use === 'sig') : null;
  if (!jwk || !verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedClaims}`),
    createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(encodedSignature, 'base64url')))
    throw Error('MONITOR_AUTH_INVALID');
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== issuer || claims.aud !== audience
    || claims.repository !== 'Nylon1/CurtainsUK' || String(claims.repository_id) !== repositoryId
    || claims.workflow_ref !== workflow || claims.ref !== 'refs/heads/main'
    || !['schedule', 'workflow_dispatch'].includes(String(claims.event_name))
    || typeof claims.sha !== 'string' || !/^[a-f0-9]{40}$/.test(claims.sha)
    || !Number.isInteger(Number(claims.run_id)) || Number(claims.run_id) < 1
    || !Number.isInteger(Number(claims.run_attempt)) || Number(claims.run_attempt) < 1
    || typeof claims.exp !== 'number' || claims.exp <= now
    || typeof claims.iat !== 'number' || claims.iat > now + 60 || now - claims.iat > 600)
    throw Error('MONITOR_AUTH_INVALID');
  return { runId: Number(claims.run_id), attempt: Number(claims.run_attempt), sha: claims.sha };
}
