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
test("Allure range filter combines with colour search and rejects unknown ranges", async () => {
  const query = async (params: string) =>
    (
      await hotelReviewCatalogue(
        new Request(`http://localhost/catalog?${params}`),
      )
    ).json();
  const all = await query("range=Allure%20Velvet");
  assert.equal(all.fabrics.length, 36);
  assert.ok(
    all.fabrics.every((f: { design: string }) => f.design === "Allure Velvet"),
  );
  const navy = await query("range=Allure%20Velvet&query=Navy");
  assert.equal(navy.fabrics.length, 1);
  assert.equal(navy.fabrics[0].reference, "190ALL2/116");
  assert.equal((await query("range=unknown")).fabrics.length, 0);
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

test("FR sheer filter offers eight listed voiles and excludes retired White without losing assets", async () => {
  const query = async (params: string) =>
    (
      await hotelReviewCatalogue(
        new Request(`http://localhost/catalog?${params}`),
      )
    ).json();
  const all = await query("range=sheers&item=voile");
  assert.equal(all.fabrics.length, 8);
  assert.ok(
    all.fabrics.every(
      (f: { productType: string; pattern: string }) =>
        f.productType === "Sheer" && f.pattern === "Plain",
    ),
  );
  assert.equal((await query("range=Batiste")).fabrics.length, 4);
  assert.equal((await query("range=Charm")).fabrics.length, 2);
  assert.equal((await query("range=sheers&query=White")).fabrics.length, 2);
  assert.equal((await query("query=366PLA1%2F001")).fabrics.length, 0);
  assert.equal((await query("")).fabrics.length, 55);
});

test("guide uses the matching preview or signed studio base without requiring JavaScript", async () => {
  for (const preview of [true, false]) {
    const response = await hotelAsset(new Request("http://localhost:4368/hotel-design-studio-preview/"), "how-to-use.html", preview);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(preview ? 'http://localhost:4368/hotel-design-studio-preview/' : 'https://www.curtainsuk.com/apps/curtainsuk-decision/hotel-studio/'));
    assert.ok(!html.includes('__HOTEL_BASE__'));
    assert.match(html, /<strong>Single<\/strong>/);
    assert.match(html, /id="save"/);
    assert.ok(!html.includes('<script'));
  }
});
