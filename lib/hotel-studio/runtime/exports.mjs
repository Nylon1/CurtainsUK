import {
  ITEMS,
  roomAtmosphere,
  SURFACES,
  surfaceLabel,
  ARTWORK,
  WALL_RELIEFS,
  CEILING_DESIGNS,
  SCENES,
  escape,
  unresolved,
  layoutWarnings,
} from "./model.mjs";

export function download(data, name, type = "text/plain;charset=utf-8") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const filename = (project) =>
  (project.name || "hotel-project")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .slice(0, 80)
    .toLowerCase();
const cell = (v) => {
  let s = String(v ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
const csv = (rows) =>
  "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
export function roomsCsv(project) {
  return csv([
    [
      "Project",
      "Room type",
      "Quantity",
      "Selected scheme",
      "Scene",
      "Walls colour concept",
      "Ceiling colour concept",
      "Floor colour concept",
      "Bedside lamps (preview)",
      "Ceiling lights (preview)",
      "Wall pictures",
      "Wall relief concept",
      "Ceiling design concept",
      "Window count",
      "Sample status (manual)",
      "Approval status (manual)",
      "Installation phase (planning only)",
      "Notes",
      "Individual room measurements & notes",
    ],
    ...project.rooms.map((r) => {
      const s = r.schemes.find((s) => s.id === r.schemeId);
      return [
        project.name,
        r.name,
        r.quantity,
        s.name,
        SCENES[s.scene].name,
        ...Object.keys(SURFACES).map((key) =>
          surfaceLabel(key, s.surfaces[key]),
        ),
        s.lighting.bedside ? "On" : "Off",
        s.lighting.ceiling ? "On" : "Off",
        ARTWORK[s.artwork],
        WALL_RELIEFS[s.wallRelief],
        CEILING_DESIGNS[s.ceilingDesign],
        r.windowCount,
        r.sampleStatus,
        r.approvalStatus,
        r.phase,
        r.notes,
        r.exceptions.map((e) => `${e.number}: ${e.notes}`).join(" | "),
      ];
    }),
  ]);
}
export function windowsCsv(project) {
  const rows = [
    [
      "Project",
      "Room type",
      "Group quantity",
      "Individual room",
      "Window",
      "Width cm",
      "Drop cm",
      "User confirmation",
      "Scope",
      "Scheme",
      "Notes",
    ],
  ];
  for (const r of project.rooms) {
    const scheme = r.schemes.find((s) => s.id === r.schemeId).name;
    for (const w of r.windows)
      rows.push([
        project.name,
        r.name,
        r.quantity,
        "",
        w.name,
        w.width,
        w.drop,
        w.confirmed ? "Confirmed by user" : "Unconfirmed",
        "Room-type planning reference only; verify each room",
        scheme,
        w.notes,
      ]);
    for (const e of r.exceptions)
      rows.push([
        project.name,
        r.name,
        r.quantity,
        e.number,
        e.windowName,
        e.width,
        e.drop,
        e.confirmed ? "Confirmed by user" : "Unconfirmed",
        "Individual room measurement",
        r.schemes.find((s) => s.id === (e.schemeId || r.schemeId))?.name ??
          scheme,
        e.notes,
      ]);
  }
  return csv(rows);
}
export function enquiryText(project, kind = "quotation") {
  const lines = [
    `CurtainsUK hotel ${kind === "samples" ? "sample request" : "quotation enquiry"} - PREPARED DRAFT`,
    project.name,
    `Prepared ${new Date().toLocaleDateString("en-GB")}`,
    "This draft has not been submitted. No samples have been ordered or installation booked.",
    "",
    `Contact: ${project.contact.name}`,
    `Email: ${project.contact.email}`,
    `Hotel: ${project.contact.hotel}`,
    `Location: ${project.contact.location}`,
    "",
  ];
  for (const r of project.rooms) {
    const s = r.schemes.find((s) => s.id === r.schemeId);
    lines.push(
      `${r.quantity} x ${r.name} | ${s.name} | ${SCENES[s.scene].name}`,
      `Window count per room: ${r.windowCount}; verify measurements for each room.`,
      `Samples: ${r.sampleStatus} (manual); approval: ${r.approvalStatus} (manual)`,
      `Planned phase: ${r.phase}`,
      ...roomAtmosphere(s),
    );
    for (const [k, v] of Object.entries(s.items))
      lines.push(
        `${ITEMS[k]}: ${v.fabric ? `${v.fabric.brand} / ${v.fabric.design} / ${v.fabric.colour} / ${v.fabric.reference} / ID ${v.fabric.id}; suitability for ${ITEMS[k].toLowerCase()} to review` : `Colour concept ${v.colour}; fabric to select`}`,
      );
    for (const w of r.windows)
      lines.push(
        `${w.name}: ${w.width ?? "not entered"} cm width x ${w.drop ?? "not entered"} cm drop; ${w.confirmed ? "user confirmed" : "unconfirmed"}. ${w.notes}`,
      );
    for (const e of r.exceptions)
      lines.push(
        `Room ${e.number}, ${e.windowName || "window not specified"}: ${e.width ?? "not entered"} x ${e.drop ?? "not entered"} cm; ${e.confirmed ? "user confirmed" : "unconfirmed"}; scheme ${r.schemes.find((s) => s.id === (e.schemeId || r.schemeId))?.name}. ${e.notes}`,
      );
    lines.push(`Notes: ${r.notes}`, "");
  }
  lines.push(
    `Project notes: ${project.notes}`,
    "",
    "Decisions to review:",
    ...unresolved(project).map((t) => `- ${t}`),
    "",
    "Please attach the project PDF and window schedule when sending this draft.",
  );
  return lines.join("\n");
}

export function layoutSvg(
  layout,
  { selected = null, interactive = false } = {},
) {
  const margin = 65,
    w = layout.width,
    h = layout.length;
  const pieces = layout.items
    .map((i) => {
      const isBed = ["double", "twin"].includes(i.kind),
        isSelected = i.id === selected;
      return `<g ${interactive ? `data-piece="${escape(i.id)}" tabindex="0" role="button" aria-label="Select ${escape(i.label)}"` : ""} transform="translate(${i.x + i.width / 2} ${i.y + i.depth / 2}) rotate(${i.angle})" class="plan-piece ${isSelected ? "selected" : ""}"><rect x="${-i.width / 2}" y="${-i.depth / 2}" width="${i.width}" height="${i.depth}" rx="${isBed ? 5 : 8}" fill="${isSelected ? "#ccb793" : isBed ? "#e9dfce" : "#d7ddce"}" stroke="${isSelected ? "#785630" : "#576653"}" stroke-width="${isSelected ? 3 : 1.6}"/>${isBed ? `<rect x="${-i.width / 2 + 4}" y="${-i.depth / 2 + 4}" width="${i.width - 8}" height="${i.depth * 0.2}" rx="5" fill="#fffdf6" stroke="#b7ab94"/><path d="M${-i.width / 2},${i.depth * 0.15}h${i.width}" stroke="#b7ab94"/>` : ""}<text text-anchor="middle" y="${isBed ? 12 : 3}" font-size="${Math.min(12, i.width / 8)}" fill="#27352a" font-family="Arial,sans-serif" pointer-events="none">${escape(i.label)}</text><text text-anchor="middle" y="${isBed ? 27 : 16}" font-size="9" fill="#52604e" font-family="Arial,sans-serif" pointer-events="none">${i.width} × ${i.depth}</text></g>`;
    })
    .join("");
  const openings = layout.openings
    .map((o) => {
      const vertical = ["east", "west"].includes(o.wall),
        x = o.wall === "east" ? w : o.wall === "west" ? 0 : o.offset,
        y = o.wall === "south" ? h : o.wall === "north" ? 0 : o.offset;
      const dx = vertical ? 0 : o.width,
        dy = vertical ? o.width : 0;
      const swing =
        o.kind === "door"
          ? vertical
            ? `<path d="M${x},${y + o.width} A${o.width},${o.width} 0 0 ${o.wall === "east" ? 1 : 0} ${x + (o.wall === "east" ? -o.width : o.width)},${y} L${x},${y}" fill="none" stroke="#8f7654" stroke-width="1.4" stroke-dasharray="5 3"/>`
            : `<path d="M${x + o.width},${y} A${o.width},${o.width} 0 0 ${o.wall === "north" ? 1 : 0} ${x},${y + (o.wall === "north" ? o.width : -o.width)} L${x},${y}" fill="none" stroke="#8f7654" stroke-width="1.4" stroke-dasharray="5 3"/>`
          : "";
      return `<g><path d="M${x} ${y}l${dx} ${dy}" stroke="#f8f6ef" stroke-width="10"/><path d="M${x} ${y}l${dx} ${dy}" stroke="${o.kind === "window" ? "#749ca7" : "#c2aa86"}" stroke-width="${o.kind === "window" ? 5 : 2}"/>${swing}<text x="${x + dx / 2 + (o.wall === "west" ? -13 : o.wall === "east" ? 13 : 0)}" y="${y + dy / 2 + (o.wall === "north" ? -14 : o.wall === "south" ? 22 : 0)}" text-anchor="middle" font-size="10" fill="#536352" transform="${vertical ? `rotate(-90 ${x + (o.wall === "west" ? -13 : 13)} ${y + dy / 2})` : ""}">${o.kind === "window" ? "Window" : "Door"} ${o.width} cm</text></g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${w + margin * 2} ${h + margin * 2}" class="room-plan" aria-label="Room layout in centimetres" style="background:#f8f6ef"><defs><pattern id="plan-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#e7e2d7" stroke-width=".7"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#plan-grid)" stroke="#4a5549" stroke-width="6"/>${pieces}${openings}<g fill="#475544" font-family="Arial,sans-serif" font-size="13"><text x="${w / 2}" y="-43" text-anchor="middle">${w} cm</text><text x="-46" y="${h / 2}" text-anchor="middle" transform="rotate(-90 -46 ${h / 2})">${h} cm</text><text x="${w / 2}" y="${h + 49}" text-anchor="middle">${layout.confirmed ? "User-confirmed dimensions" : "Example dimensions · confirmation needed"}</text></g></svg>`;
}
async function svgPng(svg) {
  const image = new Image(),
    url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = Math.round((1100 * image.height) / image.width);
    const c = canvas.getContext("2d");
    c.fillStyle = "#f8f6ef";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function exportPlan(layout, name) {
  download(layoutSvg(layout), `${name}-layout.svg`, "image/svg+xml");
}
let pdfLoading;
function loadScript(name, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(name, window.HOTEL_STUDIO_CONFIG.assetBase).href;
    script.onload = () => resolve(window[globalName]);
    script.onerror = () => {
      script.remove();
      reject(
        Error(
          "PDF tools could not load. Please retry. Your project is still saved.",
        ),
      );
    };
    document.head.append(script);
  });
}
function pdfLib() {
  pdfLoading ??= Promise.all([
    loadScript("pdf-lib.min.js", "PDFLib"),
    loadScript("fontkit.min.js", "fontkit"),
  ])
    .then(([lib]) => lib)
    .catch((error) => {
      pdfLoading = null;
      throw error;
    });
  return pdfLoading;
}
// Shareable briefs exclude retired pricing fields, including their JSON attachment.
// Full browser backups still retain legacy data for recovery.
export function projectBriefData(project) {
  const copy = structuredClone(project);
  delete copy.vatBasis;
  for (const room of copy.rooms) delete room.budget;
  return copy;
}
export async function createBrief(
  project,
  { capture, onProgress = () => {} } = {},
) {
  project = projectBriefData(project);
  const { PDFDocument, rgb } = await pdfLib(),
    pdf = await PDFDocument.create();
  pdf.registerFontkit(window.fontkit);
  const fontData = await Promise.all(
    ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(async (name) => {
      const r = await fetch(
        new URL(name, window.HOTEL_STUDIO_CONFIG.assetBase),
      );
      if (!r.ok) throw Error("PDF fonts unavailable. Retry when connected.");
      return r.arrayBuffer();
    }),
  );
  const regular = await pdf.embedFont(fontData[0], { subset: true }),
    bold = await pdf.embedFont(fontData[1], { subset: true });
  await pdf.attach(
    new TextEncoder().encode(
      JSON.stringify(
        { kind: "curtainsuk-hotel-project", version: project.version, project },
        null,
        2,
      ),
    ),
    "hotel-project.json",
    {
      mimeType: "application/json",
      description:
        "Room designs, original text and measurements; retired pricing fields omitted",
    },
  );
  pdf.setTitle(`${project.name} — CurtainsUK Hotel Design Studio`);
  pdf.setAuthor("CurtainsUK Hotel Design Studio");
  const ink = rgb(0.16, 0.21, 0.17),
    muted = rgb(0.36, 0.4, 0.35),
    gold = rgb(0.61, 0.47, 0.28),
    W = 595,
    H = 842,
    M = 42;
  let page, y;
  const supported = new Set(regular.getCharacterSet());
  const printable = (v) =>
    [...String(v ?? "")]
      .map((c) => (c === "\n" || supported.has(c.codePointAt(0)) ? c : "?"))
      .join("");
  const unsupported = JSON.stringify(project)
    .split("")
    .some((c) => c.codePointAt(0) > 31 && !supported.has(c.codePointAt(0)));
  function newPage() {
    page = pdf.addPage([W, H]);
    y = H - M;
    page.drawText("CURTAINS UK  /  HOTEL DESIGN STUDIO", {
      x: M,
      y,
      size: 10,
      font: bold,
      color: gold,
    });
    y -= 28;
  }
  function line(
    text,
    { size = 10, strong = false, colour = ink, gap = 5 } = {},
  ) {
    const font = strong ? bold : regular,
      maxWidth = W - 2 * M;
    const draw = (value) => {
      if (y < 58) newPage();
      page.drawText(value, { x: M, y, size, font, color: colour });
      y -= size * 1.45;
    };
    for (const paragraph of printable(text).split("\n")) {
      let current = "";
      for (const token of paragraph.split(/\s+/)) {
        const chunks = [];
        let chunk = "";
        for (const c of token) {
          if (chunk && font.widthOfTextAtSize(chunk + c, size) > maxWidth) {
            chunks.push(chunk);
            chunk = "";
          }
          chunk += c;
        }
        chunks.push(chunk);
        for (const word of chunks) {
          const next = current ? current + " " + word : word;
          if (font.widthOfTextAtSize(next, size) > maxWidth) {
            draw(current);
            current = word;
          } else current = next;
        }
      }
      draw(current);
    }
    y -= gap;
  }
  async function image(data, maxH = 270) {
    if (!data) return;
    try {
      const embedded = data.startsWith("data:image/png")
        ? await pdf.embedPng(data)
        : await pdf.embedJpg(data);
      const size = embedded.scaleToFit(W - 2 * M, maxH);
      if (y - size.height < 55) newPage();
      page.drawImage(embedded, {
        x: M + (W - 2 * M - size.width) / 2,
        y: y - size.height,
        ...size,
      });
      y -= size.height + 15;
    } catch {
      line(
        "Preview image unavailable. Fabric references and selections are listed below.",
        { colour: muted },
      );
    }
  }
  newPage();
  line(project.name, { size: 25, strong: true, gap: 12 });
  line(
    "Design your hotel rooms. Coordinate your furnishings. Plan your project.",
    { size: 13 },
  );
  line(`Project saved ${new Date(project.updatedAt).toLocaleString("en-GB")}`, {
    colour: muted,
  });
  line(
    `Hotel: ${project.contact.hotel || "Not entered"} | Contact: ${project.contact.name || "Not entered"}`,
  );
  line(
    `Email: ${project.contact.email || "Not entered"} | Location: ${project.contact.location || "Not entered"}`,
  );
  if (unsupported)
    line(
      "Some characters are not supported by the brief font and appear as ?. The attached hotel-project.json preserves the exact original text.",
      { colour: muted },
    );
  line(
    "Illustrative design brief. Original concept scenes, not CurtainsUK installations. The 2D layouts are separate from the room renderings. Daylight previews do not certify blackout performance. Verify materials, fire-performance requirements and dimensions for the project before ordering.",
    { colour: muted },
  );
  line(
    `${project.rooms.reduce((n, r) => n + r.quantity, 0)} rooms across ${project.rooms.length} room types`,
    {
      size: 16,
      strong: true,
    },
  );
  for (const r of project.rooms)
    line(
      `${r.quantity} x ${r.name} — ${r.schemes.find((s) => s.id === r.schemeId).name}`,
    );
  if (project.notes) line(`Project notes: ${project.notes}`);
  const all = project.rooms.reduce((n, r) => n + r.schemes.length, 0);
  let done = 0;
  for (const r of project.rooms) {
    newPage();
    line(`${r.name} / ${r.quantity} rooms`, { size: 20, strong: true });
    line(`Selected scheme: ${r.schemes.find((s) => s.id === r.schemeId).name}`);
    line(
      `Windows per room: ${r.windowCount}. Shared figures are planning references; each room requires its own measurement check.`,
      { colour: muted },
    );
    line(
      `Samples: ${r.sampleStatus}; design: ${r.approvalStatus}. These are manually recorded statuses. Installation phase: ${r.phase}; no booking implied.`,
    );
    if (r.notes) line(`Notes: ${r.notes}`);
    for (const w of r.windows)
      line(
        `${w.name}: ${w.width ?? "not entered"} cm wide x ${w.drop ?? "not entered"} cm drop; ${w.confirmed ? "user-confirmed" : "unconfirmed"}. ${w.notes}`,
      );
    if (r.exceptions.length) {
      line("Individual room measurements", { size: 14, strong: true });
      for (const e of r.exceptions)
        line(
          `Room ${e.number}: ${e.windowName || "window unspecified"}; ${e.width ?? "not entered"} x ${e.drop ?? "not entered"} cm; ${e.confirmed ? "user-confirmed" : "unconfirmed"}; scheme ${r.schemes.find((s) => s.id === (e.schemeId || r.schemeId))?.name}. ${e.notes}`,
        );
    }
    for (const s of r.schemes) {
      onProgress(`Preparing ${++done} of ${all}: ${r.name}, ${s.name}`);
      newPage();
      line(
        `${r.name} / ${s.name}${s.id === r.schemeId ? " (selected)" : " (alternative)"}`,
        { size: 17, strong: true },
      );
      line(
        `${SCENES[s.scene].name} concept scene. Wave heading. Layers: ${s.layers}. Main curtains ${Math.round(s.curtainOpen * 100)}% open; voile ${Math.round(s.voileOpen * 100)}% open. Sheerness is illustrative.`,
        { colour: muted },
      );
      let preview = null;
      try {
        preview = await capture?.(s);
      } catch {}
      await image(preview);
      if (!preview)
        line(
          "3D preview unavailable for this export. Your complete selections are retained.",
          { colour: muted },
        );
      line("Room colours, lighting & wall details", { strong: true });
      for (const detail of roomAtmosphere(s))
        line(detail, { size: 9, colour: muted });
      line(
        "Colour and decorative concepts only; floor colour tints the timber texture. Confirm physical finishes separately.",
        { size: 9, colour: muted },
      );
      for (const [key, item] of Object.entries(s.items)) {
        if (y < 210) newPage();
        line(ITEMS[key], { strong: true });
        if (item.fabric) {
          const f = item.fabric;
          if (f.availability === "Discontinued")
            line(
              "DISCONTINUED — saved choice retained; select an alternative.",
              { strong: true },
            );
          line(
            `${f.brand} / ${f.design} / ${f.colour} | ${f.reference} | Fabric ID ${f.id}`,
          );
          line(
            `Panaz published FR ratings: ${f.frRatings}. Source checked ${f.observedAt}: ${f.sourceUrl}`,
            { size: 9, colour: muted },
          );
          line(
            `Intended-use suitability: review required.${f.usage ? ` Catalogue usage field: ${f.usage}.` : ""} Visual scale: ${f.source?.scaleKind ?? "not calibrated"}.`,
            { colour: muted },
          );
        } else
          line(`Colour concept ${item.colour}; fabric to select.`, {
            colour: muted,
          });
        line(
          `Coordination: ${item.relationship}${item.relationship !== "independent" ? ` with ${ITEMS[item.referenceItem]}` : ""}`,
          { colour: muted, size: 9 },
        );
      }
      newPage();
      line(`${r.name} / ${s.name} / layout`, { size: 17, strong: true });
      line(
        `${s.layout.width} x ${s.layout.length} cm. ${s.layout.confirmed ? "User-confirmed dimensions." : "Example template dimensions; confirmation needed."} Layout moves do not update the 3D scene.`,
        { colour: muted },
      );
      await image(await svgPng(layoutSvg(s.layout)), 390);
      for (const i of s.layout.items)
        line(
          `${i.label}: ${i.width} x ${i.depth} cm; x ${i.x}, y ${i.y} cm; rotation ${i.angle} degrees.`,
          { size: 9, gap: 2 },
        );
      for (const o of s.layout.openings)
        line(
          `${o.kind}: ${o.wall} wall, offset ${o.offset} cm; width ${o.width} cm; height ${o.height} cm.`,
          { size: 9 },
        );
      for (const warning of layoutWarnings(s.layout))
        line(`Layout review: ${warning}`, { colour: muted });
    }
  }
  newPage();
  line("Decisions to review", { size: 20, strong: true });
  for (const text of unresolved(project)) line(text);
  line(
    "A manual sample status does not place an order. A planned phase does not book installation. Use the prepared enquiry to request confirmation, quotation and next steps.",
    { colour: muted },
  );
  const pages = pdf.getPages();
  pages.forEach((p, i) =>
    p.drawText(`Prepared design brief / ${i + 1} of ${pages.length}`, {
      x: M,
      y: 24,
      size: 8,
      font: regular,
      color: muted,
    }),
  );
  return pdf.save();
}
