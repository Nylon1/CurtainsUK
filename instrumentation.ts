import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (_error, _request, context) => {
  // Route templates avoid accidentally recording customer IDs or URL queries.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { recordOperationalError } = await import('@/lib/storefront/operational-error');
  await recordOperationalError({ routePath: context.routePath, code: 'UNHANDLED_SERVER_ERROR',
    status: 500, source: 'UNHANDLED' });
};
