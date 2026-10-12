import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createFabricDetailReader,fabricDetailContext} from '../fabric-detail-handoff.mjs';
import {selectedFabric,fabricContext,sharedFabric} from '../../../experiments/jane-advisory-preview/fabric-reference.mjs';
import {createConsultationService} from '../service.mjs';
import {createMockProvider} from '../mock-provider.mjs';
import {MemoryStore} from '../store.mjs';
import {withFabricDetailPreview} from '../fabric-detail-preview-provider.mjs';
const id='test-olive-001';
const record=(changes={})=>({id,brand:'Synthetic brand',design:'Synthetic weave',colour:'Olive',description:'Invented test record only',browseReady:true,launchReady:true,orderReady:true,fabricProfileUrl:'https://www.curtainsuk.com/pages/fabric/'+id+'-synthetic',images:[{approved:true,url:'https://cdn.shopify.com/synthetic.jpg'}],roomPreview:{available:true,url:'/pages/room-visualiser?fabric='+id},...changes});
const reader=(row=record(),status=200)=>createFabricDetailReader({fetchImpl:async()=>Response.json({fabric:row},{status})});
test('exact-ID detail read is bounded, public, server-side and strips commerce/private fields',async()=>{
  let calls=0;
  const r=createFabricDetailReader({fetchImpl:async(url,options)=>{calls++;const u=new URL(url);assert.equal(u.origin,'https://www.curtainsuk.com');assert.deepEqual([...u.searchParams], [['view','retail'],['fabric',id]]);assert.equal(options.redirect,'error');assert.ok(options.signal);assert.equal(options.headers,undefined);return Response.json({fabric:record({wholesalePrice:99,price:500,stock:20})});}});
  const f=await r.read(id);assert.equal(calls,1);assert.equal(f.id,id);assert.equal(f.purchasable,false);assert.equal(f.roomPreview,'/pages/room-visualiser?fabric='+id);assert.equal(f.price,undefined);assert.equal(f.stock,undefined);assert.equal(f.wholesalePrice,undefined);
});
test('invalid, wrong, unpublished and unavailable fabrics cannot silently substitute another item',async()=>{
  for(const bad of ['','../x','test?x=1','<script>','a'.repeat(151)])await assert.rejects(reader().read(bad),/INVALID_FABRIC/);
  await assert.rejects(reader(record({id:'different'})).read(id),/MISMATCH/);
  await assert.rejects(reader(record({fabricProfileUrl:'https://www.curtainsuk.com/pages/fabric/different'})).read(id),/MISMATCH/);
  for(const change of [{browseReady:false},{launchReady:false},{orderReady:false},{images:[{url:'https://cdn.shopify.com/not-approved.jpg'}]},{fabricProfileUrl:'https://evil.example/fabric'}])await assert.rejects(reader(record(change)).read(id),/NOT_AVAILABLE/);
  await assert.rejects(reader(null,404).read(id),/NOT_AVAILABLE/);
  await assert.rejects(reader(null,503).read(id),/KNOWLEDGE_UNAVAILABLE/);
  await assert.rejects(createFabricDetailReader({fetchImpl:async()=>{throw Error('network');}}).read(id),/UNAVAILABLE/);
});
test('mismatched Room Visualiser link is omitted without inventing support',async()=>{
  assert.equal((await reader(record({roomPreview:{available:true,url:'/pages/room-visualiser?fabric=other'}})).read(id)).roomPreview,null);
});
test('URL state is ID-only and requires consent before existing context contract',()=>{
  assert.equal(selectedFabric('?entry=fabric-detail&fabric='+id),id);assert.equal(selectedFabric(''),null);
  for(const query of ['?fabric='+id,'?entry=other&fabric='+id,'?entry=fabric-detail&fabric='+id+'&fabric=other','?entry=fabric-detail&entry=other&fabric='+id,'?entry=fabric-detail&fabric=%3Cscript%3E'])assert.throws(()=>selectedFabric(query),/invalid/);
  assert.throws(()=>fabricDetailContext(id,false),/CONSENT_REQUIRED/);assert.throws(()=>fabricContext(id,false),/confirm/);
  assert.deepEqual(fabricContext(id,true),fabricDetailContext(id,true));
});
test('same selected identity reaches provider, resumes securely, and context retry is idempotent',async()=>{
  const owner='a'.repeat(64),other='b'.repeat(64),store=new MemoryStore(),base=createMockProvider();let seen=null;
  const service=createConsultationService({store,catalogue:{lookup:async ids=>Promise.all(ids.map(x=>reader().read(x)))},provider:{kind:'mock',respond:async args=>{seen=args.session.contexts.at(-1).value;return base.respond({...args,message:'changed my mind, blue instead'});}}});
  const cmd=(action,s=null,extra={})=>({action,requestId:randomUUID(),sessionId:s?.id??null,revision:s?.revision??null,text:null,context:null,consent:false,recoveryToken:null,...extra});
  let s=(await service.execute(owner,cmd('start'))).session;
  const share=cmd('context',s,{context:fabricDetailContext(id,true)});s=(await service.execute(owner,share)).session;
  assert.equal((await service.execute(owner,share)).session.contexts.length,1);
  await assert.rejects(service.execute(other,cmd('resume',s)),/SESSION_NOT_FOUND/);
  s=(await service.execute(owner,cmd('message',s,{text:'What do you think?'}))).session;assert.deepEqual(seen.fabricIds,[id]);
  const saved=await service.execute(owner,cmd('save',s,{consent:true}));
  const recovered=await service.execute(other,cmd('recover',null,{consent:true,recoveryToken:saved.recoveryToken}));assert.equal(sharedFabric(recovered.session),id);
  await assert.rejects(service.execute(owner,cmd('resume',saved.session)),/SESSION_NOT_FOUND/);
  await service.execute(other,cmd('delete',recovered.session));await assert.rejects(service.execute(other,cmd('resume',recovered.session)),/SESSION_NOT_FOUND/);
});
test('existing detail renderer hands exact identity to optional Jane adapter and retains PR183 room contract',()=>{
  const source=readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-fabric-experience.js','utf8');
  for(const available of [true,false]){
    let received;const detail={innerHTML:'',querySelectorAll:()=>[]};const win={CurtainsUKJaneFabricHandoff:{mount:(target,selected)=>{assert.equal(target,detail);received=selected;}}};
    runInNewContext(source,{window:win,document:{querySelector:()=>null},location:{origin:'https://www.curtainsuk.com'}});
    win.CurtainsUKFabricExperience.renderDetail({setAttribute:()=>{},querySelector:q=>q==='[data-cuk-fabric-detail]'?detail:{}},{...record(),metadata:{title:'Synthetic'},images:[],roomPreview:{available,url:'/pages/room-visualiser?fabric='+id}},null,()=>{});
    assert.equal(received,id);assert.equal(detail.innerHTML.includes('href="/pages/room-visualiser?fabric='+id+'"'),available);assert.doesNotMatch(detail.innerHTML,/consultation\?experience=premium/);
    delete win.CurtainsUKJaneFabricHandoff;
    assert.doesNotThrow(()=>win.CurtainsUKFabricExperience.renderDetail({setAttribute:()=>{},querySelector:q=>q==='[data-cuk-fabric-detail]'?detail:{}},{...record(),metadata:{title:'Synthetic'},images:[]},null,()=>{}));
  }
});
test('private adapter stays inactive on live and non-approved hosts',()=>{
  const source=readFileSync('experiments/jane-advisory-preview/fabric-detail-entry.js','utf8');
  for(const location of [{hostname:'www.curtainsuk.com',port:''},{hostname:'127.0.0.1',port:'3000'},{hostname:'evil.example',port:'8794'}]){const window={};runInNewContext(source,{window,location});assert.equal(window.CurtainsUKJaneFabricHandoff,undefined);}
});
test('selected-fabric mock introduction uses verified identity without inventing visualiser feedback',async()=>{
  const provider=withFabricDetailPreview(createMockProvider()),context={receivedAt:10,value:fabricDetailContext(id,true)};
  const args={session:{messages:[],contexts:[context]},message:'Help with my room',execute:async(name,input)=>{assert.equal(name,'lookup_fabric_knowledge');assert.deepEqual(input.ids,[id]);return {data:[await reader().read(id)]};}};
  const reply=await provider.respond(args);assert.match(reply.text,/Synthetic weave.*Olive/);assert.doesNotMatch(reply.text,/too busy/);assert.deepEqual(reply.fabricIds,[]);
  assert.ok(reply.text.split(/\s+/).length>=40&&reply.text.split(/\s+/).length<=90);assert.doesNotMatch(reply.text,/—/);
  const next=await provider.respond({...args,session:{...args.session,messages:[{role:'assistant',at:11}]},message:'Warm room with oak furniture'});assert.match(next.text,/timber/);assert.doesNotMatch(next.text,/if the patterns feel too busy/);
  assert.throws(()=>withFabricDetailPreview({kind:'openai'}),/MOCK_PROVIDER_REQUIRED/);
});
