import { createHostedRuntime } from '../../../../lib/advisory/hosted-runtime.mjs';
import { observeServiceResponse } from '@/lib/storefront/operational-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
// Lazy resources: disabled/production requests perform no Auth or database I/O.
const trial=createHostedRuntime({env:process.env});
export const POST=async request=>observeServiceResponse(await trial.handle(request),'/api/advisory/consultation','ADVISOR_SERVICE_UNAVAILABLE');
