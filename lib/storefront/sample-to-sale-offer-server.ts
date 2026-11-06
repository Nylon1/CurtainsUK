import 'server-only';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import { sampleCreditAdminRequest, shopifyDraftOrderConfigFromEnvironment, verifyCushionPaidDraftLink } from './shopify-draft-order-server';
import { calculateStackedOffer } from './sample-to-sale-offer';
import { hasBoughtCurtains, type CustomerOrder } from './sample-to-sale';
import { normalizePromotionCode, promotionCodeHash, quotePromotion, verifyPromotionCode, type PromotionQuote } from './sample-to-sale-code';
import type { ShopifyDraftOrderExecutionContract } from './shopify-draft-order-core';
import { parseShopifyMoneyMinor } from './shopify-draft-order-core';
import { creditDigest, expectedLineDiscount } from './sample-credit';
import { revalidateCreditUnits } from './sample-credit-server';

const CUSTOMER_ORDERS_QUERY = `query CurtainsUKPromotionCustomer($id: ID!) {
  customer(id: $id) { id numberOfOrders
    orders(first: 100, reverse: true) { pageInfo { hasNextPage }
      nodes { id test cancelledAt displayFinancialStatus tags
        lineItems(first: 100) { pageInfo { hasNextPage } nodes { title sku variant { id } } }
      }
    }
  }
}`;

type CustomerResponse = {customer: {numberOfOrders: string | number; orders: {pageInfo:{hasNextPage:boolean};nodes:CustomerOrder[]}} | null};
const db = () => createSupplierServiceClient();
const secret = () => process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET ?? '';

/** A personalised code requires the original Shopify customer to sign in. */
export async function previewPromotionCode(codeInput: unknown, baseReviewId: string, goodsMinor: number, loggedInCustomerId: string | null): Promise<PromotionQuote | null> {
  const code=normalizePromotionCode(codeInput);
  if (!code) return null;
  if (process.env.CURTAINSUK_SAMPLE_TO_SALE_ENABLED !== 'true' || secret().length<32) throw Error('SAMPLE_TO_SALE_UNAVAILABLE');
  if (!loggedInCustomerId || !/^\d+$/.test(loggedInCustomerId)) throw Error('SAMPLE_TO_SALE_SIGN_IN_REQUIRED');
  const hash=promotionCodeHash(code);
  const {data:offer,error}=await db().from('sample_to_sale_offers').select('id,customer_gid,code_hash,expires_at,state,reservation_id').eq('code_hash',hash).maybeSingle();
  if (error || !offer || !['AVAILABLE','RESERVED'].includes(offer.state) || Date.parse(offer.expires_at)<=Date.now()) throw Error('SAMPLE_TO_SALE_UNAVAILABLE');
  if (!verifyPromotionCode(code,offer.id,secret()) || offer.customer_gid!==`gid://shopify/Customer/${loggedInCustomerId}`) throw Error('SAMPLE_TO_SALE_UNAVAILABLE');
  const customer=await sampleCreditAdminRequest(CUSTOMER_ORDERS_QUERY,{id:offer.customer_gid}) as CustomerResponse;
  const orders=customer.customer?.orders.nodes;
  const count=Number(customer.customer?.numberOfOrders);
  if (!orders || customer.customer?.orders.pageInfo.hasNextPage || !Number.isSafeInteger(count) || count!==orders.length || orders.some(o=>o.lineItems.pageInfo.hasNextPage)) throw Error('SAMPLE_TO_SALE_HISTORY_REQUIRED');
  if (hasBoughtCurtains(orders,'') ) throw Error('SAMPLE_TO_SALE_FIRST_ORDER_ONLY');
  const calculation=calculateStackedOffer([{kind:'OTHER',grossMinor:goodsMinor}]);
  const quote=quotePromotion({offerId:offer.id,codeHash:hash,expiresAt:offer.expires_at,baseReviewId,amountMinor:calculation.promotionalSavingMinor});
  if (offer.reservation_id && offer.reservation_id!==quote.reservationId) throw Error('SAMPLE_TO_SALE_RESERVED');
  return quote;
}

export async function reservePromotionWithCredit(quote: PromotionQuote, contract: ShopifyDraftOrderExecutionContract) {
  if(contract.sampleCreditQuote)await revalidateCreditUnits(contract.sampleCreditQuote);
  const {error}=await db().rpc('reserve_sample_to_sale',{p_contract:contract});
  if(error)throw Error('SAMPLE_TO_SALE_RESERVED');
  return quote.reservationId;
}

