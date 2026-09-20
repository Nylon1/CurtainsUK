const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const binary = path.join(process.env.APPDATA,'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const output = path.resolve(__dirname,'../artifacts/curtain-style-v2');
fs.mkdirSync(output,{recursive:true});
function run(args,input) {
  const stdout = execFileSync(binary,['--session','curtains-v2','--json',...args],{encoding:'utf8',input,timeout:60000,maxBuffer:8*1024*1024});
  const result = JSON.parse(stdout);
  assert.ok(result.success,result.error || stdout);
  return result.data;
}
const evaluate = code => run(['eval','--stdin'],code).result;
const screenshot = name => {
  evaluate('document.getAnimations().forEach(a=>{try{a.finish()}catch{}})');
  return run(['screenshot',path.join(output,'preview-'+name+'.png')]);
};
const preview = 'https://www.curtainsuk.com/pages/fabric-library?view=curtain-style&preview_theme_id=182339731835';
run(['open',preview]);
run(['wait','[data-curtain-anatomy][data-ready]']);
const identity = evaluate('({id:Shopify.theme.id,role:Shopify.theme.role,url:location.href})');
assert.equal(identity.id,182339731835);
assert.equal(identity.role,'unpublished');
const report = {preview,identity,widths:[],checks:[],screenshots:[],commerceWrites:0};
for(const width of [1440,390,412]) {
  run(['set','viewport',String(width),width===1440?'1000':'900']);
  evaluate('scrollTo(0,0)');
  const states = evaluate(`(async()=>{
    const root=document.querySelector('[data-curtain-anatomy]');
    const tabs=[...root.querySelectorAll('[data-anatomy-tabs] button')];
    const states=[];
    for(let i=0;i<tabs.length;i++){
      tabs[i].click();
      const panel=root.querySelector('[data-anatomy-panel]:not([hidden])');
      const image=panel.querySelector('.canatomy__master');
      await image.decode();
      for(const spot of panel.querySelectorAll('[data-layer]')){
        spot.click();
        const layer=spot.dataset.layer;
        const open=[...panel.querySelectorAll('[data-anatomy-layer][open]')];
        const rect=spot.getBoundingClientRect();
        states.push({form:panel.dataset.form,layer,focus:panel.dataset.focus,open:open.map(x=>x.dataset.anatomyLayer),pressed:spot.getAttribute('aria-pressed'),touchWidth:rect.width,touchHeight:rect.height,imageWidth:image.naturalWidth});
      }
    }
    tabs[0].click();
    root.querySelector('[data-anatomy-panel]:not([hidden]) [data-layer="heading"]').click();
    return states;
  })()`);
  assert.equal(states.length,24);
  for(const state of states){assert.equal(state.focus,state.layer);assert.deepEqual(state.open,[state.layer]);assert.equal(state.pressed,'true');assert.ok(state.touchWidth>=44&&state.touchHeight>=44);assert.equal(state.imageWidth,1448);}
  const dimensions=evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,sectionHeight:document.querySelector('[data-curtain-anatomy]').getBoundingClientRect().height,visualWidth:document.querySelector('[data-anatomy-panel]:not([hidden]) [data-anatomy-visual]').getBoundingClientRect().width,visibleWords:document.querySelector('[data-curtain-anatomy]').innerText.split(/\\s+/).length})`);
  assert.equal(dimensions.width,width);assert.ok(dimensions.scrollWidth<=width);
  if(width<500)assert.ok(dimensions.visualWidth>=width-4);
  report.widths.push({...dimensions,states});
  const closeup=evaluate(`(()=>{
    const root=document.querySelector('[data-curtain-anatomy]');
    let panel=root.querySelector('[data-anatomy-panel]:not([hidden])');
    panel.querySelector('[data-closeup]').click();
    const wave=panel.dataset.closeup;
    root.querySelectorAll('[data-anatomy-tabs] button')[1].click();
    panel=root.querySelector('[data-anatomy-panel]:not([hidden])');
    const carried=panel.dataset.closeup;
    panel.querySelector('[data-anatomy-visual]').scrollIntoView({block:'center'});
    return {wave,carried};
  })()`);
  assert.equal(closeup.wave,'true');assert.equal(closeup.carried,'true');
  screenshot(width+'-double-pinch-closeup');
  const reset=evaluate(`(()=>{const p=document.querySelector('[data-anatomy-panel]:not([hidden])');p.querySelector('[data-layer="flow"]').click();return p.dataset.closeup})()`);
  assert.notEqual(reset,'true');
  evaluate(`document.querySelector('[data-anatomy-tabs] button').click();document.querySelector('[data-anatomy-panel]:not([hidden]) [data-layer="heading"]').click()`);
  evaluate('scrollTo(0,0)');screenshot('page-'+width);report.screenshots.push('preview-page-'+width+'.png');
  for(const form of ['wave','double-pinch','pencil-pleat','eyelet']) {
    evaluate(`(()=>{const p=document.querySelector('[data-form="${form}"]');document.querySelector('[aria-controls="'+p.id+'"]').click();p.querySelector('[data-layer="heading"]').click();p.querySelector('[data-anatomy-visual]').scrollIntoView({block:'center'});})()`);
    screenshot(width+'-'+form);report.screenshots.push('preview-'+width+'-'+form+'.png');
  }
  evaluate(`document.querySelector('.canatomy__support').scrollIntoView({block:'start'})`);screenshot(width+'-support');report.screenshots.push('preview-'+width+'-support.png');
}
const links=evaluate(`Array.from(document.querySelectorAll('[data-curtain-anatomy] a')).map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')}))`);
for(const link of links){assert.ok(link.href.startsWith('/'));assert.ok(!/vercel|staging|localhost|127\.0\.0\.1/.test(link.href));}
report.links=links;
report.checks.push('72 live-preview form/layer states','44px or larger hotspots','one full-width mobile visual','all four images loaded at native resolution','no horizontal page overflow','same-origin handoffs');
run(['set','viewport','1440','1000']);
evaluate(`document.querySelector('[data-anatomy-tabs] button').click()`);
run(['focus','[data-anatomy-tabs] button:first-child']);run(['press','ArrowRight']);
assert.equal(evaluate(`document.querySelector('[data-anatomy-panel]:not([hidden])').dataset.form`),'double-pinch');
run(['press','End']);assert.equal(evaluate(`document.querySelector('[data-anatomy-panel]:not([hidden])').dataset.form`),'eyelet');
run(['press','Home']);assert.equal(evaluate(`document.querySelector('[data-anatomy-panel]:not([hidden])').dataset.form`),'wave');
report.checks.push('live keyboard ArrowRight/End/Home');
report.checks.push('live heading closeup, form carry and layer reset at all three widths');
report.sample = evaluate(`fetch('/products/fabric-sample.js').then(r=>r.json()).then(p=>{const v=p.variants.find(v=>v.id===56120226873723);return {variant:v.id,priceMinor:v.price,available:v.available}})`);
assert.equal(report.sample.priceMinor,250);assert.equal(report.sample.available,true);
report.cart=evaluate(`fetch('/cart.js').then(r=>r.json()).then(c=>({item_count:c.item_count,currency:c.currency}))`);
assert.equal(report.cart.item_count,0);
report.checks.push('existing £2.50 sample product available','isolated basket remained empty');
fs.writeFileSync(path.join(output,'preview-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({widths:report.widths.map(({states,...d})=>({...d,states:states.length})),checks:report.checks,screenshots:report.screenshots,report:path.join(output,'preview-verification.json')},null,2));
