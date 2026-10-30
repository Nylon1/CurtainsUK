import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  createProject,
  createRoom,
  activeRoom,
  activeScheme,
  id,
  clone,
  parseProject,
  duplicateProject,
  duplicateScheme,
  setItem,
  reuseItem,
  setWindowCount,
  readStore,
  saveStore,
  layoutWarnings,
  budgetTotals,
  STORAGE_KEY,
  unresolved,
  SURFACE_DEFAULTS,
} from "../runtime/model.mjs";
import {
  PANAZ_FABRICS,
  resolvePanazFabric,
  listedUse,
} from "../runtime/panaz-catalogue.mjs";
import {
  roomsCsv,
  windowsCsv,
  enquiryText,
  layoutSvg,
  projectBriefData,
} from "../runtime/exports.mjs";
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
};

test("room finishes, switches, pictures and architecture persist independently across schemes", () => {
  const p = fixture(),
    s = activeScheme(p),
    before = clone(s.items),
    mem = storage();
  s.surfaces = { walls: "#a6af9c", ceiling: "#d9dfd1", floor: "#74563f" };
  s.lighting = { bedside: false, ceiling: true };
  s.artwork = "botanical";
  s.wallRelief = "arches";
  s.ceilingDesign = "coffered";
  saveStore({ projects: [p], current: p.id }, 0, mem);
  const reopened = readStore(mem).projects[0],
    saved = activeScheme(reopened);
  assert.deepEqual(saved.items, before);
  assert.deepEqual(saved.surfaces, s.surfaces);
  assert.deepEqual(saved.lighting, s.lighting);
  assert.equal(saved.artwork, "botanical");
  assert.equal(saved.wallRelief, "arches");
  assert.equal(saved.ceilingDesign, "coffered");
  const alt = duplicateScheme(activeRoom(reopened), saved);
  alt.surfaces.walls = "#123456";
  alt.lighting.ceiling = false;
  alt.ceilingDesign = "plain";
  assert.equal(saved.surfaces.walls, "#a6af9c");
  assert.equal(saved.lighting.ceiling, true);
  assert.equal(saved.ceilingDesign, "coffered");
  for (const output of [roomsCsv(p), enquiryText(p)]) {
    for (const text of [
      "Sage (#a6af9c)",
      "Pale sage (#d9dfd1)",
      "Walnut tone (#74563f)",
      "Botanical silhouettes",
      "Soft arch relief",
      "Architectural coffers",
    ])
      assert.ok(output.includes(text), text);
  }
  assert.deepEqual(reopened.rooms[0].exceptions, p.rooms[0].exceptions);
});

