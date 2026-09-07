(() => {
  const SAMPLE_KEY = "curtainsuk_staging_samples_v1";
  const PROJECT_KEY = "curtainsuk_staging_project_v1";
  const REVIEW_RESUME_KEY = "curtainsuk_staging_review_resume_v1";
  const REVIEW_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const REVIEW_ACCEPTANCE_TOKEN = /^v1\.\d{10,12}\.[A-Za-z0-9_-]{43}$/;

  const emit = (name, detail = {}) => {
    const payload = { event: `curtainsuk_${name}`, ...detail };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent("curtainsuk:analytics", { detail: payload }));
  };

  const money = (minor, currency = "GBP") => new Intl.NumberFormat("en-GB", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(minor / 100);

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };

  const endpoint = (root, path) => `${root.replace(/\/$/, "")}/${path}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

  function humanise(value) {
    return String(value ?? "").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }

  function reviewedResumeCapability() {
    const fragment = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
    const fragmentContainsCapability = fragment.has("cuk_review") || fragment.has("cuk_token");
    if (fragmentContainsCapability) {
      const reviewRequestId = fragment.get("cuk_review") || "";
      const reviewAcceptanceToken = fragment.get("cuk_token") || "";
      const cleanUrl = new URL(location.href);
      cleanUrl.hash = "";
      history.replaceState(history.state, "", cleanUrl);
      if (!REVIEW_REQUEST_ID.test(reviewRequestId) || !REVIEW_ACCEPTANCE_TOKEN.test(reviewAcceptanceToken)) {
        sessionStorage.removeItem(REVIEW_RESUME_KEY);
        return { error: "This review link is incomplete or invalid. Ask the curtain team for a new link." };
      }
      const capability = { reviewRequestId, reviewAcceptanceToken };
      sessionStorage.setItem(REVIEW_RESUME_KEY, JSON.stringify(capability));
      return { capability };
    }
    try {
      const capability = JSON.parse(sessionStorage.getItem(REVIEW_RESUME_KEY) || "null");
      if (capability
          && REVIEW_REQUEST_ID.test(capability.reviewRequestId)
          && REVIEW_ACCEPTANCE_TOKEN.test(capability.reviewAcceptanceToken)) {
        return { capability };
      }
    } catch {
      sessionStorage.removeItem(REVIEW_RESUME_KEY);
    }
    return {};
  }

  function checkoutUrlFor(root, handoff) {
    if (!handoff
        || handoff.paymentEnabled !== false
        || !["TEST_DRAFT_CREATED", "EXISTING_TEST_DRAFT_REUSED"].includes(handoff.testCheckoutStatus)
        || (handoff.testCheckoutStatus === "TEST_DRAFT_CREATED" && handoff.shopifyWritePerformed !== true)
        || (handoff.testCheckoutStatus === "EXISTING_TEST_DRAFT_REUSED" && handoff.shopifyWritePerformed !== false)
        || typeof handoff.checkoutUrl !== "string") return null;
    let checkoutUrl;
    try { checkoutUrl = new URL(handoff.checkoutUrl); } catch { return null; }
    const allowedHost = String(root.dataset.stagingCheckoutHost || "").trim().toLowerCase();
    if (!allowedHost || checkoutUrl.protocol !== "https:" || checkoutUrl.hostname.toLowerCase() !== allowedHost || checkoutUrl.username || checkoutUrl.password) return null;
    return checkoutUrl.toString();
  }

  function renderHandoffConfirmation(root, confirmation, handoff) {
    const checkoutUrl = checkoutUrlFor(root, handoff);
    confirmation.replaceChildren();
    const message = document.createElement("p");
    message.textContent = handoff.message || "Staging checkout handoff prepared.";
    const reference = document.createElement("p");
    reference.className = "cuk-hint";
    reference.textContent = `Reference ${handoff.handoffId} · Real payment and manufacture remain disabled.`;
    confirmation.append(message, reference);
    if (["TEST_DRAFT_CREATED", "EXISTING_TEST_DRAFT_REUSED"].includes(handoff.testCheckoutStatus) && !checkoutUrl) {
      throw new Error("The Shopify test Draft Order was prepared, but its checkout URL did not match the configured CurtainsUK development store. Ask staff to check the staging checkout host before retrying.");
    }
    if (checkoutUrl) {
      const link = document.createElement("a");
      link.className = "cuk-button";
      link.href = checkoutUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Continue to Shopify test checkout";
      link.addEventListener("click", () => emit("test_checkout_opened", { handoff_id: handoff.handoffId }));
      confirmation.append(link);
    }
    confirmation.classList.remove("cuk-hidden");
    confirmation.focus();
  }

  function measurementSummary(measurements) {
    if (!measurements || typeof measurements !== "object" || Array.isArray(measurements)) return "Measurements held in the approved revision";
    return Object.entries(measurements)
      .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      .map(([key, value]) => `${humanise(key)}: ${value}${typeof value === "number" ? " cm" : ""}`)
      .join(" · ") || "Measurements held in the approved revision";
  }

  async function fetchJson(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(url, {
      credentials: url.startsWith(location.origin) ? "same-origin" : "omit",
      mode: "cors",
      headers: { "Accept": "application/json", ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The staging service could not complete this request.");
    return data;
  }

  function rememberProject(values) {
    const current = readJson(PROJECT_KEY, {});
    localStorage.setItem(PROJECT_KEY, JSON.stringify({ ...current, ...values, updatedAt: new Date().toISOString() }));
  }

  function addSample(fabric, windowSlug) {
    const samples = readJson(SAMPLE_KEY, []);
    if (!samples.some((item) => item.fabricId === fabric.id)) {
      samples.push({ fabricId: fabric.id, sku: fabric.uniqueSku, design: fabric.design, colour: fabric.colour, windowSlug, addedAt: new Date().toISOString() });
      localStorage.setItem(SAMPLE_KEY, JSON.stringify(samples));
    }
    rememberProject({ fabricId: fabric.id, windowSlug: windowSlug || "standard-window" });
    emit("sample_intent", { fabric_id: fabric.id, window_type: windowSlug || null });
    renderBaskets();
  }

  function renderBaskets() {
    const samples = readJson(SAMPLE_KEY, []);
    const remembered = readJson(PROJECT_KEY, {});
    document.querySelectorAll("[data-cuk-sample-basket]").forEach((root) => {
      const list = root.querySelector("[data-cuk-sample-list]");
      const empty = root.querySelector("[data-cuk-sample-empty]");
      if (!list || !empty) return;
      list.innerHTML = "";
      empty.hidden = samples.length > 0;
      samples.forEach((sample) => {
        const item = document.createElement("li");
        item.textContent = `${sample.design} — ${sample.colour}`;
        list.appendChild(item);
      });
    });
    document.querySelectorAll("[data-cuk-resume]").forEach((link) => {
      const latestSample = samples[samples.length - 1];
      const fabricId = latestSample?.fabricId || remembered.fabricId;
      const windowSlug = latestSample?.windowSlug || remembered.windowSlug || "standard-window";
      link.href = `/pages/curtain-visualiser?window=${encodeURIComponent(windowSlug)}${fabricId ? `&fabric=${encodeURIComponent(fabricId)}` : ""}`;
    });
  }

  function renderFabricCards(root, catalog) {
    const grid = root.querySelector("[data-cuk-fabric-grid]");
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const selectedWindow = params.get("window") || readJson(PROJECT_KEY, {}).windowSlug || "standard-window";
    grid.innerHTML = "";
    const count = root.querySelector("[data-cuk-fabric-count]");
    if (count) count.textContent = `${catalog.fabrics.length} ${catalog.fabrics.length === 1 ? "fabric" : "fabrics"} shown`;
    if (catalog.fabrics.length === 0) {
      grid.innerHTML = '<p class="cuk-empty">No fabrics match those filters.</p>';
      return;
    }
    catalog.fabrics.forEach((fabric) => {
      const card = document.createElement("article");
      card.className = "cuk-fabric";
      const repeat = Number.isFinite(fabric.verticalRepeatMm)
        ? fabric.verticalRepeatMm > 0 ? `${fabric.verticalRepeatMm / 10} cm vertical repeat` : "No vertical repeat"
        : "Pattern repeat to be confirmed";
      const usableWidth = Number.isFinite(fabric.usableWidthMm) && fabric.usableWidthMm > 0
        ? `${fabric.usableWidthMm / 10} cm usable width`
        : "Usable width to be confirmed";
      const composition = (fabric.composition || []).map((part) => `${part.percentage}% ${part.material}`).join(", ") || "Composition available on request";
      const image = fabric.imageReferences?.[0];
      const visual = image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(fabric.design)} in ${escapeHtml(fabric.colour)} by ${escapeHtml(fabric.brand || fabric.supplier)}" loading="lazy">`
        : `<span class="cuk-fabric__placeholder" aria-hidden="true">${escapeHtml(fabric.design?.slice(0, 1) || "F")}</span>`;
      const sampleAction = fabric.sampleAvailable === true
        ? `<button class="cuk-button cuk-button--secondary" type="button" data-sample>Order sample</button>`
        : `<button class="cuk-button cuk-button--secondary" type="button" disabled>${fabric.sampleAvailable === false ? "Sample unavailable" : "Sample to be confirmed"}</button>`;
      const configureAction = fabric.configurable === true
        ? `<a class="cuk-button" href="/pages/curtain-visualiser?window=${encodeURIComponent(selectedWindow)}&fabric=${encodeURIComponent(fabric.id)}">Use this fabric</a>`
        : `<button class="cuk-button" type="button" disabled>${escapeHtml(fabric.configurationMessage || "Price and availability to be confirmed")}</button>`;
      card.innerHTML = `
        <div class="cuk-fabric__swatch">${visual}</div>
        <div class="cuk-fabric__body">
          <p class="cuk-eyebrow">${escapeHtml(fabric.brand || fabric.supplier)} · ${escapeHtml(fabric.collection)}</p>
          <h3>${escapeHtml(fabric.design)} — ${escapeHtml(fabric.colour)}</h3>
          <p>${usableWidth} · ${repeat}</p>
          <p>${escapeHtml(composition)}</p>
          <p class="cuk-hint">${escapeHtml(fabric.availability)}</p>
          <div class="cuk-fabric__actions">
            ${sampleAction}
            ${configureAction}
          </div>
        </div>`;
      card.querySelector("[data-sample]")?.addEventListener("click", () => addSample(fabric, selectedWindow));
      card.querySelector("img")?.addEventListener("error", (event) => {
        const swatch = event.currentTarget.closest(".cuk-fabric__swatch");
        if (swatch) swatch.innerHTML = `<span class="cuk-fabric__placeholder" aria-hidden="true">${escapeHtml(fabric.design?.slice(0, 1) || "F")}</span>`;
      }, { once: true });
      grid.appendChild(card);
    });
  }

  async function initFabricBrowser(root) {
    try {
      let catalog;
      try {
        catalog = await fetchJson(endpoint(root.dataset.engineBase, "catalog"));
      } catch (engineError) {
        if (!root.dataset.catalogFallback) throw engineError;
        catalog = await fetchJson(root.dataset.catalogFallback);
      }
      const filters = root.querySelector("[data-cuk-fabric-filters]");
      const brandSelect = filters?.elements.brand;
      [...new Set(catalog.fabrics.map((fabric) => fabric.brand || fabric.supplier).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
        .forEach((brand) => brandSelect?.appendChild(option(brand, brand)));
      const applyFilters = () => {
        const query = String(filters?.elements.query.value || "").trim().toLowerCase();
        const brand = String(filters?.elements.brand.value || "");
        const readiness = String(filters?.elements.readiness.value || "");
        const fabrics = catalog.fabrics.filter((fabric) => {
          const searchable = [fabric.supplier, fabric.brand, fabric.collection, fabric.design, fabric.colour, fabric.uniqueSku].join(" ").toLowerCase();
          return (!query || searchable.includes(query))
            && (!brand || (fabric.brand || fabric.supplier) === brand)
            && (!readiness || (readiness === "READY" ? fabric.configurable === true : fabric.configurable !== true));
        });
        renderFabricCards(root, { ...catalog, fabrics });
      };
      filters?.addEventListener("input", applyFilters);
      filters?.addEventListener("change", applyFilters);
      applyFilters();
    } catch (error) {
      root.querySelector("[data-cuk-error]").textContent = error.message;
      root.querySelector("[data-cuk-error]").hidden = false;
    }
  }

  function baySectionWidths(root) {
    return [...root.querySelectorAll("[data-cuk-bay-section-width]")].map((field) => Number(field.value));
  }

  function renderBaySections(root, requestedCount, values = []) {
    const container = root.querySelector("[data-cuk-bay-sections]");
    if (!container) return;
    const count = Math.min(8, Math.max(2, Number.parseInt(requestedCount, 10) || 3));
    const defaults = [80, 180, 80];
    container.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const field = document.createElement("label");
      field.className = "cuk-bay-section";
      field.innerHTML = `<span>Section ${index + 1}</span><input type="number" min="10" max="600" step="0.1" value="${escapeHtml(values[index] ?? defaults[index] ?? 100)}" data-cuk-bay-section-width required>`;
      container.appendChild(field);
    }
  }

  function projectSnapshot(form, root) {
    const scalarNames = [
      "windowSlug", "measurementBasis", "widthCm", "dropCm", "trackOrPoleFitted", "baySectionCount",
      "cornerSectionOneCm", "cornerSectionTwoCm", "cornerAngleDegrees",
      "baseWidth", "peakHeight", "leftVertical", "rightVertical", "leftSlope", "rightSlope",
      "roughWidthCm", "roughDropCm", "fixingPosition", "awkwardFixingPosition",
      "heading", "fabricId", "lining", "construction", "stackDirection",
    ];
    const snapshot = {};
    scalarNames.forEach((name) => {
      const field = form.elements[name];
      if (field && field.value !== "") snapshot[name] = field.value;
    });
    snapshot.baySectionWidthsCm = baySectionWidths(root);
    return snapshot;
  }

  function restoreProject(form, remembered) {
    Object.entries(remembered).forEach(([name, value]) => {
      const field = form.elements[name];
      if (field && typeof value !== "object" && name !== "updatedAt" && name !== "lastOutcome") field.value = String(value);
    });
  }

  function syncConfiguratorUrl(form) {
    const url = new URL(location.href);
    url.searchParams.set("window", form.elements.windowSlug.value);
    if (form.elements.fabricId.value) url.searchParams.set("fabric", form.elements.fabricId.value);
    history.replaceState(history.state, "", url);
  }

  function replaceOptions(select, values, labels) {
    if (!select || !Array.isArray(values) || values.length === 0) return;
    const previous = select.value;
    select.innerHTML = "";
    values.forEach((value) => select.appendChild(option(labels[value] || value.replaceAll("_", " "), value)));
    select.value = values.includes(previous) ? previous : values[0];
  }

  function setJourneyFields(root, windowType) {
    const isBay = windowType?.journey === "REVIEW" && windowType.slug === "bay-window";
    const isCorner = windowType?.journey === "REVIEW" && windowType.slug === "corner-window";
    const isCurved = windowType?.journey === "REVIEW" && windowType.slug === "curved-bow-window";
    const isSpecialist = windowType?.journey === "SPECIALIST";
    const isAwkward = isSpecialist && windowType.slug === "awkward-unusual-window";
    const isShapedSpecialist = isSpecialist && !isAwkward;
    const isReview = windowType?.journey === "REVIEW";
    const needsEvidence = isReview || isSpecialist;
    root.querySelectorAll("[data-cuk-bay]").forEach((item) => item.classList.toggle("cuk-hidden", !isBay));
    root.querySelectorAll("[data-cuk-corner]").forEach((item) => item.classList.toggle("cuk-hidden", !isCorner));
    root.querySelectorAll("[data-cuk-standard]").forEach((item) => item.classList.toggle("cuk-hidden", isSpecialist));
    root.querySelectorAll("[data-cuk-measurement-basis]").forEach((item) => item.classList.toggle("cuk-hidden", isBay || isCorner || isCurved));
    root.querySelectorAll("[data-cuk-width]").forEach((item) => item.classList.toggle("cuk-hidden", isBay || isCorner));
    root.querySelectorAll("[data-cuk-specialist-shape]").forEach((item) => item.classList.toggle("cuk-hidden", !isShapedSpecialist));
    root.querySelectorAll("[data-cuk-awkward]").forEach((item) => item.classList.toggle("cuk-hidden", !isAwkward));
    root.querySelectorAll("[data-cuk-review-evidence]").forEach((item) => item.classList.toggle("cuk-hidden", !needsEvidence));
    root.querySelectorAll("[data-cuk-specialist-evidence]").forEach((item) => item.classList.toggle("cuk-hidden", !isSpecialist));
    root.querySelectorAll("[data-cuk-bay] input, [data-cuk-bay] select, [data-cuk-bay] textarea").forEach((field) => { field.disabled = !isBay; });
    root.querySelectorAll("[data-cuk-corner] input, [data-cuk-corner] select, [data-cuk-corner] textarea").forEach((field) => { field.disabled = !isCorner; });
    root.querySelectorAll("[data-cuk-standard] input, [data-cuk-standard] select, [data-cuk-standard] textarea").forEach((field) => { field.disabled = isSpecialist; });
    root.querySelectorAll("[data-cuk-measurement-basis] input, [data-cuk-measurement-basis] select, [data-cuk-measurement-basis] textarea").forEach((field) => { field.disabled = isBay || isCorner || isCurved || isSpecialist; });
    root.querySelectorAll("[data-cuk-width] input, [data-cuk-width] select, [data-cuk-width] textarea").forEach((field) => { field.disabled = isBay || isCorner || isSpecialist; });
    root.querySelectorAll("[data-cuk-specialist-shape] input, [data-cuk-specialist-shape] select, [data-cuk-specialist-shape] textarea").forEach((field) => { field.disabled = !isShapedSpecialist; });
    root.querySelectorAll("[data-cuk-awkward] input, [data-cuk-awkward] select, [data-cuk-awkward] textarea").forEach((field) => { field.disabled = !isAwkward; });
    root.querySelectorAll("[data-cuk-review-evidence] input, [data-cuk-review-evidence] select, [data-cuk-review-evidence] textarea").forEach((field) => { field.disabled = !needsEvidence; });
    root.querySelectorAll("[data-cuk-specialist-evidence] input, [data-cuk-specialist-evidence] select, [data-cuk-specialist-evidence] textarea").forEach((field) => { field.disabled = !isSpecialist; });
    const photos = root.querySelector('input[name="photos"]');
    const requiresPhoto = isSpecialist || windowType?.slug === "dormer-window" || windowType?.slug === "curved-bow-window" || windowType?.slug === "corner-window";
    if (photos) photos.required = requiresPhoto;
    const drawing = root.querySelector('input[name="drawing"]');
    if (drawing) drawing.required = isAwkward;
    const drawingLabel = root.querySelector("[data-cuk-drawing-label]");
    if (drawingLabel) drawingLabel.textContent = isAwkward ? "Simple drawing (required)" : "Optional drawing";
    const photoGuidance = root.querySelector("[data-cuk-photo-guidance]");
    if (photoGuidance) photoGuidance.textContent = isAwkward
      ? "Add at least one clear photograph of the complete window. A simple drawing is also required."
      : requiresPhoto
        ? "Add at least one clear photograph of the complete window. A drawing is optional."
      : "A photograph is optional, but can help our curtain team review the bay or unusual window.";
    const widthLabel = root.querySelector("[data-cuk-width-label]");
    if (widthLabel) widthLabel.textContent = isCurved ? "Track arc length (cm)" : "Width (cm)";
    root.querySelector("[data-cuk-width-hint]")?.classList.toggle("cuk-hidden", !isCurved);
    const form = root.querySelector(".cuk-form");
    replaceOptions(form?.elements.heading, windowType?.headings, {
      PENCIL_PLEAT: "Pencil pleat", WAVE: "Wave", EYELET: "Eyelet", DOUBLE_PINCH: "Double pinch pleat", TRIPLE_PINCH: "Triple pinch pleat", TAB_TOP: "Tab top",
    });
    replaceOptions(form?.elements.lining, windowType?.linings, {
      UNLINED: "Unlined", STANDARD: "Standard lining", BLACKOUT: "Blackout lining", THERMAL: "Thermal lining",
    });
    const status = root.querySelector("[data-cuk-route-status]");
    status.textContent = isSpecialist ? "Technical review" : isReview ? "Price with review" : "Instant staging price";
    status.classList.toggle("cuk-status--review", isReview || isSpecialist);
    const submit = root.querySelector(".cuk-form > button[type=submit]");
    if (submit) submit.textContent = isSpecialist ? "Prepare my review" : "Check my price or review route";
  }

  function option(label, value) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = label;
    return element;
  }

  async function initReviewedAcceptance(root, resume) {
    const panel = root.querySelector("[data-cuk-reviewed-resume]");
    const builder = root.querySelector("[data-cuk-configurator-builder]");
    if (!panel || (!resume.capability && !resume.error)) return false;
    panel.classList.remove("cuk-hidden");
    builder?.classList.add("cuk-hidden");
    root.querySelector("[data-cuk-route-status]").textContent = "Staff-reviewed staging checkout";
    root.querySelector("[data-cuk-reviewed-clear]")?.addEventListener("click", () => {
      sessionStorage.removeItem(REVIEW_RESUME_KEY);
    });
    const loadError = panel.querySelector("[data-cuk-reviewed-load-error]");
    const loading = panel.querySelector("[data-cuk-reviewed-loading]");
    if (resume.error) {
      loading.hidden = true;
      loadError.textContent = resume.error;
      loadError.hidden = false;
      panel.focus();
      return true;
    }

    try {
      const summary = await fetchJson(endpoint(root.dataset.engineBase, "review-acceptance"), {
        method: "POST",
        body: JSON.stringify(resume.capability),
      });
      if (summary.reviewRequestId !== resume.capability.reviewRequestId
          || summary.reviewState !== "READY_FOR_CHECKOUT"
          || summary.paymentEnabled !== false
          || summary.supplierCommercialDataIncluded !== false
          || !summary.price
          || !Number.isInteger(summary.price.grossAmountMinor)
          || summary.price.grossAmountMinor <= 0
          || summary.price.currency !== "GBP") {
        throw new Error("The approved review summary failed its staging safety checks.");
      }
      loading.hidden = true;
      panel.querySelector("[data-cuk-reviewed-content]").classList.remove("cuk-hidden");
      panel.querySelector("[data-cuk-reviewed-status]").textContent = summary.pricingOutcome === "MANUAL_QUOTE" ? "Approved staff quote" : "Approved after review";
      panel.querySelector("[data-cuk-reviewed-price]").textContent = `${money(summary.price.grossAmountMinor, summary.price.currency)} · VAT included`;
      panel.querySelector("[data-cuk-reviewed-reference]").textContent = summary.reference;
      panel.querySelector("[data-cuk-reviewed-window]").textContent = summary.window?.label || "Reviewed curtain";
      panel.querySelector("[data-cuk-reviewed-measurements]").textContent = measurementSummary(summary.measurements);
      panel.querySelector("[data-cuk-reviewed-fabric]").textContent = [summary.fabric?.brand, summary.fabric?.design, summary.fabric?.colour, summary.fabric?.supplierSku ? `Ref ${summary.fabric.supplierSku}` : null].filter(Boolean).join(" · ");
      panel.querySelector("[data-cuk-reviewed-heading]").textContent = humanise(summary.heading);
      panel.querySelector("[data-cuk-reviewed-lining]").textContent = humanise(summary.lining);
      panel.querySelector("[data-cuk-reviewed-construction]").textContent = humanise(summary.construction);
      panel.querySelector("[data-cuk-reviewed-availability]").textContent = summary.availability?.label || "Availability to be confirmed";
      panel.querySelector("[data-cuk-reviewed-price-summary]").textContent = `${money(summary.price.grossAmountMinor, summary.price.currency)} · VAT included`;
      panel.querySelector("[data-cuk-reviewed-delivery]").textContent = summary.delivery?.label || "Delivery shown separately";

      const form = panel.querySelector("[data-cuk-reviewed-checkout-form]");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const error = form.querySelector("[data-cuk-reviewed-error]");
        error.hidden = true;
        if (!form.reportValidity()) return;
        const submit = form.querySelector("button[type=submit]");
        submit.disabled = true;
        submit.textContent = "Re-checking approved revision…";
        emit("quote_accepted", {
          window_type: summary.window.slug,
          outcome: summary.pricingOutcome,
          configuration_id: summary.configurationId,
        });
        try {
          const handoff = await fetchJson(endpoint(root.dataset.engineBase, "checkout-handoff"), {
            method: "POST",
            body: JSON.stringify({
              reviewRequestId: resume.capability.reviewRequestId,
              reviewAcceptanceToken: resume.capability.reviewAcceptanceToken,
              customerAccepted: form.elements.customerAccepted.checked,
              shippingRegion: form.elements.shippingRegion.value,
              shippingPostcode: form.elements.shippingPostcode.value,
              parcelClass: summary.shippingParcelClass,
            }),
          });
          if (!handoff.prepared) {
            const blockers = Array.isArray(handoff.blockers) ? handoff.blockers.map((item) => humanise(item)).join(", ") : "a staging launch gate";
            throw new Error(`${handoff.message || "This reviewed configuration is not ready for checkout"} (${blockers}).`);
          }
          renderHandoffConfirmation(root, form.querySelector("[data-cuk-reviewed-confirmation]"), handoff);
          submit.textContent = "Test checkout prepared";
          emit("checkout_handoff_reached", {
            window_type: summary.window.slug,
            outcome: summary.pricingOutcome,
            configuration_id: summary.configurationId,
            handoff_id: handoff.handoffId,
          });
        } catch (caught) {
          error.textContent = caught.message;
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = "Prepare test checkout";
        }
      });
      panel.focus();
    } catch (caught) {
      loading.hidden = true;
      loadError.textContent = `${caught.message} The link may have expired or the approved specification may have changed. Ask the curtain team for a new link.`;
      loadError.hidden = false;
      sessionStorage.removeItem(REVIEW_RESUME_KEY);
      panel.focus();
    }
    return true;
  }

  async function initConfigurator(root) {
    const resume = reviewedResumeCapability();
    if (await initReviewedAcceptance(root, resume)) return;
    const form = root.querySelector(".cuk-form");
    const reviewForm = root.querySelector("[data-cuk-review-form]");
    const reviewConfirmation = root.querySelector("[data-cuk-review-confirmation]");
    const checkoutForm = root.querySelector("[data-cuk-checkout-form]");
    const errorBox = root.querySelector("[data-cuk-error]");
    const result = root.querySelector("[data-cuk-result]");
    const windowSelect = form.elements.windowSlug;
    const fabricSelect = form.elements.fabricId;
    const params = new URLSearchParams(location.search);
    let catalog;
    let lastEvaluation = null;

    try {
      catalog = await fetchJson(endpoint(root.dataset.engineBase, "catalog"));
      catalog.windows.forEach((item) => windowSelect.appendChild(option(item.name, item.slug)));
      catalog.fabrics.filter((item) => item.configurable === true).forEach((item) => fabricSelect.appendChild(option(`${item.brand || item.supplier} · ${item.design} — ${item.colour}`, item.id)));
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      form.querySelector("button[type=submit]").disabled = true;
      return;
    }

    const remembered = readJson(PROJECT_KEY, {});
    restoreProject(form, remembered);
    windowSelect.value = params.get("window") || root.dataset.windowSlug || remembered.windowSlug || "standard-window";
    const requestedFabric = params.get("fabric") || remembered.fabricId;
    const configurableFabrics = catalog.fabrics.filter((item) => item.configurable === true);
    fabricSelect.value = configurableFabrics.some((item) => item.id === requestedFabric) ? requestedFabric : configurableFabrics[0]?.id;
    if (requestedFabric && fabricSelect.value !== requestedFabric) {
      errorBox.textContent = "That fabric is not currently pricing-ready. We have kept the journey open with the first verified fabric instead.";
      errorBox.hidden = false;
    }
    renderBaySections(root, remembered.baySectionCount || 3, remembered.baySectionWidthsCm || []);
    setJourneyFields(root, catalog.windows.find((item) => item.slug === windowSelect.value));
    syncConfiguratorUrl(form);
    emit("configurator_started", { window_type: windowSelect.value, surface: "shopify_dawn" });

    windowSelect.addEventListener("change", () => {
      const selected = catalog.windows.find((item) => item.slug === windowSelect.value);
      setJourneyFields(root, selected);
      result.hidden = true;
      reviewForm.classList.add("cuk-hidden");
      checkoutForm.classList.add("cuk-hidden");
      reviewConfirmation.classList.add("cuk-hidden");
      rememberProject(projectSnapshot(form, root));
      syncConfiguratorUrl(form);
      emit("window_type_selected", { window_type: windowSelect.value });
    });
    fabricSelect.addEventListener("change", () => {
      rememberProject(projectSnapshot(form, root));
      syncConfiguratorUrl(form);
      emit("fabric_selected", { fabric_id: fabricSelect.value, window_type: windowSelect.value });
    });
    form.elements.baySectionCount.addEventListener("change", () => {
      const existing = baySectionWidths(root);
      renderBaySections(root, form.elements.baySectionCount.value, existing);
      rememberProject(projectSnapshot(form, root));
    });
    form.addEventListener("input", (event) => {
      if (event.target.type !== "file") {
        rememberProject(projectSnapshot(form, root));
        lastEvaluation = null;
        result.hidden = true;
        reviewForm.classList.add("cuk-hidden");
        checkoutForm.classList.add("cuk-hidden");
        const checkoutButton = checkoutForm.querySelector("button[type=submit]");
        if (checkoutButton) { checkoutButton.disabled = false; checkoutButton.textContent = "Prepare test checkout"; }
        checkoutForm.querySelector("[data-cuk-checkout-confirmation]")?.classList.add("cuk-hidden");
        reviewConfirmation.classList.add("cuk-hidden");
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorBox.hidden = true;
      result.hidden = true;
      if (!form.reportValidity()) {
        emit("validation_failure", { window_type: windowSelect.value, source: "browser" });
        return;
      }
      const selected = catalog.windows.find((item) => item.slug === windowSelect.value);
      emit("measurement_completion", { window_type: windowSelect.value, journey: selected.journey });
      const photoNames = [...(form.elements.photos.files || [])].map((file) => file.name);
      const drawingName = form.elements.drawing.files[0]?.name;
      let path = "price";
      let body;

      if (selected.journey === "SPECIALIST") {
        const isAwkward = selected.slug === "awkward-unusual-window";
        path = "specialist-review";
        body = {
          windowSlug: windowSelect.value,
          measurements: isAwkward
            ? {
                coverage_width: Number(form.elements.roughWidthCm.value),
                finished_drop: Number(form.elements.roughDropCm.value),
              }
            : {
                coverage_width: Number(form.elements.baseWidth.value),
                peak_height: Number(form.elements.peakHeight.value),
                left_vertical: Number(form.elements.leftVertical.value),
                right_vertical: Number(form.elements.rightVertical.value),
                left_slope: Number(form.elements.leftSlope.value),
                right_slope: Number(form.elements.rightSlope.value),
              },
          fabricId: fabricSelect.value,
          heading: form.elements.heading.value,
          lining: form.elements.lining.value,
          construction: form.elements.construction.value,
          fixingPosition: isAwkward ? form.elements.awkwardFixingPosition.value : form.elements.fixingPosition.value,
          stackDirection: form.elements.stackDirection.value,
          photoNames,
          drawingName,
        };
      } else {
        const segments = baySectionWidths(root);
        const isBay = selected.slug === "bay-window";
        const isCorner = selected.slug === "corner-window";
        const isCurved = selected.slug === "curved-bow-window";
        const cornerSections = [Number(form.elements.cornerSectionOneCm.value), Number(form.elements.cornerSectionTwoCm.value)];
        const derivedWidth = isCorner
          ? cornerSections.reduce((total, width) => total + width, 0)
          : segments.reduce((total, width) => total + width, 0);
        if (isBay && (segments.some((width) => !Number.isFinite(width) || width < 10 || width > 600) || derivedWidth < 30 || derivedWidth > 1200)) {
          errorBox.textContent = "Check each bay section width. The total curtain coverage must be between 30 cm and 1,200 cm.";
          errorBox.hidden = false;
          emit("validation_failure", { window_type: windowSelect.value, source: "browser", field: "bay_sections" });
          return;
        }
        const cornerAngle = Number(form.elements.cornerAngleDegrees.value);
        if (isCorner && (cornerSections.some((width) => !Number.isFinite(width) || width < 10 || width > 600) || derivedWidth < 30 || derivedWidth > 1200 || !Number.isFinite(cornerAngle) || cornerAngle < 1 || cornerAngle > 359)) {
          errorBox.textContent = "Check both corner section widths and enter one corner angle between 1° and 359°.";
          errorBox.hidden = false;
          emit("validation_failure", { window_type: windowSelect.value, source: "browser", field: "corner_geometry" });
          return;
        }
        body = {
          windowSlug: windowSelect.value,
          measurementBasis: isBay || isCorner || isCurved ? "TRACK_WIDTH" : form.elements.measurementBasis.value,
          widthCm: isBay || isCorner ? derivedWidth : Number(form.elements.widthCm.value),
          dropCm: Number(form.elements.dropCm.value),
          bayTrackOrPoleFitted: isBay ? form.elements.trackOrPoleFitted.value === "YES" : undefined,
          bayNumberOfSections: isBay ? segments.length : undefined,
          baySegmentWidthsCm: isBay ? segments : undefined,
          cornerSectionWidthsCm: isCorner ? cornerSections : undefined,
          cornerAngleDegrees: isCorner ? cornerAngle : undefined,
          fabricId: fabricSelect.value,
          heading: form.elements.heading.value,
          lining: form.elements.lining.value,
          construction: form.elements.construction.value,
          stackDirection: form.elements.stackDirection.value,
          photoNames,
        };
      }

      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      submit.textContent = "Checking…";
      try {
        emit("configurator_step_completed", { step: "specification", window_type: windowSelect.value });
        const response = await fetchJson(endpoint(root.dataset.engineBase, path), { method: "POST", body: JSON.stringify(body) });
        const isManualQuote = response.outcome === "MANUAL_QUOTE";
        const isPriceWithReview = response.outcome === "PRICE_WITH_REVIEW";
        const needsReview = isManualQuote || isPriceWithReview;
        const routeStatus = root.querySelector("[data-cuk-route-status]");
        routeStatus.textContent = isManualQuote ? "Manual quote" : isPriceWithReview ? "Price with review" : "Instant staging price";
        routeStatus.classList.toggle("cuk-status--review", needsReview);
        const evidence = root.querySelector("[data-cuk-review-evidence]");
        if (needsReview && evidence) {
          evidence.classList.remove("cuk-hidden");
          evidence.querySelectorAll("input, select, textarea").forEach((field) => { field.disabled = false; });
          if (selected.journey !== "SPECIALIST") {
            evidence.querySelectorAll("[data-cuk-specialist-evidence]").forEach((item) => item.classList.add("cuk-hidden"));
            evidence.querySelectorAll("[data-cuk-specialist-evidence] input, [data-cuk-specialist-evidence] select, [data-cuk-specialist-evidence] textarea").forEach((field) => { field.disabled = true; });
          }
        }
        const selectedFabric = response.selectedFabric || catalog.fabrics.find((fabric) => fabric.id === fabricSelect.value);
        const widthSummary = selected.slug === "bay-window"
          ? `${body.widthCm} cm total across ${body.bayNumberOfSections} sections`
          : selected.slug === "corner-window"
            ? `${body.widthCm} cm total across two sections · ${body.cornerAngleDegrees}° corner`
            : selected.slug === "curved-bow-window"
              ? `${body.widthCm} cm track arc × ${body.dropCm} cm drop`
          : selected.journey === "SPECIALIST"
            ? selected.slug === "awkward-unusual-window"
              ? `${body.measurements.coverage_width} cm rough width × ${body.measurements.finished_drop} cm rough height`
              : `${body.measurements.coverage_width} cm base × ${body.measurements.peak_height} cm peak`
            : `${body.widthCm} cm width × ${body.dropCm} cm drop`;
        const outcomeBadge = result.querySelector("[data-cuk-result-outcome]");
        outcomeBadge.textContent = response.outcome.replaceAll("_", " ");
        outcomeBadge.classList.toggle("cuk-status--review", needsReview);
        const price = result.querySelector("[data-cuk-result-price]");
        price.classList.toggle("cuk-result__price--message", isManualQuote);
        price.textContent = isManualQuote
          ? "Price confirmed after technical review"
          : Number.isFinite(response.totalAmountMinor)
            ? `${isPriceWithReview ? "Provisional price " : ""}${money(response.totalAmountMinor, response.currency)}`
            : "Technical review required";
        result.querySelector("[data-cuk-result-message]").textContent = [
          response.message,
          "VAT included.",
          response.availability || "Availability to be confirmed",
          response.delivery || "Delivery shown separately.",
        ].filter(Boolean).join(" · ");
        const priceLabel = isManualQuote
          ? "Confirmed after technical review"
          : Number.isFinite(response.totalAmountMinor)
            ? `${money(response.totalAmountMinor, response.currency)} · VAT included`
            : "Not available";
        result.querySelector("[data-cuk-summary-window]").textContent = selected.name;
        result.querySelector("[data-cuk-summary-dimensions]").textContent = widthSummary;
        result.querySelector("[data-cuk-summary-fabric]").textContent = selectedFabric
          ? `${selectedFabric.design} — ${selectedFabric.colour}`
          : "Fabric selection unavailable";
        result.querySelector("[data-cuk-summary-heading]").textContent = form.elements.heading.selectedOptions[0]?.textContent || form.elements.heading.value;
        result.querySelector("[data-cuk-summary-lining]").textContent = form.elements.lining.selectedOptions[0]?.textContent || form.elements.lining.value;
        result.querySelector("[data-cuk-summary-construction]").textContent = form.elements.construction.selectedOptions[0]?.textContent || form.elements.construction.value;
        result.querySelector("[data-cuk-summary-availability]").textContent = response.availability || "Availability to be confirmed";
        result.querySelector("[data-cuk-summary-price]").textContent = priceLabel;
        result.querySelector("[data-cuk-summary-delivery]").textContent = response.delivery || "Delivery shown separately";
        result.querySelector("[data-cuk-summary-review]").textContent = needsReview ? "Required before checkout" : "Not required";
        result.querySelector("[data-cuk-result-spec]").textContent = [
          selected.name,
          widthSummary,
          selectedFabric ? `${selectedFabric.design} — ${selectedFabric.colour}` : null,
          form.elements.heading.selectedOptions[0]?.textContent,
          form.elements.lining.selectedOptions[0]?.textContent,
          form.elements.construction.selectedOptions[0]?.textContent,
          response.fabricWidths ? `${response.fabricWidths} fabric widths` : null,
        ].filter(Boolean).join(" · ");
        lastEvaluation = { configuration: body, calculation: response };
        reviewForm.classList.toggle("cuk-hidden", !needsReview);
        checkoutForm.classList.toggle("cuk-hidden", needsReview || isManualQuote || response.outcome !== "INSTANT_PRICE");
        // Preserve the delivery destination while requiring acceptance of every new price.
        checkoutForm.elements.customerAccepted.checked = false;
        const previousCheckoutError = checkoutForm.querySelector("[data-cuk-checkout-error]");
        previousCheckoutError.hidden = true;
        previousCheckoutError.textContent = "";
        checkoutForm.querySelector("[data-cuk-checkout-confirmation]")?.classList.add("cuk-hidden");
        const checkoutButton = checkoutForm.querySelector("button[type=submit]");
        if (checkoutButton) { checkoutButton.disabled = false; checkoutButton.textContent = "Prepare test checkout"; }
        const notice = result.querySelector("[data-cuk-result-notice]");
        if (notice) notice.textContent = needsReview
          ? "Checkout is unavailable. This project must be reviewed before payment or manufacture."
          : "Staging price only. Shopify test checkout is available only when every launch gate passes; real payment remains disabled.";
        reviewConfirmation.classList.add("cuk-hidden");
        result.hidden = false;
        rememberProject({ ...projectSnapshot(form, root), lastOutcome: response.outcome });
        if (Number.isFinite(response.totalAmountMinor) && !isManualQuote) {
          emit("price_displayed", { window_type: windowSelect.value, outcome: response.outcome, amount_minor: response.totalAmountMinor, currency: response.currency, calculation_version: response.calculationVersion || null });
        }
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        emit("validation_failure", { window_type: windowSelect.value, source: "server" });
      } finally {
        submit.disabled = false;
        submit.textContent = selected.journey === "SPECIALIST" ? "Prepare my review" : "Check my price or review route";
      }
    });

    reviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const reviewError = reviewForm.querySelector("[data-cuk-review-error]");
      reviewError.hidden = true;
      if (!reviewForm.reportValidity() || !lastEvaluation) return;
      const payload = new FormData();
      payload.set("configuration", JSON.stringify(lastEvaluation.configuration));
      payload.set("calculation", JSON.stringify(lastEvaluation.calculation));
      payload.set("contactName", reviewForm.elements.customerName.value);
      payload.set("contactEmail", reviewForm.elements.customerEmail.value);
      payload.set("contactPhone", reviewForm.elements.customerPhone.value);
      payload.set("notes", reviewForm.elements.customerNotes.value);
      [...(form.elements.photos.files || [])].forEach((file) => payload.append("photos", file));
      if (form.elements.drawing.files[0]) payload.set("drawing", form.elements.drawing.files[0]);

      const submit = reviewForm.querySelector("button[type=submit]");
      submit.disabled = true;
      submit.textContent = "Submitting…";
      try {
        const response = await fetchJson(endpoint(root.dataset.engineBase, root.dataset.reviewPath || "review-request"), { method: "POST", body: payload });
        reviewForm.classList.add("cuk-hidden");
        reviewConfirmation.innerHTML = `<h2>Project received</h2><p>${escapeHtml(response.message || "Our curtain team will review the measurements and contact you with the next step.")}</p><p class="cuk-hint">Reference ${escapeHtml(response.requestId)} · No payment has been taken.</p>`;
        reviewConfirmation.classList.remove("cuk-hidden");
        reviewConfirmation.focus();
        emit("review_submitted", { window_type: form.elements.windowSlug.value, outcome: lastEvaluation.calculation.outcome, configuration_id: response.configurationId || null });
      } catch (error) {
        reviewError.textContent = error.message;
        reviewError.hidden = false;
      } finally {
        submit.disabled = false;
        submit.textContent = "Submit project for review";
      }
    });

    checkoutForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const checkoutError = checkoutForm.querySelector("[data-cuk-checkout-error]");
      checkoutError.hidden = true;
      if (!checkoutForm.reportValidity() || !lastEvaluation || lastEvaluation.calculation.outcome !== "INSTANT_PRICE") return;
      const submit = checkoutForm.querySelector("button[type=submit]");
      submit.disabled = true;
      submit.textContent = "Validating and freezing…";
      emit("quote_accepted", {
        window_type: lastEvaluation.configuration.windowSlug,
        outcome: lastEvaluation.calculation.outcome,
        configuration_id: lastEvaluation.calculation.configurationId,
      });
      try {
        const handoff = await fetchJson(endpoint(root.dataset.engineBase, "checkout-handoff"), {
          method: "POST",
          body: JSON.stringify({
            configuration: lastEvaluation.configuration,
            configurationId: lastEvaluation.calculation.configurationId,
            customerAccepted: checkoutForm.elements.customerAccepted.checked,
            shippingRegion: checkoutForm.elements.shippingRegion.value,
            shippingPostcode: checkoutForm.elements.shippingPostcode.value,
            parcelClass: lastEvaluation.calculation.fabricWidths > 6 ? "OVERSIZE" : "STANDARD",
          }),
        });
        if (!handoff.prepared) {
          const blockers = Array.isArray(handoff.blockers) ? handoff.blockers.map((item) => String(item).replaceAll("_", " ").toLowerCase()).join(", ") : "a launch gate";
          throw new Error(`${handoff.message || "This configuration is not ready for checkout"} (${blockers}).`);
        }
        const confirmation = checkoutForm.querySelector("[data-cuk-checkout-confirmation]");
        renderHandoffConfirmation(root, confirmation, handoff);
        submit.textContent = handoff.checkoutUrl ? "Test checkout prepared" : "Staging total validated";
        result.querySelector("[data-cuk-summary-review]").textContent = handoff.checkoutUrl ? "Shopify test checkout ready" : "Validated for staging";
        emit("checkout_handoff_reached", {
          window_type: lastEvaluation.configuration.windowSlug,
          outcome: lastEvaluation.calculation.outcome,
          configuration_id: lastEvaluation.calculation.configurationId,
          handoff_id: handoff.handoffId,
        });
      } catch (error) {
        checkoutError.textContent = error.message;
        checkoutError.hidden = false;
        submit.disabled = false;
        submit.textContent = "Prepare test checkout";
      }
    });
  }

  document.querySelectorAll("[data-cuk-configurator]").forEach(initConfigurator);
  document.querySelectorAll("[data-cuk-fabric-browser]").forEach(initFabricBrowser);
  renderBaskets();
})();
