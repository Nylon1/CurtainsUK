/** Original deterministic flame field on crossed depth layers; no image/video or AI artwork. */
export function createFire(T){
  const root=new T.Group(),uniforms={time:{value:0},strength:{value:0}};
  const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.NormalBlending,toneMapped:true,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float time;uniform float strength;uniform float phase;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float n=0.;float a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return n;}
      void main(){vec2 p=vUv;float y=p.y;float drift=fbm(vec2(p.x*7.+phase,y*4.-time*1.5));
        float tongues=sin(p.x*39.+drift*5.+sin(time*.8+p.x*8.)*.8)*.5+.5;
        float height=.15+.57*fbm(vec2(p.x*13.+phase,time*.25))+tongues*.18;
        float field=height-y + (fbm(vec2(p.x*24.+drift*2.,y*11.-time*3.))- .5)*.22;
        float flame=smoothstep(-.035,.075,field)*smoothstep(0.,.05,y)*smoothstep(0.,.06,p.x)*smoothstep(0.,.06,1.-p.x);
        flame*=smoothstep(1.,.55,y);float core=clamp((height-y)*3.,0.,1.);
        vec3 colour=mix(vec3(1.6,.17,.015),vec3(3.1,2.2,.85),core);
        gl_FragColor=vec4(colour,flame*strength*.62);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  for(let i=0;i<3;i++){
    const layer=material.clone();layer.uniforms={time:uniforms.time,strength:uniforms.strength,phase:{value:i*13.71}};const mesh=new T.Mesh(new T.PlaneGeometry(94,46,1,1),layer);mesh.userData.flame=true;mesh.visible=false;
    mesh.position.set((i-1)*1.8,115,-5-i*3.5);mesh.rotation.y=(i-1)*.12;root.add(mesh);
  }
  material.dispose();
  const emberMaterial=new T.MeshStandardMaterial({color:'#1d100c',roughness:.95,emissive:'#e84008',emissiveIntensity:0});
  const embers=new T.InstancedMesh(new T.SphereGeometry(1,7,5),emberMaterial,64),dummy=new T.Object3D();
  for(let i=0;i<64;i++){dummy.position.set(-44+(i%16)*5.7,92+Math.sin(i*5.1)*1.1,-6-Math.floor(i/16)*3.5);dummy.scale.set(2.1,1.2,1.6);dummy.updateMatrix();embers.setMatrixAt(i,dummy.matrix);}root.add(embers);
  const light=new T.PointLight('#ff9a4b',0,260,2);light.position.set(0,112,12);root.add(light);
  return {root,prime(on){root.children.forEach(o=>{if(o.userData.flame)o.visible=on;});},update(seconds,on,reduced){uniforms.time.value=reduced?3.7:seconds;uniforms.strength.value=on?1:0;root.children.forEach(o=>{if(o.userData.flame)o.visible=on;});const flicker=reduced?1:1+.035*Math.sin(seconds*7.3)+.022*Math.sin(seconds*11.1);light.intensity=on?17000*flicker:0;emberMaterial.emissiveIntensity=on?1.6*flicker:0;}};
}