test("older projects receive independent finish defaults and malformed new options are rejected", () => {
  const old = fixture();
  for (const room of old.rooms)
    for (const s of room.schemes)
      for (const key of [
        "surfaces",
        "lighting",
        "artwork",
        "wallRelief",
        "ceilingDesign",
      ])
        delete s[key];
  const migrated = parseProject(old);
  assert.deepEqual(activeScheme(migrated).surfaces, SURFACE_DEFAULTS);
  assert.deepEqual(activeScheme(migrated).lighting, {
    bedside: true,
    ceiling: false,
  });
  assert.equal(activeScheme(migrated).wallRelief, "none");
  assert.equal(activeScheme(migrated).ceilingDesign, "plain");
  activeScheme(migrated).surfaces.walls = "#000000";
  assert.equal(
    migrated.rooms[1].schemes[0].surfaces.walls,
    SURFACE_DEFAULTS.walls,
  );
  for (const [key, bad] of [
    ["surfaces", null],
    ["surfaces", { ...SURFACE_DEFAULTS, walls: "url(invalid)" }],
    ["lighting", { bedside: "false", ceiling: true }],
    ["artwork", "unknown"],
    ["wallRelief", "unknown"],
    ["ceilingDesign", "unknown"],
  ]) {
    const invalid = fixture();
    activeScheme(invalid)[key] = bad;
    assert.throws(() => parseProject(invalid), key);
  }
});
function fixture() {
  const p = createProject("The Garden Hotel"),
    r = activeRoom(p),
    s = activeScheme(p);
  r.quantity = 30;
  r.windows[0] = {
    ...r.windows[0],
    width: 234.5,
    drop: 252,
    confirmed: true,
    notes: "Check return wall",
  };
  s.items.curtains.fabric = resolvePanazFabric({ id: "panaz-090spe1-116" });
  s.curtainOpen = 0.2;
  s.voileOpen = 0.8;
  s.layout.items[0].angle = 37;
  s.layout.items[0].x = 181;
  r.exceptions.push({
    id: id(),
    number: "214",
    windowName: "Balcony",
    width: 310,
    drop: 260,
    confirmed: true,
    schemeId: s.id,
    notes: "Wider opening; survey separately",
  });
  r.budget.furnishings = 250;
  r.phase = "Phase 2";
  r.sampleStatus = "Received";
  p.rooms.push(createRoom("Twins"), createRoom("Superior", "superior"));
  p.rooms[1].quantity = 12;
  p.rooms[2].quantity = 8;
  return p;
}
test("all project details survive storage, reopen and duplication without aliases", () => {
  const p = fixture(),
    mem = storage();
  const store = saveStore({ projects: [p], current: p.id }, 0, mem);
  assert.equal(store.revision, 1);
  assert.deepEqual(readStore(mem).projects[0], parseProject(p));
  const copy = duplicateProject(p);
  copy.rooms[0].exceptions[0].notes = "Alternative";
  assert.notEqual(copy.id, p.id);
  assert.equal(
    p.rooms[0].exceptions[0].notes,
    "Wider opening; survey separately",
  );
});
test("scheme alternatives and item choices stay independent; matching colour clears fabric", () => {
  const p = fixture(),
    r = activeRoom(p),
    s = activeScheme(p);
  setItem(s, "curtains", { colour: "#123456" });
  reuseItem(s, "runner", "curtains", "same");
  assert.deepEqual(s.items.runner.fabric, s.items.curtains.fabric);
  setItem(s, "curtains", { colour: "#654321", fabric: null });
  assert.equal(s.items.runner.colour, "#123456");
  reuseItem(s, "runner", "curtains", "matching");
  assert.equal(s.items.runner.fabric, null);
  const copy = duplicateScheme(r, s);
  copy.items.headboard.colour = "#222222";
  assert.notEqual(copy.layout.items[0].id, s.layout.items[0].id);
  assert.notEqual(s.items.headboard.colour, copy.items.headboard.colour);
});
test("decreasing window count retains measurements and room exceptions", () => {
  const p = fixture(),
    r = activeRoom(p);
  setWindowCount(r, 3);
  r.windows[2].notes = "Retain me";
  setWindowCount(r, 1);
  assert.equal(r.windows.length, 3);
  assert.equal(r.windows[2].notes, "Retain me");
  assert.equal(r.exceptions[0].width, 310);
});
test("CSV, draft and plan reflect saved quantities, exceptions and layout", () => {
  const p = parseProject(fixture()),
    r = activeRoom(p);
  assert.match(roomsCsv(p), /"Standard Doubles","30"/);
  assert.match(
    windowsCsv(p),
    /"214","Balcony","310","260","Confirmed by user"/,
  );
  assert.match(enquiryText(p), /090SPE1\/116/);
  assert.match(enquiryText(p), /not been submitted/);
  assert.match(layoutSvg(r.schemes[0].layout), /rotate\(37\)/);
  assert.equal(budgetTotals(p).total, 7500);
  assert.equal(budgetTotals(p).rooms, 50);
});
test("exports escape CSV formula cells and SVG user labels", () => {
  const p = fixture();
  p.name = ' =HYPERLINK("bad")';
  p.rooms[0].schemes[0].layout.items[0].label = "<script>alert(1)</script>";
  assert.ok(roomsCsv(p).includes("' =HYPERLINK"));
  assert.ok(!layoutSvg(activeScheme(p).layout).includes("<script>"));
});

