import React, {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {createInventory} from './inventory.js';

const COLORS = ['#8d4fea', '#ffb51b', '#19b997', '#f16a86'];
const CAPACITY = 24;

export default function InventoryMarbles({plan, timeline, reducedMotion = false, onSnapshot}) {
  const inventory = useMemo(() => createInventory({reducedMotion, initialPlan: plan}), []);
  const meshes = useRef([]), dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(.165, 32, 24), []);
  const materials = useMemo(() => COLORS.map(color => new THREE.MeshPhysicalMaterial({color,
    metalness: .08, roughness: .14, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.15})), []);

  useEffect(() => {inventory.setPlan(plan);}, [inventory, plan]);
  useEffect(() => {inventory.setReducedMotion(reducedMotion);}, [inventory, reducedMotion]);
  useEffect(() => {
    const api = {snapshot: () => inventory.snapshot(), advanceForTest: seconds => {
      inventory.step(Math.max(0, Number(seconds) || 0));
      if (timeline) timeline.current.wheelAngle = inventory.wheelAngle;
      return inventory.snapshot();
    }};
    window.supplementMachine = api;
    return () => {if (window.supplementMachine === api) delete window.supplementMachine;};
  }, [inventory, timeline]);
  useEffect(() => () => {geometry.dispose(); materials.forEach(material => material.dispose());}, [geometry, materials]);

  useFrame((_, delta) => {
    inventory.step(Math.min(delta, .05));
    if (timeline) timeline.current.wheelAngle = inventory.wheelAngle;
    const counts = [0, 0, 0, 0];
    for (const body of inventory.bodies.values()) {
      if (!body.visible || counts[body.bin] >= CAPACITY) continue;
      dummy.position.copy(body.position);
      dummy.rotation.set(body.spin, body.spin * .45, 0);
      dummy.updateMatrix();
      meshes.current[body.bin]?.setMatrixAt(counts[body.bin]++, dummy.matrix);
    }
    meshes.current.forEach((mesh, bin) => {if (mesh) {mesh.count = counts[bin]; mesh.instanceMatrix.needsUpdate = true;}});
    onSnapshot?.(inventory.snapshot());
  });
  return <group>{materials.map((material, bin) => <instancedMesh key={bin}
    ref={mesh => {meshes.current[bin] = mesh; if (mesh) mesh.count = 0;}}
    args={[geometry, material, CAPACITY]} castShadow frustumCulled={false}/>)}</group>;
}
