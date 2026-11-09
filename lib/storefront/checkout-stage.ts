export const CHECKOUT_STAGES = [
  'CHECKOUT_STARTED', 'CONTACT_SUBMITTED', 'ADDRESS_SUBMITTED',
  'SHIPPING_SUBMITTED', 'PAYMENT_SUBMITTED', 'CHECKOUT_COMPLETED',
] as const;
export type CheckoutStage = typeof CHECKOUT_STAGES[number];
export type CheckoutStageInput = { eventId: string; checkoutToken: string; stage: CheckoutStage;
  productMix: string; totalMinor: number | null; shippingMinor: number | null;
  hasDiscount: boolean; isTest: boolean };

const stages = new Set<string>(CHECKOUT_STAGES);
const mix = /^(OTHER|SAMPLE|CURTAIN(_ROMAN)?(_CUSHION)?(_TRACK)?|ROMAN(_CUSHION)?(_TRACK)?|CUSHION(_TRACK)?|TRACK)$/;
const keys = ['checkoutToken', 'eventId', 'hasDiscount', 'isTest', 'productMix', 'shippingMinor', 'stage', 'totalMinor'];
const money = (value: unknown) => value === null || (Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 100_000_000);

export function parseCheckoutStageInput(input: unknown): CheckoutStageInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('CHECKOUT_STAGE_INPUT_INVALID');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join(',') !== keys.join(',')
    || typeof value.eventId !== 'string' || !/^[\x21-\x7e]{8,160}$/.test(value.eventId)
    || typeof value.checkoutToken !== 'string' || !/^[\x21-\x7e]{8,256}$/.test(value.checkoutToken)
    || !stages.has(String(value.stage)) || typeof value.productMix !== 'string' || !mix.test(value.productMix)
    || !money(value.totalMinor) || !money(value.shippingMinor)
    || typeof value.hasDiscount !== 'boolean' || typeof value.isTest !== 'boolean') throw Error('CHECKOUT_STAGE_INPUT_INVALID');
  return value as CheckoutStageInput;
}

export type CheckoutStageRow = { checkout_hash: string; stage: CheckoutStage; product_mix: string;
  occurred_at: string; total_minor: number | null; shipping_minor: number | null; has_discount: boolean; is_test: boolean };

export function summarizeCheckoutStages(rows: CheckoutStageRow[], now = Date.now()) {
  const checkouts = new Map<string, { mix: string; stages: Set<CheckoutStage>; latest: CheckoutStage; at: number;
    first: number; shipping: number | null; discounted: boolean }>();
  for (const row of rows) {
    if (row.is_test) continue;
    const at = Date.parse(row.occurred_at);
    if (!Number.isFinite(at) || at > now) continue;
    const current = checkouts.get(row.checkout_hash);
    if (current) {
      current.stages.add(row.stage);
      if (at > current.at) { current.latest = row.stage; current.at = at; current.mix = row.product_mix;
        current.shipping = row.shipping_minor; current.discounted = row.has_discount; }
    } else checkouts.set(row.checkout_hash, { mix: row.product_mix, stages: new Set([row.stage]),
      latest: row.stage, at, first: at, shipping: row.shipping_minor, discounted: row.has_discount });
  }
  const result = new Map<string, { mix: string; checkouts: number; stages: Record<CheckoutStage, number>;
    lastObservedAfter24h: Partial<Record<CheckoutStage, number>> }>();
  for (const checkout of checkouts.values()) {
    let group = result.get(checkout.mix);
    if (!group) {
      group = { mix: checkout.mix, checkouts: 0,
        stages: Object.fromEntries(CHECKOUT_STAGES.map(stage => [stage, 0])) as Record<CheckoutStage, number>,
        lastObservedAfter24h: {} };
      result.set(checkout.mix, group);
    }
    group.checkouts++;
    for (const stage of checkout.stages) group.stages[stage]++;
    if (now - checkout.at >= 86_400_000 && !checkout.stages.has('CHECKOUT_COMPLETED'))
      group.lastObservedAfter24h[checkout.latest] = (group.lastObservedAfter24h[checkout.latest] ?? 0) + 1;
  }
  return [...result.values()].sort((a, b) => b.checkouts - a.checkouts || a.mix.localeCompare(b.mix));
}
