import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";

function harness(entry: string) {
  type Element = {
    innerHTML: string;
    hidden: boolean;
    textContent: string;
    value: string;
    files?: unknown[];
    onchange?: () => Promise<void>;
    onload?: () => void;
    onclick?: () => void;
    naturalWidth: number;
    naturalHeight: number;
    append: (...args: unknown[]) => void;
  };
  const nodes = new Map<string, Element>();
  const node = (selector: string): Element => {
    if (!nodes.has(selector))
      nodes.set(selector, {
        innerHTML: "",
        hidden: false,
        textContent: "",
        value: "",
        naturalWidth: 100,
        naturalHeight: 100,
        append() {},
      });
    return nodes.get(selector)!;
  };
  let click: (event: unknown) => void = () => {};
  const stage = Object.assign(node("#stage"), {
    classList: { add() {}, remove() {} },
    setAttribute() {},
    removeAttribute() {},
    focus() {},
    querySelector: node,
    addEventListener(_name: string, callback: typeof click) {
      click = callback;
    },
  });
  const stored = new Map<string, string>(),
    requests: { url: string; body: Record<string, unknown> }[] = [],
    revoked: string[] = [];
  const sessionId = randomUUID();
  runInNewContext(readFileSync("lib/storefront/hci/consultation.js", "utf8"), {
    URL: {
      createObjectURL: () => "blob:reference-test",
      revokeObjectURL: (url: string) => revoked.push(url),
    },
    URLSearchParams,
    location: {
      search: `?entry=${entry}`,
      origin: "https://staging.example.test",
      reload() {},
    },
    document: {
      querySelector: node,
      querySelectorAll: () => [],
      createElement: () => node("created"),
    },
    window: { addEventListener() {} },
    crypto: { randomUUID },
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    },
    fetch: async (url: string, init: { body: string }) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return {
        ok: true,
        json: async () => ({
          sessionId,
          revision: requests.length,
          phase: "complete",
          profileSummary: "A calm room",
          question: null,
          shortlist: [],
        }),
      };
    },
  });
  return {
    stage,
    node,
    requests,
    stored,
    revoked,
    sessionId,
    click: (id: string) =>
      click({
        target: {
          closest: () => ({ id, dataset: {}, hasAttribute: () => false }),
        },
      }),
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("room-first reference remains optional and cannot silently become analysed HCI evidence", async () => {
  const ui = harness("match");
  assert.match(ui.stage.innerHTML, /Show us your starting point/);
  assert.match(ui.stage.innerHTML, /not uploaded or analysed/);
  assert.equal(ui.requests.length, 0);
  const input = ui.node("#reference-file");
  input.files = [{ type: "image/jpeg", size: 100 }];
  await input.onchange!();
  ui.node("#reference-preview").onload!();
  assert.equal(ui.requests.length, 0);
  assert.equal(
    ui.stored.size,
    0,
    "no reference bytes or file metadata persisted",
  );
  ui.click("reference-skip");
  await settle();
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].url, "/api/admin/curtain-consultation");
  assert.equal(ui.requests[0].body.action, undefined);
  assert.deepEqual(ui.revoked, ["blob:reference-test"]);
  assert.doesNotMatch(
    JSON.stringify(ui.requests),
    /blob:|image\/|reference-test/,
  );
});

test("guided discovery offers references before ranking and skip uses the same canonical session", async () => {
  const ui = harness("guided");
  await settle();
  assert.equal(ui.requests.length, 1);
  assert.match(
    ui.stage.innerHTML,
    /Have something you’d like us to match with/,
  );
  assert.match(ui.stage.innerHTML, /Skip — show my recommendations/);
  ui.click("reference-skip");
  await settle();
  assert.equal(ui.requests.length, 2);
  assert.equal(ui.requests[1].body.sessionId, ui.sessionId);
  assert.deepEqual(ui.requests[1].body.action, { type: "recommend" });
  assert.equal(ui.requests[1].body.revision, 1);
  assert.equal(ui.requests[0].url, ui.requests[1].url);
});

test("invalid reference files do not block skipping or initiate an upload", async () => {
  for (const file of [
    { type: "image/svg+xml", size: 20 },
    { type: "image/jpeg", size: 9 * 1024 * 1024 },
  ]) {
    const ui = harness("match"),
      input = ui.node("#reference-file");
    input.files = [file];
    await input.onchange!();
    assert.match(ui.node("#reference-status").textContent, /or skip/);
    assert.equal(ui.requests.length, 0);
    ui.click("reference-skip");
    await settle();
    assert.equal(ui.requests.length, 1);
  }
});
