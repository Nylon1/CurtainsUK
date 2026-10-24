import assert from "node:assert/strict";
import test from "node:test";
import { cushionOwnerHash, myHomeCheckoutOwnerHash } from "../hosted-repository";
import { createHostedCheckoutServices } from "../hosted-server";
import { createTrackServices } from "../../smart-track/repository";
import type { ShopifyDraftOrderExecutionContract } from "../../storefront/shopify-draft-order-core";
import type { TrackCheckoutGroup } from "../../smart-track/checkout";

const key = "4d28b294-026e-4b44-a6f4-85493b56dd34";
const secondKey = "b7c2e618-c7f4-4ebc-984e-04d8bcd03698";
const guest = {
  shop: "carpetup.myshopify.com",
  pathPrefix: "/apps/curtainsuk-decision",
  loggedInCustomerId: null,
  timestamp: 123456,
};

test("My Home guest checkout key is private to the shop and does not require a customer account", () => {
  const hash = myHomeCheckoutOwnerHash(guest, key);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, myHomeCheckoutOwnerHash({ ...guest, loggedInCustomerId: "123" }, key));
  assert.notEqual(hash, myHomeCheckoutOwnerHash(guest, secondKey));
  assert.notEqual(hash, myHomeCheckoutOwnerHash({ ...guest, shop: "another.myshopify.com" }, key));
  assert.throws(() => myHomeCheckoutOwnerHash(guest, "predictable-checkout-key"), /MY_HOME_CHECKOUT_INVALID/);
  assert.throws(() => cushionOwnerHash(guest), /CUSHION_SIGN_IN_REQUIRED/);
});

test("guest cushion and track checkouts persist under their random My Home attempt", async (t) => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  const previousTracks = process.env.CURTAINSUK_SMART_TRACK_ENABLED;
  process.env.SUPABASE_URL = "https://synthetic.invalid";
  process.env.SUPABASE_SECRET_KEY = "synthetic-test-secret";
  process.env.CURTAINSUK_SMART_TRACK_ENABLED = "true";
  t.after(() => {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
    if (previousTracks === undefined) delete process.env.CURTAINSUK_SMART_TRACK_ENABLED;
    else process.env.CURTAINSUK_SMART_TRACK_ENABLED = previousTracks;
  });

  const rows = new Map<string, unknown>();
  const writes: Array<{ operation: string; owner: string }> = [];
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "synthetic.invalid");
    if (url.pathname.endsWith("/cushion_checkout_groups") || url.pathname.endsWith("/smart_track_checkout_groups")) {
      const owner = url.searchParams.get("owner_session_hash")?.replace(/^eq\./, "");
      const row = rows.get(`${url.pathname}:${owner}`);
      return row
        ? Response.json(row)
        : Response.json([]);
    }
    const operation = url.pathname.split("/").at(-1) ?? "";
    const payload = JSON.parse(String(init?.body)) as { p_owner: string; p_group?: unknown; p_snapshots?: unknown };
    writes.push({ operation, owner: payload.p_owner });
    if (operation === "commit_cushion_checkout")
      rows.set(`/rest/v1/cushion_checkout_groups:${payload.p_owner}`, { snapshots: payload.p_snapshots, contract: {} });
    if (operation === "commit_smart_track_checkout")
      rows.set(`/rest/v1/smart_track_checkout_groups:${payload.p_owner}`, { payload: payload.p_group });
    return new Response(null, { status: 204 });
  });

  const cushion = createHostedCheckoutServices(guest, key, { reviewOnly: true, myHomeCheckout: true });
  assert.equal(await cushion.existing?.(key), null);
  await cushion.persist({ key, snapshots: [], contract: {} as ShopifyDraftOrderExecutionContract });
  assert.ok(await cushion.existing?.(key));
  const accountOnly = createHostedCheckoutServices(guest, key, { reviewOnly: true });
  await assert.rejects(accountOnly.existing!(key), /CUSHION_SIGN_IN_REQUIRED/);

  const tracks = createTrackServices(guest);
  assert.ok(tracks);
  assert.equal(await tracks.existing(secondKey), null);
  await tracks.persist(secondKey, {} as TrackCheckoutGroup);
  assert.ok(await tracks.existing(secondKey));
  assert.deepEqual(writes, [
    { operation: "commit_cushion_checkout", owner: myHomeCheckoutOwnerHash(guest, key) },
    { operation: "commit_smart_track_checkout", owner: myHomeCheckoutOwnerHash(guest, secondKey) },
  ]);
  const signedIn = { ...guest, loggedInCustomerId: "123" };
  const legacy = cushionOwnerHash(signedIn);
  rows.set(`/rest/v1/cushion_checkout_groups:${legacy}`, { snapshots: [], contract: {} });
  rows.set(`/rest/v1/smart_track_checkout_groups:${legacy}`, { payload: {} });
  const legacyCushion = createHostedCheckoutServices(signedIn, secondKey, { reviewOnly: true, myHomeCheckout: true });
  assert.ok(await legacyCushion.existing?.(secondKey));
  const legacyTracks = createTrackServices(signedIn);
  assert.ok(await legacyTracks?.existing(key));
});
