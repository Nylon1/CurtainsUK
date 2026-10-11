import { createHostedRuntime } from '../../../../lib/advisory/hosted-runtime.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
// Lazy resources: disabled/production requests perform no Auth or database I/O.
const trial=createHostedRuntime({env:process.env});
export const POST=request=>trial.handle(request);
