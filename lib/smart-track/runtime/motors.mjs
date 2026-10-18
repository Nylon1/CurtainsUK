const partDescriptions = {
  1: ["Shuttle motor", "The motor drives the curtain movement from one end of the track. It is concealed behind the curtains in the finished room."],
  2: ["Motor pulley", "This drive-end assembly connects the motor to the track mechanism, passing its movement along the rail."],
  3: ["Track", "The rail guides the carriers along the window. Your CurtainsUK track is straight and cut to the exact length on your order."],
  4: ["Return pulley", "At the opposite end, this pulley returns the drive through the track to complete the movement mechanism."],
  5: ["Gliders", "These carry the curtain along the track. Carrier requirements depend on the heading; wave orders specify 60 mm or 80 mm spacing."],
  6: ["Underlap master carrier", "One of the leading carriers shown in Forest's centre-opening arrangement. It carries a leading curtain edge towards the centre."],
  7: ["Overlap master carrier", "The other leading carrier in the illustrated arrangement allows the curtain edges to overlap when closed. Your carrier arrangement follows the ordered heading and opening."],
  8: ["Stiffeners", "Forest identifies these small support pieces in the illustrated master-carrier assembly. The diagram explains the parts; your supplied fittings follow your order."],
};

document.querySelectorAll("[data-model-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-model-choice]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
    document.querySelectorAll("[data-model]").forEach((panel) => { panel.hidden = panel.dataset.model !== button.dataset.modelChoice; });
  });
});

document.querySelectorAll("[data-part]").forEach((button) => {
  button.addEventListener("click", () => {
    const part = button.dataset.part;
    const [title, description] = partDescriptions[part];
    document.querySelectorAll("[data-part]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice.dataset.part === part)));
    document.getElementById("part-number").textContent = part.padStart(2, "0");
    document.getElementById("part-title").textContent = title;
    document.getElementById("part-description").textContent = description;
  });
});

const technicalToggle = document.getElementById("technical-toggle");
const technicalRows = document.getElementById("technical-rows");
technicalToggle.hidden = false;
technicalRows.hidden = true;
technicalToggle.addEventListener("click", () => {
  technicalRows.hidden = !technicalRows.hidden;
  technicalToggle.setAttribute("aria-expanded", String(!technicalRows.hidden));
  technicalToggle.textContent = technicalRows.hidden ? "Show technical details +" : "Hide technical details −";
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector(link.getAttribute("href"))?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth",
    });
  });
});

new ResizeObserver(() => {
  if (parent !== window) parent.postMessage({ type: "curtainsuk-smart-track-height", height: Math.ceil(document.documentElement.scrollHeight) }, location.origin);
}).observe(document.body);
