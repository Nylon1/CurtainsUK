/** Separate 100 cm preview cameras; frozen 120 cm V1 remains unchanged. */
export function cameraForFixed140View(view,aspect){
  if(!Number.isFinite(aspect)||aspect<=0)throw Error('INVALID_ASPECT');
  const fov=38,rad=fov*Math.PI/360;
  if(view==='curtain')return{position:[-34,57,95],target:[-34,53,0],fov};
  if(view==='full')return{position:[0,51,Math.max(145/(2*Math.tan(rad)*aspect),113/(2*Math.tan(rad)))*1.1],target:[0,51,0],fov};
  if(view==='room')return{position:[26,65,Math.max(230/(2*Math.tan(rad)*aspect),170/(2*Math.tan(rad)))*1.23],target:[0,54,0],fov};
  throw Error('INVALID_FIXED140_VIEW');
}
export function applyFixed140View(camera,view,aspect){
  const config=cameraForFixed140View(view,aspect);
  camera.position.set(...config.position);camera.fov=config.fov;camera.aspect=aspect;
  camera.lookAt(...config.target);camera.updateProjectionMatrix();
  return config;
}
