import React,{useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import contactUrl from './assets/static-playfield-contact.png';

// Offline contact occlusion from fixed cabinet geometry only. The receiver is
// this one floor plane; moving cups, gates, drawers and marbles never enter it.
export default function StaticPlayfield({material}) {
 const source=useTexture(contactUrl);
 const contact=useMemo(()=>{
  const map=source.clone();map.name='offline-fixed-playfield-contact';
  map.colorSpace=THREE.NoColorSpace;map.channel=0;map.flipY=true;
  map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.needsUpdate=true;return map;
 },[source]);
 const finish=useMemo(()=>{
  const clone=material.clone();clone.name='playfield-with-fixed-contact';
  clone.aoMap=contact;clone.aoMapIntensity=.40;return clone;
 },[material,contact]);
 useEffect(()=>()=>{finish.dispose();contact.dispose();},[finish,contact]);
 // UV(0,1) is cabinet (-8.448,.081,-9.96) after the existing Shell X scale.
 // PNG row zero is therefore the rear edge; the native plane UVs are retained.
 return <mesh position={[0,.081,-2.94]} rotation={[-Math.PI/2,0,0]} receiveShadow name="printed-celestial-enamel">
  <planeGeometry args={[15.36,14.04]}/><primitive object={finish} attach="material"/>
 </mesh>;
}
