// LOCAL ONLY. No network, credentials, migrations, job writes or scheduling.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {knowledgeSearchSql} from '../lib/advisory/knowledge-query.mjs';
import {remainingPopulationPlan} from '../lib/advisory/knowledge-changes.mjs';
const dir=process.argv[2]??'artifacts/jane-knowledge-integration-20261011';
await mkdir(dir,{recursive:true});
const previous=JSON.parse(await readFile('artifacts/jane-index-continuation-20261011/continuation-proposal.json','utf8'));
const sha=value=>createHash('sha256').update(value.replaceAll('\r\n','\n')).digest('hex');
const hashes={},visit=async filename=>{
 if(hashes[filename])return;const source=await readFile(filename,'utf8');hashes[filename]=sha(source);
 for(const m of source.matchAll(/from\s+['"](\.[^'"]+\.mjs)['"]/g))await visit(path.posix.normalize(path.posix.join(path.posix.dirname(filename),m[1])));
};
for(const file of ['continuation-runner','index-journal','index-coverage','knowledge-changes','knowledge-search'])await visit('lib/advisory/'+file+'.mjs');
const codeManifest=Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b)));
const implementationSha256=sha(JSON.stringify(codeManifest));
const proposal={...previous,approved:false,temporaryRoleUse:{...previous.temporaryRoleUse,approved:false},implementationSha256,codeManifest,
 executionRequirements:[...previous.executionRequirements,'Use the append-only fsynced journal; preserve and reconcile any pending plan before another submission','No unattended schedule or full-catalogue approval is implied','Change-feed production wiring and ranking RPC replacement require separate review']};
await writeFile(dir+'/continuation-proposal.json',JSON.stringify(proposal,null,2)+'\n');
await writeFile(dir+'/population-estimate.json',JSON.stringify(remainingPopulationPlan({total:16883,indexed:6}),null,2)+'\n');
const canonical=await readFile('supabase/migrations/20261011142747_jane_isolated_advisory.sql','utf8');
const old=canonical.match(/create function advisory\.search_knowledge\([\s\S]*?end \$\$;/)?.[0];
if(!old)throw Error('CANONICAL_SEARCH_FUNCTION_NOT_FOUND');
const revised=old.replace('create function','create or replace function').replace(/return query[\s\S]*?limit 6;/,'return query '+knowledgeSearchSql(['p_query','p_colour','p_pattern','p_texture','p_composition'])+';');
const wrap=sql=>"-- REVIEW ONLY: not applied. Existing function ACL, signature and invoker mode preserved.\nbegin;\nset local lock_timeout='500ms';\nset local statement_timeout='3s';\n"+sql+'\ncommit;\n';
const ranking=wrap(revised),rollback=wrap(old.replace('create function','create or replace function'));
await writeFile(dir+'/ranking-review.sql',ranking);await writeFile(dir+'/ranking-rollback.sql',rollback);
await writeFile(dir+'/review-manifest.json',JSON.stringify({implementationSha256,canonicalMigrationSha256:sha(canonical),canonicalMigrationChanged:false,ranking:{path:dir+'/ranking-review.sql',sha256:sha(ranking),objects:['advisory.search_knowledge(text,text,text,text,text)'],grantsChanged:false,tablesChanged:false,indexRebuild:false,applied:false,rollbackSha256:sha(rollback)},scope:{hostedIndexed:6,denominator:16883,newApproved:false,maximumNew:120,maximumTotal:126,scheduleEnabled:false}},null,2)+'\n');
console.log(JSON.stringify({dir,implementationSha256,approved:false,rankingApplied:false}));
