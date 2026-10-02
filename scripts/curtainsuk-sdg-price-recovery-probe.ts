import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";

function primitivePriceFields(value: unknown, path = "", out: Record<string, unknown> = {}) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    value.slice(0, 3).forEach((item, index) => primitivePriceFields(item, `${path}[${index}]`, out));
    return out;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (/price|cost|currency|unit/i.test(key) && (typeof child === "string" || typeof child === "number" || child === null)) out[next] = child;
    if (child && typeof child === "object") primitivePriceFields(child, next, out);
  }
  return out;
}

async function main() {
  const db = createSupplierServiceClient();
  const { data, error } = await db.from("fabric_colourways")
    .select("supplier_sku")
    .eq("supplier_id","sanderson-design-group")
    .eq("price_verification_status","VERIFIED")
    .neq("lifecycle_state","DISCONTINUED")
    .order("supplier_sku")
    .limit(5);
  if (error || !data?.length) throw new Error("SDG_PROBE_IDENTITIES_UNAVAILABLE");

  const session = new SdgPortalSession({
    email: process.env.SDG_TRADE_EMAIL ?? "",
    password: process.env.SDG_TRADE_PASSWORD ?? "",
  });
  await session.login();
  const token = await session.getBearerToken();
  const skus = data.map((x) => x.supplier_sku);
  const response = await fetch(SDG_PORTAL_DETAIL_URL, {
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      price:true,
      stock:false,
      options:false,
      productCriteria:skus.map((productCode)=>({productCode,orderUnit:"",orderQuantity:1})),
    }),
    cache:"no-store",
    signal:AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`SDG_PRICE_PROBE_HTTP_${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("SDG_PRICE_PROBE_SHAPE_CHANGED");
  const safe = payload.map((item:any)=>({
    productCode: typeof item?.productCode === "string" ? item.productCode : null,
    fields: primitivePriceFields(item),
  }));
  console.log(JSON.stringify({outcome:"SUCCEEDED",requested:skus,returned:safe.length,results:safe}));
}
main().catch((e)=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"SDG_PRICE_PROBE_FAILED"}));process.exitCode=1;});
