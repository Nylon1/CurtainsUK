import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import { sampleCreditAdminRequest, shopifyDraftOrderConfigFromEnvironment, verifyCushionPaidDraftLink } from './shopify-draft-order-server';
import { creditDigest, eligibleSampleUnits, normalizeSampleCreditCodes, quoteSampleCredit, sampleCreditCode, sampleCreditCodeHash, type SampleCreditGrant, type SampleCreditOrder, type SampleCreditQuote } from './sample-credit';
import { parseShopifyMoneyMinor, type ShopifyDraftOrderExecutionContract } from './shopify-draft-order-core';
import { expectedLineDiscount } from './sample-credit';
import { recordOperationalError } from './operational-error';

export const SAMPLE_CREDIT_ORDER_QUERY=`query CurtainsUKSampleCreditOrder($id: ID!) {
  order(id: $id) {
    id name email test cancelledAt displayFinancialStatus currencyCode taxesIncluded
    lineItems(first: 250) {
      pageInfo { hasNextPage }
      nodes { id quantity currentQuantity variant { id }
        customAttributes { key value }
        originalUnitPriceSet { shopMoney { amount currencyCode } }
        discountAllocations { allocatedAmountSet { shopMoney { amount currencyCode } } }
      }
    }
  }
}`;
const secret=()=>process.env.CURTAINSUK_SHOPIFY_APP_SECRET ?? '';
// Independent, permanent key: rotating Shopify webhook credentials must not change issued codes.
const codeSecret=()=>process.env.CURTAINSUK_SAMPLE_CREDIT_SECRET ?? '';
const db=()=>createSupplierServiceClient();
export async function readSampleCreditOrder(orderGid:string) {
  if(!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid))throw Error('SAMPLE_CREDIT_ORDER_INELIGIBLE');
  const result=await sampleCreditAdminRequest(SAMPLE_CREDIT_ORDER_QUERY,{id:orderGid});
  if(!result.order)throw Error('SAMPLE_CREDIT_ORDER_UNAVAILABLE');
  return result.order as SampleCreditOrder;
}

export async function previewSampleCredit(codes:unknown,baseReviewId:string) {
  const normalized=normalizeSampleCreditCodes(codes);
  if(!normalized.length)return null;
  const hashes=normalized.map(sampleCreditCodeHash);
  const {data,error}=await db().from('sample_credit_grants').select('id,order_gid,code_hash,state,reservation_id,units').in('code_hash',hashes);
  if(error)throw Error('SAMPLE_CREDIT_SERVICE_UNAVAILABLE');
  const grants=(data??[]) as Array<SampleCreditGrant&{units:Array<{lineId:string}>}>;
  if(grants.length!==hashes.length || grants.some(g=>!['AVAILABLE','RESERVED'].includes(g.state)))throw Error('SAMPLE_CREDIT_UNAVAILABLE');
  const current=await Promise.all(grants.map(async g=>({id:g.id,units:eligibleSampleUnits(await readSampleCreditOrder(g.order_gid),secret(),new Set(g.units.map(u=>u.lineId)))})));
  const quote=quoteSampleCredit(baseReviewId,current);
  if(grants.some(g=>g.reservation_id && g.reservation_id!==quote.reservationId))throw Error('SAMPLE_CREDIT_CHECKOUT_RESERVED');
  return quote;
}

export async function reserveSampleCredit(quote:SampleCreditQuote,contract:ShopifyDraftOrderExecutionContract) {
  await revalidateCreditUnits(quote);
  const {error}=await db().rpc('reserve_sample_credit',{p_quote:quote,p_contract:contract});
  if(error)throw Error('SAMPLE_CREDIT_CHECKOUT_RESERVED');
}

