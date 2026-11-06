const links=[['roman.html','Roman blinds','home-nav'],['index.html','Room visualiser',''],['measure.html','How to measure',''],['install.html','How to install',''],['shop.html','Shop now','shop-nav']];
const current=location.pathname.split('/').pop()||'index.html';
const nav=links.map(([href,label,cls])=>`<a href="${href}" class="${cls}" ${href===current?'aria-current="page"':''}>${label}</a>`).join('');
const header=document.querySelector('header');if(header){header.className='journey-header';header.innerHTML=`<a class="journey-logo" href="roman.html" aria-label="CurtainsUK Roman blinds home"><img src="/logo.png" alt="CurtainsUK" width="112" height="56"></a><nav class="journey-nav" aria-label="Roman blinds">${nav}</nav>`;}
const footer=document.querySelector('footer');if(footer){footer.className='journey-footer';footer.innerHTML=`<a href="roman.html">CURTAINSUK / ROMAN BLINDS</a><nav aria-label="Roman blind footer"><a href="index.html">Visualiser</a><a href="measure.html">Measure</a><a href="install.html">Install</a><a href="shop.html">Shop now</a></nav><a href="https://www.curtainsuk.com/pages/contact-us">Ask our team ↗</a>`;}
export const designKey='curtainsuk-roman-design-v1';
export function readDesign(){try{return JSON.parse(localStorage.getItem(designKey)||'{}')||{};}catch{return {};}}
export function saveDesign(patch){try{localStorage.setItem(designKey,JSON.stringify({...readDesign(),...patch}));return true;}catch{return false;}}
