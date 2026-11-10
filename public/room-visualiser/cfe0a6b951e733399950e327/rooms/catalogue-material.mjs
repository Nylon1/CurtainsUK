// Catalogue presentation adapter around the approved curtain component. It never
// creates cloth, changes a position/UV/index buffer, or estimates pattern scale.
import {FABRICS} from '../fabrics.mjs';
import {previewPlan} from './catalogue-contract.mjs';
export function catalogueMaterial(curtain){
  const mesh=curtain.group.children.find(child=>child.geometry===curtain.geometry),material=mesh.material;
  let generation=0,selection=null;
  function neutral(){curtain.clearFabric();material.map=null;material.color.set('#e7e2d8');material.needsUpdate=true;curtain.proof.fabric=null;curtain.proof.plan={state:'fallback',reason:selection.plan.reason};curtain.proof.texture=null;}
  return {async select(record){
    const request=++generation,plan=previewPlan(record,FABRICS);selection={record,plan};
    if(plan.state==='ready'){
      if(curtain.proof.fabric!==plan.engineId)await curtain.setFabric(plan.engineId);
      if(request!==generation){if(selection.plan.state!=='ready')neutral();return{applied:false};}
      material.color.set('#ffffff');
    }else neutral();
    curtain.proof.catalogue={id:record.id,state:plan.state,reason:plan.reason};
    return{...plan,applied:true};
  }};
}
