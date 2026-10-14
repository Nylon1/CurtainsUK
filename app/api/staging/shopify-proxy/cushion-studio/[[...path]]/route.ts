import { handleHostedCushionRequest } from "@/lib/cushion-studio/hosted-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  return handleHostedCushionRequest(request, (await context.params).path ?? []);
}
export { handle as GET, handle as POST };
