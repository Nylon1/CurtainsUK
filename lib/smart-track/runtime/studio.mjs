import {
  createDemoState,
  command,
  tick,
  selectRoom,
  selectChannel,
  setView,
  ROOM_IDS,
} from "./state.mjs";
import { ROOM_DESIGNS, PLAIN_COLOURS } from "./room-design.mjs";
const $ = (id) => document.getElementById(id),
  config = window.SMART_TRACK_CONFIG,
  Store = window.CurtainsUKRooms;
const names = {
  living: "Living room",
  bedroom: "Bedroom",
  dining: "Dining room",
  office: "Home office",
  patio: "Patio doors",
};
const labels = {
  PENCIL: "Pencil pleat",
  PINCH: "Pinch pleat",
  WAVE: "Wave",
  CENTRE: "Centre-opening pair",
  LEFT: "Left",
  RIGHT: "Right",
  WALL: "Wall",
  CEILING: "Ceiling",
};
const money = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    n / 100,
  );
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let state = createDemoState(0.6),
  scene = null,
  sceneSequence = 0,
  raf = 0,
  last = 0,
  lastPaint = 0,
  quote = null,
  quoteSequence = 0,
  quoteController = null,
  quoteTimer = 0,
  linkSequence = 0,
  link = null,
  house = null,
  editId = null,
  expectedRevision = 0;
const params = new URLSearchParams(location.search),
  reduced = matchMedia("(prefers-reduced-motion:reduce)");
$("reduce-motion").checked = reduced.matches;
let specId = crypto.randomUUID();
// A base URL serves the assets; section links must stay on this document.
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.href = location.pathname + location.search + a.getAttribute("href");
});
let roomSequence = 0;
async function showRoom(id) {
  if (!scene) return;
  const request = ++roomSequence;
  $("scene-retry").hidden = true;
  $("scene-status").textContent = "Preparing your room…";
  $("scene-status").hidden = false;
  try {
    const displayed = await scene.setRoom(id);
    if (!displayed || request !== roomSequence) return;
    scene.setLights(lightsByRoom[id]);
    paint();
    $("scene-status").hidden = true;
  } catch {
    if (request !== roomSequence) return;
    report("SCENE");
    $("scene-status").textContent =
      "This room could not load. Retry without losing your selections.";
    $("scene-retry").hidden = false;
  }
}
let selectedPlain = "ivory";
const lightsByRoom = Object.fromEntries(ROOM_IDS.map((id) => [id, false]));
function paintRoomOptions() {
  $("demo-mount").textContent =
    ROOM_DESIGNS[state.room].mount === "CEILING"
      ? "Ceiling-mounted track"
      : "Wall-mounted track";
  $("room-lights").setAttribute(
    "aria-pressed",
    String(lightsByRoom[state.room]),
  );
  $("room-lights").textContent = lightsByRoom[state.room]
    ? "Lights on"
    : "Lights off";
}
function report(stage, requestId = crypto.randomUUID()) {
  const event = { stage, release: config.release, requestId };
  fetch(config.apiBase + "/diagnostic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}
function describe() {
  const r = state.rooms[state.room];
  return r.moving
    ? r.target > r.position
      ? "Opening curtains"
      : "Closing curtains"
    : r.position === 0
      ? "Curtains closed"
      : r.position === 1
        ? "Curtains open"
        : "Stopped partway";
}
function paint() {
  const r = state.rooms[state.room];
  const animate = !$("reduce-motion").checked || !r.moving;
  if (animate) scene?.setPosition(r.position, state.opening);
  if (animate)
    document
      .querySelectorAll(".fallback-cloth")
      .forEach(
        (el) => (el.style.transform = `scaleX(${1 - r.position * 0.81})`),
      );
  $("motion-status").textContent = describe();
  $("phone-state").textContent = describe();
  $("phone-room").textContent = names[state.room];
  $("room-label").textContent = names[state.room];
  $("demo-length").textContent = state.room === "patio" ? "400" : "230";
  $("channel-status").textContent = state.group
    ? "All active channels · five demonstration rooms"
    : state.channel === 6
      ? "Channel 6 · no room assigned"
      : `Channel ${state.channel} · ${names[state.room]}`;
  document
    .querySelectorAll(".remote-leds i")
    .forEach((led, i) =>
      led.classList.toggle("on", state.group || state.channel === i + 1),
    );
  document
    .querySelectorAll("[data-room]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.room === state.room)),
    );
  $("group-control").setAttribute("aria-pressed", String(state.group));
}
function frame(time) {
  const seconds = last ? (time - last) / 1000 : 0;
  last = time;
  state = tick(state, seconds);
  if (time - lastPaint > 32) {
    paint();
    lastPaint = time;
  }
  if (Object.values(state.rooms).some((r) => r.moving))
    raf = requestAnimationFrame(frame);
  else {
    raf = 0;
    last = 0;
    paint();
  }
}
function send(action) {
  try {
    state = command(state, action);
    if (!raf) raf = requestAnimationFrame(frame);
    paint();
  } catch {
    report("CONTROL");
  }
}
document
  .querySelectorAll("[data-action]")
  .forEach((b) => (b.onclick = () => send(b.dataset.action)));
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      state = setView(state, b.dataset.view);
      $("remote-view").hidden = state.view !== "remote";
      $("app-view").hidden = state.view !== "app";
      document
        .querySelectorAll("[data-view]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      paint();
    }),
);
function changeRoom(id) {
  state = selectRoom(state, id);
  showRoom(id);
  paintRoomOptions();
  paint();
}
document
  .querySelectorAll("[data-room]")
  .forEach((b) => (b.onclick = () => changeRoom(b.dataset.room)));
