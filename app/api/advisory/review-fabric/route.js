import {createFabricDetailReader,requireFabricIdentity} from '../../../../lib/advisory/fabric-detail-handoff.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
export async function GET(request){
  if(process.env.VERCEL_ENV!=='preview'||process.env.CURTAINSUK_ADVISORY_PREVIEW!=='true'||process.env.ADVISORY_REVIEW_CHAT!=='true')return new Response(null,{status:404});
  try{
    const url=new URL(request.url);
    if(url.searchParams.getAll('fabric').length!==1)return Response.json({error:'INVALID_FABRIC_REFERENCE'},{status:400,headers});
    const fabric=await createFabricDetailReader().read(requireFabricIdentity(url.searchParams.get('fabric')));
    return Response.json({fabric},{headers});
  }catch(error){return Response.json({error:'FABRIC_REFERENCE_UNAVAILABLE'},{status:error?.status===400?400:error?.status===404?404:503,headers});}
}
