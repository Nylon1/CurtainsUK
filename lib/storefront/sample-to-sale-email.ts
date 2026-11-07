import { displaySampleFabricName, fabricPreviewUrl, pilotMessage, type PilotCandidate, type PilotStage } from './sample-to-sale';

export type FollowUpStage = Exclude<PilotStage, 'not_ready' | 'expired'>;
export const SAMPLE_TO_SALE_BCC = 'hm4335575@gmail.com';
export const SAMPLE_TO_SALE_PHONE = '0800 772 0367';

type EmailOptions = {
  code?: string;
  expiry?: string;
  unsubscribeUrl: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

/** Pure renderer. The caller must recheck consent and suppression before sending. */
export function sampleToSaleEmail(candidate: PilotCandidate, stage: FollowUpStage, options: EmailOptions) {
  if (!options.unsubscribeUrl || !/^https:\/\//.test(options.unsubscribeUrl)) throw Error('SAMPLE_TO_SALE_UNSUBSCRIBE_REQUIRED');
  if ((stage === 'offer' || stage === 'reminder') && (!options.code || !options.expiry)) throw Error('SAMPLE_TO_SALE_CODE_REQUIRED');
  const message = pilotMessage(candidate, stage);
  const code = options.code ?? '[UNIQUE CODE]';
  const expiry = options.expiry ?? '[EXPIRY DATE]';
  const body = message.body.replaceAll('[UNIQUE CODE]', code).replaceAll('[EXPIRY DATE]', expiry);
  const link = fabricPreviewUrl(candidate.fabricId);
  const labels: Record<FollowUpStage, { eyebrow: string; title: string; intro: string; cta: string }> = {
    check_in: {
      eyebrow: 'A note from CurtainsUK', title: 'How does it feel at home?',
      intro: `Your ${displaySampleFabricName(candidate.fabricName)} sample deserves a moment in your own light. We would love to hear what you think.`,
      cta: 'See your fabric in a room',
    },
    inspiration: {
      eyebrow: 'The next chapter', title: 'Picture the possibilities.',
      intro: `See how ${displaySampleFabricName(candidate.fabricName)} could work across your room, from beautifully made curtains to Roman blinds and cushions.`,
      cta: 'Explore your fabric',
    },
    offer: {
      eyebrow: 'A personal invitation', title: 'A little more for your home.',
      intro: `As a thank-you for choosing a ${displaySampleFabricName(candidate.fabricName)} sample, enjoy 10% off your first qualifying product order.`,
      cta: 'Create your room',
    },
    reminder: {
      eyebrow: 'Your invitation is still open', title: 'Your room is waiting.',
      intro: `Your personal offer for ${displaySampleFabricName(candidate.fabricName)} is still available. We are here if you would like help before it ends.`,
      cta: 'Return to your room',
    },
  };
  const content = labels[stage];
  const primaryUrl = stage === 'offer' || stage === 'reminder'
    ? 'https://www.curtainsuk.com/pages/build-my-rooms' : link;
  const offerBlock = stage === 'offer' || stage === 'reminder'
    ? `<tr><td style="padding:0 34px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d8c8a5;background:#f8f5ec"><tr><td style="padding:22px 24px"><p style="margin:0 0 6px;font:700 11px/1.5 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#927a4b">Your private code</p><p style="margin:0 0 6px;font:26px/1.3 Georgia,serif;letter-spacing:1px;color:#173b31;overflow-wrap:anywhere">${escapeHtml(code)}</p><p style="margin:0;font:14px/1.6 Arial,sans-serif;color:#4a5b52">Valid until ${escapeHtml(expiry)}. Minimum product order £150.</p></td></tr></table></td></tr>` : '';
  const terms = stage === 'offer' || stage === 'reminder'
    ? 'The 10% applies to eligible products before sample credit. Delivery is excluded. One use per customer. It cannot be combined with other promotional offers. Sample credit may also be used on curtains.'
    : stage === 'inspiration' ? 'If you received a sample credit code, you can enter it in Shopping Cart on an eligible curtain order.' : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(message.subject)}</title></head><body style="margin:0;padding:0;background:#eeeae0;color:#173b31;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eeeae0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf8;border:1px solid #d8d1c3"><tr><td align="center" style="padding:30px 24px 25px;background:#153c32;color:#fffdf8"><p style="margin:0;font:26px/1.1 Georgia,serif;letter-spacing:-.5px">CurtainsUK</p><p style="margin:7px 0 0;font:10px/1.4 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#d7c79e">Made for your home</p></td></tr><tr><td style="padding:40px 34px 24px"><p style="margin:0 0 15px;font:700 11px/1.5 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#9b8153">${escapeHtml(content.eyebrow)}</p><h1 style="margin:0 0 20px;font:38px/1.12 Georgia,serif;font-weight:400;color:#173b31">${escapeHtml(content.title)}</h1><p style="margin:0 0 18px;font:16px/1.7 Arial,sans-serif;color:#354c41">Hi ${escapeHtml(candidate.firstName)},</p><p style="margin:0 0 18px;font:16px/1.7 Arial,sans-serif;color:#354c41">${escapeHtml(content.intro)}</p><p style="margin:0;font:16px/1.7 Arial,sans-serif;color:#354c41">If you would like help with colour, measurements or lining, just reply. We would be delighted to help.</p></td></tr>${offerBlock}<tr><td style="padding:8px 34px 28px"><a href="${escapeHtml(primaryUrl)}" style="display:inline-block;min-height:44px;box-sizing:border-box;padding:14px 24px;background:#173b31;color:#fffdf8;text-decoration:none;font:700 14px/1.3 Arial,sans-serif;letter-spacing:.4px">${escapeHtml(content.cta)} &nbsp;→</a><p style="margin:18px 0 0;font:14px/1.6 Arial,sans-serif"><a href="${escapeHtml(link)}" style="color:#173b31;text-decoration:underline">View ${escapeHtml(displaySampleFabricName(candidate.fabricName))}</a></p></td></tr><tr><td style="padding:25px 34px;background:#f1eee5;border-top:1px solid #ddd5c5"><p style="margin:0 0 11px;font:23px/1.25 Georgia,serif;color:#173b31">A little guidance goes a long way.</p><p style="margin:0 0 17px;font:14px/1.6 Arial,sans-serif;color:#354c41">Speak to our team, Monday to Friday, 9am to 5pm.</p><a href="tel:+448007720367" style="display:inline-block;min-height:44px;box-sizing:border-box;padding:12px 18px;border:1px solid #173b31;color:#173b31;text-decoration:none;font:700 14px/1.4 Arial,sans-serif">Call us · ${SAMPLE_TO_SALE_PHONE}</a></td></tr><tr><td style="padding:22px 34px 26px;background:#153c32;color:#f5f1e8"><p style="margin:0 0 12px;font:15px/1.5 Georgia,serif">Warm regards,<br>The CurtainsUK Team</p>${terms ? `<p style="margin:0 0 15px;font:12px/1.6 Arial,sans-serif;color:#e0dcd2">${escapeHtml(terms)}</p>` : ''}<p style="margin:0;font:12px/1.6 Arial,sans-serif;color:#e0dcd2">You are receiving this sample follow-up because you subscribed to CurtainsUK emails. <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#fffdf8;text-decoration:underline">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`;
  const htmlWithAddress = html.replace('You are receiving this sample follow-up',
    'Apex Curtains Ltd trading as Curtains UK<br>36-44 Bolton Road, Blackburn, BB2 3FA<br><br>You are receiving this sample follow-up');
  const text = `${body}\n\nCall us: ${SAMPLE_TO_SALE_PHONE} (Mon - Fri, 9am - 5pm)\n\nApex Curtains Ltd trading as Curtains UK\n36-44 Bolton Road, Blackburn, BB2 3FA\n\nUnsubscribe: ${options.unsubscribeUrl}`;
  return { subject: message.subject, text, html: htmlWithAddress, bcc: [SAMPLE_TO_SALE_BCC] };
}
