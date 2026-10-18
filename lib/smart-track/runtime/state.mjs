export const ROOM_IDS = Object.freeze([
  "living",
  "bedroom",
  "dining",
  "office",
  "patio",
]);
export function createDemoState(initialPosition = 0) {
  return {
    room: "living",
    channel: 1,
    group: false,
    view: "remote",
    opening: "CENTRE",
    rooms: Object.fromEntries(
      ROOM_IDS.map((id) => [
        id,
        {
          position: initialPosition,
          target: initialPosition,
          moving: false,
          favourite: 0.5,
        },
      ]),
    ),
  };
}
export function command(state, action) {
  const next = structuredClone(state),
    rooms = next.group
      ? Object.values(next.rooms)
      : next.channel === 6
        ? []
        : [next.rooms[next.room]];
  if (!["OPEN", "STOP", "CLOSE", "FAVOURITE"].includes(action))
    throw Error("DEMO_COMMAND_INVALID");
  for (const room of rooms) {
    if (action === "STOP") {
      room.target = room.position;
      room.moving = false;
    } else {
      room.target =
        action === "OPEN" ? 1 : action === "FAVOURITE" ? room.favourite : 0;
      room.moving = room.target !== room.position;
    }
  }
  return next;
}
export function tick(state, seconds) {
  const next = structuredClone(state),
    step = Math.max(0, Math.min(seconds, 0.1)) / 6;
  for (const r of Object.values(next.rooms)) {
    if (!r.moving) continue;
    const distance = r.target - r.position;
    r.position += Math.sign(distance) * Math.min(Math.abs(distance), step);
    r.moving = r.position !== r.target;
  }
  return next;
}
export function selectRoom(state, id) {
  if (!ROOM_IDS.includes(id)) throw Error("DEMO_ROOM_INVALID");
  return {
    ...state,
    room: id,
    channel: ROOM_IDS.indexOf(id) + 1,
    group: false,
  };
}
export function selectChannel(state, channel) {
  if (!Number.isInteger(channel) || channel < 0 || channel > 6)
    throw Error("DEMO_CHANNEL_INVALID");
  return {
    ...state,
    group: channel === 0,
    channel,
    room: channel > 0 && channel < 6 ? ROOM_IDS[channel - 1] : state.room,
  };
}
export function setView(state, view) {
  if (!["remote", "app"].includes(view)) throw Error("DEMO_VIEW_INVALID");
  return { ...state, view };
}
