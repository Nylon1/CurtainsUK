/** Unpublished multi-line contract. No Shopify writes or paid-lifecycle changes. */
import { createHash } from 'node:crypto';
import type { StagingCheckoutHandoff } from './checkout-gates';
import { asProductionDraftOrderContract, buildShopifyDraftOrderContract, type ShopifyDraftOrderInput, type ShopifyDraftOrderExpectedFinancials } from './shopify-draft-order-core';
import { ROOMS_RULESET } from './rooms-core';

export function buildHouseDraftContract(input: {
  houseId: string; revision: number;
  curtains: Array<{ roomId: string; roomName: string; windowName: string; handoff: Readonly<StagingCheckoutHandoff> }>;
}): { input: ShopifyDraftOrderInput; expected: ShopifyDraftOrderExpectedFinancials; fingerprint: string; paymentEnabled: false; releaseBlocker: string } {
  if (!input.curtains.length || !Number.isSafeInteger(input.revision) || input.revision < 0) throw Error('ROOMS_ORDER_INVALID');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.houseId)) throw Error('ROOMS_HOUSE_INVALID');
  const seen = new Set<string>();
  const contracts = input.curtains.map(curtain => {
    const snapshot = curtain.handoff.snapshot;
    if (!uuid.test(curtain.roomId) || !curtain.roomName.trim() || !curtain.windowName.trim() || curtain.roomName.length > 80 || curtain.windowName.length > 80) throw Error('ROOMS_NAME_INVALID');
    if (seen.has(snapshot.configurationId)) throw Error('ROOMS_CONFIGURATION_DUPLICATE');
    seen.add(snapshot.configurationId);
    if (snapshot.pricingRuleVersion !== ROOMS_RULESET || !snapshot.fabricIdentity) throw Error('ROOMS_PRODUCTION_IDENTITY_REQUIRED');
    const identity = { ...snapshot.fabricIdentity, supplierSku: snapshot.supplierSku };
    return asProductionDraftOrderContract(buildShopifyDraftOrderContract({ handoff:curtain.handoff, fabricLabel:`${identity.design} — ${identity.colour}` }), snapshot.fabricMasterId, identity);
  });
  const first = contracts[0];
  // Reuse one current governed delivery quote, never charge once per curtain.
  if (contracts.some(contract=>JSON.stringify(contract.input.shippingAddress)!==JSON.stringify(first.input.shippingAddress)
    || contract.expected.shippingGrossAmountMinor!==first.expected.shippingGrossAmountMinor
    || contract.expected.shippingVatAmountMinor!==first.expected.shippingVatAmountMinor)) throw Error('ROOMS_DELIVERY_MISMATCH');
  const goods = contracts.reduce((sum,contract)=>sum+contract.expected.goodsGrossAmountMinor,0);
  const goodsVat = contracts.reduce((sum,contract)=>sum+contract.expected.goodsVatAmountMinor,0);
  const fingerprint = createHash('sha256').update(JSON.stringify({houseId:input.houseId,revision:input.revision,lines:contracts.map(c=>c.input),rooms:input.curtains.map(c=>[c.roomId,c.roomName,c.windowName])})).digest('hex');
  return {
    paymentEnabled:false, releaseBlocker:'MULTI_SNAPSHOT_PAID_LIFECYCLE_NOT_RELEASED', fingerprint,
    expected:{...first.expected,goodsGrossAmountMinor:goods,goodsVatAmountMinor:goodsVat,orderGrossAmountMinor:goods+first.expected.shippingGrossAmountMinor,orderVatAmountMinor:goodsVat+first.expected.shippingVatAmountMinor},
    input:{...first.input,
      // Do not attach the first snapshot as if it represented the whole house.
      customAttributes:[{key:'curtainsuk_house_id',value:input.houseId},{key:'curtainsuk_house_revision',value:String(input.revision)},{key:'curtainsuk_house_fingerprint',value:fingerprint}],
      lineItems:contracts.flatMap((contract,index)=>contract.input.lineItems.map(line=>({...line,
        title:`${input.curtains[index].roomName} — ${input.curtains[index].windowName}`,
        customAttributes:[...line.customAttributes,{key:'Room',value:input.curtains[index].roomName},
          {key:'_curtainsuk_house_id',value:input.houseId},{key:'_curtainsuk_room_id',value:input.curtains[index].roomId},
          ...contract.input.customAttributes.map(attribute=>({key:`_${attribute.key}`,value:attribute.value}))]
      }))),
      note:'Build My Rooms — unpublished contract. Every curtain requires its own CurtainsUK review before manufacture.',
      tags:['CURTAINSUK_ROOMS_UNPUBLISHED','DO_NOT_FULFIL',`CUK_HOUSE_${fingerprint.slice(0,32)}`]
    }
  };
}
