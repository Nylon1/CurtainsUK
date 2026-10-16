import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const Store=createRequire(import.meta.url)('../../../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms-store.js');
function storage(){const values=new Map();return {getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)};}
const spec=()=>({version:1,id:randomUUID(),fabricId:'fixture-plain',sizeId:'square-50',filling:'cover',edge:'unpiped',placementMm:{x:100,y:100},quantity:1});
const retained=()=>({configuration_id:randomUUID(),fabric_master_id:'fixture-plain',configuration:{widthCm:180,dropCm:220},fabric:{design:'Plain',colour:'Blue'},receipt:'signed-fixture',last_validated_price:45000});
test('My Home preserves legacy curtains and adds only explicitly selected cushions, without duplicate Add',async()=>{const disk=storage(),legacy=Store.ensure(disk),curtain=retained();legacy.rooms=[{room_id:randomUUID(),room_name:'Lounge',curtains:[curtain]}];disk.setItem(Store.KEY,JSON.stringify(legacy));const design={id:randomUUID()},a={spec:spec()},b={spec:spec()};assert.equal(Store.orderItems(Store.read(disk)).length,1);let result=await Store.addCushions(design,[a],{},disk);assert.equal(result.house.rooms[0].curtains[0].receipt,curtain.receipt);assert.equal(result.house.products.length,1);const id=result.house.products[0].id;result=await Store.addCushions(design,[a,b],{},disk);assert.equal(result.house.products.length,2);assert.equal(result.house.products[0].id,id);assert.equal(Store.read(disk).house_id,legacy.house_id);});
test('Cushion edit preserves identity and source design, rejects stale revision, and keeps order quantity explicit',async()=>{const disk=storage(),design={id:randomUUID()},piece={spec:spec()};let result=await Store.addCushions(design,[piece],{},disk);const id=result.house.products[0].id,openedRevision=result.house.revision;let house=await Store.updateOrderItem(id,{quantity:3},openedRevision,disk);await assert.rejects(Store.addCushions(design,[piece],{editItemId:id,expectedRevision:openedRevision},disk),/another tab/);piece.spec.sizeId='square-45';piece.spec.quantity=3;result=await Store.addCushions(design,[piece],{editItemId:id,expectedRevision:house.revision},disk);assert.equal(result.house.products.length,1);assert.equal(result.house.products[0].id,id);assert.equal(result.house.products[0].spec.sizeId,'square-45');assert.equal(Store.orderedCushionSpecs(result.house)[0].quantity,3);assert.equal(Store.orderedCushionSpecs(result.house)[0].id,id);house=await Store.updateOrderItem(id,{remove:true},result.house.revision,disk);assert.equal(Store.orderItems(house).length,0);assert.equal(piece.spec.sizeId,'square-45');});
test('Curtain editing replaces the signed configuration at stable order identity, preserves quantity and rejects stale edit',async()=>{const disk=storage();let result=await Store.addCurtain(retained(),{},disk);const item=Store.orderItems(result.house)[0];assert.equal(item.roomId,null);const opened=result.house.revision;let house=await Store.updateOrderItem(item.id,{quantity:2},opened,disk);await assert.rejects(Store.addCurtain(retained(),{editItemId:item.id,expectedRevision:opened},disk),/another tab/);const next=retained();result=await Store.addCurtain(next,{editItemId:item.id,expectedRevision:house.revision},disk);assert.equal(Store.orderItems(result.house).length,1);assert.equal(Store.orderItems(result.house)[0].id,item.id);assert.equal(Store.orderItems(result.house)[0].curtain.configuration_id,next.configuration_id);assert.equal(Store.curtainReview(result.house,'BB2 3FA').rooms[0].curtains[0].quantity,2);});
test('Optional room assignment is separate from cushion specification; reopening roundtrips the whole mixed order',async()=>{const disk=storage(),piece={spec:spec()},design={id:randomUUID()};let {house}=await Store.addCurtain(retained(),{},disk);house=(await Store.addCushions(design,[piece],{},disk)).house;const item=house.products[0],original=structuredClone(item.spec);house=await Store.change(house.revision,(h:any)=>Store.addRoom(h,'Bedroom'),disk);const room=house.rooms.find((r:any)=>r.room_name==='Bedroom');house=await Store.updateOrderItem(item.id,{roomId:room.room_id},house.revision,disk);assert.deepEqual(house.products[0].spec,original);assert.equal(Store.orderItem(Store.read(disk),item.id).roomName,'Bedroom');assert.deepEqual(Store.read(disk),house);});

