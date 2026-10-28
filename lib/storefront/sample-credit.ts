import { createHash, createHmac } from 'node:crypto';
import { SAMPLE_VARIANT_ID, verifySampleProperties } from './sample-order';
import { allocateVatFromGross, parseShopifyMoneyMinor, type ShopifyDraftOrderExecutionContract } from './shopify-draft-order-core';

export const SAMPLE_CREDIT_VERSION = 'sample-credit-v1';
export const SAMPLE_CREDIT_LIMIT = 10;
export const SAMPLE_CREDIT_COPY = 'We’ll deduct the cost of up to 10 purchased fabric samples from your made-to-measure curtain order.';
export type SampleCreditUnit = { lineId: string; ordinal: number; amountMinor: number };
export type SampleCreditGrant = { id: string; order_gid: string; code_hash: string; state: string; reservation_id: string | null };
export type SampleCreditQuote = {
  version: typeof SAMPLE_CREDIT_VERSION; reservationId: string; digest: string;
  amountMinor: number; sampleCount: number;
  grants: Array<{ id: string; units: SampleCreditUnit[] }>;
};

export function creditDigest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function sampleCreditCode(orderGid: string, secret: string) {
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid) || secret.length < 32) throw Error('SAMPLE_CREDIT_CONFIGURATION_REQUIRED');
  const value = createHmac('sha256', secret).update(`${SAMPLE_CREDIT_VERSION}:${orderGid}`).digest('hex').slice(0, 32).toUpperCase();
  return 'SC-' + value.match(/.{4}/g)!.join('-');
}
export function normalizeSampleCreditCodes(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 10 || value.some(c => typeof c !== 'string' || c.length > 60)) throw Error('SAMPLE_CREDIT_CODE_INVALID');
  const codes = value.map(c => c.toUpperCase().replace(/[\s-]/g, ''));
  if (codes.some(c => !/^SC[A-F0-9]{32}$/.test(c)) || new Set(codes).size !== codes.length) throw Error('SAMPLE_CREDIT_CODE_INVALID');
  return codes.sort();
}
export function sampleCreditCodeHash(code: string) { return creditDigest(normalizeSampleCreditCodes([code])[0]); }

type Money = { shopMoney: { amount: string; currencyCode: string } };
export type SampleCreditOrder = {
  id: string; name: string; email: string | null; test: boolean; cancelledAt: string | null;
  displayFinancialStatus: string; currencyCode: string; taxesIncluded: boolean;
  lineItems: { pageInfo: { hasNextPage: boolean }; nodes: Array<{
    id: string; quantity: number; currentQuantity: number; variant: { id: string } | null;
    originalUnitPriceSet: Money; discountAllocations: Array<{ allocatedAmountSet: Money }>;
    customAttributes: Array<{ key: string; value: string }>;
  }> };
};

/** Monetary refunds need staff review: quantity alone cannot establish the amount still paid. */
export function eligibleSampleUnits(order: SampleCreditOrder, secret: string, previouslyVerifiedLines?: ReadonlySet<string>): SampleCreditUnit[] {
  if (!order || order.test || order.cancelledAt || order.currencyCode !== 'GBP' || !order.taxesIncluded ||
      order.displayFinancialStatus !== 'PAID' || order.lineItems.pageInfo.hasNextPage)
    throw Error('SAMPLE_CREDIT_ORDER_INELIGIBLE');
  const units: SampleCreditUnit[] = [];
  for (const line of order.lineItems.nodes) {
    if (line.variant?.id !== `gid://shopify/ProductVariant/${SAMPLE_VARIANT_ID}`) continue;
    if(previouslyVerifiedLines && !previouslyVerifiedLines.has(line.id))continue;
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 250 ||
        !Number.isSafeInteger(line.currentQuantity) || line.currentQuantity < 0 || line.currentQuantity > line.quantity)
      throw Error('SAMPLE_CREDIT_ORDER_INELIGIBLE');
    const properties = Object.fromEntries(line.customAttributes.map(a => [a.key, a.value]));
    if (Object.keys(properties).length !== line.customAttributes.length) throw Error('SAMPLE_CREDIT_ORDER_INELIGIBLE');
    // Existing grants already proved these exact line identities at issuance. Newly added
    // order lines never become eligible through this path; webhook-secret rotation is safe.
    if(!previouslyVerifiedLines)verifySampleProperties(properties, secret);
    const price = line.originalUnitPriceSet.shopMoney;
    if (price.currencyCode !== 'GBP' || line.discountAllocations.some(d => d.allocatedAmountSet.shopMoney.currencyCode !== 'GBP'))
      throw Error('SAMPLE_CREDIT_ORDER_INELIGIBLE');
    const net = parseShopifyMoneyMinor(price.amount) * line.quantity - line.discountAllocations.reduce((n,d) => n + parseShopifyMoneyMinor(d.allocatedAmountSet.shopMoney.amount), 0);
    if (!Number.isSafeInteger(net) || net < 0) throw Error('SAMPLE_CREDIT_ORDER_INELIGIBLE');
    // Allocate pennies conservatively after a partial refund; never over-credit a unit.
    for (let i = 0; i < line.currentQuantity; i++) {
      const amountMinor = Math.floor(net / line.quantity) + (line.currentQuantity === line.quantity && i < net % line.quantity ? 1 : 0);
      if (amountMinor > 0) units.push({ lineId: line.id, ordinal: i, amountMinor });
    }
  }
  return units.sort((a,b) => b.amountMinor - a.amountMinor || a.lineId.localeCompare(b.lineId) || a.ordinal-b.ordinal).slice(0,SAMPLE_CREDIT_LIMIT);
}

