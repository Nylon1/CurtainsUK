import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { safeOperationalDiagnostic } from '@/lib/storefront/customer-journey';

const SAFE_ROUTE = /^\/[a-z0-9/_\[\].-]{0,159}$/i;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

export async function recordOperationalError(input: {
  routePath: string; code: string; status?: number; source: 'UNHANDLED' | 'HANDLED'; cause?: unknown;
}) {
  const routePath = SAFE_ROUTE.test(input.routePath) ? input.routePath : '/unknown';
  const code = SAFE_CODE.test(input.code) ? input.code : 'SERVER_FAILURE';
  const release = /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA ?? '')
    ? process.env.VERCEL_GIT_COMMIT_SHA! : 'local';
  const requestId = randomUUID();
  console.error('CURTAINSUK_OPERATIONAL_ERROR', requestId, routePath, code, input.status ?? 500);
  try {
    const { error } = await createSupplierServiceClient().from('customer_operational_errors').insert({
      error_id: randomUUID(), request_id: requestId, route_path: routePath,
      code, status: input.status && input.status >= 500 && input.status <= 599 ? input.status : 500,
      release, source: input.source, diagnostic: safeOperationalDiagnostic(input.cause),
    });
    if (error) throw Error('OPERATIONAL_ERROR_PERSIST_FAILED');
  } catch { console.error('CURTAINSUK_OPERATIONAL_ERROR_PERSIST_FAILED', requestId); }
  return requestId;
}

/** Preserve the exact response while recording customer-safe 5xx context. */
export async function observeServiceResponse<T extends Response>(response: T, routePath: string, code: string): Promise<T> {
  if (response.status >= 500) await recordOperationalError({ routePath, code, status: response.status, source: 'HANDLED' });
  return response;
}
