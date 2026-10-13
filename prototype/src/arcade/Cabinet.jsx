import ReferenceCabinetShell from './ReferenceCabinetShell.jsx';
import StaticPlayfield from './StaticPlayfield.jsx';
import WarmLampAureoles from './WarmLampAureoles.jsx';
import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {Bevel,Rail,Rod,Screw,Tube} from './primitives.jsx';
import Overlay from './Overlay.jsx';
import {ReferenceMarquee,ReferenceControls} from './ReferenceHeader.jsx';
import {ReferenceWheel,ReferenceBin,ReferenceReturnOutlet} from './ReferenceMechanisms.jsx';
import ReferenceDecor from './ReferenceDecor.jsx';
import ReferenceCaseDetails from './ReferenceCaseDetails.jsx';
import ReturnGlass from './ReturnGlass.jsx';
import {RolledReturnFace,useReturnMetalMaterials} from './ReturnMetal.jsx';
import {ballRadius,binCenters,feedX,feedMergeX,feedCurves,feedRailCurves,feedCollectorCurve,mainCurve,collectorZAtX,exitCurve,distributionCurve,binCurves,returnCurves,returnCurve,returnDropBedOffset,returnBedOffset,returnChannelZ,heapPosition} from './paths.js';

// Reference anchor calibration: fixed supports remain physically bracketed to the same rail.
const MAIN_SUPPORT_SPECS=Object.freeze([
 {"id":"TRACK-013","u":0.03525,"mount":[-5.054433378,0.08,-2.923336065]},
 {"id":"TRACK-014","u":0.08815,"mount":[-3.150837982,0.08,-2.183886593]},
 {"id":"TRACK-015","u":0.14305,"mount":[-1.018288373,0.08,-2.211817173]},
 {"id":"TRACK-016","u":0.2083,"mount":[1.454348991,0.08,-0.22249559]},
 {"id":"TRACK-017","u":0.32275,"mount":[-3.056185638,0.08,-0.047135511]},
 {"id":"TRACK-018","u":0.269,"mount":[-0.852151248,0.08,0.126569921]},
 {"id":"TRACK-019","u":0.3686,"mount":[-4.868974769,0.08,1.367378757]},
 {"id":"TRACK-020","u":0.4111,"mount":[-3.140915054,0.08,1.934490411]},
 {"id":"TRACK-021","u":0.46945,"mount":[-0.757460877,0.08,1.867398142]},
 {"id":"TRACK-022","u":0.52855,"mount":[1.050779078,0.08,2.931865002]},
 {"u":0.8},
 {"u":0.855555556},
 {"u":0.911111111},
 {"u":0.966666667},
]);
const MAIN_LAMP_SPECS=Object.freeze([
 {"id":"TRACK-029","u":0.0821,"side":1,"yOffset":-0.04},
 {"id":"TRACK-030","u":0.1266,"side":1,"yOffset":-0.04},
 {"id":"TRACK-031","u":0.2938,"side":-1,"yOffset":-0.04},
 {"id":"TRACK-032","u":0.2416,"side":-1,"yOffset":-0.04},
 {"id":"TRACK-033","u":0.4508,"side":1,"yOffset":-0.06},
 {"id":"TRACK-034","u":0.6331,"side":-1,"yOffset":-0.06},
 {"id":"TRACK-035","u":0.5557,"side":-1,"yOffset":-0.21},
 {"id":"TRACK-036","u":0.9014,"side":-1,"yOffset":-0.04},
]);

