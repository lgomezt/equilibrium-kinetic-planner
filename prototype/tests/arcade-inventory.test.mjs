import test from 'node:test';
import assert from 'node:assert/strict';
import {createMechanicalInventory} from '../src/arcade/mechanical-inventory.js';
import {ballRadius, distributionProgress, durations, feedMergeProgress, heapPosition, loadingProgress,
  recyclingOutlet, wheelCupPosition} from '../src/arcade/paths.js';
import {attemptChange, createGameState, GOALS, toPlan} from '../src/planner.js';

const ids = ['creatine', 'caffeine', 'theanine', 'magnesium'];
const caps = [12, 3, 4, 4];
const plan = counts => ({entries: counts.map((balls, bin) => ({id: ids[bin] ?? `test-${bin}`, bin, balls,
  origin: bin, color: '#ba9471', cap: (caps[bin] ?? 24) * 10, ballQuantity: 10}))});
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const advance = (inventory, seconds) => inventory.step(seconds);
const waitFor = (inventory, stage) => {
  for (let frame = 0; frame < 20 * 120; frame++) {
    if (inventory.snapshot().bodies.some(body => body.stage === stage)) return;
    inventory.step(1 / 120);
  }
  assert.fail(`never entered ${stage}`);
};

test('initial inventory seeds the exact real plan; new quantities use the complete machine', () => {
  const inventory = createMechanicalInventory({initialPlan: plan([4, 1, 1, 0])});
  const initial = inventory.snapshot();
  assert.equal(initial.settled, 6);
  assert.deepEqual(initial.desiredCounts, [4, 1, 1, 0, 0, 0]);
  inventory.setPlan(plan([5, 1, 1, 0]));
  const retained = initial.bodies.map(body => body.id);
  for (const id of retained) assert.ok(inventory.snapshot().bodies.some(body => body.id === id && body.stage === 'settled'));
  const seen = new Set();
  let previous;
  for (let frame = 0; frame < 15 * 120; frame++) {
    inventory.step(1 / 120);
    const body = inventory.snapshot().bodies.find(body => body.slot === 4 && body.bin === 0);
    seen.add(body.stage);
    if (previous?.visible && body.visible) assert.ok(distance(previous.position, body.position) < ballRadius * 1.4, `${previous.stage}→${body.stage} jumped`);
    previous = body;
  }
  for (const stage of ['launch', 'feed', 'track', 'loading', 'wheel', 'exit', 'distribution', 'bin', 'settled']) assert.ok(seen.has(stage), stage);
  assert.equal(inventory.snapshot().settled, 7);
  inventory.dispose();
});

test('maximum authoritative blend has unique tokens, exclusive wheel transport, and no marble collisions', () => {
  const inventory = createMechanicalInventory();
  inventory.setPlan(plan(caps));
  const completed = new Set();
  for (let frame = 0; frame < 290 * 120; frame++) {
    inventory.step(1 / 120);
    const snapshot = inventory.snapshot();
    assert.equal(new Set(snapshot.bodies.map(body => body.key)).size, snapshot.bodies.length);
    const moving = snapshot.bodies.filter(body => body.visible && body.stage !== 'settled');
    assert.ok(moving.length <= 1, 'a second marble was admitted before its mechanical route cleared');
    for (const body of moving) {
      if (body.stage === 'wheel') {
        assert.equal(body.cup, 0);
        assert.ok(body.carriedAngle >= 0 && body.carriedAngle <= Math.PI * 2);
        const expected = wheelCupPosition(snapshot.wheelAngle).toArray();
        assert.ok(distance(body.position, expected) < 1e-9);
      }
      if (body.stage === 'exit') {
        assert.ok(body.carriedAngle >= Math.PI * 2 - 1e-9);
        assert.ok(snapshot.wheelAngle - body.loadedAngle >= Math.PI * 2 - 1e-9);
        completed.add(body.id);
      }
    }
    const visible = snapshot.bodies.filter(body => body.visible);
    for (let a = 0; a < visible.length; a++) for (let b = a + 1; b < visible.length; b++) {
      assert.ok(distance(visible[a].position, visible[b].position) >= ballRadius * 2 - 1e-6,
        `overlap: ${visible[a].key}/${visible[a].stage}, ${visible[b].key}/${visible[b].stage}`);
    }
    if (snapshot.settled === 23) break;
  }
  assert.equal(completed.size, 23);
  assert.equal(inventory.snapshot().settled, 23);
  assert.deepEqual(inventory.snapshot().counts, [12, 3, 4, 4, 0, 0]);
  assert.equal(inventory.snapshot().pending, 0);
  inventory.dispose();
});