/** Exactly one durable grant per real paid Shopify order, even on webhook retries. */
export async function issueSampleCredit(orderGid:string) {
  const previous=await db().from('sample_credit_grants').select('id').eq('order_gid',orderGid).maybeSingle();
  if(previous.error)throw Error('SAMPLE_CREDIT_ISSUE_FAILED');
  if(previous.data){await sendSampleCreditEmail(previous.data.id);return;}
  const order=await readSampleCreditOrder(orderGid);
  if(order.test || order.cancelledAt || order.displayFinancialStatus!=='PAID')return;
  const units=eligibleSampleUnits(order,secret());
  if(!units.length)return;
  const code=sampleCreditCode(orderGid,codeSecret());
  const email=order.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email) ? order.email : null;
  const {error}=await db().from('sample_credit_grants').upsert({order_gid:order.id,order_name:order.name,code_hash:sampleCreditCodeHash(code),units,email,email_state:email?'PENDING':'NO_EMAIL'},{onConflict:'order_gid',ignoreDuplicates:true});
  if(error)throw Error('SAMPLE_CREDIT_ISSUE_FAILED');
  const {data,error:readError}=await db().from('sample_credit_grants').select('id').eq('order_gid',orderGid).single();
  if(readError || !data)throw Error('SAMPLE_CREDIT_ISSUE_FAILED');
  await sendSampleCreditEmail(data.id);
}

