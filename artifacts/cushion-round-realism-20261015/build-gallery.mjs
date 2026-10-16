import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const picture=(folder,index,label)=>`<figure><a href="${folder}/${index}.png"><img src="${folder}/${index}.png" alt="${label}" loading="lazy"></a><figcaption>${label}</figcaption></figure>`;
let body='<h1>Round cushions · softer filled form</h1><p>40 and 50 cm. Broader shoulders, a softer perimeter and subtle seam creases. The accepted square, finished dimensions, cutting and pricing rules are unchanged.</p><p class="note">Visual example. Fullness, folds and colour may vary with fabric, filling and lighting.</p><nav><a href="#round-40">40 cm</a> · <a href="#round-50">50 cm</a></nav>';
for(const size of ['round-40','round-50']) {
 const data=JSON.parse(fs.readFileSync(path.join(root,size+'.json'),'utf8'));
 body+=`<section id="${size}"><h2>${size==='round-40'?'40':'50'} cm round</h2><div class="trio">${[1,2,4].map((i)=>picture(size,i,'Updated · '+data.captures[i].label)).join('')}</div><p>Same fabric, placement, camera and lighting in each original/updated pair. Click an image for its full resolution.</p>`;
 for(const [kind,offset] of [['Plain',0],['Striped',5],['Directional',10]]) {
 body+=`<details ${kind==='Plain'?'open':''}><summary>${kind} fabric · all five views</summary>`;
 for(const i of [1,2,0,3,4]) body+=`<h3>${data.captures[offset+i].label}</h3><div class="pair">${picture('baseline-'+size,offset+i,'Original · '+kind)}${picture(size,offset+i,'Updated · '+kind)}</div>`;
 body+='</details>';
 }
 body+=`<p><a href="${size}.json">Updated exact capture specifications</a> · <a href="baseline-${size}.json">Original exact capture specifications</a></p></section>`;
}
body+='<footer>Internal local review. No publication or purchase activation. Real catalogue artwork; procedural customer renderer captures. Circumferential easing remains an approximation, not a globally distortion-free cloth simulation or workroom approval.</footer>';
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Round cushion realism review</title><style>body{font:16px/1.5 system-ui;background:#f7f5ef;color:#233739;margin:0 auto;padding:28px;max-width:1250px}h1{font-size:32px}h2{border-top:1px solid #bbc1b7;padding-top:24px}a{color:#245448}img{display:block;width:100%;height:auto}figure{margin:0;background:#e8e4da}figcaption{padding:9px 14px}.pair,.trio{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}.trio{grid-template-columns:repeat(3,minmax(0,1fr))}details{margin:20px 0}summary{cursor:pointer;font-size:20px;font-weight:600}.note{padding:12px;background:#e6ece3}footer{border-top:1px solid #aaa;margin-top:28px;padding:20px 0}@media(max-width:650px){body{padding:16px}.trio{grid-template-columns:1fr}.pair{gap:6px}figcaption{font-size:13px;padding:6px}}</style>${body}</html>`);
