import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {Rod} from './primitives.jsx';

export function useReturnMetalMaterials(materials) {
 const finishes=useMemo(()=>{
  const face=materials.chrome.clone();face.color.set('#62594d');face.metalness=.90;face.roughness=.30;face.envMapIntensity=.80;face.side=THREE.DoubleSide;
  const recess=materials.chrome.clone();recess.color.set('#25211d');recess.metalness=.65;recess.roughness=.42;recess.envMapIntensity=.50;
  return {face,recess};
 },[materials.chrome]);
 useEffect(()=>()=>{finishes.face.dispose();finishes.recess.dispose();},[finishes]);
 return finishes;
}

/** Formed metal face: rounded shoulders flank a shallow concave center. */
export function RolledReturnFace({width,height=.46,material,chrome,...props}) {
 const geometry=useMemo(()=>{
  const h=height/2,s=new THREE.Shape(),p=(z,y)=>[-z,y];
  s.moveTo(...p(-.025,h));s.quadraticCurveTo(...p(.045,h),...p(.045,h-.065));
  s.bezierCurveTo(...p(.045,h-.14),...p(.012,h-.12),...p(.012,0));
  s.bezierCurveTo(...p(.012,-h+.12),...p(.045,-h+.14),...p(.045,-h+.065));
  s.quadraticCurveTo(...p(.045,-h),...p(-.025,-h));s.lineTo(...p(-.045,-h));s.lineTo(...p(-.045,h));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:false,curveSegments:12});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return g;
 },[width,height]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group {...props}><mesh geometry={geometry} material={material} castShadow receiveShadow/>
  {[-1,1].map(side=><Rod key={side} from={[-width/2,side*(height/2-.013),.022]} to={[width/2,side*(height/2-.013),.022]} radius={.012} material={chrome}/>)}
 </group>;
}
