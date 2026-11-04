import {hangingAsset} from '@/lib/hanging-guide/server';
import {authenticateShopifyAppProxy} from '@/lib/storefront/security/shopify-app-proxy';
import {endpointRateLimitResponse} from '@/lib/storefront/security/endpoint-rate-limit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset?:string[]}>}){
 try{
  await authenticateShopifyAppProxy({request,operation:'hanging-guide',rateLimit:{limit:180,windowSeconds:60}});
  return hangingAsset(request,(await context.params).asset??[]);
 }catch(error){
  const limit=endpointRateLimitResponse(error);
  return new Response(limit?.message??'Request authentication failed.',{status:limit?.status??401,headers:{'Cache-Control':'no-store',...(limit?.headers??{})}});
 }
}
