import { createStudioScene, sizeOf } from "./scene.mjs";
import { coverageBounds, pipingPreviewSegments } from "./geometry.mjs";
import { planArrangement } from "./arrangement.mjs";
import { historySnapshot, restoreHistory } from "./state.mjs";
const config = {
  apiBase: "/api/cushion-studio",
  threeUrl: "/cushion-studio/vendor/three.module.js",
  ...window.CUSHION_STUDIO_CONFIG,
};
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  clone = (x) => structuredClone(x),
  uid = () => crypto.randomUUID(),
  escape = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const KEY = "curtainsuk-cushion-design-v1",
  COMPARE = "curtainsuk-cushion-compare-v1";
const sizes = [
  ["square-38", "38 × 38 cm"],
  ["square-45", "45 × 45 cm"],
  ["square-50", "50 × 50 cm"],
  ["square-55", "55 × 55 cm"],
  ["square-60", "60 × 60 cm"],
  ["rectangle-30-45", "30 × 45 cm"],
  ["rectangle-38-50", "38 × 50 cm"],
  ["round-40", "Ø40 cm · proposed"],
  ["round-50", "Ø50 cm · proposed"],
  ["bed-square-65", "65 × 65 cm · proposed"],
  ["bed-square-70", "70 × 70 cm · proposed"],
  ["bolster-23-56", "Ø23 × 56 cm"],
];
const guides = [
  {
    name: "Quiet texture",
    description:
      "A generous 50 cm square in soft green, with a 30 × 45 cm stripe. A simple way to bring texture into a neutral room.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-dstr237715", "rectangle-30-45"],
    ],
  },
  {
    name: "A warm focal point",
    description:
      "Let a 45 cm Bird Weave square lead. Pair it with a smaller 38 cm Amalfi square to echo the room’s softer colours.",
    pieces: [
      ["sdg-dmlf236846", "square-45"],
      ["sdg-f1239-30", "square-38"],
    ],
  },
  {
    name: "Pattern, in balance",
    description:
      "Combine a 50 cm floral square with a 38 × 50 cm stripe. Different pattern scales keep the composition relaxed.",
    pieces: [
      ["sdg-mind237581", "square-50"],
      ["sdg-dstr237715", "rectangle-38-50"],
    ],
  },
];
let dialogTrigger = null;
guides.push(
  {
    name: "A corner to settle into",
    scene: "corner",
    description:
      "Repeat a 50 cm green square at the two ends, then add a smaller patterned square and a stripe near the return. Leave clear sitting space; the guided layout keeps excess pieces in the tray.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-f1239-30", "square-50"],
      ["sdg-dmlf236846", "square-45"],
      ["sdg-dstr237715", "rectangle-30-45"],
    ],
  },
  {
    name: "A double bed, simply layered",
    scene: "double-bed",
    description:
      "Try two 50 cm squares with one 30 × 45 cm stripe in front. A restrained three-piece arrangement leaves the bedding visible. Sleeping pillows shown in the scene are props, not part of this set.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-f1239-30", "square-50"],
      ["sdg-dstr237715", "rectangle-30-45"],
    ],
  },
  {
    name: "A king bed, generously layered",
    scene: "king-bed",
    description:
      "Explore two 65 cm decorative squares with smaller patterned accents and a front rectangle. The 65 cm size is proposed and needs workroom approval. Compare against your own bed width; scene proportions are illustrative.",
    pieces: [
      ["sdg-f1239-30", "bed-square-65"],
      ["sdg-f1239-30", "bed-square-65"],
      ["sdg-mind237581", "square-45"],
      ["sdg-mind237581", "square-45"],
      ["sdg-dstr237715", "rectangle-30-45"],
    ],
  },
  {
    name: "Matching, with a quieter edge",
    scene: "sofa-2",
    description:
      "Use the same Bird Weave fabric twice for a deliberate matching scheme. Self piping repeats the fabric at the edge. Each cushion has linked upright faces; matching separate pieces needs the workroom cut plan.",
    pieces: [
      ["sdg-dmlf236846", "square-45", "self"],
      ["sdg-dmlf236846", "square-45", "self"],
    ],
  },
  {
    name: "Coordinate with the room",
    scene: "sofa-3",
    description:
      "Choose a colour already present in your curtains, rug or upholstery, then repeat it in a plain texture and a different pattern scale. This green, warm brick and stone example is a starting point; compare real samples beside your furnishings in daylight.",
    pieces: [
      ["sdg-f1239-30", "square-50"],
      ["sdg-dmlf236846", "square-45"],
      ["sdg-dstr237715", "rectangle-30-45"],
    ],
  },
  {
    name: "Contrast in the finishing detail",
    scene: "armchair",
    description:
      "A warm Bird Weave face with green Amalfi piping creates a deliberate outline. For a softer result, switch to self piping; unpiped keeps the silhouette simple. Confirm strip construction and join placement before manufacture.",
    pieces: [["sdg-dmlf236846", "square-50", "contrast", "sdg-f1239-30"]],
  },
);
let setQuote = null,
  purchaseEnabled = false,
  previewMaterials = {},
  checkoutKey = null;
let fabrics = [],
  totalFabrics = 0,
  nextOffset = null,
  design = {
    version: 1,
    id: uid(),
    name: "My cushion design",
    scene: "sofa-2",
    colours: { furniture: "#b9b8a5", wall: "#e8e3d8", floor: "#b5a18a" },
    pieces: [],
  },
  selectedId = null,
  mode = "configurator",
  face = "front",
  camera = "wide",
  scene = null,
  history = [],
  quotes = [],
  quoteRequest = 0,
  searchRequest = 0,
  revision = 0,
  quoteTimer,
  statusTimer,
  searchTimer,
  reviewScope = "set",
  quoteLoading = false,
  comparison = null;
