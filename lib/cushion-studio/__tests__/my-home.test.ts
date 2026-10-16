import { reviewMyHome, checkoutMyHome, type MyHomeInput, type MyHomeServices } from "../my-home";
import { OWNER_CONFIRMED_CUSHION_DISPATCH, combinedMyHomeDispatch } from "../dispatch";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  retainCurtain,
  type HouseReviewRequest,
} from "../../storefront/rooms-core";
import { calculateProductionMtmCustomerPrice } from "../../storefront/production-pricing";
import { STOREFRONT_FABRICS } from "../../storefront/fabrics";
import {
  signReviewSubmissionWithSecret,
  verifyReviewSubmissionWithSecret,
} from "../../storefront/review-token-core";
import type { StagingPriceRequest } from "../../storefront/staging-pricing";
import type { HouseCheckoutServices } from "../../storefront/rooms-checkout";
import { quoteCushion } from "../pricing";
import {
  reviewMixedCheckout,
  executeMixedCheckout,
  type MixedServices,
} from "../mixed-checkout";
import type {
  CushionSpec,
  FabricCuttingFacts,
  CushionPricingRules,
} from "../domain";

// Synthetic authority fixtures: no hosted writes, rates or customer records.
const secret = "mixed-local-fixture-".repeat(4),
  source = STOREFRONT_FABRICS[0],
  now = new Date("2026-10-14T18:00:00Z");
const configuration: StagingPriceRequest = {
  fabricId: source.id,
  windowSlug: "french-doors",
  hardware: "TRACK",
  measurementBasis: "TRACK_WIDTH",
  widthCm: 201,
  dropCm: 236,
  heading: "WAVE",
  lining: "BLACKOUT",
  construction: "PAIR",
  stackDirection: "SPLIT",
  desiredFinish: "FLOOR",
};
const spec: CushionSpec = {
  version: 1,
  id: "cushion-test",
  sizeId: "square-50",
  fabricId: source.id,
  filling: "cover",
  edge: "unpiped",
  quantity: 1,
  placementMm: { x: 50, y: 50 },
};
const fabric: FabricCuttingFacts = {
  id: source.id,
  fullWidthMm: 1400,
  usableWidthMm: null,
  pattern: { kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0 },
  directional: false,
  calibration: {
    imageUrl: "https://example.invalid/test.jpg",
    physicalWidthMm: 1400,
    physicalHeightMm: 1000,
    evidence: "Synthetic only",
    orientation: "upright",
    tileable: false,
  },
  supplierCostMinorPerMetre: 2000,
  orderIncrementMetres: 0.01,
  minimumOrderMetres: 0,
  availableMetres: 100,
};
const rules: CushionPricingRules = {
  version: "synthetic",
  construction: {
    version: "synthetic",
    confirmed: true,
    squareDrapeConfirmed: true,
    seamAllowanceMm: 20,
    pipingStripWidthMm: null,
    pipingJoinAllowanceMm: null,
    pipingCut: null,
    pipingConfirmed: false,
  },
  marginBasisPoints: 5000,
  vatBasisPoints: 2000,
  carriageMinor: null,
  customerDeliveryGrossMinor: 495,
  supplierCarriageMinor: 0,
};
async function fixture() {
  const house: HouseCheckoutServices = {
    secret,
    now: () => now.toISOString(),
    calculate: async (c) => ({
      ...calculateProductionMtmCustomerPrice(c, {
        ...source,
        supplierCostPerMetre: { amountMinor: 1000, currency: "GBP" },
        supplierCostEffectiveFrom: "2026-10-14",
      }),
      stockSnapshotStale: false,
      commercialState: "ORDER_READY",
    }),
    verifyPrice: (configuration, configurationId, price, token) =>
      verifyReviewSubmissionWithSecret(
        {
          configuration,
          configurationId,
          outcome: price.outcome,
          totalAmountMinor: price.totalAmountMinor,
        },
        token,
        secret,
      ),
    fabric: async (id) => ({
      id,
      design: source.design,
      colour: source.colour,
      supplier: source.supplier,
      brand: "Test",
      imageUrl: null,
    }),
    stock: async () => true,
    delivery: async () => ({
      region: "UK_MAINLAND",
      parcelClass: "STANDARD",
      status: "READY",
      grossAmountMinor: 1295,
      currency: "GBP",
      shownSeparately: true,
      countsTowardGoodsMinimum: false,
      message: "Synthetic delivery",
    }),
    productionFabric: async () => ({
      supplierSku: "TEST",
      identity: {
        supplier: source.supplier,
        brand: "Test",
        design: source.design,
        colour: source.colour,
      },
    }),
  };
  const price = await house.calculate(configuration),
    configurationId = randomUUID(),
    token = signReviewSubmissionWithSecret(
      {
        configuration,
        configurationId,
        outcome: price.outcome,
        totalAmountMinor: price.totalAmountMinor,
      },
      secret,
    );
  const retained = await retainCurtain(
    { configuration, configurationId, priceConfirmationToken: token },
    house,
  );
  const request: HouseReviewRequest = {
    house_id: randomUUID(),
    revision: 1,
    postcode: "BB2 3FA",
    rooms: [
      {
        room_id: randomUUID(),
        room_name: "Lounge",
        curtains: [
          {
            configuration_id: retained.configuration_id,
            receipt: retained.receipt,
            window_name: "Main",
          },
        ],
      },
    ],
  };
  const effects: string[] = [],
    stored = new Map<string, any>();
  let seenMetres = 0;
  const services: MixedServices = {
    house,
    stock: async (id, metres) => {
      assert.equal(id, source.id);
      seenMetres = metres;
      return true;
    },
    shipping: async () => ({
      grossMinor: 1295,
      vatMinor: 216,
      title: "Single mixed charge",
    }),
    persistCurtains: async () => {
      effects.push("curtains");
    },
    cushion: {
      now: () => now,
      mode: "REVIEW",
      facts: async () => fabric,
      identity: async () => ({
        id: source.id,
        brand: "Test",
        design: source.design,
        colour: source.colour,
      }),
      rules: async () => rules,
      persist: async (input) => {
        effects.push("cushions");
        stored.set(input.key, input);
      },
      existing: async (key) => stored.get(key) ?? null,
      execute: async () => {
        effects.push("execute");
        return {
          status: "DISABLED",
          shopifyWritePerformed: false,
          checkoutUrl: null,
          draftOrderId: null,
          draftOrderName: null,
          paymentEnabled: false,
        };
      },
    },
  };
  return {
    input: {
      house: request,
      designId: "local-design",
      specs: [spec],
      expectedQuoteId: quoteCushion(spec, fabric, rules).quoteId,
    },
    services,
    effects,
    stored,
    seen: () => seenMetres,
    curtainMetres: price.fabricMetres!,
  };
}

