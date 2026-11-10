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
import type {RomanQuote} from '../roman-blind/pricing';
import {quoteOwnerApprovedCurtainShipping,STAGING_SHIPPING_OWNER_INPUTS,deliveryRequiresReview} from '../storefront/shipping-owner-inputs';
import { combinedRomanStockAvailable } from './combined-roman-stock';

export type MyHomeInput = {
  version: 1;
  id: string;
  revision: number;
  postcode: string;
  curtains?: HouseReviewRequest;
  cushions?: { designId: string; specs: unknown[]; expectedQuoteId?: string };
  tracks?: { specs: unknown[] };
  romans?: { specs: unknown[] };
};
export type MyHomeServices = {
  mixed: MixedServices;
  releases: { curtains: boolean; cushions: boolean; mixed: boolean };
  curtainDispatch: unknown;
  romanDispatch?: unknown;
  romanPurchasesEnabled?: boolean;
  romanQuote?: (spec: unknown) => Promise<RomanQuote>;
  romanCombinedStock?: (supplierId: string, supplierSku: string, metres: number) => Promise<boolean>;
  reviewTiming?: (timing: {stage:"base"|"discount";durationMs:number;productTypes:string[];phasesMs:Record<string,number>;calls:Record<string,{count:number;totalMs:number;maxMs:number}>}) => void;
  tracks?: SmartTrackServices;
  executeHouse(prepared: Extract<Awaited<ReturnType<typeof prepareHouseCheckout>>, {prepared:true}>): Promise<{checkoutUrl: string | null; paymentEnabled: boolean; status?: string}>;
};
export type MyHomeLine = {
  id: string; kind: "CURTAIN" | "CUSHION" | "SMART_TRACK" | "ROMAN_BLIND"; name: string; quantity: number;
  totalMinor: number | null; unitMinor: number | null; ready: boolean; issues: string[]; fabric?: RoomsFabric; weight?: ReturnType<typeof quoteSmartTrack>['weight']; weightAcceptance?: ReturnType<typeof quoteSmartTrack>['weightAcceptance'];
};
function validate(input: MyHomeInput) {
  if (!input || input.version !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id) ||
    !Number.isSafeInteger(input.revision) || input.revision < 0 || typeof input.postcode !== "string" || input.postcode.length > 16 ||
    (!input.curtains && !input.cushions && !input.tracks && !input.romans)) throw Error("MY_HOME_INPUT_INVALID");
  if(input.tracks && (!Array.isArray(input.tracks.specs)||!input.tracks.specs.length||input.tracks.specs.length>32))throw Error('MY_HOME_INPUT_INVALID');
  if(input.romans && (!Array.isArray(input.romans.specs)||!input.romans.specs.length||input.romans.specs.length>32))throw Error('MY_HOME_INPUT_INVALID');
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
  const started=performance.now();
  const phasesMs:Record<string,number>={};
  const calls:Record<string,{count:number;totalMs:number;maxMs:number}>={};
  const timed=async <T>(phase:string,promise:Promise<T>):Promise<T>=>{
    const phaseStarted=performance.now();
    try{return await promise;}finally{phasesMs[phase]=Math.round(performance.now()-phaseStarted);}
  };
  const instrument=<A extends unknown[],T>(name:string,fn:(...args:A)=>Promise<T>)=>async (...args:A):Promise<T>=>{
    const callStarted=performance.now();
    try{return await fn(...args);}finally{
      const duration=Math.round(performance.now()-callStarted);
      const entry=calls[name]??{count:0,totalMs:0,maxMs:0};
      entry.count++;entry.totalMs+=duration;entry.maxMs=Math.max(entry.maxMs,duration);calls[name]=entry;
    }
  };
  const mixedServices:MixedServices=services.reviewTiming?{...services.mixed,
    house:{...services.mixed.house,
      calculate:instrument("curtainPricing",services.mixed.house.calculate),
      fabric:instrument("curtainFabric",services.mixed.house.fabric),
      stock:instrument("curtainStock",services.mixed.house.stock),
      delivery:instrument("curtainDelivery",services.mixed.house.delivery),
      productionFabric:instrument("curtainIdentity",services.mixed.house.productionFabric)},
    cushion:{...services.mixed.cushion,
      facts:instrument("cushionFacts",services.mixed.cushion.facts),
      rules:instrument("cushionRules",services.mixed.cushion.rules),
      identity:instrument("cushionIdentity",services.mixed.cushion.identity)},
    stock:instrument("combinedStock",services.mixed.stock),
  }:services.mixed;
  validate(input);
  if(input.tracks&&!services.tracks)throw Error('TRACK_UNAVAILABLE');
  // Each product authority is independent until the combined stock and delivery
  // checks below. Run them together to keep the first checkout handoff responsive.
  const [house,cushionReview,tracks,romans] = await Promise.all([
    input.curtains ? timed("curtainReview",reviewHouse(input.curtains,mixedServices.house)) : Promise.resolve(null),
    input.cushions ? timed("cushionQuote",cushionQuote(input.cushions,mixedServices.cushion)) : Promise.resolve(null),
    input.tracks ? timed("trackQuote",Promise.all(input.tracks.specs.map(async spec => {
    const id=(spec as {linkedCurtain?:{configurationId:string}})?.linkedCurtain?.configurationId;
    return quoteSmartTrack(spec,{package:services.tracks!.package(parseSmartTrackSpec(spec).system),linked:id?await linkedCurtainEvidence(id,input.curtains,mixedServices.house,services.tracks?.fabricWeight):undefined});
    }))) : Promise.resolve([]),
    input.romans ? timed("romanQuote",(async()=>Promise.all(input.romans!.specs.map(services.romanQuote??(await import('../roman-blind/pricing')).quoteRoman)))()) : Promise.resolve([] as RomanQuote[]),
  ]);
  const cushion = cushionReview?.set ?? null;
  if(new Set([...tracks.map(t=>t.spec.id),...romans.map(r=>r.spec.id),...(cushion?.specs.map(s=>s.id)??[]),...(house?.lines.map(l=>l.configuration_id)??[])]).size!==tracks.length+romans.length+(cushion?.specs.length??0)+(house?.lines.length??0))throw Error('MY_HOME_IDENTITY_MISMATCH');
  const trackDelivery = tracks.length ? smartTrackDelivery(input.postcode) : null;
  let romanDelivery: {grossMinor:number;vatMinor:number;title:string;postcode:string}|null=null;
  if(romans.length&&romans.every(r=>r.fabricMetres!==null)){
    const highestDrop=Math.max(...romans.map(r=>r.spec.drop));
    const quoted=quoteOwnerApprovedCurtainShipping({selectedRegion:'UK_MAINLAND',postcode:input.postcode,
      fabricMetres:romans.reduce((n,r)=>n+r.fabricMetres!,0),maximumDropCm:highestDrop,
      requiresDeliveryReview:romans.some(r=>deliveryRequiresReview('roman-blind',{coverage_width:r.spec.width,finished_drop:r.spec.drop})),
      rules:[],policy:STAGING_SHIPPING_OWNER_INPUTS});
    if(quoted.status==='READY'&&quoted.grossAmountMinor!==null)romanDelivery={grossMinor:quoted.grossAmountMinor,vatMinor:allocateVatFromGross(quoted.grossAmountMinor,CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS),title:'Combined order delivery',postcode:input.postcode.toUpperCase().replace(/\s/g,'')};
  }
  const dispatch = combinedMyHomeDispatch([
    ...(house ? [{productType:"CURTAIN" as const,estimate:services.curtainDispatch}] : []),
    ...(cushion ? [{productType:"CUSHION" as const,estimate:cushion.dispatchEstimate}] : []),
    ...tracks.map(t=>({productType:'SMART_TRACK' as const,estimate:services.tracks!.package(t.spec.system).dispatch})),
    ...(romans.length?[{productType:'ROMAN_BLIND' as const,estimate:services.romanDispatch}]:[]),
  ]);
  const lines: MyHomeLine[] = [
    ...romans.map(r=>({id:r.spec.id,kind:'ROMAN_BLIND' as const,name:`Roman blind · ${r.spec.width} × ${r.spec.drop} cm`,quantity:r.spec.quantity,
      totalMinor:r.goodsMinor,unitMinor:r.unitMinor,ready:r.ready,issues:r.issues})),
    ...tracks.map(t=>({id:t.spec.id,kind:'SMART_TRACK' as const,name:`${t.package.motor} · ${t.spec.lengthCm} cm`,quantity:t.spec.quantity,
      totalMinor:t.goodsMinor,unitMinor:t.unitMinor,ready:t.purchaseReady,issues:t.issues,weight:t.weight,weightAcceptance:t.weightAcceptance})),
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
    ...romans.flatMap(r=>r.issues),
    ...(romans.length&&!romanDelivery?['Roman blind delivery needs confirmation for this size.']:[]),
    ...tracks.flatMap(t=>t.issues),
    ...(tracks.length&&!trackDelivery?['Smart-track delivery needs confirmation.']:[]),
    ...(house && !house.ready ? ["Curtain price, stock or delivery needs review."] : []),
    ...(cushion && !cushion.ready ? cushion.issues : []),
    ...(!dispatch ? ["A confirmed, comparable dispatch estimate is required for every product type. Your items remain saved and will be held together."] : []),
  ];
  const mixedInput = house && cushion ? {house:input.curtains!,designId:input.id,specs:cushion.specs,expectedQuoteId:cushion.quoteId} : null;
  let mixed: Awaited<ReturnType<typeof reviewMixedCheckout>> | null = null;
  if (mixedInput && house!.ready && cushion!.ready) {
    try { mixed = await timed("mixedReview",reviewMixedCheckout(mixedInput,mixedServices,{request:input.curtains!,result:house!},(phase,duration)=>{phasesMs[phase]=duration;})); }
    catch (error) {
      if (!(error instanceof Error) || !["MIXED_COMBINED_STOCK_CHANGED","MIXED_DELIVERY_REVIEW_REQUIRED","MIXED_DELIVERY_POLICY_REQUIRED"].includes(error.message)) throw error;
      issues.push(error.message === "MIXED_COMBINED_STOCK_CHANGED" ? "Combined curtain and cushion fabric availability needs review." : "Combined delivery needs review.");
    }
  }
  const cushionRequirements = new Map<string, number>();
  for (const cloth of cushion?.cutPlan.fabrics ?? []) {
    cushionRequirements.set(cloth.fabricId,cloth.orderedMetres === null ? NaN :
      (cushionRequirements.get(cloth.fabricId)??0)+cloth.orderedMetres);
  }
  for (const spec of cushion?.specs ?? []) for (const id of [spec.fabricId,spec.pipingFabricId]) {
    if (id && !cushionRequirements.has(id)) cushionRequirements.set(id,NaN);
  }
  const combinedRomanStockReady = !romans.length || await timed("combinedRomanStock",combinedRomanStockAvailable({
    curtains: house?.stockRequirements ?? new Map(), cushions:cushionRequirements, romans,
    curtainStock: mixedServices.stock,
    romanStock: services.romanCombinedStock ?? (async (supplierId,supplierSku,metres) => {
      const stock=await (await import('../storefront/daily-stock-server')).dailyStockProjection({supplierId,supplierSku,requirement:{quantity:metres,stock_unit:'METRE'}});
      return !stock.stale && stock.availability==='FABRIC_AVAILABLE';
    }),
  }));
  if(!combinedRomanStockReady)issues.push('Combined fabric availability needs confirmation for this order.');
  const tooManyTrackOrderLines=(tracks.length>0||romans.length>0)&&tracks.length+romans.length+(cushion?.specs.length??0)+(house?.lines.reduce((n,l)=>n+(l.quantity??1),0)??0)>100;
  if(tooManyTrackOrderLines)issues.push("This combined order is too large for one checkout. Please contact us to arrange it.");
  const baseReady = Boolean((!house || house.ready) && (!cushion || cushion.ready) && (!mixedInput || mixed));
  const productReady = baseReady && !tooManyTrackOrderLines && combinedRomanStockReady && (!tracks.length || Boolean(trackDelivery) && tracks.every(t=>t.purchaseReady)) && (!romans.length||Boolean(romanDelivery)&&romans.every(r=>r.ready));
  const gross = baseReady&&romans.every(r=>r.goodsMinor!==null) ? (mixed?.contract.expected.goodsGrossAmountMinor ?? house?.goods ?? cushion?.items.reduce((n,item)=>n+item.goodsGrossMinor!,0) ?? 0)+tracks.reduce((n,t)=>n+t.goodsMinor,0)+romans.reduce((n,r)=>n+r.goodsMinor!,0) : null;
  // Presence of curtains always selects the governed curtain delivery once.
  const delivery = tracks.length ? trackDelivery?.grossMinor ?? null : romans.length ? romanDelivery?.grossMinor ?? null : house ? mixed?.contract.expected.shippingGrossAmountMinor ?? house.delivery : cushion?.deliveryGrossMinor ?? null;
  const total = tracks.length||romans.length ? gross!==null&&delivery!==null?gross+delivery:null : productReady ? mixed?.contract.expected.orderGrossAmountMinor ?? house?.total ?? cushion?.totalMinor ?? null : null;
  const baseVat = mixed ? mixed.contract.expected.goodsVatAmountMinor : house ? (house.vat??0)-allocateVatFromGross(house.delivery??0,CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS) : cushion ? cushion.items.reduce((n,i)=>n+(i.goodsVatMinor??0),0) : 0;
  const vat = tracks.length||romans.length ? baseReady&&(trackDelivery||romanDelivery)&&romans.every(r=>r.vatMinor!==null)?baseVat+tracks.reduce((n,t)=>n+t.vatMinor,0)+romans.reduce((n,r)=>n+r.vatMinor!,0)+(trackDelivery??romanDelivery)!.vatMinor:null : productReady ? mixed?.contract.expected.orderVatAmountMinor ?? house?.vat ?? cushion?.vatMinor ?? null : null;
  const baseRelease = house && cushion ? services.releases.curtains && services.releases.cushions && services.releases.mixed : house ? services.releases.curtains : cushion ? services.releases.cushions : true;
  const release = baseRelease && (!tracks.length||services.tracks?.purchasesEnabled===true) && (!romans.length||services.romanDispatch!=null&&services.romanPurchasesEnabled===true);
  // Cushion delivery is a fixed quoted charge. A postcode entered for a previous
  // curtain/track selection must not change a cushion-only checkout review.
  const deliveryPostcode = input.curtains || tracks.length || romans.length ? input.postcode : "";
  const reviewId = roomsDigest({version:"my-home-review-v1",id:input.id,revision:input.revision,postcode:deliveryPostcode,
    curtains:input.curtains ?? null,cushionSpecs:cushion?.specs ?? null,quoteId:cushion?.quoteId ?? null,
    mixedReviewId:mixed?.reviewId ?? null,...(tracks.length?{trackQuotes:tracks.map(t=>t.quoteId)}:{}),romanQuotes:romans.map(r=>r.quoteId),lines,goods:gross,delivery,total,vat,dispatch});
  const acceptedPriceChanges = house?.lines.filter(line=>line.status === "PRICE_CHANGED").map(line=>({configuration_id:line.configuration_id,currentPrice:line.currentPrice!})) ?? [];
  try{services.reviewTiming?.({stage:"base",durationMs:Math.round(performance.now()-started),
    productTypes:[...(input.curtains?["CURTAIN"]:[]),...(input.cushions?["CUSHION"]:[]),...(input.romans?["ROMAN_BLIND"]:[]),...(input.tracks?["SMART_TRACK"]:[])],
    phasesMs,calls});}catch{/* Timing must never block an order. */}
  return { house,cushion,mixed,mixedInput,dispatch,tracks,trackDelivery,romans,romanDelivery, response:{
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
  measurementsConfirmed?: boolean; idempotencyKey: string;
};
/** Entire order is revalidated, never the active room or last edited cushion only. */
export async function checkoutMyHome(input: MyHomeCheckoutInput, services: MyHomeServices) {
  if (input.measurementsConfirmed === false || !/^[a-f0-9]{64}$/.test(input.reviewId) || !/^[a-zA-Z0-9-]{8,100}$/.test(input.idempotencyKey)) throw Error("MY_HOME_CHECKOUT_INVALID");
  const review = await currentReview(input,services);
  if (review.response.reviewId !== input.reviewId) throw Error("MY_HOME_REVIEW_CHANGED");
  if (!review.response.purchaseEnabled) throw Error("MY_HOME_PURCHASE_DISABLED");
  const dispatch = review.dispatch!;
  if(input.tracks||input.romans) return checkoutSmartTrackOrder({...input,measurementsConfirmed:true},services,{quotes:review.tracks,romans:review.romans,shipping:(review.trackDelivery??review.romanDelivery)!,dispatch,
    mixed:review.mixed,expected:review.response});
  const decorate = (contract: Parameters<CushionCheckoutServices["execute"]>[0]) => {
    const attributes=contract.input.customAttributes;
    const current=attributes.find(attribute=>attribute.key==="curtainsuk_my_home_review_id");
    const dispatchValue=JSON.stringify(customerMyHomeDispatch(dispatch));
    if(current){
      if(current.value!==input.reviewId || attributes.find(attribute=>attribute.key==="curtainsuk_hold_together")?.value!=="true" ||
        attributes.find(attribute=>attribute.key==="curtainsuk_my_home_dispatch")?.value!==dispatchValue)throw Error("MY_HOME_IDEMPOTENCY_CONFLICT");
      return contract;
    }
    return {...contract,input:{...contract.input,
      customAttributes:[...attributes.filter(attribute=>!["curtainsuk_hold_together","curtainsuk_my_home_dispatch"].includes(attribute.key)),
        {key:"curtainsuk_my_home_review_id",value:input.reviewId},
        {key:"curtainsuk_hold_together",value:"true"},
        {key:"curtainsuk_my_home_dispatch",value:dispatchValue}]}};
  };
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
      measurementsConfirmed:true,idempotencyKey:input.idempotencyKey},
      {...services.mixed,cushion:wrapCushion});
    return {checkoutUrl:result.execution.checkoutUrl,purchaseEnabled:result.execution.paymentEnabled,status:result.execution.status};
  }
  if (input.curtains) {
    const prepared = await prepareHouseCheckout({house:input.curtains,reviewToken:input.houseReviewToken ?? "",
      acceptedPriceChanges:input.acceptedPriceChanges ?? [],measurementsConfirmed:true},services.mixed.house);
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
