import { resolvePanazFabric } from "./panaz-catalogue.mjs";
export const VERSION = 1;
export const STORAGE_KEY = "curtainsuk.hotel-studio.v1";
export const ITEMS = Object.freeze({
  curtains: "Main curtains",
  voile: "Voile",
  runner: "Bed runner",
  cushions: "Decorative cushions",
  headboard: "Headboard",
  base: "Bed base",
  armchair: "Armchair",
  bench: "Bed-end bench",
});
export const SCENES = Object.freeze({
  standard: {
    name: "Standard Double",
    description:
      "A compact contemporary bedroom with a writing desk and a generous window.",
    width: 440,
    length: 500,
  },
  superior: {
    name: "Superior",
    description:
      "A spacious bedroom with a reading corner and wide garden glazing.",
    width: 590,
    length: 620,
  },
});
export const FUTURE_SCENES = ["Twin", "Suite"];
export const FURNITURE = Object.freeze({
  double: { label: "Double bed", w: 160, d: 210 },
  twin: { label: "Twin bed", w: 95, d: 210 },
  bedside: { label: "Bedside table", w: 45, d: 40 },
  desk: { label: "Desk", w: 120, d: 55 },
  chair: { label: "Desk chair", w: 50, d: 55 },
  armchair: { label: "Armchair", w: 80, d: 85 },
  bench: { label: "Bed-end bench", w: 130, d: 45 },
});
export const COSTS = Object.freeze({
  furnishings: "Furnishings",
  tracks: "Tracks",
  survey: "Survey",
  installation: "Installation",
  other: "Other",
});
export const SAMPLE_STATUSES = [
  "Not requested",
  "Request prepared",
  "Requested manually",
  "Received",
  "Approved",
  "Changes needed",
];
export const APPROVAL_STATUSES = [
  "Draft",
  "Under review",
  "Approved manually",
  "Changes needed",
];
export const id = () => crypto.randomUUID();
export const clone = (value) => structuredClone(value);
export const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const safeImage = (value) => {
  if (typeof value !== "string") return null;
  if (/^panaz\/[A-Z0-9]+-\d{3}\.jpg$/.test(value)) return value;
  if (
    /^\/room-visualiser\/(?:textures|fixed140)\/[a-f0-9]{64}\.(?:webp|jpg|jpeg)$/.test(
      value,
    )
  )
    return value;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "cdn.shopify.com",
        "curtainsuk-production-api.vercel.app",
        "74iymdcvkhmv4pak.public.blob.vercel-storage.com",
      ].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export function templateLayout(scene = "standard") {
  const s = SCENES[scene];
  const pieces = [
    ["double", 225, 90],
    ["bedside", 170, 90],
    ["bedside", 395, 90],
    ["desk", 15, 220],
    ["chair", 75, 285],
    ["bench", 240, 330],
    ["armchair", 150, 390],
  ];
  return {
    width: s.width,
    length: s.length,
    confirmed: false,
    items: pieces.map(([kind, x, y]) => ({
      id: id(),
      kind,
      label: FURNITURE[kind].label,
      x,
      y,
      width: FURNITURE[kind].w,
      depth: FURNITURE[kind].d,
      angle: 0,
    })),
    openings: [
      {
        id: id(),
        kind: "window",
        wall: "north",
        offset: 20,
        width: 180,
        height: 220,
      },
      {
        id: id(),
        kind: "door",
        wall: "south",
        offset: 20,
        width: 85,
        height: 210,
      },
    ],
  };
}
export function createScheme(scene = "standard", name = "Warm welcome") {
  const colours = {
    curtains: "#677566",
    voile: "#f5f2e9",
    runner: "#677566",
    cushions: "#b78d5b",
    headboard: "#c6b59b",
    base: "#c6b59b",
    armchair: "#ab8767",
    bench: "#677566",
  };
  return {
    id: id(),
    name,
    scene,
    items: Object.fromEntries(
      Object.keys(ITEMS).map((key) => [
        key,
        {
          colour: colours[key],
          fabric: null,
          relationship: "independent",
          referenceItem: "curtains",
        },
      ]),
    ),
    layers: "both",
    curtainOpen: 0.7,
    voileOpen: 0,
    voileOpacity: 0.42,
    layout: templateLayout(scene),
  };
}
export function createRoom(name = "Standard Doubles", scene = "standard") {
  const scheme = createScheme(scene);
  return {
    id: id(),
    name,
    quantity: 1,
    schemeId: scheme.id,
    schemes: [scheme],
    windowCount: 1,
    windows: [
      {
        id: id(),
        name: "Window 1",
        width: null,
        drop: null,
        confirmed: false,
        notes: "",
      },
    ],
    notes: "",
    exceptions: [],
    sampleStatus: "Not requested",
    approvalStatus: "Draft",
    phase: "To be planned",
    budget: Object.fromEntries(Object.keys(COSTS).map((k) => [k, null])),
  };
}
export function createProject(name = "My hotel project") {
  const room = createRoom();
  return {
    version: VERSION,
    id: id(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roomId: room.id,
    rooms: [room],
    vatBasis: "unspecified",
    notes: "",
    contact: { name: "", email: "", hotel: "", location: "" },
  };
}
export function activeRoom(project) {
  return project.rooms.find((r) => r.id === project.roomId) ?? project.rooms[0];
}
export function activeScheme(project) {
  const r = activeRoom(project);
  return r.schemes.find((s) => s.id === r.schemeId) ?? r.schemes[0];
}
export function duplicateScheme(room, source) {
  const copy = clone(source);
  copy.id = id();
  copy.name = `${source.name} alternative`;
  copy.layout.items.forEach((i) => (i.id = id()));
  copy.layout.openings.forEach((i) => (i.id = id()));
  room.schemes.push(copy);
  room.schemeId = copy.id;
  return copy;
}
export function duplicateProject(source) {
  const p = clone(source);
  p.id = id();
  p.name = `${p.name} copy`;
  p.createdAt = p.updatedAt = new Date().toISOString();
  return p;
}
export function setWindowCount(room, count) {
  const n = Math.max(0, Math.min(100, Math.round(count)));
  // Keep existing schedules when count decreases: users explicitly remove rows.
  room.windowCount = n;
  while (room.windows.length < n)
    room.windows.push({
      id: id(),
      name: `Window ${room.windows.length + 1}`,
      width: null,
      drop: null,
      confirmed: false,
      notes: "",
    });
}
export function setItem(scheme, target, choice) {
  if (!Object.hasOwn(ITEMS, target)) throw Error("Unknown furnishing");
  scheme.items[target] = { ...scheme.items[target], ...clone(choice) };
}
export function reuseItem(scheme, target, source, relationship = "same") {
  if (target === source) return;
  const selected = scheme.items[source];
  setItem(scheme, target, {
    colour: selected.colour,
    fabric: relationship === "same" ? selected.fabric : null,
    relationship,
    referenceItem: source,
  });
}
export function budgetTotals(project) {
  const categories = Object.fromEntries(Object.keys(COSTS).map((k) => [k, 0]));
  let entered = 0,
    missing = 0;
  for (const r of project.rooms)
    for (const key of Object.keys(COSTS)) {
      if (r.budget[key] === null) missing++;
      else {
        categories[key] += r.budget[key] * r.quantity;
        entered++;
      }
    }
  return {
    categories,
    total: Object.values(categories).reduce((a, b) => a + b, 0),
    entered,
    missing,
    rooms: project.rooms.reduce((a, r) => a + r.quantity, 0),
  };
}
export const vatLabel = (basis) =>
  ({
    unspecified: "VAT basis not specified",
    inclusive: "Allowances include VAT",
    exclusive: "Allowances exclude VAT; VAT has not been added",
  })[basis];
export function corners(item) {
  const a = (item.angle * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a),
    cx = item.x + item.width / 2,
    cy = item.y + item.depth / 2;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => ({
    x: cx + ((x * item.width) / 2) * c - ((y * item.depth) / 2) * s,
    y: cy + ((x * item.width) / 2) * s + ((y * item.depth) / 2) * c,
  }));
}
function overlaps(a, b) {
  for (const p of [a, b])
    for (let i = 0; i < 4; i++) {
      const q = p[(i + 1) % 4],
        axis = { x: -(q.y - p[i].y), y: q.x - p[i].x };
      const aa = a.map((v) => v.x * axis.x + v.y * axis.y),
        bb = b.map((v) => v.x * axis.x + v.y * axis.y);
      if (
        Math.max(...aa) <= Math.min(...bb) + 0.01 ||
        Math.max(...bb) <= Math.min(...aa) + 0.01
      )
        return false;
    }
  return true;
}
export function layoutWarnings(layout) {
  const warnings = [];
  for (let i = 0; i < layout.items.length; i++) {
    const a = layout.items[i],
      poly = corners(a);
    if (
      poly.some(
        (p) => p.x < 0 || p.y < 0 || p.x > layout.width || p.y > layout.length,
      )
    )
      warnings.push(`${a.label} extends beyond the room boundary.`);
    for (let j = i + 1; j < layout.items.length; j++)
      if (overlaps(poly, corners(layout.items[j])))
        warnings.push(`${a.label} overlaps ${layout.items[j].label}.`);
  }
  for (const o of layout.openings) {
    const limit = ["north", "south"].includes(o.wall)
      ? layout.width
      : layout.length;
    if (o.offset + o.width > limit)
      warnings.push(
        `${o.kind === "door" ? "Door" : "Window"} extends beyond its wall.`,
      );
    if (o.kind === "door") {
      const zone =
        o.wall === "north"
          ? { x: o.offset, y: 0, width: o.width, depth: o.width }
          : o.wall === "south"
            ? {
                x: o.offset,
                y: layout.length - o.width,
                width: o.width,
                depth: o.width,
              }
            : o.wall === "west"
              ? { x: 0, y: o.offset, width: o.width, depth: o.width }
              : {
                  x: layout.width - o.width,
                  y: o.offset,
                  width: o.width,
                  depth: o.width,
                };
      for (const piece of layout.items)
        if (overlaps(corners({ ...zone, angle: 0 }), corners(piece)))
          warnings.push(
            `${piece.label} is within the ${o.wall} door swing area.`,
          );
    }
  }
  return warnings;
}
export function unresolved(project) {
  const out = [];
  if (project.vatBasis === "unspecified")
    out.push("Confirm the budget VAT basis.");
  for (const r of project.rooms) {
    if (r.quantity > 1)
      out.push(
        `${r.name}: check measurements for each of the ${r.quantity} rooms. Grouping is not measurement verification.`,
      );
    if (r.windows.length !== r.windowCount)
      out.push(
        `${r.name}: window count (${r.windowCount}) differs from retained schedule rows (${r.windows.length}).`,
      );
    if (
      r.windows.some((w) => !w.confirmed || w.width === null || w.drop === null)
    )
      out.push(`${r.name}: confirm window measurements.`);
    for (const s of r.schemes) {
      if (!s.layout.confirmed)
        out.push(
          `${r.name} / ${s.name}: layout dimensions are examples awaiting confirmation.`,
        );
      for (const [k, v] of Object.entries(s.items)) {
        if (v.fabric?.availability === "Discontinued")
          out.push(
            `${r.name} / ${s.name} / ${ITEMS[k]}: ${v.fabric.design} ${v.fabric.colour} is marked discontinued by Panaz. Select an alternative; saved choice retained.`,
          );
        if (v.fabric)
          out.push(
            `${r.name} / ${s.name} / ${ITEMS[k]}: review ${v.fabric.design} ${v.fabric.colour} for its intended use and project requirements.`,
          );
      }
    }
    if (r.approvalStatus !== "Approved manually")
      out.push(
        `${r.name}: design approval is ${r.approvalStatus.toLowerCase()}.`,
      );
    if (r.budget && Object.values(r.budget).some((v) => v === null))
      out.push(`${r.name}: some budget allowances are not entered.`);
  }
  return out;
}
// Strict reconstruction protects browser imports, numeric calculations and asset URLs.
export function parseProject(value) {
  const fail = () => {
    throw Error(
      "This project file is incomplete or uses an unsupported version.",
    );
  };
  const text = (v, max = 500) =>
    typeof v === "string" && v.length <= max ? v : fail();
  const num = (v, min, max) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
      ? v
      : fail();
  const integer = (v, min, max) =>
    Number.isInteger(v) ? num(v, min, max) : fail();
  const nullable = (v, min, max) => (v === null ? null : num(v, min, max));
  const choice = (v, values) => (values.includes(v) ? v : fail());
  const bool = (v) => (typeof v === "boolean" ? v : fail());
  const list = (v, max) => (Array.isArray(v) && v.length <= max ? v : fail());
  const uid = (v) => {
    const t = text(v, 100);
    if (!/^[a-zA-Z0-9-]+$/.test(t)) fail();
    return t;
  };
  const unique = (xs) => {
    if (new Set(xs.map((x) => x.id)).size !== xs.length) fail();
    return xs;
  };
  // Imports resolve known IDs against the supplier snapshot; imported claims are never trusted.
  const fabric = resolvePanazFabric;
  const windowRow = (w) => ({
    id: uid(w.id),
    name: text(w.name),
    width: nullable(w.width, 1, 50000),
    drop: nullable(w.drop, 1, 50000),
    confirmed: bool(w.confirmed),
    notes: text(w.notes, 4000),
  });
  const layout = (l) => ({
    width: num(l.width, 100, 5000),
    length: num(l.length, 100, 5000),
    confirmed: bool(l.confirmed),
    items: unique(
      list(l.items, 80).map((i) => ({
        id: uid(i.id),
        kind: choice(i.kind, Object.keys(FURNITURE)),
        label: text(i.label, 100),
        x: num(i.x, -5000, 10000),
        y: num(i.y, -5000, 10000),
        width: num(i.width, 10, 2000),
        depth: num(i.depth, 10, 2000),
        angle: num(i.angle, 0, 359),
      })),
    ),
    openings: unique(
      list(l.openings, 40).map((o) => ({
        id: uid(o.id),
        kind: choice(o.kind, ["window", "door"]),
        wall: choice(o.wall, ["north", "east", "south", "west"]),
        offset: num(o.offset, 0, 5000),
        width: num(o.width, 10, 2000),
        height: num(o.height, 10, 2000),
      })),
    ),
  });
  const scheme = (s) => ({
    id: uid(s.id),
    name: text(s.name, 120),
    scene: choice(s.scene, Object.keys(SCENES)),
    items: Object.fromEntries(
      Object.keys(ITEMS).map((k) => {
        const v = s.items[k];
        if (!/^#[a-f0-9]{6}$/i.test(v.colour)) fail();
        return [
          k,
          {
            colour: v.colour,
            fabric: fabric(v.fabric),
            relationship: choice(v.relationship, [
              "independent",
              "same",
              "matching",
              "complementary",
            ]),
            referenceItem: choice(v.referenceItem, Object.keys(ITEMS)),
          },
        ];
      }),
    ),
    layers: choice(s.layers, ["both", "curtains", "voile"]),
    curtainOpen: num(s.curtainOpen, 0, 1),
    voileOpen: num(s.voileOpen, 0, 1),
    voileOpacity: num(s.voileOpacity, 0.1, 0.85),
    layout: layout(s.layout),
  });
  if (!value || value.version !== VERSION) fail();
  const p = {
    version: VERSION,
    id: uid(value.id),
    name: text(value.name, 160),
    createdAt: text(value.createdAt, 50),
    updatedAt: text(value.updatedAt, 50),
    roomId: uid(value.roomId),
    vatBasis: choice(value.vatBasis, ["unspecified", "inclusive", "exclusive"]),
    notes: text(value.notes, 12000),
    contact: Object.fromEntries(
      ["name", "email", "hotel", "location"].map((k) => [
        k,
        text(value.contact[k], 250),
      ]),
    ),
    rooms: unique(
      list(value.rooms, 60).map((r) => ({
        id: uid(r.id),
        name: text(r.name, 120),
        quantity: integer(r.quantity, 1, 10000),
        schemeId: uid(r.schemeId),
        schemes: unique(list(r.schemes, 12).map(scheme)),
        windowCount: integer(r.windowCount, 0, 100),
        windows: unique(list(r.windows, 100).map(windowRow)),
        notes: text(r.notes, 12000),
        exceptions: unique(
          list(r.exceptions, 1000).map((e) => ({
            id: uid(e.id),
            number: text(e.number, 80),
            notes: text(e.notes, 4000),
            schemeId: text(e.schemeId, 100),
            width: nullable(e.width, 1, 50000),
            drop: nullable(e.drop, 1, 50000),
            windowName: text(e.windowName, 120),
            confirmed: bool(e.confirmed),
          })),
        ),
        sampleStatus: choice(r.sampleStatus, SAMPLE_STATUSES),
        approvalStatus: choice(r.approvalStatus, APPROVAL_STATUSES),
        phase: text(r.phase, 200),
        budget: Object.fromEntries(
          Object.keys(COSTS).map((k) => [
            k,
            nullable(r.budget[k], 0, 10000000),
          ]),
        ),
      })),
    ),
  };
  if (!p.rooms.length || !p.rooms.some((r) => r.id === p.roomId)) fail();
  for (const r of p.rooms) {
    if (!r.schemes.length || !r.schemes.some((s) => s.id === r.schemeId))
      fail();
    if (
      r.exceptions.some(
        (e) => e.schemeId && !r.schemes.some((s) => s.id === e.schemeId),
      )
    )
      fail();
  }
  return p;
}
export function readStore(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw)
    return { version: VERSION, revision: 0, projects: [], current: null };
  const v = JSON.parse(raw);
  if (
    v.version !== VERSION ||
    !Array.isArray(v.projects) ||
    v.projects.length > 50 ||
    !Number.isSafeInteger(v.revision)
  )
    throw Error(
      "Saved project data could not be read. Download a recovery copy before starting again.",
    );
  const projects = v.projects.map(parseProject);
  if (new Set(projects.map((p) => p.id)).size !== projects.length)
    throw Error("Saved project identifiers conflict.");
  return {
    version: VERSION,
    revision: v.revision,
    projects,
    current: projects.some((p) => p.id === v.current)
      ? v.current
      : (projects[0]?.id ?? null),
  };
}
export function saveStore(store, expected, storage = localStorage) {
  const current = readStore(storage);
  if (current.revision !== expected)
    throw Error(
      "Projects changed in another tab. Download your current project, then reload to see the saved version.",
    );
  if (store.projects.length > 50)
    throw Error(
      "This browser holds 50 projects. Export a backup before removing an older project.",
    );
  const next = {
    ...store,
    version: VERSION,
    projects: store.projects.map(parseProject),
    revision: expected + 1,
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