function current() {
  return (
    design.pieces.find((p) => p.spec.id === selectedId) || design.pieces[0]
  );
}
function fabricOf(spec) {
  return fabrics.find((f) => f.id === spec?.fabricId);
}
function labelOf(f) {
  return [f?.design || f?.name, f?.colour || f?.colourway]
    .filter(Boolean)
    .join(" · ");
}
function notify(message) {
  $("#status").textContent = message;
  $("#status").hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => ($("#status").hidden = true), 6000);
}
async function api(path, body) {
  const response = await fetch(config.apiBase + path, {
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.error ||
        "We could not complete that request. Please try again.",
    );
    error.data = data;
    throw error;
  }
  return data;
}
function persist() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        design,
        selectedId,
        mode,
        revision,
        knownRevisions: [...knownRevisions],
      }),
    );
  } catch {
    notify(
      "Browser storage is unavailable. Use Save design to keep a server copy.",
    );
  }
}
const knownRevisions = new Map();
function remember() {
  knownRevisions.set(design.id, revision);
  history.push(historySnapshot(design, { revision, selectedId, mode }));
  if (history.length > 40) history.shift();
}
function change(fn, { quote = true } = {}) {
  remember();
  fn();
  persist();
  render();
  if (quote) scheduleQuote();
}
function normalisePlacement(spec) {
  const f = fabricOf(spec),
    bounds = coverageBounds(sizeOf(spec.sizeId), f?.calibration);
  spec.placementMm = {
    x: Math.min(bounds.x, Math.max(0, spec.placementMm.x)),
    y: Math.min(bounds.y, Math.max(0, spec.placementMm.y)),
  };
  if (sizeOf(spec.sizeId).shape === "bolster" && !spec.bolsterEndPlacementMm)
    spec.bolsterEndPlacementMm = {
      x: spec.placementMm.x,
      y: spec.placementMm.y,
    };
}
function freshPiece(fabricId) {
  return {
    spec: {
      version: 1,
      id: uid(),
      sizeId: "square-45",
      fabricId,
      filling: "filled",
      edge: "unpiped",
      placementMm: { x: 0, y: 0 },
      quantity: 1,
    },
    position: {
      slot: design.pieces.length % 3,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    },
  };
}
function setMode(next) {
  mode = next;
  face = "front";
  persist();
  render();
  window.scrollTo({
    top: 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}
function prepareShell() {
  document.body.dataset.mode = mode;
  $("#compare").setAttribute("aria-label", "Keep this version for comparison");
  $("#review-dialog").setAttribute("aria-labelledby", "review-title");
  $("#review-dialog h2").id = "review-title";
  $(".nav-current").innerHTML =
    '<button id="nav-config" class="active">1. Cushion configurator</button><span>→</span><button id="nav-layout">2. Sofa layout</button>';
  $("#nav-config").onclick = () => setMode("configurator");
  $("#nav-layout").onclick = () => setMode("layout");
  const workflow = document.createElement("div");
  workflow.className = "workflow";
  workflow.innerHTML =
    '<button id="add-to-layout" class="primary">Add to my layout <span>→</span></button><button id="edit-cushion" class="primary">Edit this cushion <span>↗</span></button><p class="help">Your configured cushion keeps its fabric, finish and pattern placement.</p>';
  $(".quote").before(workflow);
  const pipingNote = document.createElement("p");
  pipingNote.id = "piping-note";
  pipingNote.className = "help";
  pipingNote.textContent =
    "Piping shows a colour sample from your fabric. Exact strip placement and joins await workroom confirmation.";
  $("#edges").after(pipingNote);
  const name = document.createElement("label");
  name.className = "field design-name";
  name.innerHTML =
    'DESIGN NAME<input id="design-name" maxlength="120" value="My cushion design">';
  $("#pieces").after(name);
  const guideSection = document.createElement("section");
  guideSection.className = "style-guides";
  guideSection.innerHTML =
    '<p class="eyebrow">A PLACE TO BEGIN</p><h2>Thoughtful pairings.</h2><p>Real fabrics, considered combinations. Make one your own.</p><div id="guide-cards"></div>';
  $(".editorial").before(guideSection);
  const starting = document.createElement("details");
  starting.className = "starting-points";
  starting.open = true;
  starting.innerHTML =
    '<summary>Find your starting point <span>+</span></summary><div><button data-start="sofa"><strong>Style a sofa</strong><span>Build a considered arrangement</span></button><button data-start="bed"><strong>Style a bed</strong><span>Layer your finishing touches</span></button><button data-start="cushion"><strong>Design a cushion</strong><span>Begin with one beautiful detail</span></button><button data-start="refresh"><strong>Refresh my cushions</strong><span>New covers, familiar favourites</span></button></div>';
  $(".intro").before(starting);
  starting.onclick = (e) => {
    const b = e.target.closest("[data-start]");
    if (!b) return;
    const choice = b.dataset.start;
    starting.open = false;
    if (choice === "sofa" || choice === "bed")
      change(
        () => {
          design.scene = choice === "sofa" ? "sofa-2" : "double-bed";
          mode = "layout";
        },
        { quote: false },
      );
    else if (choice === "cushion") setMode("configurator");
    else {
      change(() => {
        if (current()) current().spec.filling = "cover";
        mode = "configurator";
      });
      $("#practical-guidance").scrollIntoView({ behavior: "smooth" });
    }
  };
  const presets = document.createElement("div");
  presets.className = "layout-presets layout-only";
  presets.innerHTML =
    '<p class="eyebrow">BUILD AN ARRANGEMENT</p><div><button data-preset="simple">Simple · 2</button><button data-preset="balanced">Balanced · 3</button><button data-preset="layered">Layered · 5</button></div><p class="help">Start a new arrangement using your selected fabric. Undo returns to the previous set.</p>';
  $(".arrangement").before(presets);
  presets.onclick = (e) => {
    const b = e.target.closest("[data-preset]");
    if (!b || !current()) return;
    const shapes =
        b.dataset.preset === "simple"
          ? ["square-45", "square-45"]
          : b.dataset.preset === "balanced"
            ? ["square-50", "square-45", "rectangle-30-45"]
            : [
                "square-50",
                "square-50",
                "square-45",
                "square-38",
                "rectangle-30-45",
              ],
      template = clone(current().spec);
    change(() => {
      design.pieces = shapes.map((sizeId, i) => {
        const p = freshPiece(template.fabricId);
        p.spec = { ...clone(template), id: uid(), sizeId };
        p.position.slot = [0, 2, 4, 3, 5][i];
        normalisePlacement(p.spec);
        return p;
      });
      selectedId = design.pieces[0].spec.id;
      mode = "layout";
    });
  };
  const practical = document.createElement("section");
  practical.id = "practical-guidance";
  practical.className = "practical-guidance";
  practical.innerHTML =
    '<p class="eyebrow">A FEW CONSIDERED DETAILS</p><h2>A little guidance.</h2><div><details><summary>Choose sizes that work together</summary><p>Start with the clear seat or bed width. Combine a generous square with a smaller rectangle; the layout keeps pieces that do not fit in an unplaced tray.</p><button data-help-size="square-50">Explore a 50 cm square →</button><button data-help-size="rectangle-30-45">Explore a 30 × 45 cm rectangle →</button></details><details><summary>Cover only, or cover & filling?</summary><p>Choose a cover if you are keeping a suitable existing insert. For a new filling, its type, firmness and size need workroom confirmation; round, bolster and bed sizes have their own requirements.</p><button data-help-fill="cover">Design a replacement cover →</button><button data-help-fill="filled">Design a filled cushion →</button></details><details><summary>Measure before you make</summary><p>Record your existing cover’s shape and finished width and height, and the insert dimensions. Check the clear space on your furniture. Confirm the intended finished size with the workroom before ordering.</p><button data-help-size="square-45">Check shapes and dimensions →</button></details><details><summary>Mix pattern scales thoughtfully</summary><p>Pair a smaller stripe with a larger motif, or give a busy design room beside a plain texture. The original fabric image controls the scale; shared placement keeps the front and back upright and alike.</p><button data-help-guide="1">Explore a pattern and plain pairing →</button></details><details><summary>Care starts with the fabric</summary><p>Care instructions vary by fabric and filling. Check the confirmed supplier and workroom care label for your finished cushion before cleaning. Do not assume a cover is washable because it is removable.</p><button data-help-sample="true">Review the selected fabric →</button></details></div>';
  guideSection.after(practical);
  practical.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b || !current()) return;
    if (b.dataset.helpGuide) {
      $(
        `#guide-cards [data-guide-index="${Number(b.dataset.helpGuide)}"]`,
      )?.click();
      return;
    }
    change(() => {
      if (b.dataset.helpSize) {
        current().spec.sizeId = b.dataset.helpSize;
        normalisePlacement(current().spec);
      }
      if (b.dataset.helpFill) current().spec.filling = b.dataset.helpFill;
      mode = "configurator";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = document.createElement("button");
  reset.id = "reset-design";
  reset.className = "text-link reset-design";
  reset.textContent = "Start a fresh design";
  name.after(reset);
  const tray = document.createElement("div");
  tray.id = "layout-tray";
  tray.className = "layout-only";
  reset.after(tray);
  const workroom = document.createElement("button");
  workroom.id = "workroom";
  workroom.className = "text-link workroom-button";
  workroom.textContent = "Workroom instructions & export";
  $("#cut-plan").before(workroom);
  $(".editor-section.arrangement").classList.add("layout-only");
  $$(".editor-section:not(.arrangement)").forEach((e) =>
    e.classList.add("config-only"),
  );
  $(".room-controls").classList.add("layout-only");
  $("#add").title = "Create another cushion";
  $("#add-to-layout").onclick = () => {
    setMode("layout");
    notify("Your cushion is in the layout. Choose a position or add another.");
  };
  $("#edit-cushion").onclick = () => setMode("configurator");
  $("#floor").innerHTML =
    '<option value="#b5a18a">Natural oak</option><option value="#83715f">Smoked oak</option><option value="#d2cbbf">Warm stone</option>';
  $("#furniture").innerHTML =
    '<option value="sofa-2">Two-seat sofa</option><option value="sofa-3">Three-seat sofa</option><option value="corner">Corner sofa</option><option value="armchair">Armchair</option><option value="double-bed">Double bed</option><option value="king-bed">King bed</option>';
  $("#shapes").innerHTML = [
    ["square", "Square"],
    ["rectangle", "Rectangle"],
    ["round", "Round"],
    ["bed", "Bed square"],
    ["bolster", "Bolster"],
  ]
    .map(([id, label]) => `<button data-shape="${id}">${label}</button>`)
    .join("");
  $('#edges [data-edge="none"]').dataset.edge = "unpiped";
  $("#fabrics").after(
    Object.assign(document.createElement("button"), {
      id: "more-fabrics",
      className: "text-link",
      textContent: "See more fabrics",
    }),
  );
  $("#more-fabrics").onclick = () =>
    loadCatalogue($("#fabric-search").value, nextOffset, true);
  const filling = document.createElement("label");
  filling.className = "field";
  filling.innerHTML =
    'Choose your cushion<select id="filling"><option value="filled">Cover & filling</option><option value="cover">Cover only</option></select>';
  $("#size-note").after(filling);
  const caps = document.createElement("div");
  caps.id = "end-placement";
  caps.innerHTML =
    '<p class="help">Bolster end caps share one upright placement.</p><label class="field">End-cap across <span id="end-x-value"></span><input id="end-x" type="range" min="0" step="1"></label><label class="field">End-cap down <span id="end-y-value"></span><input id="end-y" type="range" min="0" step="1"></label>';
  $(".placement").append(caps);
  const front = document.createElement("button");
  front.id = "front";
  front.textContent = "Inspect front";
  front.className = "config-only";
  $("#flip").before(front);
  $("#flip").innerHTML = "Inspect back";
  $("#flip").classList.add("config-only");
  $("#front").onclick = () => {
    face = "front";
    renderScene();
    renderFaces();
  };
  $("#flip").onclick = () => {
    face = "back";
    renderScene();
    renderFaces();
  };
  for (const n of [1, 2]) {
    const end = document.createElement("button");
    end.id = "inspect-end-" + n;
    end.className = "config-only";
    end.textContent = "End cap " + n;
    end.onclick = () => {
      face = "end" + n;
      renderScene();
      renderFaces();
    };
    $("#flip").after(end);
  }
  swatches(
    "#upholstery",
    [
      ["Sage", "#b9b8a5"],
      ["Oat", "#d8cdbb"],
      ["Ink", "#354552"],
      ["Clay", "#a88674"],
    ],
    "furniture",
  );
  swatches(
    "#walls",
    [
      ["Warm white", "#e8e3d8"],
      ["Parchment", "#d9cdb6"],
      ["Stone", "#c7c6bc"],
    ],
    "wall",
  );
}
function swatches(selector, values, key) {
  $(selector).innerHTML = values
    .map(
      ([label, value]) =>
        `<button data-colour="${value}" aria-label="${label}" title="${label}" style="background:${value}"></button>`,
    )
    .join("");
  $(selector).addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b)
      change(() => (design.colours[key] = b.dataset.colour), { quote: false });
  });
}
function renderFaces() {
  const bolster = sizeOf(current()?.spec.sizeId).shape === "bolster";
  $("#front").textContent = bolster ? "Body view" : "Inspect front";
  $("#flip").textContent = bolster ? "Body reverse" : "Inspect back";
  $("#front").classList.toggle("active", face === "front");
  $("#flip").classList.toggle("active", face === "back");
  $("#front").setAttribute("aria-pressed", face === "front");
  $("#flip").setAttribute("aria-pressed", face === "back");
  for (const n of [1, 2]) {
    const b = $("#inspect-end-" + n);
    b.hidden = !bolster;
    b.classList.toggle("active", face === "end" + n);
    b.setAttribute("aria-pressed", face === "end" + n);
  }
}
function render() {
  document.body.dataset.mode = mode;
  const arrangement = planArrangement(design);
  for (const piece of design.pieces) {
    const placed = arrangement.placements.find((p) => p.id === piece.spec.id);
    piece.position.slot = placed?.slot ?? 31;
  }
  const piece = current(),
    spec = piece?.spec,
    shape = sizeOf(spec?.sizeId).shape;
  $("#nav-config").classList.toggle("active", mode === "configurator");
  $("#nav-layout").classList.toggle("active", mode === "layout");
  $(".intro .eyebrow").textContent =
    mode === "configurator"
      ? "01 / DESIGN YOUR CUSHION"
      : "02 / FIND ITS PLACE";
  $(".intro h1").innerHTML =
    mode === "configurator"
      ? "A little detail.<br><em>Entirely your own.</em>"
      : "A considered mix.<br><em>A different room.</em>";
  $(".intro>p").innerHTML =
    mode === "configurator"
      ? "Choose a shape, fabric and finish.<br>Then see it come together in your room."
      : "Bring your cushions together.<br>Find the arrangement that feels like home.";
  $(".scene-caption").textContent =
    mode === "configurator"
      ? "YOUR CUSHION, EVERY DETAIL"
      : "YOUR ROOM, REIMAGINED";
  $(".editor-heading h2").textContent =
    mode === "configurator" ? "Your cushion" : "Your arrangement";
  $(".intro-note strong").textContent =
    mode === "configurator"
      ? "Then arrange it in your room."
      : "A collection that feels like you.";
  $(".step-number").textContent = mode === "configurator" ? "01" : "02";
  $("#pieces").innerHTML = design.pieces
    .map(
      (p, i) =>
        `<button class="piece-tab ${p.spec.id === selectedId ? "active" : ""}" data-id="${escape(p.spec.id)}" aria-label="Select cushion ${i + 1}" aria-pressed="${p.spec.id === selectedId}">${i + 1}</button>`,
    )
    .join("");
  $("#undo").disabled = !history.length;
  $("#remove").disabled = design.pieces.length < 2;
  $("#furniture").value = design.scene;
  $("#floor").value = design.colours.floor;
  $(".scene-foot span:first-child").textContent =
    mode === "layout" && design.scene.includes("bed")
      ? "Approximate bed scene proportions. Bed and sleeping pillows are props, not included; measure your own furniture."
      : "Illustrative furniture proportions · measure your own furniture";
  $("#design-name").value = design.name;
  for (const [selector, key] of [
    ["#upholstery", "furniture"],
    ["#walls", "wall"],
  ])
    $$(selector + " button").forEach((b) => {
      b.classList.toggle("active", b.dataset.colour === design.colours[key]);
      b.setAttribute("aria-pressed", b.dataset.colour === design.colours[key]);
    });
  if (spec) {
    $$("[data-shape]").forEach((b) =>
      b.classList.toggle("active", b.dataset.shape === shape),
    );
    $("#size").innerHTML = sizes
      .filter(([id]) => sizeOf(id).shape === shape)
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join("");
    $("#size").value = spec.sizeId;
    $("#filling").value = spec.filling;
    $("#size-note").textContent =
      sizeOf(spec.sizeId).approval === "proposed"
        ? "Proposed size — requires workroom confirmation before ordering."
        : "";
    $$("[data-edge]").forEach((b) => {
      b.classList.toggle("active", b.dataset.edge === spec.edge);
      b.setAttribute("aria-pressed", b.dataset.edge === spec.edge);
    });
    $("#contrast-field").hidden = spec.edge !== "contrast";
    $("#piping-note").hidden = spec.edge === "unpiped";
    $("#contrast-fabric").innerHTML = fabrics
      .map(
        (f) => `<option value="${escape(f.id)}">${escape(labelOf(f))}</option>`,
      )
      .join("");
    $("#contrast-fabric").value = spec.pipingFabricId || spec.fabricId;
    $$("[data-place]").forEach((b, i) => {
      const active =
        piece.position.slot !== 31 && piece.position.slot % 3 === i;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderPlacement();
  }
  renderFaces();
  renderFabrics();
  renderScene();
  renderQuote();
  renderGuides();
  renderTray(arrangement);
}
function renderTray(arrangement) {
  const target = $("#layout-tray");
  target.replaceChildren();
  const count = document.createElement("p");
  count.className = "help";
  count.textContent = `${arrangement.placements.length} on the furniture · up to ${arrangement.capacity} clear positions, depending on cushion sizes.`;
  target.append(count);
  for (const item of arrangement.unplaced) {
    const index = design.pieces.findIndex((p) => p.spec.id === item.id),
      button = document.createElement("button");
    button.className = "unplaced-piece";
    button.textContent = `Cushion ${index + 1} · not placed. ${item.reason}`;
    button.onclick = () => {
      selectedId = item.id;
      render();
    };
    target.append(button);
  }
  if (arrangement.unplaced.length) {
    const note = document.createElement("p");
    note.className = "help";
    note.textContent =
      "These cushions remain in your design and quote. Choose larger furniture, reduce the size, or remove a cushion to make room.";
    target.append(note);
  }
  persist();
}
function renderGuides() {
  const target = $("#guide-cards");
  target.replaceChildren();
  for (const [guideIndex, guide] of guides.entries()) {
    const actual = guide.pieces.map(([id]) => fabrics.find((f) => f.id === id));
    if (actual.some((f) => !f)) continue;
    const card = document.createElement("article");
    const shown = [...new Map(actual.map((f) => [f.id, f])).values()];
    for (const tuple of guide.pieces) {
      const piping = fabrics.find((f) => f.id === tuple[3]);
      if (piping && !shown.some((f) => f.id === piping.id)) shown.push(piping);
    }
    card.innerHTML = `<div class="guide-swatches">${shown.map((f) => `<img src="${escape(f.imageUrl)}" alt="${escape(labelOf(f))}" loading="lazy">`).join("")}</div><h3>${escape(guide.name)}</h3><p>${escape(guide.description)}</p><p class="guide-fabrics">${shown.map((f) => escape(labelOf(f))).join("<br>")}</p>`;
    const button = document.createElement("button");
    button.className = "text-link";
    button.dataset.guideIndex = guideIndex;
    button.textContent = "Start a new design with this pairing →";
    button.onclick = () => {
      change(() => {
        design = {
          ...design,
          id: uid(),
          name: guide.name,
          scene: guide.scene || design.scene,
          pieces: guide.pieces.map(
            ([fabricId, sizeId, edge = "unpiped", pipingFabricId], i) => {
              const p = freshPiece(fabricId);
              p.spec.sizeId = sizeId;
              p.spec.edge = edge;
              if (pipingFabricId) p.spec.pipingFabricId = pipingFabricId;
              p.position.slot = (
                guide.scene === "corner" ? [0, 2, 8, 4] : [0, 2, 4, 3, 5]
              )[i];
              normalisePlacement(p.spec);
              return p;
            },
          ),
        };
        revision = 0;
        selectedId = design.pieces[0].spec.id;
        mode = "layout";
        face = "front";
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      notify(
        "Your pairing is ready to arrange. Edit either cushion to make it yours. Undo returns to your previous design.",
      );
    };
    card.append(button);
    target.append(card);
  }
}
function renderPlacement() {
  const spec = current()?.spec;
  if (!spec) return;
  const fabric = fabricOf(spec),
    size = sizeOf(spec.sizeId),
    bounds = coverageBounds(size, fabric?.calibration);
  for (const [axis, input] of [
    ["x", "#offset-x"],
    ["y", "#offset-y"],
  ]) {
    $(input).max = bounds[axis];
    $(input).value = spec.placementMm[axis];
    $(input).disabled = !fabric?.calibration;
    $(input + "-value").textContent =
      (spec.placementMm[axis] / 10).toFixed(1) + " cm";
  }
  $("#end-placement").hidden = size.shape !== "bolster";
  for (const axis of ["x", "y"]) {
    const input = $("#end-" + axis),
      cap = spec.bolsterEndPlacementMm || spec.placementMm;
    input.max = Math.max(
      0,
      (axis === "x"
        ? fabric?.calibration?.physicalWidthMm
        : fabric?.calibration?.physicalHeightMm || 0) - 230,
    );
    input.value = cap[axis];
    input.disabled = !fabric?.calibration;
    $("#end-" + axis + "-value").textContent =
      (cap[axis] / 10).toFixed(1) + " cm";
  }
  $("#calibration-note").textContent = fabric?.calibration
    ? `Original cloth: ${fabric.calibration.physicalWidthMm / 10} cm wide × ${fabric.calibration.physicalHeightMm / 10} cm long. Placement stays within this image. No repeated or mirrored artwork.`
    : "Accurate preview awaits original image dimensions. This fabric remains available to explore.";
  $("#fabric-description").textContent = fabric
    ? labelOf(fabric) +
      (fabric.previewReady
        ? " · physical-scale preview"
        : " · preview calibration unavailable")
    : "";
  $("#samples").disabled = !fabric?.sampleAvailable;
}
function renderFabrics() {
  const q = $("#fabric-search").value.toLowerCase(),
    items = fabrics.filter(
      (f) =>
        !q ||
        [f.design, f.colour, f.brand, f.collection]
          .join(" ")
          .toLowerCase()
          .includes(q),
    );
  $("#fabrics").innerHTML =
    items
      .map(
        (f) =>
          `<button class="fabric-card ${f.id === current()?.spec.fabricId ? "active" : ""}" data-fabric="${escape(f.id)}" aria-pressed="${f.id === current()?.spec.fabricId}" title="${escape(labelOf(f))}">${f.imageUrl ? `<img src="${escape(f.imageUrl)}" alt="${escape(labelOf(f))}" loading="lazy" referrerpolicy="no-referrer">` : '<span class="fabric-colour"></span>'}<strong>${escape(f.design || f.name)}</strong><small>${escape(f.colour || f.colourway || f.brand)}</small></button>`,
      )
      .join("") ||
    '<p class="help">No fabrics found. Try another name or colour.</p>';
  $("#more-fabrics").hidden = nextOffset == null;
  $("#more-fabrics").textContent =
    nextOffset === 0
      ? "Explore the full fabric collection"
      : `See more fabrics (${totalFabrics} available)`;
}
function renderScene() {
  if (scene) {
    scene.update(design, fabrics, {
      mode,
      selectedId,
      face,
      view: camera,
      previewMaterials,
    });
    const spec = current()?.spec,
      f = fabricOf(spec),
      size = sizeOf(spec?.sizeId),
      pipingFabric = fabrics.find(
        (f) =>
          f.id ===
          (spec?.edge === "contrast" ? spec?.pipingFabricId : spec?.fabricId),
      ),
      pipingPlan = previewMaterials[spec?.id]?.piping,
      perimeter =
        size.shape === "bolster"
          ? 2 * Math.PI * 230
          : size.shape === "round"
            ? Math.PI * size.widthMm
            : 2 * (size.widthMm + size.heightMm),
      exact = !!pipingPreviewSegments(
        pipingPlan,
        pipingFabric?.calibration,
        perimeter,
      );
    $("#piping-note").textContent = exact
      ? "Piping uses confirmed physical strip lengths, source positions and join boundaries."
      : "Piping shows a colour sample from your fabric. Exact strip placement and joins await workroom confirmation.";
    $("#render-status").textContent = f?.calibration
      ? spec?.edge === "unpiped" || exact
        ? "Original artwork · finite physical coverage"
        : "Body artwork to scale · piping colour indicative"
      : "Fabric preview awaiting calibration";
  } else if (design.pieces.length) {
    $("#scene").innerHTML =
      '<div class="fallback"><h2>Your design is safe.</h2><p>3D is unavailable in this browser. You can still choose your fabric, size, finish and save your design.</p><div class="fallback-grid">' +
      design.pieces
        .map((p) => {
          const f = fabricOf(p.spec);
          return f?.imageUrl
            ? `<img src="${escape(f.imageUrl)}" alt="${escape(labelOf(f))}">`
            : "";
        })
        .join("") +
      "</div></div>";
  }
}
function scheduleQuote() {
  quoteRequest++;
  clearTimeout(quoteTimer);
  quoteLoading = true;
  quotes = [];
  setQuote = null;
  purchaseEnabled = false;
  previewMaterials = {};
  renderQuote();
  renderScene();
  quoteTimer = setTimeout(loadQuote, 220);
}
async function loadQuote() {
  const request = quoteRequest;
  try {
    const result = await api("/quote", {
      specs: design.pieces.map((p) => p.spec),
    });
    if (request !== quoteRequest) return;
    quotes = result.quotes || [];
    setQuote = result.setQuote || quotes[0];
    purchaseEnabled = result.purchaseEnabled === true;
    previewMaterials = Object.assign(
      {},
      ...quotes.map((q) => q.previewMaterials || {}),
      setQuote?.previewMaterials || {},
    );
    quoteLoading = false;
    renderQuote();
    renderScene();
  } catch (e) {
    if (request !== quoteRequest) return;
    quotes = [];
    quoteLoading = false;
    $("#quote-total").textContent = "Awaiting review";
    $("#quote-note").textContent = e.message;
  }
}
function money(amount) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount / 100);
}
function renderQuote() {
  $("#workroom").hidden = !config.ownerReview;
  $("#cut-plan").hidden = !config.ownerReview;
  $("#workroom").disabled = quoteLoading || !quotes.length;
  if (!current()) return;
  $("#quote-total").textContent = quoteLoading
    ? "Calculating…"
    : "Workroom review";
  $("#quote-note").textContent =
    "Your design is kept in this browser. Final pricing and ordering await confirmed workroom and commercial rules.";
  $("#buy-set").innerHTML = "Review the set <span>↗</span>";
  $("#buy-piece").textContent = "Review this cushion";
  const selected =
    quotes.find(
      (q) =>
        q.spec?.id === selectedId ||
        q.specId === selectedId ||
        q.specs?.some((s) => s.id === selectedId),
    ) || quotes[0];
  $("#cut-plan-content").replaceChildren();
  if (selected) {
    const pre = document.createElement("p");
    const issues = selected.blockers || selected.issues || [];
    pre.textContent = Array.isArray(issues)
      ? issues
          .map((x) => (typeof x === "string" ? x : x.message || x.code))
          .join(" ")
      : "Your cutting plan is calculated from the server.";
    $("#cut-plan-content").append(pre);
    const facts = document.createElement("p");
    facts.textContent =
      "The cutting plan uses supplier Full Width as the calculation basis, seam allowances and matching. Unconfirmed rules prevent checkout.";
    $("#cut-plan-content").append(facts);
    if (selected.cutPlan)
      renderCutPlan(selected.cutPlan, $("#cut-plan-content"));
  }
  const retail = mode === "configurator" ? selected : setQuote;
  if (!quoteLoading && retail?.ready && Number.isFinite(retail.totalMinor)) {
    $("#quote-total").textContent = money(retail.totalMinor);
    $("#quote-note").textContent = purchaseEnabled
      ? "Rechecked before checkout."
      : retail.message ||
        "Your price is ready; ordering is awaiting final release.";
  } else if (!config.ownerReview && retail?.message)
    $("#quote-note").textContent = retail.message;
  $("#buy-set").disabled = quoteLoading || !design.pieces.length;
  $("#buy-piece").disabled = quoteLoading || !design.pieces.length;
}
function renderCutPlan(plan, target) {
  const verification = document.createElement("p");
  verification.className = plan.matchingVerified
    ? "matching-verified"
    : "matching-unverified";
  verification.textContent = plan.matchingVerified
    ? "Matching verified for this calculation. Construction approval may still be required."
    : "PROVISIONAL CUT PLAN — identical motif matching is not verified. Do not cut from this diagram.";
  target.append(verification);
  for (const fabric of plan.fabrics || []) {
    const section = document.createElement("div"),
      heading = document.createElement("p");
    heading.textContent =
      (labelOf(fabrics.find((f) => f.id === fabric.fabricId)) ||
        fabric.fabricId) + ` · cutting width ${fabric.cuttingWidthMm} mm`;
    section.append(heading);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      height = Math.max(300, ...fabric.pieces.map((p) => p.yMm + p.heightMm)),
      width = fabric.cuttingWidthMm || 1400;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      "Flat cloth cutting plan showing both matching cushion faces",
    );
    svg.style.cssText =
      "width:100%;background:#eee7d7;border:1px solid #cabda6;margin:10px 0";
    for (const p of fabric.pieces) {
      const rect = document.createElementNS(svg.namespaceURI, "rect");
      for (const [k, v] of Object.entries({
        x: p.xMm,
        y: p.yMm,
        width: p.widthMm,
        height: p.heightMm,
        fill: "#c2cbb9",
        stroke: "#576956",
        "stroke-width": 4,
      }))
        rect.setAttribute(k, v);
      if (p.shape === "circle") {
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke-dasharray", "12 8");
        const circle = document.createElementNS(svg.namespaceURI, "ellipse");
        for (const [key, value] of Object.entries({
          cx: p.xMm + p.widthMm / 2,
          cy: p.yMm + p.heightMm / 2,
          rx: p.widthMm / 2,
          ry: p.heightMm / 2,
          fill: "#c2cbb9",
          stroke: "#576956",
          "stroke-width": 4,
        }))
          circle.setAttribute(key, value);
        svg.append(circle);
      }
      svg.append(rect);
      const text = document.createElementNS(svg.namespaceURI, "text");
      text.setAttribute("x", p.xMm + 15);
      text.setAttribute("y", p.yMm + 40);
      text.setAttribute("font-size", "25");
      text.textContent = p.role + (p.shape === "circle" ? " · circle" : "");
      svg.append(text);
      const line = document.createElement("p");
      line.textContent = `${p.role}${p.shape === "circle" ? " · circular cut (dashed rectangle is packing allowance)" : ""} · ${p.widthMm} × ${p.heightMm} mm · at ${p.xMm}, ${p.yMm} mm`;
      section.append(line);
    }
    section.prepend(svg);
    const metres = document.createElement("p");
    metres.textContent = `Required: ${fabric.requiredMetres.toFixed(2)} m · ${fabric.orderedMetres == null ? "Ordering increment to confirm" : `Ordered: ${fabric.orderedMetres.toFixed(2)} m`}`;
    section.append(metres);
    target.append(section);
  }
}
async function loadCatalogue(q = "", offset = 0, append = false) {
  const request = ++searchRequest;
  try {
    const data = await api(
      "/catalogue?" +
        (!fabrics.length && !q ? "examples=1&" : "") +
        "q=" +
        encodeURIComponent(q) +
        "&offset=" +
        (offset || 0) +
        "&limit=48",
    );
    if (request !== searchRequest) return;
    for (const item of data.items || []) {
      const old = fabrics.findIndex((f) => f.id === item.id);
      if (old >= 0) fabrics[old] = item;
      else fabrics.push(item);
    }
    totalFabrics = data.total || 0;
    nextOffset =
      data.source === "reviewed-source-records" ? 0 : data.nextOffset;
    renderFabrics();
    if (!design.pieces.length && fabrics.length) {
      const f = fabrics.find((f) => f.previewReady) || fabrics[0],
        piece = freshPiece(f.id);
      design.pieces.push(piece);
      selectedId = piece.spec.id;
      normalisePlacement(piece.spec);
      render();
      scheduleQuote();
    }
    if (data.message && !fabrics.length) {
      $("#fabric-description").textContent = data.message;
      $("#quote-note").textContent = data.message;
      $("#quote-total").textContent = "Catalogue unavailable";
    }
    return data;
  } catch (e) {
    notify("Fabric catalogue: " + e.message);
    $("#fabric-description").textContent =
      "The fabric catalogue could not load. Please reload to try again.";
  }
}
async function hydrateDesignFabrics() {
  const ids = [
    ...new Set(
      [
        ...design.pieces.flatMap((p) => [
          p.spec.fabricId,
          p.spec.pipingFabricId,
        ]),
        ...guides.flatMap((g) => g.pieces.map(([id]) => id)),
      ].filter(Boolean),
    ),
  ].filter((id) => !fabrics.some((f) => f.id === id));
  for (let i = 0; i < ids.length; i += 24) {
    try {
      const result = await api(
        "/catalogue?ids=" +
          ids
            .slice(i, i + 24)
            .map(encodeURIComponent)
            .join(","),
      );
      for (const f of result.items || [])
        if (!fabrics.some((old) => old.id === f.id)) fabrics.push(f);
    } catch {
      notify(
        "A saved fabric could not be loaded. Your cushion specifications are preserved.",
      );
    }
  }
}
function validSaved(value) {
  return (
    value?.version === 1 &&
    Array.isArray(value.pieces) &&
    value.pieces.length > 0 &&
    value.pieces.length <= 32 &&
    value.pieces.every(
      (p) =>
        p.spec?.version === 1 &&
        sizes.some(([id]) => id === p.spec.sizeId) &&
        p.spec.placementMm &&
        Number.isFinite(p.spec.placementMm.x) &&
        Number.isFinite(p.spec.placementMm.y) &&
        p.position,
    ) &&
    value.colours &&
    ["furniture", "wall", "floor"].every((key) =>
      /^#[a-f\d]{6}$/i.test(value.colours[key]),
    )
  );
}
async function save() {
  persist();
  try {
    const result = await api("/designs", {
      design,
      expectedRevision: revision,
    });
    revision = result.saved.revision;
    knownRevisions.set(design.id, revision);
    persist();
    notify(
      "Design saved. Return to it from this browser or the saved-design list.",
    );
    return result.saved;
  } catch (e) {
    notify("Saved in this browser. Server save: " + e.message);
    if (e.data?.signInUrl)
      showActionLink("Sign in to save to your account", e.data.signInUrl);
    return null;
  }
}
async function restore() {
  dialogTrigger = document.activeElement;
  const dialog = $("#review-dialog");
  $("#review-content").replaceChildren();
  $("#confirm-review").hidden = true;
  dialog.querySelector("h2").textContent = "Return to a design";
  try {
    const result = await api("/designs");
    if (!result.designs?.length) {
      $("#review-content").textContent =
        "No saved designs yet. Save your current design to return to it later.";
    }
    for (const saved of result.designs || []) {
      const button = document.createElement("button");
      button.className = "saved-design";
      button.textContent = `${saved.design.name} · ${saved.design.pieces.length} cushion${saved.design.pieces.length === 1 ? "" : "s"} · ${new Date(saved.updatedAt).toLocaleDateString("en-GB")}`;
      button.onclick = async () => {
        if (!validSaved(saved.design)) {
          notify("This saved design needs an update before it can be opened.");
          return;
        }
        remember();
        design = clone(saved.design);
        revision = saved.revision;
        selectedId = design.pieces[0].spec.id;
        mode = "configurator";
        await hydrateDesignFabrics();
        persist();
        render();
        scheduleQuote();
        dialog.close();
        notify("Your design is ready to continue.");
      };
      $("#review-content").append(button);
    }
  } catch (e) {
    $("#review-content").textContent = e.message;
  }
  dialog.showModal();
}
function showActionLink(label, url) {
  try {
    const parsed = new URL(url, location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) return;
    const link = document.createElement("a");
    link.href = parsed.href;
    link.target = "_top";
    link.textContent = label;
    link.className = "action-link";
    const inDialog = $("#review-dialog").open;
    (inDialog ? $("#review-content") : $("#status")).append(
      document.createElement("br"),
      link,
    );
    if (!inDialog && !$("#status .dismiss-notice")) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "dismiss-notice";
      dismiss.textContent = "Dismiss";
      dismiss.setAttribute("aria-label", "Dismiss notification");
      dismiss.onclick = () => {
        $("#status").hidden = true;
        $("#status").replaceChildren();
      };
      $("#status").append(dismiss);
      $("#status").hidden = false;
    }
    clearTimeout(statusTimer);
  } catch {}
}
function review(scope) {
  dialogTrigger = document.activeElement;
  reviewScope = scope;
  checkoutKey = uid();
  const pieces = scope === "piece" ? [current()] : design.pieces,
    quote =
      scope === "piece"
        ? quotes.find(
            (q) => q.specs?.length === 1 && q.specs[0].id === selectedId,
          )
        : setQuote,
    canBuy =
      purchaseEnabled && quote?.ready && Number.isFinite(quote.totalMinor);
  $("#review-dialog h2").textContent =
    scope === "piece" ? "Review your cushion" : "Review your arrangement";
  $("#confirm-review").hidden = false;
  $("#confirm-review").disabled = false;
  $("#confirm-review").textContent = canBuy
    ? "Continue to secure checkout"
    : "Save this design";
  $("#review-content").innerHTML =
    pieces
      .map(
        (p, i) =>
          `<article class="review-piece"><strong>Cushion ${i + 1} · ${escape(sizes.find(([id]) => id === p.spec.sizeId)?.[1])}</strong><p>${escape(labelOf(fabricOf(p.spec)))}<br>${escape(p.spec.edge === "unpiped" ? "Unpiped" : p.spec.edge === "self" ? "Self-piped" : "Contrast piping")} · ${p.spec.filling === "filled" ? "Cover & filling" : "Cover only"}<br>Shared front/back placement: ${p.spec.placementMm.x / 10} cm across, ${p.spec.placementMm.y / 10} cm down.</p></article>`,
      )
      .join("") +
    (Number.isFinite(quote?.deliveryGrossMinor)
      ? `<p>Cushion-only delivery: ${money(quote.deliveryGrossMinor)} including VAT, once per order${quote.ready ? "." : ". Goods price still requires review; this is not a complete quote."}</p>`
      : "") +
    (canBuy
      ? `<p><strong>${money(quote.totalMinor)}</strong></p><p>Price, fabric availability and your saved specification will be checked again before checkout.</p>`
      : "<p>Ordering is not yet enabled for this configuration. Save your design while the remaining details are confirmed.</p>");
  $("#confirm-review").onclick = async () => {
    const button = $("#confirm-review");
    button.disabled = true;
    const saved = await save();
    if (!canBuy) {
      if (saved) $("#review-dialog").close();
      button.disabled = false;
      return;
    }
    if (!saved) {
      button.disabled = false;
      return;
    }
    try {
      const response = await api("/checkout", {
        designId: design.id,
        specs: pieces.map((p) => p.spec),
        expectedQuoteId: quote.quoteId,
        idempotencyKey: checkoutKey,
      });
      if (response.purchaseEnabled !== true || !response.checkoutUrl)
        throw Error(
          response.message || "Checkout is not enabled for this configuration.",
        );
      const url = new URL(response.checkoutUrl);
      if (url.protocol !== "https:")
        throw Error("The checkout link could not be verified.");
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_top";
      link.click();
    } catch (error) {
      notify(error.message);
      button.disabled = false;
      if (
        error.data?.code?.includes("PRICE") ||
        error.data?.code?.includes("QUOTE")
      ) {
        await loadQuote();
        $("#review-dialog").close();
        review(scope);
        notify(
          "Your quote has changed. Please review the updated price before continuing.",
        );
      }
    }
  };
  $("#review-dialog").showModal();
  installMixedReview(pieces, quote);
}
function readSavedHouse() {
  try {
    const house = JSON.parse(localStorage.getItem("curtainsuk_house_v1")),
      uuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      house?.schema_version !== 1 ||
      !uuid.test(house.house_id) ||
      !Number.isSafeInteger(house.revision) ||
      !Array.isArray(house.rooms) ||
      !house.rooms.some((r) => r.curtains?.length)
    )
      return null;
    for (const room of house.rooms) {
      if (
        !uuid.test(room.room_id) ||
        typeof room.room_name !== "string" ||
        !Array.isArray(room.curtains)
      )
        return null;
      for (const curtain of room.curtains)
        if (
          !uuid.test(curtain.configuration_id) ||
          typeof curtain.receipt !== "string" ||
          !curtain.receipt ||
          typeof curtain.window_name !== "string"
        )
          return null;
    }
    return house;
  } catch {
    return null;
  }
}
function installMixedReview(pieces, quote) {
  const house = readSavedHouse();
  if (!house || !quote) return;
  const content = $("#review-content"),
    confirm = $("#confirm-review"),
    singleAction = confirm.onclick,
    form = document.createElement("section");
  form.className = "mixed-review";
  const count = house.rooms.reduce((n, r) => n + r.curtains.length, 0);
  form.innerHTML = `<label><input id="include-house" type="checkbox"> Include my ${count} saved curtain${count === 1 ? "" : "s"}</label><div id="mixed-fields" hidden><label class="field">Delivery postcode<input id="mixed-postcode" autocomplete="postal-code" maxlength="12"></label><button id="mixed-refresh" class="outline">Review curtains & cushions together</button><p id="mixed-message" role="status"></p><div id="mixed-price-changes"></div><label><input id="mixed-measurements" type="checkbox" disabled> I have checked and confirmed all curtain and cushion measurements.</label></div>`;
  content.append(form);
  let mixed = null,
    requestSequence = 0,
    houseRequest = null;
  const enabled = () =>
    !!mixed?.ready &&
    mixed.purchaseEnabled === true &&
    $("#mixed-measurements").checked &&
    $$("#mixed-price-changes input").every((i) => i.checked);
  const invalidate = () => {
    requestSequence++;
    mixed = null;
    $("#mixed-measurements").checked = false;
    $("#mixed-measurements").disabled = true;
    confirm.disabled = $("#include-house").checked;
  };
  $("#include-house").onchange = () => {
    $("#mixed-fields").hidden = !$("#include-house").checked;
    invalidate();
    confirm.textContent = $("#include-house").checked
      ? "Review the combined order first"
      : purchaseEnabled
        ? "Continue to secure checkout"
        : "Save this design";
  };
  $("#mixed-postcode").oninput = invalidate;
  $("#mixed-measurements").onchange = () => (confirm.disabled = !enabled());
  $("#mixed-refresh").onclick = async () => {
    invalidate();
    const request = requestSequence;
    const postcode = $("#mixed-postcode").value.trim();
    if (!postcode) {
      $("#mixed-message").textContent =
        "Enter your delivery postcode to review the combined order.";
      return;
    }
    const fresh = readSavedHouse();
    if (
      !fresh ||
      fresh.house_id !== house.house_id ||
      fresh.revision !== house.revision
    ) {
      $("#mixed-message").textContent =
        "Your saved curtains changed. Close this review and open it again.";
      return;
    }
    if (!(await save())) return;
    if (request !== requestSequence || !form.isConnected) return;
    houseRequest = {
      house_id: house.house_id,
      revision: house.revision,
      postcode,
      rooms: house.rooms.map((r) => ({
        room_id: r.room_id,
        room_name: r.room_name,
        curtains: r.curtains.map((c) => ({
          configuration_id: c.configuration_id,
          receipt: c.receipt,
          window_name: c.window_name,
        })),
      })),
    };
    try {
      const reviewed = await api("/mixed-review", {
        house: houseRequest,
        designId: design.id,
        specs: pieces.map((p) => p.spec),
        expectedQuoteId: quote.quoteId,
      });
      if (request !== requestSequence || !form.isConnected) return;
      mixed = reviewed;
      $("#mixed-message").textContent = mixed.ready
        ? `Combined total ${money(mixed.totalMinor)} · goods ${money(mixed.goodsMinor)} · delivery ${money(mixed.deliveryMinor)} · includes VAT ${money(mixed.vatMinor)}.`
        : mixed.message ||
          "Combined checkout is not available for these items yet.";
      $("#mixed-price-changes").replaceChildren();
      for (const change of mixed.acceptedPriceChanges || []) {
        const label = document.createElement("label"),
          input = document.createElement("input");
        input.type = "checkbox";
        input.value = change.configuration_id;
        input.onchange = () => (confirm.disabled = !enabled());
        label.append(
          input,
          document.createTextNode(
            ` Accept updated price ${money(change.currentPrice)} for ${mixed.lines?.find((line) => line.configurationId === change.configuration_id)?.window || "this curtain"}.`,
          ),
        );
        $("#mixed-price-changes").append(label);
      }
      $("#mixed-measurements").disabled =
        !mixed.ready || !mixed.purchaseEnabled;
      confirm.textContent = "Continue with curtains & cushions";
      confirm.disabled = !enabled();
    } catch (error) {
      if (request !== requestSequence || !form.isConnected) return;
      $("#mixed-message").textContent = error.message;
    }
  };
  confirm.onclick = async () => {
    if (!$("#include-house").checked) return singleAction();
    if (!enabled()) return;
    const fresh = readSavedHouse();
    if (!fresh || fresh.revision !== house.revision) {
      invalidate();
      $("#mixed-message").textContent =
        "Your saved curtains changed. Review the order again.";
      return;
    }
    confirm.disabled = true;
    try {
      const result = await api("/mixed-checkout", {
        house: houseRequest,
        designId: design.id,
        specs: pieces.map((p) => p.spec),
        expectedQuoteId: quote.quoteId,
        reviewId: mixed.reviewId,
        houseReviewToken: mixed.houseReviewToken,
        measurementsConfirmed: true,
        acceptedPriceChanges: (mixed.acceptedPriceChanges || []).filter(
          (change) =>
            $$("#mixed-price-changes input:checked").some(
              (input) => input.value === change.configuration_id,
            ),
        ),
        idempotencyKey: checkoutKey,
      });
      if (result.purchaseEnabled !== true || !result.checkoutUrl)
        throw Error(result.message || "Combined checkout is not available.");
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== "https:")
        throw Error("The checkout link could not be verified.");
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_top";
      link.click();
    } catch (error) {
      invalidate();
      $("#mixed-message").textContent =
        error.message + " Review the combined order again before continuing.";
    }
  };
}
function showWorkroom() {
  dialogTrigger = document.activeElement;
  const dialog = $("#review-dialog"),
    content = $("#review-content");
  dialog.classList.add("workroom-dialog");
  dialog.querySelector("h2").textContent = "Workroom planning sheet";
  $("#confirm-review").hidden = true;
  content.replaceChildren();
  const notice = document.createElement("p");
  notice.className = "workroom-notice";
  notice.textContent =
    "PLANNING ONLY — not approved for manufacture. Supplier Full Width is the calculation basis. Confirm seams, piping strips, closures, nonstandard insert costs and outstanding commercial terms before cutting.";
  content.append(notice);
  const title = document.createElement("h3");
  title.textContent = design.name;
  content.append(title);
  for (const [i, piece] of design.pieces.entries()) {
    const spec = piece.spec,
      fabric = fabricOf(spec),
      section = document.createElement("article");
    section.className = "workroom-piece";
    const heading = document.createElement("h3");
    heading.textContent = `Cushion ${i + 1} · ${sizes.find(([id]) => id === spec.sizeId)?.[1]}`;
    section.append(heading);
    const detail = document.createElement("p");
    detail.textContent = `${labelOf(fabric)} · Fabric ID ${spec.fabricId} · ${spec.filling === "filled" ? "Cover and filling" : "Cover only"} · ${spec.edge} edge · quantity ${spec.quantity}.`;
    section.append(detail);
    if (spec.edge === "contrast") {
      const line = document.createElement("p");
      line.textContent = `Piping: ${labelOf(fabrics.find((f) => f.id === spec.pipingFabricId))} (${spec.pipingFabricId}).`;
      section.append(line);
    }
    const instructions = document.createElement("p");
    instructions.textContent = `Front and back must be identical, upright and unmirrored. Shared visible panel origin on original cloth: ${spec.placementMm.x} mm across, ${spec.placementMm.y} mm down. Do not mirror, rotate, tile or stretch the source artwork.`;
    section.append(instructions);
    if (sizeOf(spec.sizeId).shape === "bolster") {
      const line = document.createElement("p"),
        cap = spec.bolsterEndPlacementMm || spec.placementMm;
      line.textContent = `Bolster body: one continuous 560 × ${(Math.PI * 230).toFixed(2)} mm visible strip, plus seam allowances. Two matching Ø230 mm end caps share origin ${cap.x}, ${cap.y} mm.`;
      section.append(line);
    }
    if (fabric?.imageUrl) {
      const image = document.createElement("img");
      image.className = "workroom-source";
      image.src = fabric.imageUrl;
      image.alt = `Original full-width cloth image: ${labelOf(fabric)}`;
      section.append(image);
      const caption = document.createElement("p");
      caption.textContent = fabric.calibration
        ? `Original source represents ${fabric.calibration.physicalWidthMm} × ${fabric.calibration.physicalHeightMm} mm. ${fabric.calibration.evidence}`
        : "Original physical image calibration is unavailable.";
      section.append(caption);
      const link = document.createElement("a");
      link.href = fabric.imageUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open original fabric image";
      section.append(link);
    }
    content.append(section);
  }
  for (const quote of setQuote ? [setQuote] : quotes) {
    const section = document.createElement("section");
    section.className = "workroom-cost";
    const heading = document.createElement("h3");
    heading.textContent = config.ownerReview
      ? "Cut plan & local owner cost basis"
      : "Cut plan";
    section.append(heading);
    if (config.ownerReview && typeof quote.knownCostMinor === "number") {
      const cost = document.createElement("p");
      cost.textContent = `Known cost components: ${money(quote.knownCostMinor)}. ${quote.totalCostMinor == null ? "Complete cost is unresolved." : `Calculated cost basis: ${money(quote.totalCostMinor)}.`} This is not a customer selling price.`;
      section.append(cost);
      for (const line of quote.costLines || []) {
        const p = document.createElement("p");
        p.textContent = line.label + " · " + money(line.amountMinor);
        section.append(p);
      }
      if (quote.staffPricing) {
        const p = document.createElement("p"),
          staff = quote.staffPricing;
        p.textContent = `Staff margin: target ${staff.targetMarginBasisPoints == null ? "not configured" : (staff.targetMarginBasisPoints / 100).toFixed(2) + "%"}; resulting after rounding and discount ${staff.resultingMarginBasisPoints == null ? "not calculable" : (staff.resultingMarginBasisPoints / 100).toFixed(2) + "%"}. Net discount: ${money(staff.discountNetMinor || 0)}.`;
        section.append(p);
        const delivery = document.createElement("p");
        delivery.textContent = `Customer delivery: ${quote.deliveryGrossMinor == null ? "not configured" : money(quote.deliveryGrossMinor) + " including VAT"}. Actual carrier expense (net): ${staff.carrierCostMinor == null ? "not recorded" : money(staff.carrierCostMinor)}. Delivery contribution (net): ${staff.deliveryContributionMinor == null ? "unknown until carrier expense is recorded" : money(staff.deliveryContributionMinor)}. Product margin excludes delivery.`;
        section.append(delivery);
      }
    }
    if (quote.cutPlan) renderCutPlan(quote.cutPlan, section);
    const issues = document.createElement("ul");
    for (const issue of quote.issues || []) {
      const li = document.createElement("li");
      li.textContent = issue;
      issues.append(li);
    }
    section.append(issues);
    content.append(section);
  }
  const actions = document.createElement("div");
  actions.className = "workroom-actions";
  const print = document.createElement("button");
  print.className = "outline";
  print.textContent = "Print workroom sheet";
  print.onclick = () => window.print();
  const download = document.createElement("button");
  download.className = "outline";
  download.textContent = "Download planning packet";
  download.onclick = () => {
    const ids = new Set(
        design.pieces.flatMap((p) => [p.spec.fabricId, p.spec.pipingFabricId]),
      ),
      packet = {
        version: 1,
        type: "cushion-workroom-planning",
        approvedForManufacture: false,
        generatedAt: new Date().toISOString(),
        design,
        quotes,
        setQuote,
        fabrics: fabrics
          .filter((f) => ids.has(f.id))
          .map((f) => ({
            id: f.id,
            design: f.design,
            colour: f.colour,
            imageUrl: f.imageUrl,
            calibration: f.calibration,
          })),
      },
      url = URL.createObjectURL(
        new Blob([JSON.stringify(packet, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `cushion-workroom-${design.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  actions.append(print, download);
  content.append(actions);
  dialog.showModal();
}
function wire() {
  $("#design-name").onchange = (e) => {
    design.name = e.target.value.trim() || "My cushion design";
    persist();
  };
  $("#review-dialog").addEventListener("close", () => {
    dialogTrigger?.focus();
    $("#review-dialog").classList.remove("workroom-dialog");
  });
  $("#reset-design").onclick = () =>
    change(() => {
      const fabricId = current()?.spec.fabricId || fabrics[0]?.id;
      design = {
        version: 1,
        id: uid(),
        name: "My cushion design",
        scene: "sofa-2",
        colours: { furniture: "#b9b8a5", wall: "#e8e3d8", floor: "#b5a18a" },
        pieces: [freshPiece(fabricId)],
      };
      design.pieces[0].position.slot = 1;
      selectedId = design.pieces[0].spec.id;
      revision = 0;
      mode = "configurator";
      face = "front";
    });
  $("#workroom").onclick = showWorkroom;
  $("#pieces").onclick = (e) => {
    const button = e.target.closest("[data-id]");
    if (button) {
      selectedId = button.dataset.id;
      face = "front";
      render();
      persist();
    }
  };
  $("#shapes").onclick = (e) => {
    const b = e.target.closest("[data-shape]");
    if (!b || !current()) return;
    change(() => {
      current().spec.sizeId = sizes.find(
        ([id]) => sizeOf(id).shape === b.dataset.shape,
      )[0];
      normalisePlacement(current().spec);
    });
  };
  $("#size").onchange = (e) =>
    change(() => {
      current().spec.sizeId = e.target.value;
      normalisePlacement(current().spec);
    });
  $("#filling").onchange = (e) =>
    change(() => (current().spec.filling = e.target.value));
  $("#fabrics").onclick = (e) => {
    const b = e.target.closest("[data-fabric]");
    if (!b || !current()) return;
    change(() => {
      current().spec.fabricId = b.dataset.fabric;
      normalisePlacement(current().spec);
    });
  };
  $("#fabric-search").oninput = () => {
    renderFabrics();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(
      () => loadCatalogue($("#fabric-search").value),
      300,
    );
  };
  $("#edges").onclick = (e) => {
    const b = e.target.closest("[data-edge]");
    if (!b || !current()) return;
    change(() => {
      current().spec.edge = b.dataset.edge;
      if (b.dataset.edge === "contrast")
        current().spec.pipingFabricId =
          current().spec.pipingFabricId ||
          fabrics.find((f) => f.id !== current().spec.fabricId)?.id ||
          current().spec.fabricId;
    });
  };
  $("#contrast-fabric").onchange = (e) =>
    change(() => (current().spec.pipingFabricId = e.target.value));
  for (const axis of ["x", "y"])
    for (const prefix of ["offset", "end"]) {
      const el = $("#" + prefix + "-" + axis);
      el.addEventListener("pointerdown", () => remember());
      el.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow")) remember();
      });
      el.oninput = () => {
        const spec = current().spec,
          key = prefix === "end" ? "bolsterEndPlacementMm" : "placementMm";
        spec[key] = {
          ...(spec[key] || spec.placementMm),
          [axis]: Number(el.value),
        };
        persist();
        renderPlacement();
        renderScene();
        scheduleQuote();
      };
    }
  $("#add").onclick = () => {
    if (design.pieces.length >= 32) {
      notify("This design can hold up to 32 cushions.");
      return;
    }
    change(() => {
      const piece = freshPiece(current()?.spec.fabricId || fabrics[0]?.id);
      design.pieces.push(piece);
      selectedId = piece.spec.id;
      mode = "configurator";
    });
  };
  $("#duplicate").onclick = () =>
    change(() => {
      if (design.pieces.length >= 32) return;
      const piece = clone(current());
      piece.spec.id = uid();
      piece.position.slot = (piece.position.slot + 1) % 3;
      design.pieces.push(piece);
      selectedId = piece.spec.id;
    });
  $("#remove").onclick = () => {
    if (design.pieces.length < 2) return;
    change(() => {
      design.pieces = design.pieces.filter((p) => p.spec.id !== selectedId);
      selectedId = design.pieces[0].spec.id;
    });
  };
  $("#undo").onclick = () => {
    if (!history.length) return;
    knownRevisions.set(design.id, revision);
    const previous = restoreHistory(history.pop(), knownRevisions);
    design = previous.design;
    revision = previous.revision;
    selectedId = previous.selectedId;
    mode = previous.mode;
    persist();
    render();
    scheduleQuote();
  };
  $$("[data-place]").forEach(
    (b, i) =>
      (b.onclick = () =>
        change(() => (current().position.slot = i), { quote: false })),
  );
  $("#furniture").onchange = (e) =>
    change(() => (design.scene = e.target.value), { quote: false });
  $("#floor").onchange = (e) =>
    change(() => (design.colours.floor = e.target.value), { quote: false });
  $$("[data-camera]").forEach(
    (b) =>
      (b.onclick = () => {
        camera = b.dataset.camera;
        $$("[data-camera]").forEach((x) =>
          x.classList.toggle("active", x === b),
        );
        renderScene();
      }),
  );
  $("#save").onclick = save;
  $("#restore").onclick = restore;
  $("#buy-set").onclick = () => review("set");
  $("#buy-piece").onclick = () => review("piece");
  $("#close-review").onclick = () => $("#review-dialog").close();
  $("#confirm-review").onclick = async () => {
    await save();
    $("#review-dialog").close();
  };
  $("#compare").onclick = () => {
    comparison = {
      ...historySnapshot(design, { revision, selectedId, mode }),
      image: scene?.capture(),
    };
    try {
      sessionStorage.setItem(COMPARE, JSON.stringify(comparison));
    } catch {}
    renderComparison();
    notify(
      "Comparison kept. Continue editing, then compare with this version.",
    );
  };
  $("#samples").onclick = async () => {
    const f = fabricOf(current()?.spec);
    if (!f || $("#samples").disabled) return;
    $("#samples").disabled = true;
    try {
      const result = await api("/samples", { fabricId: f.id });
      if (
        result.purchaseEnabled === true &&
        !config.ownerReview &&
        result.variantId
      ) {
        const cartResponse = await fetch("/cart.js", { cache: "no-store" });
        if (!cartResponse.ok)
          throw Error("Unable to check your basket. Please retry.");
        const cart = await cartResponse.json(),
          existing = cart.items?.find(
            (line) =>
              line.variant_id === result.variantId &&
              line.properties?.["Fabric Master ID"] === f.id,
          );
        if (existing) {
          if (
            existing.quantity !== result.quantity ||
            existing.properties?.["_CurtainsUK identity signature"] !==
              result.properties?.["_CurtainsUK identity signature"]
          )
            throw Error(
              "Your basket contains this sample with different details. Review it before continuing.",
            );
        } else {
          const response = await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  id: result.variantId,
                  quantity: result.quantity,
                  properties: result.properties,
                },
              ],
            }),
          });
          if (!response.ok)
            throw Error(
              "Sample addition could not be confirmed. Review your basket before retrying.",
            );
        }
        const link = document.createElement("a");
        link.href = "/cart";
        link.target = "_top";
        link.click();
      } else {
        notify(result.message || "Review this fabric and its sample options.");
        if (f.fabricProfileUrl)
          showActionLink("Open " + labelOf(f), f.fabricProfileUrl);
      }
    } catch (e) {
      notify(e.message);
      if (f.fabricProfileUrl)
        showActionLink("Open " + labelOf(f), f.fabricProfileUrl);
    } finally {
      $("#samples").disabled = !fabricOf(current()?.spec)?.sampleAvailable;
    }
  };
}
function renderComparison() {
  const panel = $("#comparison");
  panel.hidden = !comparison;
  if (!comparison) return;
  panel.innerHTML = `<p>YOUR KEPT ${comparison.mode === "layout" ? "ARRANGEMENT" : "CUSHION"}</p>${comparison.image ? `<img src="${comparison.image}" alt="Saved comparison view">` : ""}<button id="restore-comparison">Use this version</button> · <button id="clear-comparison">Clear comparison</button>`;
  $("#restore-comparison").onclick = async () => {
    remember();
    const previous = restoreHistory(comparison, knownRevisions);
    design = previous.design;
    revision = previous.revision;
    selectedId = previous.selectedId;
    mode = previous.mode;
    await hydrateDesignFabrics();
    persist();
    render();
    scheduleQuote();
  };
  $("#clear-comparison").onclick = () => {
    comparison = null;
    sessionStorage.removeItem(COMPARE);
    renderComparison();
  };
}
async function start() {
  prepareShell();
  wire();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (validSaved(saved?.design)) {
      design = saved.design;
      selectedId = design.pieces.some((p) => p.spec.id === saved.selectedId)
        ? saved.selectedId
        : design.pieces[0].spec.id;
      mode = saved.mode === "layout" ? "layout" : "configurator";
      revision = saved.revision || 0;
      for (const [id, value] of saved.knownRevisions || []) {
        if (typeof id === "string" && Number.isInteger(value) && value >= 0)
          knownRevisions.set(id, value);
      }
      knownRevisions.set(design.id, revision);
    }
  } catch {}
  try {
    comparison = JSON.parse(sessionStorage.getItem(COMPARE));
    if (!validSaved(comparison?.design)) comparison = null;
  } catch {}
  try {
    scene = await createStudioScene($("#scene"), {
      threeUrl: config.threeUrl,
      onSelect: (id) => {
        selectedId = id;
        render();
        persist();
      },
      onMove: (direction) => {
        if (current())
          change(
            () =>
              (current().position.slot = Math.max(
                0,
                Math.min(2, (current().position.slot % 3) + direction),
              )),
            { quote: false },
          );
      },
      onRenderError: notify,
    });
  } catch {
    notify(
      "3D is unavailable in this browser. Your design controls remain available.",
    );
  }
  await loadCatalogue();
  const requestedFabric = new URLSearchParams(location.search).get("fabric");
  if (
    requestedFabric &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/.test(requestedFabric)
  ) {
    try {
      const result = await api(
          "/catalogue?ids=" + encodeURIComponent(requestedFabric),
        ),
        fabric = result.items?.find((f) => f.id === requestedFabric);
      if (fabric) {
        if (!fabrics.some((f) => f.id === fabric.id)) fabrics.push(fabric);
        remember();
        const piece = freshPiece(fabric.id);
        design = {
          ...design,
          id: uid(),
          name: labelOf(fabric) + " cushion",
          pieces: [piece],
        };
        selectedId = piece.spec.id;
        revision = 0;
        mode = "configurator";
      } else
        notify("That fabric is not currently available in Cushion Studio.");
    } catch {
      notify(
        "The linked fabric could not be loaded. You can still browse the collection.",
      );
    }
  }
  await hydrateDesignFabrics();
  if (design.pieces.length) {
    for (const p of design.pieces)
      if (fabricOf(p.spec)) normalisePlacement(p.spec);
    render();
    scheduleQuote();
  }
  renderComparison();
  if (window.parent !== window) {
    const sendHeight = () =>
      window.parent.postMessage(
        {
          type: "cuk-cushion-height",
          height: Math.ceil(document.documentElement.scrollHeight),
        },
        "*",
      );
    new ResizeObserver(sendHeight).observe(document.body);
    sendHeight();
  }
}
start();
