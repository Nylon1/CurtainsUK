import test from "node:test";
import assert from "node:assert/strict";
import {normalisePortalSkuTitle,normalisePortalDisplay,portalTitleMatchesIdentity} from "../portal-discovery";
test("exact supplier SKU display tokens do not block ordinary media matching",()=>{
 assert.equal(normalisePortalSkuTitle("Strawberry Thief 220313 Indigo/Mineral","DM6F220313"),normalisePortalDisplay("Strawberry Thief Indigo/Mineral"));
 assert.equal(normalisePortalSkuTitle("Mary Isobel Dmcoma203 Rose/Slate","DMCOMA203"),normalisePortalDisplay("Mary Isobel Rose/Slate"));
 assert.notEqual(normalisePortalSkuTitle("Strawberry Thief 220312 Indigo/Mineral","DM6F220313"),normalisePortalDisplay("Strawberry Thief Indigo/Mineral"));
 assert.notEqual(normalisePortalSkuTitle("Strawberry Thief 220313 Mineral/Indigo","DM6F220313"),normalisePortalDisplay("Strawberry Thief Indigo/Mineral"));
 assert.notEqual(normalisePortalSkuTitle("Pr7702/11 Golden Lily Mineral","DMI1G3204"),normalisePortalDisplay("Golden Lily Mineral"));
});
test("observed title formatting preserves the exact colour and product words",()=>{
 assert.equal(portalTitleMatchesIdentity("Delvoye Velvet","Ink","Delvoye Ink Velvet","F1765/01"),true);
 assert.equal(portalTitleMatchesIdentity("Palm Grove Embroidery","Teal/Green","Palm Grove Teal/Green Embroidery","DPGR236323"),true);
 assert.equal(portalTitleMatchesIdentity("Tulip and Bird Velvet","Opal & Sea Foam","Tulip & Bird Opal & Sea Foam Velvet","AARC520014"),true);
 assert.equal(portalTitleMatchesIdentity("Linnean","Linnean Crusoe Blue","Linnean Crusoe Blue","DLNC236782"),true);
 assert.equal(portalTitleMatchesIdentity("Delvoye Velvet","Ink","Delvoye Linen Velvet","F1765/01"),false);
 assert.equal(portalTitleMatchesIdentity("Acropora Velvet","Brazilian Rosewood/Nectar","Acropora Brazilian Rosewood/Nectar/Tree Canopy Velvet","HTEF121010"),false);
 assert.equal(portalTitleMatchesIdentity("Minako Velvet","Emerald/Zest/Marine","Minako Marine/Zest/Emerald Velvet","HATL120800"),false);
 assert.equal(portalTitleMatchesIdentity("Spectrum","Fuchia","Spectrum Fuchsia","F1062/15"),false);
 assert.equal(portalTitleMatchesIdentity("Campanula (Velvet)","Sunburst/Ebony","Campanula Sunburst/Ebony","MVOF227223"),true);
 assert.equal(portalTitleMatchesIdentity("Campanula (Velvet)","Sunburst/Ebony","Campanula Summer/Ebony","MVOF227223"),false);
 assert.equal(portalTitleMatchesIdentity("Hosta & Fern Indoor Outdoor","Olivine","Hosta & Fern Olivine","DHIF227337"),false);
 assert.equal(portalTitleMatchesIdentity("Lucent Sheer","Hempseed","Lucent Hempseed Sheer","HCOL133964"),true);
 assert.equal(portalTitleMatchesIdentity("Tahiti","Amethyst/Emerald","Tahiti Amethyst/Emerald Velvet","F1610/01"),true);
 assert.equal(portalTitleMatchesIdentity("Tahiti","Amethyst/Emerald","Tahiti Amethyst/Emerald/Gold Velvet","F1610/01"),false);
});
