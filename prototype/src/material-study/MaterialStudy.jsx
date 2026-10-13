import React, {Suspense, useEffect, useMemo} from 'react';
import {Canvas, useThree} from '@react-three/fiber';
import {ContactShadows, Environment, Lightformer, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {useArcadeMaterials} from './materials.js';

const SURFACE = .08;
const RAIL_WIDTH = .6;
const BALL_RADIUS = .22;

function Bevel({size, radius=.04, material, ...props}) {
 const edgeRadius=Math.min(radius,...size.map(dimension=>dimension*.45));
 return <RoundedBox args={size} radius={edgeRadius} smoothness={3} material={material} castShadow receiveShadow {...props}/>;
}

function Tube({curve, material, radius=.05}) {
 const geometry = useMemo(() => new THREE.TubeGeometry(curve,140,radius,12,false), [curve,radius]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return <mesh geometry={geometry} material={material} castShadow receiveShadow/>;
}

function Screw({position, materials, scale=1}) {
 return <group position={position} scale={scale} name="mounting-screw">
  <mesh material={materials.brushed} castShadow><cylinderGeometry args={[.074,.074,.028,20]}/></mesh>
  <mesh position={[0,.021,0]} rotation={[-Math.PI/2,0,.55]} material={materials.chrome}><circleGeometry args={[.052,20]}/></mesh>
  <mesh position={[0,.023,0]} rotation={[-Math.PI/2,0,.55]}><planeGeometry args={[.068,.012]}/><meshBasicMaterial color="#263241"/></mesh>
 </group>;
}

function Post({x,y,z,materials}) {
 const bottom = SURFACE + .025;
 const height = y - bottom;
 return <group name="rail-support">
  <mesh position={[x,bottom+.018,z]} material={materials.brushed} castShadow><cylinderGeometry args={[.13,.16,.05,24]}/></mesh>
  <mesh position={[x,bottom+height/2,z]} material={materials.chrome} castShadow><cylinderGeometry args={[.061,.075,height,20]}/></mesh>
  <Bevel position={[x,y-.018,z]} size={[.68,.055,.18]} radius={.024} material={materials.brushed}/>
  <Screw position={[x-.23,y+.014,z]} scale={.65} materials={materials}/>
  <Screw position={[x+.23,y+.014,z]} scale={.65} materials={materials}/>
 </group>;
}

function Cabinet({materials}) {
 return <group name="walnut-cabinet">
  <Bevel size={[8.6,.58,7.6]} position={[0,-.27,0]} radius={.14} material={materials.wood}/>
  <Bevel size={[7.88,.15,6.9]} position={[0,0,0]} radius={.045} material={materials.navy}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,SURFACE,0]} receiveShadow name="printed-space-playfield">
   <planeGeometry args={[7.85,6.87]}/><primitive object={materials.playfield} attach="material"/>
  </mesh>
  {[-1,1].map(side => <group key={side}>
   <Bevel size={[.36,.67,7.5]} position={[side*4.08,.09,0]} radius={.09} material={materials.wood}/>
   <Bevel size={[.31,.11,7.46]} position={[side*4.08,.46,0]} radius={.044} material={materials.red}/>
   <Bevel size={[.033,.025,7.25]} position={[side*3.89,.475,0]} radius={.008} material={materials.gold}/>
   <Bevel size={[.34,.028,.42]} position={[side*4.08,.533,-3.32]} radius={.025} material={materials.brushed}/>
   <Bevel size={[.34,.028,.42]} position={[side*4.08,.533,3.32]} radius={.025} material={materials.brushed}/>
   {[-3.32,3.32].map(z => <Screw key={z} position={[side*4.08,.558,z]} scale={.9} materials={materials}/>)}
  </group>)}
  {[-1,1].map(end => <group key={end}>
   <Bevel size={[8.25,.48,.32]} position={[0,.005,end*3.63]} radius={.075} material={materials.wood}/>
   <Bevel size={[8.25,.105,.29]} position={[0,.297,end*3.63]} radius={.04} material={materials.red}/>
   <Bevel size={[7.73,.025,.025]} position={[0,.354,end*3.47]} radius={.007} material={materials.gold}/>
  </group>)}
  <Bevel size={[7.97,.13,.045]} position={[0,-.32,3.802]} radius={.01} material={materials.brushed}/>
 </group>;
}

