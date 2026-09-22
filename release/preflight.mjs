import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline=JSON.parse(readFileSync('release/baseline.json','utf8'));
const manifest=JSON.parse(readFileSync('release/capabilities.json','utf8'));
assert.equal(process.env.GITHUB_REF,`refs/heads/${manifest.productionBranch}`,'Feature/worktree deployment prohibited');
const latest=execFileSync('git',['ls-remote','origin',`refs/heads/${manifest.productionBranch}`],{encoding:'utf8'}).trim().split(/\s+/)[0];
assert.equal(latest,process.env.GITHUB_SHA,'Production branch advanced: rerun gate on latest candidate');
assert.equal(process.env.CURTAINSUK_DEPLOYMENT_PERMISSIONS_VERIFIED,'true','Operator production access has not been removed/isolated');
assert.equal(baseline.status,'KNOWN_GOOD','Bootstrap source and full production capability proof remain unverified');
assert.ok(process.env.VERCEL_TOKEN,'CI-only Vercel identity required');
for(const alias of baseline.aliases){
 const r=await fetch(`https://api.vercel.com/v13/deployments/${alias}`,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`}});
 assert.equal(r.status,200,'Cannot verify live deployment identity');
 const live=await r.json();
 assert.equal(live.id,baseline.deploymentId,'Production changed outside recorded lineage: stop and reconcile');
 assert.equal(live.meta?.gitCommitSha,baseline.productionCommit,'Live source differs from known-good baseline');
}
assert.match(baseline.productionCommit,/^[a-f0-9]{40}$/);
execFileSync('git',['merge-base','--is-ancestor',baseline.productionCommit,'HEAD']);
const report=JSON.parse(readFileSync('artifacts/production-gate/result.json','utf8'));
assert.equal(report.comparison,'PASS');
assert.equal(report.candidate.commit,process.env.GITHUB_SHA);
assert.equal(report.manifestVersion,manifest.version);
const live=JSON.parse(readFileSync('artifacts/production-gate/live.json','utf8'));
assert.equal(live.status,'PASS','All mandatory live probes must pass');
assert.ok(Date.now()-Date.parse(live.timestamp)<15*60*1000,'Stale live proof');
