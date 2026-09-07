export const SHOPIFY_PROXY_OPERATIONS = ["catalog", "price", "specialist-review", "review-request", "checkout-handoff"] as const;
export type ShopifyProxyOperation = typeof SHOPIFY_PROXY_OPERATIONS[number];

export function isShopifyProxyOperation(value: string): value is ShopifyProxyOperation {
  return SHOPIFY_PROXY_OPERATIONS.includes(value as ShopifyProxyOperation);
}

export const SHOPIFY_PROXY_OPERATION_POLICY: Record<ShopifyProxyOperation, {
  methods: readonly string[];
  maximumBytes: number;
  limitPerWindow: number;
}> = {
  // The durable database limiter accepts at most 100 slots per hour.
  catalog: { methods: ["GET"], maximumBytes: 0, limitPerWindow: 100 },
  price: { methods: ["POST"], maximumBytes: 64 * 1024, limitPerWindow: 60 },
  "specialist-review": { methods: ["POST"], maximumBytes: 64 * 1024, limitPerWindow: 30 },
  "review-request": { methods: ["POST"], maximumBytes: 4_000_000, limitPerWindow: 10 },
  "checkout-handoff": { methods: ["POST"], maximumBytes: 64 * 1024, limitPerWindow: 20 },
};
