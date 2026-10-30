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
} from "../runtime/exports.mjs";
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
};
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
  assert.equal(PANAZ_FABRICS.length, 50);
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
