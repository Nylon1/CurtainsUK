import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("resumed price summary follows asynchronous catalogue hydration without changing steps", () => {
  const source = readFileSync("shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-premium.js", "utf8");
  const block = source.slice(source.indexOf("    const summary = document.createElement('p');"), source.indexOf("    const nav = document.createElement('nav');"));
  const summary = { textContent: "", className: "" };
  const elements = Object.fromEntries(Object.entries({ windowSlug: "Choose a window", fabricId: "Loading fabrics…", heading: "Pencil pleat", lining: "Standard lining", construction: "Pair" }).map(([key, textContent]) => [key, { selectedOptions: [{ textContent }] }]));
  const observers: (() => void)[] = [];
  const events: Record<string, () => void> = {};
  let guideUpdates = 0;
  runInNewContext(block, {
    updateMeasureHelp: () => { guideUpdates++; },
    document: { createElement: () => summary },
    panes: Array.from({ length: 7 }, () => ({ prepend() {} })),
    form: { elements, addEventListener: (event: string, fn: () => void) => { events[event] = fn; } },
    MutationObserver: class { constructor(fn: () => void) { observers.push(fn); } observe() {} },
  });
  elements.windowSlug.selectedOptions[0].textContent = "Standard window";
  elements.fabricId.selectedOptions[0].textContent = "Sadira — Lagoon";
  observers.forEach((fn) => fn());
  assert.equal(summary.textContent, "Standard window · Sadira — Lagoon · Pencil pleat · Standard lining · Pair");
  elements.lining.selectedOptions[0].textContent = "Bonded lining / interlining";
  events.change();
  assert.match(summary.textContent, /Bonded lining/);
  assert.equal(guideUpdates, 3);
});
