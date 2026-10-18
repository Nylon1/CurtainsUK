import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { quoteSmartTrack } from "../pricing";
import { parseSmartTrackSpec, type SmartTrackSpec } from "../domain";
import { trackPackage, OWNER_CONFIRMED_TRACK_DISPATCH, type TrackPackage } from "../package";
import { combinedMyHomeDispatch, customerMyHomeDispatch, OWNER_CONFIRMED_CUSHION_DISPATCH, OWNER_CONFIRMED_CURTAIN_DISPATCH } from "../../cushion-studio/dispatch";
import { checkTrackWeight, materialWeightKg } from "../weight";
import { smartTrackDelivery } from "../delivery";
import { createSmartTrackSnapshot, buildSmartTrackOrder } from "../commerce";
import { processSmartTrackPaidOrder } from "../paid-order";
import { reviewMyHome, checkoutMyHome } from "../../cushion-studio/my-home";
import type { TrackCheckoutGroup } from "../checkout";
import { homeFixture } from "../../../scripts/my-home-preview-fixtures";
import { smartTrackAsset } from "../assets";
import { smartTrackGuidance } from "../../advisory/smart-track-guidance.mjs";
const spec = (overrides: Partial<SmartTrackSpec> = {}): SmartTrackSpec => ({
  version: 1,
  id: randomUUID(),
  productType: "SMART_TRACK",
  system: "FOREST_SHUTTLE_GO",
  lengthCm: "200",
  shape: "STRAIGHT",
  heading: "PENCIL",
  opening: "CENTRE",
  mounting: "CEILING",
  motorSide: "RIGHT",
  viewpoint: "INSIDE_FACING_WINDOW",
  quantity: 1,
  weight: { mode: "MEASURED", kg: 10 },
  measurementsConfirmed: true,
  powerLocationChecked: true,
  ...overrides,
});
// Synthetic package authority solely for exercising closed commercial paths.
function readyPackage(system: SmartTrackSpec["system"]): TrackPackage {
  return {
    ...trackPackage(system),
    motorArticle: "TEST-ONLY",
    trackSystem: "TEST-FMS",
    minimumLengthCm: 100,
    precisionCm: "0.1",
    finish: "TEST-WHITE",
    bracketSpecification: "TEST-BRACKET",
    carrierSpecification: "TEST-CARRIER",
    configurationLimitsConfirmed: true,
    approvalReference: "TEST-ONLY",
    dispatch: {
      version: "TEST",
      status: "confirmed",
      unit: "calendar-weeks",
      minimumCalendarWeeks: 1,
      maximumCalendarWeeks: 2,
      startsFrom: "order-confirmation",
      confirmedAt: "2026-10-17",
      approvalReference: "TEST-ONLY",
    },
  };
}
test("all exact bands, both motors and compatible headings preserve gross VAT-inclusive owner retail", () => {
  const base = [44286, 51429, 54286, 57143, 61429],
    wave = [48714, 56571, 59714, 62857, 67571];
  for (const system of ["FOREST_SHUTTLE_GO", "FOREST_SHUTTLE_ION"] as const)
    for (let i = 0; i < 5; i++)
      for (const heading of ["PENCIL", "PINCH", "WAVE"] as const) {
        for (const lengthCm of i === 0 ? ["100", "100.000000"] : [
          String(i * 100 + 1),
          String((i + 1) * 100),
          String(i * 100 + 0.5),
        ]) {
          const s = spec({
            system,
            heading,
            lengthCm,
            ...(heading === "WAVE" ? { waveSpacingMm: 80 } : {}),
          });
          const q = quoteSmartTrack(s);
          assert.equal(q.unitMinor, (heading === "WAVE" ? wave : base)[i]);
          assert.equal(q.goodsMinor, q.unitMinor);
          assert.equal(q.spec.lengthCm, lengthCm);
          assert.equal(q.vatMinor, Math.round(q.goodsMinor / 6));
          assert.equal(
            q.package.maximumLoadKg,
            system === "FOREST_SHUTTLE_ION" ? 25 : 35,
          );
          assert.ok(!JSON.stringify(q).includes("supplierGross"));
          assert.ok(!JSON.stringify(q).includes("margin"));
        }
      }
  assert.equal(
    quoteSmartTrack(spec({ lengthCm: "100.000001" })).unitMinor,
    51429,
  );
  assert.equal(
    quoteSmartTrack(spec({ lengthCm: "100.5", quantity: 3 })).goodsMinor,
    154287,
  );
});
test("invalid measurements, unsupported headings and manufacturing precision fail without rounding", () => {
  for (const lengthCm of [
    "0",
    "-1",
    "99.999999",
    "500.1",
    "1e2",
    "NaN",
    "100,5",
    "100.0000001",
  ])
    assert.throws(() => quoteSmartTrack(spec({ lengthCm })));
  assert.throws(() => quoteSmartTrack({ ...spec(), heading: "EYELET" }));
  assert.throws(() => quoteSmartTrack({ ...spec(), shape: "BAY" }));
  assert.throws(() => parseSmartTrackSpec(spec({ heading: "WAVE" })));
  for (const waveSpacingMm of [60, 80] as const)
    assert.equal(
      quoteSmartTrack(spec({ heading: "WAVE", waveSpacingMm })).unitMinor,
      56571,
    );
  const q = quoteSmartTrack(spec({ lengthCm: "100.55" }), {
    package: readyPackage("FOREST_SHUTTLE_GO"),
  });
  assert.equal(q.spec.lengthCm, "100.55");
  assert.equal(q.purchaseReady, false);
  assert.equal(
    quoteSmartTrack(spec({ lengthCm: "100.5" }), {
      package: readyPackage("FOREST_SHUTTLE_GO"),
    }).purchaseReady,
    true,
  );
  assert.equal(quoteSmartTrack(spec()).purchaseReady, true);
  for (const field of ["motorArticle", "trackSystem", "finish", "bracketSpecification", "carrierSpecification", "controller", "approvalReference"] as const) {
    const incomplete = quoteSmartTrack(spec(), { package: { ...trackPackage("FOREST_SHUTTLE_GO"), [field]: null } });
    assert.equal(incomplete.purchaseReady, false);
    assert.ok(incomplete.issues.some((issue) => issue.includes("Final track, control and mounting specifications")));
  }
  for (const system of ["FOREST_SHUTTLE_GO", "FOREST_SHUTTLE_ION"] as const) {
    assert.equal(trackPackage(system).minimumLengthCm, 100);
    assert.throws(() => quoteSmartTrack(spec({ system, lengthCm: "99.9" })), /TRACK_LENGTH_INVALID/);
    assert.equal(quoteSmartTrack(spec({ system, lengthCm: "100" }), { package: readyPackage(system) }).purchaseReady, true);
    assert.ok(trackPackage(system).includedComponents.includes("Carriers"));
    assert.ok(trackPackage(system).includedComponents.includes("Brackets"));
  }
});
test("confirmed whole-centimetre cutting, full-range loads and 4-5 week dispatch govern both packages", () => {
  for (const system of ["FOREST_SHUTTLE_GO", "FOREST_SHUTTLE_ION"] as const) {
    const p = trackPackage(system);
    assert.equal(p.precisionCm, "1");
    assert.equal(p.configurationLimitsConfirmed, true);
    assert.equal(p.trackSystem, "Forest Motorised Track System (FMS), standard single rail");
    assert.equal(p.finish, "White");
    assert.equal(p.motorArticle, system === "FOREST_SHUTTLE_ION" ? "5234000000" : "5236001000-UK");
    assert.equal(p.includedComponents.includes("UK three-pin power cable"), system === "FOREST_SHUTTLE_GO");
    assert.equal(p.includedComponents.includes("Forest iOn UK charger (5234000003)"), system === "FOREST_SHUTTLE_ION");
    assert.deepEqual(p.dispatch, OWNER_CONFIRMED_TRACK_DISPATCH);
    for (const lengthCm of ["100", "101", "200", "201", "300", "301", "400", "401", "500"])
      for (const mounting of ["WALL", "CEILING"] as const)
        for (const heading of ["PENCIL", "PINCH", "WAVE"] as const) {
          const q = quoteSmartTrack(spec({ system, lengthCm, mounting, heading,
            ...(heading === "WAVE" ? { waveSpacingMm: 80 } : {}),
            weight: { mode: "MEASURED", kg: p.maximumLoadKg },
          }));
          assert.equal(q.weightAcceptance.accepted, true);
          assert.deepEqual(q.issues, []);
          assert.equal(q.purchaseReady, true);
          assert.equal(q.dispatchEstimate?.unit, "calendar-weeks");
          assert.equal(q.dispatchEstimate?.minimumCalendarWeeks, 4);
          assert.equal(q.dispatchEstimate?.maximumCalendarWeeks, 5);
          assert.equal(q.dispatchEstimate?.startsFrom, "order-confirmation");
          assert.match(q.dispatchEstimate!.message, /smart track dispatch: 4-5 calendar weeks after order confirmation/);
          assert.equal("approvalReference" in q.dispatchEstimate!, false);
        }
    for (const lengthCm of ["100.5", "199.999999", "200.1", "499.9"]) {
      const q = quoteSmartTrack(spec({ system, lengthCm }));
      assert.equal(q.spec.lengthCm, lengthCm);
      assert.equal(q.purchaseReady, false);
      assert.ok(q.issues.some((issue) => issue.includes("whole centimetres")));
    }
    const q = quoteSmartTrack(spec({ system, lengthCm: "100.0" }));
    assert.equal(q.spec.lengthCm, "100.0");
    assert.equal(q.issues.some((issue) => issue.includes("whole centimetres")), false);
  }
  for (const curtain of [false, true])
    for (const cushion of [false, true]) {
      const combined = customerMyHomeDispatch(combinedMyHomeDispatch([
        { productType: "SMART_TRACK", estimate: trackPackage("FOREST_SHUTTLE_GO").dispatch },
        { productType: "SMART_TRACK", estimate: trackPackage("FOREST_SHUTTLE_ION").dispatch },
        ...(curtain ? [{ productType: "CURTAIN" as const, estimate: OWNER_CONFIRMED_CURTAIN_DISPATCH }] : []),
        ...(cushion ? [{ productType: "CUSHION" as const, estimate: OWNER_CONFIRMED_CUSHION_DISPATCH }] : []),
      ]))!;
      assert.equal(combined.policy, "hold-together");
      assert.equal(combined.unit, "calendar-weeks");
      assert.equal(combined.minimum, 4);
      assert.equal(combined.maximum, 5);
      assert.equal(combined.startsFrom, "order-confirmation");
      assert.ok(!JSON.stringify(combined).includes("approvalReference"));
    }
});

