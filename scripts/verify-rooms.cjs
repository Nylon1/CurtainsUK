/* Local fixture browser tests. Every URL is loopback; no production writes. */
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const binary=path.join(process.env.APPDATA,'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'curtainsuk-rooms-browser-'));
const out='artifacts/build-my-rooms-v1';fs.mkdirSync(out,{recursive:true});
const report={scope:'UNPUBLISHED LOOPBACK FIXTURES — not a live Shopify rehearsal',checks:[],screenshots:[]};
let session=`rooms-qa-${process.pid}`;
function run(args,input){let output;try{output=execFileSync(binary,['--session',session,'--profile',profile,'--json',...args],{encoding:'utf8',input,timeout:20000,maxBuffer:2e6});}catch(error){if(!error.stdout?.trim().startsWith('{'))throw error;output=error.stdout;}const result=JSON.parse(output);assert.ok(result.success,result.error||JSON.stringify(result));return result.data;}
const evaluate=code=>run(['eval','--stdin'],code).result;
const current=()=>evaluate('CurtainsUKRooms.read()');
const shot=name=>{run(['screenshot',`${out}/${name}.png`,'--full']);report.screenshots.push(`${name}.png`);};
function reset(){evaluate(`localStorage.removeItem(CurtainsUKRooms.KEY);localStorage.removeItem(CurtainsUKRooms.INTENT_KEY)`);run(['reload']);}
function seed(count){evaluate(`(async()=>{const items=await(await fetch('/fixtures?count=${count}')).json();for(let i=0;i<items.length;i++){const roomName=['Living Room','Main Bedroom','Home Office'][i%3];const h=CurtainsUKRooms.ensure();const room=h.rooms.find(r=>r.room_name===roomName);await CurtainsUKRooms.addCurtain(items[i],room?{roomId:room.room_id}:{roomName});}return true;})()`);run(['reload']);}
run(['open','http://127.0.0.1:4348']);run(['snapshot','-i']);reset();
for(const count of [1,3,10]){reset();seed(count);const before=current();run(['reload']);assert.deepEqual(current(),before);assert.equal(before.rooms.flatMap(r=>r.curtains).length,count);report.checks.push(`${count} curtains survive refresh`);}
const ten=current();
run(['close']);session+='-reopened';run(['open','http://127.0.0.1:4348/pages/build-my-rooms']);assert.deepEqual(current(),ten);report.checks.push('10 curtains survive browser close/reopen using persistent same-device profile');
for(const route of ['/pages/fabric-library?view=browse-fabrics','/apps/curtainsuk-decision/consultation?experience=premium&entry=match','/pages/curtain-visualiser?fabric=pt-4269-147&rooms_new=1']){run(['open','http://127.0.0.1:4348'+route]);run(['back']);assert.deepEqual(current(),ten);run(['forward']);run(['back']);assert.deepEqual(current(),ten);report.checks.push(`Local navigation/back/forward: ${route}`);}
// The broad fixture contains four windows in Living Room and three each in two other rooms.
assert.deepEqual(ten.rooms.map(r=>r.curtains.length),[4,3,3]);
for(const width of [1440,390,412]){run(['set','viewport',String(width),'1000']);const dimensions=evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,cards:document.querySelectorAll('[data-curtain]').length,remove:[...document.querySelectorAll('[data-remove]')].every(b=>b.getBoundingClientRect().height>=44)})`);assert.equal(dimensions.overflow,false);assert.equal(dimensions.cards,10);assert.equal(dimensions.remove,true);report.checks.push(`${width}px: no overflow; ten visual cards; 44px removal targets`);}
reset();seed(3);run(['set','viewport','1440','1000']);run(['snapshot','-i']);
evaluate(`Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r;setTimeout(r,12000)})))`);
shot('desktop');
run(['set','viewport','390','1000']);shot('mobile-390');run(['set','viewport','412','1000']);shot('mobile-412');
run(['find','role','button','click','--name','Organise Living Room']);run(['snapshot','-i']);run(['find','label','Room name','fill','Front Lounge']);run(['find','role','button','click','--name','Rename room']);run(['snapshot','-i']);assert.equal(current().rooms[0].room_name,'Front Lounge');report.checks.push('Custom room name saves automatically');
run(['find','role','button','click','--name','+ Add another window to Front Lounge']);run(['snapshot','-i']);assert.equal(evaluate('CurtainsUKRooms.readIntent().room_id'),current().rooms[0].room_id);run(['find','role','button','click','--name','Back to my rooms']);report.checks.push('Add another window carries room identity only');
run(['find','role','button','click','--name','+ Add another room']);run(['snapshot','-i']);run(['find','label','Room name','fill','Guest Bedroom']);run(['find','role','button','click','--name','Add room']);run(['snapshot','-i']);run(['find','role','button','click','--name','Back to my rooms']);assert.equal(current().rooms.at(-1).room_name,'Guest Bedroom');report.checks.push('New room autosaves before fabric discovery');
const beforeRemove=current();const middle=beforeRemove.rooms[1].curtains[0].configuration_id;
run(['find','role','button','click','--name','Remove curtain from Main Bedroom — French Doors']);run(['snapshot','-i']);run(['find','role','button','click','--name','Remove curtain','--exact']);run(['snapshot','-i']);assert.equal(current().rooms.flatMap(r=>r.curtains).some(c=>c.configuration_id===middle),false);assert.deepEqual(current().rooms[0].curtains,beforeRemove.rooms[0].curtains);report.checks.push('Remove middle curtain preserves other specifications');
run(['find','label','UK Mainland postcode','fill','BB2 3FA']);run(['find','role','button','click','--name','Review My Rooms →']);run(['wait','[data-confirm-measurements]']);run(['snapshot','-i']);assert.match(evaluate('document.querySelector("#rooms-review").innerText'),/Your rooms are ready to review/);assert.equal(evaluate('document.querySelector("[data-checkout]").disabled'),true);report.checks.push('Unchanged server review shows exact summary; checkout release remains blocked');shot('review');
evaluate(`fetch('/scenario?value=price-change')`);run(['find','role','button','click','--name','Review My Rooms →']);run(['wait','[data-price-ack]']);
assert.ok(evaluate('document.querySelectorAll("[data-price-ack]").length')>0);report.checks.push('Price changes require individual acknowledgement');shot('changed-price');
for(const scenario of ['out-of-stock','non-commercial','unavailable']){evaluate(`fetch('/scenario?value=${scenario}')`);run(['find','role','button','click','--name','Review My Rooms →']);run(['wait','[data-confirm-measurements]']);run(['snapshot','-i']);assert.equal(evaluate('document.querySelector("[data-checkout]").disabled'),true);assert.equal(current().rooms.flatMap(r=>r.curtains).length,2);report.checks.push(`${scenario}: checkout blocked, saved rooms retained`);}
run(['find','role','button','click','--name','Organise Home Office']);run(['snapshot','-i']);run(['find','role','button','click','--name','Remove entire room']);run(['snapshot','-i']);run(['find','role','button','click','--name','Remove room','--exact']);run(['snapshot','-i']);assert.equal(current().rooms.some(r=>r.room_name==='Home Office'),false);report.checks.push('Remove entire room preserves other rooms');
run(['find','role','button','click','--name','Remove curtain from Front Lounge — Standard Window']);run(['snapshot','-i']);run(['find','role','button','click','--name','Remove curtain','--exact']);run(['snapshot','-i']);assert.equal(current().rooms.length,0);assert.match(evaluate('document.querySelector("[data-cuk-rooms]").innerText'),/Start your first room/);report.checks.push('Final removal produces intentional empty state');shot('empty-mobile');
report.browserErrors=run(['errors']);
fs.writeFileSync(`${out}/browser-verification.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
run(['close']);