/** A signed paid-order webhook verifies the exact invoice before consuming the offer. */
export async function settlePaidPromotion(payload: Record<string,unknown>) {
  const attrs=new Map(((payload.note_attributes??[]) as Array<{name:string;value:string}>).map(a=>[a.name,a.value]));
  const id=attrs.get('curtainsuk_sample_to_sale_id');
  if(!id)return;
  if(!/^[a-f0-9]{64}$/.test(id) || payload.financial_status!=='paid' || payload.test===true || payload.currency!=='GBP' || payload.taxes_included!==true) throw Error('SAMPLE_TO_SALE_PAID_INVALID');
  const {data:r,error}=await db().from('sample_to_sale_redemptions').select('contract,state,paid_order_gid,offer_id').eq('id',id).single();
  if(error || !r || r.state==='REVOKED') throw Error('SAMPLE_TO_SALE_PAID_INVALID');
  const contract=r.contract as ShopifyDraftOrderExecutionContract;
  const orderGid=String(payload.admin_graphql_api_id??`gid://shopify/Order/${payload.id}`);
  if(r.paid_order_gid && r.paid_order_gid!==orderGid)throw Error('SAMPLE_TO_SALE_REUSED');
  const shipping=(payload.total_shipping_price_set as {shop_money?:{amount?:unknown}})?.shop_money;
  if(parseShopifyMoneyMinor(payload.total_price)!==contract.expected.orderGrossAmountMinor
    || parseShopifyMoneyMinor(payload.total_tax)!==contract.expected.orderVatAmountMinor
    || parseShopifyMoneyMinor(payload.total_discounts)!==contract.expected.discountAmountMinor
    || parseShopifyMoneyMinor(shipping?.amount)!==contract.expected.shippingGrossAmountMinor)throw Error('SAMPLE_TO_SALE_PAID_AMOUNT_MISMATCH');
  const lines=payload.line_items as Array<{quantity:number;price:string;total_discount?:string;properties:Array<{name:string;value:string}>}>;
  const expected=new Map(contract.input.lineItems.map(l=>[creditDigest(l.customAttributes.map(a=>[a.key,a.value]).sort()),l]));
  if(!Array.isArray(lines)||lines.length!==expected.size)throw Error('SAMPLE_TO_SALE_PAID_LINES_MISMATCH');
  for(const line of lines){
    const key=creditDigest(line.properties.map(a=>[a.name,a.value]).sort());
    const source=expected.get(key);
    if(!source || line.quantity!==1 || parseShopifyMoneyMinor(line.price)!==parseShopifyMoneyMinor(source.originalUnitPriceWithCurrency.amount)
      || parseShopifyMoneyMinor(line.total_discount??'0')!==expectedLineDiscount(source))throw Error('SAMPLE_TO_SALE_PAID_LINES_MISMATCH');
    expected.delete(key);
  }
  const config=shopifyDraftOrderConfigFromEnvironment();
  if(!config)throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  await verifyCushionPaidDraftLink({contract,orderGid,config});
  if(r.state!=='REDEEMED'){
    const {data:offer,error:offerError}=await db().from('sample_to_sale_offers').select('customer_gid').eq('id',r.offer_id).single();
    if(offerError||!offer)throw Error('SAMPLE_TO_SALE_PAID_INVALID');
    const customer=await sampleCreditAdminRequest(CUSTOMER_ORDERS_QUERY,{id:offer.customer_gid}) as CustomerResponse;
    const orders=customer.customer?.orders.nodes;
    const count=Number(customer.customer?.numberOfOrders);
    if(!orders || customer.customer?.orders.pageInfo.hasNextPage || !Number.isSafeInteger(count) || count!==orders.length || orders.some(o=>o.lineItems.pageInfo.hasNextPage)) throw Error('SAMPLE_TO_SALE_HISTORY_REQUIRED');
    if(hasBoughtCurtains(orders,orderGid))throw Error('SAMPLE_TO_SALE_FIRST_ORDER_ONLY');
  }
  const result=await db().rpc('redeem_sample_to_sale',{p_id:id,p_order_gid:orderGid});
  if(result.error)throw Error('SAMPLE_TO_SALE_REDEMPTION_FAILED');
}
