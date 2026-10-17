document.querySelectorAll("[data-guide-motor]").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll("[data-guide-motor]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      document
        .querySelectorAll("[data-motor]")
        .forEach((x) => (x.hidden = x.dataset.motor !== b.dataset.guideMotor));
    }),
);
document.getElementById("guide-mount").onchange = (e) => {
  document.getElementById("ceiling-diagram").hidden =
    e.target.value !== "CEILING";
  document.getElementById("wall-diagram").hidden = e.target.value !== "WALL";
};
document.getElementById("print-guide").onclick = () => window.print();
new ResizeObserver(() => {
  if (parent !== window)
    parent.postMessage(
      {
        type: "curtainsuk-smart-track-height",
        height: Math.ceil(document.documentElement.scrollHeight),
      },
      location.origin,
    );
}).observe(document.body);

document.querySelectorAll('a[href^="#"]').forEach(
  (a) =>
    (a.onclick = (e) => {
      e.preventDefault();
      document
        .querySelector(a.getAttribute("href"))
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "auto"
            : "smooth",
        });
    }),
);
