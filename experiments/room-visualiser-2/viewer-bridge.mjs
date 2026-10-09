/** Fail-closed local hooks around the shared scene; approved files stay byte-identical. */
export function instrumentViewer(source){
  const once=(needle,replacement)=>{
    if(source.split(needle).length!==2)throw Error(`VIEWER_BRIDGE_DRIFT: ${needle}`);
    source=source.replace(needle,replacement);
  };
  once('  const pipeline=createLightingPipeline(renderer,scene,camera);',`  if(new URLSearchParams(location.search).get('mode')!=='baseline'&&innerWidth<700)renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  if(new URLSearchParams(location.search).get('compareDpr')==='1.25')renderer.setPixelRatio(1.25);proof.comparisonPixelRatio=renderer.getPixelRatio();
  const pipeline=createLightingPipeline(renderer,scene,camera);window.roomRefinement={renderer,scene,camera,pipeline};`);
  once('  T.Cache.enabled=false;',`  let roomV2=null;
  const roomV2Ready=new URLSearchParams(location.search).get('mode')==='baseline'?Promise.resolve(null):
    import(new URLSearchParams(location.search).get('mode')==='before'?'/experiment/living-before.mjs':new URLSearchParams(location.search).get('mode')==='review'?'/experiment/performance-snapshot/living.mjs':'/experiment/living.mjs').then(module=>module.createLivingPrototype({T,scene,renderer,camera,lights:{hemi,key,broad,fill},proof,requestRender:()=>render(true)}));
  roomV2Ready.catch(()=>{});
  T.Cache.enabled=false;`);
  once('disposeRoom(activeRoom);activeWindow=null;', 'roomV2=await roomV2Ready;await roomV2?.prepareRoom?.(id);if(serial!==roomGeneration){disposeRoom(gltf.scene);return;}disposeRoom(activeRoom);activeWindow=null;');
  once('dress(activeRoom);scene.add(activeRoom);','dress(activeRoom);scene.add(activeRoom);roomV2?.attach(activeRoom,id);');
  once('contacts=contactShadows(id);scene.add(contacts);','contacts=contactShadows(id);roomV2?.adaptContacts?.(contacts,id);scene.add(contacts);');
  once('proof.room=id;proof.colours=roomPalettes.get(id);','proof.room=id;roomV2?.initialisePalette?.(roomPalettes,id);proof.colours=roomPalettes.get(id);');
  once('function render(fast=false){const t=', 'function render(fast=false){roomV2?.update(performance.now(),isFixed140());const t=');
  once('render();await new Promise(requestAnimationFrame);render();',`await roomV2?.prepareRenderer?.(pipeline,isFixed140());if(serial!==roomGeneration)return;if(new URLSearchParams(location.search).has('profileShaders')){const compileStart=performance.now();await renderer.compileAsync(scene,camera);proof.explicitCompileMs=performance.now()-compileStart;}render();await new Promise(requestAnimationFrame);render();`);
  return source;
}
