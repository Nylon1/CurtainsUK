import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { creditDigest } from './sample-credit';

export type PromotionQuote = {
  offerId: string;
  codeHash: string;
  amountMinor: number;
  expiresAt: string;
  digest: string;
  reservationId: string;
};

export function normalizePromotionCode(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') throw Error('SAMPLE_TO_SALE_CODE_INVALID');
  const value = input.trim().toUpperCase();
  if (!/^CUK10-[A-F0-9]{8}-[A-F0-9]{20}$/.test(value)) throw Error('SAMPLE_TO_SALE_CODE_INVALID');
  return value;
}

export function promotionCode(offerId: string, secret: string): string {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(offerId) || secret.length < 32)
    throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  const signature = createHmac('sha256',secret).update(`curtainsuk-sample-to-sale-v1:${offerId}`).digest('hex').slice(0,20).toUpperCase();
  return `CUK10-${offerId.slice(0,8).toUpperCase()}-${signature}`;
}

export function promotionCodeHash(input: string): string {
  const code = normalizePromotionCode(input);
  if (!code) throw Error('SAMPLE_TO_SALE_CODE_INVALID');
  return createHash('sha256').update(code).digest('hex');
}

export function verifyPromotionCode(code: string, offerId: string, secret: string): boolean {
  const actual = Buffer.from(promotionCodeHash(code),'hex');
  const expected = Buffer.from(promotionCodeHash(promotionCode(offerId,secret)),'hex');
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}

export function quotePromotion(input: {offerId:string;codeHash:string;expiresAt:string;baseReviewId:string;amountMinor:number}): PromotionQuote {
  if (!/^[a-f0-9]{64}$/.test(input.baseReviewId) || !/^[a-f0-9]{64}$/.test(input.codeHash)
    || !Number.isSafeInteger(input.amountMinor) || input.amountMinor<=0 || !Number.isFinite(Date.parse(input.expiresAt)))
    throw Error('SAMPLE_TO_SALE_QUOTE_INVALID');
  const digest=creditDigest({version:'sample-to-sale-v1',offerId:input.offerId,codeHash:input.codeHash,expiresAt:input.expiresAt,amountMinor:input.amountMinor});
  return {...input,digest,reservationId:creditDigest({baseReviewId:input.baseReviewId,digest})};
}
