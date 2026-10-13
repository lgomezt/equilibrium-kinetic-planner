import React,{useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {Html} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Bevel,Rod,Screw,Tube} from './primitives.jsx';
import {binCenters,wheelCenter,wheelRadius,wheelTiltX,recyclingOutlet,routingGateY,routingGateZ,trapdoorWidth,trapdoorHingeZ,trapdoorDepth} from './paths.js';
import {cupHardware} from './cup-hardware.js';
import {FRONT_HATCH} from './front-hatch.js';
import {WheelHubStar} from './WheelHubStar.jsx';
import {RolledReturnFace,useReturnMetalMaterials} from './ReturnMetal.jsx';

const TAU=Math.PI*2;
const MOVING={movingPart:true};
const FACE=[Math.PI/2,0,0];

function useOwnedGeometry(factory,deps) {
 const geometry=useMemo(factory,deps);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return geometry;
}

function FaceScrew({position,materials,scale=.65}) {
 return <group position={position} rotation={FACE}><Screw position={[0,0,0]} scale={scale} materials={materials}/></group>;
}

// Domed compartment hardware keeps the existing screw centers. The washer
// seats at plate Z=.135; the shallow milled slot is real recessed geometry.
// Each bin owns one asset set shared by its four heads; consumers do not dispose it.
function useCompartmentFastenerAssets(chrome) {
 const assets=useMemo(()=>{
  const geometry=new THREE.SphereGeometry(.060,64,32,0,TAU,0,Math.PI/2);
  geometry.rotateX(Math.PI/2);geometry.scale(1,1,.47);geometry.translate(0,0,-.008);
  const positions=geometry.getAttribute('position'),colors=[],dark=new THREE.Color('#242a32'),shade=new THREE.Color();
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),distance=Math.hypot(Math.max(Math.abs(x)-.025,0),y)-.0055;
   const groove=1-THREE.MathUtils.smoothstep(distance,-.0015,.0015);
   positions.setZ(i,positions.getZ(i)-.009*groove);
   shade.setRGB(1,1,1).lerp(dark,.95*groove);colors.push(shade.r,shade.g,shade.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const metal=chrome.clone();metal.vertexColors=true;metal.roughness=.20;
  return {head:geometry,washer:new THREE.CylinderGeometry(.067,.067,.012,32),skirt:new THREE.CylinderGeometry(.060,.062,.025,32),metal};
 },[chrome]);
 useEffect(()=>()=>{assets.head.dispose();assets.washer.dispose();assets.skirt.dispose();assets.metal.dispose();},[assets]);
 return assets;
}

function CompartmentCornerFastener({position,materials,assets}) {
 return <group position={position} name="domed-compartment-corner-fastener" dispose={null}>
  <mesh position={[0,0,-.039]} rotation={FACE} geometry={assets.washer} material={materials.bronze} castShadow receiveShadow/>
  <mesh position={[0,0,-.0205]} rotation={FACE} geometry={assets.skirt} material={materials.brushed} castShadow receiveShadow/>
  <mesh geometry={assets.head} rotation={[0,0,.45]} material={assets.metal} castShadow receiveShadow/>
 </group>;
}

function Bulb({position,materials,radius=.055}) {
 return <group position={position}>
  <mesh position={[0,0,-.028]} rotation={FACE} material={materials.gold}><cylinderGeometry args={[radius*1.5,radius*1.7,.07,16]}/></mesh>
  <mesh material={materials.amber}><sphereGeometry args={[radius,16,12]}/></mesh>
 </group>;
}

function Arc({radius,tube,start,end,z=0,material}) {
 const geometry=useOwnedGeometry(()=>{
  const g=new THREE.TorusGeometry(radius,tube,12,72,end-start);g.rotateZ(start);return g;
 },[radius,tube,start,end]);
 return <mesh geometry={geometry} position={[0,0,z]} material={material} castShadow/>;
}

function Chevron({material,position,rotation=0}) {
 const geometry=useOwnedGeometry(()=>{
  const s=new THREE.Shape();s.moveTo(-.13,.15);s.lineTo(0,.055);s.lineTo(.13,.15);
  s.lineTo(.13,-.01);s.lineTo(0,-.145);s.lineTo(-.13,-.01);s.closePath();
  return new THREE.ExtrudeGeometry(s,{depth:.022,bevelEnabled:true,bevelSize:.012,bevelThickness:.009,bevelSegments:2});
 },[]);
 return <mesh geometry={geometry} position={position} rotation={[0,0,rotation]} material={material} castShadow/>;
}

function WheelBulbHalos({material}) {
 const mesh=useRef();
 useLayoutEffect(()=>{
  const matrix=new THREE.Matrix4();
  for(let i=0;i<18;i++){
   const a=i*TAU/18;
   matrix.makeTranslation(Math.cos(a)*2.38,Math.sin(a)*2.38,-.157);
   mesh.current.setMatrixAt(i,matrix);
  }
  mesh.current.instanceMatrix.needsUpdate=true;
 },[]);
 return <instancedMesh name="wheel-bulb-halos" ref={mesh} args={[undefined,material,18]} frustumCulled={false} renderOrder={3}><planeGeometry args={[.42,.42]}/></instancedMesh>;
}

