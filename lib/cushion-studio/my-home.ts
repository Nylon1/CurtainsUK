import { roomsDigest, reviewHouse, type HouseReviewRequest, type RoomsFabric } from "../storefront/rooms-core";
import { prepareHouseCheckout } from "../storefront/rooms-checkout";
import { parseCushionSpec } from "./domain";
import { quoteCushionSet } from "./pricing";
import { customerCushionQuote } from "./commerce";
import { prepareCushionCheckout, type CushionCheckoutServices } from "./checkout";
import { combinedMyHomeDispatch, customerMyHomeDispatch } from "./dispatch";
import { reviewMixedCheckout, executeMixedCheckout, type MixedServices } from "./mixed-checkout";
import { parseSmartTrackSpec } from '../smart-track/domain';
import { quoteSmartTrack } from '../smart-track/pricing';
import { linkedCurtainEvidence } from '../smart-track/linked';
import { smartTrackDelivery } from '../smart-track/delivery';
import { allocateVatFromGross } from '../storefront/shopify-draft-order-core';
import { CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS } from '../storefront/checkout-gates';
import { checkoutSmartTrackOrder, type SmartTrackServices } from '../smart-track/checkout';

export type MyHomeInput = {
  version: 1;
  id: string;
  revision: number;
  postcode: string;
  curtains?: HouseReviewRequest;
  cushions?: { designId: string; specs: unknown[]; expectedQuoteId?: string };
  tracks?: { specs: unknown[] };
};
export type MyHomeServices = {
  mixed: MixedServices;
  releases: { curtains: boolean; cushions: boolean; mixed: boolean };
  curtainDispatch: unknown;
  tracks?: SmartTrackServices;
  executeHouse(prepared: Extract<Awaited<ReturnType<typeof prepareHouseCheckout>>, {prepared:true}>): Promise<{checkoutUrl: string | null; paymentEnabled: boolean; status?: string}>;
};
export type MyHomeLine = {
  id: string; kind: "CURTAIN" | "CUSHION" | "SMART_TRACK"; name: string; quantity: number;
  totalMinor: number | null; unitMinor: number | null; ready: boolean; issues: string[]; fabric?: RoomsFabric; weight?: ReturnType<typeof quoteSmartTrack>['weight'];
};
function validate(input: MyHomeInput) {
  if (!input || input.version !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id) ||
    !Number.isSafeInteger(input.revision) || input.revision < 0 || typeof input.postcode !== "string" || input.postcode.length > 16 ||
    (!input.curtains && !input.cushions && !input.tracks)) throw Error("MY_HOME_INPUT_INVALID");
  if(input.tracks && (!Array.isArray(input.tracks.specs)||!input.tracks.specs.length||input.tracks.specs.length>32))throw Error('MY_HOME_INPUT_INVALID');
  if (input.curtains && (input.curtains.house_id !== input.id || input.curtains.revision !== input.revision || input.curtains.postcode !== input.postcode))
    throw Error("MY_HOME_IDENTITY_MISMATCH");
  if (input.cushions && (input.cushions.designId !== input.id || !Array.isArray(input.cushions.specs) || !input.cushions.specs.length || input.cushions.specs.length > 32))
    throw Error("MY_HOME_IDENTITY_MISMATCH");
}
function unit(total: number | null, quantity: number) {
  return total !== null && total % quantity === 0 ? total / quantity : null;
}
async function cushionQuote(input: NonNullable<MyHomeInput["cushions"]>, services: CushionCheckoutServices) {
  const specs = input.specs.map(parseCushionSpec);
  if (new Set(specs.map(s=>s.id)).size !== specs.length) throw Error("CUSHION_IDS_INVALID");
  const ids = [...new Set(specs.flatMap(s=>[s.fabricId,...(s.pipingFabricId ? [s.pipingFabricId] : [])]))];
  const records = await Promise.all(ids.map(id=>services.facts(id)));
  const facts = new Map(records.map(record=>[record.id,record]));
  if (ids.some(id=>!facts.has(id))) throw Error("CUSHION_FABRIC_CURRENT_RECORD_REQUIRED");
  const rules = await services.rules();
  const entries = specs.map(spec=>({spec,facts:facts.get(spec.fabricId)!,pipingFacts:spec.pipingFabricId ? facts.get(spec.pipingFabricId) : undefined}));
  const set = quoteCushionSet(entries,rules);
  // Diagnose each affected configuration with the same freshly loaded facts and
  // rules. Standalone prices are not allocations of the shared set cut plan.
  const individualReadiness = new Map(set.ready ? [] : entries.map(entry => {
    const individual = quoteCushionSet([entry],rules);
    return [entry.spec.id,{ready:individual.ready,issues:individual.issues}] as const;
  }));
  return {set,individualReadiness};
}

