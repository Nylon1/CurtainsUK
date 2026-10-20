// Fixed scene contracts. All placement and camera lengths are centimetres.
const furniture = [['Cream','#e5ddca'],['Taupe','#b0a08d'],['Beige','#caba9c'],['Sage','#9da78c'],['Olive','#7e8768'],['Blush','#cba39a'],['Terracotta','#b87961'],['Soft blue','#8cabb8'],['Navy','#455668'],['Charcoal','#555957']];
export const PALETTES = Object.freeze({
  wall: [['Warm white','#e9e4d9'],['Soft beige','#d7cbb7'],['Sage','#afb7a1'],['Pale grey','#d3d3ce'],['Muted blush','#d6bdb5'],['Blue grey','#aebdc1'],['Warm taupe','#b9ab9b']],
  floor: [['Light oak','#d3c3a6'],['Natural oak','#bfa786'],['Medium oak','#a88b6c'],['Dark walnut','#725a47'],['Pale grey wood','#c0bdb2'],['Deep grey wood','#797a74']],
  furniture,
  cushion: [...furniture,['Natural','#d6cbb7']]
});
const zone=(label,palette,initial)=>({label,palette,initial});
export const ROOMS = Object.freeze([
  {id:'living',name:'Living Room',style:'Warm contemporary',description:'Generous linen seating, pale oak and quiet sculptural details.',camera:[245,205,690],target:[-6,117,70],fov:43,
    zones:{CEILING_MATERIAL:zone('Ceiling','wall',0),WALL_MATERIAL:zone('Walls','wall',0),FLOOR_MATERIAL:zone('Floor','floor',0),SOFA_UPHOLSTERY:zone('Sofa','furniture',0),ARMCHAIR_UPHOLSTERY:zone('Armchair','furniture',1),CUSHION_UPHOLSTERY:zone('Cushions','cushion',0)}},
  {id:'bedroom',name:'Bedroom',style:'Soft & restful',description:'An upholstered bed, softly draped linen and warm bedside light.',camera:[275,230,730],target:[-22,112,90],fov:43,
    zones:{CEILING_MATERIAL:zone('Ceiling','wall',0),WALL_MATERIAL:zone('Walls','wall',0),FLOOR_MATERIAL:zone('Floor','floor',0),BED_COVER:zone('Bedspread','furniture',0),HEADBOARD:zone('Bed upholstery','furniture',1),CUSHION_UPHOLSTERY:zone('Cushions','cushion',0)}},
  {id:'lounge',name:'Lounge',style:'Relaxed classic',description:'Rolled arms, restrained wall mouldings and darker timber accents.',camera:[235,200,690],target:[-2,115,65],fov:43,
    zones:{CEILING_MATERIAL:zone('Ceiling','wall',0),WALL_MATERIAL:zone('Walls','wall',1),FLOOR_MATERIAL:zone('Floor','floor',1),SEATING_UPHOLSTERY:zone('Seating','furniture',2),CUSHION_UPHOLSTERY:zone('Cushions','cushion',0)}},
  {id:'office',name:'Office',style:'Calm & considered',description:'A timber desk, upholstered task chair and a small curated bookcase.',camera:[240,210,690],target:[-10,116,60],fov:43,
    zones:{CEILING_MATERIAL:zone('Ceiling','wall',0),WALL_MATERIAL:zone('Walls','wall',0),FLOOR_MATERIAL:zone('Floor','floor',0),DESK_SURFACE:zone('Desk finish','floor',1),OFFICE_CHAIR_UPHOLSTERY:zone('Chair','furniture',1)}}
]);
export const MOUNT=Object.freeze({position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],opening:{width:212,bottom:10,top:238,backZ:-25},track:{width:234,y:251.4},clearClothEnvelope:{x:[-115,115],y:[0,250],z:[-18,18]}});
export function colourFor(roomId,zoneId,index){
  const room=ROOMS.find(r=>r.id===roomId),zone=room?.zones[zoneId];
  if(!zone||!Number.isInteger(index)||!PALETTES[zone.palette][index])throw Error('INVALID_ROOM_COLOUR');
  return PALETTES[zone.palette][index][1];
}
