import {useEffect,useMemo} from 'react';
import {useLoader} from '@react-three/fiber';
import * as THREE from 'three';

/** Fixed photographic surface coordinates, attached to real static geometry.
 * model includes all object/parent transforms; crop is source x,y,width,height. */
export function bakeSculptureArtworkUV(geometry,model,crop) {
 const camera=new THREE.PerspectiveCamera(44.91222225679921,1212/1280,.1,200);
 camera.position.set(-.2,15.604580394897463,20.877141158459278);
 camera.lookAt(-.2,-3.398624385746219,-2.329927375785143);camera.updateMatrixWorld();
 const cameraLocal=camera.position.clone().applyMatrix4(model.clone().invert());
 const positions=geometry.getAttribute('position'),uv=new Float32Array(positions.count*2),p=new THREE.Vector3(),view=new THREE.Vector3();
 for(let i=0;i<positions.count;i++){
  p.fromBufferAttribute(positions,i);
  // Origin-centered rounded sculpture: unseen hemisphere keeps native material.
  if(p.dot(view.copy(cameraLocal).sub(p))<=0){uv[i*2]=-2;uv[i*2+1]=-2;continue;}
  p.applyMatrix4(model).project(camera);
  uv[i*2]=((p.x+1)*606-crop[0])/crop[2];
  uv[i*2+1]=1-((1-p.y)*640-crop[1])/crop[3];
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}

export function useSculptureArtworkTexture(url) {
 const source=useLoader(THREE.TextureLoader,url);
 const texture=useMemo(()=>{
  const copy=source.clone();copy.colorSpace=THREE.SRGBColorSpace;
  copy.wrapS=copy.wrapT=THREE.ClampToEdgeWrapping;copy.anisotropy=8;
  copy.needsUpdate=true;return copy;
 },[source]);
 useEffect(()=>()=>texture.dispose(),[texture]);return texture;
}

/** Alpha masks only surface color; depth, coverage, shadows and motion stay real. */
export function createSculptureArtworkMaterial(source,texture,{key,crop,blend=.90}) {
 const material=source.clone(),hook=source.onBeforeCompile,originalKey=source.customProgramCacheKey.call(source);
 material.name=`${key}-reference-surface`;
 material.onBeforeCompile=function(shader,renderer){
  hook.call(this,shader,renderer);
  Object.assign(shader.uniforms,{sculptureArtwork:{value:texture},sculptureTexel:{value:new THREE.Vector2(1/crop[2],1/crop[3])},sculptureBlend:{value:blend}});
  shader.vertexShader='varying vec2 vSculptureArtworkUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvSculptureArtworkUv=uv;');
  shader.fragmentShader='uniform sampler2D sculptureArtwork;\nuniform vec2 sculptureTexel;\nuniform float sculptureBlend;\nvarying vec2 vSculptureArtworkUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`#include <tonemapping_fragment>
   vec4 sculptureColor=texture2D(sculptureArtwork,vSculptureArtworkUv);
   vec2 sculptureInside=smoothstep(vec2(0.),sculptureTexel,vSculptureArtworkUv)
    *smoothstep(vec2(0.),sculptureTexel,vec2(1.)-vSculptureArtworkUv);
   gl_FragColor.rgb=mix(gl_FragColor.rgb,sculptureColor.rgb,sculptureColor.a*sculptureInside.x*sculptureInside.y*sculptureBlend);
  `);
 };
 material.customProgramCacheKey=()=>`${originalKey}|sculpture-reference-surface-v1|${key}`;
 return material;
}
