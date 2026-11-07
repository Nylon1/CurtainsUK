import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import { recordOperationalError } from './operational-error';
import { promotionCode, promotionCodeHash } from './sample-to-sale-code';
import { sampleToSaleEmail, type FollowUpStage } from './sample-to-sale-email';
import { issueSampleToSaleCode, readSampleToSalePilot } from './sample-to-sale-server';
import { sampleToSaleUnsubscribeUrl } from './sample-to-sale-unsubscribe';
import type { PilotCandidate } from './sample-to-sale';

const previousStage: Partial<Record<FollowUpStage,FollowUpStage>> = {
  inspiration:'check_in', offer:'inspiration', reminder:'offer',
};
const db = () => createSupplierServiceClient();
const validEmail = (email: string | null): email is string => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

async function previouslySent(candidate: PilotCandidate, stage: FollowUpStage): Promise<boolean> {
  const previous = previousStage[stage];
  if (!previous) return true;
  const {data,error} = await db().from('sample_to_sale_messages').select('state')
    .eq('customer_gid',candidate.customerId!).eq('stage',previous).maybeSingle();
  if (error) throw Error('SAMPLE_TO_SALE_MESSAGE_LEDGER_UNAVAILABLE');
  return data?.state === 'SENT';
}

async function existingOffer(candidate: PilotCandidate) {
  const {data,error} = await db().from('sample_to_sale_offers')
    .select('id,code_hash,expires_at,state').eq('customer_gid',candidate.customerId!).maybeSingle();
  if (error) throw Error('SAMPLE_TO_SALE_OFFER_UNAVAILABLE');
  if (!data || data.state !== 'AVAILABLE' || Date.parse(data.expires_at) <= Date.now()) return null;
  const secret = process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET ?? '';
  if (secret.length < 32) throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  const code = promotionCode(data.id,secret);
  if (promotionCodeHash(code) !== data.code_hash) throw Error('SAMPLE_TO_SALE_CONFIGURATION_REQUIRED');
  return {code,expiresAt:data.expires_at};
}

async function recordState(candidate: PilotCandidate, stage: FollowUpStage, state: 'SENT'|'FAILED'|'REVIEW', providerId?: string) {
  const update: Record<string,unknown> = {state,updated_at:new Date().toISOString()};
  if (state==='SENT') {update.sent_at=new Date().toISOString();update.provider_id=providerId;}
  const {error} = await db().from('sample_to_sale_messages').update(update)
    .eq('customer_gid',candidate.customerId!).eq('stage',stage).eq('state','SENDING');
  if (error) throw Error('SAMPLE_TO_SALE_MESSAGE_LEDGER_UNAVAILABLE');
}

/** Gated scheduler. Never sends on a partial Shopify scan or without current consent. */
export async function sendSampleToSaleJourney() {
  if (process.env.CURTAINSUK_SAMPLE_TO_SALE_EMAIL_ENABLED !== 'true') return;
  const from = process.env.CURTAINSUK_SAMPLE_TO_SALE_FROM ?? '';
  const secret = process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET ?? '';
  const canary = new Set((process.env.CURTAINSUK_SAMPLE_TO_SALE_EMAIL_CANARY_CUSTOMERS ?? '').split(',').map(value=>value.trim())
    .filter(value=>/^gid:\/\/shopify\/Customer\/\d+$/.test(value)));
  if (!/^.+<[^<>\s]+@curtainsuk\.com>$/.test(from) || secret.length<32 || !process.env.RESEND_API_KEY)
    throw Error('SAMPLE_TO_SALE_EMAIL_CONFIGURATION_REQUIRED');
  if(!canary.size)throw Error('SAMPLE_TO_SALE_EMAIL_CANARY_REQUIRED');
  const scan = await readSampleToSalePilot();
  if (scan.partial) throw Error('SAMPLE_TO_SALE_PARTIAL_SHOPIFY_SCAN');
  const seen = new Set<string>();
  for (const candidate of scan.candidates) {
    const stage = candidate.stage;
    if (candidate.reason!=='ready' || !candidate.customerId || !canary.has(candidate.customerId) || !validEmail(candidate.email) ||
      !['check_in','inspiration','offer','reminder'].includes(stage) || seen.has(candidate.customerId)) continue;
    seen.add(candidate.customerId);
    const step=stage as FollowUpStage;
    if (!await previouslySent(candidate,step)) continue;
    const {data:suppression,error:suppressionError}=await db().from('sample_to_sale_unsubscribes')
      .select('customer_gid').eq('customer_gid',candidate.customerId).maybeSingle();
    if(suppressionError)throw Error('SAMPLE_TO_SALE_SUPPRESSION_UNAVAILABLE');
    if(suppression)continue;
    const {data:claimed,error:claimError}=await db().rpc('claim_sample_to_sale_message',{
      p_customer_gid:candidate.customerId,p_stage:step,p_sample_order_gid:candidate.orderId,p_recipient:candidate.email,
    });
    if(claimError)throw Error('SAMPLE_TO_SALE_MESSAGE_CLAIM_FAILED');
    if(!claimed)continue;
    try {
      const fresh=await readSampleToSalePilot();
      const current=fresh.candidates.find(item=>item.orderId===candidate.orderId);
      if(fresh.partial || !current || current.reason!=='ready' || current.stage!==step ||
        current.customerId!==candidate.customerId || current.email!==candidate.email) {
        await recordState(candidate,step,'REVIEW');
        continue;
      }
      const {data:lateSuppression,error:lateError}=await db().from('sample_to_sale_unsubscribes')
        .select('customer_gid').eq('customer_gid',candidate.customerId).maybeSingle();
      if(lateError)throw Error('SAMPLE_TO_SALE_SUPPRESSION_UNAVAILABLE');
      if(lateSuppression){await recordState(candidate,step,'REVIEW');continue;}
      let offer: {code:string;expiresAt:string}|null=null;
      if(step==='offer')offer=await issueSampleToSaleCode(candidate.orderId);
      if(step==='reminder')offer=await existingOffer(candidate);
      if((step==='offer'||step==='reminder')&&!offer){await recordState(candidate,step,'REVIEW');continue;}
      const unsubscribeUrl=sampleToSaleUnsubscribeUrl(candidate.customerId,secret);
      const expiry=offer ? new Date(offer.expiresAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}) : undefined;
      const email=sampleToSaleEmail(current,step,{code:offer?.code,expiry,unsubscribeUrl});
      const result=await new Resend(process.env.RESEND_API_KEY).emails.send({
        from,to:[candidate.email],bcc:email.bcc,replyTo:'enquiries@curtainsuk.com',
        subject:email.subject,text:email.text,html:email.html,
        headers:{'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},
      },{idempotencyKey:`curtainsuk-sample-to-sale/${candidate.customerId.split('/').at(-1)}/${step}`});
      if(result.error||!result.data?.id)throw Error('SAMPLE_TO_SALE_EMAIL_SEND_FAILED');
      await recordState(candidate,step,'SENT',result.data.id);
    } catch {
      await recordState(candidate,step,'FAILED');
      await recordOperationalError({routePath:'/api/cron/error-centre-digest',code:'SAMPLE_TO_SALE_EMAIL_FAILED',source:'HANDLED'});
    }
  }
}
