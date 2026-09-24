import test from 'node:test';
import assert from 'node:assert/strict';
import { BROWSE_DISCOVERY, reviewedFabricIntelligence, supplierFacts, type EvidenceProfile } from '../browse-experience';
import { normalizePrestigiousFormationRows } from '../prestigious';
import { assertCustomerSafeProjection } from '../projection';

const hash = 'a'.repeat(64);
const evidence = {ruleVersion:'PT_EDITORIAL_5G_1',reviewer:'Authorised editorial review',sourceHash:hash,ruleHash:hash,imageHash:hash,sourceCheckedAt:'2026-09-07T22:33:50Z'};
const profile: EvidenceProfile = {description:'Reviewed description',description_validated:true,classification_evidence:JSON.stringify(evidence),colour_families:['brown'],patterns:['geometric'],characters:['textured'],styles:['contemporary'],rooms:[],window_types:[],headings:[],linings:[]};

test('exact approved imagery and reviewed provenance are required; raw or stale enrichment stays hidden',()=>{
  assert.ok(reviewedFabricIntelligence(profile,[hash]));
  assert.equal(reviewedFabricIntelligence(profile,['b'.repeat(64)]),null);
  for (const patch of [{description_validated:false},{classification_evidence:'draft'},{classification_evidence:JSON.stringify({...evidence,reviewer:''})},{classification_evidence:JSON.stringify({...evidence,ruleVersion:'UNAPPROVED'})}])
    assert.equal(reviewedFabricIntelligence({...profile,...patch},[hash]),null);
});
test('governed appearance never fabricates roles, physical weight, strength, scale or claims of human approval',()=>{
  const result = reviewedFabricIntelligence({...profile,characters:['textured','UNKNOWN','silk'],patterns:['geometric','unknown pattern']},[hash])!;
  assert.deepEqual(result.dimensions.find(d=>d.key==='texture')?.values,['textured']);
  assert.deepEqual(result.dimensions.find(d=>d.key==='pattern')?.values,['geometric']);
  assert.doesNotMatch(JSON.stringify(result),/primary|secondary|accent|gsm|physicalWeight|HUMAN_APPROVED|silk|unknown pattern/);
  assertCustomerSafeProjection(result);
});
test('missing governed attributes are omitted, with no fallback AI or invented advice',()=>{
  assert.equal(reviewedFabricIntelligence({...profile,colour_families:['UNKNOWN'],patterns:['UNKNOWN'],characters:['UNKNOWN'],styles:['UNKNOWN']},[hash]),null);
  const plain=reviewedFabricIntelligence({...profile,patterns:['plain'],characters:['UNKNOWN']},[hash])!;
  assert.ok(!plain.advice.some(a=>a.label==='Light'||a.label==='What needs care'));
  assert.deepEqual(BROWSE_DISCOVERY.map(d=>d.key), ['colour','pattern','texture','character','finish']);
  assert.ok(BROWSE_DISCOVERY.every(d=>d.active));
  assert.equal(BROWSE_DISCOVERY.find(d=>d.key==='colour')?.authority, 'MANUFACTURER_FACT');
  assert.ok(BROWSE_DISCOVERY.filter(d=>d.key!=='colour').every(d=>d.authority==='GOVERNED_FABRIC_KNOWLEDGE'));
});
test('supplier specifications remain separate, exact and unchanged; zero repeat is meaningful',()=>{
  const item = normalizePrestigiousFormationRows([{Title:'ESCHER',Tags:'Formation%20Collection','Option1%20Value':'MOCHA','Variant%20SKU':'4269/147','Image%20Src':''}])[0];
  const record = {...item,supplier_name:'Prestigious Textiles',vertical_repeat_mm:0,weight_gsm:null};
  const before = JSON.stringify(record);
  const result = supplierFacts(record);
  assert.equal(result.evidenceClass,'MANUFACTURER_FACT');
  assert.equal(result.facts.find(f=>f.label==='SKU')?.value,'4269/147');
  assert.equal(result.facts.find(f=>f.label==='Vertical repeat')?.value,'0 cm');
  assert.equal(result.facts.find(f=>f.label==='Full width')?.value,'142 cm');
  assert.equal(result.facts.find(f=>f.label==='Usable width')?.value,'140 cm');
  assert.ok(!result.facts.some(f=>f.label==='Physical weight'));
  assert.equal(JSON.stringify(record),before);
  assertCustomerSafeProjection(result);
});