const EMPTY=[0,0,0];
// The wheel adapter mouths keep the proven center bed and guide positions.
// Narrow/roll only exposed shoulders inside the existing guide-free handoffs.
const mouthSmooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
const mainMouthFloor=(u,length,base)=>{
 const remaining=(1-u)*length,blend=1-mouthSmooth(remaining/1.40);
 return {width:base.width-.18*blend,roll:Math.max(base.roll,blend),finish:remaining<1.45};
};
const exitMouthFloor=(u,length,base)=>{
 const along=u*length,blend=1-mouthSmooth(along/.95);
 return {width:base.width-.18*blend,roll:Math.max(base.roll,blend),finish:true};
};
const COLLECTOR_MERGE_RANGE=Object.freeze([0,mainCurve.curves[0].getLength()/mainCurve.getLength()]);
const FEED_MERGE_CURVES=feedCurves.map((curve,index)=>[mainCurve,...feedCurves.filter((_,other)=>other!==index)]);
const FEED_COLLECTOR_BRANCHES=feedRailCurves.slice(2);
const FEED_COLLECTOR_MERGES=[mainCurve,...feedCurves];
const FEED_COLLECTOR_JUNCTIONS=FEED_COLLECTOR_BRANCHES.map(curve=>curve.getPointAt(1).x);
const feedCollectorJunctionZ=()=>feedCollectorCurve.getPointAt(0).z;
const DISTRIBUTION_SUPPORTS=Object.freeze(binCenters.slice(0,-1).map((x,index)=>(6-(x+binCenters[index+1])/2)/12));

// The bed and retaining top rims stay fixed. Shorten only the hanging metal
// skirt below the bed, leaving real clearance for the floor-mounted columns.
// The established shallower distributor bridge remains unchanged.
const mainSupportPosition=point=>point.z>4.30?[point.x,point.y,3.05]:point.toArray();
const mainSupportTop=point=>point.z>4.30?1.50:null;
const mainWallDepth=point=>{
 const t=THREE.MathUtils.clamp((point.z-3.70)/.50,0,1);
 return .85-.63*t*t*(3-2*t);
};

function CabinetLamps({materials}) {
 const cores=useRef(),halos=useRef(),sockets=useRef();
 const positions=useMemo(()=>[-1,1].flatMap(side=>Array.from({length:9},(_,i)=>[side*7.77,.77,-9.1+i*2.18])),[]);
 useEffect(()=>{
  const object=new THREE.Object3D();
  positions.forEach((p,i)=>{
   object.position.set(...p);object.rotation.set(0,0,0);object.updateMatrix();cores.current.setMatrixAt(i,object.matrix);
   object.position.y-=.07;object.updateMatrix();sockets.current.setMatrixAt(i,object.matrix);
   object.position.set(...p);object.position.y+=.025;object.rotation.set(-Math.PI/2,0,0);object.updateMatrix();halos.current.setMatrixAt(i,object.matrix);
  });
  [cores.current,halos.current,sockets.current].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;});
 },[positions]);
 return <group name="embedded-warm-cabinet-bulbs">
  <instancedMesh ref={cores} args={[undefined,materials.amber,positions.length]} frustumCulled={false}><sphereGeometry args={[.11,16,10]}/></instancedMesh>
  <instancedMesh ref={sockets} args={[undefined,materials.gold,positions.length]} frustumCulled={false}><cylinderGeometry args={[.14,.17,.09,16]}/></instancedMesh>
  <instancedMesh ref={halos} args={[undefined,materials.bulbHalo,positions.length]} frustumCulled={false} renderOrder={3}><planeGeometry args={[1,1]}/></instancedMesh>
 </group>;
}

function Shell({materials}) {
 const rearDeck=useMemo(()=>{
  const shape=new THREE.Shape();
  shape.moveTo(-7.71,9.85);shape.lineTo(7.71,9.85);
  shape.lineTo(9.91,23.45);shape.lineTo(-9.91,23.45);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:false});
  geometry.translate(0,0,-.07);geometry.rotateX(-Math.PI/2);return geometry;
 },[]);
 useEffect(()=>()=>rearDeck.dispose(),[rearDeck]);
 return <group name="restored-walnut-and-brass-cabinet" scale={[1.10,1,1]}>
  <Bevel size={[16.5,.44,20.45]} position={[0,-1.94,-.5]} radius={.14} material={materials.wood}/>
  <Bevel size={[15.42,.14,14.06]} position={[0,0,-2.94]} radius={.04} material={materials.navy}/>
  <StaticPlayfield material={materials.playfield}/>
  <Bevel size={[15.4,.11,4.4]} position={[0,-1.77,7.45]} radius={.035} material={materials.navy}/>
  <mesh geometry={rearDeck} material={materials.navy} receiveShadow/>
 </group>;
}