test("customer weight confirmation accepts an optional estimate without claiming measured weight", () => {
  for (const system of ["FOREST_SHUTTLE_GO", "FOREST_SHUTTLE_ION"] as const) {
    const p = trackPackage(system), maximumKg = p.maximumLoadKg;
    const confirmation = { version: 1 as const, system, maximumKg };
    const s = spec({ system, weight: { mode: "UNKNOWN" }, weightConfirmation: confirmation });
    const q = quoteSmartTrack(s, { package: p });
    assert.equal(q.purchaseReady, true);
    assert.equal(q.weight.status, "UNKNOWN");
    assert.equal(q.weight.minimumKg, null);
    assert.equal(q.weight.maximumKg, null);
    assert.deepEqual(q.weightAcceptance, { accepted: true, basis: "CUSTOMER_CONFIRMATION", maximumKg, conflictingWeight: false });
    assert.equal(quoteSmartTrack({ ...s, weightConfirmation: undefined }, { package: p }).purchaseReady, false);
    assert.equal(quoteSmartTrack({ ...s, weightConfirmation: { ...confirmation, maximumKg: maximumKg - 1 } }, { package: p }).purchaseReady, false);
    assert.equal(quoteSmartTrack({ ...s, weightConfirmation: { ...confirmation, system: system === "FOREST_SHUTTLE_GO" ? "FOREST_SHUTTLE_ION" : "FOREST_SHUTTLE_GO" } }, { package: p }).purchaseReady, false);
    assert.equal(quoteSmartTrack(s, { package: { ...p, maximumLoadKg: maximumKg - 5 } }).purchaseReady, false);
    const estimate = { mode: "EXISTING_ESTIMATE" as const, panels: 1, widthCm: 200, dropCm: 250, widthBasis: "COVERAGE" as const, fullness: 2, gsm: 300, lining: true, liningGsm: 200, interlining: false };
    const estimated = quoteSmartTrack({ ...s, weight: estimate }, { package: p });
    assert.equal(estimated.purchaseReady, true);
    assert.equal(estimated.weight.status, "ESTIMATED");
    assert.equal(estimated.weight.minimumKg, 5);
    assert.equal(estimated.weight.maximumKg, null);
    for (const weight of [{ mode: "MEASURED", kg: maximumKg + 0.001 }, { ...estimate, gsm: 5000 }]) {
      const conflicting = quoteSmartTrack({ ...s, weight }, { package: p });
      assert.equal(conflicting.purchaseReady, false);
      assert.equal(conflicting.weightAcceptance.conflictingWeight, true);
    }
    assert.throws(() => parseSmartTrackSpec({ ...s, weightConfirmation: true }), /TRACK_WEIGHT_CONFIRMATION_INVALID/);
    assert.throws(() => parseSmartTrackSpec({ ...s, weightConfirmation: { ...confirmation, maximumKg: "35" } }), /TRACK_WEIGHT_CONFIRMATION_INVALID/);
    const snapshot = createSmartTrackSnapshot(q, randomUUID(), p, p.dispatch);
    assert.deepEqual(snapshot.spec.weightConfirmation, confirmation);
    assert.deepEqual(snapshot.weightAcceptance, q.weightAcceptance);
    assert.ok(Object.isFrozen(snapshot.spec.weightConfirmation));
    assert.notEqual(q.quoteId, quoteSmartTrack({ ...s, weightConfirmation: undefined }, { package: p }).quoteId);
    assert.deepEqual(parseSmartTrackSpec(JSON.parse(JSON.stringify(s))).weightConfirmation, confirmation);
  }
});
test("weights use the selected motor limit, correct density units and fullness once", () => {
  assert.equal(
    checkTrackWeight({ mode: "MEASURED", kg: 35 }, 35).compatibility,
    "WITHIN_LIMIT",
  );
  assert.equal(
    checkTrackWeight({ mode: "MEASURED", kg: 35.0001 }, 35).compatibility,
    "OVER_LIMIT",
  );
  assert.equal(
    quoteSmartTrack(
      spec({
        system: "FOREST_SHUTTLE_ION",
        weight: { mode: "MEASURED", kg: 25.1 },
      }),
    ).weight.compatibility,
    "OVER_LIMIT",
  );
  assert.equal(
    materialWeightKg({
      name: "face",
      metres: 10,
      widthCm: 140,
      density: 300,
      unit: "GSM",
    }),
    4.2,
  );
  assert.equal(
    materialWeightKg({
      name: "face",
      metres: 10,
      widthCm: 140,
      density: 300,
      unit: "G_PER_LINEAR_METRE",
    }),
    3,
  );
  const w = {
    mode: "EXISTING_ESTIMATE" as const,
    panels: 2,
    widthCm: 200,
    dropCm: 250,
    widthBasis: "FLAT" as const,
    fullness: 2,
    gsm: 300,
    lining: false,
    interlining: false,
  };
  assert.equal(checkTrackWeight(w).minimumKg, 3);
  assert.equal(
    checkTrackWeight({ ...w, widthCm: 100, widthBasis: "COVERAGE" }).minimumKg,
    3,
  );
  assert.equal(checkTrackWeight(w).maximumKg, null);
  assert.equal(checkTrackWeight(w).compatibility, "REVIEW_REQUIRED");
  assert.equal(checkTrackWeight({ ...w, gsm: undefined }).status, "UNKNOWN");
  const simple = {
    ...w,
    panels: 1,
    widthCm: 200,
    dropCm: 250,
    widthBasis: "COVERAGE" as const,
    fullness: 2,
    lining: true,
    liningGsm: 150,
  };
  assert.equal(checkTrackWeight(simple).minimumKg, 4.5);
  assert.equal(checkTrackWeight({ ...simple, lining: false }).minimumKg, 3);
  const incompleteLining = checkTrackWeight({
    ...simple,
    liningGsm: undefined,
  });
  assert.equal(incompleteLining.minimumKg, 3);
  assert.equal(incompleteLining.maximumKg, null);
  assert.equal(incompleteLining.compatibility, "REVIEW_REQUIRED");
  const preset = {
    ...simple,
    liningGsm: 200,
    liningGsmSource: "STANDARD_PRESET" as const,
  };
  const presetQuote = quoteSmartTrack(spec({ weight: preset }));
  assert.equal(presetQuote.weight.minimumKg, 5);
  assert.equal(presetQuote.weight.maximumKg, null);
  assert.equal(
    presetQuote.spec.weight.mode === "EXISTING_ESTIMATE" &&
      presetQuote.spec.weight.liningGsmSource,
    "STANDARD_PRESET",
  );
  assert.match(
    presetQuote.weight.assumptions.join(" "),
    /actual lining may differ/,
  );
  assert.equal(
    checkTrackWeight({ ...preset, liningGsm: 250, liningGsmSource: "CUSTOM" })
      .minimumKg,
    5.5,
  );
  assert.throws(
    () => parseSmartTrackSpec(spec({ weight: { ...preset, liningGsm: 250 } })),
    /TRACK_WEIGHT_INVALID/,
  );
  assert.equal(
    checkTrackWeight(
      { mode: "CURTAINSUK", configurationId: randomUUID() },
      35,
      {
        materials: [
          { name: "face", grams: 3000 },
          { name: "lining", grams: 1500 },
          { name: "components", grams: 100 },
        ],
        complete: true,
        assumptions: ["Synthetic measured materials"],
      },
    ).maximumKg,
    4.6,
  );
});
test("linked curtain changes, eyelets and operation differences need review; coverage can be explicitly confirmed", () => {
  const id = randomUUID(),
    digest = "a".repeat(64),
    s = spec({
      linkedCurtain: {
        configurationId: id,
        specificationDigest: digest,
        coverageConfirmed: true,
      },
    });
  const linked = {
    configurationId: id,
    specificationDigest: digest,
    heading: "PENCIL",
    opening: "CENTRE",
    coverageCm: 180,
    measurementBasis: "POLE_USABLE_WIDTH",
  };
  assert.equal(
    quoteSmartTrack(s, { package: readyPackage(s.system), linked })
      .purchaseReady,
    true,
  );
  for (const patch of [
    { specificationDigest: "b".repeat(64) },
    { heading: "INCOMPATIBLE" },
    { opening: "LEFT" },
  ])
    assert.equal(
      quoteSmartTrack(s, {
        package: readyPackage(s.system),
        linked: { ...linked, ...patch },
      }).purchaseReady,
      false,
    );
  assert.equal(
    quoteSmartTrack(s, { package: readyPackage(s.system) }).purchaseReady,
    false,
  );
});
test("existing postcode restrictions still apply to the one smart-track charge", () => {
  assert.equal(smartTrackDelivery("BB2 3FA")?.grossMinor, 1295);
  assert.equal(smartTrackDelivery(""), null);
  assert.equal(smartTrackDelivery("BT1 1AA"), null);
  assert.equal(smartTrackDelivery("SW1A"), null);
});
test("track-only and every mixed combination reconcile once and persist distinct identities", async () => {
  for (const curtain of [false, true])
    for (const cushion of [false, true]) {
      const f = await homeFixture(),
        s = spec({ weight: { mode: "UNKNOWN" }, weightConfirmation: { version: 1, system: "FOREST_SHUTTLE_GO", maximumKg: 35 } }),
        stored = new Map<string, TrackCheckoutGroup>();
      let executed: TrackCheckoutGroup["contract"] | undefined;
      f.services.tracks = {
        package: trackPackage,
        purchasesEnabled: true,
        existing: async (key) => stored.get(key) ?? null,
        persist: async (key, g) => {
          stored.set(key, g);
        },
        execute: async (key, c) => {
          executed = c;
          return {
            status: "DISABLED",
            paymentEnabled: false,
            checkoutUrl: null,
            draftOrderId: null,
            draftOrderName: null,
            shopifyWritePerformed: false,
          };
        },
      };
      const input = {
        ...f.input,
        curtains: curtain ? f.input.curtains : undefined,
        cushions: cushion ? f.input.cushions : undefined,
        tracks: {
          specs: [s, spec({ system: "FOREST_SHUTTLE_ION", quantity: 2 })],
        },
      };
      const review = await reviewMyHome(input, f.services);
      assert.equal(review.purchaseEnabled, true);
      assert.equal(review.lines.find((line) => line.id === s.id)?.weightAcceptance?.basis, "CUSTOMER_CONFIRMATION");
      assert.equal(review.deliveryMinor, 1295);
      assert.equal(review.totalMinor, review.goodsMinor! + 1295);
      const checkout = {
        ...input,
        reviewId: review.reviewId,
        measurementsConfirmed: true,
        idempotencyKey: randomUUID(),
        houseReviewToken: review.houseReviewToken ?? undefined,
        acceptedPriceChanges: review.acceptedPriceChanges,
        cushions: cushion
          ? { ...input.cushions!, expectedQuoteId: review.quoteId! }
          : undefined,
      };
      const closedServices = { ...f.services, tracks: { ...f.services.tracks!, purchasesEnabled: false } };
      const closedReview = await reviewMyHome(input, closedServices);
      assert.equal(closedReview.purchaseReady, true);
      assert.equal(closedReview.purchaseEnabled, false);
      await assert.rejects(checkoutMyHome({ ...checkout, reviewId: closedReview.reviewId }, closedServices), /MY_HOME_PURCHASE_DISABLED/);
      await checkoutMyHome(checkout, f.services);
      assert.ok(executed);
      assert.equal(executed.expected.orderGrossAmountMinor, review.totalMinor);
      assert.equal(executed.expected.orderVatAmountMinor, review.vatMinor);
      assert.equal(
        executed.input.lineItems.length,
        2 + Number(curtain) + Number(cushion),
      );
      assert.equal(stored.size, 1);
      await checkoutMyHome(checkout, f.services);
      assert.equal(stored.size, 1);
      const group = stored.get(checkout.idempotencyKey)!;
      for (const snapshot of group.snapshots) {
        assert.deepEqual(snapshot.package, trackPackage(snapshot.spec.system));
        assert.equal(snapshot.package.finish, "White");
        assert.ok(Object.isFrozen(snapshot.package));
        const commitment = snapshot.dispatchCommitment as NonNullable<ReturnType<typeof combinedMyHomeDispatch>>;
        assert.equal(commitment.policy, "hold-together");
        assert.equal(commitment.minimum, 4);
        assert.equal(commitment.maximum, 5);
        assert.deepEqual(commitment.components.filter((component) => component.productType === "SMART_TRACK").map((component) => component.estimate), [OWNER_CONFIRMED_TRACK_DISPATCH, OWNER_CONFIRMED_TRACK_DISPATCH]);
        assert.deepEqual(customerMyHomeDispatch(commitment), review.dispatchEstimate);
      }
      assert.equal(group.snapshots[0].weight.status, "UNKNOWN");
      assert.equal(group.snapshots[0].weightAcceptance.basis, "CUSTOMER_CONFIRMATION");
      assert.equal(group.snapshots[0].spec.weightConfirmation?.maximumKg, 35);
      const secret = "test-track-mixed-webhook-secret-".repeat(2);
      const payload = {
        id: 123,
        name: "#TEST",
        financial_status: "paid",
        currency: "GBP",
        taxes_included: true,
        processed_at: new Date().toISOString(),
        note_attributes: executed.input.customAttributes.map((a) => ({
          name: a.key,
          value: a.value,
        })),
        line_items: executed.input.lineItems.map((l, i) => ({
          id: i + 1,
          quantity: l.quantity,
          price: l.originalUnitPriceWithCurrency.amount,
          total_discount: "0.00",
          properties: l.customAttributes.map((a) => ({
            name: a.key,
            value: a.value,
          })),
        })),
        total_price: (executed.expected.orderGrossAmountMinor / 100).toFixed(2),
        total_tax: (executed.expected.orderVatAmountMinor / 100).toFixed(2),
        total_discounts: "0.00",
        total_shipping_price_set: {
          presentment_money: { amount: "12.95", currency_code: "GBP" },
        },
      };
      const raw = Buffer.from(JSON.stringify(payload));
      const paid = await processSmartTrackPaidOrder(
        raw,
        createHmac("sha256", secret).update(raw).digest("base64"),
        {
          secret,
          group: async () => group,
          verifyDraft: async () => "gid://shopify/DraftOrder/1",
          record: async () => ({ duplicate: false }),
        },
      );
      assert.equal(paid.manifest.groups.tracks.length, 2);
      assert.equal(paid.manifest.groups.cushions.length, Number(cushion));
      assert.equal(paid.manifest.groups.curtains.length, Number(curtain));
      assert.equal(Boolean(paid.manifest.nativeCurtainPayment), curtain);
      await assert.rejects(
        checkoutMyHome(
          {
            ...checkout,
            revision: checkout.revision + 1,
            curtains: checkout.curtains
              ? { ...checkout.curtains, revision: checkout.revision + 1 }
              : undefined,
          },
          f.services,
        ),
        /REVIEW_CHANGED/,
      );
    }
});

