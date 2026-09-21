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
    const rooms = new Set(), curtains = new Set();
    for (const room of house.rooms) {
      if (!UUID.test(room.room_id) || rooms.has(room.room_id) || typeof room.room_name !== 'string' || !Array.isArray(room.curtains)) throw Error('Your saved rooms need help to reopen. No saved data has been removed.');
      rooms.add(room.room_id);
      for (const curtain of room.curtains) {
        if (!UUID.test(curtain.configuration_id) || curtains.has(curtain.configuration_id) || !curtain.configuration || !curtain.fabric || typeof curtain.receipt !== 'string' || !Number.isSafeInteger(curtain.last_validated_price) || curtain.last_validated_price < 0) throw Error('A saved curtain could not be read. No saved data has been removed.');
        curtains.add(curtain.configuration_id);
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
  async function addCurtain(retained, options = {}, storage = localStorage) {
    const current = ensure(storage);
    const existing = current.rooms.find(room => room.curtains.some(c => c.configuration_id === retained.configuration_id));
    if (existing) return { house: current, room: existing, reused: true };
    let roomId;
    const house = await change(current.revision, next => {
      const room = options.roomId ? roomById(next, options.roomId) : addRoom(next, options.roomName);
      roomId = room.room_id;
      // Explicit allowlist: no checkout URL, privileged data, or arbitrary response fields survive.
      room.curtains.push(clone({
        configuration_id: retained.configuration_id, fabric_master_id: retained.fabric_master_id,
        configuration: retained.configuration, fabric: retained.fabric,
        receipt: retained.receipt, last_validated_price: retained.last_validated_price,
        last_validated_at: retained.last_validated_at, pricing_version: retained.pricing_version,
        visual: retained.visual || {}, window_name: name(options.windowName, retained.window_name || 'Window')
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
  return { KEY, INTENT_KEY, read, ensure, change, addRoom, roomById, addCurtain, totals, intent, readIntent, name, assertHouse };
});
