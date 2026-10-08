/** Fail-closed local hooks around the shared scene; approved files stay byte-identical. */
export function instrumentViewer(source){
  const once=(needle,replacement)=>{
    if(source.split(needle).length!==2)throw Error(`VIEWER_BRIDGE_DRIFT: ${needle}`);
    source=source.replace(needle,replacement);
  };
  once('  const pipeline=createLightingPipeline(renderer,scene,camera);',`  if(new URLSearchParams(location.search).get('mode')!=='baseline'&&innerWidth<700)renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  const pipeline=createLightingPipeline(renderer,scene,camera);`);
  once('  T.Cache.enabled=false;',`  let roomV2=null;
  const roomV2Ready=new URLSearchParams(location.search).get('mode')==='baseline'?Promise.resolve(null):
    import('/experiment/living.mjs').then(module=>module.createLivingPrototype({T,scene,renderer,camera,lights:{hemi,key,broad,fill},proof,requestRender:()=>render(true)}));
  roomV2Ready.catch(()=>{});
  T.Cache.enabled=false;`);
  once('disposeRoom(activeRoom);activeWindow=null;', 'roomV2=await roomV2Ready;if(serial!==roomGeneration){disposeRoom(gltf.scene);return;}disposeRoom(activeRoom);activeWindow=null;');
  once('dress(activeRoom);scene.add(activeRoom);','dress(activeRoom);scene.add(activeRoom);roomV2?.attach(activeRoom,id);');
  once('function render(fast=false){const t=', 'function render(fast=false){roomV2?.update(performance.now(),isFixed140());const t=');
  return source;
}