test('Room-scoped cushion additions assign the set only on Add and preserve existing assignments on repeat or edit',async()=>{
 const disk=storage(),design={id:randomUUID()},pieces=[{spec:spec()},{spec:spec()}];
 let house=Store.ensure(disk);house=await Store.change(house.revision,(h:any)=>{Store.addRoom(h,'Bedroom');Store.addRoom(h,'Lounge');},disk);
 const [bedroom,lounge]=house.rooms;assert.equal(Store.orderItems(house).length,0);
 house=(await Store.addCushions(design,pieces,{roomId:bedroom.room_id},disk)).house;
 assert.ok(house.products.every((p:any)=>p.roomId===bedroom.room_id));
 const originalIds=house.products.map((p:any)=>p.id);
 house=(await Store.addCushions(design,pieces,{roomId:lounge.room_id},disk)).house;
 assert.deepEqual(house.products.map((p:any)=>p.id),originalIds);assert.ok(house.products.every((p:any)=>p.roomId===bedroom.room_id));
 house=await Store.updateOrderItem(originalIds[0],{roomId:''},house.revision,disk);
 house=(await Store.addCushions(design,[pieces[0]],{roomId:lounge.room_id,editItemId:originalIds[0]},disk)).house;
 assert.equal(house.products[0].roomId,null);assert.deepEqual(Store.read(disk),house);
 const before=structuredClone(house);
 await assert.rejects(Store.addCushions({id:randomUUID()},[{spec:spec()}],{roomId:randomUUID()},disk),/room has changed/);
 assert.deepEqual(Store.read(disk),before);
});

test('Removing a room removes its curtains and cushions from checkout, preserves other items and rejects stale removal',async()=>{
 const disk=storage(),design={id:randomUUID()},a={spec:spec()},b={spec:spec()};let house=Store.ensure(disk);
 house=await Store.change(house.revision,(h:any)=>{Store.addRoom(h,'Bedroom');Store.addRoom(h,'Lounge');},disk);
 const [bedroom,lounge]=house.rooms;
 house=(await Store.addCurtain(retained(),{roomId:bedroom.room_id},disk)).house;
 house=(await Store.addCushions(design,[a],{roomId:bedroom.room_id},disk)).house;
 house=(await Store.addCushions(design,[b],{roomId:lounge.room_id},disk)).house;
 const stale=house.revision;house=await Store.updateOrderItem(house.products[1].id,{quantity:2},house.revision,disk);
 await assert.rejects(Store.removeRoom(bedroom.room_id,stale,disk),/another tab/);
 house=await Store.removeRoom(bedroom.room_id,house.revision,disk);
 assert.equal(house.rooms.some((r:any)=>r.room_id===bedroom.room_id),false);
 assert.equal(Store.orderItems(house).length,1);assert.equal(Store.orderItems(house)[0].quantity,2);
 assert.equal(Store.curtainReview(house,'').rooms.length,0);assert.equal(Store.orderedCushionSpecs(house).length,1);
 assert.equal(house.products[0].sourceSpecId,b.spec.id);assert.deepEqual(Store.read(disk),house);
 house=await Store.removeRoom(lounge.room_id,house.revision,disk);assert.equal(Store.orderItems(house).length,0);
 assert.equal(Store.orderedCushionSpecs(house).length,0);assert.equal(house.rooms.length,0);
});
