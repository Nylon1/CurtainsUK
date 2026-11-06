/** Private, read-only pilot. No customer messages or discount codes are issued here. */
export const SAMPLE_VARIANT_GID = 'gid://shopify/ProductVariant/56120226873723';

export type PilotStage = 'not_ready' | 'check_in' | 'inspiration' | 'offer' | 'reminder' | 'expired';
export type PilotReason = 'test_or_unpaid' | 'cancelled' | 'incomplete_order_data' | 'already_bought' | 'no_delivery' | 'no_marketing_permission' | 'ready';

export type PilotOrder = {
  id: string;
  name: string;
  test: boolean;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  customer: { id: string; firstName: string | null; defaultEmailAddress: { marketingState: string } | null } | null;
  lineItems: { pageInfo: { hasNextPage: boolean }; nodes: Array<{ title: string; quantity: number; variant: { id: string } | null; customAttributes: Array<{ key: string; value: string }> }> };
  fulfillments: Array<{ events: { pageInfo: { hasNextPage: boolean }; nodes: Array<{ status: string; happenedAt: string | null }> } }>;
};

export type CustomerOrder = {
  id: string;
  test: boolean;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  tags: string[];
  lineItems: { pageInfo: { hasNextPage: boolean }; nodes: Array<{ title: string; sku: string | null; variant: { id: string } | null }> };
};

export type PilotCandidate = {
  orderId: string;
  orderName: string;
  firstName: string;
  fabricName: string;
  fabricId: string | null;
  deliveredAt: string | null;
  marketingState: string;
  stage: PilotStage;
  reason: PilotReason;
  curtainBought: boolean;
};

function attribute(line: PilotOrder['lineItems']['nodes'][number], key: string): string | null {
  return line.customAttributes.find(item => item.key === key)?.value ?? null;
}

export function isSampleOrder(order: PilotOrder): boolean {
  return order.lineItems.nodes.some(line => line.variant?.id === SAMPLE_VARIANT_GID);
}

export function hasBoughtCurtains(orders: CustomerOrder[] | null, sourceOrderId: string): boolean {
  if (!orders) return false;
  return orders.some(order => order.id !== sourceOrderId && !order.test && !order.cancelledAt
    && (order.tags.includes('CURTAINSUK_PRODUCTION') || order.lineItems.nodes.some(line =>
      line.variant?.id !== SAMPLE_VARIANT_GID && (/^CUK-/.test(line.sku ?? '') || /made.to.measure\s+curtains?|\bcurtains?\b/i.test(line.title))
    )));
}

const DAY = 86_400_000;
export function pilotStage(deliveredAt: string, now: Date): PilotStage {
  const elapsed = now.getTime() - Date.parse(deliveredAt);
  if (!Number.isFinite(elapsed) || elapsed < DAY) return 'not_ready';
  if (elapsed < 4 * DAY) return 'check_in';
  if (elapsed < 8 * DAY) return 'inspiration';
  if (elapsed < 15 * DAY) return 'offer';
  if (elapsed < 22 * DAY) return 'reminder';
  return 'expired';
}

export function planSampleToSale(order: PilotOrder, customerOrders: CustomerOrder[] | null, completeCustomerHistory: boolean, now = new Date()): PilotCandidate | null {
  const samples = order.lineItems.nodes.filter(line => line.variant?.id === SAMPLE_VARIANT_GID);
  if (!samples.length) return null;
  const first = samples[0];
  const fabricName = attribute(first, 'Fabric') || first.title;
  const rawFabricId = attribute(first, 'Fabric Master ID');
  const fabricId = rawFabricId && /^[a-zA-Z0-9-]{1,150}$/.test(rawFabricId) ? rawFabricId : null;
  const delivered = order.fulfillments.flatMap(f => f.events.nodes)
    .filter(e => e.status === 'DELIVERED' && e.happenedAt && Number.isFinite(Date.parse(e.happenedAt)))
    .map(e => e.happenedAt as string).sort()[0] ?? null;
  const curtainBought = hasBoughtCurtains(customerOrders, order.id);
  const marketingState = order.customer?.defaultEmailAddress?.marketingState ?? 'UNKNOWN';
  let reason: PilotReason = 'ready';
  if (order.test || order.displayFinancialStatus !== 'PAID') reason = 'test_or_unpaid';
  else if (order.cancelledAt) reason = 'cancelled';
  else if (order.lineItems.pageInfo.hasNextPage || order.fulfillments.some(f => f.events.pageInfo.hasNextPage)
    || !order.customer || !completeCustomerHistory || customerOrders?.some(o => o.lineItems.pageInfo.hasNextPage)) reason = 'incomplete_order_data';
  else if (curtainBought) reason = 'already_bought';
  else if (!delivered) reason = 'no_delivery';
  else if (marketingState !== 'SUBSCRIBED') reason = 'no_marketing_permission';
  return {
    orderId: order.id, orderName: order.name, firstName: order.customer?.firstName?.trim() || 'there',
    fabricName, fabricId, deliveredAt: delivered, marketingState,
    stage: reason === 'ready' ? pilotStage(delivered!, now) : 'not_ready', reason, curtainBought,
  };
}

export function fabricPreviewUrl(fabricId: string | null): string {
  return fabricId ? `https://www.curtainsuk.com/pages/curtain-visualiser?fabric=${encodeURIComponent(fabricId)}`
    : 'https://www.curtainsuk.com/pages/browse-fabrics';
}

export function pilotMessage(candidate: PilotCandidate, stage: Exclude<PilotStage, 'not_ready' | 'expired'>): { subject: string; body: string } {
  const fabric = candidate.fabricName;
  const link = fabricPreviewUrl(candidate.fabricId);
  const hello = `Hi ${candidate.firstName},`;
  if (stage === 'check_in') return {
    subject: `How does your ${fabric} sample look at home?`,
    body: `${hello}\n\nWe hope your ${fabric} sample has arrived. How does it look in your room? If you would like help with colour, measurements or lining, simply reply and our team will help.\n\nSee your fabric in a room: ${link}\n\nWarm regards,\nThe CurtainsUK Team`,
  };
  if (stage === 'inspiration') return {
    subject: `See ${fabric} as made-to-measure curtains`,
    body: `${hello}\n\nYou chose ${fabric}. Try it in our Room Visualiser, then enter your measurements to see your curtain price. If you received a sample credit code, you can enter it in Design My Home before payment.\n\nExplore your fabric: ${link}\n\nNeed a hand with a heading or measuring? Reply to this email.\n\nThe CurtainsUK Team`,
  };
  if (stage === 'offer') return {
    subject: `A personal curtain offer for your ${fabric} sample`,
    body: `${hello}\n\nWe hope ${fabric} feels right at home. As a thank-you, we have a personal 10% offer for a first made-to-measure curtain order of £150 or more. You can use your existing sample credit as well.\n\nYour code: [UNIQUE CODE]\nValid until: [EXPIRY DATE]\n\nCreate your curtains: ${link}\n\nThe 10% applies to eligible curtain goods, before sample credit. It excludes samples and delivery, can be used once per customer, and cannot be combined with other promotional offers. Terms and exclusions apply.\n\nNeed measuring help? Reply and we will be happy to assist.\n\nThe CurtainsUK Team`,
  };
  return {
    subject: `Your ${fabric} curtain offer ends soon`,
    body: `${hello}\n\nA gentle reminder that your personal curtain offer ends on [EXPIRY DATE]. If you need help measuring or choosing a heading, reply and we will help.\n\nView ${fabric} and create your curtains: ${link}\n\nYour code: [UNIQUE CODE]\n\nThe CurtainsUK Team`,
  };
}
