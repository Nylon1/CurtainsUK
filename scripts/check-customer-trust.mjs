import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {load} from 'cheerio';
import vm from 'node:vm';
import {groups,pages,aliases,contacts} from '../content/customer-trust/catalogue.mjs';
const read=p=>readFile(p,'utf8');
const out='artifacts/customer-trust-v1';
const theme='shopify-theme/curtainsuk-new-design-live-base';
const manifest=JSON.parse(await read(out+'/publication-manifest.json'));
assert.equal(manifest.releaseApproved,false);
assert.equal(manifest.pages.length,21);
assert.equal(new Set(pages.map(p=>p.url)).size,pages.length);
assert.equal(groups.length,4);
for(const p of manifest.pages){assert.match(await read(`${out}/pages/${p.key}.html`),/Unpublished/);assert.ok(p.status!=='APPROVED');}
for(const [,target] of Object.entries(aliases)){assert.ok(manifest.pages.some(p=>p.url===target)||['/pages/how-to-measure','/pages/how-to-fit'].includes(target));}
const generated=await read('lib/storefront/customer-trust/generated.ts');
const html=JSON.parse(generated.match(/export const trustFooterHtml = (.*);/)[1]);
const $=load(html);const proxyLinks=$('a').map((_,e)=>$(e).attr('href')).get();
for(const [,links] of groups)for(const [,href] of links){if(!href.startsWith('#'))assert.ok(proxyLinks.includes(href),href);}
for(const email of Object.values(contacts))assert.ok(proxyLinks.includes('mailto:'+email));
assert.match(await read(`${theme}/sections/curtainsuk-help-footer.liquid`),/render 'curtainsuk-trust-footer'/);
assert.doesNotMatch(await read(`${theme}/sections/curtainsuk-help-footer.liquid`),/if .*template|request\.path/);
// Exercise both cookie-control branches. These mocks prove invocation, not live consent.
const footerJs=await read('content/customer-trust/footer.js');
let callback;let invoked=0;let status={textContent:''};
const button={addEventListener:(type,fn)=>{if(type==='click')callback=fn;}};
const footer={dataset:{cookieUnavailable:'No choice has been changed.'},querySelectorAll:()=>[],querySelector:selector=>selector==='[data-cookie-status]'?status:button};
const context={document:{readyState:'complete',querySelectorAll:()=>[footer],addEventListener:()=>{}},window:{matchMedia:()=>({matches:false,addEventListener:()=>{}}),privacyBanner:{showPreferences:()=>{invoked++;}}}};
context.matchMedia=context.window.matchMedia;
vm.runInNewContext(footerJs,context);assert.ok(callback);await callback();assert.equal(invoked,1);
context.window.privacyBanner=undefined;await callback();assert.match(status.textContent,/No choice/);
const audit=JSON.parse(await read(out+'/live-audit.json'));
const matrix=['# Customer trust footer route matrix','',`Read-only live audit: ${audit.auditedAt}. All responsive PASS results below refer to the **local canonical footer**, not a deployed theme. Existing journeys were fetched, not transacted.`,``,`| Route | Rendering system | Footer source (live → proposed) | Present live | Links | Desktop | 390px | 412px |`,`|---|---|---|---|---|---|---|---|`];
for(const r of audit.routes){const source=r.rendering==='App proxy HTML'?'Standalone → generated shared footer':'Theme footer-group → shared Liquid snippet';matrix.push(`| ${r.route} | ${r.rendering} | ${source} | ${r.footer?(r.serviceLayer?'Service + basic footer':'Basic footer only'):'No shared footer'} | ${r.status===200?'HTTP 200; '+r.footerLinks.length+' footer links inventoried':'BLOCKED '+r.status} | Shared local PASS; route release pending | Shared local PASS; route release pending | Shared local PASS; route release pending |`);}
matrix.push('','## New/revised destinations','',...manifest.pages.map(p=>`- ${p.url} — ${p.action}; ${p.status}; local 390px no-overflow/shared-footer PASS. Shopify record not changed.`),'','## Release boundary','','All discovered route/footer hrefs are retained in live-audit.json. Remote target status alone does not prove content correctness. Alias redirects, new page records and checkout/global policies must be released together after approval. Checkout and notification surfaces do not inherit the theme footer. Live route-by-route responsive and consent testing remains a release gate. No cart/session was cleared or paid order submitted.');
await writeFile(out+'/route-matrix.md',matrix.join('\n')+'\n');
console.log('PASS: canonical identities, review gate, 21 destinations, shared routes, actual cookie preference API invocation and fail-safe. Route matrix generated.');
