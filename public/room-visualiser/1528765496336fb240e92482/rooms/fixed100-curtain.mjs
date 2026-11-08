import * as T from 'three';
import {buildFixed140Mesh,imageUV,meshMetrics,sourcePlan} from './fixed100-core.mjs';
const RENDERER_PROFILE='FIXED140_SINGLE_WIDTH_100CM_V1';

/** The sole V1 mesh and texture. Camera changes never call this factory again. */
export async function createFixed140Curtain(renderer,assignment){
  if(assignment?.rendererProfile!==RENDERER_PROFILE)throw Error('FIXED140_PROFILE_NOT_ASSIGNED');
  const {usableWidthCm,sourceWidthPx,sourceHeightPx,sourceTopPx,sourceImage}=assignment;
  const plan=sourcePlan(sourceWidthPx,sourceHeightPx,usableWidthCm,sourceTopPx);
  if(!plan.dropCovered)throw Error('FIXED140_SOURCE_TOO_SHORT');
  const texture=await new T.TextureLoader().loadAsync(sourceImage);
  if(texture.image.width!==sourceWidthPx||texture.image.height!==sourceHeightPx){texture.dispose();throw Error('FIXED140_SOURCE_DIMENSIONS_CHANGED');}
  texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const mesh=buildFixed140Mesh(usableWidthCm);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(mesh.position,3));
  geometry.setAttribute('uv',new T.BufferAttribute(imageUV(mesh,sourceWidthPx,sourceHeightPx,sourceTopPx),2));
  geometry.setIndex(new T.BufferAttribute(mesh.indices,1));
  geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({map:texture,roughness:.88,side:T.DoubleSide});
  const curtain=new T.Mesh(geometry,material);
  curtain.name=RENDERER_PROFILE;
  curtain.castShadow=curtain.receiveShadow=true;
  return {curtain,geometry,texture,plan,metrics:meshMetrics(mesh),dispose(){geometry.dispose();material.dispose();texture.dispose();}};
}
