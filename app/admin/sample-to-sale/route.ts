import { createClient } from '@/lib/supabase/server';
import { hasSupplierAdminRole } from '@/lib/supplier-intelligence/authz';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { issueSampleToSaleCode, readSampleToSalePilot } from '@/lib/storefront/sample-to-sale-server';
import { validSampleToSaleStaffForm } from '@/lib/storefront/sample-to-sale-staff-form';
import { displaySampleFabricName, fabricPreviewUrl, pilotMessage, type PilotCandidate, type PilotReason, type PilotStage } from '@/lib/storefront/sample-to-sale';
import { SAMPLE_TO_SALE_BCC } from '@/lib/storefront/sample-to-sale-email';
import { readSampleToSaleStaffState } from '@/lib/storefront/sample-to-sale-email-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const page = (body: string, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sample to sale | CurtainsUK</title><style>
  :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f5f3ec;color:#173b31;font:16px/1.55 Arial,sans-serif}main{max-width:1120px;margin:auto;padding:28px 22px 70px}h1,h2,h3{font-family:Georgia,serif;font-weight:400}h1{font-size:clamp(40px,6vw,70px);line-height:1.03;margin:20px 0}h2{font-size:30px;margin:0 0 5px}h3{font-size:23px;margin:0}a{color:inherit}a:focus-visible,summary:focus-visible{outline:3px solid #a17b3d;outline-offset:3px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:700}.hero{background:#173b31;color:#fff;padding:36px;border-radius:20px}.hero p{max-width:650px;color:#e2e7de}.tag{display:inline-block;background:#e0ede4;color:#173b31;padding:6px 10px;border-radius:30px;font-size:12px;font-weight:700}.hero .tag{background:#dce9c6}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 36px}.stat{background:#fff;border:1px solid #d9dfd4;border-radius:12px;padding:16px}.stat strong{display:block;font:34px Georgia,serif}.stat span{font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{background:#fff;border:1px solid #d9dfd4;border-radius:16px;padding:24px}.card p{margin:10px 0}.sub{color:#5b6a61;font-size:14px}.state{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.09em}.ready{color:#236946}.blocked{color:#945e24}.bar{height:5px;border-radius:5px;background:#e4e9e2;margin:16px 0}.bar>span{display:block;height:100%;border-radius:5px;background:#b6a06b}.links{display:flex;gap:18px;flex-wrap:wrap;margin:15px 0}.links a{font-size:14px;font-weight:700}.messages{margin-top:20px;border-top:1px solid #dfe3d9}details{border-bottom:1px solid #dfe3d9;padding:10px 0}summary{cursor:pointer;font-weight:700}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f3ec;border-radius:10px;padding:16px;font:14px/1.6 Arial,sans-serif}.note{background:#e9eee7;padding:18px;border-radius:12px;margin:24px 0;font-size:14px}@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.hero{padding:26px}}
  </style></head><body><main>${body}</main></body></html>`, {status,headers:{...PRIVATE_NO_STORE_HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});

const reasonText: Record<PilotReason, string> = {
  test_or_unpaid: 'Test or unpaid sample order', cancelled: 'Sample order cancelled',
  incomplete_order_data: 'Purchase history needs checking', already_bought: 'Product order found. Promotional journey stopped.',
  no_delivery: 'Delivery has not been confirmed', no_marketing_permission: 'No verified marketing subscription',
  do_not_action: 'Customer marked do not action', ready: 'Eligible for review',
};
const stageText: Record<PilotStage, string> = {not_ready:'Awaiting first step',check_in:'Check in',inspiration:'Inspiration',offer:'Offer review',reminder:'Reminder review',expired:'Journey window ended'};
const stages = ['check_in','inspiration','offer','reminder'] as const;

type StaffState = Awaited<ReturnType<typeof readSampleToSaleStaffState>>;
function renderCandidate(candidate: PilotCandidate, state: StaffState): string {
  const eligible = candidate.reason === 'ready';
  const history = candidate.customerId ? state.get(candidate.customerId) : undefined;
  const autoEnabled = history?.enrollment?.enabled === true && history.enrollment.sample_order_gid === candidate.orderId;
  const sent = history?.messages.filter(message => message.sample_order_gid === candidate.orderId && message.state === 'SENT') ?? [];
  const sentSummary = sent.length ? `<ul>${sent.map(message => `<li>${escape(stageText[message.stage])}: submitted ${escape(message.sent_at ? new Date(message.sent_at).toLocaleString('en-GB',{timeZone:'Europe/London'}) : 'previously')}</li>`).join('')}</ul>` : '<p class="sub">No emails sent yet.</p>';
  const delivered = candidate.deliveredAt ? new Date(candidate.deliveredAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}) : 'Unconfirmed';
  const link = fabricPreviewUrl(candidate.fabricId);
  return `<article class="card"><span class="eyebrow">${escape(candidate.orderName)} · ${escape(delivered)}</span><h3>${escape(displaySampleFabricName(candidate.fabricName))}</h3><p class="sub">${escape(candidate.firstName)} · Marketing: ${escape(candidate.marketingState.toLowerCase().replaceAll('_',' '))}</p><div class="bar"><span style="width:${eligible ? candidate.stage === 'check_in' ? '25%' : candidate.stage === 'inspiration' ? '50%' : candidate.stage === 'offer' ? '75%' : candidate.stage === 'reminder' ? '95%' : '100%' : '0%'}"></span></div><p class="state ${eligible?'ready':'blocked'}">${eligible?escape(stageText[candidate.stage]):escape(reasonText[candidate.reason])}</p><div class="links"><a href="${escape(link)}" target="_blank" rel="noopener noreferrer">View fabric ↗</a>${eligible?`<a href="/admin/sample-to-sale/send?order=${encodeURIComponent(candidate.orderId)}">Review &amp; send email ↗</a>`:''}</div><p class="sub"><strong>Automatic emails: ${autoEnabled ? 'On' : 'Off'}</strong></p>${autoEnabled?`<form method="post" action="/admin/sample-to-sale/send"><input type="hidden" name="action" value="automation"><input type="hidden" name="sampleOrderId" value="${escape(candidate.orderId)}"><input type="hidden" name="enabled" value="false"><button class="tag" type="submit">Pause automatic emails</button></form>`:''}<div class="messages"><p class="sub"><strong>Email history</strong></p>${sentSummary}<p class="sub">Email previews. Bcc: ${escape(SAMPLE_TO_SALE_BCC)}.</p>${stages.map(stage=>{const message=pilotMessage(candidate,stage);const preview=`/admin/sample-to-sale/preview?order=${encodeURIComponent(candidate.orderId)}&stage=${stage}`;return `<details><summary>${escape(stageText[stage])}</summary><p><strong>Subject:</strong> ${escape(message.subject)}</p><p><a href="${escape(preview)}" target="_blank" rel="noopener noreferrer">Open designed email preview ↗</a></p><pre>${escape(message.body)}</pre></details>`;}).join('')}</div></article>`;
}

export async function GET() {
  const auth = await createClient();
  const {data:{user},error} = await auth.auth.getUser();
  if (error || !user || user.is_anonymous || !hasSupplierAdminRole(user.app_metadata)) return page('<p><a href="/admin/login?next=%2Fadmin%2Fsample-to-sale">Staff sign-in required →</a></p>',error?503:user?403:401);
  const hero = '<a href="/admin">← Admin</a><section class="hero"><span class="tag">Private sample follow-up</span><h1>From sample<br>to finished room.</h1><p>Review each customer, send an email now or approve automatic follow-up. The customer cards show what was submitted and when.</p></section><section class="note"><h2>Add a verified email</h2><p>After you have seen the customer’s marketing permission, record its date, source and exact wording in the customer record. Check for any later opt-out. Then use Shopify Customers → Manage → Edit marketing settings to update that customer’s email status. For a new address, add the customer in Shopify first. Refresh this page to see the current status.</p><p><a class="tag" href="https://admin.shopify.com/store/madetomeasurecurtains/customers" target="_blank" rel="noopener noreferrer">Open Shopify Customers ↗</a></p></section>';
  try {
    const {candidates,partial} = await readSampleToSalePilot();
    const ready = candidates.filter(c=>c.reason==='ready').length;
    const bought = candidates.filter(c=>c.reason==='already_bought').length;
    const unconfirmed = candidates.filter(c=>c.reason==='no_delivery').length;
    const noConsent = candidates.filter(c=>c.reason==='no_marketing_permission').length;
    const state = await readSampleToSaleStaffState(candidates);
    return page(hero+`<section class="stats"><div class="stat"><strong>${candidates.length}</strong><span>Sample orders in view</span></div><div class="stat"><strong>${ready}</strong><span>Eligible for review</span></div><div class="stat"><strong>${bought}</strong><span>Already bought a product</span></div><div class="stat"><strong>${noConsent}</strong><span>No marketing subscription</span></div></section><h2>Customer journey</h2><p class="sub">Carrier delivery → day 3 check in → day 5 inspiration → day 7 offer → day 14 reminder. Emails are sent only after staff approve automatic follow-up or click Send.</p><div class="note">${unconfirmed} sample order${unconfirmed===1?'':'s'} still need delivery confirmation. A fulfilled order is not treated as delivered. ${partial?'Only the latest 50 orders are shown. Older orders need separate review.':''} Shopify order history and consent are checked before every send. The 10% offer applies to products in Shopping Cart and can be used with sample credit on curtains.</div><div class="grid">${candidates.map(candidate=>renderCandidate(candidate,state)).join('') || '<p>No paid sample orders in the current Shopify window.</p>'}</div>`);
  } catch {
    return page(hero+'<div class="note">The Shopify pilot data is temporarily unavailable. No messages have been sent.</div>',503);
  }
}

export async function POST(request:Request) {
  const auth=await createClient();
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user||user.is_anonymous||!hasSupplierAdminRole(user.app_metadata))return page('Staff sign-in required.',error?503:user?403:401);
  if(!validSampleToSaleStaffForm(request))return page('<p>Invalid request. <a href="/admin/sample-to-sale">Return to sample follow-up</a></p>',400);
  try{
    const form=await request.formData();
    const sampleOrderId=form.get('sampleOrderId');
    if(typeof sampleOrderId!=='string')throw Error('SAMPLE_TO_SALE_ORDER_INVALID');
    const result=await issueSampleToSaleCode(sampleOrderId);
    const expiry=new Date(result.expiresAt).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
    return page(`<a href="/admin/sample-to-sale">← Sample follow-up</a><section class="hero"><span class="tag">Personal code issued</span><h1>${escape(displaySampleFabricName(result.candidate.fabricName))}</h1><p>For ${escape(result.candidate.firstName)}. Copy this code into the approved offer message after checking consent again. The customer must sign in to redeem it.</p></section><section class="note"><h2>${escape(result.code)}</h2><p>Expires ${escape(expiry)}. One use on a first eligible product order of £150 or more. Applies to all products in the custom Shopping Cart; delivery is excluded. Sample credit can also be applied to curtains.</p></section>`);
  }catch(error){
    const code=error instanceof Error?error.message:'SAMPLE_TO_SALE_UNAVAILABLE';
    return page(`<p>The code was not issued: ${escape(code)}. <a href="/admin/sample-to-sale">Return to sample follow-up</a></p>`,409);
  }
}