test("browser assets exclude private prices and adviser knowledge follows release state", async () => {
  for (const name of [
    "pricing.ts",
    "package.ts",
    "../pricing.ts",
    "repository.ts",
  ])
    assert.equal((await smartTrackAsset(name)).status, 404);
  const body = await (await smartTrackAsset("index.html")).text();
  assert.ok(body.includes("SMART_TRACK_CONFIG"));
  assert.ok(!body.includes("COSTS_GROSS_MINOR"));
  const motorGuide = await (await smartTrackAsset("motors.html")).text();
  assert.match(motorGuide, /forest-track-cutaway.webp/);
  for (const name of ["motors.css", "motors.mjs", "forest-track-cutaway.webp", "forest-ion-battery.webp", "forest-motor-go.webp", "forest-motor-ion.webp"]) {
    const asset = await smartTrackAsset(name);
    assert.equal(asset.status, 200);
    assert.ok((await asset.arrayBuffer()).byteLength > 0);
  }
  assert.equal(smartTrackGuidance("jane", {}), "");
  assert.equal(
    smartTrackGuidance("ben", { CURTAINSUK_SMART_TRACK_ENABLED: "true" }),
    "",
  );
  const guidance = smartTrackGuidance("noah", {
    CURTAINSUK_SMART_TRACK_ENABLED: "true",
  });
  assert.match(guidance, /fullness only to coverage/);
  for (const lengthCm of ["100", "200", "300", "400", "500"])
    for (const heading of ["PENCIL", "WAVE"] as const) {
      const q = quoteSmartTrack(
        spec({
          lengthCm,
          heading,
          ...(heading === "WAVE" ? { waveSpacingMm: 60 } : {}),
        }),
      );
      assert.ok(guidance.includes((q.unitMinor / 100).toFixed(2)));
    }
  const partial = checkTrackWeight(
    { mode: "CURTAINSUK", configurationId: randomUUID() },
    25,
    {
      materials: [{ name: "face", grams: 26000 }],
      complete: false,
      assumptions: ["Purchased cloth may include offcuts"],
    },
  );
  assert.equal(partial.compatibility, "REVIEW_REQUIRED");
});
test("paid webhook authenticates, binds the exact lines and totals, and preserves motor identity", async () => {
  const s = spec({ system: "FOREST_SHUTTLE_ION" }),
    p = readyPackage(s.system),
    q = quoteSmartTrack(s, { package: p }),
    snapshot = createSmartTrackSnapshot(q, randomUUID(), p, { test: true });
  const reviewId = "a".repeat(64),
    key = randomUUID(),
    contract = buildSmartTrackOrder({
      snapshots: [snapshot],
      key,
      reviewId,
      shipping: smartTrackDelivery("BB2 3FA")!,
      production: true,
    });
  assert.throws(
    () =>
      buildSmartTrackOrder({
        snapshots: [snapshot],
        key,
        reviewId,
        base: {
          ...contract,
          input: {
            ...contract.input,
            lineItems: Array.from(
              { length: 100 },
              () => contract.input.lineItems[0],
            ),
          },
        },
        shipping: smartTrackDelivery("BB2 3FA")!,
        production: true,
      }),
    /TRACK_ORDER_TOO_LARGE/,
  );
  const group: TrackCheckoutGroup = {
    reviewId,
    contract,
    snapshots: [snapshot],
    cushions: [],
    packets: [
      {
        productType: "SMART_TRACK",
        snapshotId: snapshot.id,
        spec: snapshot.spec,
      },
    ],
  };
  const secret = "test-webhook-secret-".repeat(3),
    payload = {
      id: 123,
      name: "#TEST",
      financial_status: "paid",
      currency: "GBP",
      taxes_included: true,
      processed_at: new Date().toISOString(),
      note_attributes: contract.input.customAttributes.map((a) => ({
        name: a.key,
        value: a.value,
      })),
      line_items: contract.input.lineItems.map((l, i) => ({
        id: i + 1,
        quantity: l.quantity,
        price: l.originalUnitPriceWithCurrency.amount,
        total_discount: "0.00",
        properties: l.customAttributes.map((a) => ({
          name: a.key,
          value: a.value,
        })),
      })),
      total_price: (contract.expected.orderGrossAmountMinor / 100).toFixed(2),
      total_tax: (contract.expected.orderVatAmountMinor / 100).toFixed(2),
      total_discounts: "0.00",
      total_shipping_price_set: {
        presentment_money: { amount: "12.95", currency_code: "GBP" },
      },
    };
  let calls = 0;
  const services = {
    secret,
    group: async () => group,
    verifyDraft: async () => "gid://shopify/DraftOrder/1",
    record: async () => ({ duplicate: calls++ > 0 }),
  };
  const run = (v: unknown) => {
    const raw = Buffer.from(JSON.stringify(v));
    return processSmartTrackPaidOrder(
      raw,
      createHmac("sha256", secret).update(raw).digest("base64"),
      services,
    );
  };
  const result = await run(payload);
  assert.equal(result.manifest.groups.tracks.length, 1);
  assert.equal(result.manifest.packets[0].productType, "SMART_TRACK");
  assert.equal((await run(payload)).duplicate, true);
  await assert.rejects(run({ ...payload, total_price: "1.00" }), /FINANCIAL/);
  await assert.rejects(
    run({
      ...payload,
      line_items: [{ ...payload.line_items[0], quantity: 2 }],
    }),
    /LINES/,
  );
  await assert.rejects(
    processSmartTrackPaidOrder(Buffer.from("{}"), "bad", services),
    /SIGNATURE/,
  );
  assert.equal(calls, 2);
});
test("save, reopen, edit and quantity changes preserve track identity without manufacturing extra demo rooms", async () => {
  const Store = createRequire(import.meta.url)(
    "../../../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms-store.js",
  );
  const values = new Map<string, string>(),
    disk = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    };
  const s = spec({ weight: { mode: "UNKNOWN" }, weightConfirmation: { version: 1, system: "FOREST_SHUTTLE_GO", maximumKg: 35 } });
  let saved = await Store.addSmartTrack(s, {}, disk);
  const revision = saved.house.revision;
  assert.equal(Store.orderItems(Store.read(disk)).length, 1);
  assert.equal(Store.orderedCushionSpecs(saved.house).length, 0);
  assert.deepEqual(Store.orderedTrackSpecs(Store.read(disk))[0].weightConfirmation, s.weightConfirmation);
  saved = await Store.addSmartTrack(
    { ...s, lengthCm: "300.5", system: "FOREST_SHUTTLE_ION" },
    { editItemId: s.id, expectedRevision: revision },
    disk,
  );
  assert.equal(saved.house.products.length, 1);
  assert.equal(saved.house.products[0].id, s.id);
  assert.equal(Store.orderedTrackSpecs(Store.read(disk))[0].lengthCm, "300.5");
  await assert.rejects(
    Store.addSmartTrack(
      s,
      { editItemId: s.id, expectedRevision: revision },
      disk,
    ),
    /another tab/,
  );
  const updated = await Store.updateOrderItem(
    s.id,
    { quantity: 3 },
    saved.house.revision,
    disk,
  );
  assert.equal(Store.orderedTrackSpecs(updated)[0].quantity, 3);
});
test("migration denies browser access and enforces immutable track snapshots and one draft claim", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create schema curtainsuk_private; create role anon; create role authenticated; create role service_role; create table curtainsuk_private.staging_configuration_snapshots(snapshot_id uuid primary key); create table curtainsuk_private.fabric_colourways(fabric_id text primary key,supplier_id text,supplier_sku text);",
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261014163749_cushion_studio_distinct_persistence.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261017162157_smart_track_distinct_checkout.sql",
        "utf8",
      ),
    );
    const s = spec(),
      p = readyPackage(s.system),
      snapshot = createSmartTrackSnapshot(
        quoteSmartTrack(s, { package: p }),
        randomUUID(),
        p,
        { test: true },
      ),
      key = randomUUID(),
      group = {
        reviewId: "a".repeat(64),
        snapshots: [snapshot],
        cushions: [],
        contract: {},
        packets: [],
      };
    await db.query(
      "select curtainsuk_private.commit_smart_track_checkout($1,$2,$3)",
      ["a".repeat(64), key, JSON.stringify(group)],
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select curtainsuk_private.claim_smart_track_draft_creation($1,$2) v",
          ["a".repeat(64), key],
        )
      ).rows[0].v,
      true,
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select curtainsuk_private.claim_smart_track_draft_creation($1,$2) v",
          ["a".repeat(64), key],
        )
      ).rows[0].v,
      false,
    );
    await assert.rejects(
      db.query(
        "select curtainsuk_private.claim_smart_track_draft_creation($1,$2)",
        ["b".repeat(64), key],
      ),
      /OWNER/,
    );
    await assert.rejects(
      db.exec("delete from curtainsuk_private.smart_track_order_snapshots"),
      /IMMUTABLE/,
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select has_table_privilege('anon','curtainsuk_private.smart_track_order_snapshots','SELECT') v",
        )
      ).rows[0].v,
      false,
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select has_function_privilege('authenticated','curtainsuk_private.release_smart_track_order(text,text,text)','EXECUTE') v",
        )
      ).rows[0].v,
      false,
    );
    const order = "gid://shopify/Order/123",
      manifest = {
        checkoutKey: key,
        orderGid: order,
        packets: [],
        groups: {
          tracks: [{ snapshotId: snapshot.id, productType: "SMART_TRACK" }],
          curtains: [],
          cushions: [],
        },
        holdTogether: true,
      };
    for (const duplicate of [false, true])
      assert.equal(
        (
          await db.query<{ v: { duplicate: boolean } }>(
            "select curtainsuk_private.record_smart_track_paid_manifest($1,$2) v",
            [order, JSON.stringify(manifest)],
          )
        ).rows[0].v.duplicate,
        duplicate,
      );
    await assert.rejects(
      db.query(
        "select curtainsuk_private.record_smart_track_paid_manifest($1,$2)",
        [order, JSON.stringify({ ...manifest, holdTogether: false })],
      ),
      /IDENTITY/,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::integer n from curtainsuk_private.smart_track_supplier_releases",
        )
      ).rows[0].n,
      0,
    );
    await db.query(
      "select curtainsuk_private.release_smart_track_order($1,$2,$3)",
      [order, "test-staff", "test-reviewed-spec"],
    );
    await db.query(
      "insert into curtainsuk_private.smart_track_supplier_shipments(shipment_reference,shopify_order_gid) values($1,$2)",
      ["supplier-shipment-test", order],
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select sum(supplier_carriage_gross_minor)::integer n from curtainsuk_private.smart_track_supplier_shipments",
        )
      ).rows[0].n,
      1095,
    );
    await assert.rejects(
      db.query(
        "insert into curtainsuk_private.smart_track_supplier_shipments(shipment_reference,shopify_order_gid) values($1,$2)",
        ["supplier-shipment-test", order],
      ),
      /duplicate/,
    );
  } finally {
    await db.close();
  }
});
