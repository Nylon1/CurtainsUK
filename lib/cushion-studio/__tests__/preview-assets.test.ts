import test from "node:test";
import assert from "node:assert/strict";
import { cushionPreviewAsset } from "../preview-assets";

const hosted = {
  base: "/apps/cushions/assets/",
  apiBase: "/apps/cushions",
  ownerPreview: false,
};
test("internal range-review HTML and script cannot be served by customer asset configuration", async () => {
  for (const asset of ["range-review.html", "range-review.mjs"]) {
    const response = await cushionPreviewAsset(asset, hosted);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Not found");
    const missingAuthority = await cushionPreviewAsset(asset, {
      base: hosted.base,
      apiBase: hosted.apiBase,
    } as typeof hosted);
    assert.equal(missingAuthority.status, 404);
  }
});
test("explicit local owner preview can render the review while retaining no-store and noindex", async () => {
  const options = {
    base: "/cushion-studio-preview/",
    apiBase: "/api/cushion-studio",
    ownerPreview: true,
  };
  const html = await cushionPreviewAsset("range-review.html", options),
    body = await html.text();
  assert.equal(html.status, 200);
  assert.equal(html.headers.get("cache-control"), "no-store");
  assert.match(html.headers.get("x-robots-tag")!, /noindex/);
  assert.match(body, /"ownerReview":true/);
  assert.match(body, /<base href="\/cushion-studio-preview\/">/);
  const script = await cushionPreviewAsset("range-review.mjs", options);
  assert.equal(script.status, 200);
  assert.match(await script.text(), /ownerReview/);
});
test("asset allowlist rejects traversal and unknown review names while normal customer assets remain available", async () => {
  for (const name of [
    "../range-review.html",
    "..\\range-review.mjs",
    "range-review.html?ownerPreview=true",
    "range-review.json",
    "../../.env",
  ]) {
    const response = await cushionPreviewAsset(name, hosted);
    assert.equal(response.status, 404, name);
  }
  const index = await cushionPreviewAsset("index.html", hosted),
    body = await index.text();
  assert.equal(index.status, 200);
  assert.match(body, /"ownerReview":false/);
  assert.doesNotMatch(body, /range-review\.(?:mjs|html)/);
  assert.equal((await cushionPreviewAsset("scene.mjs", hosted)).status, 200);
});