function Rail({materials}) {
 const curve = useMemo(() => new THREE.CatmullRomCurve3([
  [-2.83,.64,-2.18],[-1.4,.63,-1.83],[.4,.6,-1.62],[1.91,.57,-1.33],
  [2.23,.55,-.69],[1.58,.52,-.18],[.05,.49,.0],[-1.62,.46,.23],
  [-2.4,.43,.79],[-2.1,.4,1.44],[-.95,.38,1.88],
 ].map(point=>new THREE.Vector3(...point)),false,'centripetal'), []);
 const {edges, bed} = useMemo(() => {
  const edgePoints=[[],[]],positions=[],indices=[];
  for(let i=0;i<=140;i++) {
   const u=i/140,p=curve.getPointAt(u),t=curve.getTangentAt(u);
   const normal=new THREE.Vector3(-t.z,0,t.x).normalize();
   for(const [index,side] of [-1,1].entries()) {
    const edge=p.clone().addScaledVector(normal,side*RAIL_WIDTH/2);
    edgePoints[index].push(edge.clone().add(new THREE.Vector3(0,-.015,0)));
    positions.push(edge.x,p.y-BALL_RADIUS,edge.z);
   }
   if(i<140){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return {edges:edgePoints.map(points=>new THREE.CatmullRomCurve3(points)),bed:geometry};
 },[curve]);
 useEffect(()=>()=>bed.dispose(),[bed]);
 const ball=curve.getPointAt(.39);
 return <group name="supported-chrome-rail">
  <mesh geometry={bed} material={materials.channel} receiveShadow castShadow/>
  {edges.map((edge,i)=><Tube key={i} curve={edge} radius={.054} material={materials.chrome}/>)}
  {[.025,.2,.4,.57,.76,.98].map(u=>{
   const point=curve.getPointAt(u),tangent=curve.getTangentAt(u);
   return <group key={u} position={[point.x,0,point.z]} rotation={[0,-Math.atan2(tangent.z,tangent.x),0]}>
    <Post x={0} y={point.y-BALL_RADIUS-.035} z={0} materials={materials}/>
   </group>;
  })}
  <mesh position={ball} material={materials.purple} castShadow name="glossy-supplement-marble"><sphereGeometry args={[BALL_RADIUS,48,32]}/></mesh>
  <RailEnd curve={curve} u={0} materials={materials}/>
  <RailEnd curve={curve} u={1} materials={materials}/>
 </group>;
}

function RailEnd({curve,u,materials}) {
 const point=curve.getPointAt(u),tangent=curve.getTangentAt(u);
 return <group position={[point.x,point.y-BALL_RADIUS,point.z]} rotation={[0,-Math.atan2(tangent.z,tangent.x),0]} name="rail-end-stop">
  <Bevel size={[.07,.18,.7]} position={[0,.065,0]} radius={.025} material={materials.brushed}/>
  <Bevel size={[.073,.055,.55]} position={[0,.155,0]} radius={.021} material={materials.red}/>
 </group>;
}

function Triangle({radius,depth,bevel,material,position}) {
 const geometry=useMemo(()=>{
  const shape=new THREE.Shape();
  shape.moveTo(0,radius);shape.lineTo(-radius*.866,-radius*.5);shape.lineTo(radius*.866,-radius*.5);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:12});
  g.rotateX(-Math.PI/2);
  return g;
 },[radius,depth,bevel]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh position={position} geometry={geometry} material={material} castShadow receiveShadow/>;
}

function Star({materials}) {
 const geometry=useMemo(()=>{
  const shape=new THREE.Shape();
  for(let i=0;i<16;i++) {
   const angle=Math.PI/2+i*Math.PI/8,radius=i%2?.085:(i%4===0?.235:.17);
   const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
   if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.02,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2});
  g.rotateX(-Math.PI/2);return g;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} position={[0,.335,0]} material={materials.gold} castShadow/>;
}

function Bumper({materials}) {
 return <group position={[2.05,SURFACE+.04,1.42]} rotation={[0,.18,0]} name="red-triangular-bumper">
  <Triangle radius={.96} depth={.08} bevel={.05} position={[0,0,0]} material={materials.brushed}/>
  <Triangle radius={.85} depth={.10} bevel={.045} position={[0,.1,0]} material={materials.gold}/>
  <Triangle radius={.76} depth={.095} bevel={.06} position={[0,.18,0]} material={materials.red}/>
  <mesh position={[0,.303,0]} material={materials.navy} castShadow><cylinderGeometry args={[.29,.33,.042,48]}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.328,0]} material={materials.gold}><torusGeometry args={[.28,.012,8,48]}/></mesh>
  <Star materials={materials}/>
  {[[-.49,-.25],[.49,-.25],[0,.57]].map(([x,z],i)=><Screw key={i} position={[x,.311,z]} scale={.72} materials={materials}/>)}
 </group>;
}

