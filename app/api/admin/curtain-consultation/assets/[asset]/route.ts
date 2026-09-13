import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requireReviewAdmin } from "@/app/api/admin/reviews/_shared";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const identity = await requireReviewAdmin();
  if (identity.response) return identity.response;
  const { asset } = await params;
  if (!["consultation.css", "consultation.js"].includes(asset))
    return new Response(null, { status: 404 });
  return new Response(
    await readFile(resolve("lib/storefront/hci", asset), "utf8"),
    {
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        "Content-Type": asset.endsWith("css") ? "text/css" : "text/javascript",
      },
    },
  );
}
