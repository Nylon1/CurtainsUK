import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createAmbienceState,MODES,RADIATOR} from './ambience.mjs';
import {instrumentViewer} from './viewer-bridge.mjs';
import {buildFixed140Mesh} from '../../lib/room-visualiser/runtime/fixed140-v1/fixed140_wave_core.mjs';
import {buildFixed140OpenPosition,createFixed140TravelSolver} from '../../lib/room-visualiser/runtime/fixed140-v1/motion.mjs';

test('ambience persists independently of room/fabric palette and rejects invalid input',()=>{
  const state=createAmbienceState();state.set('living','mode','evening');state.set('living','fire',true);
  assert.equal(state.get('bedroom').fire,false);assert.equal(state.get('living').mode,'evening');
  const copy=state.get('living');copy.fire=false;assert.equal(state.get('living').fire,true);
  assert.throws(()=>state.set('living','mode','unknown'));assert.throws(()=>state.set('living','fire',1));assert.throws(()=>state.set('office','fire',true));
});
test('inspection is neutral and every mode has finite exposure/light intensities',()=>{
  assert.equal(MODES.inspection.warmth,0);
  for(const mode of Object.values(MODES))for(const value of Object.values(mode))assert.ok(Number.isFinite(value)&&value>=0);
});
test('local scene hooks fail closed on production viewer drift and never touch curtain functions',async()=>{
  const source=await readFile(new URL('../../lib/room-visualiser/runtime/rooms/viewer.mjs',import.meta.url),'utf8');
  const changed=instrumentViewer(source);assert.match(changed,/mode.*baseline/);assert.match(changed,/roomV2\?\.attach/);
  assert.throws(()=>instrumentViewer(source.replace('dress(activeRoom);scene.add(activeRoom);','different code')),/VIEWER_BRIDGE_DRIFT/);
  const unchanged=source.slice(source.indexOf('  function tick(now)'),source.indexOf('  for(const b of document.querySelectorAll(\'[data-pose]\')'));
  assert.ok(changed.includes(unchanged));
});
test('radiator clears every sampled V1 pose across all six frozen widths including settle',()=>{
  let lowest=Infinity;
  for(const width of [120,135,137,140,150,160]){
    const closed=buildFixed140Mesh(width),open=buildFixed140OpenPosition(closed.position,closed.flatPanelWidthCm),solve=createFixed140TravelSolver(closed.position,open,closed.flatPanelWidthCm);
    for(let i=0;i<=20;i++)for(const lag of [0,-.02,.02]){
      const pose=solve(i/20,undefined,{hemProgress:Math.min(1,Math.max(0,i/20+lag)),settleDepthCm:.12});
      for(let v=1;v<pose.length;v+=3)lowest=Math.min(lowest,pose[v]+96);
    }
  }
  assert.ok(lowest-RADIATOR.top>=17.9,`Minimum clearance: ${lowest-RADIATOR.top} cm`);
});
test('all production runtime, eligibility, theme and catalogue bytes remain unchanged',()=>{
  const diff=execFileSync('git',['diff','a83b38fd8f71b967e51ebe0173603df7c29b87d3','--','lib','public','app','shopify-theme','package.json','package-lock.json'],{encoding:'utf8'});
  assert.equal(diff,'');
});
