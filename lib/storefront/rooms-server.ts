import 'server-only';
import { calculateStagingPrice } from './server-staging-pricing';
import { verifyReviewSubmission } from './review-token';
import { fabricMasterRecordById } from '@/lib/fabric-master/repository';
import { projectCustomerSafeFabric } from '@/lib/fabric-master/projection';
import { dailyStockProjection } from './daily-stock-server';
import { loadStagingUkShippingRules } from './shipping-repository';
import { quoteOwnerApprovedCurtainShipping, STAGING_SHIPPING_OWNER_INPUTS, deliveryRequiresReview } from './shipping-owner-inputs';
import { retainCurtain, reviewHouse, type RoomsServices, type HouseReviewRequest } from './rooms-core';

function services(): RoomsServices {
  const secret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw Error('ROOMS_SIGNING_UNAVAILABLE');
  return {
    secret, calculate: calculateStagingPrice, now: () => new Date().toISOString(),
    verifyPrice: (configuration, configurationId, price, token) => verifyReviewSubmission({ configuration, configurationId, outcome: price.outcome, totalAmountMinor: price.totalAmountMinor }, token),
    async fabric(id) {
      const record = await fabricMasterRecordById(id);
      if (!record || record.fabric_id !== id) throw Error('ROOMS_FABRIC_UNAVAILABLE');
      const safe = projectCustomerSafeFabric(record);
      const imageUrl = safe.imageReferences.find(url => /^https:\/\//.test(url)) || null;
      return { id, design: record.design_name, colour: record.colour_name, supplier: record.supplier_name, brand: record.brand_name, imageUrl };
    },
    async stock(id, metres) {
      const fabric = await fabricMasterRecordById(id);
      if (!fabric) return false;
      const stock = await dailyStockProjection({ supplierId: fabric.supplier_id, supplierSku: fabric.supplier_sku, requirement: { quantity: metres, stock_unit: 'METRE' } });
      return stock.stale === false && stock.availability === 'FABRIC_AVAILABLE';
    },
    async delivery(calculations, postcode, configurations) {
      // Reuse the current one-charge governed rate. A later packing-policy change needs review.
      if (STAGING_SHIPPING_OWNER_INPUTS.launchMode !== 'SINGLE_RATE') throw Error('ROOMS_DELIVERY_REQUIRES_REVIEW');
      return quoteOwnerApprovedCurtainShipping({ selectedRegion: 'UK_MAINLAND', postcode,
        fabricMetres: calculations.reduce((total, price) => total + price.fabricMetres!, 0), maximumDropCm: Math.max(...configurations.map(c=>c.dropCm)),
        requiresDeliveryReview: configurations.some(c=>deliveryRequiresReview(c.windowSlug,{ coverage_width:c.widthCm, finished_drop:c.dropCm })),
        rules: await loadStagingUkShippingRules() });
    }
  };
}
export function roomsFeatureEnabled() { return process.env.CURTAINSUK_ROOMS_ENABLED === 'true'; }
export async function roomsCommand(input: unknown) {
  if (!roomsFeatureEnabled()) throw Error('ROOMS_UNAVAILABLE');
  if (!input || typeof input !== 'object') throw Error('ROOMS_REQUEST_INVALID');
  const command = input as { action: string; payload: unknown };
  if (command.action === 'retain') return retainCurtain(command.payload as Parameters<typeof retainCurtain>[0], services());
  if (command.action === 'review') return reviewHouse(command.payload as HouseReviewRequest, services());
  // Existing paid-order and workroom paths remain untouched. No environment toggle bypasses this.
  if (command.action === 'checkout') throw Error('ROOMS_CHECKOUT_AWAITING_MULTI_SNAPSHOT_RELEASE');
  throw Error('ROOMS_REQUEST_INVALID');
}
