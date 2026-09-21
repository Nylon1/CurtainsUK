const {execFileSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const binary=path.join(process.env.APPDATA,'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const out='artifacts/customer-trust-v1';
function run(args,input){const result=JSON.parse(execFileSync(binary,['--session','customer-trust','--json',...args],{encoding:'utf8',input,timeout:60000,maxBuffer:3e6}));assert.ok(result.success,result.error||JSON.stringify(result));return result.data;}
const evaluate=code=>run(['eval','--stdin'],code).result;
const report={scope:'Local review: shared footer, all drafted policy pages; no production checkout or policy mutation',widths:[],pages:[],cookieControl:'Production blocked pending Shopify banner activation; failure state tested',cartChanges:false};
for(const width of [1440,390,412]){
 run(['set','viewport',String(width),'1000']);run(['open','http://127.0.0.1:4347/footer']);run(['snapshot','-i']);
 const before=evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,groups:[...document.querySelectorAll('[data-trust-group]')].map(d=>({open:d.open,height:d.querySelector('summary').getBoundingClientRect().height})),footerCount:document.querySelectorAll('[data-cuk-trust-footer]').length})`);
 assert.equal(before.overflow,false);assert.equal(before.footerCount,1);assert.equal(before.groups.length,4);assert.ok(before.groups.every(d=>d.open===(width>=750)));assert.ok(before.groups.every(d=>d.height>=44));
 if(width<750){run(['find','text','Legal & Privacy','click']);run(['snapshot','-i']);assert.equal(evaluate(`document.querySelectorAll('[data-trust-group]')[3].open`),true);run(['press','Enter']);assert.equal(evaluate(`document.querySelectorAll('[data-trust-group]')[3].open`),false);}
 evaluate(`document.querySelector('[data-cuk-trust-footer]').scrollIntoView()`);
 run(['screenshot',`${out}/footer-${width}.png`,'--full']);
 report.widths.push({width,...before,keyboardToggle:width<750?'PASS':'native details',screenshot:`footer-${width}.png`});
}
run(['set','viewport','390','1000']);run(['open','http://127.0.0.1:4347/footer']);run(['find','text','Legal & Privacy','click']);run(['snapshot','-i']);run(['find','role','button','click','--name','Cookie Settings']);assert.match(evaluate(`document.querySelector('[data-cookie-status]').textContent`),/No choice has been changed/);
const manifest=JSON.parse(fs.readFileSync(`${out}/publication-manifest.json`,'utf8'));
for(const p of manifest.pages){run(['open','http://127.0.0.1:4347'+p.url]);const info=evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelector('h1')?.textContent,review:document.querySelector('.review')?.textContent,footer:document.querySelectorAll('[data-cuk-trust-footer]').length})`);assert.equal(info.overflow,false,p.url);assert.equal(info.footer,1);assert.match(info.review,/Unpublished/);report.pages.push({url:p.url,status:'PASS',viewport:390});}
report.browserErrors=run(['errors']);fs.writeFileSync(`${out}/browser-verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({widths:report.widths.map(w=>({width:w.width,overflow:w.overflow})),pages:report.pages.length,errors:report.browserErrors},null,2));run(['close']);
