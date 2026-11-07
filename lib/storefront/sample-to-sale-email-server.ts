import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import { recordOperationalError } from './operational-error';
import { promotionCode, promotionCodeHash } from './sample-to-sale-code';
import { sampleToSaleEmail, type FollowUpStage } from './sample-to-sale-email';
import { dueSampleEmailStage } from './sample-to-sale-email-policy';
import { issueSampleToSaleCode, readSampleToSalePilot } from './sample-to-sale-server';
import { sampleToSaleUnsubscribeUrl } from './sample-to-sale-unsubscribe';
import type { PilotCandidate, PilotStage } from './sample-to-sale';

type MessageRow = {
  stage: FollowUpStage;
  state: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'REVIEW';
  sample_order_gid: string;
  sent_at: string | null;
};
type EnrollmentRow = { customer_gid: string; sample_order_gid: string; enabled: boolean };
type Delivery = 'SENT' | 'NOT_SENT' | 'REVIEW';
const db = () => createSupplierServiceClient();
const validEmail = (email: string | null): email is string => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

function sendingConfig() {
  if (process.env.CURTAINSUK_SAMPLE_TO_SALE_EMAIL_ENABLED !== 'true')
    throw Error('SAMPLE_TO_SALE_EMAIL_DISABLED');
  const from = process.env.CURTAINSUK_SAMPLE_TO_SALE_FROM ?? '';
  const secret = process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET ?? '';
  const apiKey = process.env.RESEND_API_KEY ?? '';
  if (!/^.+<[^<>\s]+@curtainsuk\.com>$/.test(from) || secret.length < 32 || !apiKey)
    throw Error('SAMPLE_TO_SALE_EMAIL_CONFIGURATION_REQUIRED');
  return { from, secret, apiKey };
}

async function existingOffer(candidate: PilotCandidate) {
  const { data, error } = await db().from('sample_to_sale_offers')
    .select('id,code_hash,expires_at,state').eq('customer_gid', candidate.customerId!).maybeSingle();
  if (error) throw Error('SAMPLE_TO_SALE_OFFER_UNAVAILABLE');
  if (!data || data.state !== 'AVAILABLE' || Date.parse(data.expires_at) <= Date.now()) return null;
  const secret = process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET ?? '';
  if (secret.length < 32) throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  const code = promotionCode(data.id, secret);
  if (promotionCodeHash(code) !== data.code_hash) throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  return { code, expiresAt: data.expires_at };
}

async function recordState(candidate: PilotCandidate, stage: FollowUpStage, state: 'SENT' | 'FAILED' | 'REVIEW', providerId?: string) {
  const update: Record<string, unknown> = { state, updated_at: new Date().toISOString() };
  if (state === 'SENT') { update.sent_at = new Date().toISOString(); update.provider_id = providerId; }
  const { error } = await db().from('sample_to_sale_messages').update(update)
    .eq('customer_gid', candidate.customerId!).eq('stage', stage).eq('state', 'SENDING');
  if (error) throw Error('SAMPLE_TO_SALE_MESSAGE_LEDGER_UNAVAILABLE');
}

async function suppressed(customerId: string): Promise<boolean> {
  const { data, error } = await db().from('sample_to_sale_unsubscribes')
    .select('customer_gid').eq('customer_gid', customerId).maybeSingle();
  if (error) throw Error('SAMPLE_TO_SALE_SUPPRESSION_UNAVAILABLE');
  return Boolean(data);
}

