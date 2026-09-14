(() => {
  const KEY = "curtainsuk_hci_session_v2",
    stage = document.querySelector("#stage"),
    notice = document.querySelector("#notice");
  const esc = (v) =>
    String(v ?? "").replace(
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
  const labels = {
    LOVE: "Love",
    LIKE: "Like",
    NOT_SURE: "Not sure",
    DISLIKE: "Not for me",
  };
  const families = [
    "white",
    "cream",
    "beige",
    "taupe",
    "brown",
    "grey",
    "black",
    "blue",
    "green",
    "pink",
    "red",
    "orange",
    "yellow",
    "gold",
    "purple",
  ];
  let view = null,
    locked = false,
    pending = null,
    feedback = {},
    entry =
      new URLSearchParams(location.search).get("entry") === "match"
        ? "match"
        : "guided";
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(KEY));
  } catch {}
  const resumeId = new URLSearchParams(location.search).get("session");
  if (resumeId && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(resumeId)) {
    saved = { sessionId: resumeId };
  }
  let windowSlug = new URLSearchParams(location.search).get("window") || saved?.windowSlug || null;
  const offered = () =>
    sessionStorage.getItem("hci-image-offered:" + view.sessionId) === "true";
  const markOffered = () =>
    sessionStorage.setItem("hci-image-offered:" + view.sessionId, "true");
  async function act(action) {
    if (locked) return;
    locked = true;
    notice.hidden = false;
    notice.textContent =
      action?.type === "image"
        ? "Finding the colours in your image…"
        : action?.type === "recommend" || action?.type === "refine"
          ? "Finding fabrics that work with your room…"
          : "Saving your choices…";
    stage.setAttribute("aria-busy", "true");
    pending ??= {
      requestId: crypto.randomUUID(),
      sessionId: view?.sessionId || saved?.sessionId,
      revision: view?.revision,
      action,
    };
    try {
      const r = await fetch("/api/admin/curtain-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Please retry.");
      view = data;
      if (view.windowSlug) windowSlug = view.windowSlug;
      if (view.palette) markOffered();
      pending = null;
      localStorage.setItem(KEY, JSON.stringify({ sessionId: view.sessionId, windowSlug }));
      notice.hidden = true;
      await render();
      return true;
    } catch (e) {
      notice.textContent = e.message;
      const retry = document.createElement("button");
      retry.textContent = "Try again";
      retry.onclick = () => act();
      notice.append(retry);
      const resume = document.createElement("button");
      resume.textContent = "Resume saved consultation";
      resume.onclick = () => {
        pending = null;
        act();
      };
      notice.append(resume);
    } finally {
      locked = false;
      stage.removeAttribute("aria-busy");
    }
  }
  function offerImage() {
    stage.innerHTML = `<p class="eyebrow">Your inspiration · optional</p><h1>Have something you’d like us to match with?</h1><p>One image is enough. Please use a non-personal test image in this internal preview.</p><div class="reference-panel"><label>Reference type<select id="reference-type">${["room", "paint", "sofa-upholstery", "wallpaper", "rug", "flooring", "existing-fabric", "moodboard"].map((t) => `<option>${t}</option>`).join("")}</select></label><label>Choose one image<input id="reference-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="fine">JPG, PNG or WebP, up to 2 MB. Image bytes are analysed without storage. The palette and your corrections are retained privately for this internal rehearsal.</p><button class="primary" id="upload">Find my colours</button></div><button class="quiet" id="skip">${view.phase === "complete" ? "Skip — show my recommendations" : "Skip — continue with questions"}</button>`;
    stage.querySelector("#skip").onclick = () => {
      markOffered();
      if (view.phase === "complete") act({ type: "recommend" });
      else render();
    };
    stage.querySelector("#upload").onclick = async () => {
      const f = stage.querySelector("#reference-file").files?.[0];
      if (
        !f ||
        !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
        f.size > 2 * 1024 * 1024
      ) {
        notice.hidden = false;
        notice.textContent = "Choose one image no larger than 2 MB, or skip.";
        return;
      }
      const type = stage.querySelector("#reference-type").value;
      const data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      act({ type: "image", mime: f.type, bytes: data, referenceType: type });
    };
  }
  function palette() {
    const p = view.palette;
    stage.innerHTML = `<p class="eyebrow">Your room’s palette</p><h1>Here are the colours we found. Does this look right?</h1><p>Keep what looks right. Remove, add or move a colour. Up to three in each group.</p><div class="palette-grid">${[
      "primary",
      "secondary",
      "accent",
    ]
      .map(
        (k) =>
          `<section><h2>${k[0].toUpperCase() + k.slice(1)} colours</h2>${p.colours[
            k
          ]
            .map(
              (c) =>
                `<div class="palette-row"><strong>${esc(c)}</strong><button data-edit="keep" data-colour="${esc(c)}">Keep</button><button data-edit="remove" data-colour="${esc(c)}">Remove</button><label>Move to<select data-move="${esc(c)}"><option value="">Choose group</option>${[
                  "primary",
                  "secondary",
                  "accent",
                ]
                  .filter((x) => x !== k)
                  .map((x) => `<option>${x}</option>`)
                  .join("")}</select></label></div>`,
            )
            .join(
              "",
            )}<label>Add colour<select data-add="${k}"><option value="">Choose colour</option>${families
            .filter((c) => !Object.values(p.colours).flat().includes(c))
            .map((c) => `<option>${c}</option>`)
            .join("")}</select></label></section>`,
      )
      .join(
        "",
      )}</div><button class="primary" id="confirm">This looks right — continue</button>`;
    const edit = (change) =>
      act({
        type: "palette",
        edit: { id: crypto.randomUUID(), revision: p.revision, ...change },
      });
    stage
      .querySelectorAll("[data-edit]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            edit({ type: b.dataset.edit, colour: b.dataset.colour })),
      );
    stage
      .querySelectorAll("[data-move]")
      .forEach(
        (b) =>
          (b.onchange = () =>
            b.value &&
            edit({ type: "move", colour: b.dataset.move, category: b.value })),
      );
    stage
      .querySelectorAll("[data-add]")
      .forEach(
        (b) =>
          (b.onchange = () =>
            b.value &&
            edit({ type: "add", colour: b.value, category: b.dataset.add })),
      );
    stage.querySelector("#confirm").onclick = () => edit({ type: "confirm" });
  }
  function link(fabric, item, direction, sample) {
    const url = new URL(
      `https://www.curtainsuk.com/pages/${sample ? "fabric-library" : "curtain-visualiser"}`,
    );
    url.searchParams.set("preview_theme_id", "182264234363");
    url.searchParams.set("fabric", fabric.id);
    if (sample) url.searchParams.set("intent", "sample");
    if (windowSlug && /^[a-z-]{1,60}$/.test(windowSlug))
      url.searchParams.set("window", windowSlug);
    const context = {
      sessionId: view.sessionId,
      profileSummary: view.profileSummary,
      fabricMasterId: fabric.id,
      supplierSku: item.supplierSku,
      strategyId: direction.id,
      refinementDigest: view.refinementDigest,
      commerceToken: item.commerceToken,
      returnOrigin: location.origin,
      windowSlug,
    };
    url.hash = "cuk_hci=" + encodeURIComponent(JSON.stringify(context));
    return url.href;
  }
  function reactions(d, c, field) {
    const selected = feedback[d.id]?.[field];
    return `<fieldset><legend>${field === "strategyReaction" ? "This direction" : "This fabric"}</legend>${Object.entries(
      labels,
    )
      .map(
        ([r, l]) =>
          `<button aria-pressed="${selected === r}" data-direction="${esc(d.id)}" data-fabric="${esc(c.reactionId)}" data-field="${field}" data-reaction="${r}">${l}</button>`,
      )
      .join("")}</fieldset>`;
  }
  async function render() {
    document.querySelector("#review").hidden = true;
    if (view.palette && !view.palette.confirmed) {
      palette();
      return;
    }
    if (
      !view.palette &&
      !offered() &&
      (entry === "match" || view.phase === "complete")
    ) {
      offerImage();
      return;
    }
    if (view.phase === "discovery") {
      stage.innerHTML = `<p class="eyebrow">Your room, in your words</p><h1>${esc(view.question.prompt)}</h1><div class="options">${view.question.answers.map((a) => `<button class="option" data-answer="${esc(a.id)}">${esc(a.label)}</button>`).join("")}</div>`;
      stage
        .querySelectorAll("[data-answer]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              act({ type: "answer", answerId: b.dataset.answer })),
        );
    } else if (view.phase === "calibration") {
      stage.innerHTML = `<h1>How does this feel to you?</h1><img class="calibration" src="/api/admin/curtain-consultation/assets/${encodeURIComponent(view.stimulusId)}.svg" alt="Illustration for visual preference calibration"><div>${Object.entries(
        labels,
      )
        .map(([r, l]) => `<button data-calibrate="${r}" disabled>${l}</button>`)
        .join("")}</div>`;
      const image = stage.querySelector("img");
      const enable = () =>
        stage.querySelectorAll("[data-calibrate]").forEach((b) => {
          b.disabled = false;
          b.onclick = () =>
            act({ type: "calibrate", reaction: b.dataset.calibrate });
        });
      image.onload = enable;
      if (image.complete && image.naturalWidth) enable();
    } else if (view.phase === "complete") {
      stage.innerHTML = `<h1>Your room. Your point of view.</h1><p>${esc(view.profileSummary)}</p><button class="primary" id="recommend">Show my design directions</button>`;
      stage.querySelector("#recommend").onclick = () =>
        act({ type: "recommend" });
    } else {
      const final = view.phase === "final";
      stage.innerHTML = `<p class="eyebrow">Your personal edit</p><h1>${final ? "Your final shortlist" : "Five design directions"}</h1><p>${final ? "Explore these fabrics in your own room with a sample." : "Tell us what you love. We will refine your shortlist once."}</p><div class="cards">Loading your exact CurtainsUK fabrics…</div>`;
      const parts = await Promise.all(
        view.directions
          .filter((d) => !final || d.cards.length)
          .map(async (d) => {
            if (!d.cards.length)
              return `<article><h2>${esc(d.label)}</h2><p>${esc(d.purpose)}</p><p>This direction is unavailable with the evidence we have.</p></article>`;
            const item = d.cards[0];
            try {
              const r = await fetch(
                `/api/admin/curtain-consultation?fabric=${encodeURIComponent(item.fabricMasterId)}`,
              );
              if (!r.ok) throw Error();
              const { fabric: f } = await r.json();
              if (!f?.browseReady || f.id !== item.fabricMasterId)
                throw Error();
              return `<article class="card"><h2>${esc(d.label)}</h2><p>${esc(d.purpose)}</p><img loading="lazy" src="${esc(f.images[0].url)}?width=700" alt="${esc(f.design + " " + f.colour)}"><p class="eyebrow">${esc(f.brand)}</p><h3>${esc(f.design)} · ${esc(f.colour)}</h3><p><b>Why we chose this</b> ${esc(item.explanation.join(" "))}</p>${final ? "" : reactions(d, item, "strategyReaction") + reactions(d, item, "fabricReaction")}<div class="actions">${f.sampleAvailable === true ? `<a class="secondary" href="${esc(link(f, item, d, true))}">Order Sample</a>` : "<p>Sample availability to confirm</p>"}<a class="primary" href="${esc(link(f, item, d, false))}">Make Curtains</a></div></article>`;
            } catch {
              return `<article><h2>${esc(d.label)}</h2><p>This exact fabric cannot currently be loaded. Explore the Fabric Library or retry; we have not substituted another fabric.</p></article>`;
            }
          }),
      );
      stage.querySelector(".cards").innerHTML = parts.join("");
      stage.querySelectorAll('.actions a').forEach(a => {
        a.onclick = async event => {
          event.preventDefault();
          if (locked) return;
          const target = a.href;
          const context = JSON.parse(new URLSearchParams(new URL(target).hash.slice(1)).get('cuk_hci'));
          if (await act({type:'outcome',event:a.textContent === 'Order Sample' ? 'SAMPLE_INTENT' : 'FABRIC_SELECTED',fabricMasterId:context.fabricMasterId,strategyId:context.strategyId})) location.assign(target);
        };
      });
      stage.querySelectorAll("[data-reaction]").forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.direction;
            feedback[id] ??= {
              strategyId: id,
              fabricId: b.dataset.fabric,
              strategyReaction: null,
              fabricReaction: null,
            };
            feedback[id][b.dataset.field] = b.dataset.reaction;
            b.closest("fieldset")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          }),
      );
      if (!final) {
        const button = document.createElement("button");
        button.className = "primary";
        button.textContent = "Refine my shortlist";
        button.onclick = () =>
          act({ type: "refine", feedback: Object.values(feedback) });
        stage.append(button);
      }
    }
    stage.focus({ preventScroll: true });
  }
  document.querySelector("#entry-match").onclick = () => {
    entry = "match";
    act();
  };
  document.querySelector("#entry-guided").onclick = () => {
    entry = "guided";
    act();
  };
  document.querySelector("#restart").onclick = () => {
    localStorage.removeItem(KEY);
    location.href = location.pathname;
  };
  if (
    saved?.sessionId ||
    ["match", "guided"].includes(
      new URLSearchParams(location.search).get("entry"),
    )
  )
    act();
})();
