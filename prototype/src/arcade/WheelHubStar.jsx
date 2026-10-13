import React,{useEffect,useMemo} from 'react';
import {EightPointStar} from './primitives.jsx';

/** Existing physical star, finished as a warm luminous hub badge. */
export function WheelHubStar({materials}) {
 const {star,halo}=useMemo(()=>{
  const star=materials.gold.clone();
  star.name='wheel-hub-radiant-gold';
  star.color.set('#e4a42d');star.roughness=.23;star.metalness=.72;
  star.emissive.set('#ffbc26');star.emissiveIntensity=.5;
  // Extrude face UVs retain the star-local XY coordinates through StaticBatch.
  star.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vHubStarPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHubStarPosition=uv;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vHubStarPosition;').replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float hubRadius=length(vHubStarPosition);
    float hubCore=1.0-smoothstep(0.025,0.16,hubRadius);
    float hubRay=1.0-smoothstep(0.10,0.46,hubRadius);
    totalEmissiveRadiance=mix(vec3(0.40,0.115,0.008),vec3(1.45,0.83,0.055),hubRay);
    totalEmissiveRadiance=mix(totalEmissiveRadiance,vec3(4.8,4.1,1.45),hubCore);
   `);
  };
  star.customProgramCacheKey=()=> 'wheel-hub-radial-gold-v1';
  const halo=materials.bulbHalo.clone();
  halo.name='wheel-hub-star-halo';halo.opacity=.33;
  halo.depthTest=true;halo.depthWrite=false;
  return {star,halo};
 },[materials.gold,materials.bulbHalo]);
 useEffect(()=>()=>{star.dispose();halo.dispose();},[star,halo]);
 return <group name="radiant-wheel-hub-star">
  <EightPointStar radius={.43} depth={.035} position={[0,0,.16]} material={star}/>
  <mesh position={[0,0,.215]} material={materials.amber}><sphereGeometry args={[.047,16,12]}/></mesh>
  <mesh position={[0,0,.205]} material={halo} renderOrder={3}><planeGeometry args={[1.02,1.02]}/></mesh>
 </group>;
}
