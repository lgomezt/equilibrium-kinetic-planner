import React,{Component,useLayoutEffect,useMemo} from 'react';
import {useLoader,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';

// Offline first-bounce capture of the fixed cabinet, excluding moving parts
// and transmissive covers. Already filtered: never PMREM or capture at runtime.
const PROBE_URL=`${import.meta.env.BASE_URL}reflections/cabinet-interior.hdr`;
const BOX_MIN=new THREE.Vector3(-9.5,-3.5,-10);
const BOX_MAX=new THREE.Vector3(9.5,8,14);
const CAPTURE_CENTER=new THREE.Vector3(0,3.2,1);
const PROJECTION_GLSL=`
varying vec3 vCabinetReflectionWorld;
uniform mat4 reflectionWorldToCabinet;
uniform mat4 reflectionCabinetToWorld;
uniform vec3 reflectionCenter;
uniform vec3 reflectionBoxMin;
uniform vec3 reflectionBoxMax;
vec3 cabinetReflectionDirection(vec3 worldDirection) {
 vec3 p=(reflectionWorldToCabinet*vec4(vCabinetReflectionWorld,1.)).xyz;
 if(any(lessThan(p,reflectionBoxMin))||any(greaterThan(p,reflectionBoxMax)))return worldDirection;
 vec3 d=normalize(mat3(reflectionWorldToCabinet)*worldDirection);
 vec3 safeD=mix(vec3(-1.),vec3(1.),step(vec3(0.),d))*max(abs(d),vec3(.00001));
 vec3 intersections=max((reflectionBoxMax-p)/safeD,(reflectionBoxMin-p)/safeD);
 float distanceToBox=min(intersections.x,min(intersections.y,intersections.z));
 return normalize(mat3(reflectionCabinetToWorld)*normalize(p+d*distanceToBox-reflectionCenter));
}
`;

// A missing optional reflection asset retains the original studio response.
// Successful loads suspend the existing scene/readiness boundary until ready.
class ReflectionBoundary extends Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?null:this.props.children;}
}

function LoadedCabinetReflections({materials}) {
 const source=useLoader(HDRLoader,PROBE_URL);
 const {scene,invalidate}=useThree();
 const texture=useMemo(()=>{
  const map=source.clone();
  map.mapping=THREE.CubeUVReflectionMapping;
  map.colorSpace=THREE.LinearSRGBColorSpace;
  // The file preserves raw render-target rows, unlike a photographic HDR.
  map.flipY=false;map.minFilter=map.magFilter=THREE.LinearFilter;
  map.generateMipmaps=false;map.needsUpdate=true;return map;
 },[source]);
 useLayoutEffect(()=>{
  const machine=scene.getObjectByName('equilibrium-pinball-machine');
  if(!machine)return()=>texture.dispose();
  scene.updateMatrixWorld(true);
  const toWorld=machine.matrixWorld.clone(),toCabinet=toWorld.clone().invert();
  const fuel=new Set();
  // StaticBatch retains the authored pocket tree; its materials are shared
  // with the rendered batch. Keep those spheres on their broad studio map.
  scene.getObjectByName('mounted-fuel-and-evidence-pocket')?.traverse(object=>{
   if(object.geometry?.type==='SphereGeometry'&&object.geometry.parameters.radius===.30&&object.material?.metalness>.9)fuel.add(object.material);
  });
  const rails=new Set([materials.channel,materials.railWall,materials.brushed]);
  const targets=new Set(rails),originals=new Map();
  scene.traverseVisible(object=>{
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    // The recessed trough keeps the broad studio reflection; the captured
    // cabinet map remains on its walls and rolled metal edges.
    if(material?.metalness>=.6&&!material.transparent&&!fuel.has(material)&&material!==materials.railBed)targets.add(material);
   }
  });
  for(const material of targets){
   // Resolve the old key before replacing the hook: Three's default key is
   // itself derived from onBeforeCompile. Custom emissive finishes keep it.
   const originalKey=material.customProgramCacheKey.call(material);
   const original={envMap:material.envMap,envMapIntensity:material.envMapIntensity,onBeforeCompile:material.onBeforeCompile,customProgramCacheKey:material.customProgramCacheKey};
   originals.set(material,original);
   material.envMap=texture;
   material.envMapIntensity=original.envMapIntensity*(rails.has(material)?1.45:1);
   material.onBeforeCompile=function(shader,renderer){
    original.onBeforeCompile.call(this,shader,renderer);
    Object.assign(shader.uniforms,{
     reflectionWorldToCabinet:{value:toCabinet},reflectionCabinetToWorld:{value:toWorld},
     reflectionCenter:{value:CAPTURE_CENTER},reflectionBoxMin:{value:BOX_MIN},reflectionBoxMax:{value:BOX_MAX},
    });
    shader.vertexShader='varying vec3 vCabinetReflectionWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCabinetReflectionWorld=worldPosition.xyz;');
    shader.fragmentShader=PROJECTION_GLSL+shader.fragmentShader;
    const env=THREE.ShaderChunk.envmap_physical_pars_fragment.replace('envMapRotation * reflectVec, roughness','envMapRotation * cabinetReflectionDirection( reflectVec ), roughness');
    shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',env);
   };
   material.customProgramCacheKey=()=>`${originalKey}|cabinet-box-projection-v1`;
   material.needsUpdate=true;
  }
  invalidate();
  return()=>{
   for(const[material,original]of originals){Object.assign(material,original);material.needsUpdate=true;}
   texture.dispose();
  };
 },[scene,materials,texture,invalidate]);
 return null;
}

export default function CabinetReflections({materials}) {
 return <ReflectionBoundary><LoadedCabinetReflections materials={materials}/></ReflectionBoundary>;
}
