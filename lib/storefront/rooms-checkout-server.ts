import 'server-only';
import { persistStagingCheckoutSnapshotAndHandoff } from './review-operations-repository';
import type { ImmutableConfigurationSnapshot } from './checkout-gates';
import { claimHouseShopifyDraftOrderCreation, persistedHouseShopifyDraftOrderId, persistHouseShopifyDraftOrderExecution } from './rooms-draft-order-repository';
import { asProductionHouseDraftOrderContract } from './rooms-order-contract';
import { assertHouseCheckoutReleased } from './rooms-core';
import { executeShopifyDraftOrder, shopifyDraftOrderConfigFromEnvironment, type ShopifyDraftOrderRuntimeConfig } from './shopify-draft-order-server';
import { houseCheckoutCustomerResult, type prepareHouseCheckout } from './rooms-checkout';

/** The private snapshot RPC accepts the same customer-safe summary schema as the single-curtain handoff. */
export function houseSnapshotCustomerSummary(input: {
  snapshot: Readonly<ImmutableConfigurationSnapshot>;
}) {
  const snapshot = input.snapshot;
  const fabric = snapshot.fabricIdentity;
  if (!fabric) throw Error('ROOMS_PRODUCTION_IDENTITY_REQUIRED');
  return {
    windowType: snapshot.windowType,
    measurements: snapshot.measurements,
    fabric: {
      id: snapshot.fabricMasterId,
      supplier: fabric.supplier,
      brand: fabric.brand,
      design: fabric.design,
      colour: fabric.colour,
    },
    heading: snapshot.heading,
    lining: snapshot.lining,
    construction: snapshot.construction,
    availability: snapshot.availability,
    vatIncluded: true,
    deliveryShownSeparately: true,
  };
}

/**
 * The House release gate and the established Shopify production gate must both
 * be open. This is intentionally not inherited from the single-curtain path.
 */
export function houseCheckoutConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ShopifyDraftOrderRuntimeConfig {
  assertHouseCheckoutReleased(environment);
  const config = shopifyDraftOrderConfigFromEnvironment(environment);
  if (!config || config.mode !== 'CREATE_PRODUCTION_DRAFT' || config.deploymentStage !== 'PRODUCTION' || config.productionApproved !== true) {
    throw Error('SHOPIFY_HOUSE_PUBLIC_PAYMENT_DISABLED');
  }
  return config;
}

/** Executes the proven House contract only after its final revalidation. */
export async function executePreparedHouseCheckout(
  prepared: Awaited<ReturnType<typeof prepareHouseCheckout>>,
  config: ShopifyDraftOrderRuntimeConfig | null = null,
) {
  if (!prepared.prepared) return houseCheckoutCustomerResult(prepared);
  if (!config) return houseCheckoutCustomerResult(prepared);
  if (config.mode !== 'CREATE_PRODUCTION_DRAFT' || config.deploymentStage !== 'PRODUCTION' || config.productionApproved !== true) {
    throw Error('SHOPIFY_HOUSE_PUBLIC_PAYMENT_DISABLED');
  }
  const contract = asProductionHouseDraftOrderContract(prepared.contract);
  // Snapshots are immutable evidence for the exact House revision. A changed
  // House has a different fingerprint and cannot recover or reuse this draft.
  if (config) for (const curtain of prepared.curtains) {
    const { snapshot, handoffId } = curtain.handoff;
    await persistStagingCheckoutSnapshotAndHandoff({ snapshot, handoffId, preparedBy: 'SHOPIFY_APP_PROXY_HOUSE',
      customerSummary: houseSnapshotCustomerSummary({ snapshot }) });
  }
  const execution = await executeShopifyDraftOrder({ contract, config,
    existingDraftOrderId: await persistedHouseShopifyDraftOrderId(contract),
    claimCreate: () => claimHouseShopifyDraftOrderCreation(contract) });
  if (execution.status === 'DISABLED' || !execution.paymentEnabled || !execution.checkoutUrl) throw Error('SHOPIFY_HOUSE_PUBLIC_PAYMENT_DISABLED');
  await persistHouseShopifyDraftOrderExecution({ contract, execution });
  // Shopify's validated invoice URL is returned only after all persistence and
  // exact financial checks succeed. The browser receives no internal identity.
  return {
    status: 'SUCCESS' as const,
    prepared: true,
    paymentEnabled: true,
    checkoutUrl: execution.checkoutUrl,
    shopifyWritePerformed: execution.shopifyWritePerformed,
    goods: prepared.review.goods,
    delivery: prepared.review.delivery,
    total: prepared.review.total,
    vat: prepared.review.vat,
    message: 'Your rooms are ready for secure checkout.',
  };
}
