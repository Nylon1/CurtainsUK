import {handleSmartTrack} from '@/lib/smart-track/server';
import {observeServiceResponse} from '@/lib/storefront/operational-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){return observeServiceResponse(await handleSmartTrack(request,(await context.params).path??[]),'/api/staging/shopify-proxy/smart-track','SMART_TRACK_SERVICE_UNAVAILABLE');}
export {handle as GET,handle as POST};
