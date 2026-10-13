import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import stars from './screenprint-stars.json';

// Thin metallic ink is attached to the cabinet deck. The traced star contours
// are unprojected once into the calibrated cabinet, so responsive views retain
// physical perspective rather than using a screen-space decorative overlay.
export default function ReferenceScreenprint(){
 const {geometries,ink}=useMemo(()=>{
  const geometries=stars.map(({height,points})=>{
   const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
   const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.translate(0,height,0);return geometry;
  });
  const ink=new THREE.MeshPhysicalMaterial({color:'#efbe53',metalness:.13,roughness:.55,emissive:'#b8690e',emissiveIntensity:.12,envMapIntensity:.14});
  return {geometries,ink};
 },[]);
 useEffect(()=>()=>{geometries.forEach(g=>g.dispose());ink.dispose();},[geometries,ink]);
 return <group name="reference-positioned-celestial-screenprint">{geometries.map((geometry,i)=><mesh key={i} geometry={geometry} material={ink} receiveShadow/>)}</group>;
}
