import 'server-only';
import { sampleCreditAdminRequest } from './shopify-draft-order-server';
import { isSampleOrder, planSampleToSale, type CustomerOrder, type PilotCandidate, type PilotOrder } from './sample-to-sale';

const ORDERS_QUERY = `query CurtainsUKSampleToSaleOrders {
  orders(first: 50, reverse: true, sortKey: CREATED_AT) {
    pageInfo { hasNextPage }
    nodes {
      id name test cancelledAt displayFinancialStatus
      customer { id firstName defaultEmailAddress { marketingState } }
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
