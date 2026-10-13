import React,{useEffect,useMemo,useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';

const CAPACITY=256;
const PROFILES={
 'warm-backglass-lamp-trim':{kind:'header',diameter:.66,lift:.115,gain:1.35},
 'warm-chrome-channel-lamps':{kind:'rail',diameter:.46,lift:.055,gain:1.10},
 'inset-oval-walnut-lamp':{kind:'case',diameter:.54,lift:.055,gain:.48},
 'ruby-strip-round-lamp':{kind:'case',diameter:.54,lift:.060,gain:.55},
 'fixed-oval-wheel-housing':{kind:'wheel',diameter:.44,lift:.050,gain:.85},
 'short-cast-gold-jewel-neck':{kind:'stem',diameter:.44,lift:.060,gain:1.20},
};

// Collect authored lens centers, including sources retained by static batching.
// Only these fixed lamp assemblies qualify; marbles, jewels and stars do not.
export function collectLampAureoles(root,materials) {
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),result=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.geometry?.type!=='SphereGeometry'
   ||(mesh.material!==materials.amber&&mesh.material!==materials.bulb))return;
  let profile;
  for(let node=mesh.parent;node&&node!==root;node=node.parent){
   if(node.userData.movingPart)return;
   if(!profile&&PROFILES[node.name])profile=PROFILES[node.name];
  }
  if(!profile)return;
  const count=mesh.isInstancedMesh?mesh.count:1,instance=new THREE.Matrix4();
  for(let index=0;index<count;index++){
   if(mesh.isInstancedMesh)mesh.getMatrixAt(index,instance);else instance.identity();
   const transform=inverse.clone().multiply(mesh.matrixWorld).multiply(instance);
   result.push({...profile,position:new THREE.Vector3().setFromMatrixPosition(transform),source:mesh,instance:index});
  }
 });
 return result;
}

export function createLampAureoleMaterial() {
 return new THREE.ShaderMaterial({
  name:'warm-depth-tested-lamp-aureoles',transparent:true,depthTest:true,depthWrite:false,
  toneMapped:false,blending:THREE.AdditiveBlending,
  uniforms:{warmCore:{value:new THREE.Color('#fff2b1')},warmEdge:{value:new THREE.Color('#ff9c1b')}},
  vertexShader:`
   attribute vec2 haloParams;
   varying vec2 vHaloUv;
   varying float vHaloGain;
   void main(){
    vHaloUv=uv;vHaloGain=haloParams.y;
    vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
    // View-space corners stay round without camera updates or CPU frame work.
    float sourceDepth=center.z;
    center.z+=haloParams.x;
    center.xy*=center.z/sourceDepth;
    center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
    gl_Position=projectionMatrix*center;
   }`,
  fragmentShader:`
   uniform vec3 warmCore;
   uniform vec3 warmEdge;
   varying vec2 vHaloUv;
   varying float vHaloGain;
   void main(){
    float r=length(vHaloUv*2.-1.);
    if(r>=1.)discard;
    float falloff=(.80*exp(-2.*r*r)+.20*exp(-14.*r*r))*(1.-smoothstep(.72,1.,r));
    vec3 warmth=mix(warmCore,warmEdge,smoothstep(.06,.65,r));
    gl_FragColor=vec4(warmth,falloff*vHaloGain);
    #include <colorspace_fragment>
   }`,
 });
}

export default function WarmLampAureoles({rootRef,materials}) {
 const mesh=useRef(),invalidate=useThree(state=>state.invalidate);
 const geometry=useMemo(()=>{
  const g=new THREE.PlaneGeometry(1,1);
  g.setAttribute('haloParams',new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*2),2));
  return g;
 },[]);
 const material=useMemo(createLampAureoleMaterial,[]);
 // Lamp instance transforms are populated in earlier sibling effects. Read
 // them after those effects, then request a frame for the completed halo batch.
 useEffect(()=>{
  if(!rootRef.current||!mesh.current)return;
  const lamps=collectLampAureoles(rootRef.current,materials);
  if(lamps.length>CAPACITY)throw new Error('Lamp aureole capacity exceeded');
  const matrix=new THREE.Matrix4(),orientation=new THREE.Quaternion(),scale=new THREE.Vector3();
  lamps.forEach((lamp,index)=>{
   scale.set(lamp.diameter,lamp.diameter,1);
   matrix.compose(lamp.position,orientation,scale);mesh.current.setMatrixAt(index,matrix);
   geometry.attributes.haloParams.setXY(index,lamp.lift,lamp.gain);
  });
  mesh.current.count=lamps.length;
  mesh.current.instanceMatrix.needsUpdate=true;geometry.attributes.haloParams.needsUpdate=true;
  invalidate();
 },[rootRef,materials,geometry,invalidate]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 return <instancedMesh ref={mesh} name="camera-facing-warm-lamp-aureoles" args={[geometry,material,CAPACITY]} count={0} frustumCulled={false} renderOrder={4} raycast={()=>null}/>;
}
