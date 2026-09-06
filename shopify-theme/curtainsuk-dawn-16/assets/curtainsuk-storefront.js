(() => {
  const SAMPLE_KEY = "curtainsuk_staging_samples_v1";
  const PROJECT_KEY = "curtainsuk_staging_project_v1";

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

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "Accept": "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The staging service could not complete this request.");
    return data;
  }

  function rememberProject(values) {
    localStorage.setItem(PROJECT_KEY, JSON.stringify({ ...values, updatedAt: new Date().toISOString() }));
  }

  function addSample(fabric, windowSlug) {
    const samples = readJson(SAMPLE_KEY, []);
    if (!samples.some((item) => item.fabricId === fabric.id)) {
      samples.push({ fabricId: fabric.id, sku: fabric.uniqueSku, design: fabric.design, colour: fabric.colour, windowSlug, addedAt: new Date().toISOString() });
      localStorage.setItem(SAMPLE_KEY, JSON.stringify(samples));
    }
    emit("sample_intended", { fabric_id: fabric.id, window_type: windowSlug || null });
    renderBaskets();
  }

  function renderBaskets() {
    const samples = readJson(SAMPLE_KEY, []);
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
  }

  function renderFabricCards(root, catalog) {
    const grid = root.querySelector("[data-cuk-fabric-grid]");
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const selectedWindow = params.get("window") || readJson(PROJECT_KEY, {}).windowSlug || "standard-window";
    grid.innerHTML = "";
    catalog.fabrics.forEach((fabric) => {
      const card = document.createElement("article");
      card.className = "cuk-fabric";
      const repeat = fabric.verticalRepeatMm ? `${fabric.verticalRepeatMm / 10} cm vertical repeat` : "No pattern repeat";
      const composition = fabric.composition.map((part) => `${part.percentage}% ${part.material}`).join(", ");
      card.innerHTML = `
        <div class="cuk-fabric__swatch"><img src="${escapeHtml(fabric.imageReferences[0])}" alt="${escapeHtml(fabric.design)} in ${escapeHtml(fabric.colour)} by Prestigious Textiles"></div>
        <div class="cuk-fabric__body">
          <p class="cuk-eyebrow">${escapeHtml(fabric.supplier)} · ${escapeHtml(fabric.collection)}</p>
          <h3>${escapeHtml(fabric.design)} — ${escapeHtml(fabric.colour)}</h3>
          <p>${fabric.usableWidthMm / 10} cm usable width · ${repeat}</p>
          <p>${escapeHtml(composition)}</p>
          <p class="cuk-hint">${escapeHtml(fabric.availability)}</p>
          <div class="cuk-fabric__actions">
            <button class="cuk-button cuk-button--secondary" type="button" data-sample>Order sample</button>
            <a class="cuk-button" href="/pages/configure-curtains?window=${encodeURIComponent(selectedWindow)}&fabric=${encodeURIComponent(fabric.id)}">Use this fabric</a>
          </div>
        </div>`;
      card.querySelector("[data-sample]").addEventListener("click", () => addSample(fabric, selectedWindow));
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
      renderFabricCards(root, catalog);
    } catch (error) {
      root.querySelector("[data-cuk-error]").textContent = error.message;
      root.querySelector("[data-cuk-error]").hidden = false;
    }
  }

  function setJourneyFields(root, windowType) {
    const isBay = windowType?.journey === "REVIEW" && windowType.slug === "bay-window";
    const isSpecialist = windowType?.journey === "SPECIALIST";
    root.querySelectorAll("[data-cuk-bay]").forEach((item) => item.classList.toggle("cuk-hidden", !isBay));
    root.querySelectorAll("[data-cuk-standard]").forEach((item) => item.classList.toggle("cuk-hidden", isSpecialist));
    root.querySelectorAll("[data-cuk-specialist]").forEach((item) => item.classList.toggle("cuk-hidden", !isSpecialist));
    root.querySelectorAll("[data-cuk-bay] input, [data-cuk-bay] select, [data-cuk-bay] textarea").forEach((field) => { field.disabled = !isBay; });
    root.querySelectorAll("[data-cuk-standard] input, [data-cuk-standard] select, [data-cuk-standard] textarea").forEach((field) => { field.disabled = isSpecialist; });
    root.querySelectorAll("[data-cuk-specialist] input, [data-cuk-specialist] select, [data-cuk-specialist] textarea").forEach((field) => { field.disabled = !isSpecialist; });
    const photos = root.querySelector('input[name="photos"]');
    if (photos) photos.required = isSpecialist;
    const status = root.querySelector("[data-cuk-route-status]");
    status.textContent = isSpecialist ? "Technical review" : isBay ? "Price with review" : "Instant staging price";
    status.classList.toggle("cuk-status--review", isBay || isSpecialist);
  }

  function option(label, value) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = label;
    return element;
  }

  async function initConfigurator(root) {
    const form = root.querySelector("form");
    const errorBox = root.querySelector("[data-cuk-error]");
    const result = root.querySelector("[data-cuk-result]");
    const windowSelect = form.elements.windowSlug;
    const fabricSelect = form.elements.fabricId;
    const params = new URLSearchParams(location.search);
    let catalog;

    try {
      catalog = await fetchJson(endpoint(root.dataset.engineBase, "catalog"));
      catalog.windows.forEach((item) => windowSelect.appendChild(option(item.name, item.slug)));
      catalog.fabrics.forEach((item) => fabricSelect.appendChild(option(`${item.design} — ${item.colour}`, item.id)));
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      form.querySelector("button[type=submit]").disabled = true;
      return;
    }

    const remembered = readJson(PROJECT_KEY, {});
    windowSelect.value = params.get("window") || root.dataset.windowSlug || remembered.windowSlug || "standard-window";
    fabricSelect.value = params.get("fabric") || remembered.fabricId || catalog.fabrics[0]?.id;
    setJourneyFields(root, catalog.windows.find((item) => item.slug === windowSelect.value));
    emit("configurator_started", { window_type: windowSelect.value, surface: "shopify_dawn" });

    windowSelect.addEventListener("change", () => {
      const selected = catalog.windows.find((item) => item.slug === windowSelect.value);
      setJourneyFields(root, selected);
      rememberProject({ windowSlug: windowSelect.value, fabricId: fabricSelect.value });
      emit("window_type_selected", { window_type: windowSelect.value });
    });
    fabricSelect.addEventListener("change", () => {
      rememberProject({ windowSlug: windowSelect.value, fabricId: fabricSelect.value });
      emit("fabric_selected", { fabric_id: fabricSelect.value, window_type: windowSelect.value });
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
      const photoNames = [...(form.elements.photos.files || [])].map((file) => file.name);
      const drawingName = form.elements.drawing.files[0]?.name;
      let path = "price";
      let body;

      if (selected.journey === "SPECIALIST") {
        path = "specialist-review";
        body = {
          windowSlug: windowSelect.value,
          measurements: {
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
          fixingPosition: form.elements.fixingPosition.value,
          stackDirection: form.elements.stackDirection.value,
          photoNames,
          drawingName,
        };
      } else {
        body = {
          windowSlug: windowSelect.value,
          measurementBasis: form.elements.measurementBasis.value,
          widthCm: Number(form.elements.widthCm.value),
          dropCm: Number(form.elements.dropCm.value),
          baySegmentWidthsCm: form.elements.baySegments.value.split(",").map(Number).filter(Number.isFinite),
          bayAnglesDegrees: form.elements.bayAngles.value.split(",").map(Number).filter(Number.isFinite),
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
        result.querySelector("[data-cuk-result-outcome]").textContent = response.outcome.replaceAll("_", " ");
        result.querySelector("[data-cuk-result-price]").textContent = response.totalAmountMinor ? money(response.totalAmountMinor, response.currency) : "Technical review";
        result.querySelector("[data-cuk-result-message]").textContent = response.message || (response.technicalReviewRequired ? "Price subject to technical review" : `VAT included. Delivery shown separately. ${response.availability || "Availability to be confirmed"}.`);
        result.querySelector("[data-cuk-result-spec]").textContent = response.fabricWidths ? `${response.fabricWidths} fabric widths · ${response.selectedFabric.design} ${response.selectedFabric.colour}` : "Payment and production remain blocked pending review.";
        result.hidden = false;
        rememberProject({ windowSlug: windowSelect.value, fabricId: fabricSelect.value, lastOutcome: response.outcome });
        emit(response.totalAmountMinor ? "price_displayed" : "quote_review_submitted", { window_type: windowSelect.value, outcome: response.outcome, calculation_version: response.calculationVersion || null });
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        emit("validation_failure", { window_type: windowSelect.value, source: "server" });
      } finally {
        submit.disabled = false;
        submit.textContent = "Check my price or review route";
      }
    });
  }

  document.querySelectorAll("[data-cuk-configurator]").forEach(initConfigurator);
  document.querySelectorAll("[data-cuk-fabric-browser]").forEach(initFabricBrowser);
  renderBaskets();
})();
