import {hotelAsset,hotelReviewCatalogue} from '@/lib/hotel-studio/server';
import {authenticateShopifyAppProxy} from '@/lib/storefront/security/shopify-app-proxy';
import {endpointRateLimitResponse} from '@/lib/storefront/security/endpoint-rate-limit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset?:string[]}>}) {
  try {
    await authenticateShopifyAppProxy({request,operation:'hotel-studio',rateLimit:{limit:180,windowSeconds:60}});
    if(process.env.CURTAINSUK_HOTEL_STUDIO_ENABLED!=='true')return new Response('Hotel Design Studio is not available yet.',{status:404});
    const asset=(await context.params).asset?.join('/')??'';
    return asset==='catalog'?hotelReviewCatalogue(request):hotelAsset(request,asset,false);
  } catch(error) {
    const limit=endpointRateLimitResponse(error);
    return new Response(limit?.message??'Request authentication failed.',{status:limit?.status??401,headers:{'Cache-Control':'no-store',...(limit?.headers??{})}});
  }
}
