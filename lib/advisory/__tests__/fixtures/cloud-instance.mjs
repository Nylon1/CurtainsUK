// Local test child process only. Auth fixtures are not a hosted Auth integration.
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {createCloudConsultationHandler} from '../../cloud-handler.mjs';
import {createSessionCipher} from '../../session-cipher.mjs';
import {createMockProvider} from '../../mock-provider.mjs';
const pending=new Map();let release;
process.on('message',async message=>{
  if(message.type==='rpc-result'){pending.get(message.id)?.(message.value);pending.delete(message.id);return;}
  if(message.type==='release-model'){release?.();return;}
  if(message.type!=='init')return;
  const {owners,authSession,key,previewKey}=message,origin='https://local-test.example',issuer='https://isolated-test.supabase.co/auth/v1';
  const rpc=p=>new Promise(resolve=>{const id=randomUUID();pending.set(id,resolve);process.send({type:'rpc',id,p});});
  const auth={getUser:async token=>({data:{user:owners.includes(token)?{id:token}:null}}),getClaims:async token=>({data:{claims:{sub:token,role:'authenticated',session_id:authSession,iss:issuer,exp:Date.now()/1000+600}}})};
  const mock=createMockProvider();
  const handler=createCloudConsultationHandler({env:{VERCEL_ENV:'preview',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_PREVIEW_KEY:previewKey},origin,issuer,auth,
    sessionActive:async()=>true,readAccessToken:async req=>req.headers.get('authorization'),csrfForSession:async()=> 'fixture-csrf',rpc,
    cipher:createSessionCipher({activeKeyId:'fixture',keys:{fixture:Buffer.from(key,'base64')}}),catalogue:{lookup:async()=>[],identities:async()=>[],retail:async()=>[]},
    providerForSession:async()=>({respond:async args=>{if(args.message.includes('concurrent')){await new Promise(resolve=>{release=resolve;process.send({type:'model-started'});});}return mock.respond(args);}})});
  const server=http.createServer(async(req,res)=>{
    try{let body='';for await(const chunk of req)body+=chunk;
      const response=await handler(new Request(origin+'/api',{method:'POST',headers:req.headers,body}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
    }catch{res.writeHead(500);res.end('{}');}
  });
  server.listen(0,'127.0.0.1',()=>process.send({type:'ready',port:server.address().port,pid:process.pid}));
  process.on('disconnect',()=>server.close(()=>process.exit(0)));
});
