export const SHOPIFY_PROXY_OPERATIONS = ["catalog", "price", "specialist-review", "review-request", "review-acceptance", "checkout-handoff", "sample-order", "consultation", "consultation-asset", "hci-session", "hci-command", "image-privacy"] as const;
export type ShopifyProxyOperation = typeof SHOPIFY_PROXY_OPERATIONS[number];

export function isShopifyProxyOperation(value: string): value is ShopifyProxyOperation {
  return SHOPIFY_PROXY_OPERATIONS.includes(value as ShopifyProxyOperation);
}

export const SHOPIFY_PROXY_OPERATION_POLICY: Record<ShopifyProxyOperation, {
  methods: readonly string[];
  maximumBytes: number;
  rateLimit: { limit: number; windowSeconds: number };
}> = {
  // Per signed-shop, operation and platform-forwarded client address. These
  // application limits sit behind the much more generous WAF log thresholds.
  catalog: { methods: ["GET"], maximumBytes: 0, rateLimit: { limit: 120, windowSeconds: 60 } },
  consultation: {methods:['GET'],maximumBytes:0,rateLimit:{limit:120,windowSeconds:60}},
  'consultation-asset': {methods:['GET'],maximumBytes:0,rateLimit:{limit:180,windowSeconds:60}},
  'image-privacy': {methods:['GET'],maximumBytes:0,rateLimit:{limit:120,windowSeconds:60}},
  'hci-session': {methods:['POST'],maximumBytes:2048,rateLimit:{limit:20,windowSeconds:900}},
  'hci-command': {methods:['POST'],maximumBytes:3_000_000,rateLimit:{limit:120,windowSeconds:60}},
  "sample-order": { methods: ["POST"], maximumBytes: 4096, rateLimit: { limit: 20, windowSeconds: 900 } },
  price: { methods: ["POST"], maximumBytes: 64 * 1024, rateLimit: { limit: 60, windowSeconds: 60 } },
  "specialist-review": { methods: ["POST"], maximumBytes: 64 * 1024, rateLimit: { limit: 30, windowSeconds: 60 } },
  "review-request": { methods: ["POST"], maximumBytes: 128_000, rateLimit: { limit: 6, windowSeconds: 3_600 } },
  "review-acceptance": { methods: ["POST"], maximumBytes: 8 * 1024, rateLimit: { limit: 20, windowSeconds: 900 } },
  "checkout-handoff": { methods: ["POST"], maximumBytes: 64 * 1024, rateLimit: { limit: 20, windowSeconds: 900 } },
};