async function currentReview(input: MyHomeInput, services: MyHomeServices) {
  validate(input);
  const house = input.curtains ? await reviewHouse(input.curtains,services.mixed.house) : null;
  const cushionReview = input.cushions ? await cushionQuote(input.cushions,services.mixed.cushion) : null;
  const cushion = cushionReview?.set ?? null;
  if(input.tracks&&!services.tracks)throw Error('TRACK_UNAVAILABLE');
  const tracks = input.tracks ? await Promise.all(input.tracks.specs.map(async spec => {
    const id=(spec as {linkedCurtain?:{configurationId:string}})?.linkedCurtain?.configurationId;
    return quoteSmartTrack(spec,{package:services.tracks!.package(parseSmartTrackSpec(spec).system),linked:id?await linkedCurtainEvidence(id,input.curtains,services.mixed.house,services.tracks?.fabricWeight):undefined});
  })) : [];
  if(new Set([...tracks.map(t=>t.spec.id),...(cushion?.specs.map(s=>s.id)??[]),...(house?.lines.map(l=>l.configuration_id)??[])]).size!==tracks.length+(cushion?.specs.length??0)+(house?.lines.length??0))throw Error('MY_HOME_IDENTITY_MISMATCH');
  const trackDelivery = tracks.length ? smartTrackDelivery(input.postcode) : null;
  const dispatch = combinedMyHomeDispatch([
    ...(house ? [{productType:"CURTAIN" as const,estimate:services.curtainDispatch}] : []),
    ...(cushion ? [{productType:"CUSHION" as const,estimate:cushion.dispatchEstimate}] : []),
    ...tracks.map(t=>({productType:'SMART_TRACK' as const,estimate:services.tracks!.package(t.spec.system).dispatch})),
  ]);
  const lines: MyHomeLine[] = [
    ...tracks.map(t=>({id:t.spec.id,kind:'SMART_TRACK' as const,name:`${t.package.motor} · ${t.spec.lengthCm} cm`,quantity:t.spec.quantity,
      totalMinor:t.goodsMinor,unitMinor:t.unitMinor,ready:t.purchaseReady,issues:t.issues,weight:t.weight})),
    ...(house?.lines.map(line=>({id:line.configuration_id,kind:"CURTAIN" as const,name:line.window_name,
      quantity:line.quantity ?? 1,totalMinor:line.currentPrice,unitMinor:unit(line.currentPrice,line.quantity ?? 1),
      ready:line.status !== "BLOCKED",issues:line.status === "READY" ? [] : [line.message]})) ?? []),
    ...(cushion?.items.map(item=>({id:item.specId,kind:"CUSHION" as const,name:"Cushion",
      quantity:item.quantity,totalMinor:cushion.ready ? item.goodsGrossMinor : null,
      unitMinor:unit(cushion.ready ? item.goodsGrossMinor : null,item.quantity),
      ready:cushion.ready || cushionReview!.individualReadiness.get(item.specId)!.ready,
      issues:cushion.ready ? [] : cushionReview!.individualReadiness.get(item.specId)!.issues})) ?? []),
  ];
  const issues = [
    ...tracks.flatMap(t=>t.issues),
    ...(tracks.length&&!trackDelivery?['Enter a supported UK mainland delivery postcode to confirm smart-track delivery.']:[]),
    ...(house && !house.ready ? ["Curtain price, stock or delivery needs review."] : []),
    ...(cushion && !cushion.ready ? cushion.issues : []),
    ...(!dispatch ? ["A confirmed, comparable dispatch estimate is required for every product type. Your items remain saved and will be held together."] : []),
  ];
  const mixedInput = house && cushion ? {house:input.curtains!,designId:input.id,specs:cushion.specs,expectedQuoteId:cushion.quoteId} : null;
  let mixed: Awaited<ReturnType<typeof reviewMixedCheckout>> | null = null;
  if (mixedInput && house!.ready && cushion!.ready) {
    try { mixed = await reviewMixedCheckout(mixedInput,services.mixed); }
    catch (error) {
      if (!(error instanceof Error) || !["MIXED_COMBINED_STOCK_CHANGED","MIXED_DELIVERY_REVIEW_REQUIRED","MIXED_DELIVERY_POLICY_REQUIRED"].includes(error.message)) throw error;
      issues.push(error.message === "MIXED_COMBINED_STOCK_CHANGED" ? "Combined curtain and cushion fabric availability needs review." : "Combined delivery needs review.");
    }
  }
  const tooManyTrackOrderLines=tracks.length>0&&tracks.length+(cushion?.specs.length??0)+(house?.lines.reduce((n,l)=>n+(l.quantity??1),0)??0)>100;
  if(tooManyTrackOrderLines)issues.push("This combined order is too large for one checkout. Please contact us to arrange it.");
  const baseReady = Boolean((!house || house.ready) && (!cushion || cushion.ready) && (!mixedInput || mixed));
  const productReady = baseReady && !tooManyTrackOrderLines && (!tracks.length || Boolean(trackDelivery) && tracks.every(t=>t.purchaseReady));
  const gross = baseReady ? (mixed?.contract.expected.goodsGrossAmountMinor ?? house?.goods ?? cushion?.items.reduce((n,item)=>n+item.goodsGrossMinor!,0) ?? 0)+tracks.reduce((n,t)=>n+t.goodsMinor,0) : null;
  // Presence of curtains always selects the governed curtain delivery once.
  const delivery = tracks.length ? trackDelivery?.grossMinor ?? null : house ? mixed?.contract.expected.shippingGrossAmountMinor ?? house.delivery : cushion?.deliveryGrossMinor ?? null;
  const total = tracks.length ? gross!==null&&delivery!==null?gross+delivery:null : productReady ? mixed?.contract.expected.orderGrossAmountMinor ?? house?.total ?? cushion?.totalMinor ?? null : null;
  const baseVat = mixed ? mixed.contract.expected.goodsVatAmountMinor : house ? (house.vat??0)-allocateVatFromGross(house.delivery??0,CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS) : cushion ? cushion.items.reduce((n,i)=>n+(i.goodsVatMinor??0),0) : 0;
  const vat = tracks.length ? baseReady&&trackDelivery?baseVat+tracks.reduce((n,t)=>n+t.vatMinor,0)+trackDelivery.vatMinor:null : productReady ? mixed?.contract.expected.orderVatAmountMinor ?? house?.vat ?? cushion?.vatMinor ?? null : null;
  const baseRelease = house && cushion ? services.releases.curtains && services.releases.cushions && services.releases.mixed : house ? services.releases.curtains : cushion ? services.releases.cushions : true;
  const release = baseRelease && (!tracks.length||services.tracks?.purchasesEnabled===true);
  const reviewId = roomsDigest({version:"my-home-review-v1",id:input.id,revision:input.revision,postcode:input.postcode,
    curtains:input.curtains ?? null,cushionSpecs:cushion?.specs ?? null,quoteId:cushion?.quoteId ?? null,
    mixedReviewId:mixed?.reviewId ?? null,...(tracks.length?{trackQuotes:tracks.map(t=>t.quoteId)}:{}),lines,goods:gross,delivery,total,vat,dispatch});
  const acceptedPriceChanges = house?.lines.filter(line=>line.status === "PRICE_CHANGED").map(line=>({configuration_id:line.configuration_id,currentPrice:line.currentPrice!})) ?? [];
  return { house,cushion,mixed,mixedInput,dispatch,tracks,trackDelivery, response:{
    version:1 as const,id:input.id,revision:input.revision,reviewId,ready:productReady,
    purchaseReady:productReady && dispatch !== null,purchaseEnabled:release && productReady && dispatch !== null,
    lines:lines.map(line=>{const fabric=line.kind==="CURTAIN" ? house?.lines.find(saved=>saved.configuration_id===line.id)?.fabric : undefined;return fabric ? {...line,fabric} : line;}),totalMinor:total,goodsMinor:gross,deliveryMinor:delivery,vatMinor:vat,currency:"GBP" as const,
    dispatchEstimate:customerMyHomeDispatch(dispatch),holdTogether:true,
    quoteId:cushion?.quoteId ?? null,expectedQuoteId:cushion?.quoteId ?? null,
    cushionQuote:cushion ? customerCushionQuote(cushion) : null,
    houseReviewToken:house?.reviewToken ?? null,acceptedPriceChanges,issues,
  }};
}
export async function reviewMyHome(input: MyHomeInput, services: MyHomeServices) {
  return (await currentReview(input,services)).response;
}

