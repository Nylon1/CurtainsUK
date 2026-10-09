/** Experimental material presentation only. No geometry, artwork or repeat edits. */
export function createFabricDetail({T,scene,renderer,proof}){
  const enabled=new URLSearchParams(location.search).get('fabricDetail')!=='previous';
  const installed=new WeakMap(),filtered=new WeakSet();
  let activeRoot,cloth;
  function install(material){
    const uniforms={fabricCmScale:{value:new T.Vector2(1,1)},fabricMipBias:{value:-.3},fabricCavity:{value:.22}};
    const originalCompile=material.onBeforeCompile,originalKey=material.customProgramCacheKey();
    // The original 64px nearest-filtered bump aliases at room distance. The
    // analytical replacement below averages away when yarns become subpixel.
    material.bumpMap=null;
    material.roughness=.94;
    if(material.isMeshPhysicalMaterial){material.sheen=.12;material.sheenColor.set('#ffffff');material.sheenRoughness=1;}
    material.onBeforeCompile=function(shader,webglRenderer){
      originalCompile.call(this,shader,webglRenderer); // Retain approved hem/tape shading.
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='uniform vec2 fabricCmScale;\nvarying vec3 fabricSurface;\n'+shader.vertexShader.replace('#include <uv_vertex>',
        '#include <uv_vertex>\nfabricSurface=vec3(uv*fabricCmScale,position.z);');
      shader.fragmentShader='uniform float fabricMipBias;\nuniform float fabricCavity;\nvarying vec3 fabricSurface;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vMapUv, fabricMipBias )'));
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        // Generic sub-millimetre cloth finish in physical material coordinates.
        // The derivative filter prevents a false coarse weave or moving moire.
        vec2 clothDx=dFdx(fabricSurface.xy),clothDy=dFdy(fabricSurface.xy);
        float yarnVisibility=1.0-smoothstep(.012,.04,max(length(clothDx),length(clothDy)));
        vec2 yarnPhase=fabricSurface.xy*114.2397329;
        vec2 yarnGradient=.0457*vec2(cos(yarnPhase.x)*sin(yarnPhase.y),sin(yarnPhase.x)*cos(yarnPhase.y))*yarnVisibility;
        vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
        vec3 yarnR1=cross(surfaceDy,normal),yarnR2=cross(normal,surfaceDx);
        float yarnDet=dot(surfaceDx,yarnR1)*faceDirection;
        vec3 yarnGrad=sign(yarnDet)*(dot(yarnGradient,clothDx)*yarnR1+dot(yarnGradient,clothDy)*yarnR2);
        normal=normalize(abs(yarnDet)*normal-yarnGrad);
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
        // Bounded approximation of reduced room bounce inside the real folds.
        // Applied to indirect diffuse light only, never to the source artwork.
        float foldCavity=1.0-smoothstep(-8.0,8.0,fabricSurface.z);
        reflectedLight.indirectDiffuse*=1.0-fabricCavity*foldCavity;
      `);
    };
    material.customProgramCacheKey=()=>originalKey+'|room-fabric-detail-v1';
    material.needsUpdate=true;
    material.userData.fabricDetail=uniforms;
    installed.set(material,uniforms);
    return uniforms;
  }
  return{update(fixed140){
    if(!enabled)return;
    const root=scene.getObjectByName(fixed140?'FIXED140_SINGLE_WIDTH_V1':'APPROVED_WAVE_CURTAIN');
    if(root!==activeRoot){activeRoot=root;cloth=root?.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000);}
    if(!cloth)return;
    const material=cloth.material,uniforms=installed.get(material)||install(material);
    const cm=fixed140?proof.curtain?.plan?.sourcePhysicalCm:[1,1];
    if(cm)uniforms.fabricCmScale.value.fromArray(cm);
    const map=material.map;
    if(map&&!filtered.has(map)){
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      map.needsUpdate=true;filtered.add(map);
    }
    proof.fabricDetail={version:1,profile:fixed140?'FIXED140':'STANDARD',anisotropy:map?.anisotropy,mipBias:uniforms.fabricMipBias.value,cavity:uniforms.fabricCavity.value,physicalWeaveCoordinates:uniforms.fabricCmScale.value.toArray(),sameMaterialInAllViews:true};
  }};
}
