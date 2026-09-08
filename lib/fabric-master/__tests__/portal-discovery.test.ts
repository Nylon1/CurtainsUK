import test from "node:test";
import assert from "node:assert/strict";
import { DISCOVERY_ROUTES, discoverPortalMedia, discoverySummary, matchPortalImage, newDiscoveryCheckpoint, recordDiscoveryObservation, type DiscoveryIdentity, type ImageIdentityEvidence, type RouteObservation } from "../portal-discovery";
const identity: DiscoveryIdentity = { supplier:"sanderson-design-group",fabricId:"sdg-f1787-01",sku:"F1787/01",brand:"Clarke & Clarke",design:"Astraea",colour:"Dove",collection:"Aqueous Performance",verifiedPortalProductId:"CCF0795-01" };
const evidence: ImageIdentityEvidence = {sku:"F1787/01",brand:"Clarke and Clarke",design:"Astraea",colour:"Dove",productType:"FABRIC",scope:"COLOURWAY",imageType:"MAIN",relationshipEstablished:true};
const observation = (route: RouteObservation["route"]): RouteObservation => ({route,state:"EXHAUSTED",location:"sdg.products",checkedAt:"2026-09-08T09:00:00Z",pagesVisited:1,paginationExhausted:true,productFound:false,exactSkuFound:false,colourwayMedia:0,designMedia:0,ambiguous:false,reason:"NO_EXACT_SKU_RESULT"});
test("all ten routes must be exhausted before imagery is genuinely missing", () => {
 let c=newDiscoveryCheckpoint(identity,"portal-map-v1");
 assert.equal(discoverySummary(c).status,"NOT_YET_DISCOVERED");
 c=recordDiscoveryObservation(c,observation("EXACT_PRODUCT"));
 assert.equal(discoverySummary(c).genuinelyMissing,false);
 for(const route of DISCOVERY_ROUTES.slice(1)) c=recordDiscoveryObservation(c,observation(route));
 assert.equal(discoverySummary(c).genuinelyMissing,true);
 c=recordDiscoveryObservation(c,{...observation("RESOURCES"),state:"ACCESS_BLOCKED",paginationExhausted:false,reason:"AUTHENTICATION_ACCESS_ISSUE"});
 assert.equal(discoverySummary(c).genuinelyMissing,false);
 assert.equal(discoverySummary(c).status,"AUTHENTICATION_ACCESS_ISSUE");
});
test("pagination, applicability and evidence cannot be silently skipped", () => {
 const c=newDiscoveryCheckpoint(identity,"portal-map-v1");
 assert.throws(()=>recordDiscoveryObservation(c,{...observation("SKU_SEARCH"),paginationExhausted:false}),/NOT_EXHAUSTED/);
 assert.throws(()=>recordDiscoveryObservation(c,{...observation("GALLERY"),state:"NOT_APPLICABLE",pagesVisited:0,reason:"LOCATION_NOT_EXPOSED"}),/EVIDENCE_REQUIRED/);
 assert.throws(()=>recordDiscoveryObservation(c,{...observation("GALLERY"),location:"https://portal.invalid/?token=secret"}),/INVALID/);
 const safe=recordDiscoveryObservation(c,{...observation("GALLERY"),...{cookies:"private"}});
 assert.doesNotMatch(JSON.stringify(safe),/cookies|private/);
});
test("matching uses exact identity and never fuzzy product names", () => {
 assert.equal(matchPortalImage(identity,evidence),"EXACT_SKU");
 assert.equal(matchPortalImage(identity,{...evidence,sku:undefined}),"EXACT_DESIGN_COLOUR");
 assert.equal(matchPortalImage(identity,{...evidence,sku:undefined,colour:undefined,portalProductId:"CCF0795-01"}),"STABLE_PRODUCT_ID");
 for(const change of [{sku:"F1787/02"},{colour:"Denim"},{design:"Astra"},{productType:"WALLPAPER" as const},{relationshipEstablished:false}]) assert.equal(matchPortalImage(identity,{...evidence,...change}),null);
 assert.equal(matchPortalImage(identity,{...evidence,scope:"DESIGN",imageType:"ROOM",colour:undefined,sku:undefined}),"DESIGN_ROOM");
 assert.equal(matchPortalImage(identity,{...evidence,scope:"DESIGN",imageType:"MAIN"}),null);
});
test("resumable discovery follows route order and collects other media after main is found", async()=>{
 let saved=newDiscoveryCheckpoint(identity,"portal-map-v1"); const visits:string[]=[];
 const ports={load:async()=>saved,save:async(c:typeof saved)=>{saved=c;},inspect:async(route:RouteObservation["route"])=>{visits.push(route);return {...observation(route),colourwayMedia:route==="SKU_SEARCH"?1:0};}};
 await discoverPortalMedia(identity,"portal-map-v1",ports,2);
 assert.deepEqual(visits,["EXACT_PRODUCT","SKU_SEARCH"]);
 const result=await discoverPortalMedia(identity,"portal-map-v1",ports);
 assert.deepEqual(visits,[...DISCOVERY_ROUTES]);assert.equal(result.discoveryComplete,true);assert.equal(result.status,"FOUND_COLOURWAY_MEDIA");
 await discoverPortalMedia(identity,"portal-map-v1",ports);assert.equal(visits.length,10);
});
