(function(){
  'use strict';
  const dialog=document.querySelector('[data-cuk-welcome]');if(!dialog)return;
  const offerKey='curtainsuk_welcome5_signup_v1',seenKey='curtainsuk_welcome_popup_seen_v1';
  const stored=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
  const success=!!dialog.querySelector('[data-welcome-success]');
  function reveal(){dialog.querySelector('[data-welcome-form-panel]').hidden=true;dialog.querySelector('[data-welcome-code-panel]').hidden=false;save(offerKey,'WELCOME5');window.dispatchEvent(new CustomEvent('curtainsuk:welcome-offer',{detail:{code:'WELCOME5'}}));}
  function open(){if(!dialog.open)dialog.showModal();save(seenKey,'1');}
  window.CurtainsUKWelcome={open,hasCode:()=>stored(offerKey)==='WELCOME5'};
  dialog.querySelector('[data-welcome-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.querySelector('[data-welcome-copy]').addEventListener('click',async event=>{try{await navigator.clipboard.writeText('WELCOME5');event.currentTarget.textContent='Copied';}catch{event.currentTarget.textContent='Code: WELCOME5';}});
  if(success){reveal();open();}
  else if(dialog.querySelector('[aria-invalid="true"]'))open();
  else if(!stored(seenKey)&&!location.pathname.startsWith('/pages/build-my-rooms'))open();
})();
