import {ROOMS,colourFor} from './catalog.mjs';

// Session-only UI state. Never shared between rooms or written to catalogue data.
export function createRoomPalettes(){
  const rooms=new Map();
  function get(id){
    const config=ROOMS.find(room=>room.id===id);
    if(!config)throw Error('UNKNOWN_ROOM');
    if(!rooms.has(id))rooms.set(id,Object.fromEntries(Object.entries(config.zones).map(([key,zone])=>[key,zone.initial])));
    return {...rooms.get(id)};
  }
  return {
    get,
    set(id,zone,index){colourFor(id,zone,index);const colours=get(id);colours[zone]=index;rooms.set(id,colours);return {...colours};},
  };
}