async function deliver(candidate: PilotCandidate, step: FollowUpStage, expectedStage: PilotStage,
  routePath: '/admin/sample-to-sale/send' | '/api/cron/error-centre-digest', automatic = false): Promise<Delivery> {
  const { from, secret, apiKey } = sendingConfig();
  if (await suppressed(candidate.customerId!)) return 'NOT_SENT';
  const { data: claimed, error: claimError } = await db().rpc('claim_sample_to_sale_message', {
    p_customer_gid: candidate.customerId, p_stage: step,
    p_sample_order_gid: candidate.orderId, p_recipient: candidate.email,
  });
  if (claimError) throw Error('SAMPLE_TO_SALE_MESSAGE_CLAIM_FAILED');
  if (!claimed) return 'NOT_SENT';
  try {
    const fresh = await readSampleToSalePilot();
    const current = fresh.candidates.find(item => item.orderId === candidate.orderId);
    if (fresh.partial || !current || current.reason !== 'ready' || current.stage !== expectedStage ||
      current.customerId !== candidate.customerId || current.email !== candidate.email ||
      await suppressed(candidate.customerId!)) {
      await recordState(candidate, step, 'REVIEW');
      return 'REVIEW';
    }
    if (automatic) {
      const { data: enrollment, error } = await db().from('sample_to_sale_enrolments')
        .select('enabled,sample_order_gid').eq('customer_gid', candidate.customerId!).maybeSingle();
      const canary = (process.env.CURTAINSUK_SAMPLE_TO_SALE_EMAIL_CANARY_CUSTOMERS ?? '').split(',').map(value => value.trim());
      if (error || (!canary.includes(candidate.customerId!) &&
        !(enrollment?.enabled && enrollment.sample_order_gid === candidate.orderId))) {
        await recordState(candidate, step, 'REVIEW');
        return 'REVIEW';
      }
    }
    let offer: { code: string; expiresAt: string } | null = null;
    if (step === 'offer') offer = await issueSampleToSaleCode(candidate.orderId);
    if (step === 'reminder') offer = await existingOffer(candidate);
    if ((step === 'offer' || step === 'reminder') && !offer) {
      await recordState(candidate, step, 'REVIEW');
      return 'REVIEW';
    }
    const unsubscribeUrl = sampleToSaleUnsubscribeUrl(candidate.customerId!, secret);
    const expiry = offer ? new Date(offer.expiresAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
    }) : undefined;
    const email = sampleToSaleEmail(current, step, { code: offer?.code, expiry, unsubscribeUrl });
    const result = await new Resend(apiKey).emails.send({
      from, to: [candidate.email!], bcc: email.bcc, replyTo: 'enquiries@curtainsuk.com',
      subject: email.subject, text: email.text, html: email.html,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }, { idempotencyKey: `curtainsuk-sample-to-sale/${candidate.customerId!.split('/').at(-1)}/${step}` });
    if (result.error || !result.data?.id) throw Error('SAMPLE_TO_SALE_EMAIL_SEND_FAILED');
    await recordState(candidate, step, 'SENT', result.data.id);
    return 'SENT';
  } catch {
    await recordState(candidate, step, 'FAILED');
    await recordOperationalError({ routePath, code: 'SAMPLE_TO_SALE_EMAIL_FAILED', source: 'HANDLED' });
    throw Error('SAMPLE_TO_SALE_EMAIL_SEND_FAILED');
  }
}

export async function readSampleToSaleStaffState(candidates: PilotCandidate[]) {
  const ids = [...new Set(candidates.map(candidate => candidate.customerId).filter((id): id is string => Boolean(id)))];
  const result = new Map<string, { messages: MessageRow[]; enrollment: EnrollmentRow | null }>();
  if (!ids.length) return result;
  const [messageResult, enrollmentResult] = await Promise.all([
    db().from('sample_to_sale_messages').select('customer_gid,stage,state,sample_order_gid,sent_at').in('customer_gid', ids),
    db().from('sample_to_sale_enrolments').select('customer_gid,sample_order_gid,enabled').in('customer_gid', ids),
  ]);
  if (messageResult.error || enrollmentResult.error) throw Error('SAMPLE_TO_SALE_MESSAGE_LEDGER_UNAVAILABLE');
  for (const id of ids) result.set(id, {
    messages: ((messageResult.data ?? []).filter(row => row.customer_gid === id)) as MessageRow[],
    enrollment: ((enrollmentResult.data ?? []).find(row => row.customer_gid === id) ?? null) as EnrollmentRow | null,
  });
  return result;
}

/** Staff review reads only current, eligible Shopify candidates and private send history. */
export async function readManualSampleToSaleReview(sampleOrderId: string) {
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(sampleOrderId)) throw Error('SAMPLE_TO_SALE_ORDER_INVALID');
  const scan = await readSampleToSalePilot();
  if (scan.partial) throw Error('SAMPLE_TO_SALE_PARTIAL_SHOPIFY_SCAN');
  const candidate = scan.candidates.find(item => item.orderId === sampleOrderId);
  if (!candidate || candidate.reason !== 'ready' || !candidate.customerId || !validEmail(candidate.email))
    throw Error('SAMPLE_TO_SALE_INELIGIBLE');
  const { data, error } = await db().from('sample_to_sale_messages')
    .select('stage,state,sample_order_gid,sent_at').eq('customer_gid', candidate.customerId);
  if (error) throw Error('SAMPLE_TO_SALE_MESSAGE_LEDGER_UNAVAILABLE');
  const messages = (data ?? []) as MessageRow[];
  if (messages.some(message => message.sample_order_gid !== sampleOrderId))
    throw Error('SAMPLE_TO_SALE_PRIOR_SAMPLE_JOURNEY');
  const offerSentAt = messages.find(message => message.stage === 'offer' && message.state === 'SENT')?.sent_at ?? null;
  const stage = dueSampleEmailStage(candidate.stage, offerSentAt);
  const { data: enrollment, error: enrollmentError } = await db().from('sample_to_sale_enrolments')
    .select('customer_gid,sample_order_gid,enabled').eq('customer_gid', candidate.customerId).maybeSingle();
  if (enrollmentError) throw Error('SAMPLE_TO_SALE_ENROLMENT_UNAVAILABLE');
  if (enrollment && enrollment.sample_order_gid !== sampleOrderId) throw Error('SAMPLE_TO_SALE_PRIOR_SAMPLE_JOURNEY');
  return { candidate, stage, messages, suppressed: await suppressed(candidate.customerId), enrollment: enrollment as EnrollmentRow | null };
}

