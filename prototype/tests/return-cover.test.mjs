import test from 'node:test';
import assert from 'node:assert/strict';
import {FrontSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {createReturnCoverGeometry} from '../src/arcade/return-cover.js';
import {binCenters,returnChannelZ,returnCurve} from '../src/arcade/paths.js';

test('return cover presents its outside front, crown, rear and floor to incident rays',()=>{
 const geometry=createReturnCoverGeometry(),material=new MeshBasicMaterial({side:FrontSide});
 const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld(true);
 let checks=0;
 // These rays exercise actual rendered triangles with one-sided culling,
 // including curved elbows. Reversing the mesh winding makes them miss or
 // strike the opposite wall, even though vertices/bounds remain identical.
 for(const u of [.025,.06,.12,.2,.28,.37,.46,.55,.65,.74,.84,.92]){
  const p=returnCurve.getPointAt(u),t=returnCurve.getTangentAt(u);
  const side=new Vector3(-t.z,0,t.x).normalize();
  const rearPort=binCenters.slice(1).some(x=>Math.abs(p.x-x)<.70&&Math.abs(p.z-returnChannelZ)<.12);
  const faces=[{d:side,offset:.40,y:.03},{d:new Vector3(0,1,0),offset:.38,y:0},{d:new Vector3(0,-1,0),offset:.32,y:0}];
  if(!rearPort)faces.push({d:side.clone().negate(),offset:.40,y:.03});
  for(const{d,offset,y}of faces){
   const center=p.clone().add(new Vector3(0,y,0)),expected=center.clone().addScaledVector(d,offset);
   const ray=new Raycaster(center.clone().addScaledVector(d,.65),d.clone().negate(),0,.4);
   const hit=ray.intersectObject(mesh)[0];
   assert.ok(hit,`outside cover missing at station ${u}, direction ${d.toArray()}`);
   assert.ok(hit.point.distanceTo(expected)<.025,`ray struck opposite face at station ${u}`);
   assert.ok(hit.face.normal.dot(d)>.5,`inward surface at station ${u}`);checks++;
  }
 }
 assert.ok(checks>=40);
 geometry.dispose();material.dispose();
});