function channel(delta) {
  const n = (state.channel + delta + 7) % 7;
  state = selectChannel(state, n);
  showRoom(state.room);
  paintRoomOptions();
  paint();
}
$("previous-channel").onclick = () => channel(-1);
$("next-channel").onclick = () => channel(1);
$("group-control").onclick = () => {
  state = selectChannel(
    state,
    state.group ? ROOM_IDS.indexOf(state.room) + 1 : 0,
  );
  paint();
};
$("demo-opening").onchange = (e) => {
  state = { ...state, opening: e.target.value };
  $("scene").dataset.opening = e.target.value;
  paint();
};
$("lighting").onclick = () => {
  const value = $("lighting").getAttribute("aria-pressed") !== "true";
  $("lighting").setAttribute("aria-pressed", String(value));
  $("lighting").textContent = value ? "Daylight" : "Evening";
  scene?.setEvening(value);
};
$("room-lights").onclick = () => {
  lightsByRoom[state.room] = !lightsByRoom[state.room];
  scene?.setLights(lightsByRoom[state.room]);
  paintRoomOptions();
};
$("detail").onclick = () => {
  const value = $("detail").getAttribute("aria-pressed") !== "true";
  $("detail").setAttribute("aria-pressed", String(value));
  $("detail").textContent = value ? "Room view" : "Track detail";
  $("motor-note").textContent = value
    ? "Cutaway view. Motor normally concealed behind curtains."
    : "Motor concealed behind curtains.";
  scene?.setDetail(value);
};
// Reduced-motion mode preserves control state and stop/resume; the visual changes only on stop/end.
$("reduce-motion").onchange = paint;
async function loadScene() {
  const generation = ++sceneSequence;
  $("scene-retry").hidden = true;
  $("scene-status").textContent = "Preparing your room…";
  $("scene-status").hidden = false;
  try {
    const { createScene } = await import("./scene.mjs");
    const next = await createScene($("scene"), state.room);
    if (generation !== sceneSequence) {
      next.dispose();
      return;
    }
    scene?.dispose();
    scene = next;
    await showRoom(state.room);
    scene.setHardware($("motor-side").value, $("system").value);
    scene.setEvening($("lighting").getAttribute("aria-pressed") === "true");
    scene.setLights(lightsByRoom[state.room]);
    if (selectedPlain) scene.setPlainColour(selectedPlain);

    scene.setDetail($("detail").getAttribute("aria-pressed") === "true");
    paint();
  } catch {
    report("SCENE");
    $("scene-status").textContent =
      "The room could not load. You can still try the controls and configure your track.";
    $("scene-retry").hidden = false;
  }
}
$("scene-retry").onclick = loadScene;
function paintColours() {
  document
    .querySelectorAll("[data-plain]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.plain === selectedPlain)),
    );
  const color = PLAIN_COLOURS.find((c) => c.id === selectedPlain);
  $("colour-selection").textContent = color?.name ?? "Plain curtain";
  if (color) $("scene").style.setProperty("--plain-cloth", color.hex);
}
for (const color of PLAIN_COLOURS) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.plain = color.id;
  button.setAttribute("aria-label", color.name);
  const chip = document.createElement("span");
  chip.className = "colour-chip";
  chip.style.background = color.hex;
  chip.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = color.name;
  button.append(chip, label);
  button.onclick = () => {
    selectedPlain = color.id;
    scene?.setPlainColour(color.id);
    paintColours();
  };
  $("plain-colours").append(button);
}
paintColours();
paintRoomOptions();
let retainedWeight = null;
let liningPreset = true;
$("lining-gsm").value = config.standardLiningGsm;
$("standard-lining").textContent =
  `Use standard lining: ${config.standardLiningGsm} GSM`;
