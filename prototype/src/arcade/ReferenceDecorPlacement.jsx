import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {Screw,Tube} from './primitives.jsx';

// Native reference top-face corners, inverse-projected with the locked camera.
// The .398-deep casting rests on the playfield; the luminous inset is physical.
const WARNINGS=[
 {position:[-7.9389044053316695,.082,4.0175716819265785],points:[[-.22311222873478975,.7553890540887278],[-.24270229043485791,-.6663319871270756],[.46581451916964944,-.08905706696165261]]},
 {position:[8.128301845718054,.082,3.9698494856968547],points:[[.3460162931075228,.8319239587280935],[-.5104663607949123,-.13677926319137823],[.16445006768739034,-.6951446955367149]]},
];
function casting(points,depth,bevel){
 const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 return new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:bevel*.5,bevelSize:bevel,bevelSegments:3});
}
export function LowerWarningWedges({materials,jewel,halo}){
 const parts=useMemo(()=>WARNINGS.map(({points})=>({body:casting(points,.398,.032),rim:casting(points.map(([x,y])=>[x*.96,y*.96]),.020,.012),red:casting(points.map(([x,y])=>[x*.75,y*.75]),.018,.025)})),[]);
 useEffect(()=>()=>parts.forEach(part=>Object.values(part).forEach(g=>g.dispose())),[parts]);
 return <group name="measured-lower-warning-castings">{WARNINGS.map(({position,points},i)=><group key={i} position={position} rotation={[-Math.PI/2,0,0]}>
  <mesh geometry={parts[i].body} material={materials.brushed} castShadow receiveShadow/>
  <mesh geometry={parts[i].rim} position={[0,0,.394]} material={materials.gold} castShadow receiveShadow/>
  <mesh geometry={parts[i].red} position={[0,0,.421]} material={materials.red} castShadow receiveShadow/>
  <mesh geometry={parts[i].red} position={[0,0,.445]} scale={[.20,.20,.65]} material={jewel}/>
  <mesh position={[0,0,.469]} material={materials.bulb??materials.amber}><sphereGeometry args={[.064,16,12]}/></mesh>
  <mesh position={[0,0,.505]} material={halo} renderOrder={1}><planeGeometry args={[.72,.72]}/></mesh>
  {points.map(([x,y],n)=><group key={n} position={[x*.84,y*.84,.425]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={.35} materials={materials}/></group>)}
 </group>)}</group>;
}

export function MeasuredSaturnPedestal({materials,planet,halo}){
 const base=new THREE.Vector3(-7.6998667078585195,.082,2.528815337571142);
 const globe=new THREE.Vector3(-7.316397139423598,1.25,1.9894905998649577);
 const neckStart=base.clone().add(new THREE.Vector3(.10,.30,-.10));
 const neckEnd=globe.clone().add(new THREE.Vector3(0,-.258,0));
 const direction=neckEnd.clone().sub(neckStart),length=direction.length();
 const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
 const stem=useMemo(()=>new THREE.LatheGeometry([[.30,0],[.30,.04],[.235,.10],[.205,length-.10],[.25,length-.04],[.28,length]].map(p=>new THREE.Vector2(...p)),48),[length]);
 const orbit=useMemo(()=>new THREE.CatmullRomCurve3(Array.from({length:64},(_,i)=>{
  const a=i*Math.PI/32;return globe.clone().add(new THREE.Vector3(Math.cos(a)*.49,-.18-Math.cos(a)*.10+Math.sin(a)*.06,.05+Math.sin(a)*.295));
 }),true),[]);
 useEffect(()=>()=>stem.dispose(),[stem]);
 return <group name="red-saturn-bolted-pedestal-bumper">
  <group position={base}>
   <mesh position={[0,.15,0]} material={materials.brushed} castShadow receiveShadow><cylinderGeometry args={[.68,.68,.30,64]}/></mesh>
   <mesh position={[0,.309,0]} material={materials.chrome} castShadow receiveShadow><cylinderGeometry args={[.675,.675,.035,64]}/></mesh>
   <mesh position={[.10,.339,-.10]} material={materials.gold} castShadow><cylinderGeometry args={[.43,.45,.055,48]}/></mesh>
   {Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <Screw key={i} position={[Math.cos(a)*.57,.342,Math.sin(a)*.57]} scale={.55} materials={materials}/>;})}
  </group>
  <group position={neckStart} quaternion={quaternion}>
   <mesh geometry={stem} material={materials.gold} castShadow receiveShadow/>
   <mesh position={[0,length*.28,0]} rotation={[Math.PI/2,0,0]} material={materials.chrome}><torusGeometry args={[.23,.022,10,48]}/></mesh>
   <mesh position={[0,length-.065,0]} rotation={[Math.PI/2,0,0]} material={materials.gold}><torusGeometry args={[.25,.029,10,48]}/></mesh>
  </group>
  <mesh position={globe} material={planet} castShadow receiveShadow><sphereGeometry args={[.28,48,32]}/></mesh>
  <Tube curve={orbit} radius={.028} material={materials.gold} segments={96}/>
  <mesh position={[globe.x,globe.y-.27,globe.z]} rotation={[-Math.PI/2,0,0]} material={halo} renderOrder={1}><planeGeometry args={[1.05,1.05]}/></mesh>
 </group>;
}
