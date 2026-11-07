import 'server-only';
import { sampleCreditAdminRequest } from './shopify-draft-order-server';
import { randomUUID } from 'node:crypto';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import { promotionCode, promotionCodeHash } from './sample-to-sale-code';
import { isSampleOrder, planSampleToSale, type CustomerOrder, type PilotCandidate, type PilotOrder } from './sample-to-sale';

const ORDERS_QUERY = `query CurtainsUKSampleToSaleOrders {
  orders(first: 50, reverse: true, sortKey: CREATED_AT) {
    pageInfo { hasNextPage }
    nodes {
      id name test cancelledAt displayFinancialStatus
      customer { id firstName tags defaultEmailAddress { emailAddress marketingState } }
      lineItems(first: 50) { pageInfo { hasNextPage } nodes { title quantity variant { id } customAttributes { key value } } }
      fulfillments { events(first: 20) { pageInfo { hasNextPage } nodes { status happenedAt } } }
    }
  }
}`;

const CUSTOMER_QUERY = `query CurtainsUKSampleToSaleCustomer($id: ID!) {
  customer(id: $id) {
    id numberOfOrders
    orders(first: 40, reverse: true) {
      pageInfo { hasNextPage }
      nodes { id test cancelledAt displayFinancialStatus tags
        lineItems(first: 50) { pageInfo { hasNextPage } nodes { title sku variant { id } } }
      }
    }
  }
}`;

type OrdersResponse = { orders: { pageInfo: { hasNextPage: boolean }; nodes: PilotOrder[] } };
type CustomerResponse = { customer: { numberOfOrders: string | number; orders: { pageInfo: { hasNextPage: boolean }; nodes: CustomerOrder[] } } | null };

/** Staff-only read. Order counts that exceed accessible history suppress marketing eligibility. */
export async function readSampleToSalePilot(): Promise<{ candidates: PilotCandidate[]; partial: boolean }> {
  const source = await sampleCreditAdminRequest(ORDERS_QUERY, {}) as OrdersResponse;
  if (!source.orders?.nodes || !source.orders.pageInfo) throw Error('SAMPLE_TO_SALE_ORDERS_UNAVAILABLE');
  const sampleOrders = source.orders.nodes.filter(isSampleOrder);
  const histories = new Map<string, { orders: CustomerOrder[] | null; complete: boolean }>();
  for (const order of sampleOrders) {
    const id = order.customer?.id;
    if (!id || histories.has(id)) continue;
    try {
      const result = await sampleCreditAdminRequest(CUSTOMER_QUERY, { id }) as CustomerResponse;
      const customer = result.customer;
      const orders = customer?.orders?.nodes ?? null;
      const count = Number(customer?.numberOfOrders);
      histories.set(id, {
        orders,
        complete: Boolean(orders && !customer?.orders.pageInfo.hasNextPage && Number.isSafeInteger(count) && count === orders.length),
      });
    } catch {
      histories.set(id, { orders: null, complete: false });
    }
  }
  const now = new Date();
  return {
    candidates: sampleOrders.map(order => {
      const history = histories.get(order.customer?.id ?? '');
      return planSampleToSale(order, history?.orders ?? null, history?.complete ?? false, now);
    }).filter((candidate): candidate is PilotCandidate => candidate !== null),
    partial: source.orders.pageInfo.hasNextPage,
  };
}

/** Issue one private, redeemable code after a fresh eligibility read. No email is sent. */
export async function issueSampleToSaleCode(sampleOrderId: string) {
  if(process.env.CURTAINSUK_SAMPLE_TO_SALE_ENABLED!=='true')throw Error('SAMPLE_TO_SALE_DISABLED');
  const secret=process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET??'';
  if(secret.length<32)throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  if(!/^gid:\/\/shopify\/Order\/\d+$/.test(sampleOrderId))throw Error('SAMPLE_TO_SALE_ORDER_INVALID');
  const {candidates}=await readSampleToSalePilot();
  const candidate=candidates.find(c=>c.orderId===sampleOrderId);
  if(!candidate||candidate.reason!=='ready'||!['offer','reminder'].includes(candidate.stage)
    ||!candidate.customerId||!/^gid:\/\/shopify\/Customer\/\d+$/.test(candidate.customerId))throw Error('SAMPLE_TO_SALE_INELIGIBLE');
  const database=createSupplierServiceClient();
  const {data:existing,error:existingError}=await database.from('sample_to_sale_offers')
    .select('id,customer_gid,code_hash,expires_at,state').eq('customer_gid',candidate.customerId).maybeSingle();
  if(existingError)throw Error('SAMPLE_TO_SALE_STORAGE_UNAVAILABLE');
  if(existing){
    const code=promotionCode(existing.id,secret);
    if(existing.state!=='AVAILABLE'||Date.parse(existing.expires_at)<=Date.now()||promotionCodeHash(code)!==existing.code_hash)throw Error('SAMPLE_TO_SALE_ALREADY_ISSUED');
    return {code,expiresAt:existing.expires_at,candidate};
  }
  const id=randomUUID(),issuedAt=new Date(),expiresAt=new Date(issuedAt.getTime()+14*86_400_000).toISOString();
  const code=promotionCode(id,secret);
  const {error}=await database.from('sample_to_sale_offers').insert({id,sample_order_gid:sampleOrderId,
    customer_gid:candidate.customerId,code_hash:promotionCodeHash(code),issued_at:issuedAt.toISOString(),expires_at:expiresAt});
  if(error)throw Error('SAMPLE_TO_SALE_STORAGE_UNAVAILABLE');
  return {code,expiresAt,candidate};
}