test('every in-flight stage accepts rapid removal and re-add without replacing or duplicating the token', () => {
  for (const stage of ['launch', 'feed', 'track', 'loading', 'wheel', 'exit', 'distribution', 'bin']) {
    const inventory = createMechanicalInventory();
    inventory.setPlan(plan([1, 0, 0, 0]));
    waitFor(inventory, stage);
    const id = inventory.snapshot().bodies[0].id;
    inventory.setPlan(plan([0, 0, 0, 0]));
    advance(inventory, .12);
    inventory.setPlan(plan([1, 0, 0, 0]));
    assert.equal(inventory.snapshot().bodies.length, 1);
    assert.equal(inventory.snapshot().bodies[0].id, id);
    advance(inventory, 25);
    assert.equal(inventory.snapshot().settled, 1, stage);
    assert.equal(inventory.snapshot().bodies[0].id, id);
    inventory.dispose();
  }
});

test('surplus balls descend through trapdoors and the outlet without crossing retained balls', () => {
  const inventory = createMechanicalInventory({initialPlan: plan([12, 0, 0, 0])});
  const retained = inventory.snapshot().bodies.filter(body => body.slot < 4).map(body => body.id);
  inventory.setPlan(plan([4, 0, 0, 0]));
  const lastPositions = new Map(), removed = new Set();
  let openFrames = 0;
  const returnBudget = 8 * (durations.returnDrop + durations.recycle + durations.spawnGap) + 1;
  for (let frame = 0; frame < returnBudget * 120; frame++) {
    inventory.step(1 / 120);
    const snapshot = inventory.snapshot();
    openFrames += snapshot.trapdoorAngles.some(angle => angle > .1) ? 1 : 0;
    const visible = snapshot.bodies.filter(body => body.visible);
    for (const body of visible) {
      const previous = lastPositions.get(body.id);
      if (previous) assert.ok(distance(body.position, previous.position) < .19, `return jumped ${body.key}`);
      lastPositions.set(body.id, body);
      if (body.stage === 'return') assert.ok(body.position[1] <= heapPosition(body.bin, body.slot).y + 1e-8);
    }
    for (let a = 0; a < visible.length; a++) for (let b = a + 1; b < visible.length; b++) {
      assert.ok(distance(visible[a].position, visible[b].position) >= ballRadius * 2 - 1e-6,
        `return overlap ${visible[a].slot}/${visible[b].slot}`);
    }
    for (const [id, previous] of lastPositions) {
      if (removed.has(id) || snapshot.bodies.some(body => body.id === id)) continue;
      assert.equal(previous.stage, 'recycling');
      assert.ok(distance(previous.position, recyclingOutlet.toArray()) < .12);
      removed.add(id);
    }
  }
  assert.equal(removed.size, 8);
  assert.ok(openFrames > 0);
  assert.equal(inventory.snapshot().settled, 4);
  assert.deepEqual(inventory.snapshot().bodies.map(body => body.id), retained);
  inventory.dispose();
});