/** The larger dish sits behind the marble plane; the six cup coordinates are
 * shared with the mechanical inventory, including their counter-rotation refs. */
export function ReferenceWheel({materials,wheelRef,cupRefs}) {
 const dish=useOwnedGeometry(()=>{
  const profile=[[.65,-.66],[.90,-.75],[1.48,-.77],[1.84,-.72],[2.03,-.60],[2.18,-.40],[2.30,-.28],[2.40,-.31],[2.43,-.40],[2.38,-.57],[2.23,-.74],[.65,-.85],[.65,-.66]];
  const g=new THREE.LatheGeometry(profile.slice().reverse().map(([r,z])=>new THREE.Vector2(r,z)),128);g.rotateX(Math.PI/2);return g;
 },[]);
 const hubDome=useOwnedGeometry(()=>{
  const profile=Array.from({length:17},(_,i)=>{const r=.59*i/16;return new THREE.Vector2(r,.060+.07*(1-(r/.59)**2));});
  profile.push(new THREE.Vector2(.59,.035),new THREE.Vector2(0,.035));
  const g=new THREE.LatheGeometry(profile.slice().reverse(),96);g.rotateX(Math.PI/2);return g;
 },[]);
 const champagne=useMemo(()=>{
  const m=materials.chrome.clone();m.color.set('#c3af90');m.roughness=.24;m.metalness=.82;m.envMapIntensity=.9;return m;
 },[materials.chrome]);
 const innerBand=useMemo(()=>{
  const m=materials.chrome.clone();m.name='wheel-inner-dark-metal';m.color.set('#5c584f');m.roughness=.24;m.metalness=.96;m.envMapIntensity=.9;return m;
 },[materials.chrome]);
 const crescent=useOwnedGeometry(()=>{
  const s=new THREE.Shape(),a=-.98,b=.98,outer=2.67,inner=2.39;
  s.moveTo(Math.cos(a)*outer,Math.sin(a)*outer);s.absarc(0,0,outer,a,b,false);
  s.lineTo(Math.cos(b)*inner,Math.sin(b)*inner);s.absarc(0,0,inner,b,a,true);s.closePath();
  return new THREE.ExtrudeGeometry(s,{depth:.085,bevelEnabled:true,bevelSize:.024,bevelThickness:.024,bevelSegments:3});
 },[]);
 useEffect(()=>()=>{champagne.dispose();innerBand.dispose();},[champagne,innerBand]);
 return <group position={wheelCenter} name="champagne-star-wheel">
  {[-1,1].map(side=><group key={side}>
   <Rod from={[side*.55,-2.5,-.59]} to={[side*.20,0,-.59]} radius={.14} material={materials.brushed}/>
   <Rod from={[side*.55,-2.5,-.46]} to={[side*.20,0,-.46]} radius={.055} material={materials.chrome}/>
  </group>)}
  <Bevel size={[1.85,.15,1.05]} position={[0,-2.48,-.53]} radius={.06} material={materials.brushed}/>
  <Bevel size={[1.70,.05,.90]} position={[0,-2.38,-.53]} radius={.025} material={materials.gold}/>
  <group rotation={[wheelTiltX,0,0]} name="tilted-physical-wheel">
  <group name="fixed-oval-wheel-housing" position={[0,-.20189616,0]} scale={[.97569321,.79267183,1]}>
  <mesh rotation={FACE} position={[0,0,-.85]} material={materials.brushed} castShadow><cylinderGeometry args={[2.20,2.20,.10,96]}/></mesh>
  <mesh geometry={dish} material={champagne} castShadow receiveShadow/>
  <mesh position={[0,0,-.44]} material={materials.chrome} castShadow><torusGeometry args={[2.33,.115,16,96]}/></mesh>
  <mesh position={[0,0,-.59]} material={innerBand}><torusGeometry args={[1.99,.15,14,96]}/></mesh>
  <mesh position={[0,0,-.42]} material={materials.gold}><torusGeometry args={[2.165,.026,10,96]}/></mesh>
  <mesh position={[0,0,-.225]} material={materials.gold}><torusGeometry args={[2.35,.026,10,96]}/></mesh>
  <mesh position={[0,0,-.27]} material={materials.red}><torusGeometry args={[2.39,.038,10,96]}/></mesh>
  <mesh geometry={crescent} position={[0,0,-.54]} scale={[1.015,1.015,1]} material={materials.gold} castShadow/>
  <mesh geometry={crescent} position={[0,0,-.49]} material={materials.ivory} castShadow/>
  <Arc radius={2.655} tube={.021} start={-.97} end={.97} z={-.335} material={materials.gold}/>
  {[.73,.27,-.19,-.65].map(a=><Chevron key={a} material={materials.red} position={[Math.cos(a)*2.535,Math.sin(a)*2.535,-.35]} rotation={a}/>)}
  {[-.88,.87].map(a=><FaceScrew key={a} position={[Math.cos(a)*2.535,Math.sin(a)*2.535,-.335]} scale={.58} materials={materials}/>)}
  <WheelBulbHalos material={materials.bulbHalo}/>
  {Array.from({length:18},(_,i)=>{
   const a=i*TAU/18;return <Bulb key={i} position={[Math.cos(a)*2.38,Math.sin(a)*2.38,-.22]} radius={.055} materials={materials}/>;
  })}
  </group>
  <group ref={wheelRef} name="six-holder-wheel-rotor" userData={MOVING}>
   {Array.from({length:6},(_,i)=>{
    const a=i*TAU/6,x=Math.sin(a)*wheelRadius,y=-Math.cos(a)*wheelRadius;
    const nx=Math.cos(a)*.09,ny=Math.sin(a)*.09;
    return <group key={i}>
     <Rod from={[Math.sin(a)*.57,-Math.cos(a)*.57,-.46]} to={[x,y,-.46]} radius={.112} material={materials.brushed}/>
     {[-1,1].map(side=><Rod key={side} from={[Math.sin(a)*.72+nx*side,-Math.cos(a)*.72+ny*side,-.39]} to={[x+nx*side,y+ny*side,-.39]} radius={.055} material={materials.chrome}/>)}
     <group ref={element=>{cupRefs.current[i]=element;}} position={[x,y,0]} name={`counterweighted-cup-${i}`} userData={MOVING}>
      <mesh rotation={FACE} position={cupHardware.backPlate.position} material={materials.brushed}><cylinderGeometry args={[cupHardware.backPlate.radius,cupHardware.backPlate.radius,cupHardware.backPlate.depth,32]}/></mesh>
      <mesh position={cupHardware.backFace.position} material={materials.navy}><circleGeometry args={[cupHardware.backFace.radius,32]}/></mesh>
      {[cupHardware.floor,cupHardware.rearWall,cupHardware.frontWall].map((part,index)=><Bevel key={index} size={part.size} position={part.position} radius={part.radius} material={index===2?champagne:materials[part.material]}/>)}
      {cupHardware.rims.map(rim=><mesh key={rim.id} position={rim.position} material={materials[rim.material]}><torusGeometry args={[rim.radius,rim.tube,rim.radialSegments,rim.tubularSegments]}/></mesh>)}
      {cupHardware.frontLinks.map((link,index)=><Rod key={index} from={link.from} to={link.to} radius={link.radius} material={materials.chrome}/>)}
     </group>
    </group>;
   })}
  </group>
  <mesh rotation={FACE} position={[0,0,-.19]} material={materials.gold} castShadow><cylinderGeometry args={[.69,.74,.30,64]}/></mesh>
  <mesh position={[0,0,.028]} material={materials.chrome}><torusGeometry args={[.65,.045,12,64]}/></mesh>
  <mesh position={[0,0,.04]} material={materials.gold}><torusGeometry args={[.60,.019,10,64]}/></mesh>
  <mesh geometry={hubDome} material={materials.navy} castShadow/>
  <WheelHubStar materials={materials}/>
  <Bevel position={[0,-wheelRadius-.345,.015]} size={[.82,.055,.82]} radius={.025} material={materials.brushed}/>
  </group>
 </group>;
}