function CurvedFrontFrame({materials}) {
 const assembly=useMemo(()=>{
  const arms=[],sweeps=[],edgeCurves=[];
  for(const side of [-1,1]){
   const v=(x,y,z)=>new THREE.Vector3(side*x-.20,y,z);
   const arm=new THREE.CubicBezierCurve3(v(2.78,-.58,9.35),v(2.75,-.60,10.25),v(3.68,-.72,11.14),v(4.80,-.77,11.73));
   const outer=new THREE.CubicBezierCurve3(v(8.02,.14,9.43),v(8.06,-.26,10.62),v(7.52,-.74,11.38),v(4.80,-.77,11.73));
   arms.push(arm,outer);
  }
  // An octagonal cast section has a broad brushed crown and softly rolled
  // corners. It bridges the return bay; no solid wall crosses a live tube.
  const profile=[[-.24,-.15],[-.29,-.09],[-.29,.065],[-.21,.13],[.21,.13],[.29,.065],[.29,-.09],[.24,-.15],[-.24,-.15]];
  for(const curve of arms){
   const vertices=[],indices=[],edge=[[],[]],steps=72;
   for(let i=0;i<=steps;i++){
    const p=curve.getPointAt(i/steps),t=curve.getTangentAt(i/steps),n=new THREE.Vector3(-t.z,0,t.x).normalize();
    for(const [width,y]of profile){const q=p.clone().addScaledVector(n,width);q.y+=y;vertices.push(q.x,q.y,q.z);}
    for(const [j,side]of [-1,1].entries()){const q=p.clone().addScaledVector(n,side*.235);q.y+=.108;edge[j].push(q);}
   }
   for(let i=0;i<steps;i++)for(let j=0;j<profile.length-1;j++){const a=i*profile.length+j,b=a+profile.length;indices.push(a,a+1,b,a+1,b+1,b);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();sweeps.push(g);
   edgeCurves.push(...edge.map(points=>new THREE.CatmullRomCurve3(points)));
  }
  return {arms,sweeps,edgeCurves};
 },[]);
 const casting=useMemo(()=>{const m=materials.brushed.clone();m.color.set('#8d7961');m.roughness=.29;m.metalness=.92;return m;},[materials.brushed]);
 useEffect(()=>()=>{assembly.sweeps.forEach(g=>g.dispose());casting.dispose();},[assembly,casting]);
 return <group name="curved-cast-front-frame-with-open-return-bays">
  {assembly.sweeps.map((geometry,index)=><mesh key={index} geometry={geometry} material={casting} castShadow receiveShadow name="sculpted-front-bridge-arm"/>)}
  {assembly.edgeCurves.map((curve,index)=><Tube key={index} curve={curve} radius={.042} material={materials.chrome} segments={90}/>)}
  {assembly.arms.map((curve,index)=>[.11,.58,.89].map(u=>{
   const p=curve.getPointAt(u);return <Screw key={`${index}:${u}`} position={[p.x,p.y+.143,p.z]} scale={1.0} materials={materials}/>;
  }))}
  {[-1,1].map(side=><group key={side} name={side<0?'open-left-return-tunnel':'open-right-return-outlet-bay'}>
   <Bevel size={[.30,1.10,.30]} position={[side*2.84-.20,-1.265,9.54]} radius={.075} material={materials.wood}/>
   <Bevel size={[.38,.13,.38]} position={[side*2.84-.20,-1.87,9.54]} radius={.05} material={materials.brushed}/>
   <Bevel size={[.45,1.04,.45]} position={[side*4.40-.20,-1.415,11.48]} radius={.075} material={materials.wood}/>
  </group>)}
 </group>;
}

function ForegroundReturnSupport({materials}) {
 const {deck,rim}=useMemo(()=>{
  // This deck overlaps the cabinet base. Its scalloped perimeter replaces
  // the separate rectangular platform and continues beyond the portrait crop.
  const s=new THREE.Shape();s.moveTo(-8.13,-9.23);s.lineTo(8.13,-9.23);s.lineTo(8.13,-10.18);
  s.bezierCurveTo(8.13,-11.30,7.26,-12.02,6.00,-12.02);
  s.bezierCurveTo(4.76,-12.02,3.76,-10.86,2.86,-10.83);
  s.lineTo(-2.86,-10.83);s.bezierCurveTo(-3.76,-10.86,-4.76,-12.02,-6.00,-12.02);
  s.bezierCurveTo(-7.26,-12.02,-8.13,-11.30,-8.13,-10.18);s.closePath();
  const deck=new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSize:.065,bevelThickness:.04,bevelSegments:3,curveSegments:32});deck.rotateX(-Math.PI/2);deck.translate(0,-2.105,0);
  const rim=new THREE.CurvePath(),v=(x,z)=>new THREE.Vector3(x,-1.908,z);
  rim.add(new THREE.CubicBezierCurve3(v(8.13,10.18),v(8.13,11.30),v(7.26,12.02),v(6,12.02)));
  rim.add(new THREE.CubicBezierCurve3(v(6,12.02),v(4.76,12.02),v(3.76,10.86),v(2.86,10.83)));
  rim.add(new THREE.LineCurve3(v(2.86,10.83),v(-2.86,10.83)));
  rim.add(new THREE.CubicBezierCurve3(v(-2.86,10.83),v(-3.76,10.86),v(-4.76,12.02),v(-6,12.02)));
  rim.add(new THREE.CubicBezierCurve3(v(-6,12.02),v(-7.26,12.02),v(-8.13,11.30),v(-8.13,10.18)));
  return {deck,rim};
 },[]);
 useEffect(()=>()=>deck.dispose(),[deck]);
 return <group name="continuous-scalloped-cabinet-front-deck" scale={[1.10,1,1]}>
  <mesh geometry={deck} material={materials.navy} castShadow receiveShadow/>
  <Tube curve={rim} radius={.055} material={materials.chrome} segments={160}/>
  {[-5.35,-3.85,-1.3,1.3,3.85,6.55].map(x=><Rod key={x} from={[x,-1.9,9.68]} to={[x,-1.98,10.32]} radius={.085} material={materials.brushed}/>)}
 </group>;
}

