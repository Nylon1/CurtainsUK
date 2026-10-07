import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-room-visualiser.js','utf8');
function mount(search='') {
  let tick,now=0,cleared=0;const handlers={};
  const child={document:{querySelector:()=>null}};
  const frame={dataset:{source:'/apps/curtainsuk-decision/room-visualiser'},contentWindow:child,addEventListener:(event,fn)=>{handlers[event]=fn;}};
  const status={},label={},recovery={},retry={addEventListener:(_,fn)=>{handlers.retry=fn;}};
  const elements={'[data-room-frame]':frame,'[data-room-status]':status,'[data-room-status-text]':label,'[data-room-recovery]':recovery,'[data-room-retry]':retry};
  const section={dataset:{defaultRoom:'living'},isConnected:true,querySelector:key=>elements[key]};
  const document={querySelectorAll:()=>[section],addEventListener:(key,fn)=>{handlers[key]=fn;}};
  const context={window:{},document,location:{origin:'https://www.curtainsuk.com',search},URL,URLSearchParams,Date:{now:()=>now},setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{cleared++;}};
  vm.runInNewContext(script,context);
  return {section,frame,status,label,recovery,child,handlers,tick:()=>tick(),advance:ms=>{now+=ms;tick();},get cleared(){return cleared;}};
}
test('native mount forwards fabric identity, accepts only fixed rooms and uses the same-origin proxy',()=>{
  const m=mount('?fabric=sdg-f1541-01&room=bedroom&api=https://evil.example');
  assert.equal(m.frame.src,'https://www.curtainsuk.com/apps/curtainsuk-decision/room-visualiser?fabric=sdg-f1541-01&room=bedroom');
  const duplicate=mount('?fabric=a&fabric=b&room=attic');
  assert.deepEqual(new URL(duplicate.frame.src).searchParams.getAll('fabric'),['a','b']);
  assert.equal(new URL(duplicate.frame.src).searchParams.has('room'),false);
});
test('native loading waits for both runtime and fabric readiness; never changes scene state',()=>{
  const m=mount();m.child.roomProof={ready:true,curtain:{progress:.37}};m.tick();assert.equal(m.section.dataset.state,'loading');
  m.child.visualiserCustomer={proof:{ready:true,selectedId:'sdg-f1541-01'}};m.tick();
  assert.equal(m.section.dataset.state,'ready');assert.equal(m.status.hidden,true);
  assert.equal(m.child.roomProof.curtain.progress,.37);assert.equal(m.child.visualiserCustomer.proof.selectedId,'sdg-f1541-01');
});
test('native loading accepts a ready frozen V1 renderer without STANDARD globals',()=>{
  const m=mount('?fabric=pt-1204-212');
  m.child.fixed140Proof={ready:false,profile:'FIXED140_SINGLE_WIDTH_V1'};m.tick();
  assert.equal(m.section.dataset.state,'loading');
  m.child.fixed140Proof.ready=true;m.tick();
  assert.equal(m.section.dataset.state,'ready');assert.equal(m.status.hidden,true);
  m.advance(45001);assert.equal(m.section.dataset.state,'ready');
});
test('blocked proxy or stalled WebGL has a bounded recoverable fallback',()=>{
  const m=mount('?fabric=sdg-f1541-01');m.advance(45001);
  assert.equal(m.section.dataset.state,'error');assert.equal(m.recovery.hidden,false);
  m.handlers.retry();assert.equal(m.section.dataset.state,'loading');assert.equal(m.recovery.hidden,true);
  assert.equal(new URL(m.frame.src).searchParams.get('fabric'),'sdg-f1541-01');
  m.handlers.error();assert.equal(m.section.dataset.state,'error');
});
test('Theme Editor reinitialisation is idempotent and removed mounts stop polling',()=>{
  const m=mount();const before=m.cleared;m.handlers['shopify:section:load']();assert.equal(m.cleared,before);
  m.section.isConnected=false;m.tick();assert.equal(m.cleared,before+1);
});
