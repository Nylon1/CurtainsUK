import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const theme = readFileSync(path.join(process.cwd(), "shopify-theme/curtainsuk-dawn-16/layout/theme.liquid"), "utf8");
const bridge = theme.match(/<!-- CurtainsUK OpenAI Ads measurement bridge -->\s*<script>([\s\S]*?)<\/script>/)![1];

for (const synchronous of [true, false]) {
  for (const allowed of [true, false]) {
    test(`fabric profile measurement respects consent with ${synchronous ? "cached" : "deferred"} Shopify privacy callback (${allowed})`, () => {
      const calls: unknown[][] = [];
      let callback: (() => void) | undefined;
      const window = {
        location: { pathname: "/pages/fabric/pt-1204-212", href: "https://www.curtainsuk.com/pages/fabric/pt-1204-212" },
        oaiq: (...args: unknown[]) => calls.push(args),
        dataLayer: [] as Array<{ event: string; fabric_id?: string }>,
        addEventListener() {},
        Shopify: {
          customerPrivacy: { marketingAllowed: () => allowed },
          loadFeatures(_features: unknown, done: (error: null) => void) {
            if (synchronous) done(null);
            else callback = () => done(null);
          },
        },
      };
      const document = { title: "Synthetic fabric", cookie: "", readyState: "complete", addEventListener() {}, querySelectorAll: () => [] };
      const localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
      vm.runInNewContext(bridge, { window, document, localStorage, URL });
      callback?.();
      assert.equal(calls.filter(call => call[1] === "page_viewed").length, allowed ? 1 : 0);
      assert.equal(calls.filter(call => call[1] === "contents_viewed").length, allowed ? 1 : 0);
      assert.equal(window.dataLayer.filter(event => event.event === "curtainsuk_fabric_profile_viewed" && event.fabric_id === "pt-1204-212").length, allowed ? 1 : 0);
      assert.deepEqual(calls.filter(call => call[0] === "consent").at(-1), ["consent", allowed]);
    });
  }
}

test("opening a second consented tab does not revoke the first tab's Pixel consent", () => {
  const pixels: Array<{ allowed: boolean; events: unknown[][] }> = [];
  const openTab = () => {
    const pixel = { allowed: false, events: [] as unknown[][] }; pixels.push(pixel);
    const listeners = new Map<string, (event: any) => void>();
    const window = {
      location: { pathname: "/", href: "https://www.curtainsuk.com/" }, dataLayer: [],
      oaiq: (...args: unknown[]) => {
        // The SDK propagates persisted denial to other tabs, but not grants.
        if (args[0] === "consent") {
          pixel.allowed = args[1] === true;
          if (!pixel.allowed) pixels.forEach(other => { other.allowed = false; });
        }
        if (args[0] === "measure" && pixel.allowed) pixel.events.push(args);
      },
      addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
      Shopify: { customerPrivacy: { marketingAllowed: () => true }, loadFeatures(_features: unknown, done: (error: null) => void) { done(null); } },
    };
    const document = { title: "Synthetic", cookie: "", readyState: "complete", addEventListener() {}, querySelectorAll: () => [] };
    vm.runInNewContext(bridge, { window, document, URL, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
    return { pixel, select: () => listeners.get("curtainsuk:analytics")?.({ detail: { event: "fabric_selected", fabric_id: "synthetic" } }) };
  };
  const first = openTab(); openTab(); first.select();
  assert.equal(first.pixel.allowed, true);
  assert.equal(first.pixel.events.filter(call => call[1] === "contents_viewed").length, 1);
});

test("unknown consent sends nothing and a later denial cannot replay queued commerce events", () => {
  const calls: unknown[][] = [];
  let done: ((error: null) => void) | undefined;
  const listeners = new Map<string, (event: any) => void>();
  const window = {
    location: { pathname: "/", href: "https://www.curtainsuk.com/" }, dataLayer: [],
    oaiq: (...args: unknown[]) => calls.push(args),
    addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
    Shopify: { customerPrivacy: { marketingAllowed: () => false }, loadFeatures(_features: unknown, callback: (error: null) => void) { done = callback; } },
  };
  const document = { title: "Synthetic", cookie: "", readyState: "complete", addEventListener() {}, querySelectorAll: () => [] };
  vm.runInNewContext(bridge, { window, document, URL, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
  listeners.get("curtainsuk:analytics")?.({ detail: { event: "checkout_opened", handoff_id: "synthetic" } });
  assert.equal(calls.length, 0);
  done?.(null);
  assert.deepEqual(calls[0], ["consent", false]);
  assert.equal(calls.filter(call => call[0] === "init").length, 1);
  assert.equal(calls.filter(call => call[0] === "measure").length, 0);
});

test("a fresh SDK is installed only after Shopify consent and processes consent before init", () => {
  let done: ((error: null) => void) | undefined;
  let scripts = 0;
  const window: any = {
    location: { pathname: "/", href: "https://www.curtainsuk.com/" }, dataLayer: [], addEventListener() {},
    Shopify: { customerPrivacy: { marketingAllowed: () => true }, loadFeatures(_features: unknown, callback: (error: null) => void) { done = callback; } },
  };
  const document = {
    title: "Synthetic", cookie: "", readyState: "complete", addEventListener() {}, querySelectorAll: () => [], createElement: () => ({}),
    getElementsByTagName: () => [{ parentNode: { insertBefore() { scripts++; } } }],
  };
  vm.runInNewContext(bridge, { window, document, URL, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
  assert.equal(scripts, 0); assert.equal(window.oaiq.q.length, 0);
  done?.(null);
  assert.equal(scripts, 1);
  assert.deepEqual(Array.from(window.oaiq.q[0]), ["consent", true]);
  assert.equal(window.oaiq.q[1][0], "init");
  assert.equal(window.oaiq.q[2][1], "page_viewed");
});
