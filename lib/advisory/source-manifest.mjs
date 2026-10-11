import {createHash} from 'node:crypto';
import {fail,FABRIC_ID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

// Operator-only identity inventory, never a product database or model tool.
// Preserve PostgreSQL's recorded order: JavaScript collation is not equivalent.
export function validateSourceManifest(manifest){
  const ids=manifest?.ids;
  if(manifest?.version!==1||manifest.projectRef!==EXISTING_PROJECT_REF||manifest.source!=='curtainsuk_private.fabric_colourways'||manifest.inventory_complete!==true||!Array.isArray(ids)||ids.length>20000||manifest.identity_count!==ids.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!new RegExp(FABRIC_ID).test(id))||!Number.isFinite(Date.parse(manifest.observed_at)))fail('INVALID_SOURCE_MANIFEST',503);
  const hash=createHash('sha256').update(ids.join('\n')).digest('hex');
  if(hash!==manifest.identity_sha256||manifest.first_id!==(ids[0]??null)||manifest.last_id!==(ids.at(-1)??null))fail('SOURCE_MANIFEST_INTEGRITY',503);
  return {count:ids.length,snapshot:'master-identities-sha256:'+hash,hash};
}

export function createManifestSource({manifest,attest,now=()=>Date.now()}){
  const {snapshot,hash,count}=validateSourceManifest(manifest),ids=[...manifest.ids];
  if(typeof attest!=='function')fail('SOURCE_ATTESTATION_REQUIRED',503);
  return {snapshot,expectedCount:count,
    async page({cursor=null,snapshot:requested,limit=6,signal}){
      signal?.throwIfAborted();
      if(requested!==snapshot||limit!==6)fail('INVALID_INDEX_SOURCE',503);
      const offset=cursor===null?0:cursor?.offset;
      if(!Number.isSafeInteger(offset)||offset<0||offset>count||(offset!==count&&offset%6!==0)||(cursor!==null&&(cursor.manifestHash!==hash||Object.keys(cursor).sort().join(',')!=='manifestHash,offset')))fail('INVALID_INDEX_CURSOR',503);
      const end=Math.min(offset+6,count);
      return {ids:ids.slice(offset,end),cursor:{manifestHash:hash,offset:end},snapshot,done:end===count};
    },
    async verifySnapshot(requested,{signal}={}){
      signal?.throwIfAborted();if(requested!==snapshot)return false;
      // Inject a fresh, bounded, read-only count/hash attestation. An identity
      // snapshot does not freeze changing descriptions or commercial eligibility.
      const current=await attest({signal});signal?.throwIfAborted();
      const observedAt=Date.parse(current?.observed_at);
      return Number.isFinite(observedAt)&&observedAt<=now()&&now()-observedAt<=60000&&current?.projectRef===EXISTING_PROJECT_REF&&current.inventory_complete===true&&current.identity_count===count&&current.identity_sha256===hash;
    }
  };
}