async function homeFixture() {
  const f = await fixture();
  f.services.cushion.rules = async () => ({...rules,dispatchEstimate:OWNER_CONFIRMED_CUSHION_DISPATCH});
  const input: MyHomeInput = {version:1,id:f.input.house.house_id,revision:1,postcode:f.input.house.postcode,
    curtains:f.input.house,cushions:{designId:f.input.house.house_id,specs:[spec]}};
  const services: MyHomeServices = {mixed:f.services,releases:{curtains:true,cushions:true,mixed:true},
    curtainDispatch:{...OWNER_CONFIRMED_CUSHION_DISPATCH,version:"synthetic-curtain-six-weeks",minimumCalendarWeeks:5,maximumCalendarWeeks:6},
    executeHouse:async prepared=>{f.effects.push("house-execute");assert.equal(prepared.prepared,true);return {checkoutUrl:null,paymentEnabled:false,status:"REVIEW"};}};
  return {...f,input,services};
}
function checkoutInput(input:MyHomeInput,review:Awaited<ReturnType<typeof reviewMyHome>>) {
  return {...input,reviewId:review.reviewId,houseReviewToken:review.houseReviewToken ?? undefined,
    acceptedPriceChanges:review.acceptedPriceChanges,measurementsConfirmed:true,idempotencyKey:"my-home-test-checkout"};
}

test("My Home reviews both types, one curtain delivery and latest confirmed hold-together dispatch without writes",async()=>{
  const f=await homeFixture(),review=await reviewMyHome(f.input,f.services);
  assert.equal(review.ready,true);assert.equal(review.purchaseEnabled,true);
  assert.equal(review.lines.length,2);assert.equal(review.deliveryMinor,1295);
  assert.equal(review.totalMinor,review.goodsMinor!+1295);
  assert.equal(review.dispatchEstimate!.maximum,6);
  assert.equal(review.dispatchEstimate!.minimum,5);
  assert.equal(review.dispatchEstimate!.policy,"hold-together");
  assert.doesNotMatch(JSON.stringify(review),/approvalReference|supplierCostMinor/);
  assert.deepEqual(f.effects,[]);
});

test("cushion-only aggregate keeps separate specs, shared minimum, quantity and exactly 495 delivery",async()=>{
  const f=await homeFixture();delete f.input.curtains;
  f.input.cushions!.specs=[{...spec,id:"one",quantity:2},{...spec,id:"two",sizeId:"square-45"}];
  const review=await reviewMyHome(f.input,f.services);
  assert.equal(review.lines.length,2);assert.equal(review.lines[0].quantity,2);
  assert.equal(review.deliveryMinor,495);assert.equal(review.totalMinor,review.goodsMinor!+495);
  assert.equal(review.lines.reduce((sum,line)=>sum+line.totalMinor!,0),review.goodsMinor);
  assert.equal(review.dispatchEstimate!.maximum,4);
  assert.deepEqual(f.effects,[]);
});

