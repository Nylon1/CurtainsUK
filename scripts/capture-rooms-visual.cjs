/* Dedicated local evidence session. Never reads or clears an owner's browser profile. */
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const binary=path.join(process.env.APPDATA,'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const session=`rooms-locked-visual-${process.pid}`,out='artifacts/build-my-rooms-v1';
const report={scope:'Final local visual review. Approved fabric photographs; fixture costs/stock, no live quote or payment.',checks:[],screenshots:[]};
function run(args,input){let raw;try{raw=execFileSync(binary,['--session',session,'--json',...args],{encoding:'utf8',input,timeout:20000,maxBuffer:2e6});}catch(error){if(!error.stdout?.trim().startsWith('{'))throw error;raw=error.stdout;}const result=JSON.parse(raw);assert.ok(result.success,result.error);return result.data;}
const evaluate=code=>run(['eval','--stdin'],code).result;
function screenshot(name){evaluate('window.scrollTo(0,0)');evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))');assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);run(['screenshot',`${out}/${name}.png`,'--full']);report.screenshots.push(name+'.png');}
function snapshot(){run(['snapshot','-i']);}
run(['open','http://127.0.0.1:4348/pages/build-my-rooms']);snapshot();run(['set','viewport','1440','1000']);
assert.equal(evaluate('CurtainsUKRooms.totals(CurtainsUKRooms.read()).curtains'),0);screenshot('final-empty');
// Empty organisational rooms do not replace the intentional zero-curtain state.
evaluate(`CurtainsUKRooms.change(CurtainsUKRooms.read().revision,h=>CurtainsUKRooms.addRoom(h,'Planned room'))`);run(['reload']);snapshot();assert.equal(evaluate('!!document.querySelector(".cukrooms__empty")'),true);report.checks.push('Zero curtains displays empty state even with a preserved organisational room');
evaluate(`(async()=>{const items=await(await fetch('/fixtures?count=1')).json();await CurtainsUKRooms.addCurtain(items[0],{roomId:CurtainsUKRooms.read().rooms[0].room_id});const h=CurtainsUKRooms.read();await CurtainsUKRooms.change(h.revision,n=>{n.rooms[0].room_name='Living Room';});})()`);run(['reload']);snapshot();assert.deepEqual(evaluate('window.__roomsRenderStates'),['CONTENT']);screenshot('final-one-room-one-window');
evaluate(`(async()=>{const items=await(await fetch('/fixtures?count=2')).json();await CurtainsUKRooms.addCurtain(items[1],{roomId:CurtainsUKRooms.read().rooms[0].room_id});})()`);run(['reload']);snapshot();screenshot('final-one-room-two-windows');
evaluate(`(async()=>{const items=await(await fetch('/fixtures?count=3')).json();await CurtainsUKRooms.addCurtain(items[1],{roomName:'Main Bedroom'});await CurtainsUKRooms.addCurtain(items[2],{roomName:'Home Office'});})()`);run(['reload']);snapshot();
run(['find','label','UK Mainland postcode','fill','BB2 3FA']);run(['find','role','button','click','--name','Review My Rooms →']);run(['wait','[data-confirm-measurements]']);snapshot();screenshot('final-three-rooms');
for(const width of [390,412]){run(['set','viewport',String(width),'1000']);snapshot();screenshot(`final-mobile-${width}`);assert.equal(evaluate('Boolean(document.querySelector(".cukrooms__summary").compareDocumentPosition(document.querySelector("#rooms-review")) & Node.DOCUMENT_POSITION_FOLLOWING)'),true);report.checks.push(`${width}px no overflow; Summary precedes Review in DOM and reading order`);}
run(['set','viewport','1440','1000']);run(['find','label','I confirm the measurements and selections shown above are correct.','check']);run(['find','role','button','click','--name','Continue to secure checkout']);run(['wait','[data-rooms-error]:not([hidden])']);snapshot();assert.match(evaluate('document.querySelector("[data-rooms-error]").innerText'),/no order or payment/);screenshot('final-guarded-checkout');
assert.equal(evaluate('document.querySelector("[data-cuk-rooms]").innerText.includes("—")'),false);report.checks.push('Customer-authored Rooms copy contains no em dash in all rendered review content');
assert.equal(evaluate('[...document.images].every(i=>i.complete&&i.naturalWidth>0)'),true);report.checks.push('All exact fabric photographs and neutral heading studies loaded');
report.summary=evaluate('document.querySelector(".cukrooms__summary").innerText');report.browserErrors=run(['errors']);assert.equal(report.browserErrors.errors.length,0);
fs.writeFileSync(`${out}/final-visual-report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));run(['close']);
