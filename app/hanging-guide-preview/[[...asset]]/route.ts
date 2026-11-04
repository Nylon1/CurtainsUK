import {hangingAsset,hangingPreviewAllowed} from '@/lib/hanging-guide/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset?:string[]}>}){
 if(!hangingPreviewAllowed(request))return new Response('Not found',{status:404});
 return hangingAsset(request,(await context.params).asset??[]);
}
