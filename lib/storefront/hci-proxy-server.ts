import 'server-only';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {customerHciEnabled,issueCustomerSession,verifyCustomerSession} from './customer-hci-session';
import {customerProxyHtml,customerProxyScript} from './hci-proxy-render';
import {consumeEndpointRateLimit} from './security/endpoint-rate-limit';
import {stagingHciIntegration} from './hci-integration-server';
import {PRIVATE_NO_STORE_HEADERS} from './security/http';
const secret=()=>process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET??'';
export function proxyCustomerSession() {
  if(!customerHciEnabled()) throw Error('HCI_DISABLED');
  // Shopify strips cookies. This grants only an anonymous customer's own session.
  // It is not an HCI/service credential; signed app-proxy auth precedes this call.
  return {capability:issueCustomerSession(secret()).token};
}
export async function proxyCustomerCommand(input:{capability?:string;command?:unknown}) {
  if(!customerHciEnabled()) throw Error('HCI_DISABLED');
  const owner=verifyCustomerSession(input.capability,secret());
  if(!owner) throw Error('HCI_SESSION_REQUIRED');
  await consumeEndpointRateLimit(createHash('sha256').update('cuk-hci-owner:'+owner).digest('hex'),{limit:60,windowSeconds:60});
  return stagingHciIntegration(owner,input.command,'customer');
}
export async function proxyConsultationAsset(name:string) {
  if(name!=='privacy.html'&&!customerHciEnabled()) return new Response(null,{status:404});
  const visual=/^[a-zA-Z0-9_-]+\.svg$/.test(name);
  if(!visual&&!['privacy.html','consultation.html','consultation.css','consultation.js'].includes(name))return new Response(null,{status:404});
  try {
    let body=await readFile(resolve('lib/storefront/hci',...(visual?['visuals',name]:[name])),'utf8');
    if(name==='consultation.html')body=customerProxyHtml(body);
    if(name==='consultation.js')body=customerProxyScript(body);
    return new Response(body,{headers:{...PRIVATE_NO_STORE_HEADERS,'Content-Type':visual?'image/svg+xml':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':'text/javascript'}});
  }catch{return new Response(null,{status:404});}
}
