/** Contact sheets for every provisional plain source that passed numerical V1 checks. */
import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import sharp from 'sharp';

const i=process.argv.indexOf('--output');
if(i<0)throw Error('Pass --output <private-evidence-dir>');
const dir=resolve(process.argv[i+1]);
const rows=(await readFile(join(dir,'final-ledger.jsonl'),'utf8'))
  .trim().split(/\r?\n/).map(JSON.parse)
  .filter(row=>row.selection_basis!=='PUBLISHED_REPEAT'&&row.state==='V1_PASS');
const out=join(dir,'plain-source-review');await mkdir(out,{recursive:true});
const cols=8,perPage=64,w=230,h=250;
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let start=0;start<rows.length;start+=perPage){
  const page=rows.slice(start,start+perPage),composite=[];
  for(let k=0;k<page.length;k++){
    const row=page[k],left=(k%cols)*w,top=Math.floor(k/cols)*h;
    const file=join(dir,'prepared-assets',row.asset_path.split('/').at(-1));
    const thumb=await sharp(file).resize(w-8,h-44,{fit:'contain',background:'#f7f5ef'})
      .jpeg({quality:82}).toBuffer();
    composite.push({input:thumb,left:left+4,top:top+2});
    const label=`<svg width="${w}" height="42"><rect width="100%" height="100%" fill="#f7f5ef"/>
      <text x="4" y="16" font-family="Arial" font-size="13" fill="#123b32">${xml(row.fabric_id)}</text>
      <text x="4" y="33" font-family="Arial" font-size="11" fill="#53645d">${xml(row.design)}</text></svg>`;
    composite.push({input:Buffer.from(label),left,top:top+h-42});
  }
  const target=join(out,`plain-sources-${String(start/perPage+1).padStart(2,'0')}.jpg`);
  await sharp({create:{width:cols*w,height:Math.ceil(page.length/cols)*h,channels:3,
    background:'#f7f5ef'}}).composite(composite).jpeg({quality:85}).toFile(target);
  console.log(JSON.stringify({file:target,from:start+1,to:start+page.length}));
}
console.log(JSON.stringify({provisionalPlainSources:rows.length,pages:Math.ceil(rows.length/perPage)}));
