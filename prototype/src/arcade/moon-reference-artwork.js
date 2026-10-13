import * as THREE from 'three';
import {useEffect,useMemo} from 'react';
import {useLoader} from '@react-three/fiber';
import {cabinetIncline} from './paths.js';

const CROP={x:0,y:1152,width:118,height:128};

/** Bake photographic artwork coordinates onto the existing lunar surface.
 * The source frame is fixed; these UVs are not recomputed from the live camera. */
export function bakeMoonArtworkUV(geometry,position) {
 const camera=new THREE.PerspectiveCamera(44.91222225679921,1212/1280,.1,200);
 camera.position.set(-.2,15.604580394897463,20.877141158459278);
 camera.lookAt(-.2,-3.398624385746219,-2.329927375785143);camera.updateMatrixWorld();
 const radius=1.1948857413347422;
 const model=new THREE.Matrix4().makeRotationX(cabinetIncline).multiply(new THREE.Matrix4().compose(
  new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,.20,0)),
  new THREE.Vector3(radius,radius*.95,radius*.97)));
 const cameraLocal=camera.position.clone().applyMatrix4(model.clone().invert());
 const positions=geometry.getAttribute('position'),uv=new Float32Array(positions.count*2),p=new THREE.Vector3(),view=new THREE.Vector3();
 for(let i=0;i<positions.count;i++){
  p.fromBufferAttribute(positions,i);
  // Unseen hemisphere retains the native material if a future view reveals it.
  if(p.dot(view.copy(cameraLocal).sub(p))<=0){uv[i*2]=-2;uv[i*2+1]=-2;continue;}
  p.applyMatrix4(model).project(camera);
  const x=(p.x+1)*606,y=(1-p.y)*640;
  uv[i*2]=(x-CROP.x)/CROP.width;uv[i*2+1]=1-(y-CROP.y)/CROP.height;
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}

// Cache only the source image; the mesh owns and disposes its GPU texture clone.
export function useMoonArtworkTexture(url) {
 const source=useLoader(THREE.TextureLoader,url);
 const texture=useMemo(()=>{
  const copy=source.clone();copy.colorSpace=THREE.SRGBColorSpace;
  copy.wrapS=copy.wrapT=THREE.ClampToEdgeWrapping;copy.anisotropy=8;
  copy.needsUpdate=true;return copy;
 },[source]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return texture;
}

/** Opaque physical mesh with moon-only photographic surface artwork.
 * Its conservative alpha mask controls the color blend, never mesh coverage.
 * Blend after tone mapping avoids relighting the already photographed detail. */
export function createMoonArtworkMaterial(source,texture) {
 const material=source.clone(),hook=source.onBeforeCompile,key=source.customProgramCacheKey.call(source);
 material.name='foreground-moon-reference-surface';
 material.onBeforeCompile=function(shader,renderer){
  hook.call(this,shader,renderer);
  shader.uniforms.moonArtwork={value:texture};
  shader.vertexShader='varying vec2 vMoonArtworkUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMoonArtworkUv=uv;');
  shader.fragmentShader='uniform sampler2D moonArtwork;\nvarying vec2 vMoonArtworkUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`#include <tonemapping_fragment>
   vec4 lunarArtwork=texture2D(moonArtwork,vMoonArtworkUv);
   vec2 lunarInside=smoothstep(vec2(0.),vec2(1./118.,1./128.),vMoonArtworkUv)
    *smoothstep(vec2(0.),vec2(1./118.,1./128.),vec2(1.)-vMoonArtworkUv);
   float lunarCoverage=lunarArtwork.a*lunarInside.x*lunarInside.y*.92;
   gl_FragColor.rgb=mix(gl_FragColor.rgb,lunarArtwork.rgb,lunarCoverage);
  `);
 };
 material.customProgramCacheKey=()=>`${key}|foreground-moon-reference-artwork-v1`;
 return material;
}
