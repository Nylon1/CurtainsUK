import { resolvePanazFabric, listedUse } from "./panaz-catalogue.mjs";
import {
  VERSION,
  STORAGE_KEY,
  ITEMS,
  SCENES,
  FURNITURE,
  COSTS,
  SAMPLE_STATUSES,
  APPROVAL_STATUSES,
  id,
  clone,
  money,
  escape,
  safeImage,
  templateLayout,
  createProject,
  createRoom,
  activeRoom,
  activeScheme,
  duplicateScheme,
  duplicateProject,
  setWindowCount,
  setItem,
  reuseItem,
  budgetTotals,
  vatLabel,
  layoutWarnings,
  unresolved,
  parseProject,
  readStore,
  saveStore,
} from "./model.mjs";
import {
  download,
  filename,
  roomsCsv,
  windowsCsv,
  enquiryText,
  layoutSvg,
  exportPlan,
  createBrief,
} from "./exports.mjs";

const $ = (selector) => document.querySelector(selector);
const config = window.HOTEL_STUDIO_CONFIG;
let store,
  project,
  loadError = null,
  tab = "visualiser",
  selectedItem = "curtains",
  selectedPiece = null,
  scene = null,
  saveTimer = null,
  toastTimer = null,
  scenePromise = null,
  exporting = false,
  searchSerial = 0,
  searchController = null,
  fabricTarget = null,
  catalogue = [],
  nextCursor = null;
try {
  store = readStore();
} catch (error) {
  loadError = error;
  store = { version: VERSION, revision: 0, projects: [], current: null };
}
if (!store.projects.length) {
  project = createProject();
  store.projects.push(project);
  store.current = project.id;
} else
  project =
    store.projects.find((p) => p.id === store.current) ?? store.projects[0];
let fieldEditing = false;
const room = () => activeRoom(project),
  scheme = () => activeScheme(project);
const icons = {
  visualiser:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v18M16 3v18M3 17h18"/>',
  coordination:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  layout: '<path d="M3 3h18v18h-7M3 3v18h5M10 3v8h11M3 14h7v7"/>',
  project:
    '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2"/>',
  saved: '<path d="M4 4h16v17l-8-4-8 4z"/>',
};
const labels = {
  visualiser: "Room Visualiser",
  coordination: "Furnishing Coordination",
  layout: "Room Layout Planner",
  project: "Project Planner",
  saved: "Saved Projects",
};
const palette = [
  "#677566",
  "#354b58",
  "#b78d5b",
  "#b5a38d",
  "#d7d1c3",
  "#eee9de",
  "#8c655b",
  "#353a39",
];
function askName(label, value) {
  const dialog = $("#name-dialog"),
    input = $("#name-input");
  $("#name-label").textContent = label;
  input.value = value;
  dialog.showModal();
  input.focus();
  input.select();
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "save" ? input.value : null),
      { once: true },
    );
  });
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 5000);
}
function showStorageError(message) {
  const el = $("#storage-error");
  el.hidden = false;
  el.textContent = message + " ";
  const button = document.createElement("button");
  button.className = "button";
  button.textContent = "Download current project";
  button.onclick = () => backupProject();
  el.append(button);
  if (loadError) {
    const raw = document.createElement("button");
    raw.className = "button";
    raw.textContent = "Download stored recovery data";
    raw.onclick = () => {
      try {
        download(
          localStorage.getItem(STORAGE_KEY) ?? "{}",
          "hotel-studio-recovery.json",
          "application/json",
        );
      } catch {
        toast(
          "Browser storage is inaccessible. Download the current project instead.",
        );
      }
    };
    el.append(raw);
  }
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = null;
  project.updatedAt = new Date().toISOString();
  store.current = project.id;
  const i = store.projects.findIndex((p) => p.id === project.id);
  if (i < 0) store.projects.push(project);
  else store.projects[i] = project;
  try {
    parseProject(project);
    if (loadError) throw loadError;
    store = saveStore(store, store.revision);
    project = store.projects.find((p) => p.id === store.current);
    $("#save-state").textContent = "Saved in this browser";
    $("#storage-error").hidden = true;
    return true;
  } catch (error) {
    $("#save-state").textContent = "Not saved";
    showStorageError(
      error.name === "QuotaExceededError"
        ? "Browser storage is full. Export a backup; your current changes remain on this screen."
        : error.message,
    );
    return false;
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  $("#save-state").textContent = "Saving…";
  saveTimer = setTimeout(persist, 350);
}
function change(fn, { render = true, preview = false } = {}) {
  fn();
  scheduleSave();
  if (render && !fieldEditing) renderAll();
  if (preview) updateScene();
}
function numberValue(
  input,
  min,
  max,
  { nullable = false, integer = false } = {},
) {
  if (nullable && input.value.trim() === "") return null;
  const v = input.valueAsNumber;
  if (
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isInteger(v))
  ) {
    if (fieldEditing) return undefined;
    input.setCustomValidity(
      `Enter ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`,
    );
    input.reportValidity();
    input.setCustomValidity("");
    return undefined;
  }
  return v;
}
const options = (values, selected) =>
  values
    .map(
      (v) =>
        `<option value="${escape(v)}" ${selected === v ? "selected" : ""}>${escape(v)}</option>`,
    )
    .join("");
const inputField = (label, value, attrs = "") =>
  `<label>${label}<input value="${escape(value ?? "")}" ${attrs}></label>`;
const numeric = (label, value, attrs = "") =>
  inputField(label, value, `type="number" ${attrs}`);