const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function sampleCreditEmail(input:{orderName:string;code:string;amountMinor:number;sampleCount:number}) {
  const amount=`£${(input.amountMinor/100).toFixed(2)}`;
  const text=`Thank you for your sample order ${input.orderName}.\n\nYour sample credit: ${amount}\nYour code: ${input.code}\n\nWhen you are ready to order made-to-measure curtains, enter this code in Design My Home before continuing to payment. Your total will show the deduction.\n\nCredit covers the amount paid for up to 10 sample products, including fabrics you do not choose for your curtains. Codes can be combined for a maximum of 10 samples per curtain order. Each code can be redeemed once. Delivery charges are not credited. Refunded and cancelled samples are not eligible. Keep your code private.\n\nBuild your curtain order: https://www.curtainsuk.com/pages/build-my-rooms\nNeed help? enquiries@curtainsuk.com`;
  const html=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your CurtainsUK sample credit</title></head><body style="margin:0;background:#f7f5ee;color:#193e32;font:16px/1.6 Arial,sans-serif"><table role="presentation" style="width:100%;max-width:600px;margin:auto;padding:32px 24px"><tr><td><p style="font-size:22px;font-family:Georgia,serif">CurtainsUK</p><h1 style="font:32px/1.2 Georgia,serif">Your samples. Your next step.</h1><p>Thank you for sample order ${escapeHtml(input.orderName)}. You have <strong>${amount}</strong> in sample credit towards your made-to-measure curtains.</p><p style="font-size:13px;text-transform:uppercase;letter-spacing:2px">Your private credit code</p><p style="padding:20px;background:#fff;border:1px solid #d6dccc;border-radius:12px;font:18px/1.7 monospace;overflow-wrap:anywhere">${escapeHtml(input.code)}</p><p>Enter your code in Design My Home before payment. You’ll see your sample credit deducted from your total.</p><p><a href="https://www.curtainsuk.com/pages/build-my-rooms" style="display:inline-block;padding:14px 22px;background:#193e32;color:white;border-radius:8px;text-decoration:none">Make your curtains</a></p><p style="font-size:14px">Credit covers up to 10 purchased samples, including fabrics you don’t choose for your curtains. Combine codes for a maximum of 10 samples per curtain order. Each code is redeemable once. Delivery, cancelled and refunded samples are excluded.</p><p style="font-size:14px">Keep this code private. Need help? <a href="mailto:enquiries@curtainsuk.com">Contact CurtainsUK</a>.</p></td></tr></table></body></html>`;
  return {subject:`Your CurtainsUK sample credit | ${input.orderName}`,text,html};
}

export async function sendSampleCreditEmail(id:string) {
  const {data:claimed,error}=await db().rpc('claim_sample_credit_email',{p_id:id});
  if(error)throw Error('SAMPLE_CREDIT_EMAIL_CLAIM_FAILED');
  if(!claimed)return;
  try {
    const {data:g,error:readError}=await db().from('sample_credit_grants').select('order_gid,order_name,email,units').eq('id',id).single();
    if(readError || !g?.email)throw Error('SAMPLE_CREDIT_EMAIL_UNAVAILABLE');
    const from=process.env.CURTAINSUK_SAMPLE_CREDIT_FROM ?? process.env.CURTAINSUK_VISIT_ALERT_FROM;
    if(!from || !process.env.RESEND_API_KEY)throw Error('SAMPLE_CREDIT_EMAIL_CONFIGURATION_REQUIRED');
    const units=g.units as Array<{amountMinor:number}>;
    const result=await new Resend(process.env.RESEND_API_KEY).emails.send({from,to:[g.email],replyTo:'enquiries@curtainsuk.com',...sampleCreditEmail({orderName:g.order_name,code:sampleCreditCode(g.order_gid,codeSecret()),amountMinor:units.reduce((n,u)=>n+u.amountMinor,0),sampleCount:units.length})},{idempotencyKey:`curtainsuk-sample-credit/${id}`});
    if(result.error || !result.data?.id)throw Error('SAMPLE_CREDIT_EMAIL_SEND_FAILED');
    const receipt=await db().from('sample_credit_grants').update({email_state:'SENT',email_provider_id:result.data.id,updated_at:new Date().toISOString()}).eq('id',id).eq('email_state','SENDING');
    if(receipt.error)throw Error('SAMPLE_CREDIT_EMAIL_RECEIPT_FAILED');
  } catch {
    await db().from('sample_credit_grants').update({email_state:'FAILED',updated_at:new Date().toISOString()}).eq('id',id).eq('email_state','SENDING');
    await recordOperationalError({routePath:'/api/webhooks/shopify/orders-paid',code:'SAMPLE_CREDIT_EMAIL_FAILED',source:'HANDLED'});
    // The paid order/grant is durable. The existing scheduler retries this outbox.
  }
}
export async function retrySampleCreditEmails() {
  const {data,error}=await db().from('sample_credit_grants').select('id').in('email_state',['PENDING','FAILED','SENDING']).order('issued_at').limit(20);
  if(error)throw Error('SAMPLE_CREDIT_EMAIL_QUEUE_UNAVAILABLE');
  for(const grant of data??[])await sendSampleCreditEmail(grant.id);
}

/** Recheck the original paid purchases both before invoice creation and before fulfilment. */
async function revalidateCreditUnits(quote:SampleCreditQuote) {
  const {data,error}=await db().from('sample_credit_grants').select('id,order_gid,units').in('id',quote.grants.map(g=>g.id));
  if(error || data?.length!==quote.grants.length)throw Error('SAMPLE_CREDIT_SOURCE_REVIEW_REQUIRED');
  for(const grant of data){
    const current=eligibleSampleUnits(await readSampleCreditOrder(grant.order_gid),secret(),new Set((grant.units as Array<{lineId:string}>).map(u=>u.lineId)));
    const selected=quote.grants.find(g=>g.id===grant.id)!.units;
    if(selected.some(u=>!current.some(c=>c.lineId===u.lineId&&c.ordinal===u.ordinal&&c.amountMinor===u.amountMinor)))throw Error('SAMPLE_CREDIT_SOURCE_REVIEW_REQUIRED');
  }
}

/** Staff-only caller must authorise before invoking. The code is never put in a URL or log. */
export async function sampleCreditPackingSlip(orderGid:string) {
  const {data:g,error}=await db().from('sample_credit_grants').select('order_gid,order_name,code_hash,units,state,email_state').eq('order_gid',orderGid).maybeSingle();
  if(error)throw Error('SAMPLE_CREDIT_SERVICE_UNAVAILABLE');
  if(!g)return null;
  const code=sampleCreditCode(g.order_gid,codeSecret());
  if(sampleCreditCodeHash(code)!==g.code_hash)throw Error('SAMPLE_CREDIT_CONFIGURATION_REQUIRED');
  return {...g,code,amountMinor:(g.units as Array<{amountMinor:number}>).reduce((n,u)=>n+u.amountMinor,0)};
}

/** Check the paid total AND the server-created draft before consuming bearer credit. */
export async function settlePaidSampleCredit(payload:Record<string,unknown>) {
  const attrs=new Map(((payload.note_attributes??[]) as Array<{name:string;value:string}>).map(a=>[a.name,a.value]));
  const id=attrs.get('curtainsuk_sample_credit_id');
  if(!id)return;
  if(!/^[a-f0-9]{64}$/.test(id) || payload.financial_status!=='paid' || payload.test===true || payload.currency!=='GBP' || payload.taxes_included!==true)throw Error('SAMPLE_CREDIT_PAID_INVALID');
  const {data:r,error}=await db().from('sample_credit_redemptions').select('contract,state,paid_order_gid').eq('id',id).single();
  if(error || !r || r.state==='REVOKED')throw Error('SAMPLE_CREDIT_PAID_INVALID');
  const c=r.contract as ShopifyDraftOrderExecutionContract;
  const orderGid=String(payload.admin_graphql_api_id??`gid://shopify/Order/${payload.id}`);
  if(r.paid_order_gid && r.paid_order_gid!==orderGid)throw Error('SAMPLE_CREDIT_REUSED');
  const shipping=(payload.total_shipping_price_set as {shop_money?:{amount?:unknown}})?.shop_money;
  if(parseShopifyMoneyMinor(payload.total_price)!==c.expected.orderGrossAmountMinor || parseShopifyMoneyMinor(payload.total_tax)!==c.expected.orderVatAmountMinor || parseShopifyMoneyMinor(payload.total_discounts)!==c.expected.discountAmountMinor || parseShopifyMoneyMinor(shipping?.amount)!==c.expected.shippingGrossAmountMinor)throw Error('SAMPLE_CREDIT_PAID_AMOUNT_MISMATCH');
  const lines=payload.line_items as Array<{quantity:number;price:string;total_discount?:string;properties:Array<{name:string;value:string}>}>;
  const expected=new Map(c.input.lineItems.map(l=>[creditDigest(l.customAttributes.map(a=>[a.key,a.value]).sort()),l]));
  if(!Array.isArray(lines) || lines.length!==expected.size)throw Error('SAMPLE_CREDIT_PAID_LINES_MISMATCH');
  for(const line of lines){
    const key=creditDigest(line.properties.map(a=>[a.name,a.value]).sort());
    const source=expected.get(key);
    if(!source || line.quantity!==1 || parseShopifyMoneyMinor(line.price)!==parseShopifyMoneyMinor(source.originalUnitPriceWithCurrency.amount) || parseShopifyMoneyMinor(line.total_discount??'0')!==expectedLineDiscount(source))throw Error('SAMPLE_CREDIT_PAID_LINES_MISMATCH');
    expected.delete(key);
  }
  const config=shopifyDraftOrderConfigFromEnvironment();
  if(!config)throw Error('SAMPLE_CREDIT_CONFIGURATION_REQUIRED');
  await verifyCushionPaidDraftLink({contract:c,orderGid,config});
  // A refund after invoice creation requires staff review; never release an invalid discounted order.
  // A previously settled event remains idempotent even if the original sample order is later refunded.
  if(r.state!=='REDEEMED')await revalidateCreditUnits(c.sampleCreditQuote!);
  const result=await db().rpc('redeem_sample_credit',{p_id:id,p_order_gid:orderGid});
  if(result.error)throw Error('SAMPLE_CREDIT_REDEMPTION_FAILED');
}
