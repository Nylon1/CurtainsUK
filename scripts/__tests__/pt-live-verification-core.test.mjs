import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCohort, passed, assess } from '../lib/pt-live-verification-core.mjs';
const manifest=Array.from({length:4},(_,i)=>({fabric_id:`pt-test-${i}`,supplier_sku:`test/${i}`,manufacturer:{Width:140}}));
const coverage={coverage:manifest.map(r=>({supplier_sku:r.supplier_sku,supplier_price_row:{printed_price:10}}))};
const payload=item=>({total:1,fabrics:[{id:item.fabric_id,images:[{imageType:'MAIN',approved:true,url:'https://cdn.shopify.com/a.jpg'}],priceReady:true,browseGuide:{amountMinor:3000},commercialStockState:'OUT_OF_STOCK',fullWidthMm:1400,visualIntelligence:{}}]});
const response=item=>new Response(JSON.stringify(payload(item)),{headers:{'content-type':'application/json'}});
test('bounded parallel public reads retain exact ordered results and global request spacing',async()=>{
  const starts=[];let active=0,max=0;const checkpoints=[];
  const report=await verifyCohort({manifest,coverage,concurrency:3,fetchImpl:async url=>{
    starts.push(Date.now());max=Math.max(max,++active);
    const i=Number(url.searchParams.get('query').split('/')[1]);
    await new Promise(r=>setTimeout(r,1400-i*100));active--;return response(manifest[i]);
  },onProgress:async rows=>checkpoints.push(rows.map(r=>r.fabric_id))});
  assert.ok(max>1&&max<=3);assert.ok(starts.slice(1).every((n,i)=>n-starts[i]>=640));
  assert.deepEqual(report.results.map(r=>r.fabric_id),manifest.map(r=>r.fabric_id));
  assert.ok(report.results.every(passed));assert.equal(new Set(checkpoints.at(-1)).size,4);
});
test('resume retains passing evidence, retries HTML only, and does not repeat clean records',async()=>{
  const saved=manifest.slice(0,3).map(item=>assess(item,coverage.coverage[0],{ok:true,status:200},payload(item)));
  let requests=0;
  const report=await verifyCohort({manifest,coverage,resume:saved,concurrency:3,fetchImpl:async url=>{
    assert.equal(url.searchParams.get('query'),'test/3');requests++;
    return requests===1?new Response('<!-- temporary gateway -->'):response(manifest[3]);
  }});
  assert.equal(requests,2);assert.equal(report.metrics.resumed,3);assert.equal(report.metrics.retries,1);assert.ok(report.results.every(passed));
});
test('scope collisions, wrong resume identity and lower request interval fail before network',async()=>{
  const never=async()=>{throw Error('NETWORK_MUST_NOT_RUN');};
  await assert.rejects(verifyCohort({manifest:[manifest[0],manifest[0]],coverage,fetchImpl:never}),/SCOPE_INVALID/);
  await assert.rejects(verifyCohort({manifest,coverage,resume:[{fabric_id:'foreign'}],fetchImpl:never}),/RESUME_SCOPE_INVALID/);
  await assert.rejects(verifyCohort({manifest,coverage,requestGapMs:1,fetchImpl:never}),/RATE_INVALID/);
  const bad=assess(manifest[0],coverage.coverage[0],{ok:true,status:200},{total:2,fabrics:[...payload(manifest[0]).fabrics,...payload(manifest[0]).fabrics]});
  assert.equal(passed(bad),false);assert.equal(bad.duplicate_results,true);
});
