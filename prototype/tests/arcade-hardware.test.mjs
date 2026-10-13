import test from 'node:test';
import assert from 'node:assert/strict';
import {createMechanicalInventory} from '../src/arcade/mechanical-inventory.js';
import {Vector3} from 'three';
import {ballRadius, binCenters, cupCount, durations, feedCurves, launchGateForward, launchGateLift, routingGateY, routingGateZ,
  trapdoorHingeZ, trapdoorDepth, trapdoorWidth, wheelLocalPosition, wheelRadius} from '../src/arcade/paths.js';
import {cupHardware} from '../src/arcade/cup-hardware.js';

// Conservative box envelopes for the cabinet's beveled mechanical flaps.
// Unlike centre-line path tests, these detect a ball clipping a moving panel.
function flapDistance(position, pivot, center, halfSize, angle) {
  const x = position[0] - pivot[0] - center[0];
  const y = position[1] - pivot[1], z = position[2] - pivot[2];
  const localY = y * Math.cos(angle) + z * Math.sin(angle) - center[1];
  const localZ = -y * Math.sin(angle) + z * Math.cos(angle) - center[2];
  return Math.hypot(Math.max(0, Math.abs(x) - halfSize[0]),
    Math.max(0, Math.abs(localY) - halfSize[1]), Math.max(0, Math.abs(localZ) - halfSize[2]));
}

test('all launch and routing flaps clear the travelling marble throughout opening and closure', () => {
  for (let bin = 0; bin < 6; bin++) {
    const inventory = createMechanicalInventory();
    inventory.setPlan([{id: 'test', bin, origin: bin, balls: 1, cap: 1, ballQuantity: 1}]);
    for (let frame = 0; frame < 15 * 120; frame++) {
      inventory.step(1 / 120);
      const state = inventory.snapshot(), body = state.bodies[0];
      if (!body?.visible) continue;
      for (let gate = 0; gate < 6; gate++) {
        const start = feedCurves[gate].getPointAt(0);
        const relative=body.position.map((v,axis)=>v-[start.x,start.y+launchGateLift,start.z+launchGateForward][axis]);
        const angle=state.launchGateAngles[gate],co=Math.cos(angle),si=Math.sin(angle);
        const gatePoint=[relative[0],relative[1]*co+relative[2]*si,-relative[1]*si+relative[2]*co];
        const launchRods=[
          {from:[-.36,0,0],to:[-.36,-.55,0],radius:.022},
          {from:[.36,0,0],to:[.36,-.55,0],radius:.022},
          {from:[-.36,-.55,0],to:[.36,-.55,0],radius:.027},
        ];
        const launchDistance=Math.min(...launchRods.map(rod=>linkDistance(gatePoint,rod)));
        assert.ok(launchDistance > ballRadius + .015, `launch retainer clips bin ${bin}: ${launchDistance}`);
        const routingDistance = flapDistance(body.position, [binCenters[gate], routingGateY, routingGateZ],
          [0, -.20, 0], [.30, .20, .0175], state.distributionGateAngles[gate]);
        assert.ok(routingDistance > ballRadius + .015, `routing flap clips bin ${bin}: ${routingDistance}`);
      }
    }
    inventory.dispose();
  }
});

test('a fully opened trapdoor clears every column and layer through the complete fall', () => {
  const inventory = createMechanicalInventory({initialPlan: [{id: 'test', bin: 0, origin: 0,
    balls: 24, cap: 24, ballQuantity: 1}]});
  inventory.setPlan([]);
  const returnBudget = 24 * (durations.returnDrop + durations.recycle + durations.spawnGap) + 1;
  for (let frame = 0; frame < returnBudget * 120; frame++) {
    inventory.step(1 / 120);
    const state = inventory.snapshot();
    for (const body of state.bodies) {
      if (!body.visible) continue;
      const distance = flapDistance(body.position, [binCenters[0], -.775, trapdoorHingeZ],
        [0, 0, trapdoorDepth / 2], [trapdoorWidth / 2, .0225, trapdoorDepth / 2], state.trapdoorAngles[0]);
      assert.ok(distance > ballRadius + .01, `trapdoor clips slot ${body.slot}: ${distance}`);
    }
  }
  assert.equal(inventory.snapshot().bodies.length, 0);
  inventory.dispose();
});

