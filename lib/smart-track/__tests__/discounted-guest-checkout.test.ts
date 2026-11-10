import assert from "node:assert/strict";
import test from "node:test";
import { myHomeCheckoutOwnerHash } from "../../cushion-studio/hosted-repository";
import { createTrackServices } from "../repository";
import type { TrackCheckoutGroup } from "../checkout";

const attempt = "4d28b294-026e-4b44-a6f4-85493b56dd34";
const guest = {
  shop: "carpetup.myshopify.com",
  pathPrefix: "/apps/curtainsuk-decision",
  loggedInCustomerId: null,
  timestamp: 123456,
};

test("discounted Roman and track groups use the random guest attempt for ownership", async (t) => {
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
  const writes: Array<{ key: string; owner: string }> = [];
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "synthetic.invalid");
    if (url.pathname.endsWith("/smart_track_checkout_groups")) {
      const owner = url.searchParams.get("owner_session_hash")?.replace(/^eq\./, "");
      const key = url.searchParams.get("idempotency_key")?.replace(/^eq\./, "");
      const row = rows.get(`${owner}:${key}`);
      return Response.json(row ? row : []);
    }
    assert.equal(url.pathname, "/rest/v1/rpc/commit_smart_track_checkout");
    const payload = JSON.parse(String(init?.body)) as { p_owner: string; p_key: string; p_group: unknown };
    writes.push({ key: payload.p_key, owner: payload.p_owner });
    rows.set(`${payload.p_owner}:${payload.p_key}`, { payload: payload.p_group });
    return new Response(null, { status: 204 });
  });

  const owner = myHomeCheckoutOwnerHash(guest, attempt);
  for (const key of ["welcome-abc123", "so-abc123", "sc-abc123"]) {
    const tracks = createTrackServices(guest, { forRoman: true, ownerAttemptKey: attempt });
    assert.ok(tracks);
    assert.equal(await tracks.existing(key), null);
    await tracks.persist(key, {} as TrackCheckoutGroup);
    assert.ok(await tracks.existing(key));
  }
  assert.deepEqual(writes, ["welcome-abc123", "so-abc123", "sc-abc123"].map((key) => ({ key, owner })));
  const unbound = createTrackServices(guest, { forRoman: true });
  await assert.rejects(unbound!.existing("welcome-abc123"), /MY_HOME_CHECKOUT_INVALID/);
});
