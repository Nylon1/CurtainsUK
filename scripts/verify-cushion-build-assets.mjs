/** Assert the raw files served by Cushion Studio survive Next serverless tracing. */
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
const runtime=['index.html','studio.css','studio.mjs','review.mjs','guide-thumbnails.mjs','my-home-thumbnails.mjs','scene.mjs','geometry.mjs','state.mjs','arrangement.mjs'];
const required=[...runtime.map(name=>'lib/cushion-studio/runtime/'+name),'shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms-store.js',...['three.module.js','three.core.js','LICENSE.txt'].map(name=>'lib/room-visualiser/runtime/vendor/'+name)];
const routes=['api/staging/shopify-proxy/cushion-studio/[[...path]]','cushion-studio-preview/[[...asset]]'];
for(const route of routes){
 const manifest=path.resolve('.next/server/app',route,'route.js.nft.json');
 const {files}=JSON.parse(await readFile(manifest,'utf8'));
 const traced=new Set(files.map(file=>path.resolve(path.dirname(manifest),file)));
 for(const file of required){
  const absolute=path.resolve(file);
  if(!traced.has(absolute))throw Error(`Cushion deployment asset missing from ${route}: ${file}`);
  await access(absolute);
 }
 console.log(`Cushion build assets: ${route}, ${required.length}/${required.length} required raw files traced and present`);
}
