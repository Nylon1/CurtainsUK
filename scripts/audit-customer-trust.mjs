import { mkdir, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';
const routes = ['/', '/pages/fabric-library', '/pages/fabric-library?view=browse-fabrics', '/pages/fabric-library?view=browse-fabrics&fabric=sdg-f1681-03', '/pages/fabric-library?view=curtain-style', '/pages/how-to-measure', '/pages/how-to-fit', '/pages/solve-my-window', '/pages/curtain-visualiser', '/pages/samples', '/pages/contact-us', '/pages/about-us', '/pages/about-us-1', '/pages/faq', '/pages/faq-1', '/pages/privacy-policy', '/pages/terms-and-conditions', '/pages/cookies-policy', '/pages/media', '/pages/fabric-care-guide', '/pages/curtain-fabric-colour-guide', '/pages/curtain-gallery', '/pages/curtain-measuring-guide', '/pages/curtain-installation-guide', '/policies/refund-policy', '/policies/privacy-policy', '/policies/terms-of-service', '/policies/contact-information', '/policies/shipping-policy', '/cart', '/search', '/apps/curtainsuk-decision/consultation?experience=premium', '/apps/curtainsuk-decision/image-privacy'];
const output = [];
for (let offset = 0; offset < routes.length; offset += 4) {
  await Promise.all(routes.slice(offset, offset + 4).map(async route => {
    try {
      const response = await fetch('https://www.curtainsuk.com' + route);
      const html = await response.text();
      const $ = load(html);
      const footer = $('.cukservice,.cuk-guide-footer,footer');
      output.push({ route, status: response.status, title: $('title').text(), rendering: route.startsWith('/apps/') ? 'App proxy HTML' : 'Shopify Liquid', footer: footer.length > 0, serviceLayer: $('.cukservice').length > 0, footerLinks: footer.find('a').map((_,e)=>({label:$(e).text().trim(),href:$(e).attr('href')})).get(), text: $('main,.shopify-policy__container').text().replace(/\s+/g,' ').trim().slice(0,22000), scripts: $('script[src]').map((_,e)=>$(e).attr('src')).get(), consentIndicators: [...new Set((html.match(/.{0,80}(?:privacyBanner|consent-tracking|customerPrivacy|consent-tracking-api|cookie-banner|web-pixels-manager).{0,100}/g)||[]))], cookieNames: (response.headers.getSetCookie?.()||[]).map(s=>s.split('=')[0]) });
    } catch(error) { output.push({route,error:String(error)}); }
  }));
}
await mkdir('artifacts/customer-trust-v1',{recursive:true});
await writeFile('artifacts/customer-trust-v1/live-audit.json',JSON.stringify({auditedAt:new Date().toISOString(),routes:output},null,2)+'\n');
console.log(JSON.stringify(output.map(({route,status,footer,serviceLayer,consentIndicators})=>({route,status,footer,serviceLayer,consentIndicators})),null,2));
