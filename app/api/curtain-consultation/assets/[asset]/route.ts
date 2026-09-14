import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {customerHciEnabled} from '@/lib/storefront/customer-hci-session';
import {PRIVATE_NO_STORE_HEADERS} from '@/lib/storefront/security/http';
export async function GET(_request:Request,{params}:{params:Promise<{asset:string}>}){
 if(!customerHciEnabled())return new Response(null,{status:404});
 const {asset}=await params,visual=/^[a-zA-Z0-9_-]+\.svg$/.test(asset);
 if(!visual&&!['consultation.css','consultation.js'].includes(asset))return new Response(null,{status:404});
 try{
 let body=await readFile(resolve('lib/storefront/hci',...(visual?['visuals',asset]:[asset])),'utf8');
 if(asset==='consultation.js')body=body.replaceAll('/api/admin/curtain-consultation','/api/curtain-consultation').replace('curtainsuk_hci_session_v2','curtainsuk_customer_hci_session_v1').replace('url.searchParams.set("preview_theme_id", "182264234363");','');
 return new Response(body,{headers:{...PRIVATE_NO_STORE_HEADERS,'Content-Type':visual?'image/svg+xml':asset.endsWith('css')?'text/css':'text/javascript'}});
 }catch{return new Response(null,{status:404});}
}
