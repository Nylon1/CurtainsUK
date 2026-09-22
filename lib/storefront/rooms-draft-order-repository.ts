import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import type { ShopifyDraftOrderExecutionResult } from './shopify-draft-order-server';
import type { ShopifyHouseDraftOrderContract } from './rooms-order-contract';

/** Durable, House-fingerprint-scoped idempotency for future checkout release. */
export async function claimHouseShopifyDraftOrderCreation(contract: Readonly<ShopifyHouseDraftOrderContract>): Promise<boolean> {
  const { error } = await createSupplierServiceClient().from('mtm_house_draft_creation_claims').insert({
    house_fingerprint: contract.fingerprint,
    house_id: contract.houseId,
    house_revision: contract.revision,
  });
  if (error?.code === '23505') return false;
  if (error) throw Error('SHOPIFY_HOUSE_DRAFT_ORDER_CLAIM_UNAVAILABLE');
  return true;
}

export async function persistedHouseShopifyDraftOrderId(contract: Readonly<ShopifyHouseDraftOrderContract>): Promise<string | null> {
  const { data, error } = await createSupplierServiceClient().from('mtm_house_checkout_executions')
    .select('shopify_draft_order_gid').eq('house_fingerprint', contract.fingerprint).not('shopify_draft_order_gid', 'is', null);
  if (error) throw Error('SHOPIFY_HOUSE_DRAFT_ORDER_RECEIPT_UNAVAILABLE');
  const ids = [...new Set((data ?? []).map((row) => String(row.shopify_draft_order_gid)))];
  if (ids.length > 1) throw Error('SHOPIFY_HOUSE_DRAFT_ORDER_DUPLICATE');
  return ids[0] ?? null;
}

export async function persistHouseShopifyDraftOrderExecution(input: {
  contract: Readonly<ShopifyHouseDraftOrderContract>;
  execution: Exclude<ShopifyDraftOrderExecutionResult, { status: 'DISABLED' }>;
}): Promise<void> {
  const production = input.contract.environment === 'PRODUCTION';
  const productionExecution = input.execution.status === 'PRODUCTION_DRAFT_CREATED' || input.execution.status === 'EXISTING_PRODUCTION_DRAFT_REUSED';
  if (production !== input.contract.paymentEnabled || production !== input.execution.paymentEnabled || production !== productionExecution) {
    throw Error('SHOPIFY_HOUSE_EXECUTION_MODE_MISMATCH');
  }
  const { error } = await createSupplierServiceClient().from('mtm_house_checkout_executions').insert({
    execution_id: randomUUID(),
    house_fingerprint: input.contract.fingerprint,
    house_id: input.contract.houseId,
    house_revision: input.contract.revision,
    shopify_draft_order_gid: input.execution.draftOrderId,
    execution_status: input.execution.status,
    shopify_write_performed: input.execution.shopifyWritePerformed,
    payment_enabled: production,
  });
  if (error?.code === '23505') return;
  if (error) throw Error('SHOPIFY_HOUSE_DRAFT_ORDER_EXECUTION_PERSISTENCE_FAILED');
}
