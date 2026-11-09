/* CurtainsUK Customer Events custom pixel. Analytics permission only.
 * Sends fixed checkout stages and price bands; no contact, address, URL or discount code.
 */
(() => {
  const endpoint = 'https://curtainsuk-production-api.vercel.app/api/checkout-stage';
  const stages = {
    checkout_started: 'CHECKOUT_STARTED',
    checkout_contact_info_submitted: 'CONTACT_SUBMITTED',
    checkout_address_info_submitted: 'ADDRESS_SUBMITTED',
    checkout_shipping_info_submitted: 'SHIPPING_SUBMITTED',
    payment_info_submitted: 'PAYMENT_SUBMITTED',
    checkout_completed: 'CHECKOUT_COMPLETED',
  };
  let allowed = init.customerPrivacy?.analyticsProcessingAllowed === true;
  if (typeof customerPrivacy !== 'undefined')
    customerPrivacy.subscribe('visitorConsentCollected', event => {
      allowed = event.customerPrivacy?.analyticsProcessingAllowed === true;
    });
  const minor = value => {
    const amount = Number(value?.amount);
    return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000
      ? Math.round(amount * 100) : null;
  };
  function productMix(checkout) {
    const types = new Set();
    for (const item of checkout.lineItems || []) {
      const productType = (item.properties || []).find(property =>
        String(property.key || '').toLowerCase() === 'product type')?.value || '';
      const title = String(item.title || '');
      if (/curtain/i.test(productType) && !/track/i.test(productType) || /^made-to-measure curtains\b/i.test(title)) types.add('CURTAIN');
      if (/roman/i.test(productType) || /^made-to-measure roman blind\b/i.test(title)) types.add('ROMAN');
      if (/cushion/i.test(productType) || /^cushion:/i.test(title)) types.add('CUSHION');
      if (/track/i.test(productType) || /forest shuttle/i.test(title)) types.add('TRACK');
      if (/sample/i.test(productType) || /fabric sample/i.test(title)) types.add('SAMPLE');
    }
    const madeToMeasure = ['CURTAIN', 'ROMAN', 'CUSHION', 'TRACK'].filter(type => types.has(type));
    return madeToMeasure.length ? madeToMeasure.join('_') : types.has('SAMPLE') ? 'SAMPLE' : 'OTHER';
  }
  for (const [shopifyEvent, stage] of Object.entries(stages)) {
    analytics.subscribe(shopifyEvent, async event => {
      if (!allowed) return;
      const checkout = event.data?.checkout;
      if (!checkout || typeof checkout.token !== 'string' || !checkout.token || !event.id) return;
      let isTest = false;
      try { isTest = (await browser.sessionStorage.getItem('cuk_qa_telemetry')) === '1'; }
      catch { /* Storage can be unavailable in a pixel sandbox. */ }
      const payload = {
        eventId: String(event.id), checkoutToken: checkout.token, stage,
        productMix: productMix(checkout), totalMinor: minor(checkout.totalPrice),
        shippingMinor: minor(checkout.shippingLine?.price),
        hasDiscount: Array.isArray(checkout.discountApplications) && checkout.discountApplications.length > 0,
        isTest,
      };
      try {
        await fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch { /* Telemetry must never interrupt checkout. */ }
    });
  }
})();
