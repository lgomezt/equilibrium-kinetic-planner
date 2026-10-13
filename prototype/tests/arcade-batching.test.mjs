import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStaticBatch} from '../src/arcade/static-batch.js';

function triangle(colors, size=3) {
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
 if(colors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,size));
 geometry.computeVertexNormals();return geometry;
}

test('opaque batching retains crater pigments through mirrored geometry and restores source ownership',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({vertexColors:true});
 const painted=new THREE.Mesh(triangle([1,0,0,0,1,0,0,0,1]),material);
 painted.scale.x=-1;painted.position.x=4;
 const plain=new THREE.Mesh(triangle(),material);root.add(painted,plain);
 const batch=createStaticBatch(root);assert.equal(batch.batches.length,1);
 const mesh=batch.batches[0],colors=mesh.geometry.getAttribute('color'),points=mesh.geometry.getAttribute('position');
 assert.deepEqual(Array.from(colors.array),[1,0,0,0,0,1,0,1,0,1,1,1,1,1,1,1,1,1]);
 assert.deepEqual(Array.from(points.array).slice(0,9),[4,0,0,4,1,0,3,0,0]);
 assert.equal(painted.visible,false);assert.equal(plain.visible,false);
 let disposed=false;mesh.geometry.addEventListener('dispose',()=>{disposed=true});batch.dispose();
 assert.equal(disposed,true);assert.equal(painted.visible,true);assert.equal(plain.visible,true);
 assert.equal(root.children.length,2);assert.ok(painted.geometry.getAttribute('color'));
 painted.geometry.dispose();plain.geometry.dispose();material.dispose();
});

test('RGBA pigments retain alpha and are batched separately from RGB pigments',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({vertexColors:true});
 const rgba=[1,0,0,.25,0,1,0,.5,0,0,1,.75];
 for(let i=0;i<2;i++)root.add(new THREE.Mesh(triangle(rgba,4),material));
 for(let i=0;i<2;i++)root.add(new THREE.Mesh(triangle([1,0,0,0,1,0,0,0,1]),material));
 const batch=createStaticBatch(root);assert.equal(batch.batches.length,2);
 const colored=batch.batches.find(mesh=>mesh.geometry.getAttribute('color').itemSize===4);
 assert.deepEqual(Array.from(colored.geometry.getAttribute('color').array),[...rgba,...rgba]);
 batch.dispose();root.children.forEach(mesh=>mesh.geometry.dispose());material.dispose();
});
