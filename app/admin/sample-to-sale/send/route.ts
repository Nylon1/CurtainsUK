import { createClient } from '@/lib/supabase/server';
import { hasSupplierAdminRole } from '@/lib/supplier-intelligence/authz';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { SAMPLE_TO_SALE_BCC } from '@/lib/storefront/sample-to-sale-email';
import { readManualSampleToSaleReview, sendManualSampleToSaleEmail, setSampleToSaleAutomation } from '@/lib/storefront/sample-to-sale-email-server';
import { validSampleToSaleStaffForm } from '@/lib/storefront/sample-to-sale-staff-form';
import { pilotMessage } from '@/lib/storefront/sample-to-sale';
import type { FollowUpStage } from '@/lib/storefront/sample-to-sale-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const labels: Record<FollowUpStage, string> = {
  check_in: 'Check in', inspiration: 'Inspiration', offer: 'Personal 10% offer', reminder: 'Offer reminder',
};
const page = (body: string, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review sample email | CurtainsUK</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f3ec;color:#173b31;font:16px/1.6 Arial,sans-serif}main{max-width:850px;margin:auto;padding:28px 18px 70px}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:clamp(34px,5vw,56px);line-height:1.08;margin:18px 0}h2{font-size:25px}a{color:#173b31}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #a17b3d;outline-offset:3px}.hero{background:#173b31;color:#fff;padding:32px;border-radius:18px}.hero a{color:#fff}.hero p{color:#e2e7de}.card{background:#fff;border:1px solid #d9dfd4;border-radius:16px;padding:25px;margin-top:18px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:700;color:#6e795e}.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.fact{border-top:1px solid #e2e6de;padding-top:10px;overflow-wrap:anywhere}.fact strong{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.note{background:#e9eee7;padding:16px;border-radius:10px}.warning{background:#fff0d9}.history{margin:0;padding-left:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f3ec;padding:16px;border-radius:10px;font:14px/1.55 Arial,sans-serif}.confirm{display:flex;align-items:flex-start;gap:10px;margin:20px 0}.confirm input{width:20px;height:20px;margin-top:3px}.button{display:inline-block;border:0;background:#173b31;color:white;text-decoration:none;padding:14px 22px;min-height:48px;font:700 15px Arial,sans-serif;cursor:pointer;border-radius:5px}.button:disabled{opacity:.5}.secondary{background:#e9eee7;color:#173b31}@media(max-width:600px){.facts{grid-template-columns:1fr}.hero{padding:24px}.card{padding:20px}}
  </style></head><body><main>${body}</main></body></html>`, { status, headers: {
  ...PRIVATE_NO_STORE_HEADERS, 'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
} });

async function staffStatus() {
  const auth = await createClient();
  const { data: { user }, error } = await auth.auth.getUser();
  return { user, status: error ? 503 : !user ? 401 : user.is_anonymous || !hasSupplierAdminRole(user.app_metadata) ? 403 : 200 };
}

function statusMessage(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'SAMPLE_TO_SALE_EMAIL_ALREADY_SENT') return 'This email was already sent or is being processed. Open the customer card to review its status.';
  if (code === 'SAMPLE_TO_SALE_REVIEW_CHANGED') return 'The customer or email stage changed. Review the latest details before sending.';
  if (code === 'SAMPLE_TO_SALE_INELIGIBLE' || code === 'SAMPLE_TO_SALE_WINDOW_CLOSED') return 'This customer is not currently eligible for a sample follow-up email.';
  if (code === 'SAMPLE_TO_SALE_PRIOR_SAMPLE_JOURNEY') return 'A previous sample journey exists for this customer. Review it before sending another email.';
  if (code === 'SAMPLE_TO_SALE_ENROLMENT_UNAVAILABLE') return 'Automatic email settings are temporarily unavailable. No setting was changed.';
  if (code === 'SAMPLE_TO_SALE_PARTIAL_SHOPIFY_SCAN') return 'Shopify history is incomplete. No email was sent.';
  if (code === 'SAMPLE_TO_SALE_EMAIL_DISABLED' || code === 'SAMPLE_TO_SALE_EMAIL_CONFIGURATION_REQUIRED') return 'Email sending is temporarily unavailable. No email was sent.';
  return 'The email could not be sent. Review the customer and try again later.';
}

export async function GET(request: Request) {
  const auth = await staffStatus();
  if (auth.status !== 200) return page('<p>Staff sign-in required. <a href="/admin/login?next=%2Fadmin%2Fsample-to-sale">Sign in</a></p>', auth.status);
  const order = new URL(request.url).searchParams.get('order') ?? '';
  try {
    const review = await readManualSampleToSaleReview(order);
    const { candidate, stage, messages } = review;
    const message = stage ? pilotMessage(candidate, stage) : null;
    const sent = stage ? messages.find(row => row.stage === stage && row.state === 'SENT') : null;
    const history = messages.filter(row => row.state === 'SENT').map(row =>
      `<li>${escape(labels[row.stage])}: submitted ${escape(row.sent_at ? new Date(row.sent_at).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : 'previously')}</li>`).join('');
    const preview = stage ? `/admin/sample-to-sale/preview?order=${encodeURIComponent(order)}&stage=${stage}` : '';
    const delivered = candidate.deliveredAt ? new Date(candidate.deliveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }) : '';
    const blocked = review.suppressed || Boolean(sent);
    const autoEnabled = review.enrollment?.enabled === true;
    return page(`<a href="/admin/sample-to-sale">← All sample customers</a><section class="hero"><p class="eyebrow">Staff review</p><h1>Review before you send.</h1><p>This action sends one email to the customer shown below. The customer's subscription and order history are checked again when you click Send.</p></section>
      <section class="card"><p class="eyebrow">${escape(candidate.orderName)} · ${stage ? escape(labels[stage]) : 'No email due now'}</p><div class="facts"><div class="fact"><strong>To</strong>${escape(candidate.email)}</div><div class="fact"><strong>Blind copy</strong>${escape(SAMPLE_TO_SALE_BCC)}</div><div class="fact"><strong>Sample delivered</strong>${escape(delivered)}</div><div class="fact"><strong>Marketing status</strong>${escape(candidate.marketingState)}</div></div>
      ${history ? `<h2>Previously sent</h2><ul class="history">${history}</ul>` : ''}
      ${review.suppressed ? '<p class="note warning">This customer opted out of sample follow-ups. No email can be sent.</p>' : sent ? '<p class="note">This stage was already submitted for delivery. It cannot be sent twice.</p>' : ''}
      <p class="note">Automatic emails: <strong>${autoEnabled ? 'On' : 'Off'}</strong>. When on, the next due email is sent after a fresh eligibility check. Sent stages are never repeated.</p>
      ${message ? `<h2>${escape(message.subject)}</h2><p><a href="${escape(preview)}" target="_blank" rel="noopener noreferrer">Open the designed email preview ↗</a></p><pre>${escape(message.body)}</pre>` : '<p class="note">No email is due now. Automatic follow-up can be approved for a future stage after confirmed delivery.</p>'}
      ${(stage === 'offer' || stage === 'reminder') ? '<p class="note">The valid personal code and exact expiry will replace the placeholders when the email is sent. An offer code is created automatically if needed.</p>' : ''}
      ${blocked || !stage ? '' : `<form method="post"><input type="hidden" name="sampleOrderId" value="${escape(order)}"><input type="hidden" name="stage" value="${escape(stage)}"><label class="confirm"><input type="checkbox" name="confirm" value="send" required><span>I checked the recipient and approved this email.</span></label><button class="button" type="submit">Send ${escape(labels[stage])} email now</button></form>`}
      ${review.suppressed ? '' : autoEnabled ? `<form method="post"><input type="hidden" name="action" value="automation"><input type="hidden" name="sampleOrderId" value="${escape(order)}"><input type="hidden" name="enabled" value="false"><button class="button secondary" type="submit">Pause automatic emails</button></form>` : candidate.stage === 'expired' ? '' : `<form method="post"><input type="hidden" name="action" value="automation"><input type="hidden" name="sampleOrderId" value="${escape(order)}"><input type="hidden" name="enabled" value="true"><label class="confirm"><input type="checkbox" name="confirm" value="auto" required><span>I approve automatic sample emails for this customer after reviewing their subscription and delivery.</span></label><button class="button secondary" type="submit">Start automatic emails</button></form>`}
      </section>`, 200);
  } catch (error) {
    return page(`<a href="/admin/sample-to-sale">← All sample customers</a><section class="card"><h1>Email unavailable</h1><p>${escape(statusMessage(error))}</p></section>`, 409);
  }
}

export async function POST(request: Request) {
  const auth = await staffStatus();
  if (auth.status !== 200) return page('Staff sign-in required.', auth.status);
  if (!validSampleToSaleStaffForm(request)) return page('<p>Invalid request. <a href="/admin/sample-to-sale">Return to sample customers</a></p>', 400);
  const form = await request.formData();
  const order = form.get('sampleOrderId');
  const stage = form.get('stage');
  if (form.get('action') === 'automation') {
    const enabled = form.get('enabled') === 'true';
    if (typeof order !== 'string' || (enabled && form.get('confirm') !== 'auto'))
      return page('<p>Review and confirm the automatic emails before changing this setting.</p>', 400);
    try {
      const candidate = await setSampleToSaleAutomation(order, enabled, auth.user!.id);
      return page(`<a href="/admin/sample-to-sale">← All sample customers</a><section class="hero"><h1>Automatic emails ${enabled ? 'started' : 'paused'}.</h1><p>${escape(candidate.firstName)}'s sample journey is ${enabled ? 'approved for the next due email' : 'paused'}. Every send checks current subscription, delivery, order history and opt-outs. Previously sent emails stay in the customer history.</p></section>`);
    } catch (error) {
      return page(`<a href="/admin/sample-to-sale">← All sample customers</a><section class="card"><h1>Setting unchanged</h1><p>${escape(statusMessage(error))}</p></section>`, 409);
    }
  }
  if (form.get('confirm') !== 'send' || typeof order !== 'string' || typeof stage !== 'string' ||
    !['check_in', 'inspiration', 'offer', 'reminder'].includes(stage))
    return page('<p>Confirm the reviewed email before sending. <a href="/admin/sample-to-sale">Return to sample customers</a></p>', 400);
  try {
    const result = await sendManualSampleToSaleEmail(order, stage as FollowUpStage);
    return page(`<a href="/admin/sample-to-sale">← All sample customers</a><section class="hero"><p class="eyebrow">Submitted for delivery</p><h1>${escape(labels[result.stage])} email sent.</h1><p>The message for ${escape(result.candidate.firstName)} was accepted by the email provider. The private send record prevents a duplicate. A delivery receipt does not guarantee inbox placement.</p></section><section class="card"><p><strong>Recipient:</strong> ${escape(result.candidate.email)}</p><p><strong>Blind copy:</strong> ${escape(SAMPLE_TO_SALE_BCC)}</p><p>Return to this customer card to review the next stage when it becomes due.</p></section>`);
  } catch (error) {
    return page(`<a href="/admin/sample-to-sale">← All sample customers</a><section class="card"><h1>Email not sent</h1><p>${escape(statusMessage(error))}</p><p><a href="/admin/sample-to-sale/send?order=${encodeURIComponent(order)}">Review again</a></p></section>`, 409);
  }
}
