import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {createReturnCoverGeometry} from './return-cover.js';
import {Bevel,Rod,Screw,Tube} from './primitives.jsx';
import {useReturnMetalMaterials} from './ReturnMetal.jsx';
import {binCenters,returnCurve,returnChannelZ,returnStraight,leftReturnElbow,returnBedOffset} from './paths.js';

const HOOP_X=Object.freeze([-5.699819489,3.731769301]);
const FACE=[Math.PI/2,0,0];
function SharedCrownBrace({from,to,materials}) {
 const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
 return <Bevel position={a.add(b).multiplyScalar(.5)} quaternion={q} size={[.34,delta.length(),.06]} radius={.014} material={materials.brushed}/>;
}

/** Closed crown and front wall over the authoritative return rail. Each bin
 * enters through a rear-side port after its vertical drop has finished. */
export default function ReturnGlass({materials}) {
 const returnMetal=useReturnMetalMaterials(materials);
 const geometry=useMemo(createReturnCoverGeometry,[]);
 const hoop=useMemo(()=>{
  const p=(y,z)=>new THREE.Vector3(0,y,z),path=new THREE.CurvePath();
  path.add(new THREE.LineCurve3(p(-.27,-.435),p(.13,-.435)));
  path.add(new THREE.CubicBezierCurve3(p(.13,-.435),p(.27,-.435),p(.415,-.30),p(.415,0)));
  path.add(new THREE.CubicBezierCurve3(p(.415,0),p(.415,.30),p(.27,.435),p(.13,.435)));
  path.add(new THREE.LineCurve3(p(.13,.435),p(-.27,.435)));
  path.add(new THREE.CubicBezierCurve3(p(-.27,.435),p(-.37,.435),p(-.37,.42),p(-.37,.28)));
  path.add(new THREE.LineCurve3(p(-.37,.28),p(-.37,-.28)));
  path.add(new THREE.CubicBezierCurve3(p(-.37,-.28),p(-.37,-.42),p(-.37,-.435),p(-.27,-.435)));
  // A flat metal band makes the cover read as clamped tubular glass.
  const points=path.getPoints(120),vertices=[],faces=[];
  for(const point of points){for(const x of [-.095,.095])vertices.push(x,point.y,point.z);}
  for(let i=0;i<points.length-1;i++){const a=i*2;faces.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(faces);g.computeVertexNormals();return g;
 },[]);
 const sharedBand=useMemo(()=>{
  // Rear entry remains open; the broad C-band grips crown, front and bottom.
  const p=(y,z)=>new THREE.Vector3(0,y,z),path=new THREE.CurvePath();
  path.add(new THREE.LineCurve3(p(.40,-.53),p(.415,-.25)));
  path.add(new THREE.CubicBezierCurve3(p(.415,-.25),p(.44,-.10),p(.44,.18),p(.36,.30)));
  path.add(new THREE.CubicBezierCurve3(p(.36,.30),p(.30,.42),p(.22,.445),p(.13,.445)));
  path.add(new THREE.LineCurve3(p(.13,.445),p(-.27,.445)));
  path.add(new THREE.CubicBezierCurve3(p(-.27,.445),p(-.37,.445),p(-.38,.38),p(-.38,.26)));
  path.add(new THREE.LineCurve3(p(-.38,.26),p(-.38,-.28)));
  const points=Array.from({length:241},(_,i)=>path.getPointAt(i/240)),vertices=[],faces=[];
  for(let i=0;i<points.length;i++){
   const t=path.getTangentAt(i/(points.length-1)),n=new THREE.Vector3(0,-t.z,t.y).normalize();
   for(const side of [-1,1])for(const x of [-.18,.18]){
    const q=points[i].clone().addScaledVector(n,side*.018);vertices.push(x,q.y,q.z);
   }
   if(i<points.length-1){const a=i*4;faces.push(a,a+4,a+1,a+1,a+4,a+5,a+2,a+3,a+6,a+3,a+7,a+6,a,a+2,a+4,a+2,a+6,a+4,a+1,a+5,a+3,a+3,a+5,a+7);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(faces);g.computeVertexNormals();return g;
 },[]);
 const lowerStructure=useMemo(()=>{
  const vertices=[],faces=[],middleFaces=[],edges=[[],[]],steps=560;
  const total=returnCurve.getLength(),middleStart=returnCurve.curves.slice(0,4).reduce((sum,curve)=>sum+curve.getLength(),0)/total;
  const middleEnd=middleStart+returnCurve.curves[4].getLength()/total;
  for(let i=0;i<=steps;i++){
   const p=returnCurve.getPointAt(i/steps),t=returnCurve.getTangentAt(i/steps),n=new THREE.Vector3(-t.z,0,t.x).normalize();
   for(const side of [-1,1]){const q=p.clone().addScaledVector(n,side*.35);q.y-=returnBedOffset+.012;vertices.push(q.x,q.y,q.z);}
   for(const [j,side]of [-1,1].entries()){const q=p.clone().addScaledVector(n,side*.397);q.y-=.34;edges[j].push(q);}
   if(i<steps&&(1-(i+1)/steps)*returnCurve.getLength()>.75){
    const a=i*2,u=(i+.5)/steps,target=u>=middleStart&&u<middleEnd?middleFaces:faces;
    target.push(a,a+1,a+2,a+1,a+3,a+2);
   }
  }
  const bed=new THREE.BufferGeometry();bed.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));bed.setIndex(faces);bed.computeVertexNormals();
  // Refinish the already-visible middle-lane pan. Both index sets partition
  // the original floor exactly: no added cover, hidden shell, or changed route.
  const middleBed=new THREE.BufferGeometry();middleBed.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));middleBed.setIndex(middleFaces);middleBed.computeVertexNormals();
  return {bed,middleBed,edges:edges.map(points=>new THREE.CatmullRomCurve3(points))};
 },[]);
 const primaryCladding=useMemo(()=>{
  const profile=[[.400,-.12],[.427,-.135],[.44,-.17],[.44,-.47],[.425,-.51],[.39,-.52],[.39,-.485],[.414,-.455],[.414,-.185],[.398,-.15],[.400,-.12]];
  const end=(leftReturnElbow.getLength()+returnStraight.getLength()+returnCurve.curves[3].getLength())/returnCurve.getLength(),steps=320,stride=profile.length,vertices=[],faces=[],edgeSegments=[];
  for(const side of [-1,1]){
   const base=vertices.length/3;let edges=[[],[]];
   const flush=()=>{for(const points of edges)if(points.length>2)edgeSegments.push(new THREE.CatmullRomCurve3(points));edges=[[],[]];};
   for(let i=0;i<=steps;i++){
    const u=end*i/steps,p=returnCurve.getPointAt(u),t=returnCurve.getTangentAt(u),n=new THREE.Vector3(-t.z,0,t.x).normalize();
    for(const [offset,y]of profile){const q=p.clone().addScaledVector(n,side*offset);q.y+=y;vertices.push(q.x,q.y,q.z);}
    const port=side<0&&binCenters.slice(1).some(x=>Math.abs(p.x-x)<.69&&Math.abs(p.z-returnChannelZ)<.12);
    if(port)flush();else{for(const [j,y]of [-.12,-.52].entries()){const q=p.clone().addScaledVector(n,side*.405);q.y+=y;edges[j].push(q);}}
    if(i<steps){const mid=returnCurve.getPointAt(end*(i+.5)/steps),open=side<0&&binCenters.slice(1).some(x=>Math.abs(mid.x-x)<.69&&Math.abs(mid.z-returnChannelZ)<.12);if(!open)for(let j=0;j<stride-1;j++){const a=base+i*stride+j,b=a+stride;faces.push(a,a+1,b,a+1,b+1,b);}}
   }
   flush();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(faces);geometry.computeVertexNormals();return {geometry,edges:edgeSegments};
 },[]);
 useEffect(()=>()=>primaryCladding.geometry.dispose(),[primaryCladding]);
 const arrows=useMemo(()=>{
  const s=new THREE.Shape();s.moveTo(-.11,-.13);s.lineTo(.025,0);s.lineTo(-.11,.13);
  s.lineTo(-.05,.13);s.lineTo(.09,0);s.lineTo(-.05,-.13);s.closePath();return new THREE.ShapeGeometry(s);
 },[]);
 const glass=useMemo(()=>{
  const m=materials.glass.clone();
  m.color.set('#f7fbff');m.side=THREE.FrontSide;m.metalness=0;
  m.transmission=1;m.opacity=1;m.transparent=false;m.ior=1.45;m.thickness=.035;
  m.roughness=.005;m.clearcoat=0;m.envMapIntensity=.65;m.depthWrite=false;return m;
 },[materials.glass]);
 const chrome=useMemo(()=>{const m=materials.chrome.clone();m.side=THREE.DoubleSide;m.roughness=.21;return m;},[materials.chrome]);
 const blue=useMemo(()=>new THREE.MeshStandardMaterial({color:'#2795ee',emissive:'#137be7',emissiveIntensity:1.15,roughness:.26}),[]);
 useEffect(()=>()=>{geometry.dispose();hoop.dispose();sharedBand.dispose();lowerStructure.bed.dispose();lowerStructure.middleBed.dispose();arrows.dispose();glass.dispose();chrome.dispose();blue.dispose();},[geometry,hoop,sharedBand,lowerStructure,arrows,glass,chrome,blue]);
 const first=returnStraight,length=returnCurve.getLength(),ratio=first.getLength()/length;
 const atX=x=>returnCurve.getPointAt(leftReturnElbow.getLength()/length+(x+6)/12.35*ratio);
 const middle=returnCurve.curves[4],front=returnCurve.curves[6];
 const atFrontX=x=>front.getPointAt((x-front.getPointAt(0).x)/(front.getPointAt(1).x-front.getPointAt(0).x));
 const hoopPoses=[{p:atFrontX(-4.0),t:front.getTangentAt(0)}];
 const sharedBrackets=HOOP_X.map((x,index)=>{
  const p=atX(x),middleX=index===0?-4.75:x;
  return {p,middle:middle.getPointAt((6.35-middleX)/11.10),bridgeEnd:new THREE.Vector3(index===0?-5.40142779:3.50424262,-.88151345,9.45)};
 });
 // Three direction inlays follow the front shoulder of the glass, where
 // the reference shows them between the marbles rather than on its crown.
 const chevrons=[[-4.152442120649296,.9001695733888012],[-1.1009791348219415,.9161818837929941],[2.551665129593344,1.0134300679760306]].map(([x,a])=>{
  const p=atX(x);p.y+=.13+.258*Math.sin(a);p.z+=.408*Math.cos(a);
  return {p,t:first.getTangentAt(0),tilt:-Math.atan2(.40*Math.sin(a),.25*Math.cos(a))};
 });
 return <group name="enclosed-shared-return-glass">
  <group name="continuous-primary-return-metal-bed">
   <mesh geometry={primaryCladding.geometry} material={returnMetal.face} castShadow receiveShadow/>
   {primaryCladding.edges.map((curve,i)=><Tube key={i} curve={curve} radius={.014} material={materials.chrome} segments={160}/>)}
  </group>
  <mesh name="dark-inset-return-bed" geometry={lowerStructure.bed} material={materials.navy}/>
  <mesh name="brushed-middle-return-bed" geometry={lowerStructure.middleBed} material={returnMetal.face} receiveShadow/>
  {lowerStructure.edges.map((curve,index)=><Tube key={index} curve={curve} radius={.023} material={materials.brushed} segments={420}/>)}
  <mesh name="arched-clear-return-cover" geometry={geometry} material={glass}/>
  {sharedBrackets.map(({p,middle,bridgeEnd},index)=><group key={`shared-${index}`} name="shared-return-channel-bracket">
   <mesh geometry={sharedBand} material={chrome} position={p} castShadow/>
   <SharedCrownBrace from={[p.x,p.y+.42,p.z-.05]} to={bridgeEnd.toArray()} materials={materials}/>
   <Bevel position={[bridgeEnd.x,bridgeEnd.y-.035,bridgeEnd.z]} size={[.48,.075,.28]} radius={.02} material={materials.brushed}/>
   {[.45,.78,1].map(u=>{
    const point=new THREE.Vector3(p.x,p.y+.42,p.z-.05).lerp(bridgeEnd,u);point.y+=.034;
    return <Screw key={u} position={point.toArray()} scale={.85} materials={materials}/>;
   })}
   <Rod from={[p.x,p.y-.38,p.z+.36]} to={[p.x,-1.90,p.z+.80]} radius={.065} material={materials.brushed}/>
   <Bevel position={[p.x,-1.90,p.z+.80]} size={[.52,.10,.40]} radius={.025} material={materials.brushed}/>
   <Rod from={[p.x,-1.90,p.z+.80]} to={[middle.x,-1.90,middle.z]} radius={.065} material={materials.brushed}/>
   <Rod from={[middle.x,-1.90,middle.z]} to={[middle.x,middle.y-.36,middle.z]} radius={.06} material={materials.brushed}/>
   <Bevel position={[middle.x,middle.y-.36,middle.z]} size={[.50,.08,.60]} radius={.02} material={materials.brushed}/>
   <Screw position={[p.x,p.y+.435,p.z-.45]} scale={.85} materials={materials}/>
   <Screw position={[p.x,-1.84,p.z+.85]} scale={.85} materials={materials}/>
  </group>)}
  {hoopPoses.map(({p,t},index)=><group key={index} position={p} rotation={[0,-Math.atan2(t.z,t.x),0]} name="bolted-rounded-glass-hoop">
   <mesh geometry={hoop} material={chrome} castShadow/>
   <Bevel position={[0,-.45,0]} size={[.25,.08,1.00]} radius={.022} material={materials.brushed}/>
   {[-.465,.465].map(z=><Rod key={z} from={[0,-.45,z]} to={[0,-.28,z]} radius={.045} material={materials.gold}/>)}
   {[-.15,.20].map(y=><group key={y} position={[0,y,.47]} rotation={FACE}><Screw position={[0,0,0]} scale={.73} materials={materials}/></group>)}
  </group>)}
  {chevrons.map(({p,t,tilt},index)=><group key={index} position={p} rotation={[0,-Math.atan2(t.z,t.x),0]}>
   {[0,.22].map((dx,i)=><mesh key={i} name="blue-return-direction-inlay" geometry={arrows} material={blue} position={[dx,0,0]} rotation={[tilt,0,0]}/>)}
  </group>)}
 </group>;
}
