import test from 'node:test';
import assert from 'node:assert/strict';
import {cushionInspectionTransition,inspectionRotation,CUSHION_VISUAL_SIZES} from './geometry.mjs';

test('every selector shape visibly turns both ways through its camera-relative side',()=>{
  for(const size of CUSHION_VISUAL_SIZES) for(const [from,to] of [[0,Math.PI],[Math.PI,0],[.37,Math.PI],[2.1,0]]) {
    const input={shape:size.shape,mode:'configurator',requested:true,reducedMotion:false,from,to};
    assert.equal(cushionInspectionTransition(input).durationMs,1800);
    for(const side of [Math.PI/2,Math.PI*.75]) {
      const clamped=Math.max(Math.min(from,to),Math.min(Math.max(from,to),side));
      assert.equal(inspectionRotation(from,to,0,side),from);
      assert.equal(inspectionRotation(from,to,.5,side),clamped);
      assert.equal(inspectionRotation(from,to,1,side),to);
      let previous=from;
      for(let i=1;i<=100;i++) {
        const current=inspectionRotation(from,to,i/100,side);
        assert.ok(to>from?current>=previous-1e-12:current<=previous+1e-12);
        assert.ok(current>=Math.min(from,to)-1e-12 && current<=Math.max(from,to)+1e-12);
        previous=current;
      }
    }
  }
});

test('inspection honours reduced motion and never starts on layout, same face or invalid targets',()=>{
  for(const shape of ['square','rectangle','round','bed','bolster']) {
    const input={shape,mode:'configurator',requested:true,reducedMotion:false,from:0,to:Math.PI};
    for(const override of [{reducedMotion:true},{requested:false},{mode:'layout'},{to:0},{to:NaN},{from:undefined},{shape:'unknown'}])
      assert.equal(cushionInspectionTransition({...input,...override}),null);
  }
});
