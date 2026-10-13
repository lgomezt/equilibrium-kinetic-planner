import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {createSphereEnvironment} from '../material-study/materials.js';
import {createMechanicalInventory} from './mechanical-inventory.js';
import {poseFrontHatch} from './front-hatch.js';
import {ballRadius, binCenters, durations, feedCurves, heapPosition, mainCurve, returnCurve, returnDropCurve, wheelCupPosition} from './paths.js';

const CAPACITY = 24;
const SPARE_COLOR = '#a5acb4';
const STUDY_WHEEL_ANGLE = 0;
// Illustrative colors follow the reference: orange north, green south.
const STUDY_CUP_ANGLES = [Math.PI / 3, 5 * Math.PI / 3, 0, Math.PI, 2 * Math.PI / 3, 4 * Math.PI / 3];
// Nearest on-curve fits to the reference under the locked 1212×1280 camera.
// Green is still on its feed; purple has no main pose and orange has two.
const STUDY_FEED_PROGRESS = [[], [], [0.773812320233532], [], [], []];
const STUDY_TRACK_PROGRESS = [[], [0.33037359987372594], [], [0.1968715247065383, 0.49742657621737874], [0.6073767010608522], [0.6822763650745354]];
const STUDY_RETURN_PROGRESS = [[0.050137520352, 0.108499150669, 0.720626930456, 0.42804951338], [0.074617181868, 0.156188008451], [0.177506993927], [0.236963426948], [0.272560747245, 0.331885069669, 0.740137418693], [0.347444937762]];
const STUDY_DROP_POSES = [null, {"sourceSlot": 1, "progress": 0.696930020830594}, null, {"sourceSlot": 1, "progress": 0.6958981144163836}, null, null];
// A second existing token per open bin is farther down the same real chute.
const STUDY_FALLING_POSES = [null, {"sourceSlot": 1, "progress": 0.8427399687529109}, null, {"sourceSlot": 1, "progress": 0.8363760984568533}, null, null];
const STUDY_DROP_TOKEN_SLOTS = STUDY_DROP_POSES.map((pose, bin) => pose
 ? 2 + STUDY_FEED_PROGRESS[bin].length + STUDY_TRACK_PROGRESS[bin].length : null);
const STUDY_FALLING_TOKEN_SLOTS = STUDY_FALLING_POSES.map((pose, bin) => pose
 ? STUDY_DROP_TOKEN_SLOTS[bin] + 1 + STUDY_RETURN_PROGRESS[bin].length : null);
const studyDropAngle = pose => {
 if (!pose) return 0;
 // Return curves use linear timeline progress. Match the native door timing.
 const age = pose.progress * durations.returnDrop;
 return Math.PI / 2 * Math.min(1, age / .18,
  Math.max(0, (durations.returnDrop + .18 - age) / .18));
};
const STUDY_HATCH_ANGLES = STUDY_DROP_POSES.map(studyDropAngle);
const STUDY_FALLING_HATCH_ANGLES = STUDY_FALLING_POSES.map(studyDropAngle);

// Repose existing sample tokens only. Each bin reserves its own staged count,
// then fills supported heap slots from zero without gaps or duplicate tokens.
function createStudyPositions() {
 return binCenters.map((_, bin) => {
  const drop = STUDY_DROP_POSES[bin], falling = STUDY_FALLING_POSES[bin];
  const staged = [feedCurves[bin].getPointAt(0), wheelCupPosition(STUDY_CUP_ANGLES[bin]),
   ...STUDY_FEED_PROGRESS[bin].map(u => feedCurves[bin].getPointAt(u)),
   ...STUDY_TRACK_PROGRESS[bin].map(u => mainCurve.getPointAt(u)),
   ...(drop ? [returnDropCurve(bin, heapPosition(bin, drop.sourceSlot)).getPointAt(drop.progress)] : []),
   ...STUDY_RETURN_PROGRESS[bin].map(u => returnCurve.getPointAt(u)),
   ...(falling ? [returnDropCurve(bin, heapPosition(bin, falling.sourceSlot)).getPointAt(falling.progress)] : [])];
  return Array.from({length: CAPACITY}, (_, slot) =>
   slot < staged.length ? staged[slot] : heapPosition(bin, slot - staged.length));
 });
}

