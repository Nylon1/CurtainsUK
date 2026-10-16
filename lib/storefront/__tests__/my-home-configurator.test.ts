import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('nested hidden corner and bay inputs cannot block supported curtain live-price validation',()=>{
 const code=readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-storefront.js','utf8');
 const body=code.slice(code.indexOf('  function setJourneyFields('),code.indexOf('\n  function option(',code.indexOf('  function setJourneyFields(')));
 const corner={disabled:false},bay={disabled:false},width={disabled:false};
 const root={querySelectorAll:(selector:string)=>selector.endsWith(' textarea')?(selector.startsWith('[data-cuk-standard]')?[corner,bay,width]:selector.startsWith('[data-cuk-corner]')?[corner]:selector.startsWith('[data-cuk-bay]')?[bay]:selector.startsWith('[data-cuk-width]')?[width]:[]):[],querySelector:(selector:string)=>selector==='[data-cuk-route-status]'?{textContent:'',classList:{remove(){}}}:null};
 vm.runInNewContext(body+';setJourneyFields(root,null)',{root});
 assert.equal(corner.disabled,true);assert.equal(bay.disabled,true);assert.equal(width.disabled,false);
});
