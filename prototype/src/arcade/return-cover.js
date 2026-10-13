import * as THREE from 'three';
import {binCenters,returnCurve,returnChannelZ} from './paths.js';

// Outward-facing physical cover. The ports and all vertices are unchanged.
export function createReturnCoverGeometry() {
  const positions=[],indices=[],length=returnCurve.getLength(),steps=560,archSteps=40;
  const section=[[.40,-.32],[.40,.13]];
  for(let i=1;i<=archSteps;i++){
   const a=i*Math.PI/archSteps;section.push([.40*Math.cos(a),.13+.25*Math.sin(a)]);
  }
  section.push([-.40,-.32],[.40,-.32]);
  const stride=section.length;
  for(let i=0;i<=steps;i++){
   const u=i/steps,p=returnCurve.getPointAt(u),t=returnCurve.getTangentAt(u),n=new THREE.Vector3(-t.z,0,t.x).normalize();
   for(const [side,height]of section){const q=p.clone().addScaledVector(n,side);q.y+=height;positions.push(q.x,q.y,q.z);}
  }
  for(let i=0;i<steps;i++){
   const u=(i+.5)/steps,p=returnCurve.getPointAt(u);
   if((1-(i+1)/steps)*length<.75)continue;
   const inlet=binCenters.slice(1).some(x=>Math.abs(p.x-x)<.66&&Math.abs(p.z-returnChannelZ)<.10);
   for(let column=0;column<stride-1;column++){
    // Keep the front glazing and crown continuous; only the rear flank
    // opens around the physical incoming sphere envelope.
    const rearPort=section[column][0]<-.22&&section[column+1][0]<-.22;
    if(inlet&&rearPort)continue;
    const a=i*stride+column,b=(i+1)*stride+column;
    indices.push(a,b,a+1,a+1,b,b+1);
   }
  }
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setIndex(indices);result.computeVertexNormals();return result;
}
