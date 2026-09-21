import { createHmac, timingSafeEqual } from 'node:crypto';
import type { StagingPriceRequest, StagingPriceResponse } from './staging-pricing';
import type { ShippingQuote } from './shipping';
import { allocateVatFromGross } from './shopify-draft-order-core';

export const ROOMS_RULESET = '3.0.0-production.1';
export const ROOMS_CHECKOUT_RELEASED = false; // Multi-snapshot paid lifecycle is a release dependency, not a browser flag.
export function roomsCustomerError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'ROOMS_PRICE_RECONFIRM_REQUIRED') return 'Please check your curtain price again before adding it to your rooms.';
  if (code === 'ROOMS_CURTAIN_REQUIRES_REVIEW') return 'This curtain needs a CurtainsUK check before it can be added. Please contact support@curtainsuk.com.';
  if (code === 'ROOMS_UNAVAILABLE' || code === 'ROOMS_CHECKOUT_AWAITING_MULTI_SNAPSHOT_RELEASE') return 'Build My Rooms checkout is not available yet. Your saved rooms have not been changed.';
  if (code === 'ROOMS_EMPTY') return 'Add a curtain before reviewing your rooms.';
  return 'We could not verify this curtain just now. Your saved rooms have not been changed. Please check your selections or contact support@curtainsuk.com.';
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type RoomsFabric = { id: string; design: string; colour: string; supplier: string; brand: string; imageUrl: string | null };
export type RetainedCurtain = {
  configuration_id: string; fabric_master_id: string; configuration: StagingPriceRequest;
  fabric: RoomsFabric; last_validated_price: number; last_validated_at: string;
  pricing_version: string; visual: { kind: 'FABRIC_PHOTOGRAPH'; url: string | null };
  receipt: string; window_name: string;
};
export type RetainedClaims = Omit<RetainedCurtain, 'receipt' | 'window_name'>;
export type HouseReviewRequest = {
  house_id: string; revision: number; postcode: string;
  rooms: Array<{ room_id: string; room_name: string; curtains: Array<{ configuration_id: string; receipt: string; window_name: string }> }>;
};
export type RoomsServices = {
  secret: string;
  calculate(configuration: StagingPriceRequest): Promise<StagingPriceResponse>;
  verifyPrice(configuration: StagingPriceRequest, configurationId: string, price: StagingPriceResponse, token: unknown): boolean;
  fabric(id: string): Promise<RoomsFabric>;
  stock(id: string, totalMetres: number): Promise<boolean>;
  delivery(calculations: StagingPriceResponse[], postcode: string, configurations: StagingPriceRequest[]): Promise<ShippingQuote>;
  now(): string;
};
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}
function mac(scope: string, payload: string, secret: string) {
  if (secret.length < 32) throw Error('ROOMS_SIGNING_UNAVAILABLE');
  return createHmac('sha256', secret).update(`curtainsuk:rooms:${scope}:v1\0${payload}`).digest('base64url');
}
export function seal<T>(scope: string, value: T, secret: string): string {
  const encoded = Buffer.from(canonical(value)).toString('base64url');
  return `v1.${encoded}.${mac(scope, encoded, secret)}`;
}
export function unseal<T>(scope: string, token: string, secret: string): T {
  if (typeof token !== 'string' || token.length > 32_768) throw Error('ROOMS_INTEGRITY_FAILED');
  const [version, encoded, supplied, extra] = token.split('.');
  if (version !== 'v1' || !encoded || !supplied || extra) throw Error('ROOMS_INTEGRITY_FAILED');
  const expected = Buffer.from(mac(scope, encoded, secret));
  const candidate = Buffer.from(supplied);
  if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) throw Error('ROOMS_INTEGRITY_FAILED');
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}
function priceReady(price: StagingPriceResponse) {
  return price.calculationVersion === ROOMS_RULESET && price.outcome === 'INSTANT_PRICE'
    && !price.technicalReviewRequired && price.commercialState === 'ORDER_READY' && price.stockSnapshotStale === false
    && Number.isSafeInteger(price.totalAmountMinor) && price.totalAmountMinor! > 0
    && Number.isSafeInteger(price.vatAmountMinor) && price.vatAmountMinor! >= 0
    && Number.isSafeInteger(price.netAmountMinor) && price.netAmountMinor! + price.vatAmountMinor! === price.totalAmountMinor
    && price.fabricMetres !== null && price.fabricMetres > 0;
}
export async function retainCurtain(input: {
  configuration: StagingPriceRequest; configurationId: string; priceConfirmationToken: string;
}, services: RoomsServices): Promise<RetainedCurtain> {
  if (!input || !uuid.test(input.configurationId)) throw Error('ROOMS_CONFIGURATION_INVALID');
  const configurationKeys = new Set(['windowSlug','measurementBasis','hardware','widthCm','dropCm','desiredFinish','bayTrackOrPoleFitted','bayNumberOfSections','baySegmentWidthsCm','cornerSectionWidthsCm','cornerAngleDegrees','fabricId','heading','lining','interlining','construction','stackDirection','photoNames']);
  if (!input.configuration || typeof input.configuration !== 'object' || Array.isArray(input.configuration)
    || Object.keys(input.configuration).some(key=>!configurationKeys.has(key))) throw Error('ROOMS_CONFIGURATION_INVALID');
  if (input.configuration.photoNames && (!Array.isArray(input.configuration.photoNames) || input.configuration.photoNames.length)) throw Error('ROOMS_CONFIGURATION_INVALID');
  const price = await services.calculate(input.configuration);
  if (!priceReady(price)) throw Error('ROOMS_CURTAIN_REQUIRES_REVIEW');
  if (!services.verifyPrice(input.configuration, input.configurationId, price, input.priceConfirmationToken)) throw Error('ROOMS_PRICE_RECONFIRM_REQUIRED');
  const fabric = await services.fabric(input.configuration.fabricId);
  if (fabric.id !== input.configuration.fabricId || price.selectedFabric.id !== fabric.id) throw Error('ROOMS_FABRIC_IDENTITY_MISMATCH');
  const claims: RetainedClaims = {
    configuration_id: input.configurationId, configuration: { ...structuredClone(input.configuration), hardware: input.configuration.hardware ?? (input.configuration.measurementBasis === 'POLE_USABLE_WIDTH' ? 'POLE' : 'TRACK') },
    fabric_master_id: fabric.id, fabric, last_validated_price: price.totalAmountMinor!, last_validated_at: services.now(),
    pricing_version: price.calculationVersion, visual: { kind: 'FABRIC_PHOTOGRAPH', url: fabric.imageUrl }
  };
  return { ...claims, receipt: seal('retained', claims, services.secret), window_name: humanize(input.configuration.windowSlug) };
}
export function humanize(text: string) { return text.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }
function safeName(value: string) { if (typeof value !== 'string' || !value.trim() || value.length > 80 || /[\u0000-\u001f]/.test(value)) throw Error('ROOMS_NAME_INVALID'); return value.trim(); }
export type ReviewedLine = {
  configuration_id: string; room_id: string; room_name: string; window_name: string;
  status: 'READY' | 'PRICE_CHANGED' | 'BLOCKED'; previousPrice: number | null; currentPrice: number | null;
  message: string; configuration?: StagingPriceRequest; fabric?: RoomsFabric;
};
export async function reviewHouse(input: HouseReviewRequest, services: RoomsServices) {
  if (!input || !uuid.test(input.house_id) || !Number.isSafeInteger(input.revision) || input.revision < 0 || !Array.isArray(input.rooms) || !input.rooms.length) throw Error('ROOMS_HOUSE_INVALID');
  const roomIds = new Set<string>(), configIds = new Set<string>();
  const lines: ReviewedLine[] = [], prices: StagingPriceResponse[] = [];
  const stockGroups = new Map<string, { metres: number; lineIndexes: number[] }>();
  for (const room of input.rooms) {
    if (!uuid.test(room.room_id) || roomIds.has(room.room_id) || !Array.isArray(room.curtains)) throw Error('ROOMS_ROOM_INVALID');
    roomIds.add(room.room_id);
    const roomName = safeName(room.room_name);
    for (const item of room.curtains) {
      if (!uuid.test(item.configuration_id) || configIds.has(item.configuration_id)) throw Error('ROOMS_CONFIGURATION_DUPLICATE');
      configIds.add(item.configuration_id);
      const line: ReviewedLine = { configuration_id: item.configuration_id, room_id: room.room_id, room_name: roomName, window_name: safeName(item.window_name), status: 'BLOCKED', previousPrice: null, currentPrice: null, message: 'We could not verify this saved curtain. Remove it and configure your curtains again, or contact us.' };
      try {
        const saved = unseal<RetainedClaims>('retained', item.receipt, services.secret);
        if (saved.configuration_id !== item.configuration_id || saved.fabric_master_id !== saved.configuration.fabricId) throw Error('ROOMS_INTEGRITY_FAILED');
        line.previousPrice = saved.last_validated_price;
        // The durable signature proves saved configuration integrity, never today's price or stock.
        const price = await services.calculate(saved.configuration);
        const fabric = await services.fabric(saved.fabric_master_id);
        if (!priceReady(price) || fabric.id !== saved.fabric_master_id || price.selectedFabric.id !== fabric.id) throw Error('ROOMS_CURRENT_ELIGIBILITY_FAILED');
        line.configuration = saved.configuration;
        line.fabric = fabric;
        line.currentPrice = price.totalAmountMinor;
        line.status = price.totalAmountMinor === saved.last_validated_price ? 'READY' : 'PRICE_CHANGED';
        line.message = line.status === 'READY' ? 'Current price and availability checked.' : 'Please acknowledge the updated price before checkout.';
        prices.push(price);
        const group = stockGroups.get(fabric.id) || { metres: 0, lineIndexes: [] };
        group.metres += price.fabricMetres!;
        group.lineIndexes.push(lines.length);
        stockGroups.set(fabric.id, group);
      } catch { /* One failed line never removes another room or exposes supplier internals. */ }
      lines.push(line);
    }
  }
  if (!lines.length) throw Error('ROOMS_EMPTY');
  // Several windows can each pass individually but jointly exceed available cloth.
  for (const [fabricId, group] of stockGroups) {
    let available = false;
    try { available = await services.stock(fabricId, group.metres); } catch { /* Fail closed. */ }
    if (!available) for (const index of group.lineIndexes) Object.assign(lines[index], { status: 'BLOCKED', message: 'We cannot currently confirm enough fabric for these curtains. Your rooms remain saved.' });
  }
  let delivery: ShippingQuote | null = null;
  if (lines.every(line => line.status !== 'BLOCKED')) {
    try { delivery = await services.delivery(prices, input.postcode, lines.map(line=>line.configuration!)); } catch { /* No invented rate. */ }
  }
  const ready = lines.every(line => line.status !== 'BLOCKED') && delivery?.status === 'READY' && delivery.grossAmountMinor !== null;
  const goods = lines.every(line => line.status !== 'BLOCKED') ? lines.reduce((total, line) => total + line.currentPrice!, 0) : null;
  const deliveryAmount = delivery?.status === 'READY' ? delivery.grossAmountMinor : null;
  const vatRates = new Set(prices.map(price => price.vatRateBasisPoints));
  const vat = ready && vatRates.size === 1 && prices[0]?.vatRateBasisPoints !== null
    ? prices.reduce((total, price) => total + price.vatAmountMinor!, 0) + allocateVatFromGross(deliveryAmount!, prices[0].vatRateBasisPoints!) : null;
  const result = {
    house_id: input.house_id, revision: input.revision, lines, validated_at: services.now(),
    ready: Boolean(ready && vat !== null), checkoutEnabled: ROOMS_CHECKOUT_RELEASED,
    requiresPriceAcknowledgement: lines.some(line => line.status === 'PRICE_CHANGED'),
    goods, delivery: deliveryAmount, total: ready ? goods! + deliveryAmount! : null, vat,
    pricingVersion: ROOMS_RULESET, currency: 'GBP' as const,
    deliveryMessage: delivery?.message || 'Enter a UK Mainland postcode to confirm delivery.',
  };
  // Five-minute review signature binds names, membership, prices, destination and revision.
  const reviewToken = seal('review', { result, request: input, expiresAt: Date.parse(services.now()) + 300_000 }, services.secret);
  return { ...result, reviewToken };
}

export function assertHouseCheckoutReleased(): never {
  throw Error('ROOMS_CHECKOUT_AWAITING_MULTI_SNAPSHOT_RELEASE');
}
