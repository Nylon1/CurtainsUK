import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {customerHciEnabled,issueCustomerSession,verifyCustomerSession,CUSTOMER_HCI_COOKIE,CUSTOMER_HCI_MAX_AGE} from '@/lib/storefront/customer-hci-session';
import {PRIVATE_NO_STORE_HEADERS} from '@/lib/storefront/security/http';
export const dynamic='force-dynamic';
export async function GET(){
 if(!customerHciEnabled())return new Response('Consultation unavailable',{status:404,headers:PRIVATE_NO_STORE_HEADERS});
 const secret=process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET??'';
 try{
 const existing=verifyCustomerSession((await cookies()).get(CUSTOMER_HCI_COOKIE)?.value,secret);
 const html=(await readFile(resolve('lib/storefront/hci/consultation.html'),'utf8'))
  .replaceAll('/hci-assets/','/api/curtain-consultation/assets/')
  .replaceAll('THE PRIVATE CONSULTATION · INTERNAL PREVIEW','YOUR CURTAIN CONSULTATION')
  .replaceAll('?preview_theme_id=182264234363','')
  .replace('href="/"','href="https://www.curtainsuk.com/"')
  .replace('href="/pages/fabric-library"','href="https://www.curtainsuk.com/pages/fabric-library"');
 const result=new NextResponse(html,{headers:{...PRIVATE_NO_STORE_HEADERS,'Content-Type':'text/html; charset=utf-8'}});
 if(!existing)result.cookies.set(CUSTOMER_HCI_COOKIE,issueCustomerSession(secret).token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:CUSTOMER_HCI_MAX_AGE});
 return result;
 }catch{return new Response('Consultation temporarily unavailable',{status:503,headers:PRIVATE_NO_STORE_HEADERS});}
}