function FrontApron({materials,footer}) {
 const fuelChrome=useMemo(()=>{const material=materials.chrome.clone();material.roughness=.16;return material;},[materials.chrome]);
 useEffect(()=>()=>fuelChrome.dispose(),[fuelChrome]);
 const hood=useMemo(()=>{
  const curve=new THREE.CurvePath(),v=(x,y)=>new THREE.Vector3(x,y,-.055);
  curve.add(new THREE.LineCurve3(v(-2.75,-.23),v(-2.75,.73)));
  curve.add(new THREE.CubicBezierCurve3(v(-2.75,.73),v(-2.75,.96),v(-2.59,1.08),v(-2.35,1.08)));
  curve.add(new THREE.LineCurve3(v(-2.35,1.08),v(2.35,1.08)));
  curve.add(new THREE.CubicBezierCurve3(v(2.35,1.08),v(2.59,1.08),v(2.75,.96),v(2.75,.73)));
  curve.add(new THREE.LineCurve3(v(2.75,.73),v(2.75,-.23)));
  return curve;
 },[]);
 return <group name="recessed-front-fuel-pocket">
  <Bevel size={[5.49,.45,1.15]} position={[-.20,-.79,9.99]} radius={.12} material={materials.navy}/>
  <Bevel size={[5.53,.12,.17]} position={[-.20,-.81,10.67]} radius={.045} material={materials.brushed}/>
  <group position={[-.20,-.70,10.46]} rotation={[-Math.PI/2+.45,0,0]} name="mounted-fuel-and-evidence-pocket">
   <Bevel size={[5.35,.66,.14]} position={[0,.72,-.12]} radius={.10} material={materials.navy}/>
   <Tube curve={hood} radius={.115} material={materials.chrome} segments={160}/>
   {[-2.5,-1.5,-.5,.5,1.5,2.5].map(x=><mesh key={x} position={[x*.80,.5411305655,.35]} material={fuelChrome} castShadow receiveShadow><sphereGeometry args={[.30,32,20]}/></mesh>)}
   <Bevel size={[5.50,.70,.18]} radius={.075} material={materials.brushed}/>
   <Bevel size={[5.28,.62,.12]} position={[0,0,.065]} radius={.085} material={materials.gold}/>
   <Bevel size={[5.05,.54,.07]} position={[0,0,.125]} radius={.045} material={materials.ivory}/>
   <Overlay position={[0,0,.17]} rotation={EMPTY} children={footer}/>
   {[-1,1].map(side=><group key={side} position={[side*2.51,0,.181]} rotation={[Math.PI/2,0,0]}><Screw position={EMPTY} scale={.65} materials={materials}/></group>)}
  </group>
  {[-2.67,2.67].map(x=><Rod key={x} from={[x-.20,-.58,9.72]} to={[x-.20,-.93,10.53]} radius={.07} material={materials.brushed}/>)}
 </group>;
}

