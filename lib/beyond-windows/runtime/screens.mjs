import * as T from 'three';
import {makeRoute,routePoints,panelSpans,foldSection} from './model.mjs';

export function createScreenSystem(state,{face,lining,voile,metal}){
  const root=new T.Group(),route=makeRoute(routePoints(state)),meshes=[],chain=[],owned=[];
  const drop=245,top=250,cols=240,rows=20;
  const railMat=new T.MeshStandardMaterial({color:'#c9c4b7',metalness:.6,roughness:.3});owned.push(railMat);
  // Each moving or fixed layer has its own supporting route.
  for(const offset of state.material==='layered'?[0,16]:state.material==='mixed'?[0,-17]:[0]){
    const line=new T.Curve();line.getPoint=t=>{const p=route.at(route.length*t);return new T.Vector3(p.x+p.nx*offset,top+3,p.z+p.nz*offset);};
    root.add(new T.Mesh(new T.TubeGeometry(line,100,1.25,6,false),railMat));
    for(let d=0;d<=route.length;d+=95){const p=route.at(d),m=new T.Mesh(new T.CylinderGeometry(.5,.5,27,6),railMat);m.position.set(p.x+p.nx*offset,top+17,p.z+p.nz*offset);root.add(m);}
  }
  function cloth(material,reverse,layerIndex=0){
    const n=state.draw==='pair'?2:1;
    for(let panel=0;panel<n;panel++){
      const g=new T.BufferGeometry(),p=new Float32Array((cols+1)*(rows+1)*3),uv=new Float32Array((cols+1)*(rows+1)*2),idx=[];
      const full=route.length/n*2.15;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const k=j*(cols+1)+i;uv[k*2]=i/cols*full;uv[k*2+1]=j/rows*drop;if(i<cols&&j<rows){idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}}
      g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);
      const mesh=new T.Mesh(g,material);mesh.castShadow=material!==voile;mesh.receiveShadow=true;mesh.frustumCulled=false;root.add(mesh);
      if(reverse){const back=new T.Mesh(g,reverse);back.castShadow=true;back.receiveShadow=true;back.frustumCulled=false;root.add(back);}
      meshes.push({g,p,panel,layerIndex});
    }
  }
  const metallic=['ball','linked','mixed'].includes(state.material);
  if(['fabric','layered'].includes(state.material))cloth(face,lining,0);
  if(['voile','layered','mixed'].includes(state.material))cloth(voile,null,state.material==='layered'?1:0);
  if(metallic){
    // Edge Interiors ShimmerScreen brochure lists 12.7 mm round beads. Spacing
    // is illustrative here, rather than an orderable density or track selection.
    const balls=state.material!=='linked',spacing=balls?(state.density==='dense'?1.5:3):(state.density==='dense'?4.2:7),columns=Math.ceil(route.length/spacing),step=balls?1.7:4.6,count=Math.floor(drop/step);
    const geometry=balls?new T.SphereGeometry(.635,6,4):new T.TorusGeometry(1.35,.34,3,8);
    const instanced=new T.InstancedMesh(geometry,metal,columns*count);instanced.castShadow=false;instanced.receiveShadow=true;instanced.frustumCulled=false;root.add(instanced);
    // Ball connectors are real narrow rods, not a filled opacity sheet.
    let connectors=null;if(balls){connectors=new T.InstancedMesh(new T.CylinderGeometry(.13,.13,drop,3),metal,columns);connectors.frustumCulled=false;root.add(connectors);}
    chain.push({instanced,connectors,columns,count,step,balls});
  }
  const dummy=new T.Object3D();let chainPlaced=false;
  function update(open,layerOpen){
    const spans=panelSpans(route.length,state.draw,open),second=panelSpans(route.length,state.draw,layerOpen);
    for(const item of meshes){const s=(item.layerIndex?second:spans)[item.panel],folds=Math.max(10,Math.round(s.full/(state.heading==='pencil'?7:16))),section=foldSection(s.span,s.cloth,folds,cols);
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const k=(j*(cols+1)+i)*3,at=route.at(s.start+section[i][0]);const ripple=section[i][1]+Math.sin(i*.13+j*.6)*.22*j/rows,offset=ripple+item.layerIndex*16;
        item.p[k]=at.x+at.nx*offset;item.p[k+1]=top-j/rows*drop+.25*Math.sin(i*.22)*j/rows;item.p[k+2]=at.z+at.nz*offset;}
      item.g.attributes.position.needsUpdate=true;item.g.computeVertexNormals();
    }
    // Until a movable chain assembly is confirmed, chain stays fixed. Only the
    // independent fabric/voile layer moves; no invented folding metallic sheet.
    if(!chainPlaced)for(const {instanced,connectors,columns,count,step,balls}of chain){
      for(let i=0;i<columns;i++){const at=route.at((i+.5)/columns*route.length),offset=state.material==='mixed'?-17:0;
        if(connectors){dummy.position.set(at.x+at.nx*offset,top-drop/2,at.z+at.nz*offset);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();connectors.setMatrixAt(i,dummy.matrix);}
        for(let j=0;j<count;j++){dummy.position.set(at.x+at.nx*offset,top-(j+.5)*step,at.z+at.nz*offset);dummy.rotation.set(0,balls?0:j%2*Math.PI/2,0);dummy.scale.set(1,balls?1:1.7,1);dummy.updateMatrix();instanced.setMatrixAt(i*count+j,dummy.matrix);}}
      instanced.instanceMatrix.needsUpdate=true;if(connectors)connectors.instanceMatrix.needsUpdate=true;
    }chainPlaced=true;
  }
  update(state.open,state.layer);
  return{root,route,update,metrics:{clothPanels:meshes.length,chainElements:chain.reduce((s,c)=>s+c.columns*c.count,0),chainMovement:'fixed'},dispose(){root.removeFromParent();const gs=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);});gs.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());}};
}
