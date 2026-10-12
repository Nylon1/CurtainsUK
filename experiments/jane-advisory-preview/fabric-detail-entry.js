// Loaded only by the loopback review harness. No production template loads it.
(() => {
  'use strict';
  if(location.hostname!=='127.0.0.1'||!['8789','8794'].includes(location.port))return;
  window.CurtainsUKJaneFabricHandoff={mount(detail,id){
    if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,149}$/.test(id))return;
    const host=detail.querySelector('.cuk-material-intro');if(!host)return;
    host.querySelector('[data-jane-fabric-link]')?.remove();
    const a=document.createElement('a');a.className='cuk-text-link';a.dataset.janeFabricLink=id;
    a.href='/?entry=fabric-detail&fabric='+encodeURIComponent(id)+'#consultation';
    a.textContent='Ask Jane about this fabric';
    a.setAttribute('aria-label','Ask Jane about this fabric, '+id+' (private AI preview)');
    const p=document.createElement('p');p.className='fine';p.textContent='Private AI preview. Jane is not publicly active.';a.append(p);host.append(a);
  }};
})();
