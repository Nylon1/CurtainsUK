import { handleCushionApi } from "@/lib/cushion-studio/server";
import { observeServiceResponse } from '@/lib/storefront/operational-error';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string }> };
export async function GET(request: Request, context: Context) {
  return observeServiceResponse(await handleCushionApi(request, (await context.params).operation), '/api/cushion-studio/[operation]', 'CUSHION_STUDIO_UNAVAILABLE');
}
export async function POST(request: Request, context: Context) {
  return observeServiceResponse(await handleCushionApi(request, (await context.params).operation), '/api/cushion-studio/[operation]', 'CUSHION_STUDIO_UNAVAILABLE');
}