function BinReturnGutter({bin,curve,materials}) {
 const {bed,walls,rims}=useMemo(()=>{
  const steps=160,columns=9,vertices=[],indices=[],wallVertices=[[],[]],wallIndices=[],edgePoints=[[],[]];
  const length=curve.getLength(),knee=curve.curves[curve.curves.length-1];
  const span=Math.max(...Array.from({length:24},(_,slot)=>Math.abs(heapPosition(bin,slot).x-binCenters[bin])));
  let previousNormal=new THREE.Vector3(1,0,0);
  for(let i=0;i<=steps;i++){const t=curve.getTangentAt(i/steps),n=new THREE.Vector3(-t.z,0,t.x);if(n.lengthSq()>1e-8){previousNormal=n.normalize();break;}}
  for(let i=0;i<=steps;i++){
   const u=i/steps,p=curve.getPointAt(u),t=curve.getTangentAt(u),normal=new THREE.Vector3(-t.z,0,t.x);
   if(normal.lengthSq()<1e-8)normal.copy(previousNormal);else{normal.normalize();previousNormal.copy(normal);}
   const down=new THREE.Vector3().crossVectors(t,normal).normalize(),offset=returnDropBedOffset(u);
   const mergeFade=THREE.MathUtils.clamp((1-u)*length/.50,0,1),shoulder=.032*mergeFade*mergeFade*(3-2*mergeFade);
   let q=0;
   if(bin!==0){let lo=0,hi=1;for(let k=0;k<22;k++){const m=(lo+hi)/2;if(knee.getPoint(m).z<p.z)lo=m;else hi=m;}q=(lo+hi)/2;}
   // Every reserved slot converges by this exact cubic coefficient. The .04
   // shoulder margin is outside the real radius, rather than a visual taper.
   const halfWidth=bin===0?ballRadius+.07:span*(1-q)*(1-q)*(1+2*q)+ballRadius+.04;
   for(let column=0;column<columns;column++){
    const side=column/(columns-1)*2-1,v=p.clone().addScaledVector(normal,side*halfWidth).addScaledVector(down,offset-shoulder*side*side);
    vertices.push(v.x,v.y,v.z);
   }
   for(const [j,side]of [-1,1].entries()){
    const edge=p.clone().addScaledVector(normal,side*halfWidth),bottom=edge.clone().addScaledVector(down,offset-shoulder),top=edge.clone().addScaledVector(down,offset-.13);
    wallVertices[j].push(bottom.x,bottom.y,bottom.z,top.x,top.y,top.z);
    if((1-u)*length>.36)edgePoints[j].push(top);
   }
   if(i<steps){
    for(let column=0;column<columns-1;column++){
     const a=i*columns+column,b=a+columns;
     // The hinged tray replaces this central bed panel when the real door
     // opens. Its overlapping chrome face carries the flow; the outer fixed
     // ledges and side walls still retain every release column.
     const x=(vertices[a*3]+vertices[(a+1)*3])/2-binCenters[bin];
     const z=(vertices[a*3+2]+vertices[(a+1)*3+2])/2;
     const trayPanel=bin>0&&Math.abs(x)<.50&&z>6.30&&z<6.85;
     if(!trayPanel)indices.push(a,a+1,b,a+1,b+1,b);
    }
    if((1-(i+1)/steps)*length>.36){const a=i*2,b=a+2;wallIndices.push(a,a+1,b,a+1,b+1,b);}
   }
  }
  const make=(positions,faces)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(faces);g.computeVertexNormals();return g;};
  return {bed:make(vertices,indices),walls:wallVertices.map(v=>make(v,wallIndices)),rims:edgePoints.filter(p=>p.length>2).map(p=>new THREE.CatmullRomCurve3(p))};
 },[bin,curve]);
 const finish=useMemo(()=>{const m=materials.brushed.clone();m.color.set('#4d5259');m.roughness=.25;m.metalness=.80;m.side=THREE.DoubleSide;return m;},[materials.brushed]);
 useEffect(()=>()=>{bed.dispose();walls.forEach(w=>w.dispose());finish.dispose();},[bed,walls,finish]);
 return <group name={`fitted-opaque-bin-return-gutter-${bin}`}>
  <mesh geometry={bed} material={finish} receiveShadow/>
  {walls.map((geometry,i)=><mesh key={i} geometry={geometry} material={finish} receiveShadow/>)}
  {rims.map((curve,i)=><Tube key={i} curve={curve} radius={.021} material={materials.brushed} segments={140}/>)}
 </group>;
}

