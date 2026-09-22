import 'server-only';
import { persistStagingCheckoutSnapshotAndHandoff } from './review-operations-repository';
import { claimHouseShopifyDraftOrderCreation, persistedHouseShopifyDraftOrderId, persistHouseShopifyDraftOrderExecution } from './rooms-draft-order-repository';
import { executeShopifyDraftOrder, type ShopifyDraftOrderRuntimeConfig } from './shopify-draft-order-server';
import { houseCheckoutCustomerResult, type prepareHouseCheckout } from './rooms-checkout';

/** Existing nonpayable transport binding. No environment switch opens public House payment. */
export async function executePreparedHouseCheckout(
  prepared: Awaited<ReturnType<typeof prepareHouseCheckout>>,
  config: ShopifyDraftOrderRuntimeConfig | null = null,
) {
  if (!prepared.prepared) return houseCheckoutCustomerResult(prepared);
  if (config?.mode === 'CREATE_PRODUCTION_DRAFT' || config?.deploymentStage === 'PRODUCTION') throw Error('SHOPIFY_HOUSE_PUBLIC_PAYMENT_DISABLED');
  // Public preparation has no persistence or commerce side effects while release is held.
  // A separately authorised private operator can use the proven nonpayable transport.
  if (config) for (const curtain of prepared.curtains) {
    const { snapshot, handoffId } = curtain.handoff;
    await persistStagingCheckoutSnapshotAndHandoff({ snapshot, handoffId, preparedBy: 'SHOPIFY_APP_PROXY_HOUSE',
      customerSummary: { fabric: snapshot.fabricIdentity, measurements: snapshot.measurements,
        configuration: prepared.review.lines.find(line => line.configuration_id === curtain.retainedConfigurationId)!.configuration,
        heading: snapshot.heading, lining: snapshot.lining, construction: snapshot.construction,
        retainedConfigurationId: curtain.retainedConfigurationId,
        ...(snapshot.patternAllowance ? { patternAllowance: snapshot.patternAllowance } : {}) } });
  }
  const execution = await executeShopifyDraftOrder({ contract: prepared.contract, config,
    existingDraftOrderId: config ? await persistedHouseShopifyDraftOrderId(prepared.contract) : null,
    claimCreate: () => claimHouseShopifyDraftOrderCreation(prepared.contract) });
  if (execution.status !== 'DISABLED') await persistHouseShopifyDraftOrderExecution({ contract: prepared.contract, execution });
  // Invoice URLs and private production identity never cross the public preparation boundary.
  return { ...houseCheckoutCustomerResult(prepared), shopifyWritePerformed: execution.shopifyWritePerformed };
}
