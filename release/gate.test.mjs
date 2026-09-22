import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,appendFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('changing a frozen test cannot produce a green gate',()=>{
 const temp=mkdtempSync(join(tmpdir(),'curtainsuk-gate-negative-'));
 cpSync('release',join(temp,'release'),{recursive:true});
 const lock=JSON.parse(readFileSync('release/protected-tests.lock.json','utf8'));
 appendFileSync(join(temp,Object.keys(lock)[0]),'\n// unauthorised assertion change\n');
 const result=spawnSync(process.execPath,[join(temp,'release/gate.mjs'),process.cwd()],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Protected assertion changed/);
});
test('feature branch and incomplete bootstrap cannot reach deployment',()=>{
 const result=spawnSync(process.execPath,['release/preflight.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_REF:'refs/heads/feature/example'}});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Feature\/worktree deployment prohibited/);
 const blocked=spawnSync(process.execPath,['release/preflight.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_REF:'refs/heads/release/production',GITHUB_SHA:'0000000000000000000000000000000000000000',CURTAINSUK_DEPLOYMENT_PERMISSIONS_VERIFIED:'true'}});
 assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/Production branch advanced/);
});
test('rollback refuses an unverified target instead of modifying live aliases',()=>{
 const result=spawnSync(process.execPath,['release/rollback.mjs'],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/No verified rollback target/);
});
