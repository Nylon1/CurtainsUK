/* Structured device persistence. Server-signed receipts, never browser prices, authorize review. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CurtainsUKRooms = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const KEY = 'curtainsuk_house_v1';
  const INTENT_KEY = 'curtainsuk_room_intent_v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => crypto.randomUUID();
  const name = (value, fallback) => String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80) || fallback;
  function assertHouse(house) {
    if (!house || house.schema_version !== 1 || !UUID.test(house.house_id) || !Number.isSafeInteger(house.revision) || !Array.isArray(house.rooms)) throw Error('Your saved rooms could not be read. They have been kept on this device. Please contact us for help.');
    const rooms = new Set(), curtains = new Set(), items = new Set();
    for (const room of house.rooms) {
      if (!UUID.test(room.room_id) || rooms.has(room.room_id) || typeof room.room_name !== 'string' || !Array.isArray(room.curtains)) throw Error('Your saved rooms need help to reopen. No saved data has been removed.');
      rooms.add(room.room_id);
      for (const curtain of room.curtains) {
        if (!UUID.test(curtain.configuration_id) || curtains.has(curtain.configuration_id) || !curtain.configuration || !curtain.fabric || typeof curtain.receipt !== 'string' || !Number.isSafeInteger(curtain.last_validated_price) || curtain.last_validated_price < 0) throw Error('A saved curtain could not be read. No saved data has been removed.');
        const itemId=curtain.order_item_id || curtain.configuration_id;
        if(!UUID.test(itemId) || items.has(itemId) || (curtain.quantity!==undefined && (!Number.isSafeInteger(curtain.quantity)||curtain.quantity<1||curtain.quantity>50))) throw Error('A saved curtain quantity or identity needs review. No data has been removed.');
        items.add(itemId);
        curtains.add(curtain.configuration_id);
      }
    }
    if (house.products !== undefined) {
      if (!Array.isArray(house.products) || house.products.length > 32) throw Error('Your saved order needs help to reopen. No data has been removed.');
      for (const product of house.products) {
        if (!UUID.test(product.id) || items.has(product.id) || product.type !== 'CUSHION' || !product.spec || product.spec.version !== 1 || !UUID.test(product.sourceDesignId) || typeof product.sourceSpecId !== 'string' || !Number.isSafeInteger(product.quantity) || product.quantity < 1 || product.quantity > 50) throw Error('A saved product could not be read. No data has been removed.');
        items.add(product.id);
      }
    }
    return house;
  }
  function read(storage = localStorage) {
    let raw;
    try { raw = storage.getItem(KEY); } catch { throw Error('This browser cannot open saved rooms. Please allow site storage.'); }
    if (!raw) return null;
    try { return assertHouse(JSON.parse(raw)); } catch (error) { throw Error(error instanceof SyntaxError ? 'Your saved rooms could not be read. No saved data has been removed.' : error.message); }
  }
  function write(house, storage = localStorage) {
    assertHouse(house);
    const encoded = JSON.stringify(house);
    try { storage.setItem(KEY, encoded); if (storage.getItem(KEY) !== encoded) throw Error(); }
    catch { throw Error('Your change could not be saved. Your existing rooms are unchanged. Free some browser storage and try again.'); }
    return clone(house);
  }
  function ensure(storage = localStorage) {
    return read(storage) || write({ schema_version: 1, house_id: id(), revision: 0, updated_at: new Date().toISOString(), rooms: [] }, storage);
  }
  async function change(expectedRevision, transform, storage = localStorage) {
    const commit = () => {
      const current = ensure(storage);
      if (current.revision !== expectedRevision) throw Error('Your rooms changed in another tab. Please review the latest saved rooms and try again.');
      const next = clone(current);
      transform(next);
      next.revision++;
      next.updated_at = new Date().toISOString();
      // A checkout/review token is deliberately never persisted. Every revision needs a fresh review.
      return write(next, storage);
    };
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(KEY, commit);
    return commit();
  }
  function roomById(house, roomId) {
    const room = house.rooms.find(item => item.room_id === roomId);
    if (!room) throw Error('This room has changed. Please reopen your rooms.');
    return room;
  }
  function addRoom(house, roomName) {
    const room = { room_id: id(), room_name: name(roomName, `Room ${house.rooms.length + 1}`), curtains: [] };
    house.rooms.push(room);
    return room;
  }
  async function removeRoom(roomId, expectedRevision, storage = localStorage) {
    return change(expectedRevision, next => {
      const room=roomById(next,roomId);
      if(room.unassigned)throw Error('My order cannot be removed as a room.');
      if(next.products)next.products=next.products.filter(product=>product.roomId!==roomId);
      next.rooms=next.rooms.filter(r=>r.room_id!==roomId);
    },storage);
  }
  async function addCurtain(retained, options = {}, storage = localStorage) {
    const current = ensure(storage);
    const existing = current.rooms.find(room => room.curtains.some(c => c.configuration_id === retained.configuration_id));
    if (existing && !options.editItemId) return { house: current, room: existing, reused: true };
    let roomId;
    const house = await change(options.expectedRevision ?? current.revision, next => {
      const editRoom = options.editItemId && next.rooms.find(r => r.curtains.some(c => (c.order_item_id || c.configuration_id) === options.editItemId));
      if (options.editItemId && !editRoom) throw Error('This order item no longer exists. Return to Design My Home.');
      const prior = editRoom?.curtains.find(c => (c.order_item_id || c.configuration_id) === options.editItemId);
      const room = options.roomId ? roomById(next, options.roomId) : options.roomName ? addRoom(next, options.roomName) : (options.roomId === undefined ? editRoom : null) || next.rooms.find(r => r.unassigned === true) || Object.assign(addRoom(next, 'My order'), {unassigned:true});
      if (editRoom) editRoom.curtains = editRoom.curtains.filter(c => (c.order_item_id || c.configuration_id) !== options.editItemId);
      roomId = room.room_id;
      // Explicit allowlist: no checkout URL, privileged data, or arbitrary response fields survive.
      room.curtains.push(clone({
        order_item_id: options.editItemId || retained.configuration_id, quantity: prior?.quantity || 1, configuration_id: retained.configuration_id, fabric_master_id: retained.fabric_master_id,
        configuration: retained.configuration, fabric: retained.fabric,
        receipt: retained.receipt, last_validated_price: retained.last_validated_price,
        last_validated_at: retained.last_validated_at, pricing_version: retained.pricing_version,
        visual: retained.visual || {}, window_name: name(options.windowName, prior?.window_name || retained.window_name || 'Window')
      }));
    }, storage);
    return { house, room: roomById(house, roomId), reused: false };
  }
  function totals(house) {
    const curtains = house.rooms.flatMap(room => room.curtains);
    return { rooms: house.rooms.filter(room => room.curtains.length).length, curtains: curtains.length, subtotal: curtains.reduce((total, curtain) => total + curtain.last_validated_price, 0) };
  }
  function intent(roomId, storage = localStorage) { storage.setItem(INTENT_KEY, JSON.stringify({ room_id: roomId || null })); }
  function readIntent(storage = localStorage) { try { return JSON.parse(storage.getItem(INTENT_KEY) || 'null'); } catch { return null; } }
  function clearIntent(storage = localStorage) { storage.removeItem(INTENT_KEY); }
  function orderItems(house) {
    return [...house.rooms.flatMap(room => room.curtains.map(c => ({id:c.order_item_id || c.configuration_id,type:'CURTAIN',quantity:c.quantity || 1,roomId:room.unassigned ? null : room.room_id,roomName:room.unassigned ? '' : room.room_name,curtain:c}))), ...(house.products || []).map(p => ({...clone(p),roomName:house.rooms.find(r=>r.room_id===p.roomId)?.room_name || ''}))];
  }
  function orderItem(house,itemId) { return orderItems(house).find(p=>p.id===itemId); }
  async function addCushions(design, pieces, options = {}, storage = localStorage) {
    const current=ensure(storage);let added=0,updated=0;
    const house=await change(options.expectedRevision ?? current.revision,next=>{
      next.products ||= [];
      for(const piece of pieces){
        const old=options.editItemId ? next.products.find(p=>p.id===options.editItemId) : next.products.find(p=>p.sourceDesignId===design.id && p.sourceSpecId===piece.spec.id);
        if(options.editItemId && (!old || pieces.length!==1))throw Error('This cushion order item has changed. Return to Design My Home.');
        if(!old && options.roomId)roomById(next,options.roomId);
        const product={id:old?.id || id(),type:'CUSHION',sourceDesignId:old?.sourceDesignId || design.id,sourceSpecId:old?.sourceSpecId || piece.spec.id,spec:clone(piece.spec),quantity:piece.spec.quantity,roomId:old ? old.roomId : options.roomId || null,fabric:clone(piece.fabric || {}),label:String(piece.label || 'Cushion').slice(0,100)};
        if(old){next.products[next.products.indexOf(old)]=product;updated++;}else{next.products.push(product);added++;}
      }
    },storage);
    return {house,added,updated};
  }
  async function updateOrderItem(itemId, changes, expectedRevision, storage=localStorage) {
    return change(expectedRevision,next=>{
      const item=orderItem(next,itemId);if(!item)throw Error('This item no longer exists. Reopen Design My Home.');
      if(changes.quantity !== undefined && (!Number.isSafeInteger(changes.quantity)||changes.quantity<1||changes.quantity>50))throw Error('Choose a quantity from 1 to 50.');
      if(item.type==='CUSHION'){
        const p=next.products.find(p=>p.id===itemId);if(changes.remove)next.products=next.products.filter(p=>p.id!==itemId);else {if(changes.quantity!==undefined)p.quantity=changes.quantity;if(changes.roomId!==undefined){if(changes.roomId)roomById(next,changes.roomId);p.roomId=changes.roomId || null;}}
      }else{
        const r=next.rooms.find(r=>r.curtains.some(c=>(c.order_item_id||c.configuration_id)===itemId));const c=r.curtains.find(c=>(c.order_item_id||c.configuration_id)===itemId);
        if(changes.remove)r.curtains=r.curtains.filter(x=>x!==c);else {if(changes.quantity!==undefined)c.quantity=changes.quantity;if(changes.roomId!==undefined && changes.roomId!==item.roomId){const target=changes.roomId ? roomById(next,changes.roomId) : next.rooms.find(r=>r.unassigned) || Object.assign(addRoom(next,'My order'),{unassigned:true});r.curtains=r.curtains.filter(x=>x!==c);target.curtains.push(c);}}
      }
    },storage);
  }
  function curtainReview(house,postcode) {
    return {house_id:house.house_id,revision:house.revision,postcode,rooms:house.rooms.filter(r=>r.curtains.length).map(r=>({room_id:r.room_id,room_name:r.unassigned?'My order':r.room_name,curtains:r.curtains.map(c=>({configuration_id:c.configuration_id,receipt:c.receipt,window_name:c.window_name,quantity:c.quantity||1}))}))};
  }
  function orderedCushionSpecs(house) { return (house.products||[]).map(p=>({...clone(p.spec),id:p.id,quantity:p.quantity})); }
  return { orderItems,orderItem,addCushions,updateOrderItem,curtainReview,orderedCushionSpecs, KEY, INTENT_KEY, read, ensure, change, addRoom, removeRoom, roomById, addCurtain, totals, intent, readIntent, clearIntent, name, assertHouse };
});
