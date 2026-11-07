import { createHmac, timingSafeEqual } from 'node:crypto';

const validCustomer = (value: string) => /^gid:\/\/shopify\/Customer\/\d+$/.test(value);

export function sampleToSaleUnsubscribeToken(customerGid: string, secret: string): string {
  if (!validCustomer(customerGid) || secret.length < 32) throw Error('SAMPLE_TO_SALE_UNSUBSCRIBE_CONFIGURATION_REQUIRED');
  return createHmac('sha256', secret).update(`sample-to-sale-unsubscribe:${customerGid}`).digest('hex');
}

export function validSampleToSaleUnsubscribeToken(customerGid: string, token: string, secret: string): boolean {
  if (!validCustomer(customerGid) || !/^[a-f0-9]{64}$/.test(token) || secret.length < 32) return false;
  const expected = sampleToSaleUnsubscribeToken(customerGid, secret);
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function sampleToSaleUnsubscribeUrl(customerGid: string, secret: string): string {
  const token = sampleToSaleUnsubscribeToken(customerGid, secret);
  return `https://curtainsuk-production-api.vercel.app/api/sample-to-sale/unsubscribe?customer=${encodeURIComponent(customerGid)}&token=${token}`;
}
