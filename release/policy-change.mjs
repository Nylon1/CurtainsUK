import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.POLICY_BASE_SHA,head=process.env.POLICY_HEAD_SHA;
for(const sha of [base,head])assert.match(sha||'',/^[a-f0-9]{40}$/);
const changes=execFileSync('git',['diff','--name-only',base,head],{encoding:'utf8'}).trim().split('\n');
const protectedPath=p=>p.startsWith('release/')||p.startsWith('.github/')||p.includes('/__tests__/')||['package.json','package-lock.json'].includes(p);
if(changes.some(protectedPath)){
 assert.ok(existsSync('release/policy-change.json'),'Protected changes need an OWNER_APPROVED_POLICY_CHANGE record');
 const decision=JSON.parse(readFileSync('release/policy-change.json','utf8'));
 assert.equal(decision.classification,'OWNER_APPROVED_POLICY_CHANGE');
 for(const key of ['previousRule','newRule','reason','ownerApprovedDecision'])assert.ok(typeof decision[key]==='string'&&decision[key].trim().length>10,`Missing ${key}`);
 // A file claiming approval is insufficient. Require a real owner review of this exact HEAD.
 const r=await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pulls/${process.env.PR_NUMBER}/reviews?per_page=100`,{headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,'X-GitHub-Api-Version':'2022-11-28'}});
 assert.equal(r.status,200);const reviews=await r.json();
 const latest=reviews.filter(r=>r.user?.login==='Nylon1'&&r.state!=='COMMENTED').at(-1);
 assert.ok(latest?.state==='APPROVED'&&latest.commit_id===head,'Explicit owner approval of current HEAD is required');
}
