import { createClient } from '@/lib/supabase/server';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { hasSupplierAdminRole } from '@/lib/supplier-intelligence/authz';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { sampleCreditPackingSlip } from '@/lib/storefront/sample-credit-server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const html=(body:string,status=200)=>new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sample credit | CurtainsUK</title><style>body{margin:0;background:#f6f5ef;color:#193e32;font:16px/1.6 system-ui,sans-serif}main{max-width:850px;margin:40px auto;padding:24px}h1,h2{font-family:Georgia,serif}a{color:inherit}article{padding:28px;background:#fff;border:1px solid #d6ddcf;border-radius:16px;margin:24px 0}code{display:block;padding:20px;background:#f5f6f0;font-size:18px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}button,input{font:inherit;padding:10px;max-width:100%;box-sizing:border-box}button{background:#193e32;color:#fff;border:0;border-radius:6px}@media print{.staff{display:none}body{background:white}main{margin:0}}</style></head><body><main>${body}</main></body></html>`,{status,headers:{...PRIVATE_NO_STORE_HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});

/** Read-only staff lookup/packing insert. Never accessible by a public order-number lookup. */
export async function GET(request:Request){
  const auth=await createClient();const {data:{user},error}=await auth.auth.getUser();
  if(error || !user || user.is_anonymous || !hasSupplierAdminRole(user.app_metadata))return html('<h1>Staff sign-in required</h1><a href="/admin/login?next=%2Fadmin%2Fsample-credit">Sign in</a>',error?503:user?403:401);
  const id=new URL(request.url).searchParams.get('order');
  const intro='<div class="staff"><a href="/admin">Back to admin</a><h1>Sample credit</h1><p>Private paid-sample ledger. Use the packing insert for customers without email. Keep codes out of screenshots, public notes and support logs.</p><form><label>Shopify order ID (from the admin order URL)<br><input name="order" inputmode="numeric" pattern="[0-9]+" required></label> <button>Find credit</button></form></div>';
  try{
    if(id){
      if(!/^\d{1,20}$/.test(id))return html(intro+'<p>Enter the numeric Shopify order ID.</p>',400);
      const g=await sampleCreditPackingSlip(`gid://shopify/Order/${id}`);
      if(!g)return html(intro+'<p>No credit has been issued for this order. Verify the paid sample purchase and check the paid-order webhook before issuing anything manually.</p>',404);
      if(g.state!=='AVAILABLE')return html(intro+`<p>This credit is ${escape(g.state.toLowerCase())}. Check its existing checkout or payment before taking further action.</p>`);
      return html(intro+`<article><p>CurtainsUK · Order ${escape(g.order_name)}</p><h2>Your samples. Your next step.</h2><p>You have <strong>£${(g.amountMinor/100).toFixed(2)}</strong> in sample credit towards made-to-measure curtains.</p><code>${escape(g.code)}</code><p>Enter this code in Design My Home before payment at <strong>curtainsuk.com/pages/build-my-rooms</strong>.</p><p>Up to 10 purchased samples per curtain order, including fabrics you do not choose. Each code is single-use. Delivery, cancelled and refunded samples are excluded. Keep your code private.</p><p>Need help? enquiries@curtainsuk.com</p></article><p class="staff">Use your browser’s Print option to include this slip with the samples. Email status: ${escape(g.email_state)}.</p>`);
    }
    const {data,error:readError}=await createSupplierServiceClient().from('sample_credit_grants').select('order_gid,order_name,state,email_state,issued_at').order('issued_at',{ascending:false}).limit(100);
    if(readError)throw Error('LEDGER_UNAVAILABLE');
    return html(intro+`<h2>Latest issued credits</h2><table><thead><tr><th>Order</th><th>Credit</th><th>Email</th></tr></thead><tbody>${(data??[]).map(g=>`<tr><td><a href="?order=${encodeURIComponent(g.order_gid.split('/').pop())}">${escape(g.order_name)}</a></td><td>${escape(g.state)}</td><td>${escape(g.email_state)}</td></tr>`).join('')}</tbody></table><p class="staff">Showing the latest 100. REVIEW emails need a Resend receipt check before resending. Reserved credit stays held while its Shopify invoice can be paid. Do not release a reservation until that draft is cancelled and cancellation verified.</p>`);
  }catch{return html(intro+'<p>Sample credit is temporarily unavailable. No codes or balances have been changed.</p>',503);}
}
