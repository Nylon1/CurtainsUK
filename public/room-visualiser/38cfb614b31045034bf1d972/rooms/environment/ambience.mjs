export const MODES=Object.freeze({
  daylight:{hemi:.9,key:.55,broad:3.5,fill:.7,exposure:1.08,warmth:0},
  evening:{hemi:.38,key:.06,broad:.8,fill:.5,exposure:1.12,warmth:1},
  inspection:{hemi:1.2,key:.35,broad:5,fill:2,exposure:1.0,warmth:0},
});
export function createAmbienceState(){
  const rooms=new Map();
  const supported=new Set(['living','bedroom','lounge','office']);
  const get=id=>({...rooms.get(id)||{mode:'daylight',lamps:false,fire:false}});
  return {get,set(id,key,value){
    if(key==='mode'&&!Object.hasOwn(MODES,value))throw Error('INVALID_AMBIENCE');
    if(!['mode','lamps','fire'].includes(key)||key!=='mode'&&typeof value!=='boolean')throw Error('INVALID_AMBIENCE');
    if(!supported.has(id))throw Error('ROOM_AMBIENCE_UNSUPPORTED');
    if(key==='fire'&&value&&id!=='living')throw Error('ROOM_FIREPLACE_UNAVAILABLE');
    const next={...get(id),[key]:value};rooms.set(id,next);return {...next};
  }};
}
export const RADIATOR=Object.freeze({width:112,height:53,bottom:25,top:78,frontZ:-8,curtainHem:96,clearanceCm:18});
