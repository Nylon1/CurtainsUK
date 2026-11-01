import {beyondAsset,beyondCatalogue} from '@/lib/beyond-windows/server';
import {authenticateShopifyAppProxy} from '@/lib/storefront/security/shopify-app-proxy';
import {endpointRateLimitResponse} from '@/lib/storefront/security/endpoint-rate-limit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset?:string[]}>}){
  try{
    await authenticateShopifyAppProxy({request,operation:'beyond-windows',rateLimit:{limit:180,windowSeconds:60}});
    const asset=(await context.params).asset?.join('/')??'';
    return asset==='catalog'?beyondCatalogue(request):beyondAsset(request,asset,false);
  }catch(error){const limit=endpointRateLimitResponse(error);return new Response(limit?.message??'Request authentication failed.',{status:limit?.status??401,headers:{'Cache-Control':'no-store',...(limit?.headers??{})}});}
}
