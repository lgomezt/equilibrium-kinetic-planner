import React,{useLayoutEffect} from 'react';
import {Html} from '@react-three/drei';
import {useThree} from '@react-three/fiber';

function OverlayContents({children,onReady,viewport}) {
 // The Html parent refs commit after their children. Position the printed UI
 // on the next frame, including when a demand-rendered cabinet is resized.
 useLayoutEffect(()=>{
  onReady();
  const frame=requestAnimationFrame(()=>onReady());
  return()=>cancelAnimationFrame(frame);
 },[children,onReady,viewport]);
 return children;
}

export default function Overlay({children,position,rotation=[-Math.PI/2,0,0],distanceFactor=10}) {
 const invalidate=useThree(state=>state.invalidate);
 const viewport=useThree(state=>`${state.size.width}:${state.size.height}`);
 return children?<Html name="projected-cabinet-ui" wrapperClass="arcade-projected-overlay" transform center position={position} rotation={rotation} distanceFactor={distanceFactor} zIndexRange={[10,0]} style={{pointerEvents:'auto'}}><OverlayContents onReady={invalidate} viewport={viewport}>{children}</OverlayContents></Html>:null;
}
