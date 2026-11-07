import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { validSampleToSaleUnsubscribeToken } from '@/lib/storefront/sample-to-sale-unsubscribe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {...PRIVATE_NO_STORE_HEADERS,'Content-Type':'text/html; charset=utf-8',
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
const layout = (body: string, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences | CurtainsUK</title></head><body style="margin:0;background:#eeeae0;color:#173b31;font:16px/1.6 Arial,sans-serif"><main style="max-width:560px;margin:8vh auto;padding:36px;background:#fffdf8"><p style="font:28px Georgia,serif">CurtainsUK</p>${body}</main></body></html>`,{status,headers});
function credentials(request: Request) {
  const url = new URL(request.url);
  const customer = url.searchParams.get('customer') ?? '';
  const token = url.searchParams.get('token') ?? '';
  return validSampleToSaleUnsubscribeToken(customer,token,process.env.CURTAINSUK_SAMPLE_TO_SALE_SECRET??'') ? customer : null;
}
export async function GET(request: Request) {
  if (!credentials(request)) return layout('<h1>Link unavailable</h1><p>Please email enquiries@curtainsuk.com to update your email preferences.</p>',400);
  return layout('<h1>Stop sample follow-up emails?</h1><p>You can stop CurtainsUK sample inspiration and offers at any time.</p><form method="post"><button style="min-height:44px;padding:12px 20px;background:#173b31;color:white;border:0;cursor:pointer">Unsubscribe</button></form>');
}
export async function POST(request: Request) {
  const customer = credentials(request);
  if (!customer) return layout('<h1>Link unavailable</h1><p>Please email enquiries@curtainsuk.com to update your email preferences.</p>',400);
  const {error} = await createSupplierServiceClient().from('sample_to_sale_unsubscribes').upsert({customer_gid:customer},{onConflict:'customer_gid',ignoreDuplicates:true});
  if (error) return layout('<h1>Please try again</h1><p>Your preference could not be saved. Email enquiries@curtainsuk.com and we will help.</p>',503);
  return layout('<h1>You are unsubscribed.</h1><p>We will stop the sample follow-up emails. This does not affect order updates.</p>');
}
