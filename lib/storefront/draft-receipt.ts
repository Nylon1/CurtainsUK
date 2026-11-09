import type { ShopifyDraftOrderExecutionResult } from './shopify-draft-order-server';

/** A successful response is durable before checkout is returned to the browser.
 * The transport still validates the retrieved draft against the entire contract.
 * Uncertain creates retain their one-shot claim and use the existing recovery path.
 */
export async function executeWithDraftReceipt(input: {
  load(): Promise<string | null>;
  save(draftOrderId: string): Promise<void>;
  execute(draftOrderId: string | null): Promise<ShopifyDraftOrderExecutionResult>;
}) {
  const id = await input.load();
  const result = await input.execute(id);
  if (result.draftOrderId && result.paymentEnabled) {
    if (!/^gid:\/\/shopify\/DraftOrder\/\d+$/.test(result.draftOrderId) ||
        (id && id !== result.draftOrderId)) throw Error('MY_HOME_DRAFT_RECEIPT_CONFLICT');
    if (!id) await input.save(result.draftOrderId);
  }
  return result;
}
