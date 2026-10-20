import {createHostedRuntime} from '../../../../lib/advisory/hosted-runtime.mjs';
import {observeServiceResponse} from '@/lib/storefront/operational-error';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;

// The review UI never receives the preview key or a database/model credential.
// A short-lived, signed deployment grant is supplied by the operator and is
// still verified against the exact deployment, source and synthetic owners.
const trial=createHostedRuntime({env:process.env});
export const POST=async request=>{
  if(process.env.VERCEL_ENV!=='preview'||process.env.CURTAINSUK_ADVISORY_PREVIEW!=='true'||process.env.ADVISORY_REVIEW_CHAT!=='true')return new Response(null,{status:404});
  const headers=new Headers(request.headers);
  headers.set('x-advisory-preview-key',process.env.ADVISORY_PREVIEW_KEY??'');
  headers.delete('cookie');
  const forwarded=new Request(request.url,{method:'POST',headers,body:request.body,duplex:'half'});
  return observeServiceResponse(await trial.handle(forwarded),'/api/advisory/review-chat','ADVISOR_REVIEW_UNAVAILABLE');
};
