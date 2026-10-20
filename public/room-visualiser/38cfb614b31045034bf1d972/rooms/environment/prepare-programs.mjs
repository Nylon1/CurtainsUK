/** Prepare the exact linear HDR programs used by EffectComposer, including the
 * fireplace blend state. All work completes before the room is reported ready. */
export async function prepareRoomPrograms({T,renderer,scene,camera,pipeline,primeFire}){
  const started=performance.now(),previous=renderer.getRenderTarget();
  const target=pipeline.enabled?new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType}):null;
  let compileMs,warmMs;
  try{
    renderer.setRenderTarget(target);
    const compileStart=performance.now();await renderer.compileAsync(scene,camera);compileMs=performance.now()-compileStart;
    // Zero-alpha flames still prepare their actual GPU blend/depth state. This
    // offscreen draw also uploads textures without showing a partial room.
    const warmStart=performance.now();primeFire(true);renderer.shadowMap.needsUpdate=true;
    renderer.render(scene,camera);renderer.getContext().finish();warmMs=performance.now()-warmStart;
  }finally{primeFire(false);renderer.setRenderTarget(previous);target?.dispose();}
  return{compileMs,gpuPreparationMs:warmMs,totalMs:performance.now()-started,programs:renderer.info.programs.length};
}
