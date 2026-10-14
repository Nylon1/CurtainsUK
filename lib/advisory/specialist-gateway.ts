import {createHmac,timingSafeEqual} from 'node:crypto';
import {ShopifyAppProxyError,verifyShopifyAppProxyQuery} from '../storefront/security/shopify-app-proxy-core';
import {AdvisoryError} from './contracts.mjs';
import {limitedBody} from './http.mjs';
import {specialistIds} from './specialist-profiles.mjs';

const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const shop='carpetup.myshopify.com';
const validCustomer=/^[1-9][0-9]{0,19}$/;
const validCommit=/^[a-f0-9]{40}$/;
const origins=new Set(['https://www.curtainsuk.com',`https://${shop}`]);
const fail=(status:number,error:string)=>Response.json({error},{status,headers});
const secret=(value:string|undefined)=>{if(!value||value.length<32)throw Error('SPECIALIST_SECRET_REQUIRED');return value;};
const equals=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};

export function specialistPreviewEnabled(env:Record<string,string|undefined>,compiledCommit:string|undefined){
  const sourceAttested=env.VERCEL_GIT_COMMIT_SHA
    ?env.VERCEL_GIT_COMMIT_SHA===compiledCommit
    :/^dpl_[A-Za-z0-9]{12,}$/.test(env.VERCEL_DEPLOYMENT_ID??'');
  return (env.VERCEL_ENV==='preview'||env.VERCEL_ENV==='production')
    &&env.VERCEL_PROJECT_ID==='prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA'
    &&env.ADVISORY_SPECIALISTS_RESTRICTED_PREVIEW==='true'
    &&validCommit.test(compiledCommit??'')
    &&compiledCommit===env.ADVISORY_SPECIALISTS_APPROVED_COMMIT
    &&sourceAttested;
}

/** Public access requires a separate exact-release and spending approval. */
export function specialistPublicEnabled(env:Record<string,string|undefined>,compiledCommit:string|undefined){
  const sourceAttested=env.VERCEL_GIT_COMMIT_SHA
    ?env.VERCEL_GIT_COMMIT_SHA===compiledCommit
    :/^dpl_[A-Za-z0-9]{12,}$/.test(env.VERCEL_DEPLOYMENT_ID??'');
  return env.VERCEL_ENV==='production'
    &&env.VERCEL_PROJECT_ID==='prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA'
    &&env.ADVISORY_SPECIALISTS_PUBLIC_ENABLED==='true'
    &&env.ADVISORY_SPECIALISTS_RESTRICTED_PREVIEW!=='true'
    &&env.ADVISORY_SPECIALISTS_PROVIDER==='openai'
    &&env.ADVISORY_SPECIALISTS_PUBLIC_BUDGET_APPROVAL_REFERENCE==='OWNER_APPROVED_SPECIALISTS_PUBLIC_BUDGET_20261014'
    &&validCommit.test(compiledCommit??'')
    &&compiledCommit===env.ADVISORY_SPECIALISTS_APPROVED_COMMIT
    &&sourceAttested;
}

export function specialistGatewayEnabled(env:Record<string,string|undefined>,compiledCommit:string|undefined){
  return specialistPreviewEnabled(env,compiledCommit)||specialistPublicEnabled(env,compiledCommit);
}

export function specialistOwner(customerId:string,adviser:string,key:string){
  if(!validCustomer.test(customerId)||!specialistIds.includes(adviser))throw Error('SPECIALIST_IDENTITY_REQUIRED');
  const hex=createHmac('sha256',secret(key)).update('curtainsuk:specialist-owner:v1\0').update(adviser).update('\0').update(shop).update('\0').update(customerId).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

export function createShopifySpecialistGateway({env,compiledCommit,take,execute,now=Date.now}:{
  env:Record<string,string|undefined>,compiledCommit?:string,take:(owner:string)=>Promise<unknown>,execute:(owner:string,command:unknown)=>Promise<unknown>,now?:()=>number
}){
  return async(request:Request)=>{
    if(!specialistGatewayEnabled(env,compiledCommit))return new Response(null,{status:404,headers});
    if(!['GET','POST'].includes(request.method))return fail(405,'METHOD_NOT_ALLOWED');
    try{
      const signed=verifyShopifyAppProxyQuery(new URL(request.url).search,{secret:secret(env.CURTAINSUK_SHOPIFY_APP_SECRET),allowedShops:[shop],allowedPathPrefixes:['/apps/curtainsuk-decision'],nowSeconds:Math.floor(now()/1000),maximumAgeSeconds:300});
      const id=signed.loggedInCustomerId;
      const allowed=(env.ADVISORY_SPECIALISTS_TEST_CUSTOMER_IDS??'').split(',').map(x=>x.trim()).filter(Boolean);
      if(!id||!validCustomer.test(id)||(!specialistPublicEnabled(env,compiledCommit)
        &&(allowed.length<1||allowed.length>10||!allowed.includes(id))))return fail(401,'CUSTOMER_SIGN_IN_REQUIRED');
      let command:unknown;
      if(request.method==='POST'){
        if(!origins.has(request.headers.get('origin')??''))return fail(403,'ORIGIN_DENIED');
        if(!request.headers.get('content-type')?.startsWith('application/json'))return fail(415,'INVALID_INPUT');
        const length=Number(request.headers.get('content-length')??'0');
        if(!Number.isFinite(length)||length>16000)return fail(413,'INPUT_TOO_LARGE');
        command=await limitedBody(request);
      }
      const adviser=request.method==='GET'?new URL(request.url).searchParams.get('adviser'):(command as {adviser?:unknown})?.adviser;
      if(typeof adviser!=='string'||!specialistIds.includes(adviser))return fail(400,'UNKNOWN_ADVISER');
      const signedAdviser=new URL(request.url).searchParams.get('adviser');
      if(request.method==='POST'&&signedAdviser&&signedAdviser!==adviser)return fail(400,'INVALID_INPUT');
      const owner=specialistOwner(id,adviser,secret(env.ADVISORY_OWNER_DERIVATION_KEY));
      const bucket=Math.floor(now()/600000);
      const csrf=(n:number)=>createHmac('sha256',secret(env.ADVISORY_CSRF_KEY)).update('curtainsuk:specialist-csrf:v1\0').update(owner).update('\0').update(String(n)).digest('base64url');
      await take(owner);
      if(request.method==='GET'){
        const binding=createHmac('sha256',secret(env.ADVISORY_CSRF_KEY)).update('curtainsuk:specialist-browser:v1\0').update(owner).digest('hex').slice(0,32);
        return Response.json({csrf:csrf(bucket),ownerBinding:binding,expiresAt:(bucket+1)*600000},{headers});
      }
      const supplied=request.headers.get('x-advisory-csrf')??'';
      if(!equals(supplied,csrf(bucket))&&!equals(supplied,csrf(bucket-1)))return fail(403,'CSRF_DENIED');
      if(!command||typeof command!=='object'||Array.isArray(command)||(command as {adviser?:unknown}).adviser!==adviser)return fail(400,'INVALID_INPUT');
      return Response.json(await execute(owner,command),{headers});
    }catch(error){
      if(error instanceof ShopifyAppProxyError)return fail(401,'REQUEST_AUTHENTICATION_FAILED');
      if(error instanceof AdvisoryError)return fail(error.status,error.code);
      return fail(503,'SPECIALIST_TEMPORARILY_UNAVAILABLE');
    }
  };
}
