import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventory, heapPosition} from '../src/inventory.js';

const ids = ['creatine', 'caffeine', 'theanine', 'magnesium'];
const plan = counts => ({entries: counts.map((balls, bin) => ({id: ids[bin], bin, balls, origin: bin, color: '#ff8800'}))});
const advance = (inventory, seconds) => {for (let t = 0; t < seconds; t += 1 / 120) inventory.step(1 / 120);};

test('fixed-capacity heaps are centered for each compound and survivor positions never reflow', () => {
  const centers = [-4.8, -1.6, 1.6, 4.8], caps = [12, 3, 4, 4];
  for (let bin = 0; bin < 4; bin++) {
    const positions = Array.from({length: caps[bin]}, (_, slot) => heapPosition(bin, slot));
    assert.ok(Math.abs(positions.reduce((sum, position) => sum + position.x, 0) / caps[bin] - centers[bin]) < 1e-8);
    assert.ok(Math.abs((positions[0].x + positions[1].x) / 2 - centers[bin]) < 1e-8);
  }
  assert.equal(heapPosition(0, 11).x, centers[0]);
  const inventory = createInventory({initialPlan: plan([6, 2, 2, 2])});
  const before = inventory.snapshot().bodies.map(body => [body.id, body.position]);
  inventory.setPlan(plan([12, 3, 4, 4]));
  for (const [id, position] of before) assert.deepEqual(inventory.snapshot().bodies.find(body => body.id === id).position, position);
});

test('increasing the desired blend keeps every existing token and only adds', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([4, 2, 1, 0]));
  advance(inventory, 2);
  const before = inventory.snapshot().bodies.map(body => body.id);
  inventory.setPlan(plan([8, 2, 2, 1]));
  const after = inventory.snapshot();
  assert.equal(after.active, 13);
  assert.equal(after.ejecting, 0);
  for (const id of before) assert.ok(after.bodies.some(body => body.id === id));
});

test('a reduction cancels queued balls and visibly ejects delivered balls', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([12, 0, 0, 0]));
  inventory.setPlan(plan([4, 0, 0, 0]));
  assert.equal(inventory.snapshot().active, 4);
  assert.equal(inventory.snapshot().ejecting, 0);
  advance(inventory, 45);
  inventory.setPlan(plan([2, 0, 0, 0]));
  assert.equal(inventory.snapshot().ejecting, 2);
  const removed = inventory.snapshot().bodies.filter(body => body.stage === 'ejecting');
  advance(inventory, .25);
  for (const body of removed) {
    const moved = inventory.snapshot().bodies.find(next => next.id === body.id);
    assert.ok(moved.position[1] > body.position[1]);
  }
  advance(inventory, 2);
  assert.equal(inventory.snapshot().bodies.length, 2);
});

test('rapid re-add reverses the same tokens without duplicate bodies', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([4, 0, 0, 0]));
  advance(inventory, 40);
  const before = inventory.snapshot().bodies.map(body => body.id);
  inventory.setPlan(plan([2, 0, 0, 0]));
  advance(inventory, .2);
  inventory.setPlan(plan([4, 0, 0, 0]));
  const reversed = inventory.snapshot();
  assert.equal(reversed.active, 4);
  assert.equal(reversed.ejecting, 0);
  assert.equal(reversed.bodies.length, 4);
  assert.deepEqual(reversed.bodies.map(body => body.id), before);
  advance(inventory, 2);
  assert.equal(inventory.snapshot().settled, 4);
});

test('a reduction during loading releases its wheel reservation and a rapid re-add keeps one token', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([1, 0, 0, 0]));
  for (let frame = 0; frame < 25 * 120 && !inventory.snapshot().bodies.some(body => body.stage === 'loading'); frame++) inventory.step(1 / 120);
  const loaded = inventory.snapshot().bodies[0];
  assert.equal(loaded.stage, 'loading');
  const angle = inventory.snapshot().wheelAngle;
  inventory.setPlan(plan([0, 0, 0, 0]));
  advance(inventory, .15);
  assert.ok(inventory.snapshot().wheelAngle > angle);
  inventory.setPlan(plan([1, 0, 0, 0]));
  assert.equal(inventory.snapshot().bodies.length, 1);
  assert.equal(inventory.snapshot().bodies[0].id, loaded.id);
  advance(inventory, 1);
  assert.equal(inventory.snapshot().settled, 1);
  inventory.setPlan(plan([2, 0, 0, 0]));
  advance(inventory, 35);
  assert.equal(inventory.snapshot().settled, 2);
  assert.equal(inventory.snapshot().bodies.filter(body => body.cup !== null).length, 0);
});

test('mixed rapid changes keep exact desired counts and never duplicate canonical slots', () => {
  const inventory = createInventory({initialPlan: plan([8, 2, 2, 2])});
  let seed = 371;
  for (let sequence = 0; sequence < 120; sequence++) {
    seed = (seed * 16807) % 2147483647;
    const counts = [seed % 13, (seed >> 4) % 4, (seed >> 8) % 5, (seed >> 12) % 5];
    inventory.setPlan(plan(counts));
    const snapshot = inventory.snapshot(), desired = snapshot.bodies.filter(body => body.stage !== 'ejecting');
    assert.deepEqual(snapshot.counts, counts);
    assert.equal(desired.length, counts.reduce((sum, value) => sum + value, 0));
    assert.equal(new Set(snapshot.bodies.map(body => `${body.supplement}:${body.slot}`)).size, snapshot.bodies.length);
    advance(inventory, .12);
  }
  advance(inventory, 80);
  assert.equal(inventory.snapshot().settled, inventory.snapshot().counts.reduce((sum, value) => sum + value, 0));
  assert.equal(inventory.snapshot().ejecting, 0);
});

