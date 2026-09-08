import test from "node:test";
import assert from "node:assert/strict";
import { approvedMediaJob, legacyMediaJob, mediaJobAlreadyMapped, sharedMediaCanReuse, validateDownloadSource, type DiscoveredImage } from "../discovered-media";
import { portalDiscoveryPlan } from "../portal-discovery-maps";
import type { DiscoveryIdentity } from "../portal-discovery";
import type { ImportedMedia } from "../supplier-media";
const target: DiscoveryIdentity = {supplier:"sanderson-design-group",fabricId:"sdg-f1787-01",sku:"F1787/01",brand:"Clarke & Clarke",design:"Astraea",colour:"Dove",collection:"Aqueous Performance"};
const image: DiscoveredImage = {url:"https://trade.sandersondesigngroup.com/static/media/catalog/product/F/1/F1787_01_314f.jpg",route:"COLOURWAY",location:"sdg.variants",rightsState:"APPROVED",evidence:{sku:target.sku,brand:target.brand,design:target.design,colour:target.colour,scope:"COLOURWAY",imageType:"MAIN",productType:"FABRIC",relationshipEstablished:true}};
const imported = (job:ReturnType<typeof approvedMediaJob>,hash="a".repeat(64)):ImportedMedia => ({...job.candidate,contentHash:hash,width:600,height:600,importedAt:"2026-09-08T10:00:00Z",shopifyFileId:"gid://shopify/MediaImage/1",shopifyCdnUrl:"https://cdn.shopify.com/test.jpg"});

test("observed Webtex public image route is allowed without admitting session URLs or other endpoints",()=>{
 const url="https://www.prestigiousonline.co.uk/images/images/4270%20dali/4270-147%20dali%20mocha.jpg";
 assert.doesNotThrow(()=>validateDownloadSource(url,"prestigious-textiles"));
 for(const denied of [url+"?session=private",url+"#s=private",url.replace("/images/images/","/account/"),url.replace(".jpg",".aspx"),url.replace(".co.uk/",".co.uk.example.org/")]) assert.throws(()=>validateDownloadSource(denied,"prestigious-textiles"),/SOURCE_DENIED/);
 assert.throws(()=>validateDownloadSource(url,"sanderson-design-group"),/SOURCE_DENIED/);
});

test("expanded manifest admits exact colourway media from any discovery route, rejecting wrong products and unsafe sources",()=>{
 const job=approvedMediaJob(target,image);
 assert.equal(job.candidate.discoveryLocation,"COLOURWAY:sdg.variants");
 assert.match(job.candidate.sourceReference,/^COLOURWAY:COLOURWAY:sdg.variants:EXACT_SKU:/);
 assert.throws(()=>approvedMediaJob(target,{...image,evidence:{...image.evidence,sku:"F1787/02"}}),/IDENTITY_MISMATCH/);
 assert.throws(()=>approvedMediaJob(target,{...image,evidence:{...image.evidence,productType:"WALLPAPER"}}),/IDENTITY_MISMATCH/);
 assert.throws(()=>approvedMediaJob(target,{...image,url:image.url+"?session=private"}),/SOURCE_DENIED/);
 assert.doesNotThrow(()=>approvedMediaJob(target,{...image,url:"local-sha256:"+"a".repeat(64)}));
 assert.throws(()=>approvedMediaJob(target,{...image,url:"local-sha256:../../private"}),/SOURCE_DENIED/);
 assert.throws(()=>approvedMediaJob(target,{...image,rightsState:"PENDING"}),/APPROVAL_REQUIRED/);
 assert.throws(()=>legacyMediaJob(target,[]),/DISCOVERY_INCOMPLETE/);
});
test("a completed main image does not skip other media, while repeated assets resume without download",()=>{
 const main=approvedMediaJob(target,image), existing=imported(main);
 assert.equal(mediaJobAlreadyMapped(main,[existing],existing.contentHash),true);
 const detail=approvedMediaJob(target,{...image,route:"GALLERY",evidence:{...image.evidence,imageType:"DETAIL"}});
 assert.notEqual(main.key,detail.key);
 assert.equal(mediaJobAlreadyMapped(detail,[existing],existing.contentHash),false);
});
test("shared room images deduplicate within an exactly established design, never as main or across unrelated designs",()=>{
 const room={...image,evidence:{...image.evidence,scope:"DESIGN" as const,imageType:"ROOM" as const,sku:undefined,colour:undefined}};
 const a=approvedMediaJob(target,room);
 const b=approvedMediaJob({...target,fabricId:"sdg-f1787-02",sku:"F1787/02",colour:"Denim"},room);
 assert.equal(sharedMediaCanReuse(b.candidate,imported(a)),true);
 const unrelated=approvedMediaJob({...target,design:"Other"},{...room,evidence:{...room.evidence,design:"Other"}});
 assert.equal(sharedMediaCanReuse(unrelated.candidate,imported(a)),false);
 assert.equal(sharedMediaCanReuse(approvedMediaJob(target,image).candidate,imported(a)),false);
 assert.throws(()=>approvedMediaJob(target,{...room,evidence:{...room.evidence,imageType:"MAIN"}}),/IDENTITY_MISMATCH/);
});
test("both supplier maps cover ten ordered routes without confusing access with completed discovery",()=>{
 for(const supplier of ["prestigious-textiles","sanderson-design-group"]){const plan=portalDiscoveryPlan(supplier);assert.equal(plan.length,10);assert.equal(plan[0].route,"EXACT_PRODUCT");assert.equal(plan[9].route,"DESIGN_COLOUR_SEARCH");assert.ok(plan.every(p=>p.steps.length));}
 assert.equal(portalDiscoveryPlan("prestigious-textiles",["EXACT_PRODUCT"])[0].status,"OBSERVED");
 assert.equal(portalDiscoveryPlan("prestigious-textiles",["SKU_SEARCH"])[0].status,"PARTIALLY_OBSERVED");
 assert.equal(portalDiscoveryPlan("sanderson-design-group",["RESOURCES"])[0].status,"PARTIALLY_OBSERVED");
});
