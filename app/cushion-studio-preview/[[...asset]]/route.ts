import { assertCushionPreviewRequest } from "@/lib/cushion-studio/server";
import { cushionPreviewAsset } from "@/lib/cushion-studio/preview-assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ asset?: string[] }> },
) {
  try {
    assertCushionPreviewRequest(request);
    return await cushionPreviewAsset(
      (await context.params).asset?.join("/") ?? "",
    );
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
