import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {cabinetIncline} from './paths.js';
import {bakeSculptureArtworkUV,createSculptureArtworkMaterial,useSculptureArtworkTexture} from './sculpture-surface-artwork.js';
import image014 from '../material-study/assets/reference-asteroids/DECOR-014-surface.png';
import image015 from '../material-study/assets/reference-asteroids/DECOR-015-surface.png';
import image016 from '../material-study/assets/reference-asteroids/DECOR-016-surface.png';
import image017 from '../material-study/assets/reference-asteroids/DECOR-017-surface.png';
import image018 from '../material-study/assets/reference-asteroids/DECOR-018-surface.png';
import image019 from '../material-study/assets/reference-asteroids/DECOR-019-surface.png';
import image020 from '../material-study/assets/reference-asteroids/DECOR-020-surface.png';
import image021 from '../material-study/assets/reference-asteroids/DECOR-021-surface.png';
const ASSETS={
 'DECOR-014':{url:image014,crop:[99, 1203, 54, 70]},
 'DECOR-015':{url:image015,crop:[224, 156, 44, 44]},
 'DECOR-016':{url:image016,crop:[337, 143, 38, 38]},
 'DECOR-017':{url:image017,crop:[237, 274, 52, 52]},
 'DECOR-018':{url:image018,crop:[1012, 147, 36, 36]},
 'DECOR-019':{url:image019,crop:[1010, 323, 52, 52]},
 'DECOR-020':{url:image020,crop:[175, 552, 38, 38]},
 'DECOR-021':{url:image021,crop:[1121, 586, 44, 44]}
};

/** Only UV/material clones: source vertices, normal relief, pose and mounts stay. */
export default function ReferenceAsteroidSurface({artworkId,geometry,material,position,rotation=[0,0,0],scale=[1,1,1],...meshProps}) {
 const asset=ASSETS[artworkId],texture=useSculptureArtworkTexture(asset.url);
 const poseKey=[...position,...rotation,...scale].join(',');
 const surfaceGeometry=useMemo(()=>{
  const model=new THREE.Matrix4().makeRotationX(cabinetIncline).multiply(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale)));
  return bakeSculptureArtworkUV(geometry.clone(),model,asset.crop);
 },[geometry,poseKey,asset]);
 const surfaceMaterial=useMemo(()=>{
  const native=material.clone();
  // The old generic crater SVG used spherical UVs; retain real native relief
  // and pigment at masked edges, without stretching that obsolete artwork.
  native.map=null;
  // The removed SVG used to darken the pale source paint. A navy-gray native
  // base keeps uncovered limbs and the 10% physical contribution restrained.
  native.color.set('#4c5268');native.envMapIntensity=.25;
  const result=createSculptureArtworkMaterial(native,texture,{key:artworkId,crop:asset.crop,blend:.90});native.dispose();return result;
 },[material,texture,asset,artworkId]);
 useEffect(()=>()=>surfaceGeometry.dispose(),[surfaceGeometry]);
 useEffect(()=>()=>surfaceMaterial.dispose(),[surfaceMaterial]);
 return <mesh geometry={surfaceGeometry} material={surfaceMaterial} position={position} rotation={rotation} scale={scale} {...meshProps}/>;
}
