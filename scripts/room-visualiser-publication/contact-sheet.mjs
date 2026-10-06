// Internal visual gate artifact for each bounded publication batch.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import sharp from 'sharp';
const [reportPath,queuePath,outputPath]=process.argv.slice(2);
if(!reportPath||!queuePath||!outputPath)throw Error('Pass report.json queue.jsonl output.jpg');
const report=JSON.parse(await readFile(resolve(reportPath),'utf8'));
const queue=new Map((await readFile(resolve(queuePath),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse).map(row=>[row.fabricId,row]));
const manifest=JSON.parse(await readFile('lib/room-visualiser/assets.json','utf8'));
const entries=new Map(manifest.fabrics.map(row=>[row.fabricId,row]));
const ids=report.stagedFabricIds,cellW=440,cellH=220,columns=4,rows=Math.ceil(ids.length/columns);
const composites=[];
for(const [position,id] of ids.entries()){
  const row=queue.get(id),entry=entries.get(id),x=position%columns*cellW,y=Math.floor(position/columns)*cellH;
  const source=Buffer.from(await (await fetch(row.sourceUrl)).arrayBuffer());
  const src=await sharp(source).resize(206,178,{fit:'cover'}).jpeg({quality:80}).toBuffer();
  const file=entry.image.startsWith('/room-visualiser/')?join('public',entry.image.slice(1)):join('lib/room-visualiser/runtime',entry.image);
  const texture=await sharp(file).resize(206,178,{fit:'cover'}).jpeg({quality:80}).toBuffer();
  const label=Buffer.from(`<svg width="440" height="28"><rect width="440" height="28" fill="#ffffff"/><text x="8" y="20" font-size="15" font-family="Arial" fill="#111111">${id.replaceAll('&','&amp;')} · ${String(row.design).replaceAll('&','&amp;').replaceAll('<','&lt;')}</text></svg>`);
  composites.push({input:src,left:x+8,top:y+32},{input:texture,left:x+224,top:y+32},{input:label,left:x,top:y});
}
const sheet=await sharp({create:{width:cellW*columns,height:cellH*rows,channels:3,background:'#f2f0e9'}}).composite(composites).jpeg({quality:90}).toBuffer();
await writeFile(resolve(outputPath),sheet);
console.log(JSON.stringify({fabrics:ids.length,output:resolve(outputPath)}));
