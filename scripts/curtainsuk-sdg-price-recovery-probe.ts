import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";

const EXPECTED: Record<string, number> = {
  "DAPGPA203": 43.17,
  "F1740/03": 21.00,
  "F1325/03": 18.67,
  "F1681/03": 16.33,
  "F1069/34": 25.67,
};

async function main() {
  const session = new SdgPortalSession({
    email: process.env.SDG_TRADE_EMAIL ?? "",
    password: process.env.SDG_TRADE_PASSWORD ?? "",
  });
  await session.login();
  const token = await session.getBearerToken();
  const skus = Object.keys(EXPECTED);
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

  const rows = payload.map((item:any)=>({
    productCode: typeof item?.productCode === "string" ? item.productCode : null,
    productStockUnit: typeof item?.productStockUnit === "string" ? item.productStockUnit : null,
    unitPrice: typeof item?.unitPrice === "number" ? item.unitPrice : null,
    linePrice: typeof item?.linePrice === "number" ? item.linePrice : null,
  }));
  if (rows.length !== skus.length) throw new Error("SDG_PRICE_PROBE_COVERAGE_CHANGED");
  for (const sku of skus) {
    const row=rows.find((x)=>x.productCode===sku);
    if (!row || row.productStockUnit?.toLowerCase()!=="metre" || row.unitPrice===null || row.linePrice!==row.unitPrice) {
      throw new Error(`SDG_PRICE_PROBE_INVALID:${sku}`);
    }
    if (Math.round(row.unitPrice*100)!==Math.round(EXPECTED[sku]*100)) {
      throw new Error(`SDG_PRICE_PROBE_MISMATCH:${sku}:expected=${EXPECTED[sku]}:actual=${row.unitPrice}`);
    }
  }
  console.log(JSON.stringify({outcome:"SUCCEEDED",controls:rows}));
}
main().catch((e)=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"SDG_PRICE_PROBE_FAILED"}));process.exitCode=1;});
