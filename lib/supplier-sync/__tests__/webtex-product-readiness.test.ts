import test from 'node:test';
import assert from 'node:assert/strict';
import { captureReadyWebtexProduct, inspectWebtexProduct, type WebtexProductRead } from '../webtex-product-readiness';

const complete: WebtexProductRead = { sku:'8639/281', description:'Grove Fennel', fullWidth:'144.5 cm', standardPrice:'10.40 STERLING', freeStock:'328 Metres', rawFields:'supplier fields', imageSrc:'exact-image.jpg' };
const expected = {sku:'8639/281',description:'Grove Fennel'};
test('visible SKU and image do not imply commercial readiness',()=>{
  assert.equal(inspectWebtexProduct({...complete,description:'',fullWidth:'',standardPrice:'',freeStock:''},expected),false);
});
test('every required field must be populated; zero metres is valid',()=>{
  for(const field of ['description','fullWidth','standardPrice','freeStock'] as const) assert.equal(inspectWebtexProduct({...complete,[field]:''},expected),false);
  assert.equal(inspectWebtexProduct({...complete,freeStock:'0 Metres'},expected),true);
  assert.equal(inspectWebtexProduct({...complete,fullWidth:'144.5  cm'},expected),true);
  assert.equal(inspectWebtexProduct({...complete,freeStock:'328 Rolls'},expected),false);
});
test('mismatched populated identity stops, never becomes an incomplete-record exception',()=>{
  assert.throws(()=>inspectWebtexProduct({...complete,sku:'8639/207'},expected),/WEBTEX_IDENTITY_MISMATCH/);
  assert.throws(()=>inspectWebtexProduct({...complete,description:'Grove Rosemist'},expected),/WEBTEX_IDENTITY_MISMATCH/);
});
test('waits on field readiness and reopens only after an incomplete attempt',async()=>{
  let reads=0,reopens=0;const waits:number[]=[];
  const result=await captureReadyWebtexProduct(expected,{waitForFields:async n=>{waits.push(n);},read:async()=>++reads===1?{...complete,standardPrice:''}:complete,reopen:async()=>{reopens++;}});
  assert.equal(result.status,'READY');assert.equal(reads,2);assert.equal(reopens,1);assert.deepEqual(waits,[12_000,12_000]);
});
test('persistent incomplete record is queued after three bounded attempts; next SKU proceeds',async()=>{
  let reads=0,reopens=0;
  const result=await captureReadyWebtexProduct(expected,{waitForFields:async()=>{throw Error('WEBTEX_FIELDS_TIMEOUT');},read:async()=>{reads++;return {...complete,freeStock:''};},reopen:async()=>{reopens++;}});
  assert.equal(result.status,'EXCEPTION');assert.equal(reads,3);assert.equal(reopens,2);
  assert.equal((await captureReadyWebtexProduct(expected,{waitForFields:async()=>{},read:async()=>complete,reopen:async()=>{throw Error('must not reopen');}})).status,'READY');
});
test('authentication, systemic and identity failures are not swallowed',async()=>{
  for(const code of ['WEBTEX_AUTH_REQUIRED','WEBTEX_SYSTEMIC_FAILURE','WEBTEX_IDENTITY_MISMATCH']) await assert.rejects(captureReadyWebtexProduct(expected,{waitForFields:async()=>{throw Error(code);},read:async()=>complete,reopen:async()=>{}}),new RegExp(code));
});