export default function Cabinet({materials,overlays={},plan=[],wheelRef,cupRefs,gateRefs,doorRefs,frontHatchRefs,launchGateRefs}) {
 const returnMetal=useReturnMetalMaterials(materials);
 // The two physical wheel adapters share the dish's champagne response.
 // Keep this clone separate from ordinary rail floors and their rail boost.
 const wheelAdapterMetal=useMemo(()=>{
  const m=materials.chrome.clone();m.name='wheel-adapter-champagne';
  m.color.set('#c3af90');m.roughness=.24;m.metalness=.82;m.envMapIntensity=.9;return m;
 },[materials.chrome]);
 useEffect(()=>()=>wheelAdapterMetal.dispose(),[wheelAdapterMetal]);
 const lampRoot=useRef();
 return <group ref={lampRoot}>
  <Shell materials={materials}/>
  <ReferenceCabinetShell materials={materials}/>
  <ReferenceCaseDetails materials={materials}/>
  <CurvedFrontFrame materials={materials}/>
  <ReferenceMarquee materials={materials} overlays={overlays}/>
  <ReferenceControls materials={materials} overlays={overlays} launchGateRefs={launchGateRefs}/>
  <ReferenceDecor materials={materials}/>
  <Rail curve={mainCurve} materials={materials} width={.60} supports={18} supportSpecs={MAIN_SUPPORT_SPECS} lampSpecs={MAIN_LAMP_SPECS} supportPosition={mainSupportPosition} supportTop={mainSupportTop} wallDepth={mainWallDepth} wallNormalBend={0} layered junctions={feedMergeX} junctionRadius={1.60} junctionZRadius={1.30} mergeCurves={feedCurves} mergeRange={COLLECTOR_MERGE_RANGE} junctionZ={collectorZAtX} guideEnd={1.50} bedProfile={mainMouthFloor} bedFinishMaterial={wheelAdapterMetal}/>
  <Rail curve={feedCollectorCurve} mergeBedCurves={FEED_COLLECTOR_BRANCHES} materials={materials} supports={0} wallDepth={.48} layered mergeCurves={FEED_COLLECTOR_MERGES} junctions={FEED_COLLECTOR_JUNCTIONS} junctionZ={feedCollectorJunctionZ} junctionRadius={.8} bedEnd={.30} bedRollEnd={.8} lit={false}/>
  {feedRailCurves.map((curve,i)=><Rail key={`feed-${i}`} curve={curve} materials={materials} supports={1} wallDepth={.48} layered guideEnd={0} mergeCurves={FEED_MERGE_CURVES[i]} bedEnd={[1.50,.78,.30,.30,.30,.30][i]} bedRollEnd={[1.8,1.1,1.0,1.0,1.0,1.0][i]} lit={false}/>)}
  <ReferenceWheel materials={materials} wheelRef={wheelRef} cupRefs={cupRefs}/>
  <Rail curve={exitCurve} materials={materials} bedProfile={exitMouthFloor} bedFinishMaterial={wheelAdapterMetal} supports={0} guideStart={1.0} guideEnd={.50} bedEnd={.30} lit={false}/>
  <Rail curve={distributionCurve} materials={materials} supports={5} supportProgress={DISTRIBUTION_SUPPORTS} junctions={binCenters} junctionZ={4.60} junctionRadius={.90} guideStart={.62} bedOffset={ballRadius+.01} lampSide={1}/>
  {binCurves.map((curve,i)=><Rail key={`branch-${i}`} curve={curve} materials={materials} supports={0} guideStart={.42} guideEnd={.25} lit={false}/>)}
  {binCenters.map((_,bin)=><ReferenceBin key={bin} bin={bin} materials={materials} label={overlays.labels?.[bin]} color={plan[bin]?.color} gateRefs={gateRefs} doorRefs={doorRefs} frontHatchRefs={frontHatchRefs}/>)}
  {returnCurves.map((curve,i)=><BinReturnGutter key={`drop-${i}`} bin={i} curve={curve} materials={materials}/>)}
  <Rail curve={returnCurve} materials={materials} supports={16} floor={-1.94} glass width={.70} junctions={binCenters.slice(1)} junctionZ={returnChannelZ} junctionRadius={.66} guideEnd={.68} bedEnd={.28} bedOffset={returnBedOffset} lampSide={1}/>
  <ReturnGlass materials={materials}/>

  <ReferenceReturnOutlet materials={materials}/>
  <ForegroundReturnSupport materials={materials}/>
  <group name="continuous-six-port-return-fascia">
   {binCenters.slice(0,-1).map((x,i)=><group key={i}>
    <Bevel size={[binCenters[i+1]-x-1.35,1.36,.14]} position={[(x+binCenters[i+1])/2,-1.08,7.60]} radius={.045} material={returnMetal.recess}/>
    <RolledReturnFace width={binCenters[i+1]-x-1.41} material={returnMetal.face} chrome={materials.chrome} position={[(x+binCenters[i+1])/2,-.74,7.68]}/>
   </group>)}
   {[-1,1].map(side=><group key={side} position={[side<0?binCenters[0]-.905:binCenters[5]+.905,0,0]}>
    <Bevel size={[.46,1.36,.14]} position={[0,-1.08,7.60]} radius={.045} material={returnMetal.recess}/>
    <RolledReturnFace width={.40} material={returnMetal.face} chrome={materials.chrome} position={[0,-.74,7.68]}/>
   </group>)}
  </group>
  <group name="deep-front-return-bed-fascia">
   <Bevel size={[12.55,.43,.14]} position={[.18,-1.79,returnChannelZ+.44]} radius={.06} material={returnMetal.face}/>
   <Bevel size={[12.45,.15,.035]} position={[.18,-1.91,returnChannelZ+.525]} radius={.025} material={returnMetal.face}/>
   <Rod from={[-6.04,-1.54,returnChannelZ+.46]} to={[6.40,-1.54,returnChannelZ+.46]} radius={.035} material={materials.chrome}/>
  </group>
  <FrontApron materials={materials} footer={overlays.footer}/>
  <group name="fuel-pocket-cast-pedestal">
   <Bevel size={[5.77,.65,.28]} position={[-.20,-1.42,10.72]} radius={.075} material={materials.brushed}/>
   <Bevel size={[5.46,.28,.045]} position={[-.20,-1.46,10.88]} radius={.05} material={materials.navy}/>
  </group>
  <WarmLampAureoles rootRef={lampRoot} materials={materials}/>
 </group>;
}
