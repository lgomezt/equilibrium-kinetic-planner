import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {Rod,Screw,Tube} from './primitives.jsx';

// These cast insets fill the same physical back and foreground apertures as
// the reference. They live in cabinet coordinates, below the moving hardware.
const rearPanels=[
 {name:'left-burgundy-rear-inset',height:.17,points:[[-11.348042,25.800279],[-4.049068,25.800279],[-3.794675,20.818876],[-10.133514,20.45446]]},
 {name:'recessed-black-backglass-panel',height:.20,points:[[-4.070910,25.722848],[5.150964,25.722848],[4.682830,20.265984],[-3.732260,20.265984]],black:true},
 {name:'right-burgundy-rear-inset',height:.17,points:[[5.160184,25.800279],[12.316599,25.800279],[11.103402,20.394172],[4.785316,20.818876]]},
];
const warnings=[
 {name:'left-foreground-ruby-casting',height:-.45,points:[[-8.223720,-8.849994],[-6.822117,-9.554705],[-7.790707,-9.987687]],bulb:[-7.437526,-9.566199]},
 {name:'right-foreground-ruby-casting',height:-.48,points:[[2.962652,-10.572611],[4.833665,-9.892075],[4.758021,-11.024312]],bulb:[4.187204,-10.543151]},
];
function roundedOutline(points,radius=.06){
 const shape=new THREE.Shape();
 const ends=points.map((point,i)=>{
  const a=new THREE.Vector2(...points[(i+points.length-1)%points.length]),b=new THREE.Vector2(...point),c=new THREE.Vector2(...points[(i+1)%points.length]);
  return {b,entry:b.clone().addScaledVector(a.sub(b).normalize(),radius),exit:b.clone().addScaledVector(c.sub(b).normalize(),radius)};
 });
 shape.moveTo(ends[0].entry.x,ends[0].entry.y);
 ends.forEach(({b,entry,exit},i)=>{if(i)shape.lineTo(entry.x,entry.y);shape.quadraticCurveTo(b.x,b.y,exit.x,exit.y)});
 shape.closePath();return shape;
}
function CastInset({definition,materials,warning=false,finish}){
 const parts=useMemo(()=>{
  const center=definition.points.reduce((sum,p)=>sum.add(new THREE.Vector2(...p)),new THREE.Vector2()).multiplyScalar(1/definition.points.length);
  const inset=definition.points.map(p=>new THREE.Vector2(...p).sub(center).multiplyScalar(warning?.80:.96).add(center).toArray());
  const back=roundedOutline(definition.points,warning?.12:.09),face=roundedOutline(inset,warning?.09:.08);
  const extrusion=(shape,depth,bevel)=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel*.6,bevelSegments:3,curveSegments:12});
  const outline=new THREE.CatmullRomCurve3(back.getSpacedPoints(80).slice(0,-1).map(p=>new THREE.Vector3(p.x,p.y,.075)),true);
  return {back:extrusion(back,.065,.025),face:extrusion(face,.035,.018),outline,center,inset};
 },[definition,warning]);
 useEffect(()=>()=>{parts.back.dispose();parts.face.dispose();},[parts]);
 return <group name={definition.name} position={[0,definition.height,0]} rotation={[-Math.PI/2,0,0]}>
  <mesh geometry={parts.back} material={warning?materials.bronze:materials.wood} castShadow receiveShadow/>
  <mesh geometry={parts.face} position={[0,0,.09]} material={finish} castShadow receiveShadow/>
  <Tube curve={parts.outline} radius={warning?.025:.021} material={warning?materials.chrome:materials.bronze} segments={100}/>
  {definition.points.map((p,i)=>{
   const x=parts.center.x+(p[0]-parts.center.x)*.80,y=parts.center.y+(p[1]-parts.center.y)*.80;
   return <group key={i} position={[x,y,.14]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={warning?.70:.95} materials={materials}/></group>;
  })}
  {warning&&<>
   <mesh position={[...definition.bulb,.148]} material={materials.gold}><torusGeometry args={[.103,.022,10,24]}/></mesh>
   <mesh position={[...definition.bulb,.177]} material={materials.amber}><sphereGeometry args={[.092,20,12]}/></mesh>
   <mesh position={[...definition.bulb,.23]} material={materials.bulbHalo} renderOrder={2}><planeGeometry args={[.98,.98]}/></mesh>
  </>}
 </group>;
}
export default function ReferenceCaseDetails({materials}){
 const finishes=useMemo(()=>{
  const burgundy=materials.red.clone();burgundy.color.set('#4f0b12');burgundy.roughness=.40;burgundy.clearcoat=.22;
  const black=materials.navy.clone();black.color.set('#080a0c');black.roughness=.5;
  return {burgundy,black};
 },[materials.red,materials.navy]);
 useEffect(()=>()=>Object.values(finishes).forEach(m=>m.dispose()),[finishes]);
 return <group name="reference-cabinet-recesses-and-foreground-rubies">
  {rearPanels.map(p=><CastInset key={p.name} definition={p} materials={materials} finish={p.black?finishes.black:finishes.burgundy}/>)}
  {warnings.map(p=><React.Fragment key={p.name}>
   {p.points.map(([x,z],i)=>{const cx=p.points.reduce((s,v)=>s+v[0],0)/3,cz=p.points.reduce((s,v)=>s+v[1],0)/3;return <Rod key={i} from={[cx+(x-cx)*.75,-1.88,-(cz+(z-cz)*.75)]} to={[cx+(x-cx)*.75,p.height,-(cz+(z-cz)*.75)]} radius={.045} material={materials.brushed}/>})}
   <CastInset definition={p} materials={materials} warning finish={materials.red}/>
  </React.Fragment>)}
 </group>;
}
