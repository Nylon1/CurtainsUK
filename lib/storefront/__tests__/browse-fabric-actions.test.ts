import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('shopify-theme/curtainsuk-new-design-live-base/assets/curtainsuk-fabric-experience.js','utf8');
test('card ordering reuses the existing sample event with exact identity, context and same-origin endpoint',()=>{
  const events: {type:string; detail:Record<string,unknown>}[]=[];
  let click: (event:unknown)=>void = ()=>{};
  const button={disabled:false,addEventListener:(_type:string,callback:typeof click)=>{click=callback;}};
  const host={querySelector:()=>({className:''}),replaceChildren:()=>{},insertAdjacentHTML:()=>{}};
  const card={dataset:{} as Record<string,string>,querySelector:(selector:string)=>selector==='[data-sample]'?button:selector==='.cuk-fabric__actions'?host:selector==='.cuk-browse-descriptor'?{textContent:''}:null};
  const context={fabricMasterId:'pt-4271-147',commerceToken:'existing-signed-context'};
  const win={} as {CurtainsUKFabricExperience:{enhanceCard:CallableFunction};dispatchEvent:CallableFunction};
  win.dispatchEvent=(event:typeof events[number])=>events.push(event);
  runInNewContext(source,{window:win,document:{querySelector:()=>({dataset:{engineBase:'https://old-preview.invalid',purchaseControlsEnabled:'true'}})},localStorage:{getItem:()=>JSON.stringify(context)},CustomEvent:class {constructor(public type:string,public detail:unknown){this.detail=(detail as {detail:unknown}).detail;}}});
  const fabric={id:'pt-4271-147',sampleAvailable:true,orderReady:true,design:'Diez',colour:'Mocha'};
  let saved=''; win.CurtainsUKFabricExperience.enhanceCard(card,fabric,'bay-window',(f:typeof fabric)=>{saved=f.id;});
  click({currentTarget:button});
  assert.equal(saved,fabric.id); assert.equal(events[0].type,'curtainsuk:sample-add');
  assert.deepEqual(JSON.parse(JSON.stringify(events[0].detail.sample)),{fabricId:fabric.id,design:'Diez',colour:'Mocha',windowSlug:'bay-window',consultationContext:context});
  assert.equal(card.dataset.engineBase,'/apps/curtainsuk-decision');
  assert.equal(card.dataset.purchaseControlsEnabled,'true');
  button.disabled=true; click({currentTarget:button}); assert.equal(events.length,1);
});
test('card curtain handoff uses the exact identity and is absent when the current order gate fails',()=>{
  const win={} as {CurtainsUKFabricExperience:{enhanceCard:CallableFunction}};
  runInNewContext(source,{window:win});
  for(const ready of [true,false]) {
    let html=''; const host={querySelector:()=>({className:''}),replaceChildren:()=>{},insertAdjacentHTML:(_where:string,value:string)=>{html=value;}};
    const card={querySelector:(selector:string)=>selector==='.cuk-fabric__actions'?host:selector==='.cuk-browse-descriptor'?{textContent:''}:null};
    win.CurtainsUKFabricExperience.enhanceCard(card,{id:'pt-4271-147',sampleAvailable:false,orderReady:ready,availability:'Check availability'},'bay-window',()=>{});
    assert.match(html,/<button[^>]+data-sample disabled/);
    assert.equal(html.includes('href="/pages/curtain-visualiser?fabric=pt-4271-147&window=bay-window"'),ready);
    assert.doesNotMatch(html,/https?:|vercel|hamzas-projects/);
  }
});
