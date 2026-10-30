import test from "node:test";
import assert from "node:assert/strict";
import {
  HOTEL_ASSETS,
  hotelAsset,
  hotelPreviewAllowed,
  hotelReviewCatalogue,
} from "../server";
test("preview serves only the explicit asset allowlist and injects local renderer paths", async () => {
  const request = new Request(
    "http://localhost:4368/hotel-design-studio-preview/",
  );
  const page = await hotelAsset(request, "", true),
    html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /localhost:4368\/room-visualiser/);
  assert.equal(page.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(
    (await hotelAsset(request, "../../package.json", true)).status,
    404,
  );
  for (const asset of Object.keys(HOTEL_ASSETS))
    assert.equal((await hotelAsset(request, asset, true)).status, 200, asset);
});
test("hotel catalogue exposes only known Panaz plains and keeps intended use separate", async () => {
  const data = await (
    await hotelReviewCatalogue(
      new Request(
        "http://localhost/catalog?query=spectrum&brand=other&item=armchair",
      ),
    )
  ).json();
  assert.equal(data.fabrics.length, 6);
  assert.ok(
    data.fabrics.every(
      (f: { brand: string; pattern: string; usage: string }) =>
        f.brand === "Panaz" &&
        f.pattern === "Plain" &&
        !f.usage.includes("Upholstery"),
    ),
  );
  assert.equal(
    (
      await (
        await hotelReviewCatalogue(
          new Request("http://localhost/catalog?query=Clarke"),
        )
      ).json()
    ).fabrics.length,
    0,
  );
});
test("production does not expose the unsigned hotel preview", () => {
  const before = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
  };
  try {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL = "1";
    assert.equal(
      hotelPreviewAllowed(
        new Request(
          "https://curtainsuk-production-api.vercel.app/hotel-design-studio-preview/",
        ),
      ),
      false,
    );
    process.env.VERCEL_ENV = "preview";
    assert.equal(
      hotelPreviewAllowed(
        new Request("https://review.vercel.app/hotel-design-studio-preview/"),
      ),
      true,
    );
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
