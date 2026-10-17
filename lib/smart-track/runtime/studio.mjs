import {
  createDemoState,
  command,
  tick,
  selectRoom,
  selectChannel,
  setView,
  ROOM_IDS,
} from "./state.mjs";
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
let state = createDemoState(),
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
  if (scene?.setRoom(id) === false)
    $("fabric-status").textContent =
      "Neutral cloth is shown in this larger room. The selected artwork is not approved for this cloth width; its pattern has not been stretched.";
  paint();
}
document
  .querySelectorAll("[data-room]")
  .forEach((b) => (b.onclick = () => changeRoom(b.dataset.room)));
function channel(delta) {
  const n = (state.channel + delta + 7) % 7;
  state = selectChannel(state, n);
  if (scene?.setRoom(state.room) === false)
    $("fabric-status").textContent =
      "Neutral cloth is shown in this larger room. Choose another supported fabric.";
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
$("detail").onclick = () => {
  const value = $("detail").getAttribute("aria-pressed") !== "true";
  $("detail").setAttribute("aria-pressed", String(value));
  $("detail").textContent = value ? "Room view" : "Track detail";
  scene?.setDetail(value);
};
// Reduced-motion mode preserves control state and stop/resume; the visual changes only on stop/end.
$("reduce-motion").onchange = paint;
async function loadScene() {
  const generation = ++sceneSequence;
  $("scene-retry").hidden = true;
  $("scene-status").hidden = false;
  try {
    const { createScene } = await import("./scene.mjs");
    const next = await createScene($("scene"), config);
    if (generation !== sceneSequence) {
      next.dispose();
      return;
    }
    scene?.dispose();
    scene = next;
    scene.setRoom(state.room);
    scene.setHardware(
      $("motor-side").value,
      $("mounting").value,
      $("system").value,
    );
    scene.setEvening($("lighting").getAttribute("aria-pressed") === "true");
    scene.setDetail($("detail").getAttribute("aria-pressed") === "true");
    paint();
    $("scene-status").hidden = true;
  } catch {
    report("SCENE");
    $("scene-status").textContent =
      "The 3D room could not load. You can still try the controls and configure your track.";
    $("scene-retry").hidden = false;
  }
}
$("scene-retry").onclick = loadScene;
let fabricSerial = 0;
async function fabrics() {
  const generation = ++fabricSerial;
  $("fabric-status").textContent = "Searching the shared catalogue…";
  try {
    const url =
      config.catalogueUrl +
      "?" +
      new URLSearchParams({
        view: "retail",
        visualiser: "1",
        query: $("fabric-search").value,
        limit: "8",
      });
    const response = await fetch(url);
    if (!response.ok) throw Error();
    const data = await response.json();
    if (generation !== fabricSerial) return;
    const records = data.fabrics ?? data.items ?? [];
    $("fabric-results").replaceChildren();
    for (const record of records.slice(0, 8)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = [record.design, record.colour]
        .filter(Boolean)
        .join(" · ");
      button.onclick = async () => {
        const selected = ++fabricSerial;
        $("fabric-status").textContent =
          "Loading this fabric at its approved scale…";
        try {
          let full = record;
          if (!record.roomPreview) {
            const r = await fetch(
              config.catalogueUrl +
                "?" +
                new URLSearchParams({
                  view: "retail",
                  visualiser: "1",
                  fabric: record.id,
                }),
            );
            if (!r.ok) throw Error();
            full = (await r.json()).fabric;
          }
          const applied = await scene?.setFabric(full);
          if (selected === fabricSerial)
            $("fabric-status").textContent = applied
              ? `${record.design} · ${record.colour}. Demonstration only; no curtains added.`
              : "This fabric is not supported by this room geometry. Neutral cloth is shown; no pattern scale has been guessed.";
        } catch {
          report("ASSET");
          $("fabric-status").textContent =
            "Fabric preview could not load. Try this fabric again; your track is unchanged.";
        }
      };
      $("fabric-results").append(button);
    }
    $("fabric-status").textContent = records.length
      ? "Choose a fabric for the demonstration. No curtains will be added."
      : "No fabrics found. Try another search.";
  } catch {
    report("CATALOGUE");
    $("fabric-status").textContent =
      "The catalogue could not load. Use Find to retry; configuration remains available.";
  }
}
$("fabric-find").onclick = fabrics;
$("fabric-search").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    fabrics();
  }
};
function weight() {
  const mode = $("weight-mode").value;
  if (mode === "MEASURED") return { mode, kg: Number($("weight-kg").value) };
  if (mode === "CURTAINSUK")
    return { mode, configurationId: link?.configurationId ?? "" };
  if (mode === "EXISTING_ESTIMATE")
    return {
      mode,
      panels: Number($("panel-count").value),
      dropCm: Number($("panel-drop").value),
      widthCm: Number($("panel-width").value),
      widthBasis: $("width-basis").value,
      fullness: Number($("fullness").value),
      ...($("face-gsm").value ? { gsm: Number($("face-gsm").value) } : {}),
      ...($("lining-gsm").value
        ? { liningGsm: Number($("lining-gsm").value) }
        : {}),
      ...($("interlining-gsm").value
        ? { interliningGsm: Number($("interlining-gsm").value) }
        : {}),
      lining: $("has-lining").checked,
      interlining: $("has-interlining").checked,
    };
  return { mode: "UNKNOWN" };
}
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
  const ion = $("system").value === "FOREST_SHUTTLE_ION";
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
  const mode = $("weight-mode").value;
  $("known-weight").hidden = mode !== "MEASURED";
  $("estimate-weight").hidden = mode !== "EXISTING_ESTIMATE";
  $("fullness-wrap").hidden = $("width-basis").value !== "COVERAGE";
  $("wave-wrap").hidden = $("heading").value !== "WAVE";
  $("linked-wrap").hidden = $("curtain-source").value !== "CURTAINSUK";
  $("coverage-wrap").hidden = !link;
  scene?.setHardware(
    $("motor-side").value,
    $("mounting").value,
    $("system").value,
  );
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
async function refreshQuote() {
  const sequence = ++quoteSequence;
  quoteController?.abort();
  quoteController = new AbortController();
  quote = null;
  $("add-track").disabled = true;
  $("retry-quote").hidden = true;
  $("product-price").textContent = "Checking price…";
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
    $("power-help").textContent =
      quote.package.power + " Both power options have the same price.";
    $("product-price").textContent = money(quote.goodsMinor);
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
    const w = quote.weight,
      amount =
        w.minimumKg === null
          ? "Total unknown"
          : w.maximumKg === null
            ? `Known-cloth estimate: ${w.minimumKg} kg; total unconfirmed`
            : `${w.minimumKg} kg per track`;
    $("weight-result").textContent =
      `${w.status === "MEASURED" ? "Measured" : w.status === "ESTIMATED" ? "Estimated" : "Weight not yet known"}: ${amount}. ${w.message} ${w.assumptions.join(" ")}`;
    $("quote-issues").innerHTML = quote.issues.length
      ? `<details><summary>Before this track can be ordered</summary><ul>${quote.issues.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p>You can save this configuration to Design My Home while these details are confirmed.</p></details>`
      : "";
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
    $("product-price").textContent = "Check your details";
    $("quote-issues").textContent = error.message;
    $("retry-quote").hidden = false;
  }
}
function scheduleQuote() {
  $("quote-issues").textContent = "";
  $("retry-quote").hidden = true;
  $("weight-result").textContent = "Updating weight check…";
  quoteSequence++;
  quoteController?.abort();
  quote = null;
  $("add-track").disabled = true;
  $("product-price").textContent = "Checking price…";
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(refreshQuote, 300);
  updateFields();
}
$("track-form").oninput = scheduleQuote;
$("track-form").onchange = scheduleQuote;
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
  $("weight-mode").value = s.weight.mode;
  if (s.weight.mode === "MEASURED") $("weight-kg").value = s.weight.kg;
  if (s.weight.mode === "EXISTING_ESTIMATE") {
    for (const [id, key] of [
      ["panel-count", "panels"],
      ["panel-drop", "dropCm"],
      ["panel-width", "widthCm"],
      ["width-basis", "widthBasis"],
      ["fullness", "fullness"],
      ["face-gsm", "gsm"],
      ["lining-gsm", "liningGsm"],
      ["interlining-gsm", "interliningGsm"],
    ])
      if (s.weight[key] !== undefined) $(id).value = s.weight[key];
    $("has-lining").checked = s.weight.lining;
    $("has-interlining").checked = s.weight.interlining;
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
    $("weight-mode").value = "CURTAINSUK";
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
    if ($("weight-mode").value === "CURTAINSUK")
      $("weight-mode").value = "UNKNOWN";
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
    $("add-track").textContent = "Update in Design My Home ↗";
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
    $("add-track").textContent = "Update in Design My Home ↗";
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
const sendHeight = () => {
  if (parent !== window)
    parent.postMessage(
      {
        type: "curtainsuk-smart-track-height",
        height: Math.ceil(document.documentElement.scrollHeight),
      },
      location.origin,
    );
};
new ResizeObserver(sendHeight).observe(document.body);
updateFields();
paint();
refreshQuote();
loadScene();
fabrics();