test("curtain quantity multiplies stock and money and creates distinct immutable unit snapshots",async()=>{
  const f=await homeFixture();delete f.input.cushions;
  const single=await reviewMyHome(f.input,f.services);
  f.input.curtains!.rooms[0].curtains[0].quantity=3;
  let required=0;
  f.services.mixed.house.stock=async (_id,metres)=>{required=metres;return true;};
  const review=await reviewMyHome(f.input,f.services);
  assert.equal(review.goodsMinor,single.goodsMinor!*3);assert.equal(review.deliveryMinor,1295);
  assert.equal(required,f.curtainMetres*3);assert.equal(review.lines[0].quantity,3);
  let units=0;
  f.services.executeHouse=async prepared=>{
    units=prepared.curtains.length;
    assert.equal(new Set(prepared.curtains.map(c=>c.handoff.snapshot.snapshotId)).size,3);
    assert.equal(prepared.curtains.reduce((n,c)=>n+c.handoff.snapshot.calculatedFabricMetres,0),f.curtainMetres*3);
    assert.ok(prepared.contract.input.customAttributes.some(a=>a.key==="curtainsuk_hold_together"&&a.value==="true"));
    return {checkoutUrl:null,paymentEnabled:false};
  };
  await checkoutMyHome(checkoutInput(f.input,review),f.services);
  assert.equal(units,3);
  f.input.curtains!.rooms[0].curtains[0].quantity=0;
  await assert.rejects(reviewMyHome(f.input,f.services),/ROOMS_QUANTITY_INVALID/);
});

test("missing dispatch and closed release preserve price exploration but block all checkout effects",async()=>{
  const f=await homeFixture();f.services.curtainDispatch=null;
  let review=await reviewMyHome(f.input,f.services);
  assert.equal(review.ready,true);assert.equal(review.purchaseEnabled,false);assert.ok(review.totalMinor);
  await assert.rejects(checkoutMyHome(checkoutInput(f.input,review),f.services),/MY_HOME_PURCHASE_DISABLED/);
  f.services.curtainDispatch=OWNER_CONFIRMED_CUSHION_DISPATCH;f.services.releases.mixed=false;
  review=await reviewMyHome(f.input,f.services);
  assert.equal(review.purchaseEnabled,false);
  await assert.rejects(checkoutMyHome(checkoutInput(f.input,review),f.services),/MY_HOME_PURCHASE_DISABLED/);
  assert.deepEqual(f.effects,[]);
});

test("changed quantity or dispatch invalidates exact review and retries reuse immutable mixed snapshots",async()=>{
  const f=await homeFixture(),review=await reviewMyHome(f.input,f.services),request=checkoutInput(f.input,review);
  f.input.curtains!.rooms[0].curtains[0].quantity=2;
  await assert.rejects(checkoutMyHome(request,f.services),/MY_HOME_REVIEW_CHANGED/);
  delete f.input.curtains!.rooms[0].curtains[0].quantity;
  await checkoutMyHome(request,f.services);
  const stored=f.stored.get(request.idempotencyKey),ids=stored.snapshots.map((s:any)=>s.id);
  assert.equal(stored.snapshots[0].manufacturing.myHomeDispatch.maximum,6);
  const executed=f.services.mixed.cushion.execute;
  f.services.mixed.cushion.execute=async contract=>{
    assert.deepEqual(contract,stored.contract);
    return executed(contract);
  };
  await checkoutMyHome(request,f.services);
  assert.deepEqual(f.stored.get(request.idempotencyKey).snapshots.map((s:any)=>s.id),ids);
  assert.equal(f.effects.filter(x=>x==="cushions").length,1);
  f.services.curtainDispatch={...OWNER_CONFIRMED_CUSHION_DISPATCH,maximumCalendarWeeks:7};
  await assert.rejects(checkoutMyHome(request,f.services),/MY_HOME_REVIEW_CHANGED/);
});

test("mixed shared stock failure blocks the order even when each product authority passes alone",async()=>{
  const f=await homeFixture();f.services.mixed.stock=async()=>false;
  const review=await reviewMyHome(f.input,f.services);
  assert.equal(review.ready,false);assert.equal(review.totalMinor,null);
  assert.match(review.issues.join(" "),/Combined.*availability/);
  assert.deepEqual(f.effects,[]);
});

