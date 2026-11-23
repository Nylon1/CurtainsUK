const links=[['index.html','Room visualiser'],['measure.html','How to measure'],['install.html','How to install']];
const current=location.pathname.split('/').pop()||'index.html';
const shopHref=current==='shop.html'?'#size-title':'shop.html';
const nav=links.map(([href,label])=>`<a href="${href}" ${href===current?'aria-current="page"':''}>${label}</a>`).join('');
const header=document.querySelector('header');
if(header){
 header.className='journey-header';
 header.innerHTML=`<div class="journey-topbar"><a class="journey-main-menu" href="https://www.curtainsuk.com/"><span aria-hidden="true">←</span> Main menu</a><div class="journey-brand"><a class="journey-logo" href="https://www.curtainsuk.com/" aria-label="CurtainsUK home"><img src="logo.png" alt="CurtainsUK" width="112" height="56"></a><a class="journey-section" href="roman.html" ${current==='roman.html'?'aria-current="page"':''}>Roman blinds</a></div><a class="journey-shop" href="${shopHref}" ${current==='shop.html'?'aria-current="page"':''}>Shop Roman blinds</a></div><nav class="journey-nav" aria-label="Roman blind tools">${nav}</nav>`;
 const updateHeaderHeight=()=>document.documentElement.style.setProperty('--journey-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
 updateHeaderHeight();
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateHeaderHeight).observe(header);
}
const footer=document.querySelector('footer');if(footer){footer.className='journey-footer';footer.innerHTML=`<a href="https://www.curtainsuk.com/">← Main menu</a><nav aria-label="Roman blind footer"><a href="roman.html">Roman blinds</a><a href="index.html">Visualiser</a><a href="measure.html">Measure</a><a href="install.html">Install</a><a href="${shopHref}">Shop Roman blinds</a></nav><a href="https://www.curtainsuk.com/pages/contact-us">Ask our team ↗</a>`;}
export const designKey='curtainsuk-roman-design-v1';
export function readDesign(){try{return JSON.parse(localStorage.getItem(designKey)||'{}')||{};}catch{return {};}}
export function saveDesign(patch){try{localStorage.setItem(designKey,JSON.stringify({...readDesign(),...patch}));return true;}catch{return false;}}
