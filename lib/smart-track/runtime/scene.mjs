import { ROOM_DESIGNS, PLAIN_COLOURS } from "./room-design.mjs";
// The approved Curtain Style wave form is tinted only inside its alpha.
export async function createScene(host, initialRoom = "living") {
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Luxury room with interactive curtains");
  const rooms = new Map(),
    lights = Object.fromEntries(
      Object.keys(ROOM_DESIGNS).map((id) => [id, false]),
    );
  let roomId = initialRoom,
    background = null,
    position = 0,
    opening = "CENTRE",
    evening = false,
    detail = false,
    colour = "ivory",
    motorSide = "RIGHT",
    system = "FOREST_SHUTTLE_GO",
    generation = 0,
    disposed = false;
  const load = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(Error("ROOM_IMAGE_UNAVAILABLE"));
      img.src = new URL(src, import.meta.url).href;
    });
  const roomImage = (id) => {
    if (!rooms.has(id))
      rooms.set(
        id,
        load(`room-${id}.webp`).catch((error) => {
          rooms.delete(id);
          throw error;
        }),
      );
    return rooms.get(id);
  };
  const [cloth, firstRoom] = await Promise.all([
    load("curtain-wave.webp"),
    roomImage(roomId),
  ]);
  background = firstRoom;
  const source = document.createElement("canvas");
  source.width = cloth.naturalWidth;
  source.height = cloth.naturalHeight;
  const sc = source.getContext("2d");
  sc.drawImage(cloth, 0, 0);
  const pixels = sc.getImageData(0, 0, source.width, source.height).data;
  let left = source.width,
    top = source.height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < source.height; y++)
    for (let x = 0; x < source.width; x++)
      if (pixels[(y * source.width + x) * 4 + 3] > 40) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right <= left || bottom <= top) throw Error("CURTAIN_IMAGE_INVALID");
  const crop = [left, top, right - left + 1, bottom - top + 1],
    coloured = document.createElement("canvas");
  coloured.width = crop[2];
  coloured.height = crop[3];
  const cc = coloured.getContext("2d");
  function tint() {
    cc.clearRect(0, 0, coloured.width, coloured.height);
    cc.globalCompositeOperation = "source-over";
    cc.filter = "grayscale(1) brightness(1.15)";
    cc.drawImage(cloth, ...crop, 0, 0, coloured.width, coloured.height);
    cc.filter = "none";
    cc.globalCompositeOperation = "multiply";
    cc.fillStyle = PLAIN_COLOURS.find((c) => c.id === colour).hex;
    cc.fillRect(0, 0, coloured.width, coloured.height);
    cc.globalCompositeOperation = "destination-in";
    cc.drawImage(cloth, ...crop, 0, 0, coloured.width, coloured.height);
    cc.globalCompositeOperation = "source-over";
  }
  function glow(x, y, r, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,204,128,${alpha})`);
    g.addColorStop(0.12, `rgba(255,196,112,${alpha * 0.36})`);
    g.addColorStop(1, "rgba(255,190,100,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function panel(x, y, w, h, mirror = false) {
    ctx.save();
    if (mirror) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      x = 0;
      y = 0;
    }
    ctx.shadowColor = "rgba(24,20,14,.24)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = mirror ? -5 : 5;
    ctx.drawImage(coloured, x, y, w, h);
    ctx.restore();
  }
  function round(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function cutaway(w, h) {
    ctx.fillStyle = "#e8e4da";
    ctx.fillRect(0, 0, w, h);
    const scale = Math.min(w / 760, h / 470);
    ctx.save();
    ctx.translate((w - 760 * scale) / 2, (h - 470 * scale) / 2);
    ctx.scale(scale, scale);
    const mount = ROOM_DESIGNS[roomId].mount;
    ctx.fillStyle = "#c6c1b6";
    ctx.fillRect(0, 35, 760, 9);
    ctx.fillStyle = "#f6f4ed";
    ctx.fillRect(0, 44, 760, 48);
    round(125, 112, 480, 15, 4, "#b8b9b2");
    round(125, 109, 480, 12, 4, "#f8f8f2");
    for (const x of [175, 365, 555]) {
      round(x, 100, 32, 10, 2, "#aeb1a8");
      if (mount === "CEILING") round(x + 11, 89, 10, 14, 2, "#f7f5ef");
      else {
        round(x, 92, 12, 20, 2, "#f7f5ef");
        round(x - 12, 81, 24, 13, 2, "#c3c5bc");
      }
    }
    const mx = motorSide === "LEFT" ? 145 : 555,
      ion = system === "FOREST_SHUTTLE_ION",
      gradient = ctx.createLinearGradient(mx, 0, mx + 40, 0);
    gradient.addColorStop(0, "#c6c8c3");
    gradient.addColorStop(0.35, "#fafaf4");
    gradient.addColorStop(1, "#d4d5cf");
    round(mx, 122, 40, ion ? 168 : 153, 9, gradient);
    round(mx + 12, 133, 16, 7, 2, "#b7bdb3");
    if (ion) round(mx + 7, 214, 26, 64, 5, "#d1d4cc");
    else {
      ctx.strokeStyle = "#a8ab9e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx + 20, 276);
      ctx.lineTo(mx + 20, 338);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.43;
    panel(230, 127, 280, 270);
    ctx.restore();
    ctx.fillStyle = "#34483d";
    ctx.font = "15px Arial";
    ctx.fillText(
      mount === "CEILING" ? "Ceiling fixing" : "Wall fixing",
      75,
      68,
    );
    ctx.fillText(
      ion ? "Shuttle iOn battery motor" : "Shuttle Go motor",
      motorSide === "LEFT" ? 55 : 450,
      364,
    );
    ctx.font = "13px Arial";
    ctx.fillText(
      "Motor shown through the curtain for explanation only.",
      190,
      410,
    );
    ctx.fillText(
      "Normally concealed behind the fabric. Illustrative arrangement.",
      157,
      434,
    );
    ctx.restore();
  }
  function render() {
    if (disposed || !background) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.6),
      w = canvas.width / ratio,
      h = canvas.height / ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (detail) {
      cutaway(w, h);
      return;
    }
    const scale = Math.max(
        w / background.naturalWidth,
        h / background.naturalHeight,
      ),
      iw = background.naturalWidth * scale,
      ih = background.naturalHeight * scale,
      ox = (w - iw) / 2,
      oy = 0,
      on = lights[roomId];
    ctx.save();
    ctx.filter = evening
      ? `brightness(${on ? 0.66 : 0.43}) saturate(.8)`
      : "none";
    ctx.drawImage(background, ox, oy, iw, ih);
    ctx.restore();
    const [a, b, t, f] = ROOM_DESIGNS[roomId].rail,
      x = ox + a * iw,
      y = oy + t * ih,
      span = (b - a) * iw,
      drop = (f - t) * ih,
      gathered = 1 - position * 0.78;
    ctx.save();
    ctx.filter = evening ? `brightness(${on ? 0.78 : 0.45})` : "none";
    if (opening === "CENTRE") {
      const width = (span / 2) * gathered;
      panel(x, y, width, drop);
      panel(x + span - width, y, width, drop, true);
    } else {
      const width = span * gathered,
        start = opening === "LEFT" ? x : x + span - width;
      panel(start, y, width / 2, drop);
      panel(start + width / 2, y, width / 2, drop, true);
    }
    ctx.restore();
    if (on) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const [lx, ly] of ROOM_DESIGNS[roomId].lamps) {
        glow(ox + lx * iw, oy + ly * ih, iw * 0.22, evening ? 0.38 : 0.18);
        glow(ox + lx * iw, oy + ly * ih, iw * 0.023, 0.8);
      }
      ctx.restore();
    }
  }
  function resize() {
    const r = host.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(r.width * ratio);
    canvas.height = Math.round(r.height * ratio);
    render();
  }
  tint();
  host.append(canvas);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    async setRoom(id) {
      const request = ++generation;
      canvas.style.visibility = "hidden";
      try {
        const next = await roomImage(id);
        if (disposed || request !== generation) return false;
        roomId = id;
        background = next;
        canvas.style.visibility = "visible";
        render();
        return true;
      } catch (error) {
        if (request === generation) canvas.style.visibility = "hidden";
        throw error;
      }
    },
    setPosition(p, mode) {
      if (p === position && mode === opening) return;
      position = p;
      opening = mode;
      render();
    },
    setPlainColour(id) {
      if (!PLAIN_COLOURS.some((c) => c.id === id)) return;
      colour = id;
      tint();
      render();
    },
    setHardware(side, motor) {
      motorSide = side;
      system = motor;
      if (detail) render();
    },
    setEvening(value) {
      evening = value;
      render();
    },
    setLights(value) {
      lights[roomId] = value;
      render();
    },
    setDetail(value) {
      detail = value;
      render();
    },
    dispose() {
      disposed = true;
      generation++;
      observer.disconnect();
      canvas.remove();
      rooms.clear();
    },
  };
}
