import { createHash } from 'node:crypto';
import type { MtmPaidHouse, MtmPaidHouseCurtain } from './mtm-paid-order-lifecycle';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;

export type ShopifyWebhookAttribute = { name?: unknown; key?: unknown; value?: unknown };
export type ShopifyPaidLine = { properties?: ShopifyWebhookAttribute[]; custom_attributes?: ShopifyWebhookAttribute[] };

function attributes(items: readonly ShopifyWebhookAttribute[] | undefined): Map<string, string> {
  const values = new Map<string, string>();
  for (const item of items ?? []) {
    const key = typeof item.name === 'string' ? item.name : typeof item.key === 'string' ? item.key : null;
    if (key && typeof item.value === 'string') values.set(key, item.value);
  }
  return values;
}

function validName(value: string | undefined): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.trim().length <= 80 && !/[\u0000-\u001f]/.test(value);
}

function lineFingerprint(curtains: readonly MtmPaidHouseCurtain[]): string {
  return createHash('sha256').update(JSON.stringify(curtains.map((curtain) => ({
    snapshot_id: curtain.snapshotId, configuration_id: curtain.configurationId, room_id: curtain.roomId,
    room_name: curtain.roomName, window_name: curtain.windowName, line_ordinal: curtain.lineOrdinal,
  })))).digest('hex');
}

/**
 * Reconstructs only the relational House identity stored on Shopify line
 * properties. The Shopify webhook HMAC authenticates the order; the API later
 * verifies each snapshot/configuration pair against the private database.
 */
export function housePaymentFromShopify(input: {
  orderAttributes: ReadonlyMap<string, string>;
  lineItems: readonly ShopifyPaidLine[] | undefined;
}): MtmPaidHouse | null {
  if (input.orderAttributes.get('curtainsuk_contract_type') !== 'HOUSE') return null;
  const houseId = input.orderAttributes.get('curtainsuk_house_id');
  const revisionText = input.orderAttributes.get('curtainsuk_house_revision');
  const houseFingerprint = input.orderAttributes.get('curtainsuk_house_fingerprint');
  const contractFingerprint = input.orderAttributes.get('curtainsuk_house_contract_fingerprint');
  const declaredCount = input.orderAttributes.get('curtainsuk_house_curtain_count');
  if (!houseId || !UUID.test(houseId) || !revisionText || !/^(0|[1-9]\d*)$/.test(revisionText)
    || !houseFingerprint || !HASH.test(houseFingerprint) || !contractFingerprint || !HASH.test(contractFingerprint)
    || !declaredCount || !/^[1-9]\d*$/.test(declaredCount)
    || !Array.isArray(input.lineItems) || input.lineItems.length !== Number(declaredCount) || input.lineItems.length > 100) {
    throw Error('MTM_PAID_ORDER_HOUSE_INVALID');
  }
  const curtains = input.lineItems.map((line): MtmPaidHouseCurtain => {
    const props = attributes(line.properties ?? line.custom_attributes);
    const snapshotId = props.get('_curtainsuk_snapshot_id');
    const configurationId = props.get('_curtainsuk_configuration_id');
    const roomId = props.get('_curtainsuk_room_id');
    const roomName = props.get('_curtainsuk_room_name');
    const windowName = props.get('_curtainsuk_window_name');
    const ordinal = props.get('_curtainsuk_line_ordinal');
    if (!snapshotId || !UUID.test(snapshotId) || !configurationId || !UUID.test(configurationId)
      || !roomId || !UUID.test(roomId) || !validName(roomName) || !validName(windowName)
      || !ordinal || !/^[1-9]\d*$/.test(ordinal)) throw Error('MTM_PAID_ORDER_HOUSE_LINE_INVALID');
    return { snapshotId, configurationId, roomId, roomName: roomName.trim(), windowName: windowName.trim(), lineOrdinal: Number(ordinal) };
  }).sort((a, b) => a.lineOrdinal - b.lineOrdinal);
  if (new Set(curtains.map((line) => line.snapshotId)).size !== curtains.length
    || new Set(curtains.map((line) => line.configurationId)).size !== curtains.length
    || new Set(curtains.map((line) => line.lineOrdinal)).size !== curtains.length
    || curtains.some((line, index) => line.lineOrdinal !== index + 1)
    || lineFingerprint(curtains) !== contractFingerprint) throw Error('MTM_PAID_ORDER_HOUSE_IDENTITY_CONFLICT');
  return { houseId, houseRevision: Number(revisionText), houseFingerprint, contractFingerprint, curtains };
}

export function shopifyOrderAttributes(items: readonly ShopifyWebhookAttribute[] | undefined): Map<string, string> {
  return attributes(items);
}