function PrintedContents({children,invalidate,viewport}) {
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>invalidate());return()=>cancelAnimationFrame(frame);
 },[children,invalidate,viewport]);
 return children;
}

function NameplateOverlay({children}) {
 const invalidate=useThree(state=>state.invalidate);
 const viewport=useThree(state=>`${state.size.width}:${state.size.height}`);
 return children?<Html name="projected-cabinet-ui" wrapperClass="arcade-projected-overlay" transform center position={[0,0,.145]} distanceFactor={10} zIndexRange={[10,0]} style={{pointerEvents:'auto'}}><PrintedContents invalidate={invalidate} viewport={viewport}>{children}</PrintedContents></Html>:null;
}

function RoundedPlate({width,height,depth,radius=.12,bevelSize=null,material,...props}) {
 const geometry=useOwnedGeometry(()=>{
  const bevel=bevelSize??Math.min(.028,depth*.20),w=width/2-bevel,h=height/2-bevel,r=Math.max(.01,radius-bevel),s=new THREE.Shape();
  s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);
  s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);
  s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);s.closePath();
  const core=depth-bevel*2,g=new THREE.ExtrudeGeometry(s,{depth:core,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:12});
  g.translate(0,0,-core/2);return g;
 },[width,height,depth,radius,bevelSize]);
 return <mesh geometry={geometry} material={material} castShadow receiveShadow {...props}/>;
}

// Compartment enamel has a broad rounded shoulder; the existing front face
// stays at local Z=.135 and the added thickness extends into its backing.
function CompartmentNameplate({ivory}) {
 const enamel=useMemo(()=>{const material=ivory.clone();material.roughness=.28;material.clearcoat=.60;material.clearcoatRoughness=.16;return material;},[ivory]);
 useEffect(()=>()=>enamel.dispose(),[enamel]);
 return <RoundedPlate name="beveled-enamel-compartment-nameplate" width={1.90} height={.85} depth={.10} radius={.085} bevelSize={.038} position={[0,0,.085]} material={enamel}/>;
}

