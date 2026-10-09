import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-window-evidence-20261009',results=[];
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
for(const profile of ['STANDARD','FIXED140']){
 await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212'));await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 for(const room of ['living','bedroom','lounge','office']){if(room!=='living')await p.evaluate(room=>roomReview.setRoom(room),room);await p.evaluate(()=>roomReview.setProgress(1));
  for(const view of ['room','curtain',...(profile==='FIXED140'?['full']:[])]){
   await p.locator('[data-view="'+view+'"]').click();
   const sample=await p.evaluate(async()=>{const T=await import('three'),{camera,scene}=roomRefinement,group=scene.getObjectByName('PVC window and garden').children.find(o=>o.visible),photo=group.children.find(o=>o.material?.name==='User garden photograph'),a=group.userData.opening,ray=new T.Raycaster(),point=new T.Vector3(),projected=new T.Vector3(),direction=new T.Vector3(),misses=[];let samples=0;
    for(let x=a.left+7;x<a.right-7;x+=5)for(let y=a.bottom+7;y<a.top-7;y+=5){point.set(x,y,-49);projected.copy(point).project(camera);if(Math.abs(projected.x)>1||Math.abs(projected.y)>1||Math.abs(projected.z)>1)continue;direction.copy(point).sub(camera.position).normalize();ray.set(camera.position,direction);samples++;if(!ray.intersectObject(photo).length)misses.push(point.toArray());}return{samples,misses,camera:camera.position.toArray()};
   });results.push({profile,room,view,...sample});await writeFile(out+'/photo-coverage.json',JSON.stringify(results,null,2));console.log(JSON.stringify({profile,room,view,samples:sample.samples,misses:sample.misses.length}));assert.equal(sample.misses.length,0,'Garden image edge visible');
  }
 }
}
}finally{await b.close();}
