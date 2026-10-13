import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {Tube} from './primitives.jsx';
import contours from './case-contours.json';

function strip(a,b,height,depth,bevel=.025){
 const points=[a[0],a[1],b[1],b[0]],shape=new THREE.Shape();
 points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel*.55,bevelSegments:3,curveSegments:1});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,height-depth,0);return geometry;
}
function alignGrain(geometry,a,b){
 const start=new THREE.Vector2(...a[0]),along=new THREE.Vector2(...a[1]).sub(start),length=along.length();along.normalize();
 const across=new THREE.Vector2(...b[0]).sub(start),width=across.length();across.normalize();
 const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<positions.count;i++){const p=new THREE.Vector2(positions.getX(i),-positions.getZ(i)).sub(start);uv.setXY(i,p.dot(along)/length*2,p.dot(across)/width);}
 uv.needsUpdate=true;return geometry;
}
function Edge({points,height,material,radius=.025}){
 const curve=useMemo(()=>new THREE.LineCurve3(...points.map(([x,z])=>new THREE.Vector3(x,height,-z))),[points,height]);
 return <Tube curve={curve} radius={radius} material={material}/>;
}
function Lens({point,wood,materials,aureole}){
 const [x,z]=point;
 return <group position={[x,wood?.76:.84,-z]} name={wood?'inset-oval-walnut-lamp':'ruby-strip-round-lamp'}>
  <mesh rotation={[-Math.PI/2,0,0]} scale={wood?[1,3.4,1]:[1,1,1]} material={materials.bronze}><ringGeometry args={[.086,.128,32]}/></mesh>
  <mesh position={[0,.018,0]} scale={wood?[.07,.047,.285]:[.090,.065,.090]} material={materials.amber}><sphereGeometry args={[1,20,14]}/></mesh>
  <mesh position={[0,.060,0]} rotation={[-Math.PI/2,0,0]} scale={wood?[.65,1.45,1]:[.95,.95,1]} material={materials.bulbHalo} renderOrder={3}><planeGeometry args={[1,1]}/></mesh>
  <sprite name="depth-tested-case-lamp-aureole" position={[0,.073,0]} scale={wood?[.72,1.20,1]:[.92,.92,1]} material={aureole} renderOrder={3}/>
 </group>;
}
export default function ReferenceCabinetShell({materials}){
 // The grounded halo remains on the lacquer; this faint optical aureole faces
 // the camera and still respects walls, lenses and every opaque depth surface.
 const aureole=useMemo(()=>new THREE.SpriteMaterial({map:materials.bulbHalo.map,
  color:'#ffffff',transparent:true,opacity:.30,depthTest:true,depthWrite:false,
  toneMapped:false,blending:THREE.AdditiveBlending}),[materials.bulbHalo]);
 useEffect(()=>()=>aureole.dispose(),[aureole]);
 const parts=useMemo(()=>contours.map(({pts})=>({
  body:alignGrain(strip(pts.O,pts.R,.69,2.55,.035),pts.O,pts.R),wood:alignGrain(strip(pts.M,pts.W,.728,.075,.021),pts.M,pts.W),
  cap:strip(pts.O,pts.M,.76,.15,.035),red:strip(pts.W,pts.R,.79,.18,.035),
 })),[]);
 const deck=useMemo(()=>{
  const lines=contours.map(({pts})=>{const [a,b]=pts.R,t=(-4.09-a[1])/(b[1]-a[1]);return [a,[a[0]+(b[0]-a[0])*t,-4.09]]});
  return strip(lines[0],lines[1],-.015,.12,.01);
 },[]);
 const cap=useMemo(()=>{const m=materials.brushed.clone();m.color.set('#878992');m.roughness=.31;m.envMapIntensity=.85;return m;},[materials.brushed]);
 useEffect(()=>()=>{parts.forEach(p=>Object.values(p).forEach(g=>g.dispose()));cap.dispose();deck.dispose();},[parts,cap,deck]);
 return <group name="continuous-broad-metal-and-walnut-case">
  <mesh geometry={deck} material={materials.navy} receiveShadow/>
  {contours.map(({side,pts,woodLamps,redLamps},i)=><group key={side}>
   <mesh geometry={parts[i].body} material={materials.wood} castShadow receiveShadow/>
   <mesh geometry={parts[i].wood} material={materials.wood} castShadow receiveShadow/>
   <mesh geometry={parts[i].cap} material={cap} castShadow receiveShadow/>
   <mesh geometry={parts[i].red} material={materials.red} castShadow receiveShadow/>
   <Edge points={pts.O} height={.79} material={materials.chrome} radius={.032}/>
   <Edge points={pts.M} height={.79} material={materials.bronze} radius={.030}/>
   <Edge points={pts.R} height={.83} material={materials.gold} radius={.029}/>
   {woodLamps.map((p,j)=><Lens key={`wood-${j}`} point={p} wood materials={materials} aureole={aureole}/>)}
   {redLamps.map((p,j)=><Lens key={`red-${j}`} point={p} materials={materials} aureole={aureole}/>)}
  </group>)}
 </group>;
}