test("planner sharing omits retired pricing, including the PDF attachment, while keeping room measurements", () => {
  const p = fixture();
  for (const text of [roomsCsv(p), enquiryText(p), unresolved(p).join("\n")])
    assert.doesNotMatch(text, /allowance|budget|VAT|GBP|7500/i);
  const brief = projectBriefData(p);
  assert.equal("vatBasis" in brief, false);
  assert.ok(brief.rooms.every((r) => !("budget" in r)));
  assert.deepEqual(brief.rooms[0].exceptions, p.rooms[0].exceptions);
  assert.equal(p.rooms[0].budget.furnishings, 250);
  const imported = parseProject(brief);
  assert.deepEqual(imported.rooms[0].exceptions, p.rooms[0].exceptions);
  assert.equal(imported.rooms[0].budget.furnishings, null);
});

test("individual room checks count named rooms once and retain measurements when quantity changes", () => {
  const p = fixture(),
    r = p.rooms[0];
  r.quantity = 2;
  r.exceptions.push({
    ...clone(r.exceptions[0]),
    id: id(),
    windowName: "Side window",
    width: 125,
  });
  assert.ok(
    unresolved(p).some((t) => t.includes("1 individual room recorded for 2")),
  );
  r.exceptions.push({
    ...clone(r.exceptions[0]),
    id: id(),
    number: "215",
    width: 180,
    confirmed: false,
  });
  assert.ok(
    unresolved(p).some((t) => t.includes("Room 215: confirm individual")),
  );
  assert.ok(
    !unresolved(p).some((t) => t.includes("individual rooms recorded for 2")),
  );
  r.quantity = 1;
  const reopened = parseProject(p);
  assert.equal(reopened.rooms[0].exceptions.length, 3);
  assert.equal(reopened.rooms[0].exceptions[1].width, 125);
  assert.ok(
    unresolved(reopened).some((t) =>
      t.includes("2 individual rooms recorded for 1"),
    ),
  );
});
test("rotated furniture, room boundary and door clearance warnings", () => {
  const l = {
    width: 400,
    length: 400,
    confirmed: false,
    items: [
      { id: "a", label: "Bed", x: 0, y: 0, width: 100, depth: 200, angle: 45 },
      { id: "b", label: "Desk", x: 50, y: 50, width: 50, depth: 50, angle: 0 },
    ],
    openings: [
      { kind: "door", wall: "north", offset: 30, width: 90, height: 210 },
    ],
  };
  const warnings = layoutWarnings(l).join(" ");
  assert.match(warnings, /boundary/);
  assert.match(warnings, /overlaps/);
  assert.match(warnings, /door swing/);
});
test("corrupt storage and concurrent edits cannot silently overwrite projects", () => {
  const mem = storage(),
    p = fixture();
  saveStore({ projects: [p], current: p.id }, 0, mem);
  assert.throws(
    () => saveStore({ projects: [p], current: p.id }, 0, mem),
    /another tab/,
  );
  mem.setItem(STORAGE_KEY, "broken");
  assert.throws(() => readStore(mem));
  const bad = clone(p);
  bad.rooms[0].quantity = -2;
  assert.throws(() => parseProject(bad));
  bad.rooms[0].quantity = 1;
  bad.rooms[0].exceptions[0].schemeId = "missing";
  assert.throws(() => parseProject(bad));
});
test("hotel imports reject other fabrics and ignore injected supplier claims", () => {
  const p = fixture(),
    s = activeScheme(p);
  s.items.curtains.fabric.frRatings = "Invented certification";
  assert.notEqual(
    activeScheme(parseProject(p)).items.curtains.fabric.frRatings,
    "Invented certification",
  );
  s.items.curtains.fabric = { id: "other-brand" };
  assert.throws(() => parseProject(p), /Panaz plain FR/);
});
test("every selectable fabric has product-level Panaz plain FR evidence and an asset", () => {
  const source = JSON.parse(
    readFileSync(new URL("../panaz-source-2026-10-30.json", import.meta.url)),
  );
  assert.equal(PANAZ_FABRICS.length, 56);
  for (const f of PANAZ_FABRICS) {
    const record = source.products.find(
      (p) => p.sku === f.reference || p.reference === f.reference,
    );
    assert.ok(record);
    if (record.attributes["Pattern Type"]) {
      assert.equal(record.attributes["Pattern Type"], "Plain");
    } else {
      assert.equal(
        record.patternEvidence?.url,
        "https://panaz.com/collection/allure-velvet/",
      );
      assert.equal(record.patternEvidence?.excerpt, "This plain matt velvet");
    }
    assert.match(record.attributes.Material, /Fire Retardant/);
    assert.equal(f.frRatings, record.attributes["Flammability Ratings"]);
    assert.equal(f.sourceUrl, record.url);
    assert.ok(existsSync(new URL("../runtime/" + f.image, import.meta.url)));
    assert.equal(f.source.scaleKind, "colour-only");
  }
  assert.ok(
    listedUse(
      PANAZ_FABRICS.find((f) => f.design === "Spectrum"),
      "curtains",
    ),
  );
  assert.ok(
    !listedUse(
      PANAZ_FABRICS.find((f) => f.design === "Spectrum"),
      "armchair",
    ),
  );
  assert.ok(
    listedUse(
      PANAZ_FABRICS.find((f) => f.design === "Plain Voile"),
      "voile",
    ),
  );
});

