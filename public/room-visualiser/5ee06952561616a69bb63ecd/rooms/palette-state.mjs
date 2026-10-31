import {ROOMS,PALETTES,colourFor} from './catalog.mjs';

// Session-only UI state. Never shared between rooms or written to catalogue data.
export function createRoomPalettes(extraRooms=[]){
  const catalogue=[...ROOMS,...extraRooms];
  const rooms=new Map();
  function get(id){
    const config=catalogue.find(room=>room.id===id);
    if(!config)throw Error('UNKNOWN_ROOM');
    if(!rooms.has(id))rooms.set(id,Object.fromEntries(Object.entries(config.zones).map(([key,zone])=>[key,zone.initial])));
    return {...rooms.get(id)};
  }
  return {
    get,
    set(id,zone,index){
      const config=catalogue.find(room=>room.id===id),entry=config?.zones[zone];
      if(!entry||!Number.isInteger(index)||!PALETTES[entry.palette]?.[index])throw Error('INVALID_ROOM_COLOUR');
      if(ROOMS.some(room=>room.id===id))colourFor(id,zone,index);
      const colours=get(id);colours[zone]=index;rooms.set(id,colours);return {...colours};
    },
  };
}
