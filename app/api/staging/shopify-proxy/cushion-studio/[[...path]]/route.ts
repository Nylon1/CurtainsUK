import { handleHostedCushionRequest } from "@/lib/cushion-studio/hosted-server";
import { observeServiceResponse, recordOperationalError } from '@/lib/storefront/operational-error';
import { randomUUID } from 'node:crypto';
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  const path=(await context.params).path ?? [];
  const checkout=request.method==='POST'&&path[0]==='api'&&path[1]==='my-home-checkout';
  const requestId=checkout?randomUUID():null;
  const started=performance.now();
  if(requestId)console.info(JSON.stringify({event:'MY_HOME_CHECKOUT_TIMING',phase:'entered',requestId}));
  try {
    const response=await observeServiceResponse(await handleHostedCushionRequest(request,path),
      '/api/staging/shopify-proxy/cushion-studio', 'CUSHION_SERVICE_UNAVAILABLE');
    if(requestId){
      response.headers.set('X-CurtainsUK-Request-ID',requestId);
      response.headers.set('Server-Timing',`app;dur=${Math.round(performance.now()-started)}`);
      console.info(JSON.stringify({event:'MY_HOME_CHECKOUT_TIMING',phase:'completed',requestId,status:response.status,durationMs:Math.round(performance.now()-started)}));
    }
    return response;
  } catch (error) {
    const incidentId=await recordOperationalError({routePath:'/api/staging/shopify-proxy/cushion-studio',code:'CUSHION_UNHANDLED_FAILURE',source:'UNHANDLED',cause:error});
    if(requestId)console.error(JSON.stringify({event:'MY_HOME_CHECKOUT_TIMING',phase:'unhandled',requestId,incidentId,durationMs:Math.round(performance.now()-started)}));
    return Response.json({code:'CHECKOUT_UNAVAILABLE',message:'Your items are saved. Please try Order now again shortly.'},{status:503,headers:requestId?{'X-CurtainsUK-Request-ID':requestId}:{}});
  }
}
export { handle as GET, handle as POST };
