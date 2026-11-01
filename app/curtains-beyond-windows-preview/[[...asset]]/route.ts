import {beyondAsset,beyondCatalogue,beyondPreviewAllowed} from '@/lib/beyond-windows/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset?:string[]}>}){
  if(!beyondPreviewAllowed(request))return new Response('Not found',{status:404});
  const asset=(await context.params).asset?.join('/')??'';
  return asset==='catalog'?beyondCatalogue(request):beyondAsset(request,asset,true);
}
