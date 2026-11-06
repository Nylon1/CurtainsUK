import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import * as data from '../../public/hanging-studio/lessons.js';
import * as scenes from '../../public/hanging-studio/scenes.js';

function app(){
 const dom=new JSDOM(fs.readFileSync(new URL('../../public/hanging-studio/index.html',import.meta.url),'utf8'),{url:'https://example.test/hanging-studio/',runScripts:'outside-only'});
 const w=dom.window;w.lessonModule=data;w.sceneModule=scenes;w.structuredClone=structuredClone;
 w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.eval('const {lessons,sources,blankPractice,completePractice,practiceAction}=window.lessonModule;const {sceneHTML}=window.sceneModule;\n'+fs.readFileSync(new URL('../../public/hanging-studio/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,''));
 const $=selector=>w.document.querySelector(selector);
 const click=selector=>{const el=$(selector);assert.ok(el,`Missing ${selector}`);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
 const action=a=>click(`button[data-action="${a}"]`);
 const input=(selector,value)=>{const el=$(selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {dom,w,$,click,action,input};
}
const sequences={unpack:['found-heading','found-label'],gather:['secure',['#gatherRange',52],'even','store'],hooks:['row-0','row-1','row-2','insert'],hang:[0,1,2,3].map(i=>`connect-${i}`),dress:[0,1,2,3].map(i=>`fold-${i}`),steam:['care',['#steamRange',100]],settle:['band','band','remove'],thread:Array(6).fill('thread'),anchor:['anchor'],system:['system'],wavehang:[0,1,2,3].map(i=>`waveconnect-${i}`),wavedress:['forward','back','forward','back'],pinchhooks:['pinch']};
for(const [heading,lesson] of Object.entries(data.lessons))test(`${lesson.name}: complete every practice step through the DOM`,()=>{
 const a=app();try{a.click(`[data-heading="${heading}"]`);a.click('[data-mode="try"]');
 for(let i=0;i<lesson.steps.length;i++){
  assert.equal(a.$('[aria-current="step"]').dataset.step,String(i));
  assert.equal(a.$('.primary').disabled,true);
  for(const action of sequences[lesson.steps[i].id])Array.isArray(action)?a.input(...action):a.action(action);
  assert.equal(a.$('.primary').disabled,false,`Blocked at ${lesson.steps[i].id}`);a.action('next');
 }
 assert.equal(a.$('#finishCard').hidden,false);assert.match(a.$('#progressText').textContent,new RegExp(`${lesson.steps.length} of ${lesson.steps.length}`));
 }finally{a.dom.window.close();}
});
test('cords must be secured before gathering; surplus cord must be stored',()=>{
 let p=data.blankPractice();let r=data.practiceAction(p,'gather',52);assert.equal(r.error,true);assert.equal(r.practice.gather,0);
 for(const [a,v] of [['secure'],['gather',52],['even'],['store']])p=data.practiceAction(p,a,v).practice;
 assert.equal(data.completePractice({id:'gather'},p),true);r=data.practiceAction(p,'cut');assert.equal(r.error,true);assert.deepEqual(r.practice,p);
 assert.equal(data.completePractice({id:'gather'},data.practiceAction(p,'gather',70).practice),false);
});
test('hook row changes height relative to a fixed track and cord is rejected',()=>{
 let p=data.blankPractice();for(let i=0;i<3;i++){const r=data.practiceAction(p,`row-${i}`);p=r.practice;const svg=scenes.sceneHTML({title:'Hooks',scene:'hooks'}, {practice:p,mode:'try'});assert.ok(svg.includes(`translate(0 ${-i*23})`));assert.ok(svg.includes('M582 142H757'));}
 assert.equal(data.practiceAction(p,'cord').error,true);assert.equal(data.completePractice({id:'hooks'},p),false);
 p=data.practiceAction(p,'insert').practice;assert.equal(data.completePractice({id:'hooks'},p),true);
});
test('wave connections and folds enforce the sequence',()=>{
 let p=data.blankPractice();assert.equal(data.practiceAction(p,'waveconnect-2').error,true);assert.equal(data.practiceAction(p,'back').error,true);assert.equal(data.practiceAction(p,'wavefold-2').error,true);
 for(const a of ['forward','back','forward','back','forward'])p=data.practiceAction(p,a).practice;assert.equal(p.folds.length,4);
});
test('steam requires a care check and can be skipped; temporary bands stay loose',()=>{
 let p=data.blankPractice();assert.equal(data.practiceAction(p,'steam',100).error,true);assert.equal(data.completePractice({id:'steam'},data.practiceAction(p,'skip-steam').practice),true);
 assert.equal(data.practiceAction(p,'tight').error,true);assert.equal(data.practiceAction(p,'remove').error,true);
 for(const a of ['band','band','remove'])p=data.practiceAction(p,a).practice;assert.equal(p.removed,true);
});
test('eyelet anchors beyond the bracket',()=>{
 const p=data.blankPractice();assert.equal(data.practiceAction(p,'wrong-anchor').error,true);assert.equal(data.practiceAction(p,'anchor').practice.anchored,true);
});
test('own-curtain wave instructions cannot advance without a system match',()=>{
 const a=app();try{a.click('[data-heading="wave"]');a.click('[data-mode="mine"]');a.click('[data-step="1"]');assert.equal(a.$('.primary').disabled,true);
 a.action('done-mine');assert.match(a.$('.micro-progress').textContent,/Action 1 of 3/);
 a.$('#waveMatch').checked=true;a.$('#waveMatch').dispatchEvent(new a.w.Event('change',{bubbles:true}));assert.equal(a.$('.primary').disabled,false);a.action('done-mine');assert.match(a.$('.micro-progress').textContent,/Action 2 of 3/);
 }finally{a.dom.window.close();}
});
test('replay preserves the own-curtain mode and action position',()=>{
 const a=app();try{a.click('[data-mode="mine"]');a.action('done-mine');a.action('replay');assert.equal(a.$('[aria-selected="true"]').dataset.mode,'mine');assert.match(a.$('.micro-progress').textContent,/Action 2 of 3/);a.action('done-mine');assert.match(a.$('.micro-progress').textContent,/Action 3 of 3/);}finally{a.dom.window.close();}
});
test('scrubbing inspection updates the mechanical pose',()=>{
 const a=app();try{a.click('[data-step="2"]');a.click('[data-view="inspect"]');a.input('#scrub',100);assert.match(a.$('#scene').textContent,/Bottom row · sits higher/);a.input('#scrub',0);assert.match(a.$('#scene').textContent,/Top row · hangs lower/);}finally{a.dom.window.close();}
});
test('keyboard focus remains on replaced practice controls',()=>{
 const a=app();try{a.click('[data-mode="try"]');a.click('[data-step="2"]');a.$('button[data-action="row-1"]').focus();a.action('row-1');assert.equal(a.w.document.activeElement.dataset.action,'row-1');}finally{a.dom.window.close();}
});
test('supplier video and real Evans tape load only when requested',()=>{
 const a=app();try{assert.equal(a.$('iframe'),null);assert.equal(a.$('.reference-image'),null);a.action('reference-video');assert.match(a.$('iframe').src,/youtube-nocookie.*uQ7ymc92pcI/);a.$('.dialog-close').click();a.click('[data-step="2"]');a.action('real-tape');assert.match(a.$('.reference-image').src,/evans-textiles.com\/product\/image\/large\/76323_0.png/);}finally{a.dom.window.close();}
});
test('every lesson image exists and all IDs are unique within the course',()=>{
 for(const lesson of Object.values(data.lessons)){assert.equal(new Set(lesson.steps.map(s=>s.id)).size,lesson.steps.length);for(const step of lesson.steps){assert.ok(fs.existsSync(new URL(`../../public/hanging-studio/assets/${step.photo}.webp`,import.meta.url)));assert.equal(step.mine.length,3);assert.equal(step.captions.length,3);}}
});
