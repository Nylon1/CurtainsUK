import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requireReviewAdmin } from "@/app/api/admin/reviews/_shared";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const identity = await requireReviewAdmin();
  if (identity.response) return identity.response;
  const html = await readFile(
    resolve("lib/storefront/hci/consultation.html"),
    "utf8",
  );
  return new Response(
    html
      .replaceAll("/hci-assets/", "/api/admin/curtain-consultation/assets/")
      .replace(
        'href="/"',
        'href="https://www.curtainsuk.com/?preview_theme_id=182264234363"',
      )
      .replace(
        'href="/pages/fabric-library"',
        'href="https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363"',
      ),
    {
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}
