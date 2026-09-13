(() => {
  const KEY = "curtainsuk_hci_session_v1",
    REVIEW = "curtainsuk_hci_reviews_v1";
  const stage = document.querySelector("#stage"),
    notice = document.querySelector("#notice");
  const escape = (value) =>
    String(value ?? "").replace(
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
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  let view = null,
    locked = false,
    pending = null;
  const saved = read(KEY, null);
  const personas = [
    "Quiet neutral living room",
    "Colourful botanical bedroom",
    "Contemporary blue bay",
    "Traditional country sitting room",
    "Minimalist cream apartment",
    "Formal dining room",
    "Bold geometric studio",
    "Soft pink nursery",
    "Green garden room",
    "Warm terracotta lounge",
    "Floral cottage bedroom",
    "Monochrome home office",
    "Easy-care family room",
    "Blackout bedroom",
    "Large-window reading room",
    "Texture-led neutral lounge",
    "Small north-facing room",
    "Sunny south-facing bedroom",
    "Period house bay",
    "Modern wave curtains",
    "Formal pinch-pleat room",
    "Low-pattern preference",
    "Strong purple preference",
    "Mixed tastes shared room",
  ];
  const reactions = (id) =>
    `<div class="reactions">${["LOVE", "LIKE", "NOT_SURE", "DISLIKE"].map((reaction) => `<button data-reaction="${reaction}" ${id ? `data-fabric="${escape(id)}"` : ""}>${{ LOVE: "♡ Love", LIKE: "Like", NOT_SURE: "Not sure", DISLIKE: "Dislike" }[reaction]}</button>`).join("")}</div>`;
  async function act(action) {
    if (locked) return;
    locked = true;
    stage.classList.add("busy");
    stage.setAttribute("aria-busy", "true");
    notice.hidden = true;
    // Retain a request id after a lost response; the local rehearsal bridge returns the accepted result once.
    const body = pending || {
      sessionId: view?.sessionId || saved?.sessionId,
      revision: view?.revision,
      requestId: crypto.randomUUID(),
      action,
    };
    pending = body;
    try {
      const response = await fetch("/api/admin/curtain-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Your consultation is paused. Please try again.",
        );
      pending = null;
      view = data;
      localStorage.setItem(KEY, JSON.stringify({ sessionId: view.sessionId }));
      await render();
    } catch (error) {
      notice.textContent = error.message;
      notice.hidden = false;
      const retry = document.createElement("button");
      retry.className = "secondary";
      retry.textContent = "Try again";
      retry.onclick = () => act();
      notice.append(document.createElement("br"), retry);
    } finally {
      locked = false;
      stage.classList.remove("busy");
      stage.removeAttribute("aria-busy");
    }
  }
  function journeyLink(fabric, sample = false) {
    const path = `https://www.curtainsuk.com/pages/${sample ? "fabric-library" : "curtain-visualiser"}?preview_theme_id=182264234363&fabric=${encodeURIComponent(fabric.id)}${sample ? "&intent=sample" : ""}${view.windowSlug ? `&window=${encodeURIComponent(view.windowSlug)}` : ""}`;
    const context = {
      sessionId: view.sessionId,
      profileSummary: view.profileSummary,
      fabricMasterId: fabric.id,
      windowSlug: view.windowSlug,
      returnOrigin: location.origin,
    };
    return `${path}#cuk_hci=${encodeURIComponent(JSON.stringify(context))}`;
  }
  async function render() {
    document
      .querySelectorAll(".progress span")
      .forEach((item, i) =>
        item.classList.toggle(
          "active",
          i === { discovery: 0, calibration: 1, complete: 2 }[view.phase],
        ),
      );
    document.querySelector("#review").hidden = true;
    if (view.phase === "discovery") {
      stage.innerHTML = `<p class="eyebrow">Your room, in your words</p><h1>${escape(view.question.prompt)}</h1><p class="fine">Choose what feels closest. Your answers shape the next question.</p><div class="options">${view.question.answers.map((answer, index) => `<button class="option" data-answer="${escape(answer.id)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escape(answer.label)}</strong><span aria-hidden="true">↗</span></button>`).join("")}</div>`;
    } else if (view.phase === "calibration") {
      stage.innerHTML = `<p class="eyebrow">Follow your first impression</p><h1>How does this feel to you?</h1><p class="intro">There is no right answer. Tell us what you are drawn to.</p><img class="calibration" src="/hci-visual/${encodeURIComponent(view.stimulusId)}.svg" alt="Controlled HCI curtain illustration for visual preference calibration">${reactions()}<p class="fine">A controlled illustration, not a fabric product or a promise of an exact colour match.</p>`;
    } else if (!view.shortlist.length) {
      stage.innerHTML = `<p class="eyebrow">A picture is coming together</p><h1>Your room.<br><em>Your point of view.</em></h1><p class="intro">${escape(view.profileSummary)}</p><button class="primary" data-recommend>Discover my fabric edit ↗</button>`;
    } else {
      stage.innerHTML = `<p class="eyebrow">The beginning of something beautiful</p><h1>A considered edit,<br><em>just for your room.</em></h1><p class="intro">${escape(view.profileSummary)}</p><p class="fine">Internal recommendations · Colour relevance needs human review. Check colours in your own light before deciding.</p><div class="cards" aria-live="polite"><p>Finding the exact fabrics in CurtainsUK…</p></div>`;
      const results = await Promise.all(
        view.shortlist.map(async (item) => {
          try {
            const response = await fetch(
              `/catalog?view=retail&fabric=${encodeURIComponent(item.fabricMasterId)}`,
            );
            if (!response.ok) throw new Error();
            const { fabric } = await response.json();
            if (
              !fabric ||
              fabric.id !== item.fabricMasterId ||
              !fabric.browseReady
            )
              return null;
            return { item, fabric };
          } catch {
            return null;
          }
        }),
      );
      const cards = stage.querySelector(".cards");
      cards.innerHTML = results
        .map((entry, index) => {
          if (!entry)
            return `<article><h2>Fabric temporarily unavailable</h2><p>This exact recommendation could not be loaded. We have not substituted another fabric.</p></article>`;
          const { item, fabric } = entry;
          return `<article class="card"><img src="${escape(fabric.images[0].url)}?width=800" width="800" height="800" alt="${escape(fabric.metadata.alt)}" ${index > 1 ? 'loading="lazy"' : 'fetchpriority="high"'}><p class="eyebrow">${escape(fabric.brand)} · ${escape(fabric.collection)}</p><h2>${escape(fabric.design)}</h2><p class="colour">${escape(fabric.colour)}</p><p class="why"><b>Why we chose this</b>${escape(item.explanation.join(" ") || "A design to explore as we learn more about your preferences.")}</p>${item.unknowns.map((note) => `<p class="colour-note">${escape(note)}</p>`).join("")}${reactions(item.reactionId)}<div class="actions">${fabric.sampleAvailable === true ? `<a class="secondary" href="${escape(journeyLink(fabric, true))}">Order a Sample</a>` : '<p class="fine">Sample availability to confirm</p>'}<a class="primary" href="${escape(journeyLink(fabric))}">Make Curtains ↗</a><a class="quiet" href="${escape(journeyLink(fabric, true).replace("&intent=sample", ""))}">Explore this fabric</a></div></article>`;
        })
        .join("");
      reviewPanel();
    }
    if (view.phase === "calibration") {
      const visual = stage.querySelector(".calibration"),
        buttons = [...stage.querySelectorAll("[data-reaction]")];
      buttons.forEach((button) => (button.disabled = true));
      visual.onload = () => {
        buttons.forEach((button) => (button.disabled = false));
        notice.hidden = true;
      };
      visual.onerror = () => {
        notice.textContent =
          "The illustration could not load. Please retry before giving your reaction.";
        notice.hidden = false;
        const retry = document.createElement("button");
        retry.className = "secondary";
        retry.textContent = "Reload illustration";
        retry.onclick = () => {
          const url = new URL(visual.src);
          url.searchParams.set("retry", String(Date.now()));
          visual.src = url.href;
        };
        notice.append(document.createElement("br"), retry);
      };
      if (visual.complete && visual.naturalWidth > 0) visual.onload();
    }
    stage.focus({ preventScroll: true });
  }
  stage.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.answer)
      act({ type: "answer", answerId: button.dataset.answer });
    else if (button.dataset.reaction)
      act(
        button.dataset.fabric
          ? {
              type: "react",
              fabricId: button.dataset.fabric,
              reaction: button.dataset.reaction,
            }
          : { type: "calibrate", reaction: button.dataset.reaction },
      );
    else if (button.hasAttribute("data-recommend")) act({ type: "recommend" });
    else if (button.id === "start") act();
  });
  function reviewPanel() {
    const panel = document.querySelector("#review");
    panel.hidden = false;
    const savedReview = read(REVIEW, {})[view.sessionId] || {};
    panel.innerHTML = `<p class="eyebrow">Internal human review · not a customer feature</p><h2>Would you show this edit to a client?</h2><p class="fine">24 suggested personas. Ratings are human observations, never automatic approval or ranking inputs.</p><label>Review persona label (does not change answers)<select name="persona">${personas.map((p) => `<option>${escape(p)}</option>`).join("")}</select></label><div class="ratings">${["Colour relevance", "Style relevance", "Pattern relevance", "Room suitability", "Variety", "Explanations"].map((label) => `<label>${label}<select name="${label}"><option value="">Not reviewed</option><option>Strong</option><option>Mixed</option><option>Poor</option><option>Not enough evidence</option></select></label>`).join("")}</div><label>Obviously poor recommendations and reasons<textarea name="notes" maxlength="2000" placeholder="Identify the fabric and what feels wrong. No customer details."></textarea></label><button class="secondary" id="export">Export human review</button><p class="fine">Saved only on this review device. Not submitted to HCI as preference evidence.</p>`;
    panel.querySelectorAll("select,textarea").forEach((input) => {
      if (savedReview[input.name]) input.value = savedReview[input.name];
    });
    panel.oninput = () => {
      const all = read(REVIEW, {});
      all[view.sessionId] = Object.fromEntries(
        [...panel.querySelectorAll("select,textarea")].map((input) => [
          input.name,
          input.value,
        ]),
      );
      localStorage.setItem(REVIEW, JSON.stringify(all));
    };
    panel.querySelector("#export").onclick = () => {
      const data = {
        version: "curtainsuk-human-review-v1",
        sessionId: view.sessionId,
        sourceCommit: view.sourceCommit,
        shortlist: view.shortlist,
        ratings: read(REVIEW, {})[view.sessionId] || {},
        status: "HUMAN_REVIEW_REQUIRES_ASSESSMENT",
      };
      const link = document.createElement("a"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
      link.href = url;
      link.download = "curtainsuk-human-review.json";
      link.click();
      URL.revokeObjectURL(url);
    };
  }
  document.querySelector("#restart").onclick = () => {
    if (locked) return;
    localStorage.removeItem(KEY);
    location.reload();
  };
  if (saved?.sessionId) act();
})();
