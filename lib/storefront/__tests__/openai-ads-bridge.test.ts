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
