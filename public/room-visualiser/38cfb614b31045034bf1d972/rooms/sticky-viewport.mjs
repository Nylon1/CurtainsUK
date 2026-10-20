// Presentation bridge for the same-origin Shopify app-proxy frame. The host
// scrolls normally; CSS sticky (bounded by .workspace) owns pinning/release.
// No canvas reparenting, second renderer, camera changes or scroll interception.
export function viewportLayout({frameTop=0,top=0,bottom=0,height,mobile=false}){
  const available=Math.max(0,height-top-bottom);
  return {offset:Math.max(0,top-frameTop),available,
    canvasHeight:Math.max(1,Math.min(mobile?240:650,available*(mobile ? 0.34 : 0.72)))};
}

export function mountStickyViewport(){
  const root=document.documentElement,main=document.querySelector('main'),dialog=document.querySelector('#fabric-dialog');
  let host=window,frame=null;
  try{if(window.parent!==window&&window.parent.location.origin===location.origin){host=window.parent;frame=window.frameElement;}}catch{/* Standalone/cross-origin embeds keep local sticky scrolling. */}
  let scheduled=0,disposed=false,locked=false,oldOverflow='',obstructions=[];
  const mobile=matchMedia('(max-width:900px)');
  const set=(name,value)=>{const next=`${Math.round(value*100)/100}px`;if(root.style.getPropertyValue(name)!==next)root.style.setProperty(name,next);};
  function update(){
    scheduled=0;if(disposed)return;
    if(frame&&!frame.isConnected){dispose();return;}
    const vv=host.visualViewport,height=vv?.height||host.innerHeight,visibleTop=vv?.offsetTop||0;
    let top=visibleTop,bottom=0;
    for(const el of obstructions){
      const css=host.getComputedStyle(el),rect=el.getBoundingClientRect();
      if(!['sticky','fixed'].includes(css.position)||css.visibility==='hidden'||!rect.width||!rect.height)continue;
      if(rect.top<=top+1&&rect.bottom>top&&rect.height<height*.6)top=rect.bottom;
      if(css.position==='fixed'&&rect.bottom>=visibleTop+height-1&&rect.top>visibleTop+height*.4)bottom=Math.max(bottom,visibleTop+height-rect.top);
    }
    const frameTop=frame?.getBoundingClientRect().top||0;
    const layout=viewportLayout({frameTop,top,bottom,height:height+visibleTop,mobile:mobile.matches});
    set('--room-sticky-top',frame?layout.offset:top);
    set('--room-canvas-max-height',layout.canvasHeight);
    set('--room-visible-height',layout.available);
    set('--room-dialog-top',frame?layout.offset:top);
    if(frame){
      // Measure content, not the previous iframe viewport height (which cannot shrink).
      const contentHeight=Math.ceil(main.offsetTop+main.offsetHeight);
      if(frame.style.height!==`${contentHeight}px`)frame.style.height=`${contentHeight}px`;
    }
    if(frame&&dialog.open!==locked){
      if(dialog.open){oldOverflow=host.document.documentElement.style.overflow;host.document.documentElement.style.overflow='hidden';}
      else host.document.documentElement.style.overflow=oldOverflow;
      locked=dialog.open;
    }
  }
  function schedule(){if(!scheduled&&!disposed)scheduled=host.requestAnimationFrame(update);}
  function discover(){
    obstructions=[...host.document.querySelectorAll('.shopify-section-group-header-group, .section-header, sticky-header, #shopify-privacy-banner, #shopify-pc__banner, .shopify-pc__banner, [data-cookie-banner]')];
    schedule();
  }
  const resize=new ResizeObserver(schedule);resize.observe(main);
  if(frame){root.classList.add('shopify-page-scroll');frame.style.minHeight='0';}
  discover();for(const el of obstructions)resize.observe(el);
  const changes=new MutationObserver(discover);
  changes.observe(host.document.body,{childList:true,subtree:true});
  const modal=new MutationObserver(schedule);modal.observe(dialog,{attributes:true,attributeFilter:['open']});
  host.addEventListener('scroll',schedule,{passive:true});host.addEventListener('resize',schedule,{passive:true});
  host.visualViewport?.addEventListener('resize',schedule);host.visualViewport?.addEventListener('scroll',schedule);
  mobile.addEventListener('change',schedule);
  // Keyboard focus must land below the pinned view, never behind it.
  function focus(event){
    if(!frame||dialog.open||!event.target.closest('.customer-options'))return;
    const target=event.target.getBoundingClientRect(),view=document.querySelector('.scene-viewport').getBoundingClientRect();
    if(mobile.matches&&target.top<view.bottom+8)host.scrollBy({top:target.top-view.bottom-8,behavior:'instant'});
  }
  document.addEventListener('focusin',focus);
  function dispose(){
    disposed=true;host.cancelAnimationFrame(scheduled);resize.disconnect();changes.disconnect();modal.disconnect();
    host.removeEventListener('scroll',schedule);host.removeEventListener('resize',schedule);
    host.visualViewport?.removeEventListener('resize',schedule);host.visualViewport?.removeEventListener('scroll',schedule);
    mobile.removeEventListener('change',schedule);document.removeEventListener('focusin',focus);
    if(locked)host.document.documentElement.style.overflow=oldOverflow;
  }
  // Safari's back/forward cache restores the same document and live scene.
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  window.addEventListener('pageshow',schedule);update();
  return dispose;
}
