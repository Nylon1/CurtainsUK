/** Local presentation hook; the approved lighting module stays byte-identical. */
export function instrumentFabricLighting(source){
  const needle='fxaa=new ShaderPass(FXAAShader);';
  if(source.split(needle).length!==2)throw Error('FABRIC_LIGHTING_BRIDGE_DRIFT');
  return source.replace(needle,`const fabricParams=new URLSearchParams(location.search);
    const retainFXAA=fabricParams.get('fabricDetail')==='previous'||['baseline','before','review'].includes(fabricParams.get('mode'));
    const fabricShader={...FXAAShader,fragmentShader:FXAAShader.fragmentShader.replace('float _SubpixelBlending = 1.0;','float _SubpixelBlending = 0.45;')};
    fxaa=new ShaderPass(retainFXAA?FXAAShader:fabricShader);`);
}
