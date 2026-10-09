import * as T from 'three';
import {RENDERER_PROFILE,buildFixed140Mesh,imageUV,meshMetrics,sourcePlan} from './fixed140_single_width_v1.mjs';

/** The sole V1 mesh and texture. Camera changes never call this factory again. */
export async function createFixed140Curtain(renderer,assignment){
  if(assignment?.rendererProfile!==RENDERER_PROFILE)throw Error('FIXED140_PROFILE_NOT_ASSIGNED');
  const {usableWidthCm,sourceWidthPx,sourceHeightPx,sourceImage}=assignment;
  const plan=sourcePlan(sourceWidthPx,sourceHeightPx,usableWidthCm);
  if(!plan.dropCovered)throw Error('FIXED140_SOURCE_TOO_SHORT');
  const texture=await new T.TextureLoader().loadAsync(sourceImage);
  if(texture.image.width!==sourceWidthPx||texture.image.height!==sourceHeightPx){texture.dispose();throw Error('FIXED140_SOURCE_DIMENSIONS_CHANGED');}
  texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const mesh=buildFixed140Mesh(usableWidthCm);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(mesh.position,3));
  geometry.setAttribute('uv',new T.BufferAttribute(imageUV(mesh,sourceWidthPx,sourceHeightPx),2));
  geometry.setIndex(new T.BufferAttribute(mesh.indices,1));
  geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({map:texture,roughness:.88,side:T.DoubleSide});
  const curtain=new T.Mesh(geometry,material);
  curtain.name=RENDERER_PROFILE;
  curtain.castShadow=curtain.receiveShadow=true;
  return {curtain,geometry,texture,plan,metrics:meshMetrics(mesh),dispose(){geometry.dispose();material.dispose();texture.dispose();}};
}
