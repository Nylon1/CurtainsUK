import {copyFile} from 'node:fs/promises';

/** Review-only evidence: the existing tested captures retain their original pixels. */
export async function createFabricSampleReview(out){
  const evidence='C:/Users/hamza/curtainsuk-visualiser-2-fabric-detail-evidence-20261009';
  const fabrics=[['sdg-f1239-30','Amalfi · green plain'],['sdg-dstr237715','Sabu · fine stripe'],['pt-1267-152','Dark plain']];
  for(const [fabric]of fabrics)for(const viewport of ['desktop','mobile'])for(const version of ['previous','current'])for(const view of ['room','close','inspection']){
    const file=`${version}-${viewport}-${fabric}-${view}.png`;
    await copyFile(evidence+'/'+file,out+'/fabric-sample-'+file);
  }
  return `<details class="notes" id="fabric-samples" open><summary style="cursor:pointer;font:25px Georgia,serif;padding:8px 0 20px">Plain fabrics &amp; fine patterns</summary>
  <p>Living Room reference comparisons with curtains closed. These three fabrics route to STANDARD. Use the separate controls here to compare the same fabric in the room, in close-up and under neutral Fabric Inspection.</p>
  <div class="controls" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))"><label>Fabric<select id="sample-fabric">${fabrics.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>Reference view<select id="sample-view"><option value="room">Room · Daylight</option><option value="close">Close-up · Daylight</option><option value="inspection">Room · Fabric Inspection</option></select></label><label>Reference viewport<select id="sample-viewport"><option value="desktop">Desktop</option><option value="mobile">Narrow screen</option></select></label></div>
  <div class="grid">${['previous','current'].map(version=>`<div><p class="eyebrow" style="margin:0 0 12px">${version==='previous'?'Previous rendering':'Refined rendering'}</p><button class="preview" aria-label="Enlarge ${version} fabric sample"><img data-fabric-sample="${version}" src="fabric-sample-${version}-desktop-sdg-f1239-30-room.png" alt="${version} green plain fabric — Living Room, STANDARD, Daylight" width="1026" height="642"><span>Enlarge ↗</span></button></div>`).join('')}</div>
  <p><a id="sample-live" href="http://127.0.0.1:4382/?room=living&amp;fabric=sdg-f1239-30">Explore this fabric in the Living Room →</a> · <a href="fabric-efficiency-summary.json">Repeated performance checks</a></p>
  <script>{const fabric=document.getElementById('sample-fabric'),view=document.getElementById('sample-view'),viewport=document.getElementById('sample-viewport');function refresh(){document.querySelectorAll('[data-fabric-sample]').forEach(img=>{img.src='fabric-sample-'+img.dataset.fabricSample+'-'+viewport.value+'-'+fabric.value+'-'+view.value+'.png';img.alt=(img.dataset.fabricSample==='previous'?'Previous':'Refined')+' '+fabric.selectedOptions[0].text+' — Living Room, STANDARD, '+view.selectedOptions[0].text+', '+viewport.selectedOptions[0].text;});document.getElementById('sample-live').href='http://127.0.0.1:4382/?room=living&fabric='+encodeURIComponent(fabric.value);}for(const input of [fabric,view,viewport])input.addEventListener('change',refresh);refresh();}</script></details>`;
}
