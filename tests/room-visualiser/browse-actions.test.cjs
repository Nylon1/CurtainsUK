const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm');
const source=readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-fabric-experience.js','utf8');
test('premium card enhancement retains the governed preview link and purchase actions',()=>{
 for(const available of [true,false]){
  const window={};runInNewContext(source,{window});
  const view={className:'cuk-button'},preview={href:'/pages/room-visualiser?fabric=sdg-f1541-01'};
  let children=available?[view,preview]:[view],commerce='';
  const host={querySelector:s=>s==='a'?view:children.find(n=>n===preview),replaceChildren:(...nodes)=>{children=nodes;},insertAdjacentHTML:(_,html)=>{commerce=html;},append:n=>children.push(n)};
  const card={querySelector:s=>s==='.cuk-browse-descriptor'?{}:s==='.cuk-fabric__actions'?host:null};
  const fabric={id:'sdg-f1541-01',sampleAvailable:true,orderReady:false,roomPreview:{available},availability:'Sample available'};
  window.CurtainsUKFabricExperience.enhanceCard(card,fabric,'standard-window',()=>{});
  assert.equal(children[0],view);assert.equal(children.includes(preview),available);
  assert.equal(children.length,available?2:1);assert.match(commerce,/data-sample/);assert.match(commerce,/disabled>Make curtains/);
 }
});