test('re-adding a token after its trapdoor opened finishes recycling and relaunches the same identity', () => {
  const inventory = createMechanicalInventory({initialPlan: plan([1, 0, 0, 0])});
  const id = inventory.snapshot().bodies[0].id;
  inventory.setPlan(plan([0, 0, 0, 0]));
  waitFor(inventory, 'return');
  advance(inventory, .4);
  const before = inventory.snapshot().bodies[0];
  inventory.setPlan(plan([1, 0, 0, 0]));
  const after = inventory.snapshot().bodies[0];
  assert.equal(after.id, id);
  assert.deepEqual(after.position, before.position);
  assert.equal(after.stage, 'return');
  advance(inventory, 18);
  assert.equal(inventory.snapshot().settled, 1);
  assert.equal(inventory.snapshot().bodies[0].id, id);
  inventory.dispose();
});

test('cancellation of an active addition follows its full route before returning to exact latest counts', () => {
  const inventory = createMechanicalInventory();
  inventory.setPlan(plan([2, 0, 0, 0]));
  waitFor(inventory, 'wheel');
  inventory.setPlan(plan([0, 0, 0, 0]));
  assert.equal(inventory.snapshot().bodies.length, 1, 'the hidden queued addition should cancel');
  advance(inventory, 20);
  assert.equal(inventory.snapshot().bodies.length, 0);
  assert.equal(inventory.snapshot().active, 0);
  assert.deepEqual(inventory.snapshot().counts, [0, 0, 0, 0, 0, 0]);
  inventory.dispose();
});

test('entry capacities and bins come from the plan; reduced motion provides exact static inventory', () => {
  const inventory = createMechanicalInventory({reducedMotion: true});
  const custom = {entries: [{id: 'custom', bin: 5, origin: 3, balls: 18, cap: 35, ballQuantity: 5, color: '#abc123'}]};
  inventory.setPlan(custom);
  assert.equal(inventory.snapshot().settled, 7);
  assert.deepEqual(inventory.snapshot().desiredCounts, [0, 0, 0, 0, 0, 7]);
  assert.ok(inventory.snapshot().bodies.every(body => body.bin === 5 && body.color === '#abc123'));
  inventory.setReducedMotion(false);
  inventory.setPlan({entries: [{...custom.entries[0], cap: 60, balls: 8}]});
  advance(inventory, 1);
  assert.equal(inventory.snapshot().pending, 1);
  inventory.setReducedMotion(true);
  assert.equal(inventory.snapshot().settled, 8);
  assert.equal(inventory.snapshot().pending, 0);
  assert.ok(inventory.snapshot().gateAngles.every(angle => angle === 0));
  assert.ok(inventory.snapshot().trapdoorAngles.every(angle => angle === 0));
  const frozen = inventory.snapshot();
  advance(inventory, 20);
  assert.deepEqual(inventory.snapshot(), frozen);
  inventory.dispose();
});

test('same-plan updates, invalid deltas, and 60/120 Hz sampling preserve deterministic sequencing', () => {
  const slow = createMechanicalInventory(), fast = createMechanicalInventory();
  slow.setPlan(plan([2, 0, 0, 0])); fast.setPlan(plan([2, 0, 0, 0]));
  for (let frame = 0; frame < 8 * 60; frame++) {
    slow.step(1 / 60); fast.step(1 / 120); fast.step(1 / 120);
    if (frame % 13 === 0) slow.setPlan(plan([2, 0, 0, 0]));
  }
  assert.deepEqual(slow.snapshot(), fast.snapshot());
  const before = slow.snapshot();
  for (const delta of [0, -1, NaN, Infinity, undefined]) slow.step(delta);
  assert.deepEqual(slow.snapshot(), before);
  slow.dispose(); fast.dispose();
});