test('one wheel gates six exclusive cups and carries each token for a full revolution', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([12, 3, 4, 4]));
  const loaded = new Map(), completed = new Set();
  for (let frame = 0; frame < 70 * 120; frame++) {
    inventory.step(1 / 120);
    const snapshot = inventory.snapshot();
    const wheel = snapshot.bodies.filter(body => body.stage === 'wheel');
    assert.equal(new Set(wheel.map(body => body.cup)).size, wheel.length);
    assert.ok(wheel.length <= 6);
    for (const body of snapshot.bodies) {
      if (body.stage === 'wheel' && !loaded.has(body.id)) loaded.set(body.id, body.loadedAngle);
      if (body.stage === 'exit' && loaded.has(body.id)) {
        assert.ok(snapshot.wheelAngle - loaded.get(body.id) >= Math.PI * 2 - 1e-8);
        completed.add(body.id);
      }
    }
  }
  assert.equal(completed.size, 23);
  assert.equal(inventory.snapshot().settled, 23);
  assert.deepEqual(inventory.snapshot().counts, [12, 3, 4, 4]);
});

test('the bottom wheel gate separates waiting, loading, and unloading marbles', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([12, 3, 4, 4]));
  let loadingFrames = 0;
  for (let frame = 0; frame < 55 * 120; frame++) {
    inventory.step(1 / 120);
    const gate = inventory.snapshot().bodies.filter(body => body.visible && body.position[0] > 4 && body.position[1] > -1.5 && body.position[1] < -.8);
    loadingFrames += gate.filter(body => body.stage === 'loading').length;
    for (let a = 0; a < gate.length; a++) for (let b = a + 1; b < gate.length; b++) {
      const distance = Math.hypot(...gate[a].position.map((value, i) => value - gate[b].position[i]));
      assert.ok(distance > .325, `gate overlap between ${gate[a].stage} and ${gate[b].stage}: ${distance}`);
    }
  }
  assert.ok(loadingFrames > 0);
});

test('an initial blend can be seeded, while subsequent additions travel through the machine', () => {
  const inventory = createInventory({initialPlan: plan([4, 1, 1, 0])});
  assert.equal(inventory.snapshot().settled, 6);
  const retained = inventory.snapshot().bodies.map(body => body.id);
  inventory.setPlan(plan([6, 1, 1, 0]));
  assert.equal(inventory.snapshot().settled, 6);
  assert.equal(inventory.snapshot().active, 8);
  advance(inventory, 4);
  assert.equal(inventory.snapshot().bodies.filter(body => body.stage === 'track').length, 2);
  for (const id of retained) assert.equal(inventory.snapshot().bodies.find(body => body.id === id).stage, 'settled');
  advance(inventory, 35);
  assert.equal(inventory.snapshot().settled, 8);
});

test('the React planner array contract seeds and updates the exact blend', () => {
  const inventory = createInventory({initialPlan: plan([12, 1, 2, 2]).entries});
  assert.deepEqual(inventory.snapshot().counts, [12, 1, 2, 2]);
  assert.equal(inventory.snapshot().settled, 17);
  inventory.setPlan(plan([12, 2, 2, 2]).entries);
  assert.equal(inventory.snapshot().active, 18);
  assert.equal(inventory.snapshot().settled, 17);
});

test('settled balls persist without demo recycling or an automatic disappearance', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([4, 1, 2, 2]));
  advance(inventory, 65);
  const before = inventory.snapshot();
  advance(inventory, 90);
  const after = inventory.snapshot();
  assert.equal(after.settled, 9);
  assert.deepEqual(after.bodies.map(body => [body.id, body.position]), before.bodies.map(body => [body.id, body.position]));
});

test('live marbles cross every stage boundary continuously', () => {
  const inventory = createInventory();
  inventory.setPlan(plan([4, 2, 2, 2]));
  const previous = new Map();
  for (let frame = 0; frame < 55 * 120; frame++) {
    inventory.step(1 / 120);
    for (const body of inventory.snapshot().bodies) {
      if (!body.visible) continue;
      const before = previous.get(body.id);
      if (before) {
        const distance = Math.hypot(...body.position.map((value, i) => value - before.position[i]));
        assert.ok(distance < .18, `${before.stage} → ${body.stage} teleported ${distance}`);
      }
      previous.set(body.id, body);
    }
  }
});

test('reduced motion immediately creates exactly the desired persistent heap', () => {
  const inventory = createInventory({reducedMotion: true});
  inventory.setPlan(plan([12, 3, 4, 4]));
  assert.equal(inventory.snapshot().settled, 23);
  inventory.setPlan(plan([4, 2, 0, 0]));
  assert.equal(inventory.snapshot().settled, 6);
  assert.deepEqual(inventory.snapshot().counts, [4, 2, 0, 0]);
});
