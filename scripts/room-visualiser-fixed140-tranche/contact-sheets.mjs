/** Review-only catalogue contact sheets. Never changes eligibility or artwork. */
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import sharp from 'sharp';

const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(`--${name}`);return i<0?null:args[i+1];};
const output=option('output');
if(!output)throw Error('Usage: node contact-sheets.mjs --output <private-tranche-dir>');
const dir=resolve(output);
let ledger;
try{ledger=await readFile(join(dir,'final-ledger.jsonl'),'utf8');}
catch(error){if(error.code!=='ENOENT')throw error;ledger=await readFile(join(dir,'ledger.jsonl'),'utf8');}
const rows=ledger.trim().split(/\r?\n/).map(JSON.parse);
const sheets=join(dir,'contact-sheets');
await mkdir(sheets,{recursive:true});
const heldNames=await readdir(join(dir,'held-source-evidence')).catch(()=>[]);
const heldByHash=new Map(heldNames.map(name=>[name.split('.')[0],name]));
const W=182,H=210,COLS=10,ROWS=10;
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let start=0;start<rows.length;start+=COLS*ROWS){
  const cells=rows.slice(start,start+COLS*ROWS);
  const composites=[];
  for(let i=0;i<cells.length;i++){
    const row=cells[i],left=(i%COLS)*W,top=Math.floor(i/COLS)*H;
    if(row.source_sha256){
      const file=row.asset_path?join(dir,'prepared-assets',row.asset_path.split('/').at(-1)):
        heldByHash.has(row.source_sha256)?join(dir,'held-source-evidence',heldByHash.get(row.source_sha256)):null;
      try{
        if(!file)throw Error('Source evidence image missing');
        const thumb=await sharp(file).resize(W-8,H-35,{fit:'contain',background:'#e9e8e4'}).jpeg({quality:75}).toBuffer();
        composites.push({input:thumb,left:left+4,top:top+3});
      }catch{}
    }
    const label=`<svg width="${W}" height="32"><rect width="100%" height="100%" fill="#f9f8f5"/>
      <text x="4" y="13" font-family="Arial" font-size="12" fill="#1c332d">${xml(row.fabric_id)}</text>
      <text x="4" y="27" font-family="Arial" font-size="10" fill="${row.state==='V1_PASS'?'#3c6c50':'#9a5538'}">${xml(row.state)} · ${xml(row.width?.cm??'?')} cm</text></svg>`;
    composites.push({input:Buffer.from(label),left,top:top+H-32});
  }
  const file=join(sheets,`source-${String(start/(COLS*ROWS)+1).padStart(2,'0')}.jpg`);
  await sharp({create:{width:COLS*W,height:ROWS*H,channels:3,background:'#e9e8e4'}})
    .composite(composites).jpeg({quality:82}).toFile(file);
  console.log(file);
}