test('launch and distribution gates follow the actual source and destination at their respective stages', () => {
  const inventory = createMechanicalInventory();
  inventory.setPlan({entries: [{id: 'test', balls: 1, bin: 0, origin: 4, cap: 10, ballQuantity: 10}]});
  advance(inventory, .2);
  assert.ok(inventory.launchGateAngles[4] < -.1);
  assert.ok(inventory.distributionGateAngles.every(angle => angle === 0));
  waitFor(inventory, 'bin');
  assert.ok(inventory.launchGateAngles.every(angle => angle === 0));
  assert.ok(inventory.distributionGateAngles[0] > .1);
  assert.ok(inventory.distributionGateAngles.slice(1).every(angle => angle === 0));
  advance(inventory, 2);
  assert.ok(inventory.distributionGateAngles.every(angle => angle === 0));
  inventory.dispose();
});

test('rapid accepted changes from the real planner retain identity and converge to its authoritative blend', () => {
  let state = createGameState();
  const inventory = createMechanicalInventory({initialPlan: toPlan(state)});
  const identities = new Map(inventory.snapshot().bodies.map(body => [body.key, body.id]));
  let seed = 9217;
  for (let change = 0; change < 220; change++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const goal = GOALS[seed % GOALS.length];
    const result = attemptChange(state, goal, seed & 16 ? 1 : -1);
    if (result.accepted) state = result.state;
    inventory.setPlan(toPlan(state));
    inventory.step((seed % 40 + 1) / 120);
    for (const body of inventory.snapshot().bodies) {
      if (identities.has(body.key)) assert.equal(body.id, identities.get(body.key));
      else identities.set(body.key, body.id);
    }
  }
  advance(inventory, 330);
  const final = inventory.snapshot();
  assert.deepEqual(final.counts.slice(0, 4), state.counts);
  assert.deepEqual(final.desiredCounts.slice(0, 4), state.counts);
  assert.equal(final.settled, state.counts.reduce((total, count) => total + count, 0));
  assert.equal(final.pending, 0);
  assert.equal(final.returning, 0);
  assert.equal(final.bodies.length, final.settled);
  inventory.dispose();
});

test('demand rendering stays active for queued and returning work, and rests for settled or reduced-motion inventory', () => {
  const inventory = createMechanicalInventory({initialPlan: plan([1, 0, 0, 0])});
  assert.equal(inventory.hasWork, false);
  inventory.setPlan(plan([2, 0, 0, 0]));
  assert.equal(inventory.hasWork, true);
  advance(inventory, 15);
  assert.equal(inventory.hasWork, false);
  inventory.setPlan(plan([1, 0, 0, 0]));
  assert.equal(inventory.hasWork, true);
  advance(inventory, 1);
  assert.equal(inventory.hasWork, true);
  inventory.setReducedMotion(true);
  assert.equal(inventory.hasWork, false);
  inventory.dispose();
  assert.equal(inventory.hasWork, false);
});

test('GSAP acceleration preserves speed across feed, load, wheel, exit, and destination joins', () => {
  const feedEnd = durations.launch + durations.feed;
  const trackEnd = feedEnd + durations.track * (loadingProgress - feedMergeProgress[0]);
  const loadEnd = trackEnd + durations.loading;
  const wheelEnd = loadEnd + durations.wheel;
  const exitEnd = wheelEnd + durations.exit;
  const distributionEnd = exitEnd + durations.distribution * distributionProgress[0];
  for (const boundary of [feedEnd, trackEnd, loadEnd, wheelEnd, exitEnd, distributionEnd]) {
    const inventory = createMechanicalInventory();
    inventory.setPlan(plan([1, 0, 0, 0]));
    const delta = .002;
    inventory.step(boundary - delta);
    const before = inventory.snapshot().bodies[0].position;
    inventory.step(delta);
    const at = inventory.snapshot().bodies[0].position;
    inventory.step(delta);
    const after = inventory.snapshot().bodies[0].position;
    const leftSpeed = distance(before, at) / delta;
    const rightSpeed = distance(at, after) / delta;
    const ratio = Math.abs(leftSpeed - rightSpeed) / Math.max(leftSpeed, rightSpeed);
    assert.ok(ratio < .10, `velocity jumps at ${boundary}: ${leftSpeed} → ${rightSpeed}`);
    inventory.dispose();
  }
});
