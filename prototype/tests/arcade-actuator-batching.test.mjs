import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStaticBatch,createActuatorBatches} from '../src/arcade/static-batch.js';

function moving(name,parent) {
 const group=new THREE.Group();group.name=name;group.userData.movingPart=true;parent.add(group);return group;
}

function part(parent,material,x,mirrored=false) {
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute([1,0,0,.2,0,1,0,.5,0,0,1,.8],4));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);mesh.position.x=x;mesh.scale.x=mirrored?-1:1;parent.add(mesh);return mesh;
}

function worldVertices(meshes) {
 const vertex=new THREE.Vector3();
 return meshes.flatMap(mesh=>{
  const points=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv'),color=mesh.geometry.getAttribute('color');
  return Array.from({length:points.count},(_,i)=>{
   vertex.fromBufferAttribute(points,i).applyMatrix4(mesh.matrixWorld);
   return [...vertex,uv.getX(i),uv.getY(i),...Array.from({length:color.itemSize},(_,c)=>color.array[i*color.itemSize+c])];
  });
 }).sort((a,b)=>{for(let i=0;i<a.length;i++){if(Math.abs(a[i]-b[i])>1e-6)return a[i]-b[i];}return 0;});
}

test('local batches follow independent wheel, counterweighted cup and hatch poses with identical world vertices and pigments',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({vertexColors:true});
 root.rotation.x=.1;
 const wheel=moving('wheel',root),cup=moving('cup',wheel),hatch=moving('hatch',root);
 wheel.position.set(4,2,3);wheel.rotation.x=-.65;cup.position.set(0,-1.264,0);hatch.position.set(-5,.3,7.1);
 const owners=[wheel,cup,hatch],sources=owners.map(owner=>[part(owner,material,-.4),part(owner,material,.6,true)]);
 const fixed=[part(root,material,-3),part(root,material,-1)];
 const staticBatch=createStaticBatch(root),local=createActuatorBatches(root);
 assert.equal(staticBatch.originals.length,2);
 assert.equal(local.entries.length,3);
 assert.deepEqual(local.entries.map(entry=>entry.batch.originals.length),[2,2,2]);
 assert.equal(cup.parent,wheel);assert.equal(wheel.parent,root);assert.equal(hatch.parent,root);
 for(const angle of [0,.42,1.7,Math.PI*2]) {
  wheel.rotation.z=angle;cup.rotation.z=-angle;hatch.rotation.x=angle*.15;hatch.position.y=.3-angle*.07;
  root.updateMatrixWorld(true);
  owners.forEach((owner,index)=>{
   const entry=local.entries.find(entry=>entry.owner===owner);
   const expected=worldVertices(sources[index]),actual=worldVertices(entry.batch.batches);
   assert.equal(actual.length,expected.length);
   for(let i=0;i<actual.length;i++)for(let j=0;j<actual[i].length;j++)assert.ok(Math.abs(actual[i][j]-expected[i][j])<1e-6,`${owner.name} pose ${angle}, vertex ${i}, component ${j}`);
  });
 }
 const generated=local.entries.flatMap(entry=>entry.batch.batches);
 let generatedDisposed=0,sourceDisposed=0,materialDisposed=0;
 generated.forEach(mesh=>mesh.geometry.addEventListener('dispose',()=>generatedDisposed++));
 sources.flat().forEach(mesh=>mesh.geometry.addEventListener('dispose',()=>sourceDisposed++));
 material.addEventListener('dispose',()=>materialDisposed++);
 local.dispose();local.dispose();staticBatch.dispose();
 assert.equal(generatedDisposed,3);assert.equal(sourceDisposed,0);assert.equal(materialDisposed,0);
 assert.ok(sources.flat().every(mesh=>mesh.visible));assert.equal(cup.parent,wheel);
 assert.deepEqual(owners.map(owner=>owner.children.length),[3,2,2]);
 [...sources.flat(),...fixed].forEach(mesh=>mesh.geometry.dispose());material.dispose();
});

test('local batching retains transparent, hidden and independently moving descendant ownership',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),glass=new THREE.MeshStandardMaterial({transparent:true,opacity:.5});
 const owner=moving('parent',root),child=moving('independent',owner),hidden=new THREE.Group();hidden.visible=false;owner.add(hidden);
 const opaque=[part(owner,material,0),part(owner,material,1)];
 const transparent=[part(owner,glass,2),part(owner,glass,3)];
 const hiddenParts=[part(hidden,material,0),part(hidden,material,1)];
 const childParts=[part(child,material,0),part(child,material,1)];
 const local=createActuatorBatches(root);
 assert.equal(local.entries[0].batch.originals.length,2);
 assert.equal(local.entries[1].batch.originals.length,2);
 assert.ok(transparent.every(mesh=>mesh.visible));assert.ok(hiddenParts.every(mesh=>mesh.visible));assert.equal(hidden.visible,false);
 assert.ok(opaque.every(mesh=>!mesh.visible));assert.ok(childParts.every(mesh=>!mesh.visible));
 child.visible=false;assert.equal(local.entries[1].batch.group.parent.visible,false);
 local.dispose();assert.equal(child.visible,false);assert.equal(hidden.visible,false);
 [...opaque,...transparent,...hiddenParts,...childParts].forEach(mesh=>mesh.geometry.dispose());material.dispose();glass.dispose();
});
