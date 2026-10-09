import {constants} from 'node:fs';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
const evidence='C:/Users/hamza/curtainsuk-visualiser-2-room-views-evidence-20261009';
const gallery='C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009';
let images=0;
for(const room of ['living','bedroom','lounge','office'])for(const viewport of ['desktop','mobile'])for(const profile of ['STANDARD','FIXED140'])for(const mode of ['daylight','daylight-closed','evening','inspection',...(room==='living'?['fireplace']:[])]){
 const name=`${room}-${viewport}-${profile}-${mode}.png`;
 await copyFile(`${evidence}/${name}`,`${gallery}/${name}`);images++;
}
try{await copyFile(`${gallery}/performance-summary.json`,`${gallery}/performance-summary-before-room-views.json`,constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
const summary=JSON.parse(await readFile(`${gallery}/performance-summary.json`,'utf8'));
const views=JSON.parse(await readFile(`${evidence}/performance-summary.json`,'utf8'));
summary.summaryMeasurementsPrecedeRoomViewsUpdate=true;
summary.roomViewsUpdate={evidence:'room-views-performance-summary.json',conditions:views.conditions,measuredRooms:['office','bedroom','lounge'],runsPerRoomAndVersion:1};
summary.galleryHeadline='Latest room-view checks: Office 4.13s, Bedroom 4.78s and Lounge 4.31s from viewer start to ready. Full page loads were 5.37–6.04s, above the 5.2s target. These are single fresh-browser samples per room/version, not medians. Earlier Living Room window measurements remain in the evidence. Physical iPhone testing is outstanding.';
await copyFile(`${evidence}/performance-summary.json`,`${gallery}/room-views-performance-summary.json`);
await writeFile(`${gallery}/performance-summary.json`,JSON.stringify(summary,null,2)+'\n');
let check=await readFile(new URL('./window-review-check.mjs',import.meta.url),'utf8');
check=check.replace('curtainsuk-visualiser-2-window-evidence-20261009','curtainsuk-visualiser-2-room-views-evidence-20261009');
check=check.replace("http://127.0.0.1:4382/rooms-review'","http://127.0.0.1:4382/rooms-review?review=room-views'");
check=check.replace('article[data-room="living"] .live','article[data-room="lounge"] .live');
check=check.replace("assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);", "assert.equal(await p.evaluate(()=>roomProof.room),'lounge');assert.ok(await p.evaluate(()=>roomRefinement.scene.getObjectByName('PVC window and garden').children.find(o=>o.visible).children.find(o=>o.material?.name==='User garden photograph').material.map.image.src.endsWith('lounge-garden.jpg')));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);");
check=check.replace('livingLinkReady:true','loungeLinkReady:true,correctLoungePhoto:true');
await writeFile(new URL('./room-views-review-check.mjs',import.meta.url),check);
console.log(JSON.stringify({images,summaryUpdated:true,reviewCheckReady:true}));
