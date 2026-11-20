import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as data from '../../public/hanging-studio/lessons.js';
import * as scenes from '../../public/hanging-studio/scenes.js';

export function app({storage, reducedMotion=false, storageUnavailable=false}={}){
 const dom=new JSDOM(fs.readFileSync(new URL('../../public/hanging-studio/index.html',import.meta.url),'utf8'),{url:'https://example.test/hanging-studio/',runScripts:'outside-only'});
 const w=dom.window;w.lessonModule=data;w.sceneModule=scenes;w.structuredClone=structuredClone;
 if(storage!==undefined)w.localStorage.setItem('curtainsuk.hanging.v1',storage);
 if(storageUnavailable)Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage unavailable');}});
 let now=0,id=0;const frames=new Map();
 w.matchMedia=()=>({matches:reducedMotion});w.performance.now=()=>now;
 w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 try{w.eval('const {lessons,sources,blankPractice,completePractice,practiceAction}=window.lessonModule;const {sceneHTML}=window.sceneModule;\n'+fs.readFileSync(new URL('../../public/hanging-studio/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,''));}catch(e){w.close();throw e;}
 const $=selector=>w.document.querySelector(selector);
 const click=selector=>{const el=$(selector);assert.ok(el,`Missing ${selector}`);if(typeof el.click==='function')el.click();else el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
 const action=a=>click(`button[data-action="${a}"]`);
 const input=(selector,value)=>{const el=$(selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const change=(selector,value)=>{const el=$(selector);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const key=(selector,key)=>$(selector).dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
 const pointer=(type,selector,x,y)=>{const e=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:1});$(selector).dispatchEvent(e);};
 const advance=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
 const hide=()=>{Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));};
 return {dom,w,$,click,action,input,change,key,pointer,advance,frames,hide};
}
