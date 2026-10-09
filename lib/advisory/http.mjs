import {AdvisoryError,fail} from './contracts.mjs';
import {BoundedLimiter,equal,errorMessages,previewEnabled} from './security.mjs';
const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export async function limitedBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail('INVALID_INPUT',415);
  const reader=request.body?.getReader();if(!reader)fail('INVALID_INPUT');let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000)fail('INPUT_TOO_LARGE',413);chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('INVALID_INPUT');}
}
export function createHttpHandler({service,authenticate,origin,limiter=new BoundedLimiter()}){
  return async request=>{
    try{
      if(request.method!=='POST')fail('METHOD_NOT_ALLOWED',405);
      if(request.headers.get('origin')!==origin)fail('UNAUTHORISED',403);
      const principal=await authenticate(request);if(!principal?.owner||!principal.csrf||!equal(request.headers.get('x-advisory-csrf')??'',principal.csrf))fail('UNAUTHORISED',403);
      await limiter.take(principal.owner);
      const body=await limitedBody(request);const result=await service.execute(principal.owner,body);
      if(request.headers.get('accept')!=='text/event-stream'||!['message','summary'].includes(body.action))return Response.json(result,{headers});
      // Stream only after validation and successful storage. Never expose raw
      // model fragments or announce a saved result before the commit succeeds.
      const text=result.session.messages.at(-1)?.text??'';const encoder=new TextEncoder();
      const stream=new ReadableStream({start(controller){for(const part of text.match(/.{1,70}/gs)??[])controller.enqueue(encoder.encode('event: text\ndata: '+JSON.stringify({delta:part})+'\n\n'));controller.enqueue(encoder.encode('event: complete\ndata: '+JSON.stringify(result)+'\n\n'));controller.close();}});
      return new Response(stream,{headers:{...headers,'Content-Type':'text/event-stream','X-Accel-Buffering':'no'}});
    }catch(error){const code=error instanceof AdvisoryError?error.code:'SERVICE_UNAVAILABLE';return Response.json({error:code,message:errorMessages[code]??'The request could not be completed. Your draft is still here; please try again.'},{status:error instanceof AdvisoryError?error.status:503,headers});}
  };
}
export function deploymentGate(request,env){
  if(!previewEnabled(env))return new Response(null,{status:404,headers});
  if(!equal(request.headers.get('x-advisory-preview-key')??'',env.ADVISORY_PREVIEW_KEY))return new Response(null,{status:404,headers});
  return null;
}
