import React,{Component,Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {ContactShadows,Environment} from '@react-three/drei';
import * as THREE from 'three';
import {createStudioEnvironment,useArcadeMaterials} from '../material-study/materials.js';
import Cabinet from './Cabinet.jsx';
import ArcadeMarbles from './ArcadeMarbles.jsx';
import StaticBatch from './StaticBatch.jsx';
import CabinetReflections from './CabinetReflections.jsx';
import {cabinetIncline} from './paths.js';
import {createProjectionReadiness,readOverlayProjection} from './projection-readiness.js';

function FallbackView({overlays}) {
 return <div className="arcade-fallback">
  <div>{overlays.marquee}</div>
  <p>The blend is available in a simple view.</p>
  <div className="arcade-fallback-controls">{overlays.controls}</div>
  <div className="arcade-fallback-labels">{overlays.labels}</div>
  {overlays.footer}
 </div>;
}

class SceneBoundary extends Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<FallbackView overlays={this.props.overlays}/>:this.props.children;}
}

function StudioProbe() {
 const get=useThree(state=>state.get);
 useEffect(()=>{
  if(!import.meta.env.DEV)return;
  window.__equilibriumStudio={get,THREE};
  return()=>{delete window.__equilibriumStudio;};
 },[get]);
 return null;
}

function CameraRig() {
 const {camera,size,invalidate}=useThree();
 const width=size.width,height=size.height;
 useLayoutEffect(()=>{
  // Calibrated to deliberate 1212 × 1280 portrait anchors. Foreground cabinet
  // and peripheral props can cross the frame, as in the source composition.
  // Geometry/material changes must not silently move the viewer's camera.
  const referenceAspect=1212/1280;
  const referenceFov=44.91222225679921;
  const aspect=width/height;
  const fit=Math.max(1,referenceAspect/aspect);
  camera.aspect=aspect;
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(referenceFov)/2)*fit));
  camera.zoom=1;
  camera.position.set(-.2,15.604580394897463,20.877141158459278);
  camera.lookAt(-.2,-3.398624385746219,-2.329927375785143);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  invalidate();
 },[camera,width,height,invalidate]);
 return null;
}

function RenderReadiness({onReady}) {
 const {gl,scene,size,invalidate}=useThree();
 const tracker=useMemo(createProjectionReadiness,[]);
 const settled=useRef(false),pending=useRef(null),renderedFrames=useRef(0);
 useLayoutEffect(()=>{
  settled.current=false;renderedFrames.current=0;tracker.reset();onReady(false);
  invalidate();
  return()=>{if(pending.current!==null)cancelAnimationFrame(pending.current);pending.current=null;};
 },[gl,scene,size.width,size.height,invalidate,onReady,tracker]);
 useFrame(()=>{
  if(settled.current)return;
  renderedFrames.current++;
  if(pending.current!==null)return;
  // This callback runs after the current Three render and Html frame handlers.
  // Keep demand frames alive until both separately committed DOM layers agree.
  pending.current=requestAnimationFrame(()=>{
   pending.current=null;
   let expected=0;
   scene.traverse(object=>{if(object.name==='projected-cabinet-ui')expected++;});
   const container=gl.domElement.closest('.arcade-canvas');
   const signature=readOverlayProjection(container,expected,size,document.fonts?.status!=='loading');
   if(tracker.observe(signature)&&renderedFrames.current>=2){settled.current=true;onReady(true);}
   else invalidate();
  });
 });
 return null;
}

function Scene({plan,reducedMotion,staticStudy,overlays,onReady,onActivityChange}) {
 const studioEnvironment=useMemo(createStudioEnvironment,[]);
 const base=useArcadeMaterials(true,studioEnvironment);
 useEffect(()=>()=>studioEnvironment.dispose(),[studioEnvironment]);
 // Derived bin panes and the physical return cover set their own opacity.
 // These redundant rail floors must not alpha-blend over that clear cover.
 const glass=useMemo(()=>new THREE.MeshPhysicalMaterial({color:'#b9d9e8',transparent:true,opacity:0,roughness:.14,metalness:.03,clearcoat:.5,depthWrite:false,envMapIntensity:.45}),[]);
 useEffect(()=>()=>glass.dispose(),[glass]);
 const materials=useMemo(()=>({...base,glass}),[base,glass]);
 const wheelRef=useRef(),cupRefs=useRef([]),gateRefs=useRef([]),doorRefs=useRef([]),frontHatchRefs=useRef([]),launchGateRefs=useRef([]);
 const cabinetRootRef=useRef();
 return <>
  <CameraRig/>
  <StudioProbe/>
  <ambientLight color="#cbd2df" intensity={.42}/>
  <directionalLight position={[-9,16,10]} color="#ffead2" intensity={2.35} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={3} shadow-camera-far={44} shadow-normalBias={.004} shadow-bias={-.00008} shadow-radius={4}/>
  <directionalLight position={[10,8,-8]} color="#b9cfff" intensity={.38}/>
  <pointLight position={[-7,3,-5]} color="#ffa943" intensity={4.5} distance={7} decay={2}/>
  <pointLight position={[7,3,-1]} color="#ffbe66" intensity={4} distance={7} decay={2}/>
  <pointLight position={[0,2,6]} color="#ffd695" intensity={3.5} distance={6} decay={2}/>
  <Environment map={studioEnvironment}/>
  <group rotation={[cabinetIncline,0,0]} name="equilibrium-pinball-machine">
   <group ref={cabinetRootRef}><Cabinet materials={materials} overlays={overlays} plan={plan} wheelRef={wheelRef} cupRefs={cupRefs} gateRefs={gateRefs} doorRefs={doorRefs} frontHatchRefs={frontHatchRefs} launchGateRefs={launchGateRefs}/></group>
   <StaticBatch rootRef={cabinetRootRef}/>
   <ArcadeMarbles plan={plan} reducedMotion={reducedMotion} staticStudy={staticStudy} onActivityChange={onActivityChange} materials={materials} wheelRef={wheelRef} cupRefs={cupRefs} gateRefs={gateRefs} doorRefs={doorRefs} frontHatchRefs={frontHatchRefs} launchGateRefs={launchGateRefs}/>
  </group>
  <CabinetReflections materials={materials}/>
  <RenderReadiness onReady={onReady}/>
  <ContactShadows position={[0,-3.1,0]} scale={32} far={5} blur={3.2} opacity={.48} resolution={512} frames={1}/>
 </>;
}

export default function ArcadeScene({plan=[],reducedMotion=false,overlays={},staticStudy=false}) {
 const [ready,setReady]=useState(false);
 const [animating,setAnimating]=useState(false);
 const markReady=React.useCallback(value=>setReady(value),[]);
 const markActivity=React.useCallback(active=>setAnimating(active),[]);
 return <SceneBoundary overlays={overlays}>
  <div className="arcade-canvas" data-cabinet-ready={ready} role="region" aria-label="Equilibrium pinball cabinet and planner controls">
   <Canvas shadows="percentage" frameloop={animating&&!reducedMotion&&!staticStudy?'always':'demand'} dpr={[1,1.5]} camera={{position:[0,18,22],fov:35,near:.1,far:120}} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}}>
    <Suspense fallback={null}><Scene plan={plan} reducedMotion={reducedMotion} staticStudy={staticStudy} overlays={overlays} onReady={markReady} onActivityChange={markActivity}/></Suspense>
   </Canvas>
   {!ready&&<p className="arcade-loading" role="status">A little arcade magic is on its way…</p>}
  </div>
 </SceneBoundary>;
}