test("Allure range retains colour-specific references, uses and saved choices", () => {
  const range = PANAZ_FABRICS.filter((f) => f.design === "Allure Velvet");
  assert.equal(range.length, 36);
  assert.equal(new Set(range.map((f) => f.id)).size, 36);
  assert.ok(!range.some((f) => /Fuchsia|Tuscan Red/.test(f.colour)));
  const azure = range.find((f) => f.colour === "131 Azure");
  const white = range.find((f) => f.colour === "001 White");
  assert.equal(white.reference, "190AAA1/000");
  assert.match(
    range.find((f) => f.colour === "414 Wine").reference,
    /SKU to confirm/,
  );
  assert.ok(listedUse(azure, "curtains"));
  assert.ok(listedUse(azure, "headboard"));
  assert.ok(!listedUse(azure, "voile"));
  assert.ok(
    !listedUse(
      range.find((f) => f.colour === "407 Burgundy"),
      "cushions",
    ),
  );
  const project = fixture(),
    scheme = activeScheme(project);
  const originalVoile = clone(scheme.items.voile);
  setItem(scheme, "curtains", { fabric: azure, colour: azure.displayColour });
  setItem(scheme, "headboard", { fabric: white, colour: white.displayColour });
  const reopened = activeScheme(
    parseProject(JSON.parse(JSON.stringify(project))),
  );
  assert.equal(reopened.items.curtains.fabric.reference, "190ALL2/131");
  assert.equal(reopened.items.headboard.fabric.reference, "190AAA1/000");
  assert.deepEqual(reopened.items.voile, originalVoile);
  assert.match(enquiryText(project), /190ALL2\/131/);
});

test("new FR sheers persist independently and retired voile choices remain reviewable", () => {
  const additions = PANAZ_FABRICS.filter((f) =>
    ["Batiste", "Charm"].includes(f.design),
  );
  assert.equal(additions.length, 6);
  for (const fabric of additions) {
    assert.equal(fabric.pattern, "Plain");
    assert.ok(listedUse(fabric, "voile"));
    assert.ok(!listedUse(fabric, "armchair"));
    const p = fixture(),
      s = activeScheme(p),
      before = clone(s.items.curtains);
    setItem(s, "voile", { fabric, colour: fabric.displayColour });
    const reopened = parseProject(JSON.parse(JSON.stringify(p)));
    assert.equal(
      activeScheme(reopened).items.voile.fabric.reference,
      fabric.reference,
    );
    assert.deepEqual(activeScheme(reopened).items.curtains, before);
    assert.ok(enquiryText(reopened).includes(fabric.reference));
  }
  const p = fixture(),
    retired = PANAZ_FABRICS.find((f) => f.reference === "366PLA1/001");
  setItem(activeScheme(p), "voile", {
    fabric: retired,
    colour: retired.displayColour,
  });
  const reopened = parseProject(p);
  assert.equal(
    activeScheme(reopened).items.voile.fabric.availability,
    "Discontinued",
  );
  assert.match(
    enquiryText(reopened),
    /Plain Voile 001 White is marked discontinued/,
  );
});
