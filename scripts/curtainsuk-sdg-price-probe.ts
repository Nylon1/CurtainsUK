import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";

const SKUS = ["DAPGPA203","F1069/34","F1325/03","F1681/03","F1740/03"];

function scalarPriceFields(value: unknown, path = "", depth = 0, out: Record<string, unknown> = {}) {
  if (depth > 5 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.slice(0, 5).forEach((item, index) => scalarPriceFields(item, `${path}[${index}]`, depth + 1, out));
    return out;
  }
  if (typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (/price|cost|trade|net|discount|currency|unit/i.test(key)
        && (typeof child === "string" || typeof child === "number" || typeof child === "boolean" || child === null)) {
      out[next] = child;
    }
    scalarPriceFields(child, next, depth + 1, out);
  }
  return out;
}

async function main() {
  const email = process.env.SDG_TRADE_EMAIL;
  const password = process.env.SDG_TRADE_PASSWORD;
  if (!email || !password) throw new Error("SDG_PROBE_CREDENTIALS_REQUIRED");
  const session = new SdgPortalSession({ email, password });
  await session.login();
  const token = await session.getBearerToken();
  const response = await fetch(SDG_PORTAL_DETAIL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      price: true,
      stock: false,
      options: false,
      productCriteria: SKUS.map(productCode => ({ productCode, orderUnit: "", orderQuantity: 1 })),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`SDG_PRICE_PROBE_HTTP_${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("SDG_PRICE_PROBE_SHAPE_CHANGED");
  const products = payload.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("SDG_PRICE_PROBE_PRODUCT_INVALID");
    const row = raw as Record<string, unknown>;
    return {
      productCode: row.productCode,
      topLevelKeys: Object.keys(row).sort(),
      priceFields: scalarPriceFields(row),
    };
  });
  console.log(JSON.stringify({ event: "SDG_PRICE_PROBE", session: session.stats, requested: SKUS, returned: products.length, products }));
}
void main();
