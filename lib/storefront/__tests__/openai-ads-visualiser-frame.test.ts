import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const theme = readFileSync(path.join(process.cwd(), "shopify-theme/curtainsuk-dawn-16/layout/theme.liquid"), "utf8");
const bridge = theme.match(/<!-- CurtainsUK OpenAI Ads measurement bridge -->\s*<script>([\s\S]*?)<\/script>/)![1];
class Surface {
  listeners = new Map<string, Array<(event: unknown) => void>>();
  addEventListener(name: string, callback: (event: unknown) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), callback]);
  }
  fire(name: string, detail?: unknown) { this.listeners.get(name)?.forEach(callback => callback({ detail })); }
}
const roomUrl = "https://www.curtainsuk.com/apps/curtainsuk-decision/room-visualiser?room=living";
function fixture(url = roomUrl, allowed = true, loading = false) {
  const calls: unknown[][] = [];
  const child = Object.assign(new Surface(), { URL: url });
  const frame = Object.assign(new Surface(), { contentWindow: { document: child } });
  const document = Object.assign(new Surface(), {
    title: "Room Visualiser", cookie: "", readyState: loading ? "loading" : "complete",
    querySelectorAll: (selector: string) => selector.startsWith("iframe[") ? [frame] : [],
  });
  const window = Object.assign(new Surface(), {
    location: { pathname: "/pages/room-visualiser", href: "https://www.curtainsuk.com/pages/room-visualiser" },
    oaiq: (...args: unknown[]) => calls.push(args), dataLayer: [] as Array<{event: string; fabric_id?: string}>,
    Shopify: { customerPrivacy: { marketingAllowed: () => allowed }, loadFeatures(_features: unknown, done: (error: null) => void) { done(null); } },
  });
  vm.runInNewContext(bridge, { window, document, URL, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
  if (loading) document.fire("DOMContentLoaded");
  return { window, document, frame, child, calls };
}
test("published room iframe selection reaches website diagnostics and custom Pixel measurement only", () => {
  const f = fixture();
  f.child.fire("curtainsuk:visualiser-select", { fabric: { id: "sdg-f1325-02" } });
  assert.equal(f.window.dataLayer.filter(row => row.event === "curtainsuk_room_visualiser_used" && row.fabric_id === "sdg-f1325-02").length, 1);
  const events = f.calls.filter(call => call[0] === "measure" && call[1] !== "page_viewed");
  assert.equal(events.length, 1);
  assert.equal(events[0][1], "custom");
  assert.equal((events[0][3] as {custom_event_name: string}).custom_event_name, "room_visualiser_used");
});
test("iframe load and retry bind each document once and allow a replacement room document", () => {
  const f = fixture(roomUrl, true, true);
  f.frame.fire("load"); f.frame.fire("load");
  f.child.fire("curtainsuk:visualiser-select", { fabric: { id: "first" } });
  const next = Object.assign(new Surface(), { URL: roomUrl.replace("living", "bedroom") });
  f.frame.contentWindow.document = next;
  f.frame.fire("load"); f.frame.fire("load");
  next.fire("curtainsuk:visualiser-select", { fabric: { id: "second" } });
  assert.deepEqual(Array.from(f.window.dataLayer, row => row.fabric_id), ["first", "second"]);
});
for (const url of ["about:blank", "https://example.invalid/apps/curtainsuk-decision/room-visualiser", "https://www.curtainsuk.com/checkout"]) {
  test(`unrelated frame cannot supply room measurements: ${url}`, () => {
    const f = fixture(url); f.child.fire("curtainsuk:visualiser-select", { fabric: { id: "untrusted" } });
    assert.equal(f.window.dataLayer.length, 0);
  });
}
test("inaccessible frame does not break the bridge and preserves denied consent", () => {
  const f = fixture("about:blank", false);
  Object.defineProperty(f.frame.contentWindow, "document", { get() { throw new Error("SecurityError"); } });
  assert.doesNotThrow(() => f.frame.fire("load"));
  assert.deepEqual(f.calls.filter(call => call[0] === "consent").at(-1), ["consent", false]);
  assert.equal(f.calls.filter(call => call[0] === "measure").length, 0);
});