export type MyHomeCheckoutInput = MyHomeInput & {
  reviewId: string; houseReviewToken?: string; acceptedPriceChanges?: Array<{configuration_id:string;currentPrice:number}>;
  measurementsConfirmed: boolean; idempotencyKey: string;
};
/** Entire order is revalidated, never the active room or last edited cushion only. */
export async function checkoutMyHome(input: MyHomeCheckoutInput, services: MyHomeServices) {
  if (input.measurementsConfirmed !== true || !/^[a-f0-9]{64}$/.test(input.reviewId) || !/^[a-zA-Z0-9-]{8,100}$/.test(input.idempotencyKey)) throw Error("MY_HOME_CHECKOUT_INVALID");
  const review = await currentReview(input,services);
  if (review.response.reviewId !== input.reviewId) throw Error("MY_HOME_REVIEW_CHANGED");
  if (!review.response.purchaseEnabled) throw Error("MY_HOME_PURCHASE_DISABLED");
  const dispatch = review.dispatch!;
  if(input.tracks) return checkoutSmartTrackOrder(input,services,{quotes:review.tracks,shipping:review.trackDelivery!,dispatch,
    mixed:review.mixed,expected:review.response});
  const decorate = (contract: Parameters<CushionCheckoutServices["execute"]>[0]) => ({...contract,input:{...contract.input,
    customAttributes:[...contract.input.customAttributes.filter(attribute=>!["curtainsuk_my_home_review_id","curtainsuk_hold_together","curtainsuk_my_home_dispatch"].includes(attribute.key)),
      {key:"curtainsuk_my_home_review_id",value:input.reviewId},
      {key:"curtainsuk_hold_together",value:"true"},
      {key:"curtainsuk_my_home_dispatch",value:JSON.stringify(customerMyHomeDispatch(dispatch))}]}});
  const wrapCushion: CushionCheckoutServices = {
    ...services.mixed.cushion,
    existing: services.mixed.cushion.existing ? async key => {
      const existing = await services.mixed.cushion.existing!(key);
      if (existing && existing.contract.input.customAttributes.find(attribute=>attribute.key === "curtainsuk_my_home_review_id")?.value !== input.reviewId)
        throw Error("MY_HOME_IDEMPOTENCY_CONFLICT");
      return existing;
    } : undefined,
    execute: contract => services.mixed.cushion.execute(decorate(contract)),
    persist: async ({snapshots,contract,...rest}) => services.mixed.cushion.persist({
      ...rest,snapshots:snapshots.map(snapshot=>({...snapshot,manufacturing:{...snapshot.manufacturing,myHomeDispatch:dispatch,myHomeReviewId:input.reviewId}})),
      contract:decorate(contract),
    }),
  };
  if (review.mixedInput) {
    const result = await executeMixedCheckout({...review.mixedInput,reviewId:review.mixed!.reviewId,
      houseReviewToken:input.houseReviewToken ?? "",acceptedPriceChanges:input.acceptedPriceChanges ?? [],
      measurementsConfirmed:input.measurementsConfirmed,idempotencyKey:input.idempotencyKey},
      {...services.mixed,cushion:wrapCushion});
    return {checkoutUrl:result.execution.checkoutUrl,purchaseEnabled:result.execution.paymentEnabled,status:result.execution.status};
  }
  if (input.curtains) {
    const prepared = await prepareHouseCheckout({house:input.curtains,reviewToken:input.houseReviewToken ?? "",
      acceptedPriceChanges:input.acceptedPriceChanges ?? [],measurementsConfirmed:input.measurementsConfirmed},services.mixed.house);
    if (!prepared.prepared) throw Error("MY_HOME_REVIEW_CHANGED");
    const fingerprint = roomsDigest({native:prepared.contract.fingerprint,myHomeReviewId:input.reviewId});
    const result = await services.executeHouse({...prepared,contract:{...prepared.contract,fingerprint,
      idempotencyTag:`my-home-${fingerprint}`,input:{...prepared.contract.input,
        tags:[...prepared.contract.input.tags,`my-home-${fingerprint}`],
        customAttributes:[...prepared.contract.input.customAttributes.filter(attribute=>attribute.key !== "curtainsuk_house_fingerprint"),
          {key:"curtainsuk_house_fingerprint",value:fingerprint},
          {key:"curtainsuk_my_home_review_id",value:input.reviewId},
          {key:"curtainsuk_hold_together",value:"true"},
          {key:"curtainsuk_my_home_dispatch",value:JSON.stringify(customerMyHomeDispatch(dispatch))},
          {key:"_curtainsuk_my_home_dispatch_evidence",value:JSON.stringify(dispatch)}]}}});
    return {checkoutUrl:result.checkoutUrl,purchaseEnabled:result.paymentEnabled,status:result.status};
  }
  const result = await prepareCushionCheckout({designId:input.id,specs:review.cushion!.specs,
    expectedQuoteId:review.cushion!.quoteId,idempotencyKey:input.idempotencyKey},wrapCushion);
  return {checkoutUrl:result.execution.checkoutUrl,purchaseEnabled:result.execution.paymentEnabled,status:result.execution.status};
}