function fabricStyle(item) {
  return item.fabric?.image
    ? `background-color:${escape(item.colour)};background-image:url('${escape(item.fabric.image)}')`
    : `background-color:${escape(item.colour)}`;
}
function backupProject(p = project) {
  persist();
  download(
    JSON.stringify(
      {
        kind: "curtainsuk-hotel-project",
        version: VERSION,
        project: parseProject(p),
      },
      null,
      2,
    ),
    `${filename(p)}.json`,
    "application/json",
  );
}
function renderNav() {
  $("#workspace-tabs").innerHTML = Object.entries(labels)
    .map(
      ([key, label]) =>
        `<button data-tab="${key}" ${tab === key ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>${label}</button>`,
    )
    .join("");
}
function renderContext() {
  const r = room(),
    s = scheme();
  $("#project-name").value = project.name;
  $("#context-bar").innerHTML =
    tab === "saved"
      ? ""
      : `<label>ROOM TYPE <select id="room-select" aria-label="Current room type">${project.rooms.map((v) => `<option value="${v.id}" ${v.id === r.id ? "selected" : ""}>${escape(v.name)} · ${v.quantity}</option>`).join("")}</select></label><span class="context-dot">/</span><label>SCHEME <select id="scheme-select" aria-label="Current scheme">${r.schemes.map((v) => `<option value="${v.id}" ${v.id === s.id ? "selected" : ""}>${escape(v.name)}</option>`).join("")}</select></label><div class="context-actions"><button class="text-button" data-action="duplicate-scheme">Duplicate scheme</button><button class="text-button" data-action="compare">Compare alternatives</button></div>`;
}
function renderDesign() {
  const s = scheme(),
    item = s.items[selectedItem];
  $("#scene-title").textContent = SCENES[s.scene].name;
  $("#design-controls").innerHTML = `
  <section class="panel-section"><div class="panel-heading"><h2>${tab === "coordination" ? "Coordinate your room" : "Set the scene"}</h2><span class="step-number">01 / DESIGN</span></div><div class="scene-options">${Object.entries(
    SCENES,
  )
    .map(
      ([k, v]) =>
        `<button class="scene-option" data-scene="${k}" aria-pressed="${s.scene === k}">${v.name}<small>${k === "standard" ? "Compact & contemporary" : "Spacious & relaxed"}</small></button>`,
    )
    .join(
      "",
    )}</div><p class="upcoming">Twin and Suite scenes planned. Twin beds are available in the 2D planner.</p></section>
  ${
    tab === "visualiser"
      ? `<section class="panel-section"><h3>Dress the window <span class="muted">· Wave heading</span></h3><div class="layer-options" aria-label="Window layers">${[
          ["curtains", "Curtains"],
          ["both", "Both layers"],
          ["voile", "Voile"],
        ]
          .map(
            ([k, v]) =>
              `<button data-layers="${k}" aria-pressed="${s.layers === k}">${v}</button>`,
          )
          .join("")}</div>${[
          ["curtainOpen", "Main curtains", s.layers === "voile"],
          ["voileOpen", "Voile · separate track", s.layers === "curtains"],
        ]
          .map(
            ([k, title, disabled]) =>
              `<div class="motion-control"><label class="motion-label" for="${k}">${title}<output id="${k}-output">${Math.round(s[k] * 100)}% open</output></label><input type="range" min="0" max="100" step="1" id="${k}" data-motion="${k}" value="${Math.round(s[k] * 100)}" ${disabled ? "disabled" : ""}><div class="range-labels"><span>Closed</span><span>Open</span></div></div>`,
          )
          .join(
            "",
          )}${s.layers !== "curtains" ? `<div class="motion-control"><label class="motion-label" for="voile-opacity">Illustrative voile density<output id="voile-opacity-output">${Math.round(s.voileOpacity * 100)}%</output></label><input type="range" min="10" max="85" id="voile-opacity" data-density value="${Math.round(s.voileOpacity * 100)}"><p class="small muted">Voile sits behind the main curtain. Confirm sheerness with a sample.</p></div>` : ""}</section>`
      : ""
  }
  <section class="panel-section"><h3>${tab === "visualiser" ? "Choose a material" : "Eight details, one scheme"}</h3><div class="item-grid">${Object.entries(
    ITEMS,
  )
    .filter(
      ([k]) => tab === "coordination" || ["curtains", "voile"].includes(k),
    )
    .map(
      ([key, label]) =>
        `<button data-select-item="${key}" class="item-button" aria-pressed="${selectedItem === key}"><span class="swatch" style="${fabricStyle(s.items[key])}"></span>${label}</button>`,
    )
    .join("")}</div>
  <div class="choice-summary"><span class="swatch square" style="${fabricStyle(item)}"></span><div><strong>${ITEMS[selectedItem]}</strong><small>${item.fabric ? `${escape(item.fabric.design)} · ${escape(item.fabric.colour)}` : "Colour concept · fabric to select"}</small>${item.fabric ? `<small>${escape(item.fabric.brand)} · ${escape(item.fabric.reference)}</small>` : ""}</div></div>
  <div class="choice-actions"><button class="button primary" data-action="choose-fabric">Choose fabric</button><label><span class="sr-only">${ITEMS[selectedItem]} colour</span><input type="color" id="item-colour" value="${item.colour}" aria-label="${ITEMS[selectedItem]} colour"></label></div>
  ${item.fabric?.availability === "Discontinued" ? '<p class="notice warning">Panaz marks this fabric discontinued. Your saved choice is retained; choose an alternative before requesting samples or a quotation.</p>' : ""}
  <div class="colour-row" aria-label="Colour concepts">${palette.map((c) => `<button class="colour-dot" data-colour="${c}" style="background:${c}" aria-label="Use colour ${c}" aria-pressed="${item.colour === c && !item.fabric}"></button>`).join("")}</div>
  ${item.fabric ? `<p class="suitability">Visual choice saved. Suitability for ${ITEMS[selectedItem].toLowerCase()}, durability and project fire requirements need review.${item.fabric.usage ? ` Supplier-listed use: ${escape(item.fabric.usage)}.` : ""}</p><details class="fabric-evidence"><summary>Panaz technical reference</summary><p>Supplier-published FR ratings: ${escape(item.fabric.frRatings)}.</p><p>${listedUse(item.fabric, selectedItem) ? "Panaz lists this end use. Confirm the finished specification for your project." : "Panaz does not list this item’s use for this selection. Review or choose another fabric."}</p><a href="${escape(item.fabric.sourceUrl)}" target="_blank" rel="noopener">Supplier product details ↗</a><p>Checked ${escape(item.fabric.observedAt)}. A published rating is not project approval. Check samples, construction and required test evidence.</p></details><button class="text-button" data-action="remove-fabric">Use colour only</button><button class="text-button" data-action="retry-texture">Retry fabric image</button>` : '<p class="small muted" style="margin-top:12px">Colours are design concepts. Choose a catalogue fabric when you are ready.</p>'}
  <div class="relation"><label>Coordinate this item<select id="relationship"><option value="independent" ${item.relationship === "independent" ? "selected" : ""}>Choose independently</option><option value="same" ${item.relationship === "same" ? "selected" : ""}>Same fabric</option><option value="matching" ${item.relationship === "matching" ? "selected" : ""}>Matching colour</option><option value="complementary" ${item.relationship === "complementary" ? "selected" : ""}>Complementary fabric</option></select></label>${
    item.relationship !== "independent"
      ? `<label>Reference item<select id="reference-item">${Object.entries(
          ITEMS,
        )
          .filter(([k]) => k !== selectedItem)
          .map(
            ([k, v]) =>
              `<option value="${k}" ${item.referenceItem === k ? "selected" : ""}>${v}</option>`,
          )
          .join(
            "",
          )}</select></label>${["same", "matching"].includes(item.relationship) ? '<button class="button secondary" data-action="reuse">Apply reference choice</button><p class="small muted">Copies the current choice. Later edits remain independent.</p>' : '<p class="small muted">Choose another fabric or colour to complement your reference.</p>'}`
      : ""
  }</div></section>
  ${tab === "visualiser" ? '<section class="panel-section"><button class="button full secondary" data-tab="coordination">Coordinate the bed & seating →</button></section>' : ""}`;
  $("#scheme-strip").innerHTML =
    `<div><p class="eyebrow">YOUR MATERIAL STORY</p><strong>${escape(s.name)}</strong></div>${Object.entries(
      s.items,
    )
      .map(
        ([k, v]) =>
          `<button class="scheme-dot" data-select-item="${k}" style="${fabricStyle(v)}" aria-label="Edit ${ITEMS[k]}"><span>${ITEMS[k]}</span></button>`,
      )
      .join(
        "",
      )}<button class="text-button" data-action="rename-scheme">Rename scheme</button>`;
}
function renderLayout() {
  const l = scheme().layout;
  let p = l.items.find((i) => i.id === selectedPiece);
  if (!p) {
    selectedPiece = l.items[0]?.id ?? null;
    p = l.items[0];
  }
  const warnings = layoutWarnings(l);
  $("#layout-view").innerHTML =
    `<div class="page-heading"><div><p class="eyebrow">02 / SPACE & PROPORTION</p><h2>Make room for every detail.</h2><p>Plan in centimetres. This is a separate 2D plan: furniture moves and entered dimensions do not change the 3D concept scene.</p></div><div class="actions"><button class="button" data-action="export-plan">Export plan SVG ↓</button><button class="button quiet" data-action="reset-layout">Use scene template</button></div></div><div class="layout-grid"><div><div class="plan-canvas"><div id="plan-mount">${layoutSvg(l, { selected: selectedPiece, interactive: true })}</div><div class="plan-toolbar"><select id="add-furniture-kind" aria-label="Furniture to add">${Object.entries(
      FURNITURE,
    )
      .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
      .join(
        "",
      )}</select><button class="button primary" data-action="add-furniture">Add furniture +</button><span class="small muted">Drag, use arrow keys, or enter positions.</span></div></div><div id="layout-warnings">${warnings.length ? `<div class="notice warning" style="margin-top:14px"><strong>${warnings.length} layout checks</strong><ul class="warning-list">${warnings.map((w) => `<li>${escape(w)}</li>`).join("")}</ul></div>` : '<p class="notice" style="margin-top:14px">No basic overlaps or boundary issues detected.</p>'}<p class="small muted">Basic geometry checks only. Check access, circulation and project requirements with your design team.</p></div></div><aside class="layout-panel"><div class="card"><h3>Room dimensions</h3><div class="form-grid two">${numeric("Width (cm)", l.width, 'min="100" max="5000" step="1" data-layout-dimension="width"')}${numeric("Length (cm)", l.length, 'min="100" max="5000" step="1" data-layout-dimension="length"')}</div><label class="check-label"><input type="checkbox" id="layout-confirmed" ${l.confirmed ? "checked" : ""}>I have entered or checked these layout dimensions.</label><p class="small muted">${l.confirmed ? "Recorded as user-confirmed." : "Template dimensions are examples until confirmed."}</p></div><div class="card"><h3>${p ? "Selected furniture" : "Add furniture to begin"}</h3>${p ? `<label>Item<select id="piece-select">${l.items.map((i) => `<option value="${i.id}" ${i.id === p.id ? "selected" : ""}>${escape(i.label)}</option>`).join("")}</select></label><div class="form-grid two" style="margin-top:13px">${inputField("Label", p.label, 'maxlength="100" data-piece-field="label"')}${numeric("Rotation (degrees)", p.angle, 'min="0" max="359" step="1" data-piece-field="angle"')}${numeric("Width (cm)", p.width, 'min="10" max="2000" data-piece-field="width"')}${numeric("Depth (cm)", p.depth, 'min="10" max="2000" data-piece-field="depth"')}${numeric("X from left (cm)", p.x, 'min="-5000" max="10000" data-piece-field="x"')}${numeric("Y from top (cm)", p.y, 'min="-5000" max="10000" data-piece-field="y"')}</div><div class="actions" style="margin-top:15px"><button class="button" data-action="rotate-piece">Rotate 90°</button><button class="button quiet" data-action="remove-piece">Remove</button></div><p class="small muted" style="margin-top:10px">X/Y position the unrotated box. Rotation is around its centre.</p>` : ""}</div><div class="card"><div class="subsection-heading"><h3>Windows & doors</h3><button class="text-button" data-action="add-opening">Add opening +</button></div>${l.openings.map((o) => `<div class="opening-row" data-opening="${o.id}"><header><strong>${o.kind === "window" ? "Window" : "Door"}</strong><button class="text-button" data-remove-opening="${o.id}">Remove</button></header><div class="form-grid two"><label>Type<select data-opening-field="kind">${options(["window", "door"], o.kind)}</select></label><label>Wall<select data-opening-field="wall">${options(["north", "east", "south", "west"], o.wall)}</select></label>${numeric("Offset along wall (cm)", o.offset, 'min="0" max="5000" data-opening-field="offset"')}${numeric("Width (cm)", o.width, 'min="10" max="2000" data-opening-field="width"')}${numeric("Height (cm)", o.height, 'min="10" max="2000" data-opening-field="height"')}</div></div>`).join("")}<p class="small muted">Offsets start from the left on north/south walls and from the top on east/west walls. Plan openings are separate from the quotation window schedule.</p></div></aside></div>`;
  bindPlan();
}
function bindPlan() {
  const svg = $("#plan-mount svg");
  if (!svg) return;
  let drag = null;
  function point(e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener("pointerdown", (e) => {
    const target = e.target.closest("[data-piece]");
    if (!target) return;
    const piece = scheme().layout.items.find(
      (i) => i.id === target.dataset.piece,
    );
    if (!piece) return;
    selectedPiece = piece.id;
    const p = point(e);
    drag = { id: piece.id, start: p, x: piece.x, y: piece.y, moved: false };
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = point(e),
      item = scheme().layout.items.find((i) => i.id === drag.id);
    item.x = Math.max(
      -5000,
      Math.min(10000, Math.round(drag.x + p.x - drag.start.x)),
    );
    item.y = Math.max(
      -5000,
      Math.min(10000, Math.round(drag.y + p.y - drag.start.y)),
    );
    drag.moved = true;
    const g = svg.querySelector(`[data-piece="${item.id}"]`);
    g.setAttribute(
      "transform",
      `translate(${item.x + item.width / 2} ${item.y + item.depth / 2}) rotate(${item.angle})`,
    );
  });
  const end = (e) => {
    if (!drag) return;
    if (svg.hasPointerCapture(e.pointerId))
      svg.releasePointerCapture(e.pointerId);
    if (drag.moved) {
      scheme().layout.confirmed = false;
      scheduleSave();
    }
    drag = null;
    renderLayout();
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("keydown", (e) => {
    const target = e.target.closest("[data-piece]");
    if (!target) return;
    const item = scheme().layout.items.find(
      (i) => i.id === target.dataset.piece,
    );
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      selectedPiece = item.id;
      renderLayout();
      return;
    }
    const moves = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      selectedPiece = item.id;
      item.x = Math.max(
        -5000,
        Math.min(10000, item.x + moves[e.key][0] * step),
      );
      item.y = Math.max(
        -5000,
        Math.min(10000, item.y + moves[e.key][1] * step),
      );
      scheme().layout.confirmed = false;
      scheduleSave();
      renderLayout();
      $(`[data-piece="${item.id}"]`)?.focus();
    }
  });
}
function renderProject() {
  const r = room(),
    totals = budgetTotals(project);
  $("#project-view").innerHTML = `
  <div class="page-heading"><div><p class="eyebrow">03 / THE BIGGER PICTURE</p><h2>Bring the whole project together.</h2><p>Group your room types, record exceptions and prepare a clear brief for the CurtainsUK team.</p></div><div class="actions"><button class="button" data-action="prepare-samples">Prepare sample request</button><button class="button primary" data-action="prepare-quotation">Prepare quotation enquiry ↗</button></div></div>
  <div class="project-summary"><div class="summary-cell"><span>Your hotel</span><strong>${totals.rooms} rooms</strong><small>${project.rooms.length} room types · ${project.rooms.reduce((n, r) => n + r.schemes.length, 0)} design schemes</small></div><div class="summary-cell"><span>Entered allowance</span><strong>${money(totals.total)}</strong><small>${vatLabel(project.vatBasis)} · provisional</small></div><div class="summary-cell"><span>Preparation</span><strong>${unresolved(project).length} decisions</strong><small>Measurements, materials, samples & approvals</small></div></div>
  <div class="card"><div class="subsection-heading"><h3>Room types</h3><button class="button secondary" data-action="add-room">Add room type +</button></div><div class="planner-table-wrap"><table class="planner-table"><thead><tr><th>Room type</th><th>Rooms</th><th>Selected scheme</th><th>Samples</th><th>Phase</th><th></th></tr></thead><tbody>${project.rooms.map((v) => `<tr class="${v.id === r.id ? "selected" : ""}"><td><button class="text-button" data-edit-room="${v.id}">${escape(v.name)}</button></td><td>${v.quantity}</td><td>${escape(v.schemes.find((s) => s.id === v.schemeId).name)}</td><td><span class="status-badge">${v.sampleStatus}</span></td><td>${escape(v.phase)}</td><td><button class="text-button" data-edit-room="${v.id}">Edit</button></td></tr>`).join("")}</tbody></table></div></div>
  <div class="card"><div class="subsection-heading"><h3>${escape(r.name)} · room type details</h3>${project.rooms.length > 1 ? '<button class="text-button" data-action="remove-room">Remove room type</button>' : ""}</div><div class="form-grid">${inputField("Room type name", r.name, 'maxlength="120" data-room-field="name"')}${numeric("Number of rooms", r.quantity, 'min="1" max="10000" step="1" data-room-field="quantity"')}${numeric("Windows per room", r.windowCount, 'min="0" max="100" step="1" data-room-field="windowCount"')}<label>Sample status · manual<select data-room-field="sampleStatus">${options(SAMPLE_STATUSES, r.sampleStatus)}</select></label><label>Design approval · manual<select data-room-field="approvalStatus">${options(APPROVAL_STATUSES, r.approvalStatus)}</select></label>${inputField("Planned installation phase", r.phase, 'maxlength="200" data-room-field="phase"')}<label class="full">Room type notes<textarea data-room-field="notes" maxlength="12000">${escape(r.notes)}</textarea></label></div><p class="notice" style="margin-top:18px">Statuses are your own planning records. Changing them does not order a sample, approve technical suitability or book installation. Grouped rooms are not assumed to have identical verified measurements.</p>
  <details open><summary>Window measurement schedule · centimetres</summary><p class="small muted">Type-level dimensions are planning references. Record differing rooms below and verify each room before manufacture.</p>${r.windows.map((w) => `<div class="schedule-row" data-window="${w.id}"><header><h3>${escape(w.name)}</h3><button class="text-button" data-remove-window="${w.id}">Remove row</button></header><div class="form-grid">${inputField("Window name", w.name, 'maxlength="500" data-window-field="name"')}${numeric("Width (cm)", w.width, 'min="1" max="50000" step="0.1" placeholder="Enter width" data-window-field="width"')}${numeric("Drop (cm)", w.drop, 'min="1" max="50000" step="0.1" placeholder="Enter drop" data-window-field="drop"')}<label class="full">Window notes<input maxlength="4000" data-window-field="notes" value="${escape(w.notes)}"></label></div><label class="check-label"><input type="checkbox" data-window-field="confirmed" ${w.confirmed ? "checked" : ""}>I have checked these entered dimensions for this planning reference.</label></div>`).join("")}<button class="button" data-action="add-window">Add window row +</button>${r.windows.length !== r.windowCount ? `<p class="notice warning" style="margin-top:12px">Window count is ${r.windowCount}; ${r.windows.length} schedule rows are retained. Reconcile the count and rows before enquiry.</p>` : ""}</details>
  <details open><summary>Individual room numbers & exceptions (${r.exceptions.length})</summary><p class="small muted">Optional room records. Measurements here apply only to the named room and window; blank entries remain unconfirmed.</p>${r.exceptions.map((e) => `<div class="schedule-row" data-exception="${e.id}"><header><h3>Room ${escape(e.number) || "number to enter"}</h3><button class="text-button" data-remove-exception="${e.id}">Remove exception</button></header><div class="form-grid">${inputField("Room number", e.number, 'maxlength="80" data-exception-field="number"')}${inputField("Window / opening", e.windowName, 'maxlength="120" data-exception-field="windowName"')}<label>Scheme<select data-exception-field="schemeId"><option value="">Use room type scheme</option>${r.schemes.map((s) => `<option value="${s.id}" ${s.id === e.schemeId ? "selected" : ""}>${escape(s.name)}</option>`).join("")}</select></label>${numeric("Exception width (cm)", e.width, 'min="1" max="50000" step="0.1" data-exception-field="width"')}${numeric("Exception drop (cm)", e.drop, 'min="1" max="50000" step="0.1" data-exception-field="drop"')}<label class="full">Exception notes<textarea maxlength="4000" data-exception-field="notes">${escape(e.notes)}</textarea></label></div><label class="check-label"><input type="checkbox" data-exception-field="confirmed" ${e.confirmed ? "checked" : ""}>I have checked these dimensions for this individual room and opening.</label></div>`).join("")}<button class="button" data-action="add-exception">Add individual room / exception +</button></details></div>
  <div class="card"><div class="subsection-heading"><h3>Budget worksheet · ${escape(r.name)}</h3><span class="status-badge">User-entered allowances</span></div><p class="small muted">Enter an allowance per room in GBP. Each is multiplied by ${r.quantity} rooms. Leave unknown amounts blank; they are excluded from the entered total.</p><div class="form-grid">${Object.entries(
    COSTS,
  )
    .map(([k, v]) =>
      numeric(
        `${v} per room (£)`,
        r.budget[k],
        `min="0" max="10000000" step="0.01" placeholder="Not entered" data-budget="${k}"`,
      ),
    )
    .join(
      "",
    )}<label>VAT basis for all allowances<select id="vat-basis"><option value="unspecified" ${project.vatBasis === "unspecified" ? "selected" : ""}>Not specified</option><option value="inclusive" ${project.vatBasis === "inclusive" ? "selected" : ""}>Including VAT</option><option value="exclusive" ${project.vatBasis === "exclusive" ? "selected" : ""}>Excluding VAT</option></select></label></div><div class="budget-total"><div><p class="eyebrow">WHOLE PROJECT · ENTERED TOTAL</p><strong>${money(totals.total)}</strong></div><p class="small muted">${vatLabel(project.vatBasis)}<br>${totals.missing} unfilled allowance fields excluded.<br>Provisional planning allowances, not a quotation.</p></div></div>
  <div class="card"><h3>Project contact & notes</h3><div class="form-grid two">${inputField("Your name", project.contact.name, 'maxlength="250" data-contact="name"')}${inputField("Email", project.contact.email, 'type="email" maxlength="250" data-contact="email"')}${inputField("Hotel / organisation", project.contact.hotel, 'maxlength="250" data-contact="hotel"')}${inputField("Project location", project.contact.location, 'maxlength="250" data-contact="location"')}<label class="full">Project notes<textarea id="project-notes" maxlength="12000">${escape(project.notes)}</textarea></label></div><p class="small muted" style="margin-top:14px">These details stay in this browser and are included in your downloaded brief and enquiry draft.</p></div>
  <div class="card"><h3>Prepare your project pack</h3><p class="small muted">PDF includes all room types, schemes, preview images, layouts, entered measurements, exceptions and decisions. CSV schedules use the same saved project.</p><div class="actions"><button class="button primary" data-action="export-pdf">Export PDF brief</button><button class="button" data-action="export-rooms">Room schedule CSV</button><button class="button" data-action="export-windows">Window schedule CSV</button><button class="button" data-action="backup">Project backup JSON</button></div><details><summary>Decisions to review (${unresolved(project).length})</summary><ul class="warning-list">${unresolved(
    project,
  )
    .map((t) => `<li>${escape(t)}</li>`)
    .join("")}</ul></details></div>`;
}
function renderSaved() {
  $("#saved-view").innerHTML =
    `<div class="page-heading"><div><p class="eyebrow">YOUR PROJECT LIBRARY</p><h2>Pick up where you left off.</h2><p>Projects save only in this browser on this device. Clearing browser data removes them. Download JSON backups to retain or transfer your work.</p></div><div class="actions"><button class="button" data-action="import">Import project</button><button class="button primary" data-action="new-project">New project +</button></div></div><div class="saved-grid">${store.projects
      .map((p) => {
        const totals = budgetTotals(p),
          s = activeScheme(p);
        return `<article class="card saved-card"><div class="saved-card-art" style="background:linear-gradient(120deg,${s.items.curtains.colour}55,${s.items.headboard.colour}88)"><span>${totals.rooms} rooms</span></div><div class="saved-card-content"><h3>${escape(p.name)}</h3><p>${p.rooms.length} room types · ${p.rooms.reduce((n, r) => n + r.schemes.length, 0)} schemes</p><p>Saved ${new Date(p.updatedAt).toLocaleString("en-GB")}</p>${p.id === project.id ? '<span class="status-badge">Current project</span>' : ""}<div class="actions"><button class="button primary" data-open-project="${p.id}">Open project</button><button class="button" data-duplicate-project="${p.id}">Duplicate</button><button class="text-button" data-backup-project="${p.id}">Backup</button><button class="text-button" data-delete-project="${p.id}">Delete</button></div></div></article>`;
      })
      .join("")}</div>`;
}
function renderAll() {
  renderNav();
  renderContext();
  $("#design-view").hidden = !["visualiser", "coordination"].includes(tab);
  $("#layout-view").hidden = tab !== "layout";
  $("#project-view").hidden = tab !== "project";
  $("#saved-view").hidden = tab !== "saved";
  if (["visualiser", "coordination"].includes(tab)) renderDesign();
  if (tab === "layout") renderLayout();
  if (tab === "project") renderProject();
  if (tab === "saved") renderSaved();
}
async function ensureScene() {
  if (scene) return scene;
  if (scenePromise) return scenePromise;
  $("#scene-loading").hidden = false;
  $("#scene-error").hidden = true;
  scenePromise = import("./scene.mjs")
    .then((m) =>
      m.createHotelScene($("#hotel-scene"), {
        onPick: (key) => {
          selectedItem = key;
          if (!["curtains", "voile"].includes(key)) tab = "coordination";
          renderAll();
        },
        onStatus: (message) => {
          $("#scene-message").textContent = message;
          $("#scene-message").hidden = false;
        },
      }),
    )
    .then(async (value) => {
      scene = value;
      await scene.update(scheme());
      $("#scene-loading").hidden = true;
      return scene;
    })
    .catch((error) => {
      $("#scene-loading").hidden = true;
      $("#scene-error").hidden = false;
      $("#scene-error-message").textContent =
        "The 3D preview could not load. You can still coordinate materials, plan the layout, save your project and export its details.";
      console.warn("HOTEL_PREVIEW_UNAVAILABLE", error.message);
      scenePromise = null;
      return null;
    });
  return scenePromise;
}
async function updateScene() {
  if (!scene && !["visualiser", "coordination"].includes(tab)) return;
  const value = await ensureScene();
  if (value)
    try {
      await value.update(scheme());
    } catch {
      $("#scene-message").textContent =
        "The latest preview could not be drawn. Your selections are retained.";
      $("#scene-message").hidden = false;
    }
}
function selectTab(next) {
  if (!Object.hasOwn(labels, next)) return;
  persist();
  tab = next;
  if (tab === "visualiser" && !["curtains", "voile"].includes(selectedItem))
    selectedItem = "curtains";
  renderAll();
  if (["visualiser", "coordination"].includes(tab)) updateScene();
}
async function openFabrics() {
  if (fabricTarget?.item !== selectedItem) {
    $("#fabric-range").value = selectedItem === "voile" ? "sheers" : "";
    $("#fabric-query").value = "";
  }
  fabricTarget = {
    project: project.id,
    room: room().id,
    scheme: scheme().id,
    item: selectedItem,
  };
  $("#fabric-title").textContent =
    `Fabric for ${ITEMS[selectedItem].toLowerCase()}`;
  $("#fabric-for").textContent = `${room().name} / ${scheme().name}`;
  $("#fabric-dialog").showModal();
  $("#fabric-query").focus();
  await searchFabrics(false);
}
async function searchFabrics(more = false) {
  const serial = ++searchSerial;
  searchController?.abort();
  searchController = new AbortController();
  const target = $("#fabric-results");
  if (!more) {
    catalogue = [];
    target.innerHTML = '<p class="notice">Loading Panaz plain FR fabrics…</p>';
  }
  $("#fabric-more").hidden = true;
  const params = new URLSearchParams({
    view: "retail",
    visualiser: "1",
    query: $("#fabric-query").value.trim(),
    range: $("#fabric-range").value,
    item: fabricTarget?.item ?? selectedItem,
  });
  if (more && nextCursor !== null) params.set("cursor", String(nextCursor));
  try {
    const response = await fetch(`${config.catalogueUrl}?${params}`, {
      signal: searchController.signal,
    });
    if (!response.ok) throw Error("Catalogue unavailable");
    const payload = await response.json();
    if (serial !== searchSerial) return;
    const incoming = Array.isArray(payload.fabrics)
      ? payload.fabrics.map(resolvePanazFabric)
      : [];
    catalogue = more
      ? [
          ...catalogue,
          ...incoming.filter((f) => !catalogue.some((v) => v.id === f.id)),
        ]
      : incoming;
    nextCursor = payload.nextCursor ?? null;
    target.innerHTML = catalogue.length
      ? `<div class="fabric-grid">${catalogue
          .map((f) => {
            const image = safeImage(f.image);
            return `<button class="fabric-card" data-fabric="${escape(f.id)}">${image ? `<img src="${escape(image)}" alt="${escape(f.design)} ${escape(f.colour)} fabric" loading="lazy">` : '<div class="fabric-placeholder">Image unavailable</div>'}<span><strong>${escape(f.design)}</strong>${escape(f.colour)}<small>${escape(f.brand)} · Plain FR</small><small>${escape(f.reference)}</small><small>${listedUse(f, fabricTarget.item) ? "Supplier lists this use" : "Intended use needs review"}</small></span></button>`;
          })
          .join("")}</div>`
      : `<p class="notice">${payload.refineSearch ? "Try a more specific design or colour to narrow the catalogue." : "No matching fabrics. Try another colour, select All Panaz ranges, or continue with colours."}</p>`;
    target.querySelectorAll("img").forEach((img) =>
      img.addEventListener(
        "error",
        () => {
          const fallback = document.createElement("div");
          fallback.className = "fabric-placeholder";
          fallback.textContent = "Image unavailable · reference retained";
          img.replaceWith(fallback);
        },
        { once: true },
      ),
    );
    $("#fabric-more").hidden = nextCursor === null;
  } catch (error) {
    if (serial !== searchSerial || error.name === "AbortError") return;
    target.innerHTML =
      '<div class="notice warning">The Panaz selection is unavailable. Your selections are retained. Retry, or continue with colours.<p><button class="button" data-action="retry-catalogue">Retry catalogue</button></p></div>';
  }
}
function chooseFabric(fabricId) {
  const f = catalogue.find((f) => f.id === fabricId);
  if (!f || !fabricTarget) return;
  const p = store.projects.find((p) => p.id === fabricTarget.project),
    r = p?.rooms.find((r) => r.id === fabricTarget.room),
    s = r?.schemes.find((s) => s.id === fabricTarget.scheme);
  if (!s) {
    toast("The target scheme changed. Open the fabric library again.");
    return;
  }
  const fabric = resolvePanazFabric(f);
  if (fabric.availability === "Discontinued") {
    toast("Panaz marks this fabric discontinued. Choose another fabric.");
    return;
  }
  setItem(s, fabricTarget.item, { fabric, colour: fabric.displayColour });
  $("#fabric-dialog").close();
  scheduleSave();
  renderAll();
  updateScene();
  toast(
    `${f.design} ${f.colour} selected for ${ITEMS[fabricTarget.item].toLowerCase()}. Suitability needs review.`,
  );
}
async function captureScheme(s) {
  const value = await ensureScene();
  if (!value) return null;
  await value.update(s);
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  return value.capture();
}
async function compare() {
  if (room().schemes.length < 2) {
    toast("Duplicate your scheme first, then adjust the alternative.");
    return;
  }
  persist();
  const content = $("#compare-content");
  content.innerHTML = '<p class="notice">Preparing your scheme comparison…</p>';
  $("#compare-dialog").showModal();
  const copies = clone(room().schemes.slice(-2));
  const currentId = scheme().id;
  if (!copies.some((s) => s.id === currentId)) copies[0] = clone(scheme());
  const oldHidden = $("#design-view").hidden;
  $("#design-view").hidden = false;
  try {
    const images = [];
    for (const s of copies) images.push(await captureScheme(s));
    content.innerHTML = `<p class="small muted">Comparing these two saved schemes. All alternatives remain available in the scheme selector.</p><div class="compare-grid">${copies
      .map(
        (s, i) =>
          `<article>${images[i] ? `<img src="${images[i]}" alt="${escape(s.name)} room preview">` : '<p class="notice">3D preview unavailable</p>'}<h3>${escape(s.name)}</h3><p class="small muted">${SCENES[s.scene].name} · ${s.layers}</p><div class="compare-swatches">${Object.entries(
            s.items,
          )
            .map(
              ([k, v]) =>
                `<div><span class="swatch" style="${fabricStyle(v)}"></span><span>${ITEMS[k]}: ${v.fabric ? escape(v.fabric.design + " " + v.fabric.colour) : v.colour}</span></div>`,
            )
            .join(
              "",
            )}</div><button class="button" data-use-scheme="${s.id}" style="margin-top:18px">Use this scheme</button></article>`,
      )
      .join("")}</div>`;
  } finally {
    $("#design-view").hidden = oldHidden;
    await scene?.update(scheme());
  }
}
async function exportPdf() {
  if (exporting) return;
  persist();
  const snapshot = parseProject(clone(project));
  exporting = true;
  $("#progress-dialog").showModal();
  const oldHidden = $("#design-view").hidden;
  $("#design-view").hidden = false;
  try {
    const bytes = await createBrief(snapshot, {
      capture: captureScheme,
      onProgress: (t) => ($("#export-progress").textContent = t),
    });
    download(
      new Blob([bytes], { type: "application/pdf" }),
      `${filename(snapshot)}-project-brief.pdf`,
    );
    toast(
      "Project brief downloaded. It is a planning document, not a quotation.",
    );
  } catch (error) {
    toast(
      error.message ||
        "The brief could not be exported. Download a JSON backup and retry.",
    );
  } finally {
    exporting = false;
    $("#progress-dialog").close();
    $("#design-view").hidden = oldHidden;
    await scene?.update(scheme());
  }
}
function prepareEnquiry(kind) {
  persist();
  const text = enquiryText(clone(project), kind);
  $("#enquiry-title").textContent =
    kind === "samples" ? "Prepare sample request" : "Prepare quotation enquiry";
  $("#enquiry-content").innerHTML =
    `<p class="small muted">Review the draft, then download it or open your email app. Attach the PDF brief and schedules yourself. Opening email does not confirm delivery.</p><textarea class="enquiry-text" id="enquiry-text" aria-label="Prepared enquiry draft">${escape(text)}</textarea><div class="actions" style="margin-top:17px"><button class="button primary" id="download-enquiry">Download draft</button><a class="button" id="email-enquiry">Open email app</a><button class="button" data-action="export-pdf">Export brief PDF</button></div><p class="small muted" style="margin-top:15px">Draft destination: enquiries@curtainsuk.com. No message is sent by this studio.</p>`;
  $("#download-enquiry").onclick = () =>
    download(
      $("#enquiry-text").value,
      `${filename(project)}-${kind}-draft.txt`,
    );
  $("#email-enquiry").href =
    `mailto:enquiries@curtainsuk.com?subject=${encodeURIComponent(`Hotel ${kind === "samples" ? "sample request" : "quotation enquiry"}: ${project.name}`)}&body=${encodeURIComponent("Hello CurtainsUK,\n\nPlease review my hotel project. I will attach the project brief, schedules and prepared enquiry draft.\n\n" + project.contact.name)}`;
  $("#enquiry-dialog").showModal();
}
document.addEventListener("click", async (e) => {
  const button = e.target.closest("button,[data-tab]");
  if (!button) return;
  if (button.dataset.tab) {
    selectTab(button.dataset.tab);
    return;
  }
  if (button.matches("[data-close-dialog]")) {
    button.closest("dialog").close();
    return;
  }
  if (button.dataset.scene) {
    change(() => (scheme().scene = button.dataset.scene), { preview: true });
    return;
  }
  if (button.dataset.layers) {
    change(() => (scheme().layers = button.dataset.layers), { preview: true });
    return;
  }
  if (button.dataset.selectItem) {
    selectedItem = button.dataset.selectItem;
    if (!["curtains", "voile"].includes(selectedItem)) tab = "coordination";
    renderAll();
    return;
  }
  if (button.dataset.colour) {
    change(
      () =>
        setItem(scheme(), selectedItem, {
          colour: button.dataset.colour,
          fabric: null,
        }),
      { preview: true },
    );
    return;
  }
  if (button.dataset.camera) {
    document
      .querySelectorAll("[data-camera]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    scene?.view(button.dataset.camera);
    return;
  }
  if (button.dataset.fabric) {
    chooseFabric(button.dataset.fabric);
    return;
  }
  if (button.dataset.useScheme) {
    change(() => (room().schemeId = button.dataset.useScheme), {
      preview: true,
    });
    $("#compare-dialog").close();
    return;
  }
  if (button.dataset.editRoom) {
    change(() => (project.roomId = button.dataset.editRoom));
    return;
  }
  if (button.dataset.openProject) {
    persist();
    project = store.projects.find((p) => p.id === button.dataset.openProject);
    store.current = project.id;
    tab = "visualiser";
    selectedItem = "curtains";
    persist();
    renderAll();
    updateScene();
    return;
  }
  if (button.dataset.duplicateProject) {
    persist();
    project = duplicateProject(
      store.projects.find((p) => p.id === button.dataset.duplicateProject),
    );
    store.projects.push(project);
    persist();
    renderAll();
    return;
  }
  if (button.dataset.backupProject) {
    backupProject(
      store.projects.find((p) => p.id === button.dataset.backupProject),
    );
    return;
  }
  if (button.dataset.deleteProject) {
    const p = store.projects.find((p) => p.id === button.dataset.deleteProject);
    if (
      confirm(
        `Delete “${p.name}” from this browser? Download a backup first if you need to retain it.`,
      )
    ) {
      store.projects = store.projects.filter((v) => v.id !== p.id);
      if (project.id === p.id) {
        project = store.projects[0] ?? createProject();
        if (!store.projects.length) store.projects.push(project);
      }
      persist();
      renderAll();
    }
    return;
  }
  if (button.dataset.removeOpening) {
    change(() => {
      scheme().layout.openings = scheme().layout.openings.filter(
        (o) => o.id !== button.dataset.removeOpening,
      );
      scheme().layout.confirmed = false;
    });
    return;
  }
  if (button.dataset.removeWindow) {
    if (
      confirm(
        "Remove this window schedule row? The room type window count will stay as entered.",
      )
    )
      change(
        () =>
          (room().windows = room().windows.filter(
            (w) => w.id !== button.dataset.removeWindow,
          )),
      );
    return;
  }
  if (button.dataset.removeException) {
    if (confirm("Remove this individual room exception?"))
      change(
        () =>
          (room().exceptions = room().exceptions.filter(
            (v) => v.id !== button.dataset.removeException,
          )),
      );
    return;
  }
  const action = button.dataset.action;
  try {
    switch (action) {
      case "choose-fabric":
        await openFabrics();
        break;
      case "retry-catalogue":
        await searchFabrics(false);
        break;
      case "remove-fabric":
        change(() => setItem(scheme(), selectedItem, { fabric: null }), {
          preview: true,
        });
        break;
      case "retry-texture":
        if (scene) {
          scene.dispose();
          scene = null;
          scenePromise = null;
        }
        await ensureScene();
        break;
      case "reuse":
        change(
          () =>
            reuseItem(
              scheme(),
              selectedItem,
              $("#reference-item").value,
              $("#relationship").value,
            ),
          { preview: true },
        );
        break;
      case "duplicate-scheme":
        if (room().schemes.length >= 12) {
          toast(
            "Up to 12 alternatives per room type. Create another room type to continue.",
          );
          break;
        }
        change(() => duplicateScheme(room(), scheme()), { preview: true });
        toast("Alternative created. Changes will affect this scheme only.");
        break;
      case "rename-scheme": {
        const name = await askName("Scheme name", scheme().name);
        if (name?.trim())
          change(() => (scheme().name = name.trim().slice(0, 120)));
        break;
      }
      case "compare":
        await compare();
        break;
      case "export-plan":
        await exportPlan(
          scheme().layout,
          filename(project) +
            "-" +
            scheme().name.replace(/[^a-zA-Z0-9-]/g, "-"),
        );
        break;
      case "reset-layout":
        if (
          confirm(
            "Replace this scheme’s 2D layout with example furniture and dimensions?",
          )
        )
          change(() => {
            scheme().layout = templateLayout(scheme().scene);
            selectedPiece = null;
          });
        break;
      case "add-furniture": {
        if (scheme().layout.items.length >= 80) {
          toast("This plan supports up to 80 furniture items.");
          break;
        }
        const kind = $("#add-furniture-kind").value,
          p = FURNITURE[kind];
        change(() => {
          const i = {
            id: id(),
            kind,
            label: p.label,
            x: 40,
            y: 40,
            width: p.w,
            depth: p.d,
            angle: 0,
          };
          scheme().layout.items.push(i);
          scheme().layout.confirmed = false;
          selectedPiece = i.id;
        });
        break;
      }
      case "rotate-piece":
        change(() => {
          const i = scheme().layout.items.find((v) => v.id === selectedPiece);
          if (i) i.angle = (i.angle + 90) % 360;
          scheme().layout.confirmed = false;
        });
        break;
      case "remove-piece":
        change(() => {
          scheme().layout.items = scheme().layout.items.filter(
            (i) => i.id !== selectedPiece,
          );
          scheme().layout.confirmed = false;
          selectedPiece = null;
        });
        break;
      case "add-opening":
        if (scheme().layout.openings.length < 40)
          change(() => {
            scheme().layout.openings.push({
              id: id(),
              kind: "window",
              wall: "north",
              offset: 10,
              width: 100,
              height: 150,
            });
            scheme().layout.confirmed = false;
          });
        break;
      case "add-room": {
        if (project.rooms.length >= 60) {
          toast("This project supports up to 60 room types.");
          break;
        }
        const name = await askName(
          "Room type name (for example, Twin rooms)",
          "New room type",
        );
        if (name?.trim())
          change(() => {
            const r = createRoom(name.trim().slice(0, 120));
            project.rooms.push(r);
            project.roomId = r.id;
          });
        break;
      }
      case "remove-room":
        if (
          project.rooms.length > 1 &&
          confirm(`Remove ${room().name}, its schemes, layouts and exceptions?`)
        )
          change(() => {
            project.rooms = project.rooms.filter(
              (r) => r.id !== project.roomId,
            );
            project.roomId = project.rooms[0].id;
          });
        break;
      case "add-window":
        if (room().windows.length < 100)
          change(() =>
            room().windows.push({
              id: id(),
              name: `Window ${room().windows.length + 1}`,
              width: null,
              drop: null,
              confirmed: false,
              notes: "",
            }),
          );
        break;
      case "add-exception":
        if (room().exceptions.length < 1000)
          change(() =>
            room().exceptions.push({
              id: id(),
              number: "",
              windowName: "",
              notes: "",
              schemeId: "",
              width: null,
              drop: null,
              confirmed: false,
            }),
          );
        break;
      case "export-pdf":
        await exportPdf();
        break;
      case "export-rooms":
        persist();
        download(
          roomsCsv(parseProject(project)),
          filename(project) + "-rooms.csv",
          "text/csv;charset=utf-8",
        );
        break;
      case "export-windows":
        persist();
        download(
          windowsCsv(parseProject(project)),
          filename(project) + "-windows.csv",
          "text/csv;charset=utf-8",
        );
        break;
      case "backup":
        backupProject();
        break;
      case "import":
        $("#import-project").click();
        break;
      case "new-project":
        persist();
        project = createProject();
        store.projects.push(project);
        persist();
        tab = "visualiser";
        selectedItem = "curtains";
        renderAll();
        updateScene();
        break;
      case "prepare-samples":
        prepareEnquiry("samples");
        break;
      case "prepare-quotation":
        prepareEnquiry("quotation");
        break;
    }
  } catch (error) {
    toast(error.message ?? "This action could not be completed.");
  }
});
document.addEventListener("input", (e) => {
  const target = e.target;
  if (target.dataset.motion) {
    scheme()[target.dataset.motion] = Number(target.value) / 100;
    $(`#${target.dataset.motion}-output`).textContent = `${target.value}% open`;
    scheduleSave();
    updateScene();
  }
  if (target.hasAttribute("data-density")) {
    scheme().voileOpacity = Number(target.value) / 100;
    $("#voile-opacity-output").textContent = target.value + "%";
    scheduleSave();
    updateScene();
  }
  if (target.id === "item-colour") {
    setItem(scheme(), selectedItem, { colour: target.value, fabric: null });
    scheduleSave();
    updateScene();
  }
});
function handleFieldChange(e) {
  const t = e.target;
  let value = t.value;
  if (t.id === "project-name") {
    project.name = value.trim() || "My hotel project";
    scheduleSave();
    return;
  }
  if (t.id === "room-select") {
    change(() => (project.roomId = value), { preview: true });
    return;
  }
  if (t.id === "scheme-select") {
    change(() => (room().schemeId = value), { preview: true });
    return;
  }
  if (t.id === "item-colour") {
    renderDesign();
    return;
  }
  if (t.id === "relationship") {
    change(() => {
      scheme().items[selectedItem].relationship = value;
      if (scheme().items[selectedItem].referenceItem === selectedItem)
        scheme().items[selectedItem].referenceItem = Object.keys(ITEMS).find(
          (k) => k !== selectedItem,
        );
    });
    return;
  }
  if (t.id === "reference-item") {
    change(() => (scheme().items[selectedItem].referenceItem = value));
    return;
  }
  if (t.id === "piece-select") {
    selectedPiece = value;
    renderLayout();
    return;
  }
  if (t.id === "layout-confirmed") {
    change(() => (scheme().layout.confirmed = t.checked));
    return;
  }
  if (t.dataset.layoutDimension) {
    value = numberValue(t, 100, 5000);
    if (value !== undefined)
      change(() => {
        scheme().layout[t.dataset.layoutDimension] = value;
        scheme().layout.confirmed = false;
      });
    return;
  }
  if (t.dataset.pieceField) {
    const field = t.dataset.pieceField;
    if (field !== "label") {
      value = numberValue(
        t,
        field === "angle" ? 0 : ["x", "y"].includes(field) ? -5000 : 10,
        field === "angle" ? 359 : ["x", "y"].includes(field) ? 10000 : 2000,
      );
      if (value === undefined) return;
    }
    change(() => {
      const p = scheme().layout.items.find((i) => i.id === selectedPiece);
      p[field] = value;
      scheme().layout.confirmed = false;
    });
    return;
  }
  if (t.dataset.openingField) {
    const field = t.dataset.openingField;
    if (!["kind", "wall"].includes(field)) {
      value = numberValue(
        t,
        field === "offset" ? 0 : 10,
        field === "offset" ? 5000 : 2000,
      );
      if (value === undefined) return;
    }
    change(() => {
      scheme().layout.openings.find(
        (o) => o.id === t.closest("[data-opening]").dataset.opening,
      )[field] = value;
      scheme().layout.confirmed = false;
    });
    return;
  }
  if (t.dataset.roomField) {
    const field = t.dataset.roomField;
    if (["quantity", "windowCount"].includes(field)) {
      value = numberValue(
        t,
        field === "quantity" ? 1 : 0,
        field === "quantity" ? 10000 : 100,
        { integer: true },
      );
      if (value === undefined) return;
    }
    change(() => {
      if (field === "windowCount") setWindowCount(room(), value);
      else room()[field] = value;
    });
    return;
  }
  const rowKind = t.dataset.windowField
    ? "window"
    : t.dataset.exceptionField
      ? "exception"
      : null;
  if (rowKind) {
    const field = t.dataset[rowKind + "Field"],
      record = (rowKind === "window" ? room().windows : room().exceptions).find(
        (v) => v.id === t.closest(`[data-${rowKind}]`).dataset[rowKind],
      );
    if (["width", "drop"].includes(field)) {
      value = numberValue(t, 1, 50000, { nullable: true });
      if (value === undefined) return;
    }
    if (field === "confirmed") {
      value = t.checked;
      if (value && (record.width === null || record.drop === null)) {
        t.checked = false;
        toast("Enter width and drop before confirming these dimensions.");
        return;
      }
    }
    change(() => {
      record[field] = value;
      if (["width", "drop"].includes(field)) record.confirmed = false;
    });
    return;
  }
  if (t.dataset.budget) {
    value = numberValue(t, 0, 10000000, { nullable: true });
    if (value !== undefined)
      change(() => (room().budget[t.dataset.budget] = value));
    return;
  }
  if (t.id === "vat-basis") {
    change(() => (project.vatBasis = value));
    return;
  }
  if (t.dataset.contact) {
    project.contact[t.dataset.contact] = value;
    scheduleSave();
    return;
  }
  if (t.id === "project-notes") {
    project.notes = value;
    scheduleSave();
  }
}
document.addEventListener("change", handleFieldChange);
document.addEventListener("input", (e) => {
  if (
    !e.target.matches(
      "input:not([type]),input[type=text],input[type=email],input[type=number],textarea",
    )
  )
    return;
  fieldEditing = true;
  try {
    handleFieldChange(e);
  } finally {
    fieldEditing = false;
  }
});
$("#fabric-search").onsubmit = (e) => {
  e.preventDefault();
  searchFabrics(false);
};
$("#fabric-range").onchange = () => searchFabrics(false);
$("#fabric-more").onclick = () => searchFabrics(true);
$("#save-project").onclick = () => {
  if (persist())
    toast(
      "Project saved in this browser. Download a backup to keep another copy.",
    );
};
$("#brief-button").onclick = exportPdf;
$("#snapshot-button").onclick = () => {
  if (scene) downloadDataURL(scene.capture(), filename(project) + "-room.jpg");
  else toast("The room preview must finish loading before saving an image.");
};
function downloadDataURL(data, name) {
  const a = document.createElement("a");
  a.href = data;
  a.download = name;
  a.click();
}
$("#retry-scene").onclick = async () => {
  scene?.dispose();
  scene = null;
  scenePromise = null;
  await ensureScene();
};
$("#progress-dialog").addEventListener("cancel", (e) => {
  if (exporting) e.preventDefault();
});
$("#fabric-dialog").addEventListener("close", () => {
  searchSerial++;
  searchController?.abort();
});
$("#import-project").onchange = async (e) => {
  try {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024)
      throw Error("Project files must be smaller than 8 MB.");
    const value = JSON.parse(await file.text());
    const imported = parseProject(value.project ?? value);
    persist();
    project = imported;
    if (store.projects.some((p) => p.id === project.id))
      project = duplicateProject(project);
    store.projects.push(project);
    persist();
    tab = "visualiser";
    renderAll();
    updateScene();
    toast(
      "Project imported. Review saved fabric availability and suitability before ordering.",
    );
  } catch (error) {
    toast(error.message || "This project could not be imported.");
  } finally {
    e.target.value = "";
  }
};
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY)
    showStorageError(
      "Projects changed in another tab. Download current work before reloading to avoid overwriting a newer version.",
    );
});
window.addEventListener("pagehide", () => {
  if (saveTimer) persist();
});
window.addEventListener("beforeunload", (e) => {
  if (saveTimer && !persist()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
// Read-only diagnostics support bounded browser verification without creating another persistence path.
window.hotelStudio = {
  snapshot: () => clone(project),
  rendererProof: () => scene?.proof() ?? null,
  ready: () => !!scene,
  storageKey: STORAGE_KEY,
};
renderAll();
if (loadError) showStorageError(loadError.message);
else persist();
ensureScene();
