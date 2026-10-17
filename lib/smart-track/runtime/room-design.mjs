// Photographic room layers are illustrative, not installation drawings or catalogue fabrics.
export const ROOM_DESIGNS = Object.freeze({
  living: {
    mount: "WALL",
    rail: [0.23, 0.77, 0.075, 0.734],
    lamps: [[0.951, 0.435]],
  },
  bedroom: {
    mount: "CEILING",
    rail: [0.247, 0.754, 0.13, 0.769],
    lamps: [
      [0.197, 0.498],
      [0.964, 0.46],
    ],
  },
  dining: {
    mount: "WALL",
    rail: [0.258, 0.741, 0.108, 0.802],
    lamps: [
      [0.221, 0.344],
      [0.778, 0.345],
      [0.139, 0.527],
    ],
  },
  office: {
    mount: "WALL",
    rail: [0.246, 0.76, 0.091, 0.772],
    lamps: [[0.083, 0.481]],
  },
  patio: {
    mount: "CEILING",
    rail: [0.242, 0.758, 0.09, 0.778],
    lamps: [[0.046, 0.428]],
  },
});
export const PLAIN_COLOURS = Object.freeze([
  { id: "ivory", name: "Ivory", hex: "#e9e3d5" },
  { id: "oat", name: "Oatmeal", hex: "#c8b799" },
  { id: "taupe", name: "Taupe", hex: "#9e8c79" },
  { id: "olive", name: "Olive", hex: "#69704c" },
  { id: "sage", name: "Sage", hex: "#96a18c" },
  { id: "blue", name: "Dusty blue", hex: "#788b9a" },
  { id: "charcoal", name: "Charcoal", hex: "#4b4d4b" },
]);
