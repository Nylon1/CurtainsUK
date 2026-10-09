import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
// Seeded kernel/noise makes this review's contact shading repeatable.
class FixedAO extends SSAOPass {
  _generateSampleKernel(count){let seed=431;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);for(let i=0;i<count;i++)this.kernel.push(new T.Vector3(random()*2-1,random()*2-1,random()).normalize().multiplyScalar(.1+.9*(i/count)**2));}
  _generateRandomKernelRotations(){const data=new Float32Array(16);for(let i=0;i<16;i++)data[i]=Math.sin(i*12.9898+7.1);this.noiseTexture=new T.DataTexture(data,4,4,T.RedFormat,T.FloatType);this.noiseTexture.wrapS=this.noiseTexture.wrapT=T.RepeatWrapping;this.noiseTexture.needsUpdate=true;}
}
export function createLightingPipeline(renderer,scene,camera){
  // Capability fallback retains the same materials, daylight and contact planes.
  const enabled=!!renderer.getContext().getExtension('EXT_color_buffer_float');
  let composer,ao,fxaa,width=0,height=0;
  if(enabled){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new FixedAO(scene,camera,512,320,8);ao.kernelRadius=5;ao.minDistance=.00015;ao.maxDistance=.018;ao.normalMaterial.side=T.DoubleSide;composer.addPass(ao);composer.addPass(new OutputPass());const fabricShader={...FXAAShader,fragmentShader:FXAAShader.fragmentShader.replace('float _SubpixelBlending = 1.0;','float _SubpixelBlending = 0.45;')};fxaa=new ShaderPass(fabricShader);composer.addPass(fxaa);}
  return {enabled,render(w,h){if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);composer?.setSize(w,h);if(fxaa)fxaa.uniforms.resolution.value.set(1/(w*renderer.getPixelRatio()),1/(h*renderer.getPixelRatio()));}if(ao){ao.setSize(Math.max(1,Math.floor(w*renderer.getPixelRatio()*.5)),Math.max(1,Math.floor(h*renderer.getPixelRatio()*.5)));composer.render();}else renderer.render(scene,camera);},estimateBytes(){const pixels=width*height*renderer.getPixelRatio()**2;return enabled?Math.round(pixels*(2*12+.25*(12+4+4))):0;}};
}
