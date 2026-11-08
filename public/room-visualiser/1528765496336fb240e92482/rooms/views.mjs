import {ROOMS} from './catalog.mjs';
// A second fixed photographic composition, not a zoom/orbit interaction.
// All rooms share the identity curtain mount, so the same left-panel framing
// shows four broad folds when closed and the parked left stack when open.
export const CURTAIN_VIEW=Object.freeze({position:Object.freeze([-60,229,118]),target:Object.freeze([-77,218,0]),fov:36,aspect:1.6});
export function cameraForView(roomId,view){
  const room=ROOMS.find(r=>r.id===roomId);if(!room)throw Error('UNKNOWN_ROOM');
  if(view==='curtain')return CURTAIN_VIEW;
  if(view==='room')return{position:room.camera,target:room.target,fov:room.fov,aspect:1.6};
  throw Error('INVALID_FIXED_VIEW');
}
export function applyFixedView(camera,roomId,view){
  const config=cameraForView(roomId,view);camera.position.set(...config.position);camera.fov=config.fov;camera.aspect=config.aspect;camera.lookAt(...config.target);camera.updateProjectionMatrix();
}
