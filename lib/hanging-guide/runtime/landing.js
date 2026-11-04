import {savedGuides,latestGuide} from './guide-state.js';
export function renderSaved(storage,root=document){
 const saved=savedGuides(storage),latest=latestGuide(storage,saved);
 const panel=root.querySelector('#return-guide');panel.hidden=!latest;
 if(latest){
  root.querySelector('#return-title').textContent=latest.name+' · '+latest.width+' cm';
  root.querySelector('#return-progress').textContent=latest.finished?'All steps complete. Your plan is ready to revisit.':latest.completed+' of '+latest.steps+' steps complete';
  const link=root.querySelector('#return-link');link.href=latest.page+'?resume=1';
  link.textContent=latest.finished?'Review your guide →':'Continue your guide →';
 }
 for(const card of root.querySelectorAll('[data-guide]')){
  const plan=saved.find(p=>p.id===card.dataset.guide);
  card.href=card.dataset.guide+'.html'+(plan?'?resume=1':'');
  card.querySelector('.card-action').textContent=plan?(plan.finished?'Review your guide':'Continue your guide'):'Open your guide';
  card.querySelector('.saved-status').textContent=plan?(plan.finished?'Complete':'Plan saved'):'';
 }
}
function refresh(){let storage;try{storage=localStorage;}catch{}renderSaved(storage);}
window.addEventListener('pageshow',refresh);
window.addEventListener('storage',refresh);
refresh();
