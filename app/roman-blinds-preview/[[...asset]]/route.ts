import {romanHostedRequest} from '@/lib/roman-blind/hosted';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{asset?:string[]}>}){
 const host=new URL(request.url).hostname;
 if(!(process.env.VERCEL_ENV==='preview'||(!process.env.VERCEL&&process.env.NODE_ENV!=='production'&&['127.0.0.1','localhost'].includes(host))))return new Response('Not found',{status:404});
 return romanHostedRequest(request,(await context.params).asset??[]);
}
export const GET=handle;
export const POST=handle;
