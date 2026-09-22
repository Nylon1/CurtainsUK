// Called only after an authorised release fails its live gate. Never used during setup.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const b=JSON.parse(readFileSync('release/baseline.json','utf8'));
assert.equal(b.status,'KNOWN_GOOD','No verified rollback target: operator intervention required');
assert.match(b.deploymentId,/^dpl_[A-Za-z0-9]+$/);
assert.match(b.deploymentUrl,/^curtainsuk-staging-[a-z0-9-]+\.vercel\.app$/);
assert.deepEqual(b.aliases,['curtainsuk-staging-api.vercel.app','curtainsuk-staging-gateway.vercel.app']);
const cli=process.env.VERCEL_CLI_PATH;
assert.ok(cli,'Pinned workflow CLI required');
const run=args=>execFileSync(process.execPath,[cli,...args,'--token',process.env.VERCEL_TOKEN],{stdio:['ignore','pipe','pipe']});
try{
 run(['rollback',b.deploymentUrl,'--yes']);
 for(const alias of b.aliases)run(['alias','set',b.deploymentUrl,alias]);
 writeFileSync('artifacts/production-gate/rollback.json',JSON.stringify({status:'RESTORED_ALIASES',deploymentId:b.deploymentId,timestamp:new Date().toISOString()}));
}catch{throw new Error('ROLLBACK_FAILED: stop release; owner must restore both recorded aliases. No further deployment permitted.');}