export function quoteSampleCredit(baseReviewId: string, grants: Array<{id:string;units:SampleCreditUnit[]}>): SampleCreditQuote {
  if (!/^[a-f0-9]{64}$/.test(baseReviewId) || !grants.length || grants.length > 10 || new Set(grants.map(g=>g.id)).size !== grants.length || grants.some(g=>!g.units.length)) throw Error('SAMPLE_CREDIT_UNAVAILABLE');
  const sorted = [...grants].sort((a,b)=>a.id.localeCompare(b.id));
  const all = sorted.flatMap(g=>g.units.map(unit=>({id:g.id,unit}))).sort((a,b)=>b.unit.amountMinor-a.unit.amountMinor || a.id.localeCompare(b.id) || a.unit.lineId.localeCompare(b.unit.lineId) || a.unit.ordinal-b.unit.ordinal);
  const selected = all.slice(0,SAMPLE_CREDIT_LIMIT);
  const used = sorted.map(g=>({id:g.id,units:selected.filter(x=>x.id===g.id).map(x=>x.unit)})).filter(g=>g.units.length);
  // Do not consume a submitted code that contributes nothing to the deduction.
  if (used.length !== grants.length) throw Error('SAMPLE_CREDIT_TOO_MANY_CODES');
  const amountMinor=selected.reduce((n,x)=>n+x.unit.amountMinor,0), digest=creditDigest({version:SAMPLE_CREDIT_VERSION,grants:used});
  return {version:SAMPLE_CREDIT_VERSION,amountMinor,sampleCount:selected.length,grants:used,digest,reservationId:creditDigest({baseReviewId,digest})};
}

export function curtainCreditAllocation(amountMinor: number, grossLines: number[]) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || grossLines.some(n=>!Number.isSafeInteger(n)||n<0) || amountMinor > grossLines.reduce((n,p)=>n+p,0)) throw Error('SAMPLE_CREDIT_CURTAINS_REQUIRED');
  let remaining=amountMinor;
  const allocations=grossLines.map(gross=>{const discount=Math.min(gross,remaining);remaining-=discount;return discount;});
  const vatReduction=grossLines.reduce((n,gross,i)=>n+allocateVatFromGross(gross,2000)-allocateVatFromGross(gross-allocations[i],2000),0);
  return {allocations,vatReduction};
}

export function applySampleCredit<T extends ShopifyDraftOrderExecutionContract>(contract: T, quote: SampleCreditQuote): T {
  const existing=contract.input.customAttributes.find(a=>a.key==='curtainsuk_sample_credit_id');
  if(existing){if(existing.value!==quote.reservationId || contract.expected.discountAmountMinor!==quote.amountMinor)throw Error('SAMPLE_CREDIT_CHECKOUT_CONFLICT');return {...contract,input:{...contract.input,customAttributes:[...contract.input.customAttributes].sort((a,b)=>a.key.localeCompare(b.key))}};}
  const curtainLines=contract.input.lineItems.filter(l=>l.customAttributes.some(a=>a.key==='_curtainsuk_snapshot_id'));
  if(curtainLines.some(l=>l.quantity!==1 || l.appliedDiscount) || contract.expected.discountAmountMinor)throw Error('SAMPLE_CREDIT_CHECKOUT_CONFLICT');
  const {allocations,vatReduction}=curtainCreditAllocation(quote.amountMinor,curtainLines.map(l=>parseShopifyMoneyMinor(l.originalUnitPriceWithCurrency.amount)));
  let i=0;
  const fingerprint='fingerprint' in contract?creditDigest({original:contract.fingerprint,credit:quote.digest}):null;
  const tag=fingerprint?`sample-credit-${fingerprint}`:contract.idempotencyTag;
  return {...contract,sampleCreditQuote:quote,...(fingerprint?{fingerprint}:{}),idempotencyTag:tag,expected:{...contract.expected,discountAmountMinor:quote.amountMinor,
    goodsVatAmountMinor:contract.expected.goodsVatAmountMinor-vatReduction,
    orderGrossAmountMinor:contract.expected.orderGrossAmountMinor-quote.amountMinor,
    orderVatAmountMinor:contract.expected.orderVatAmountMinor-vatReduction},
    input:{...contract.input,tags:contract.input.tags.map(t=>t===contract.idempotencyTag?tag:t),customAttributes:[...contract.input.customAttributes.map(a=>fingerprint&&a.key==='curtainsuk_house_fingerprint'?{...a,value:fingerprint}:a),{key:'curtainsuk_sample_credit_id',value:quote.reservationId},{key:'Sample credit',value:`£${(quote.amountMinor/100).toFixed(2)} (${quote.sampleCount} ${quote.sampleCount===1?'sample':'samples'})`}].sort((a,b)=>a.key.localeCompare(b.key)),
      lineItems:contract.input.lineItems.map(line=>{
        if(!curtainLines.includes(line))return line;
        const discount=allocations[i++];
        return discount?{...line,appliedDiscount:{title:'Sample credit',description:'Credit for purchased fabric samples',value:discount/100,valueType:'FIXED_AMOUNT' as const}}:line;
      })}};
}

export function expectedLineDiscount(line: ShopifyDraftOrderExecutionContract['input']['lineItems'][number]) {
  return line.appliedDiscount ? Math.round(line.appliedDiscount.value * 100) : 0;
}
