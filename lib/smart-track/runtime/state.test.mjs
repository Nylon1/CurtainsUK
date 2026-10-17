import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoState,
  command,
  tick,
  setView,
  selectChannel,
  selectRoom,
  ROOM_IDS,
} from "./state.mjs";
import * as T from "../../../public/room-visualiser/d5908d6eaf486ce33e2f72a5/vendor/three.module.js";
import { createTrackCloth } from "./cloth.mjs";
test("remote and app preserve position through stop, resume and reverse", () => {
  let s = command(createDemoState(), "OPEN");
  for (let i = 0; i < 20; i++) s = tick(s, 0.1);
  assert.ok(s.rooms.living.position > 0 && s.rooms.living.position < 1);
  s = command(s, "STOP");
  const p = s.rooms.living.position;
  s = setView(s, "app");
  s = tick(s, 0.1);
  assert.equal(s.rooms.living.position, p);
  s = command(s, "CLOSE");
  s = tick(s, 0.1);
  assert.ok(s.rooms.living.position < p);
  s = command(s, "OPEN");
  for (let i = 0; i < 100; i++) s = tick(s, 0.1);
  assert.equal(s.rooms.living.position, 1);
});
test("room positions persist; all-channel operation controls five demos, channel six is unassigned", () => {
  let s = selectChannel(createDemoState(), 0);
  s = command(s, "OPEN");
  for (let i = 0; i < 100; i++) s = tick(s, 0.1);
  for (const id of ROOM_IDS) assert.equal(s.rooms[id].position, 1);
  s = selectRoom(s, "bedroom");
  s = command(s, "CLOSE");
  for (let i = 0; i < 100; i++) s = tick(s, 0.1);
  assert.equal(s.rooms.bedroom.position, 0);
  assert.equal(s.rooms.living.position, 1);
  s = selectChannel(s, 6);
  assert.deepEqual(command(s, "OPEN").rooms, s.rooms);
});

test("folding preserves material centimetres and upright UVs for paired and one-way rooms", () => {
  const cloth = createTrackCloth(T);
  try {
    for (const width of [230, 400])
      for (const mode of ["CENTRE", "LEFT", "RIGHT"]) {
        cloth.setWidth(width);
        cloth.setPosition(0, mode);
        const before = cloth.group.children.map((m) =>
          Array.from(m.geometry.attributes.uv.array),
        );
        for (const progress of [0.4, 1]) {
          cloth.setPosition(progress, mode);
          cloth.group.children.forEach((m, panel) => {
            assert.deepEqual(
              Array.from(m.geometry.attributes.uv.array),
              before[panel],
            );
            const pos = m.geometry.attributes.position;
            let length = 0;
            for (let i = 1; i <= 160; i++)
              length += Math.hypot(
                pos.getX(i) - pos.getX(i - 1),
                pos.getZ(i) - pos.getZ(i - 1),
              );
            assert.ok(
              Math.abs(length - (mode === "CENTRE" ? width : width * 2)) <
                0.001,
            );
            assert.equal(m.geometry.attributes.uv.getY(0), 0);
            assert.equal(m.geometry.attributes.uv.getY(24 * 161), 250);
            assert.ok(pos.getX(160) > pos.getX(0));
          });
        }
      }
  } finally {
    cloth.dispose();
  }
});
