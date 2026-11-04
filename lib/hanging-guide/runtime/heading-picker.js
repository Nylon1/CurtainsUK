import {guides, LAST_GUIDE} from './guide-state.js';
const picker = document.querySelector('#headingType');
if(picker && Object.hasOwn(guides,picker.value)){
  try{localStorage.setItem(LAST_GUIDE,picker.value);}catch{}
}
picker?.addEventListener('change', () => {
  if(Object.hasOwn(guides,picker.value)) window.location.assign(guides[picker.value].page);
});
window.addEventListener('load',()=>{
 if(new URLSearchParams(location.search).get('resume')!=='1')return;
 const summary=document.querySelector('#planSummary');
 const target=summary&&!summary.hidden?summary:document.querySelector('.workspace');
 target?.scrollIntoView({block:'start',behavior:'instant'});
 if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
});
