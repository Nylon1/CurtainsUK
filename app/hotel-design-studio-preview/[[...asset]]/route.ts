import {hotelAsset,hotelPreviewAllowed,hotelReviewCatalogue} from '@/lib/hotel-studio/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset?:string[]}>}) {
  if(!hotelPreviewAllowed(request))return new Response('Not found',{status:404});
  const asset=(await context.params).asset?.join('/')??'';
  return asset==='catalog'?hotelReviewCatalogue(request):hotelAsset(request,asset,true);
}