const weightFields = ["panel-width", "panel-drop", "fullness", "face-gsm"];
function weight() {
  if (retainedWeight) return retainedWeight;
  if (weightFields.some((id) => !$(id).value)) return { mode: "UNKNOWN" };
  return {
    mode: "EXISTING_ESTIMATE",
    panels: 1,
    widthCm: Number($("panel-width").value),
    dropCm: Number($("panel-drop").value),
    widthBasis: "COVERAGE",
    fullness: Number($("fullness").value),
    gsm: Number($("face-gsm").value),
    lining: $("has-lining").checked,
    ...($("has-lining").checked && $("lining-gsm").value
      ? {
          liningGsm: Number($("lining-gsm").value),
          liningGsmSource: liningPreset ? "STANDARD_PRESET" : "CUSTOM",
        }
      : {}),
    interlining: false,
  };
}
[...weightFields, "has-lining", "lining-gsm"].forEach((id) =>
  $(id).addEventListener("input", () => {
    retainedWeight = null;
    $("weight-confirm").checked = false;
    $("saved-weight-note").hidden = true;
  }),
);
$("lining-gsm").addEventListener("input", () => {
  liningPreset = false;
  paintLiningPreset();
});
function paintLiningPreset() {
  $("standard-lining").setAttribute("aria-pressed", String(liningPreset));
  $("lining-preset-note").textContent = liningPreset
    ? `Standard estimate, ${config.standardLiningGsm} g/m². Change this if your lining differs.`
    : "Using your lining weight. Lining uses the same dimensions and gather.";
}
$("standard-lining").onclick = () => {
  retainedWeight = null;
  $("weight-confirm").checked = false;
  $("saved-weight-note").hidden = true;
  liningPreset = true;
  $("lining-gsm").value = config.standardLiningGsm;
  paintLiningPreset();
  scheduleQuote();
};
function spec() {
  return {
    version: 1,
    id: specId,
    productType: "SMART_TRACK",
    system: $("system").value,
    lengthCm: $("length").value,
    shape: "STRAIGHT",
    heading: $("heading").value,
    ...($("heading").value === "WAVE"
      ? { waveSpacingMm: Number($("wave-spacing").value) }
      : {}),
    opening: $("opening").value,
    mounting: $("mounting").value,
    motorSide: $("motor-side").value,
    viewpoint: "INSIDE_FACING_WINDOW",
    quantity: Number($("quantity").value),
    weight: weight(),
    ...($("weight-confirm").checked ? {
      weightConfirmation: { version: 1, system: $("system").value,
        maximumKg: config.maximumLoadKgBySystem[$("system").value] },
    } : {}),
    ...(link
      ? {
          linkedCurtain: {
            configurationId: link.configurationId,
            specificationDigest: link.specificationDigest,
            coverageConfirmed: $("coverage-confirm").checked,
          },
        }
      : {}),
    powerLocationChecked: $("power-confirm").checked,
    measurementsConfirmed: $("measurement-confirm").checked,
  };
}
function updateFields() {
  syncChoiceCards();
  paintLiningPreset();
  $("lining-weight-wrap").hidden = !$("has-lining").checked;
  const ion = $("system").value === "FOREST_SHUTTLE_ION";
  $("weight-check-label").textContent = `I confirm that the total weight of the curtains on each track does not exceed the recommended ${config.maximumLoadKgBySystem[$("system").value]} kg limit.`;
  $("power-check-label").textContent = ion
    ? "I have checked access to remove and charge the battery."
    : "I have checked the mains connection location for the motor.";
  document
    .querySelectorAll("[data-action=FAVOURITE]")
    .forEach((b) => (b.disabled = ion));
  const app = document.querySelector("[data-view=app]");
  app.disabled = ion;
  app.title = ion
    ? "Shuttle iOn does not include built-in Wi-Fi. The app demonstration is for Shuttle Go."
    : "";
  if (ion && state.view === "app")
    document.querySelector("[data-view=remote]").click();
  $("wave-wrap").hidden = $("heading").value !== "WAVE";
  $("coverage-wrap").hidden = !link;
  scene?.setHardware($("motor-side").value, $("system").value);
}
async function api(operation, body, signal) {
  const response = await fetch(config.apiBase + "/" + operation, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    const error = Error(
      data.message || "We could not check this selection. Please try again.",
    );
    error.requestId = data.requestId;
    throw error;
  }
  return data;
}
function showPrice(value) {
  $("product-price").textContent = value;
  $("quick-price").textContent = value;
}
const stepTitles = [
  "Start with the track you need.",
  "Choose how your curtains work.",
  "Check your details, then save to My Home.",
];
let currentStep = 0;
function stepValid() {
  let message = "";
  if (currentStep === 0) {
    const length = $("length").value.trim();
    if (
      !/^\d+(?:\.\d+)?$/.test(length) ||
      Number(length) < config.minimumLengthCm ||
      Number(length) > 500
    )
      message =
        `Enter a finished track length from ${config.minimumLengthCm} to 500 cm.`;
    else if (!Number.isInteger(Number(length)))
      message = "Enter your track length in whole centimetres. Your measurement has not been rounded.";
    else if ($("curtain-source").value === "CURTAINSUK" && !link)
      message = "The linked curtain could not be loaded. Reopen this track from Design My Home.";
  }
  const invalid = [...$("track-form").querySelectorAll("input,select")].find(
    (el) =>
      el.closest("[data-step]")?.dataset.step === String(currentStep) &&
      el.offsetParent !== null &&
      !el.checkValidity(),
  );
  if (!message && invalid) message = invalid.validationMessage;
  $("step-error").textContent = message;
  $("step-error").hidden = !message;
  if (message) {
    $("step-error").scrollIntoView({ block: "nearest" });
    return false;
  }
  return true;
}
function showStep(step, focus = true) {
  if (step > currentStep && !stepValid()) return;
  currentStep = step;
  document.querySelectorAll("[data-step]").forEach((el) => {
    el.hidden = Number(el.dataset.step) !== step;
  });
  document.querySelectorAll("[data-go-step]").forEach((button) => {
    if (Number(button.dataset.goStep) === step)
      button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  $("step-intro").textContent = stepTitles[step];
  $("step-intro").hidden = false;
  $("step-progress").textContent = `Step ${step + 1} of 3`;
  $("step-progress").hidden = false;
  $("step-error").hidden = true;
  $("step-back").hidden = step === 0;
  $("step-next").hidden = step === 2;
  $("step-next").textContent =
    ["Next: curtain details →", "Next: review my track →"][
      step
    ] ?? "";
  if (focus) {
    $("step-intro").focus({ preventScroll: true });
    $("step-intro").scrollIntoView({ block: "nearest" });
  }
}
document.querySelector(".configuration-steps").hidden = false;
document.querySelector(".step-actions").hidden = false;
document.querySelectorAll("[data-go-step]").forEach((button) => {
  button.onclick = () => showStep(Number(button.dataset.goStep));
});
$("step-back").onclick = () => showStep(Math.max(0, currentStep - 1));
$("step-next").onclick = () => showStep(Math.min(2, currentStep + 1));
$("review-step").onclick = () => showStep(2);
$("open-weight-calculator").onclick = () => {
  $("weight-details").open = true;
  $("weight-details").scrollIntoView({ block: "start", behavior: reduced.matches ? "auto" : "smooth" });
  $("panel-width").focus({ preventScroll: true });
};
$("weight-back-to-track").onclick = () => {
  showStep(currentStep);
  $("configure").scrollIntoView({ block: "start" });
};
$("make-curtains").onclick = () => {
  const roomId = $("order-room").value;
  const destination = new URL("/pages/fabric-library?view=browse-fabrics", location.origin);
  if (roomId) {
    Store.intent(roomId);
    destination.searchParams.set("room_id", roomId);
  } else Store.clearIntent();
  $("make-curtains").href = destination.pathname + destination.search;
};
showStep(0, false);

// Compact choice cards keep the underlying select as the specification authority.
const choiceGroups = [];
function choiceCards(id, choices) {
  const select = $(id),
    group = document.createElement("div");
  group.className = "choice-cards";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", select.labels[0].textContent.trim());
  for (const [value, title, description, icon] of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.choice = value;
    button.innerHTML = `${icon ?? ""}<strong>${title}</strong>${description ? `<span>${description}</span>` : ""}`;
    button.onclick = () => {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncChoiceCards();
    };
    group.append(button);
  }
  select.hidden = true;
  select.after(group);
  choiceGroups.push([select, group]);
}
function syncChoiceCards() {
  for (const [select, group] of choiceGroups)
    group
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.choice === select.value),
        ),
      );
}
const ceilingIcon =
  '<svg viewBox="0 0 90 42" aria-hidden="true"><path d="M8 6h74M28 6v8M62 6v8M18 15h54M23 20v18m11-18v18m11-18v18m11-18v18m11-18v18"/></svg>';