test("hold-together does not invent conversions or start dates for incomparable estimates",()=>{
  const week=OWNER_CONFIRMED_CUSHION_DISPATCH;
  const work={version:"test",status:"confirmed",minimumWorkingDays:15,maximumWorkingDays:20,startsFrom:"order-confirmation",confirmedAt:"2026-10-16",approvalReference:"synthetic"};
  assert.equal(combinedMyHomeDispatch([{productType:"CURTAIN",estimate:work},{productType:"CUSHION",estimate:week}]),null);
  assert.equal(combinedMyHomeDispatch([{productType:"CURTAIN",estimate:{...week,startsFrom:"fabric-availability-confirmation"}},{productType:"CUSHION",estimate:week}]),null);
});

test("unavailable curtain delivery cannot fall back to the cushion-only parcel charge",async()=>{
  const f=await homeFixture();
  f.services.mixed.house.delivery=async()=>{throw Error("synthetic delivery unavailable");};
  const review=await reviewMyHome(f.input,f.services);
  assert.equal(review.ready,false);
  assert.equal(review.deliveryMinor,null);
  assert.equal(review.totalMinor,null);
  assert.equal(review.purchaseEnabled,false);
  assert.deepEqual(f.effects,[]);
});

test("cushion-only retry keeps held dispatch evidence and refuses key reuse after order membership changes",async()=>{
  const f=await homeFixture();delete f.input.curtains;
  const review=await reviewMyHome(f.input,f.services),request=checkoutInput(f.input,review);
  await checkoutMyHome(request,f.services);
  const stored=f.stored.get(request.idempotencyKey);
  const executed=f.services.mixed.cushion.execute;
  f.services.mixed.cushion.execute=async contract=>{assert.deepEqual(contract,stored.contract);return executed(contract);};
  await checkoutMyHome(request,f.services);
  assert.equal(f.effects.filter(x=>x==="cushions").length,1);
  assert.equal(stored.snapshots[0].manufacturing.myHomeDispatch.policy,"hold-together");
  f.input.cushions!.specs=[{...spec,quantity:2}];
  const changed=await reviewMyHome(f.input,f.services);
  await assert.rejects(checkoutMyHome(checkoutInput(f.input,changed),f.services),/MY_HOME_IDEMPOTENCY_CONFLICT/);
});

test("one unconfirmed filling blocks only its line while shared set prices remain withheld",async()=>{
  const f=await homeFixture();delete f.input.curtains;
  f.input.cushions!.specs=[
    {...spec,id:"ready-cover"},
    {...spec,id:"pending-insert",filling:"filled",fillingType:"polyester",rangeVersion:"standard-inserts-v1"},
  ];
  let factReads=0,ruleReads=0;
  const readFacts=f.services.mixed.cushion.facts,readRules=f.services.mixed.cushion.rules;
  f.services.mixed.cushion.facts=async id=>{factReads++;return readFacts(id);};
  f.services.mixed.cushion.rules=async()=>{ruleReads++;return readRules();};
  const review=await reviewMyHome(f.input,f.services);
  const cover=review.lines.find(line=>line.id==="ready-cover")!;
  const filled=review.lines.find(line=>line.id==="pending-insert")!;
  assert.equal(cover.ready,true);assert.deepEqual(cover.issues,[]);
  assert.equal(filled.ready,false);assert.match(filled.issues.join(" "),/insert|fit/);
  assert.ok(filled.issues.every(issue=>!issue.includes("ready-cover")));
  assert.equal(review.ready,false);assert.equal(review.purchaseEnabled,false);
  assert.equal(review.totalMinor,null);assert.equal(review.goodsMinor,null);
  assert.ok(review.lines.every(line=>line.totalMinor===null&&line.unitMinor===null));
  assert.equal(review.deliveryMinor,495);
  assert.equal(factReads,1);assert.equal(ruleReads,1);
  assert.deepEqual(f.effects,[]);
});


test("cushion-only checkout requires explicit specification confirmation",async()=>{
  const f=await homeFixture();delete f.input.curtains;
  const review=await reviewMyHome(f.input,f.services);
  await assert.rejects(checkoutMyHome({...checkoutInput(f.input,review),measurementsConfirmed:false},f.services),/MY_HOME_CHECKOUT_INVALID/);
  assert.deepEqual(f.effects,[]);
});

test('Current curtain fabric card resolves the exact identity without changing pricing or review identity on a photo refresh',async()=>{
 const f=await homeFixture(),original=f.services.mixed.house.fabric;
 const before=await reviewMyHome(f.input,f.services);
 f.services.mixed.house.fabric=async id=>({...await original(id),imageUrl:'https://example.test/exact-fabric.jpg'});
 const after=await reviewMyHome(f.input,f.services),curtain=after.lines.find(line=>line.kind==='CURTAIN')!;
 assert.equal(curtain.fabric?.id,source.id);assert.equal(curtain.fabric?.imageUrl,'https://example.test/exact-fabric.jpg');
 assert.equal(after.reviewId,before.reviewId);assert.equal(after.totalMinor,before.totalMinor);assert.deepEqual(f.effects,[]);
});
