import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
function harness(entry: string, directions = false) {
  const nodes = new Map<string, Record<string, unknown>>();
  const node = (key: string): Record<string, unknown> => {
    if (!nodes.has(key))
      nodes.set(key, {
        innerHTML: "",
        hidden: false,
        textContent: "",
        value: "",
        append() {},
        setAttribute() {},
        removeAttribute() {},
        focus() {},
        querySelector: node,
        querySelectorAll: () => [],
      });
    return nodes.get(key)!;
  };
  const requests: { url: string; body: Record<string, unknown> }[] = [],
    stored = new Map<string, string>();
  const storage = {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => stored.set(k, v),
    removeItem: (k: string) => stored.delete(k),
  };
  const sessionId = randomUUID();
  runInNewContext(readFileSync("lib/storefront/hci/consultation.js", "utf8"), {
    URL,
    URLSearchParams,
    location: {
      search: "?entry=" + entry,
      origin: "https://staging.example.test",
    },
    document: { querySelector: node, createElement: () => node("created") },
    crypto: { randomUUID },
    localStorage: storage,
    sessionStorage: storage,
    fetch: async (url: string, init?: { body: string }) => {
      if (!init) {
        requests.push({ url, body: {} });
        return { ok: true, json: async () => ({ fabric: {
          id: "pt-4262-770", browseReady: true, brand: "Prestigious", design: "Real design", colour: "Lagoon",
          images: [{ url: "https://cdn.shopify.com/test.jpg" }], sampleAvailable: true,
        } }) };
      }
      const body = JSON.parse(init.body);
      requests.push({ url, body });
      return {
        ok: true,
        json: async () => ({
          sessionId,
          revision: requests.length,
          phase:
            directions || body.action?.type === "recommend"
              ? "directions"
              : entry === "match"
                ? "discovery"
                : "complete",
          question: { prompt: "Your room?", answers: [] },
          palette: null,
          profileSummary: "Calm",
          directions: directions ? [{ id: "complementary", label: "Complementary", purpose: "Balanced colours", cards: [{ fabricMasterId: "pt-4262-770", supplierSku: "4262/770", reactionId: "canonical-reaction-id", explanation: ["Lagoon adds colour."] }] }] : [],
        }),
      };
    },
  });
  return { node, requests, stored, sessionId };
}
const settle = () => new Promise((r) => setImmediate(r));
const click = async (ui: ReturnType<typeof harness>, selector: string) => {
  await (ui.node(selector).onclick as () => Promise<void>)();
  await settle();
};
test("room-first creates one server session, then offers an optional image before questions", async () => {
  const ui = harness("match");
  await settle();
  assert.equal(ui.requests.length, 1);
  assert.match(String(ui.node("#stage").innerHTML), /One image is enough/);
  await click(ui, "#skip");
  assert.equal(ui.requests.length, 1);
  assert.match(String(ui.node("#stage").innerHTML), /Your room\?/);
  assert.doesNotMatch(JSON.stringify(ui.requests), /bytes|owner|commands/);
});
test("guided optional image skip recommends using the same session and revision", async () => {
  const ui = harness("guided");
  await settle();
  assert.match(
    String(ui.node("#stage").innerHTML),
    /Skip — show my recommendations/,
  );
  await click(ui, "#skip");
  assert.equal(ui.requests.length, 2);
  assert.equal(ui.requests[1].body.sessionId, ui.sessionId);
  assert.equal(ui.requests[1].body.revision, 1);
  assert.deepEqual(ui.requests[1].body.action, { type: "recommend" });
  assert(ui.requests.every((r) => r.url === "/api/admin/curtain-consultation"));
});
test("invalid/oversized images are not uploaded and skip remains functional", async () => {
  for (const file of [
    { type: "image/svg+xml", size: 20 },
    { type: "image/jpeg", size: 3 * 1024 * 1024 },
  ]) {
    const ui = harness("match");
    await settle();
    ui.node("#reference-file").files = [file];
    await click(ui, "#upload");
    assert.equal(ui.requests.length, 1);
    assert.match(String(ui.node("#notice").textContent), /or skip/);
    await click(ui, "#skip");
    assert.match(String(ui.node("#stage").innerHTML), /Your room\?/);
  }
});

test("real recommendation cards hydrate exact identity through the staff catalogue projection and retain handoff context", async () => {
  const ui = harness("guided", true);
  await settle();
  await settle();
  assert.equal(ui.requests[1].url, "/api/admin/curtain-consultation?fabric=pt-4262-770");
  const html = String(ui.node(".cards").innerHTML);
  assert.match(html, /Real design/);
  assert.match(html, /Order Sample/);
  assert.match(html, /Make Curtains/);
  assert.match(html, /preview_theme_id=182264234363/);
  assert.match(decodeURIComponent(html), /"fabricMasterId":"pt-4262-770"/);
  assert.match(decodeURIComponent(html), /"strategyId":"complementary"/);
});
