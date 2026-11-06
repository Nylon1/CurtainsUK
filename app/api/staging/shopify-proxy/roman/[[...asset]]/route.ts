import {romanHostedRequest} from '@/lib/roman-blind/hosted';
import {authenticateShopifyAppProxy} from '@/lib/storefront/security/shopify-app-proxy';
import {endpointRateLimitResponse} from '@/lib/storefront/security/endpoint-rate-limit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{asset?:string[]}>}){
 try{
  await authenticateShopifyAppProxy({request,operation:'roman-blinds',rateLimit:{limit:180,windowSeconds:60}});
  return romanHostedRequest(request,(await context.params).asset??[]);
 }catch(error){
  const limit=endpointRateLimitResponse(error);
  return new Response(limit?.message??'Request authentication failed.',{status:limit?.status??401,headers:{'Cache-Control':'no-store',...(limit?.headers??{})}});
 }
}
export const GET=handle;
export const POST=handle;
