import * as THREE from 'three';

/** Camera-plane ellipsoid correction for the immutable foreground moon.
 * It fits only the measured lunar silhouette; depth remains unchanged.
 * This is a real affine mesh deformation, never a fragment/alpha silhouette. */
export function createMoonReferenceFitMatrix(model,camera) {
 const scaleX=.8709764903177718,scaleY=1;
 const shearXY=.3149513715247254,translateX=11.564696495470873,translateY=8.85180001712887;
 const widthHalf=606,heightHalf=640,anchorY=1252;
 const pixelOffsetY=anchorY*(1-scaleY)+translateY;
 const clipOffsetX=(widthHalf*(scaleX-1)+shearXY*(heightHalf-anchorY)+translateX)/widthHalf;
 const clipOffsetY=(heightHalf*(1-scaleY)-pixelOffsetY)/heightHalf;
 const clipCorrection=new THREE.Matrix4().set(
  scaleX,-shearXY*heightHalf/widthHalf,0,clipOffsetX,
  0,scaleY,0,clipOffsetY,
  0,0,1,0,
  0,0,0,1);
 const projection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(model);
 return projection.clone().invert().multiply(clipCorrection).multiply(projection);
}
