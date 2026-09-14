import {createHash} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {customerHciEnabled,customerOriginAllowed,CUSTOMER_HCI_COOKIE,verifyCustomerSession} from '@/lib/storefront/customer-hci-session';
import {consumeEndpointRateLimit,endpointRateLimitResponse} from '@/lib/storefront/security/endpoint-rate-limit';
import {PRIVATE_NO_STORE_HEADERS} from '@/lib/storefront/security/http';
import {readBoundedJson} from '@/lib/storefront/staging-api';
import {stagingHciIntegration} from '@/lib/storefront/hci-integration-server';
import {retailFabricDetail} from '@/lib/fabric-master/retail-repository';
export const maxDuration=30;
const response=(body:unknown,status=200,headers={})=>NextResponse.json(body,{status,headers:{...PRIVATE_NO_STORE_HEADERS,...headers}});
async function access(request:Request){
 if(!customerHciEnabled())throw Error('HCI_DISABLED');
 const owner=verifyCustomerSession((await cookies()).get(CUSTOMER_HCI_COOKIE)?.value,process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET??'');
 if(!owner)throw Error('HCI_SESSION_REQUIRED');
 const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()??'unknown';
 await consumeEndpointRateLimit(createHash('sha256').update('cuk-hci-ip:'+ip).digest('hex'),{limit:120,windowSeconds:60});
 await consumeEndpointRateLimit(createHash('sha256').update('cuk-hci-owner:'+owner).digest('hex'),{limit:60,windowSeconds:60});
 return owner;
}
function failure(error:unknown){
 const rate=endpointRateLimitResponse(error);if(rate)return response({error:rate.message},rate.status,rate.headers);
 const code=error instanceof Error?error.message:'';
 const status=code==='HCI_DISABLED'?404:code==='HCI_SESSION_REQUIRED'?401:code==='HCI_ORIGIN_DENIED'?403:code==='HCI_SESSION_CONFLICT'?409:503;
 return response({error:status===409?'This consultation is unavailable or changed. Start a new consultation.':'Your consultation is temporarily unavailable. You can browse fabrics independently.'},status);
}
export async function GET(request:Request){try{await access(request);const fabric=await retailFabricDetail(new URL(request.url).searchParams.get('fabric')??'');return response({fabric},fabric?200:404);}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 if(!customerOriginAllowed(request.headers.get('origin'),process.env.CURTAINSUK_HCI_CUSTOMER_ORIGIN??'')||request.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('HCI_ORIGIN_DENIED');
 const owner=await access(request);
 return response(await stagingHciIntegration(owner,await readBoundedJson(request,3_000_000),'customer'));
}catch(error){return failure(error);}}