/** Connect the existing planner's portions to the cabinet's presentation inventory. */
export default function ArcadeMarbles({plan, reducedMotion = false, staticStudy = false,onActivityChange,
 materials, wheelRef, cupRefs, launchGateRefs, gateRefs, doorRefs, frontHatchRefs}) {
 const invalidate=useThree(state=>state.invalidate);
 const inventory = useMemo(() => createMechanicalInventory({
  initialPlan: {entries: plan}, reducedMotion: reducedMotion || staticStudy,
 }), []);
 const playing=useRef(false);
 const syncPlayback=useCallback(()=>{
  const next=inventory.hasWork&&!document.hidden;
  if(playing.current!==next){playing.current=next;onActivityChange?.(next);}
 },[inventory,onActivityChange]);
 useEffect(()=>{
  const syncVisibility=()=>{syncPlayback();invalidate();};
  document.addEventListener('visibilitychange',syncVisibility);
  return()=>document.removeEventListener('visibilitychange',syncVisibility);
 },[syncPlayback,invalidate]);
 const meshes = useRef([]), logicalBins = useRef(plan.length);
 const transform = useMemo(() => new THREE.Object3D(), []);
 const studyPositions = useMemo(() => staticStudy ? createStudyPositions() : null, [staticStudy]);
 const geometry = useMemo(() => new THREE.SphereGeometry(ballRadius, 32, 24), []);
 const sphereEnvironment=useMemo(createSphereEnvironment,[]);
 const marbleMaterials = useMemo(() => binCenters.map(() => {
  // Opaque enamel: compact clearcoat reflections over the catalog-colored body.
  const material = materials?.purple?.clone() ?? new THREE.MeshPhysicalMaterial({
   metalness: 0, ior: 1.46, specularIntensity: .95,
  });
  material.setValues({envMap:sphereEnvironment,roughness:.15,clearcoat:.55,clearcoatRoughness:.08,envMapIntensity:.55});
  material.color.set(SPARE_COLOR);
  return material;
 }), [sphereEnvironment]);
 const setMeshRefs = useMemo(() => binCenters.map((_, bin) => mesh => {
  meshes.current[bin] = mesh;
  if (mesh) {
   mesh.count = 0;
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
 }), []);
 const frameCounts = useMemo(() => binCenters.map(() => 0), []);
 const studyHatchAngles = useMemo(() => binCenters.map(() => 0), []);

 useEffect(() => {
  logicalBins.current = plan.length;
  inventory.setPlan({entries: plan});
  marbleMaterials.forEach(material => material.color.set(SPARE_COLOR));
  plan.forEach((entry, index) => {
   const bin = Number.isInteger(entry.bin) ? entry.bin : index;
   const material=marbleMaterials[bin];
   if(material){
    material.color.set(entry.color || SPARE_COLOR);
    // Retain the catalog hue while giving the physical glass its deeper tint.
    const hsl={};material.color.getHSL(hsl,THREE.SRGBColorSpace);
    if(hsl.s>.20)material.color.setHSL(hsl.h,Math.max(.88,hsl.s),THREE.MathUtils.clamp(hsl.l,.40,.48),THREE.SRGBColorSpace);
   }
  });
  syncPlayback();
  invalidate();
 }, [inventory, marbleMaterials, plan,invalidate,syncPlayback]);
 useEffect(() => {
  inventory.setReducedMotion(reducedMotion || staticStudy);
  syncPlayback();
  invalidate();
 }, [inventory, reducedMotion, staticStudy,invalidate,syncPlayback]);

 const renderInventory = useCallback(() => {
  frameCounts.fill(0);
  studyHatchAngles.fill(0);
  for (const body of inventory.bodies.values()) {
   const bin = body.bin;
   if (!body.visible || !meshes.current[bin] || frameCounts[bin] >= CAPACITY) continue;
   if (staticStudy && body.slot === STUDY_DROP_TOKEN_SLOTS[bin]) studyHatchAngles[bin] = Math.max(studyHatchAngles[bin], STUDY_HATCH_ANGLES[bin]);
   if (staticStudy && body.slot === STUDY_FALLING_TOKEN_SLOTS[bin]) studyHatchAngles[bin] = Math.max(studyHatchAngles[bin], STUDY_FALLING_HATCH_ANGLES[bin]);
   transform.position.copy(studyPositions?.[bin]?.[body.slot] ?? body.position);
   transform.updateMatrix();
   meshes.current[bin].setMatrixAt(frameCounts[bin]++, transform.matrix);
  }
  meshes.current.forEach((mesh, bin) => {
   if (!mesh) return;
   mesh.count = frameCounts[bin];
   mesh.instanceMatrix.needsUpdate = true;
  });

  const angle = staticStudy ? STUDY_WHEEL_ANGLE : inventory.wheelAngle;
  if (wheelRef?.current) wheelRef.current.rotation.z = angle;
  (cupRefs?.current ?? cupRefs)?.forEach(ref => {
   const holder = ref?.current ?? ref;
   if (holder) holder.rotation.z = -angle;
  });
  // Stable engine arrays avoid material, vector, or snapshot creation per frame.
  const launchAngles = inventory.gateAngles;
  const routingAngles = inventory.distributionGateAngles;
  const hatchAngles = staticStudy ? studyHatchAngles : inventory.trapdoorAngles;
  (launchGateRefs?.current ?? launchGateRefs)?.forEach((ref, bin) => {
   const gate = ref?.current ?? ref;
   if (gate) gate.rotation.x = launchAngles?.[bin] ?? 0;
  });
  (gateRefs?.current ?? gateRefs)?.forEach((ref, bin) => {
   const gate = ref?.current ?? ref;
   if (gate) gate.rotation.x = routingAngles?.[bin] ?? 0;
  });
  (doorRefs?.current ?? doorRefs)?.forEach((ref, bin) => {
   const door = ref?.current ?? ref;
   if (door) door.rotation.x = hatchAngles?.[bin] ?? 0;
  });
  (frontHatchRefs?.current ?? frontHatchRefs)?.forEach((actuator, bin) => {
   poseFrontHatch(actuator, hatchAngles?.[bin] ?? 0);
  });
 }, [inventory, transform, frameCounts, studyHatchAngles, wheelRef, cupRefs, launchGateRefs, gateRefs, doorRefs, frontHatchRefs, studyPositions, staticStudy]);

 useEffect(() => {
  if (staticStudy) return;
  const snapshot = () => {
   const state = inventory.snapshot();
   return {...state,animating:inventory.hasWork, counts: state.counts.slice(0, logicalBins.current), physicalCounts: state.counts};
  };
  const api = {snapshot, advanceForTest: seconds => {
   const duration = Number(seconds);
   if (Number.isFinite(duration) && duration > 0) inventory.step(duration);
   renderInventory();
   syncPlayback();
   invalidate();
   return snapshot();
  }};
  window.supplementMachine = api;
  return () => {
   if (window.supplementMachine === api) delete window.supplementMachine;
  };
 }, [inventory, renderInventory, staticStudy,invalidate,syncPlayback]);
 useEffect(() => () => {
  inventory.dispose();
  geometry.dispose();
  marbleMaterials.forEach(material => material.dispose());
  sphereEnvironment.dispose();
 }, [inventory, geometry, marbleMaterials,sphereEnvironment]);

 useFrame((_, delta) => {
  if (!staticStudy&&!document.hidden) inventory.step(Math.min(delta, .25));
  renderInventory();
  syncPlayback();
 });
 return <group dispose={null}>{marbleMaterials.map((material, bin) =>
  <instancedMesh key={bin} ref={setMeshRefs[bin]} args={[geometry, material, CAPACITY]}
   castShadow receiveShadow frustumCulled={false}/>)}</group>;
}