/** color belongs to the catalog entry; an unused physical bin remains neutral. */
export function ReferenceBin({bin,materials,label,gateRefs,doorRefs,frontHatchRefs,color='#9098a2'}) {
 const cornerFastenerAssets=useCompartmentFastenerAssets(materials.chrome);
 const returnMetal=useReturnMetalMaterials(materials);
 const frontActuator=useMemo(()=>({flap:null,shutter0:null,shutter1:null,shutter2:null,skirt0:null,skirt1:null}),[]);
 const attachFront=(part,element)=>{frontActuator[part]=element;if(frontHatchRefs?.current)frontHatchRefs.current[bin]=frontActuator;};
 const sideCasting=useOwnedGeometry(()=>{
  // This is the curved silhouette of a cast side wall, extruded across X.
  // Its inside face remains outside the complete marble and return envelope.
  const s=new THREE.Shape();s.moveTo(-4.14,-.78);s.lineTo(-6.86,-.78);
  s.quadraticCurveTo(-6.94,-.78,-6.94,-.64);s.lineTo(-6.94,.38);
  s.bezierCurveTo(-6.94,.86,-6.78,.95,-6.54,.95);s.lineTo(-5.30,.95);
  s.bezierCurveTo(-5.10,.95,-4.96,.74,-4.72,.74);s.lineTo(-4.47,.74);
  s.bezierCurveTo(-4.18,.74,-4.10,.60,-4.10,.38);s.lineTo(-4.10,-.64);
  s.quadraticCurveTo(-4.10,-.78,-4.14,-.78);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.20,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:5,curveSegments:20});
  g.translate(0,0,-.10);g.rotateY(Math.PI/2);return g;
 },[]);
 const shoulderRim=useMemo(()=>{
  const v=(y,z)=>new THREE.Vector3(0,y,z),c=new THREE.CurvePath();
  c.add(new THREE.LineCurve3(v(-.64,4.10),v(.38,4.10)));
  c.add(new THREE.CubicBezierCurve3(v(.38,4.10),v(.60,4.10),v(.74,4.18),v(.74,4.47)));
  c.add(new THREE.LineCurve3(v(.74,4.47),v(.74,4.72)));
  c.add(new THREE.CubicBezierCurve3(v(.74,4.72),v(.74,4.96),v(.95,5.10),v(.95,5.30)));
  c.add(new THREE.LineCurve3(v(.95,5.30),v(.95,6.54)));
  c.add(new THREE.CubicBezierCurve3(v(.95,6.54),v(.95,6.78),v(.86,6.94),v(.38,6.94)));
  c.add(new THREE.LineCurve3(v(.38,6.94),v(-.64,6.94)));
  return c;
 },[]);
 const triangleFrame=useOwnedGeometry(()=>{
  const s=new THREE.Shape();s.moveTo(-.38,.29);s.lineTo(.38,.29);s.lineTo(0,-.39);s.closePath();
  const hole=new THREE.Path();hole.moveTo(-.285,.205);hole.lineTo(0,-.265);hole.lineTo(.285,.205);hole.closePath();s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s,{depth:.085,bevelEnabled:true,bevelSize:.034,bevelThickness:.032,bevelSegments:5});
 },[]);
 const triangleRecess=useOwnedGeometry(()=>{
  const s=new THREE.Shape();s.moveTo(-.39,.25);s.lineTo(.39,.25);s.lineTo(0,-.34);s.closePath();
  return new THREE.ExtrudeGeometry(s,{depth:.105,bevelEnabled:true,bevelSize:.023,bevelThickness:.023,bevelSegments:4});
 },[]);
 const jewel=useOwnedGeometry(()=>{
  const a=[-.275,.195,.025],b=[.275,.195,.025],c=[0,-.25,.025],tip=[0,.043,.085],vertices=[];
  const face=(a,b,c)=>[a,c,b].forEach(p=>vertices.push(...p));
  face(a,b,tip);face(b,c,tip);face(c,a,tip);
  const back=[a,b,c].map(([x,y])=>[x,y,-.04]);
  for(let i=0;i<3;i++){const next=(i+1)%3;face([a,b,c][i],back[i],back[next]);face([a,b,c][i],back[next],[a,b,c][next]);}
  face(back[0],back[2],back[1]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
 },[]);
 const insert=useMemo(()=>new THREE.MeshPhysicalMaterial({
  color:new THREE.Color('#252933').lerp(new THREE.Color(color),.08),
  metalness:.72,roughness:.30,clearcoat:.65,clearcoatRoughness:.14,
 }),[color]);
 const gateFrame=useMemo(()=>{
  const m=materials.brushed.clone();m.color.set('#51483e');m.roughness=.27;m.metalness=.84;m.envMapIntensity=.72;return m;
 },[materials.brushed]);
 const stemLens=useMemo(()=>new THREE.MeshPhysicalMaterial({
  color,emissive:color,emissiveIntensity:.16,
  metalness:.10,roughness:.17,clearcoat:1,clearcoatRoughness:.06,transmission:.04,thickness:.08,
 }),[color]);
 const jewelMaterial=useMemo(()=>{
  const tint=new THREE.Color(color),hsl={};tint.getHSL(hsl);
  if(hsl.s>.20)tint.setHSL(hsl.h,Math.max(.88,hsl.s),THREE.MathUtils.clamp(hsl.l,.25,.34));
  const material=new THREE.MeshPhysicalMaterial({color:tint,emissive:tint,emissiveIntensity:.30,
   metalness:.16,roughness:.20,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:.65,
   transmission:.04,thickness:.08,ior:1.48});
  // The existing faceted stone carries a small luminous triangular core.
  // Its unique transmissive material retains local coordinates during batching.
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>',
    '#include <common>\nvarying vec2 vJewelFace;').replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvJewelFace = position.xy;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
    '#include <common>\nvarying vec2 vJewelFace;').replace('#include <color_fragment>',
    `#include <color_fragment>
     float jewelBottom = (0.195 - vJewelFace.y) / 0.445;
     float jewelRight = (1.0 - jewelBottom + vJewelFace.x / 0.275) * 0.5;
     float jewelLeft = 1.0 - jewelBottom - jewelRight;
     float jewelCore = smoothstep(0.19, 0.29, min(jewelBottom, min(jewelRight, jewelLeft)));
     diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.975, 0.89), jewelCore * 0.88);
    `).replace('#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
     totalEmissiveRadiance += vec3(1.0, 0.965, 0.86) * jewelCore * 2.3;
    `);
  };
  material.customProgramCacheKey=()=> 'faceted-gate-jewel-core-v1';
  return material;
 },[color]);
 const bronze=useMemo(()=>{
  const m=(materials.bronze??materials.brushed).clone();m.color.set('#756650');m.roughness=.36;m.metalness=.80;return m;
 },[materials.bronze,materials.brushed]);
 const hatchFace=useMemo(()=>{
  const m=materials.brushed.clone();m.color.set('#655642');m.roughness=.34;m.metalness=.84;return m;
 },[materials.brushed]);
 const recessFinish=useMemo(()=>{
  const m=materials.brushed.clone();m.color.set('#111820');m.roughness=.31;m.metalness=.58;return m;
 },[materials.brushed]);
 const tintedGlass=useMemo(()=>{
  const m=materials.glass.clone();m.color.set('#14273b');m.opacity=.36;m.transparent=true;m.roughness=.12;m.envMapIntensity=1.25;return m;
 },[materials.glass]);
 useEffect(()=>()=>{insert.dispose();jewelMaterial.dispose();gateFrame.dispose();stemLens.dispose();bronze.dispose();hatchFace.dispose();recessFinish.dispose();tintedGlass.dispose();},[insert,jewelMaterial,gateFrame,stemLens,bronze,hatchFace,recessFinish,tintedGlass]);
 return <group position={[binCenters[bin],0,0]} name={`framed-prize-compartment-${bin}`}>
  <Bevel size={[2.175,.17,1.88]} position={[0,-.87,5.04]} radius={.045} material={materials.brushed}/>
  {[-.99,.99].map(side=><group key={side}>
   <Bevel size={[.20,.17,.80]} position={[side,-.87,6.36]} radius={.035} material={materials.brushed}/>
   <Bevel size={[.18,.042,2.66]} position={[side,-.768,5.51]} radius={.018} material={materials.gold}/>
  </group>)}
  <Bevel size={[1.89,.06,1.64]} position={[0,-.80,5.06]} radius={.02} material={materials.navy}/>
  {[-1,1].map(side=><group key={side}>
   <mesh geometry={sideCasting} position={[side*1.00,0,0]} material={bronze} castShadow receiveShadow name="sculpted-dark-metal-bin-separator"/>
   <Bevel size={[.043,1.49,2.51]} position={[side*.894,-.005,5.495]} radius={.017} material={bronze}/>
   <Bevel size={[.035,1.47,2.48]} position={[side*.857,-.005,5.495]} radius={.015} material={tintedGlass}/>
   <group position={[side*1.00,0,0]}><Tube curve={shoulderRim} radius={.058} material={materials.chrome} segments={100}/></group>
   <Rod from={[side*.944,.855,4.47]} to={[side*.944,.855,6.54]} radius={.022} material={materials.gold}/>
   <Bevel size={[.22,.22,.18]} position={[side*1.00,-.67,6.92]} radius={.05} material={bronze}/>
   <Screw position={[side*.995,.83,6.80]} scale={.64} materials={materials}/>
   {[-.55,.38].map(y=><FaceScrew key={y} position={[side*1.00,y,6.975]} scale={.63} materials={materials}/>)}
  </group>)}
  <Bevel size={[2.08,.105,.11]} position={[0,.85,6.80]} radius={.031} material={materials.chrome}/>
  <Bevel size={[1.93,1.68,.033]} position={[0,.08,6.82]} radius={.016} material={tintedGlass}/>
  <Bevel size={[2.06,.075,.10]} position={[0,-.64,6.82]} radius={.025} material={materials.gold}/>
  {[-1,1].map(side=><Bevel key={side} size={[.61,.74,.035]} position={[side*.68,-.26,4.28]} radius={.012} material={tintedGlass}/>)}
  <group position={[0,routingGateY,routingGateZ]} name="actuated-distribution-gate">
   <mesh rotation={[0,0,Math.PI/2]} material={materials.gold}><cylinderGeometry args={[.045,.045,.88,16]}/></mesh>
   {[-.38,.38].map(side=><Rod key={side} from={[side,0,0]} to={[side,.17,0]} radius={.037} material={materials.brushed}/>)}
   <group ref={element=>{gateRefs.current[bin]=element;}} userData={MOVING}><Bevel position={[0,-.20,0]} size={[.60,.40,.035]} radius={.017} material={insert}/></group>
  </group>
  <group position={[0,2.03,5.33]} rotation={[-.55,0,0]} name="colored-triangle-funnel-marker">
   <mesh geometry={triangleRecess} position={[0,0,-.075]} material={gateFrame} castShadow/>
   <mesh geometry={triangleFrame} position={[0,0,-.012]} material={gateFrame} castShadow/>
   <mesh geometry={jewel} position={[0,0,.135]} material={jewelMaterial} castShadow name="recessed-faceted-color-jewel"/>
   {[-.315,.315].map(side=><FaceScrew key={side} position={[side,.247,.137]} scale={.38} materials={materials}/>)}
  </group>
  <group name="compact-rear-cantilever-gate-mount">
   <Rod from={[bin===5?-.70:0,.47,4.20]} to={[bin===5?-.70:0,1.525,4.20]} radius={.065} material={bronze}/>
   <Bevel size={[.27,.12,.16]} position={[bin===5?-.70:0,.47,4.20]} radius={.045} material={bronze}/>
   <Rod from={[bin===5?-.70:0,1.525,4.20]} to={[0,1.525,routingGateZ]} radius={.055} material={bronze}/>
   <Rod from={[0,1.525,routingGateZ]} to={[0,1.94,routingGateZ]} radius={.055} material={bronze}/>
   <Rod from={[0,1.94,routingGateZ]} to={[0,1.94,5.34]} radius={.055} material={bronze}/>
  </group>
  <group name="short-cast-gold-jewel-neck">
   <Rod from={[0,1.75,5.47]} to={[0,1.69,6.12]} radius={.14} material={materials.gold}/>
   {[-1,1].map(side=><Rod key={side} from={[side*.15,1.79,5.48]} to={[side*.15,1.73,6.12]} radius={.039} material={materials.chrome}/>)}
   <mesh position={[0,1.69,6.12]} material={materials.chrome}><torusGeometry args={[.17,.035,12,32]}/></mesh>
   <mesh position={[0,1.69,6.17]} material={stemLens}><sphereGeometry args={[.105,24,16]}/></mesh>
   <Bulb position={[0,1.83,5.87]} materials={materials} radius={.070}/>
  </group>
  <group position={[0,-.775,trapdoorHingeZ]} name="hinged-return-trapdoor">
   <mesh position={[0,-.025,0]} rotation={[0,0,Math.PI/2]} material={materials.gold}><cylinderGeometry args={[.045,.045,1.90,16]}/></mesh>
   <group ref={element=>{doorRefs.current[bin]=element;}} userData={MOVING}><Bevel position={[0,0,trapdoorDepth/2]} size={[trapdoorWidth,.045,trapdoorDepth]} radius={.018} material={materials.channel}/></group>
   {[-.99,.99].map(side=><Bevel key={side} size={[.20,.06,trapdoorDepth+.04]} position={[side,-.005,trapdoorDepth/2]} radius={.02} material={materials.channel}/>)}
  </group>
  {[-.75,.75].map(side=><Rod key={side} from={[side,.25,6.83]} to={[side,.566023668,7.02]} radius={.055} material={materials.chrome}/>)}
  <group position={[0,.566023668,7.02]} rotation={[-.80,0,0]} name="bolted-ivory-supplement-nameplate">
   <RoundedPlate width={2.04} height={1.00} depth={.06} radius={.13} position={[0,0,.015]} material={materials.chrome}/>
   <RoundedPlate width={1.975} height={.93} depth={.065} radius={.105} position={[0,0,.07]} material={materials.gold}/>
   <CompartmentNameplate ivory={materials.ivory}/>
   <NameplateOverlay children={label}/>
   {[-1,1].flatMap(s=>[-1,1].map(t=><CompartmentCornerFastener key={`${s}:${t}`} position={[s*.855,t*.33,.18]} materials={materials} assets={cornerFastenerAssets}/>))}
  </group>
  <group name="recessed-dark-bin-front-apron">
   {[-1,1].map(side=><Bevel key={side} size={[.32,.98,.08]} position={[side*.85,-.225,7.20]} radius={.035} material={recessFinish}/>)}
   <Bevel size={[2.04,.10,.52]} position={[0,.28,7.00]} radius={.055} material={recessFinish}/>
   {[-1,1].map(side=><group key={side}>
    <Bevel size={[.115,.97,.68]} position={[side*.99,-.20,7.15]} radius={.035} material={bronze}/>
    <Rod from={[side*.99,.255,7.49]} to={[side*.99,-.715,7.49]} radius={.024} material={materials.chrome}/>
   </group>)}
  </group>
  <group position={FRONT_HATCH.flapPivot} name="linked-front-hatch-hinge">
   <group ref={element=>attachFront('flap',element)} userData={MOVING} name="live-front-outlet-flap">
    <Rod from={[-.96,0,0]} to={[.96,0,0]} radius={.035} material={materials.chrome}/>
    {[-.47,.47].map(x=><Rod key={x} from={[x,0,0]} to={[x,.26,0]} radius={.035} material={bronze}/>)}
    <group position={FRONT_HATCH.flapFaceOffset} name="brass-front-hatch-housing">
   <RoundedPlate width={1.24} height={.70} depth={.09} radius={.13} material={bronze}/>
   <RoundedPlate width={1.10} height={.56} depth={.045} radius={.095} position={[0,-.018,.05]} material={materials.gold}/>
   <RoundedPlate width={.99} height={.46} depth={.035} radius={.065} position={[0,-.018,.08]} material={hatchFace}/>
   <Rod from={[-.52,.31,.065]} to={[.52,.31,.065]} radius={.045} material={bronze}/>
   {[-.43,.43].map(side=><FaceScrew key={side} position={[side,.115,.125]} scale={.65} materials={materials}/>)}
   <Bevel size={[.84,.036,.05]} position={[0,-.16,.11]} radius={.012} material={materials.gold}/>
     <RoundedPlate width={1.14} height={.62} depth={.025} radius={.055} position={[0,-.015,-.060]} material={materials.chrome}/>
     {[-.575,.575].map(x=><Rod key={x} from={[x,-.29,-.082]} to={[x,.29,-.082]} radius={.022} material={materials.chrome}/>)}
    </group>
   </group>
  </group>
  <group name="front-return-shutter-guide">
   {[-.88,.88].map(x=><Rod key={x} from={[x,-1.56,7.15]} to={[x,.12,7.15]} radius={.026} material={bronze}/>)}
   {(bin===0?[.96]:[-.96,.96]).map(x=><Rod key={x} from={[x,-1.68,6.07]} to={[x,-.40,7.51]} radius={.035} material={bronze}/>)}
   {[-.72,.72].map(x=><Rod key={`skirt-guide-${x}`} from={[x,-2.50,7.57]} to={[x,-.40,7.57]} radius={.025} material={materials.brushed}/>)}
   {[0,1].map(i=><group key={`skirt-${i}`} position={[0,FRONT_HATCH.skirtClosedY+FRONT_HATCH.skirtClosedOffsets[i],FRONT_HATCH.skirtZ+i*.025]} ref={element=>attachFront(`skirt${i}`,element)} userData={MOVING} name={`live-front-metal-skirt-port-${i}`}>
    <Bevel size={[1.35,.70,.021]} radius={.012} material={returnMetal.recess}/>
    {i===1&&<RolledReturnFace width={1.23} material={returnMetal.face} chrome={materials.chrome} position={[0,.01,.055]}/>}
   </group>)}
   {[0,1,2].map(i=><group key={i} position={[0,FRONT_HATCH.shutterClosedY+FRONT_HATCH.shutterSlatClosedY[i],FRONT_HATCH.shutterZ+i*.025]} ref={element=>attachFront(`shutter${i}`,element)} userData={MOVING} name={`live-under-floor-return-shutter-${i}`}>
    <Bevel size={[1.65,.235,.021]} radius={.012} material={recessFinish}/>
    <Rod from={[-.77,-.10,.016]} to={[.77,-.10,.016]} radius={.011} material={materials.brushed}/>
   </group>)}
  </group>
 </group>;
}

function InletRing({radius,tube,y,material}) {
 // Leave the rear 172 degrees open: the return curve approaches the hole from
 // that side, rather than passing through a complete decorative torus.
 const geometry=useOwnedGeometry(()=>{
  const gap=1.50,g=new THREE.TorusGeometry(radius,tube,14,72,TAU-gap*2);
  g.rotateZ(Math.PI/2+gap);g.rotateX(-Math.PI/2);return g;
 },[radius,tube]);
 return <mesh geometry={geometry} position={[0,y,0]} material={material} castShadow/>;
}

export function ReferenceReturnOutlet({materials}) {
 // Fit the decorative face independently of the fixed return inlet below it.
 const badgePosition=[-.082412,1.78,.145281],badgeRotation=[-.474179,-.159738,.122699],badgeScale=.872199;
 const badgeSupport=side=>new THREE.Vector3(side,-.28,-.13).multiplyScalar(badgeScale)
  .applyEuler(new THREE.Euler(...badgeRotation)).add(new THREE.Vector3(...badgePosition)).toArray();
 const openBase=useOwnedGeometry(()=>{
  const s=new THREE.Shape(),w=.72,r=.10;
  s.moveTo(-w+r,-w);s.lineTo(w-r,-w);s.quadraticCurveTo(w,-w,w,-w+r);
  s.lineTo(w,w-r);s.quadraticCurveTo(w,w,w-r,w);s.lineTo(-w+r,w);
  s.quadraticCurveTo(-w,w,-w,w-r);s.lineTo(-w,-w+r);s.quadraticCurveTo(-w,-w,-w+r,-w);
  const hole=new THREE.Path();hole.absarc(0,0,.44,0,TAU,true);s.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(s,{depth:.09,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:32});g.rotateX(-Math.PI/2);return g;
 },[]);
 const bezel=useOwnedGeometry(()=>{
  const profile=[[.86,-.09],[.94,-.15],[1.025,-.105],[1.055,-.035],[1.03,.075],[.97,.14],[.92,.115],[.86,.06],[.86,-.09]];
  // The broad outer roll stands forward; the inner seat stays against the enamel.
  const g=new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(
   .86+(r-.86)*1.35,z+.17*THREE.MathUtils.clamp((r-.92)/.10,0,1))),112);
  g.rotateX(Math.PI/2);return g;
 },[]);
 const enamel=useOwnedGeometry(()=>{
  const positions=[],uvs=[],indices=[],rings=24,segments=96;
  for(let ring=0;ring<=rings;ring++){
   const r=.88*ring/rings,z=.095+.085*(1-(r/.88)**2);
   for(let segment=0;segment<=segments;segment++){
    const a=segment*Math.PI*2/segments,x=r*Math.cos(a),y=r*Math.sin(a);
    positions.push(x,y,z);uvs.push(.5+x/1.76,.5+y/1.76);
   }
  }
  for(let ring=0;ring<rings;ring++)for(let segment=0;segment<segments;segment++){
   const a=ring*(segments+1)+segment,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
 },[]);
 const texture=useMemo(()=>{
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  ctx.fillStyle='#9e1426';ctx.fillRect(0,0,512,512);ctx.textAlign='center';ctx.fillStyle='#fff4de';
  ctx.save();ctx.translate(256,221);ctx.scale(.82,1.18);
  ctx.font='bold 62px "Trebuchet MS",Arial';ctx.fillText('RETURN',0,-56);ctx.fillText('TO PLAY',0,17);ctx.restore();
  for(const x of [174,256,338]){
   ctx.beginPath();ctx.moveTo(x-30,322);ctx.lineTo(x+30,369);ctx.lineTo(x-30,416);ctx.lineTo(x-30,392);ctx.lineTo(x-8,369);ctx.lineTo(x-30,346);ctx.closePath();ctx.fill();
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
 },[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group position={recyclingOutlet} name="raised-return-to-play-medallion">
  <mesh name="open-terminal-plinth" geometry={openBase} position={[0,-.48,0]} material={materials.brushed} castShadow receiveShadow/>
  {[-1,1].flatMap(x=>[-1,1].map(z=><Screw key={`${x}:${z}`} position={[x*.54,-.375,z*.54]} scale={.70} materials={materials}/>))}
  <group rotation={[0,Math.PI/2,0]} name="open-left-return-inlet">
   <InletRing radius={.50} tube={.14} y={-.015} material={materials.chrome}/>
   <InletRing radius={.47} tube={.085} y={.055} material={materials.red}/>
   <InletRing radius={.485} tube={.025} y={.12} material={materials.gold}/>
  </group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.09,0]}><circleGeometry args={[.40,40]}/><meshBasicMaterial color="#020711"/></mesh>
  {[-.55,.55].map(side=><Rod key={side} from={[side,-.39,.43]} to={badgeSupport(side)} radius={.065} material={materials.chrome}/>)}
  <group position={badgePosition} rotation={badgeRotation} scale={badgeScale} name="red-enamel-return-badge">
   <mesh rotation={FACE} position={[0,0,-.13]} material={materials.brushed} castShadow><cylinderGeometry args={[1.00,1.00,.12,96]}/></mesh>
   <mesh geometry={bezel} material={materials.chrome} castShadow receiveShadow/>
   <mesh material={materials.gold} position={[0,0,.107]}><torusGeometry args={[.905,.033,12,96]}/></mesh>
   <mesh geometry={enamel} castShadow receiveShadow><meshPhysicalMaterial map={texture} color="#ffffff" metalness={.12} roughness={.23} clearcoat={1} clearcoatRoughness={.09}/></mesh>
   {Array.from({length:4},(_,i)=>{
    const a=Math.PI/4+i*TAU/4;return <FaceScrew key={i} position={[Math.cos(a)*.76,Math.sin(a)*.76,.126]} scale={.45} materials={materials}/>;
   })}
  </group>
 </group>;
}
