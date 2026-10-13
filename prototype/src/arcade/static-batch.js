import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function canBatch(mesh, root, allowMovingRoot) {
 if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh
  || !mesh.geometry?.isBufferGeometry || !mesh.geometry.getAttribute('position')
  || Array.isArray(mesh.material) || !mesh.material) return false;
 if (mesh.material.transparent || mesh.material.opacity < 1 || mesh.material.transmission > 0) return false;
 if (Object.values(mesh.geometry.morphAttributes).some(attributes => attributes.length)) return false;
 for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) {
  if (!ancestor.visible || ancestor.userData.staticBatch) return false;
  if (ancestor.userData.movingPart && (ancestor !== root || !allowMovingRoot)) return false;
  if (ancestor === root) break;
 }
 return true;
}

function transformedGeometry(mesh, matrix, colorSize) {
 const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
 geometry.applyMatrix4(matrix);
 if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
 const normalized = new THREE.BufferGeometry();
 const count = geometry.getAttribute('position').count;
 const reverse = matrix.determinant() < 0;
 const attributes = [['position', 3], ['normal', 3], ['uv', 2]];
 if (colorSize) attributes.push(['color', colorSize]);
 for (const [name, size] of attributes) {
  const source = geometry.getAttribute(name), values = new Float32Array(count * size);
  // Missing per-vertex pigment means neutral white, never a black multiplier.
  if (name === 'color') values.fill(1);
  if (source) {
   for (let vertex = 0; vertex < count; vertex++) {
    // Baking a mirrored transform also requires reversing triangle winding.
    const index = reverse && vertex % 3 ? vertex + (vertex % 3 === 1 ? 1 : -1) : vertex;
    const offset = vertex * size;
    values[offset] = source.getX(index);
    values[offset + 1] = source.getY(index);
    if (size >= 3) values[offset + 2] = source.getZ(index);
    if (size === 4) values[offset + 3] = source.getW(index);
   }
  }
  normalized.setAttribute(name, new THREE.BufferAttribute(values, size));
 }
 geometry.dispose();
 return normalized;
}

/** Merge fixed opaque parts while their React-owned sources retain ownership. */
export function createStaticBatch(root, {allowMovingRoot = false} = {}) {
 const group = new THREE.Group();
 group.name = 'opaque-static-cabinet-batches';
 group.userData.staticBatch = true;
 const originals = [], batches = [];
 const buckets = new Map();
 root.updateWorldMatrix(true, true);
 const inverse = root.matrixWorld.clone().invert();
 root.traverse(mesh => {
  if (!canBatch(mesh, root, allowMovingRoot)) return;
  const colorSize = mesh.material.vertexColors ? (mesh.geometry.getAttribute('color')?.itemSize ?? 3) : 0;
  // Keep RGB and RGBA layouts separate: alpha changes the material program.
  const key = `${mesh.material.uuid}:${Boolean(mesh.castShadow)}:${Boolean(mesh.receiveShadow)}:${colorSize}`;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(mesh);
 });
 for (const meshes of buckets.values()) {
  // A unique mesh already costs one draw call and needs no replacement.
  if (meshes.length < 2) continue;
  const colorSize = meshes[0].material.vertexColors ? (meshes[0].geometry.getAttribute('color')?.itemSize ?? 3) : 0;
  const copies = meshes.map(mesh => transformedGeometry(mesh,
   new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld), colorSize));
  let geometry;
  try {geometry = mergeGeometries(copies, false);}
  finally {copies.forEach(copy => copy.dispose());}
  if (!geometry) continue;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const batch = new THREE.Mesh(geometry, meshes[0].material);
  batch.name = `static-${meshes[0].material.name || meshes[0].material.type}`;
  batch.castShadow = meshes[0].castShadow;
  batch.receiveShadow = meshes[0].receiveShadow;
  group.add(batch);
  batches.push(batch);
  meshes.forEach(mesh => {
   originals.push({mesh, visible: mesh.visible});
   mesh.visible = false;
  });
 }
 root.add(group);
 let disposed = false;
 return {group, batches, originals, dispose() {
  if (disposed) return;
  disposed = true;
  root.remove(group);
  originals.forEach(({mesh, visible}) => {mesh.visible = visible;});
  batches.forEach(batch => batch.geometry.dispose());
 }};
}


/** Each actuator owns its local batch; independently moving descendants stay separate. */
export function createActuatorBatches(root) {
 const owners = [];
 root.traverse(object => {
  if (object.isGroup && object.userData.movingPart && !object.userData.staticBatch) owners.push(object);
 });
 const entries = owners.map(owner => ({owner, batch: createStaticBatch(owner, {allowMovingRoot: true})})).filter(entry => {
  if (entry.batch.batches.length) return true;
  entry.batch.dispose();
  return false;
 });
 return {
  entries,
  dispose() {for (let i = entries.length - 1; i >= 0; i--) entries[i].batch.dispose();},
 };
}
