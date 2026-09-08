import assert from "node:assert/strict";
import test from "node:test";
import { STOREFRONT_FABRICS } from "../fabrics";
import { calculatePriceConfirmationReview, classifySpecialistReview, type StagingPriceRequest } from "../staging-pricing";

const fabric = STOREFRONT_FABRICS[0];
const request: StagingPriceRequest = {windowSlug:"standard-window",measurementBasis:"TRACK_WIDTH",widthCm:200,dropCm:220,fabricId:fabric.id,heading:"PENCIL_PLEAT",lining:"STANDARD",construction:"PAIR",stackDirection:"SPLIT"};

test("unpriced real fabric retains its requirement and canonical identity without a customer price",()=>{
  const result=calculatePriceConfirmationReview(request,fabric,{...fabric,supplierCostPerMetre:null});
  assert.equal(result.outcome,"MANUAL_QUOTE");
  assert.equal(result.commercialState,"PRICE_CONFIRMATION_REQUIRED");
  assert.equal(result.selectedFabric.id,request.fabricId);
  assert.match(result.configurationId,/^[0-9a-f-]{36}$/);
  assert.ok(result.fabricMetres!>0);
  for(const amount of [result.totalAmountMinor,result.netAmountMinor,result.vatAmountMinor])assert.equal(amount,null);
  assert.doesNotMatch(JSON.stringify(result),/supplierCost|cut_trade|grossMargin|batch_id/);
});

test("missing specifications and ungoverned half-drop allowances remain unknown rather than invented",()=>{
  for(const specification of [null,{...fabric,patternMatchType:"HALF_DROP_MATCH" as const}]){
    const result=calculatePriceConfirmationReview(request,fabric,specification);
    assert.equal(result.fabricMetres,null);
    assert.equal(result.fabricWidths,null);
    assert.equal(result.totalAmountMinor,null);
    assert.ok(result.reasons.includes("FABRIC_REQUIREMENT_CONFIRMATION_REQUIRED"));
  }
});

test("price confirmation cannot bypass measurements or use BONDED as a separate interlining layer",()=>{
  assert.throws(()=>calculatePriceConfirmationReview({...request,widthCm:-1},fabric,null),/invalid/);
  assert.throws(()=>calculatePriceConfirmationReview({...request,interlining:"BONDED"} as unknown as StagingPriceRequest,fabric,fabric),/invalid/);
});

test("Bay and specialist identity-only selections enter review without supplier prices or uploads",()=>{
  const bay=calculatePriceConfirmationReview({...request,windowSlug:"bay-window",widthCm:undefined,bayTrackOrPoleFitted:true,bayNumberOfSections:3,baySegmentWidthsCm:[80,180,80]},fabric,fabric);
  assert.equal(bay.totalCoverageWidthCm,340);
  assert.equal(bay.totalAmountMinor,null);
  const {id,colour,recordLifecycle,supplierAvailability,allowedHeadings,allowedLinings,suitableWindowTypeSlugs}=fabric;
  const result=classifySpecialistReview({windowSlug:"apex-window",measurements:{coverage_width:300,peak_height:300,left_vertical:200,right_vertical:200,left_slope:180.28,right_slope:180.28},fabricId:id,heading:"PENCIL_PLEAT",lining:"STANDARD",construction:"PAIR",fixingPosition:"Wall fixed above glazing",stackDirection:"SPLIT"},{id,colour,recordLifecycle,supplierAvailability,allowedHeadings,allowedLinings,suitableWindowTypeSlugs});
  assert.notEqual(result.outcome,"INSTANT_PRICE");
  assert.equal(result.paymentState,"BLOCKED");
});
