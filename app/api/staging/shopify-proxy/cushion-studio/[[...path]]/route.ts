import { handleHostedCushionRequest } from "@/lib/cushion-studio/hosted-server";
import { observeServiceResponse } from '@/lib/storefront/operational-error';
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  return observeServiceResponse(await handleHostedCushionRequest(request, (await context.params).path ?? []),
    '/api/staging/shopify-proxy/cushion-studio', 'CUSHION_SERVICE_UNAVAILABLE');
}
export { handle as GET, handle as POST };
