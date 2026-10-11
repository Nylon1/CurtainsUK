// Local review package only. Identity inventory is reused; no database reads.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateSourceManifest} from '../lib/advisory/source-manifest.mjs';
const dir='artifacts/jane-index-continuation-20261011';await mkdir(dir,{recursive:true});
const manifest=JSON.parse(await readFile('artifacts/jane-pro-readiness-20261011/source-manifest.json','utf8'));
const summary=validateSourceManifest(manifest),startOffset=6,endOffset=126;
const hashes={},visit=async filename=>{
 if(hashes[filename])return;
 const source=(await readFile(filename,'utf8')).replaceAll('\r\n','\n');
 hashes[filename]=createHash('sha256').update(source).digest('hex');
 for(const m of source.matchAll(/from\s+['"](\.[^'"]+\.mjs)['"]/g))await visit(path.posix.normalize(path.posix.join(path.posix.dirname(filename),m[1])));
};
await visit('lib/advisory/continuation-plan.mjs');await visit('lib/advisory/index-coverage.mjs');
const codeManifest=Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b)));
const implementationSha256=createHash('sha256').update(JSON.stringify(codeManifest)).digest('hex');
const proposal={classification:'REVIEW_PROPOSAL_NOT_EXECUTION_AUTHORIZATION',approved:false,projectRef:manifest.projectRef,schema:'advisory',purpose:'bounded-advisory-index-only',jobId:'a6c0d329-935e-4c31-b8ef-71a52f6d9149',sourceSnapshot:summary.snapshot,expectedCount:summary.count,bundleHash:'eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50',implementationSha256,maxBatches:20,continuation:{startOffset,startingBatches:1,endOffset},maximumNewIdentities:120,maximumTotalIndexed:126,minimumPacingMs:5000,temporaryRoleUse:{approved:false,member:'postgres',role:'advisory_indexer',grantor:'postgres',scope:'same-transaction-revoke-before-commit',maximumTransactions:20},ids:manifest.ids.slice(startOffset,endOffset),batches:Array.from({length:20},(_,i)=>({fromOffset:startOffset+i*6,toOffset:startOffset+(i+1)*6,ids:manifest.ids.slice(startOffset+i*6,startOffset+(i+1)*6)})),executionRequirements:['Explicit owner approval of this 120-identity and temporary-permission scope','Fresh existing-project backup/resource/source preflight','Fresh checkpoint, six safe source rows and resource evidence per batch; count/hash attestation at most 60 seconds old','Persist exact SQL and checksum before each submission','Read back exact hashes, cursor and restored permissions after each batch; no blind retry','Stop at 126 total, any guard failure, expired evidence, new database error, supplier refresh or resource ceiling'],codeManifest};
await writeFile(dir+'/continuation-proposal.json',JSON.stringify(proposal,null,2)+'\n');
console.log(JSON.stringify({implementationSha256,files:Object.keys(codeManifest).length,fromOffset:startOffset,toOffset:endOffset,first:proposal.ids[0],last:proposal.ids.at(-1),approved:false}));