const wallIcon =
  '<svg viewBox="0 0 90 42" aria-hidden="true"><path d="M12 3v37M13 13h57M24 15v8M20 23h55M25 26v12m11-12v12m11-12v12m11-12v12m11-12v12"/></svg>';
choiceCards("mounting", [
  ["CEILING", "Ceiling", "Fixed above", ceilingIcon],
  ["WALL", "Wall", "Fixed to the wall", wallIcon],
]);
choiceCards("system", [
  ["FOREST_SHUTTLE_GO", "Plug-in track", "Shuttle Go · up to 35 kg", '<svg viewBox="0 0 90 42" aria-hidden="true"><path d="M37 4v9m16-9v9M31 13h28v7a14 14 0 0 1-28 0ZM45 34v6"/></svg>'],
  ["FOREST_SHUTTLE_ION", "Battery track", "Shuttle iOn · up to 25 kg", '<svg viewBox="0 0 90 42" aria-hidden="true"><rect x="23" y="10" width="44" height="24" rx="4"/><path d="M67 17h5v10h-5M33 17v10m-5-5h10m13 0h7"/></svg>'],
]);
choiceCards("heading", [
  ["PENCIL", "Pencil", ""],
  ["PINCH", "Pinch", ""],
  ["WAVE", "Wave", "10% more"],
]);
syncChoiceCards();
async function refreshQuote() {
  const sequence = ++quoteSequence;
  quoteController?.abort();
  quoteController = new AbortController();
  quote = null;
  $("add-track").disabled = true;
  $("retry-quote").hidden = true;
  $("quote-error").hidden = true;
  showPrice("Checking price…");
  try {
    const data = await api(
      "quote",
      {
        spec: spec(),
        ...(link ? { curtains: Store.curtainReview(house, "") } : {}),
      },
      quoteController.signal,
    );
    if (sequence !== quoteSequence) return;
    quote = data.quote;
    $("summary-title").textContent = quote.package.motor;
    $("included-summary").textContent = quote.package.controller;
    $("power-help").textContent = quote.package.power;
    showPrice(money(quote.goodsMinor));
    $("summary-spec").innerHTML = [
      ["Length", quote.spec.lengthCm + " cm"],
      [
        "Heading",
        labels[quote.spec.heading] +
          (quote.spec.waveSpacingMm
            ? " · " + quote.spec.waveSpacingMm + " mm"
            : ""),
      ],
      [
        "Opening",
        quote.spec.opening === "CENTRE"
          ? labels.CENTRE
          : "One-way, stack " + labels[quote.spec.opening].toLowerCase(),
      ],
      ["Mounting", labels[quote.spec.mounting]],
      ["Motor side", labels[quote.spec.motorSide] + " (facing the window)"],
      ["Quantity", quote.spec.quantity],
    ]
      .map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`)
      .join("");
    const w = quote.weight;
    const incompleteLining = quote.spec.weight.lining && !quote.spec.weight.liningGsm;
    const weightLabel = w.status === "MEASURED"
      ? "Saved measured weight per track"
      : incompleteLining
        ? "Fabric estimate only"
        : "Estimated weight per track";
    const weightDetail = w.status === "UNKNOWN"
      ? "Enter width, height, gather and fabric GSM to see your estimate."
      : w.status === "MEASURED"
        ? w.message
        : quote.spec.weight.mode !== "EXISTING_ESTIMATE"
          ? "Saved cloth estimate. Complete curtain weight remains unconfirmed."
          : incompleteLining
            ? "Add lining GSM to include its weight. This is not the total."
            : quote.spec.weight.lining
              ? quote.spec.weight.liningGsmSource === "STANDARD_PRESET"
                ? "Fabric + standard 200 GSM lining. Actual lining may differ."
                : `Fabric + your ${quote.spec.weight.liningGsm} GSM lining.`
              : "Fabric only, without lining.";
    const total = w.minimumKg === null
      ? "Not calculated"
      : `${new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 3 }).format(w.minimumKg)} kg`;
    renderWeightResult(weightLabel, total, weightDetail, w.minimumKg === null);
    $("review-weight").hidden = w.status === "UNKNOWN";
    $("review-weight").textContent = `${weightLabel}: ${total}. ${w.status === "MEASURED" ? "" : incompleteLining ? "Lining not included. Guide only." : "Guide only, not an exact curtain weight."}`;
    $("order-availability").hidden = quote.purchaseReady;
    $("dispatch").textContent = "Dispatch date to be confirmed.";
    if (quote.dispatchEstimate)
      $("dispatch").textContent = quote.dispatchEstimate.message.replace(
        "cushion",
        "track",
      );
    $("add-track").disabled =
      $("curtain-source").value === "CURTAINSUK" && !link;
  } catch (error) {
    if (error.name === "AbortError" || sequence !== quoteSequence) return;
    report("QUOTE", error.requestId);
    showPrice("Check your details");
    $("quote-error").textContent = error.message;
    $("quote-error").hidden = false;
    renderWeightResult("Estimated weight per track", "Unavailable", "Retry the quote without changing your measurements.", true);
    $("retry-quote").hidden = false;
  }
}
function renderWeightResult(label, total, detail, empty = false) {
  $("weight-result-label").textContent = label;
  $("weight-total").textContent = total;
  $("weight-total").classList.toggle("is-empty", empty);
  $("weight-result-detail").textContent = detail;
}
function scheduleQuote() {
  $("retry-quote").hidden = true;
  renderWeightResult("Estimated weight per track", "Calculating…", "Updating your estimate.", true);
  quoteSequence++;
  quoteController?.abort();
  quote = null;
  $("add-track").disabled = true;
  showPrice("Checking price…");
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(refreshQuote, 300);
  updateFields();
}
$("track-form").oninput = scheduleQuote;
$("track-form").onchange = scheduleQuote;
$("system").addEventListener("change", () => { $("weight-confirm").checked = false; });
$("weight-helper").oninput = scheduleQuote;
$("weight-helper").onchange = scheduleQuote;
$("track-form").onsubmit = (e) => e.preventDefault();
$("retry-quote").onclick = refreshQuote;
function fill(s) {
  specId = s.id;
  for (const [id, key] of [
    ["system", "system"],
    ["length", "lengthCm"],
    ["heading", "heading"],
    ["opening", "opening"],
    ["mounting", "mounting"],
    ["motor-side", "motorSide"],
    ["quantity", "quantity"],
  ])
    $(id).value = s[key];
  if (s.waveSpacingMm) $("wave-spacing").value = s.waveSpacingMm;
  $("power-confirm").checked = s.powerLocationChecked;
  $("measurement-confirm").checked = s.measurementsConfirmed;
  $("weight-confirm").checked = s.weightConfirmation?.system === s.system &&
    s.weightConfirmation.maximumKg === config.maximumLoadKgBySystem[s.system];
  retainedWeight = s.weight.mode === "UNKNOWN" ? null : s.weight;
  liningPreset = s.weight.liningGsmSource === "STANDARD_PRESET";
  $("saved-weight-note").hidden = !retainedWeight;
  if (s.weight.mode === "EXISTING_ESTIMATE") {
    for (const [id, key] of [
      ["panel-drop", "dropCm"],
      ["face-gsm", "gsm"],
      ["lining-gsm", "liningGsm"],
    ])
      if (s.weight[key] !== undefined) $(id).value = s.weight[key];
    $("has-lining").checked = s.weight.lining;
    $("panel-width").value = s.weight.panels * s.weight.widthCm;
    $("fullness").value =
      s.weight.widthBasis === "FLAT" ? 1 : s.weight.fullness;
  }
  if (s.linkedCurtain) {
    link = s.linkedCurtain;
    $("curtain-source").value = "CURTAINSUK";
    $("linked-curtain").value = link.configurationId;
    $("coverage-confirm").checked = link.coverageConfirmed;
  }
}
async function chooseLinked(id) {
  const sequence = ++linkSequence;
  $("weight-confirm").checked = false;
  link = null;
  scheduleQuote();
  $("coverage-confirm").checked = false;
  if (!id) {
    scheduleQuote();
    return;
  }
  try {
    const data = await api("linked", {
      configurationId: id,
      curtains: Store.curtainReview(house, ""),
    });
    if (sequence !== linkSequence || $("curtain-source").value !== "CURTAINSUK")
      return;
    link = data.link;
    if (["PENCIL", "PINCH", "WAVE"].includes(link.heading))
      $("heading").value = link.heading;
    if (["CENTRE", "LEFT", "RIGHT"].includes(link.opening))
      $("opening").value = link.opening;
    if (link.measurementBasis === "TRACK_WIDTH")
      $("length").value = String(link.coverageCm);
    $("linked-info").textContent =
      `Curtain coverage ${link.coverageCm} cm (${link.measurementBasis.replaceAll("_", " ").toLowerCase()}). Review the exact required track length. ${link.heading === "INCOMPATIBLE" ? "This curtain heading is incompatible with the track." : ""}`;
    if (!$("panel-width").value) $("panel-width").value = link.coverageCm;
    scheduleQuote();
  } catch (error) {
    if (sequence !== linkSequence) return;
    $("linked-info").textContent = error.message;
    report("COMPATIBILITY");
    scheduleQuote();
  }
}
$("linked-curtain").onchange = (e) => chooseLinked(e.target.value);
$("curtain-source").onchange = () => {
  if ($("curtain-source").value === "EXISTING") {
    linkSequence++;
    link = null;
    $("linked-info").textContent = "";
    if (retainedWeight?.mode === "CURTAINSUK") retainedWeight = null;
  }
  scheduleQuote();
};
$("add-track").onclick = async () => {
  if (!quote) return;
  const current = quote;
  try {
    $("add-track").disabled = true;
    const result = await Store.addSmartTrack(current.spec, {
      editItemId: editId,
      expectedRevision,
      roomId: $("order-room").value || null,
    });
    house = result.house;
    expectedRevision = house.revision;
    editId = result.itemId;
    specId = editId;
    $("save-status").textContent =
      "Saved to Design My Home. Your other products are unchanged.";
    $("add-track").textContent = "Update track in my order ↗";
  } catch (error) {
    $("save-status").textContent = error.message;
    report("SAVE");
  } finally {
    $("add-track").disabled = false;
  }
};
try {
  house = Store.ensure();
  expectedRevision = house.revision;
  for (const room of house.rooms.filter((r) => !r.unassigned))
    $("order-room").add(new Option(room.room_name, room.room_id));
  for (const item of Store.orderItems(house).filter(
    (i) => i.type === "CURTAIN",
  ))
    $("linked-curtain").add(
      new Option(
        `${item.roomName || "My order"} · ${item.curtain.window_name}`,
        item.curtain.configuration_id,
      ),
    );
  if (params.get("room_id")) $("order-room").value = params.get("room_id");
  const existing =
    params.get("order_item") &&
    Store.orderItem(house, params.get("order_item"));
  if (existing?.type === "SMART_TRACK") {
    editId = existing.id;
    fill({ ...existing.spec, id: existing.id, quantity: existing.quantity });
    $("order-room").value = existing.roomId || "";
    $("add-track").textContent = "Update track in my order ↗";
  }
  if (params.get("linked_curtain")) {
    $("curtain-source").value = "CURTAINSUK";
    $("linked-curtain").value = params.get("linked_curtain");
    chooseLinked(params.get("linked_curtain"));
  }
} catch (error) {
  $("save-status").textContent = error.message;
}
window.addEventListener("storage", (e) => {
  if (e.key === Store.KEY) {
    try {
      house = Store.ensure();
      if (link) scheduleQuote();
      $("save-status").textContent =
        "Design My Home changed in another tab. Reopen this item before saving.";
    } catch {
      report("SAVE");
    }
  }
});
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(raf);
  quoteController?.abort();
  scene?.dispose();
});
document.querySelectorAll('a[href^="#"]').forEach(
  (a) =>
    (a.onclick = (e) => {
      e.preventDefault();
      document
        .querySelector(a.getAttribute("href"))
        ?.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth" });
    }),
);
// The theme owns the single page scroll. Its viewport message keeps the preview
// pinned inside an auto-height iframe without introducing a nested scroll area.
let embeddedViewport = null, sentHeight = 0;
const workspace = document.querySelector(".studio-workspace");
const desktopPreview = document.querySelector(".experience-sticky");
const mobilePreview = document.querySelector(".experience-grid");
function positionEmbeddedPreview() {
  if (!embeddedViewport) return;
  const desktop = matchMedia("(min-width:1100px)").matches;
  const target = desktop ? desktopPreview : mobilePreview;
  const inactive = desktop ? mobilePreview : desktopPreview;
  inactive.style.removeProperty("--preview-shift");
  const shift = parseFloat(target.style.getPropertyValue("--preview-shift")) || 0;
  const naturalTop = target.getBoundingClientRect().top - shift;
  const boundary = Math.max(0, workspace.getBoundingClientRect().bottom - naturalTop - target.offsetHeight);
  target.style.setProperty("--preview-shift", `${Math.max(0, Math.min(boundary, embeddedViewport.offset - naturalTop))}px`);
}
window.addEventListener("message", (event) => {
  if (parent === window || event.source !== parent || event.origin !== location.origin ||
      event.data?.type !== "curtainsuk-smart-track-viewport" ||
      !Number.isFinite(event.data.offset) || !Number.isFinite(event.data.availableHeight)) return;
  embeddedViewport = event.data;
  document.documentElement.classList.add("embedded-studio");
  document.documentElement.style.setProperty("--studio-viewport-height", `${Math.max(300, Math.min(2000, event.data.availableHeight))}px`);
  positionEmbeddedPreview();
});
const sendHeight = () => {
  positionEmbeddedPreview();
  const height = Math.ceil(document.body.getBoundingClientRect().height);
  if (height === sentHeight) return;
  sentHeight = height;
  if (parent !== window)
    parent.postMessage(
      {
        type: "curtainsuk-smart-track-height",
        height,
      },
      location.origin,
    );
};
new ResizeObserver(sendHeight).observe(document.body);
updateFields();
paint();
refreshQuote();
loadScene();