/** An explicit staff action enrols or pauses one sample order. The scheduler still rechecks Shopify at send time. */
export async function setSampleToSaleAutomation(sampleOrderId: string, enabled: boolean, actorId: string) {
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(sampleOrderId)) throw Error('SAMPLE_TO_SALE_ORDER_INVALID');
  if (enabled) {
    const review = await readManualSampleToSaleReview(sampleOrderId);
    if (review.suppressed || review.candidate.stage === 'expired') throw Error('SAMPLE_TO_SALE_REVIEW_CHANGED');
    const { error } = await db().from('sample_to_sale_enrolments').upsert({
      customer_gid: review.candidate.customerId!, sample_order_gid: sampleOrderId,
      enabled: true, approved_by: actorId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'customer_gid' });
    if (error) throw Error('SAMPLE_TO_SALE_ENROLMENT_UNAVAILABLE');
    return review.candidate;
  }
  const { data, error: readError } = await db().from('sample_to_sale_enrolments')
    .select('customer_gid').eq('sample_order_gid', sampleOrderId).maybeSingle();
  if (readError || !data) throw Error('SAMPLE_TO_SALE_ENROLMENT_UNAVAILABLE');
  const { error } = await db().from('sample_to_sale_enrolments').update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('customer_gid', data.customer_gid).eq('sample_order_gid', sampleOrderId);
  if (error) throw Error('SAMPLE_TO_SALE_ENROLMENT_UNAVAILABLE');
  return { firstName: 'Customer' };
}

/** Called only after staff authentication and an explicit review-and-send form POST. */
export async function sendManualSampleToSaleEmail(sampleOrderId: string, expectedStage: FollowUpStage) {
  const review = await readManualSampleToSaleReview(sampleOrderId);
  if (!review.stage || review.stage !== expectedStage || review.suppressed) throw Error('SAMPLE_TO_SALE_REVIEW_CHANGED');
  if (review.messages.some(message => message.stage === review.stage && message.state === 'SENT'))
    throw Error('SAMPLE_TO_SALE_EMAIL_ALREADY_SENT');
  const outcome = await deliver(review.candidate, review.stage, review.candidate.stage, '/admin/sample-to-sale/send');
  if (outcome === 'REVIEW') throw Error('SAMPLE_TO_SALE_REVIEW_CHANGED');
  if (outcome !== 'SENT') throw Error('SAMPLE_TO_SALE_EMAIL_ALREADY_SENT');
  return { candidate: review.candidate, stage: review.stage };
}

/** Gated scheduler. Never sends on a partial Shopify scan or without current consent. */
export async function sendSampleToSaleJourney() {
  if (process.env.CURTAINSUK_SAMPLE_TO_SALE_EMAIL_ENABLED !== 'true') return;
  sendingConfig();
  const canary = new Set((process.env.CURTAINSUK_SAMPLE_TO_SALE_EMAIL_CANARY_CUSTOMERS ?? '')
    .split(',').map(value => value.trim()).filter(value => /^gid:\/\/shopify\/Customer\/\d+$/.test(value)));
  const scan = await readSampleToSalePilot();
  if (scan.partial) throw Error('SAMPLE_TO_SALE_PARTIAL_SHOPIFY_SCAN');
  const { data: enrollments, error: enrollmentError } = await db().from('sample_to_sale_enrolments')
    .select('customer_gid,sample_order_gid,enabled').eq('enabled', true);
  if (enrollmentError) throw Error('SAMPLE_TO_SALE_ENROLMENT_UNAVAILABLE');
  const approved = new Map((enrollments ?? []).map(row => [row.customer_gid, row.sample_order_gid]));
  const seen = new Set<string>();
  for (const candidate of scan.candidates) {
    if (candidate.reason !== 'ready' || !candidate.customerId || !validEmail(candidate.email) ||
      !(canary.has(candidate.customerId) || approved.get(candidate.customerId) === candidate.orderId) ||
      seen.has(candidate.customerId)) continue;
    seen.add(candidate.customerId);
    const { data: history, error: historyError } = await db().from('sample_to_sale_messages')
      .select('stage,state,sample_order_gid,sent_at').eq('customer_gid', candidate.customerId);
    if (historyError) throw Error('SAMPLE_TO_SALE_MESSAGE_LEDGER_UNAVAILABLE');
    const messages = (history ?? []) as MessageRow[];
    if (messages.some(message => message.sample_order_gid !== candidate.orderId)) continue;
    const offerSentAt = messages.find(message => message.stage === 'offer' && message.state === 'SENT')?.sent_at ?? null;
    const step = dueSampleEmailStage(candidate.stage, offerSentAt);
    if (!step || messages.some(message => message.stage === step && message.state === 'SENT')) continue;
    try { await deliver(candidate, step, candidate.stage, '/api/cron/error-centre-digest', true); }
    catch { /* The provider failure was recorded by deliver; the next customer can still be checked. */ }
  }
}