function AmberBulb({materials}) {
 return <group position={[-2.9,SURFACE,2.52]} name="amber-arcade-bulb">
  <mesh position={[0,.035,0]} material={materials.brushed} castShadow><cylinderGeometry args={[.2,.24,.07,32]}/></mesh>
  <mesh position={[0,.087,0]} material={materials.gold} castShadow><cylinderGeometry args={[.14,.18,.07,32]}/></mesh>
  <mesh position={[0,.215,0]} material={materials.amber} castShadow><sphereGeometry args={[.126,32,24]}/></mesh>
  <mesh position={[0,.11,0]} rotation={[-Math.PI/2,0,0]} material={materials.chrome}><torusGeometry args={[.162,.019,10,40]}/></mesh>
  <pointLight position={[0,.24,0]} color="#ffad45" intensity={.35} distance={1.15} decay={2}/>
 </group>;
}

function MakerPlate({materials}) {
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
  const context=canvas.getContext('2d');
  context.fillStyle='#0b172c';context.fillRect(0,0,1024,192);
  context.fillStyle='#eddfbd';context.textAlign='center';
  context.font='bold 83px "Trebuchet MS", Arial, sans-serif';context.fillText('equilibrium',512,100);
  context.fillStyle='#bea36c';context.font='19px "Trebuchet MS", Arial, sans-serif';
  context.fillText('SCIENCE. BALANCE. A BRIGHTER YOU.',512,148);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;return map;
 },[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group position={[.04,SURFACE+.023,2.91]} name="mounted-maker-plaque">
  <Bevel size={[3.21,.065,.63]} radius={.04} material={materials.gold}/>
  <Bevel size={[3.14,.049,.56]} position={[0,.034,0]} radius={.027} material={materials.navy}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.067,0]}>
   <planeGeometry args={[2.9,.544]}/><meshStandardMaterial map={texture} roughness={.6}/>
  </mesh>
  {[-1,1].flatMap(x=>[-1,1].map(z=><Screw key={`${x}:${z}`} position={[x*1.49,.071,z*.21]} scale={.48} materials={materials}/>))}
 </group>;
}

function CameraRig() {
 const {camera,size,invalidate}=useThree();
 useEffect(()=>{
  const aspect=size.width/size.height;
  const scale=1.14*Math.max(1,1.5/aspect);
  camera.position.set(6.2*scale,8.8*scale,9.8*scale);
  camera.lookAt(0,.02,0);camera.updateProjectionMatrix();invalidate();
 },[camera,size,invalidate]);
 return null;
}

function Scene({onReady}) {
 const materials=useArcadeMaterials();
 useEffect(()=>{onReady();},[onReady]);
 return <>
  <CameraRig/>
  <ambientLight intensity={.5} color="#d7dff4"/>
  <directionalLight position={[-4.5,9,5]} color="#fff0d5" intensity={2.5} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-normalBias={.025} shadow-bias={-.00015}/>
  <directionalLight position={[6,4,-3]} color="#b6c8f1" intensity={.85}/>
  <Environment resolution={256} frames={1}>
   <color attach="background" args={['#15223b']}/>
   <Lightformer form="rect" intensity={3} color="#f5f0e4" scale={[9,3,1]} position={[-4,7,5]} rotation={[-Math.PI/4,0,-.25]}/>
   <Lightformer form="rect" intensity={1.6} color="#d3e0ff" scale={[2,8,1]} position={[6,3,0]} rotation={[0,-Math.PI/2,0]}/>
   <Lightformer form="rect" intensity={.7} color="#eed1a3" scale={[8,1,1]} position={[0,2,-6]}/>
  </Environment>
  <group rotation={[.10,0,0]} position={[0,.03,0]} name="inclined-material-study">
   <Cabinet materials={materials}/>
   <Rail materials={materials}/>
   <Bumper materials={materials}/>
   <AmberBulb materials={materials}/>
   <MakerPlate materials={materials}/>
  </group>
  <ContactShadows position={[0,-.69,0]} scale={15} opacity={.55} blur={2.8} far={3} resolution={512} frames={1} color="#030711"/>
 </>;
}

function Unavailable({onFailure}) {
 useEffect(()=>{onFailure();},[onFailure]);
 return <p className="study-unavailable" role="alert">This material study needs a browser with WebGL support.</p>;
}

export default function MaterialStudy({onReady,onFailure}) {
 return <Canvas shadows frameloop="demand" dpr={[1,1.6]} camera={{position:[6.2,8.8,9.8],fov:32,near:.1,far:80}} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}} role="img" aria-label="Inclined dark walnut pinball material study with a navy celestial playfield, raised chrome rail, purple marble, red triangular bumper, warm amber bulb, cherry trim and brass details" fallback={<Unavailable onFailure={onFailure}/>}>
  <Suspense fallback={null}><Scene onReady={onReady}/></Suspense>
 </Canvas>;
}