function boxDistance(point, {position, size}) {
  return Math.hypot(...point.map((value, axis) =>
    Math.max(0, Math.abs(value - position[axis]) - size[axis] / 2)));
}

function torusDistance(point, {position, radius, tube}) {
  return Math.hypot(Math.hypot(point[0] - position[0], point[1] - position[1]) - radius,
    point[2] - position[2]) - tube;
}

function cylinderDistance(point, {position, radius, depth = 0}) {
  return Math.hypot(Math.max(0, Math.hypot(point[0] - position[0], point[1] - position[1]) - radius),
    Math.max(0, Math.abs(point[2] - position[2]) - depth / 2));
}

function linkDistance(point, {from, to, radius}) {
  const direction = to.map((value, axis) => value - from[axis]);
  const lengthSquared = direction.reduce((sum, value) => sum + value * value, 0);
  const projection = Math.max(0, Math.min(1, direction.reduce((sum, value, axis) =>
    sum + value * (point[axis] - from[axis]), 0) / lengthSquared));
  // A capsule conservatively encloses the rendered cylinder, including caps.
  return Math.hypot(...point.map((value, axis) => value - from[axis] - projection * direction[axis])) - radius;
}

test('rendered cup rims, walls, floor and links clear real loading, full turns and exits', () => {
  const inventory = createMechanicalInventory();
  inventory.setPlan([{id: 'cup-clearance', bin: 0, origin: 0, balls: 2, cap: 2, ballQuantity: 1}]);
  const parts = [
    ...['floor', 'rearWall', 'frontWall'].map(name => ({name, distance: point => boxDistance(point, cupHardware[name])})),
    ...cupHardware.rims.map(rim => ({name: rim.id, distance: point => torusDistance(point, rim)})),
    {name: 'backPlate', distance: point => cylinderDistance(point, cupHardware.backPlate)},
    {name: 'backFace', distance: point => cylinderDistance(point, cupHardware.backFace)},
    ...cupHardware.frontLinks.map((link, index) => ({name: `front-link-${index}`, distance: point => linkDistance(point, link)})),
  ];
  const stages = new Set(), tokens = new Set(), minima = new Map();
  for (let frame = 0; inventory.hasWork && frame < 30 * 1200; frame++) {
    inventory.step(1 / 1200);
    const angle = inventory.wheelAngle;
    for (const body of inventory.bodies.values()) {
      if (!body.visible) continue;
      if (['loading', 'wheel', 'exit'].includes(body.stage)) {
        stages.add(body.stage); tokens.add(body.id);
      }
      for (let cup = 0; cup < cupCount; cup++) {
        const phase = angle + cup * Math.PI * 2 / cupCount;
        // The renderer rotates the wheel by +angle and every cup by -angle:
        // all holders remain upright while their centres follow the wheel.
        const local = wheelLocalPosition(body.position, new Vector3());
        local.x -= Math.sin(phase) * wheelRadius;
        local.y += Math.cos(phase) * wheelRadius;
        const cupPoint = local.toArray();
        // Conservative rejection bound encloses the enlarged holder and sphere.
        if (local.length() > 1.2) continue;
        for (const part of parts) {
          const distance = part.distance(cupPoint);
          minima.set(part.name, Math.min(minima.get(part.name) ?? Infinity, distance));
          assert.ok(distance >= ballRadius + .001,
            `${part.name} clips ${body.stage}, cup ${cup}: distance=${distance}, local=${cupPoint}`);
        }
      }
    }
  }
  assert.equal(inventory.hasWork, false);
  assert.deepEqual(inventory.snapshot().counts, [2, 0, 0, 0, 0, 0]);
  assert.deepEqual([...stages].sort(), ['exit', 'loading', 'wheel']);
  assert.equal(tokens.size, 2, 'both admissions must exercise the same physical holder after full revolutions');
  assert.equal(minima.size, parts.length, 'every actual configured cup part must be checked');
  inventory.dispose();
});
