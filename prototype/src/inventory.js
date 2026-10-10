import {Vector3} from 'three';
import {feedCurves, mainCurve, exitCurves, binCenters, wheelCenter, wheelRadius, durations} from './motion.js';

const IDS = ['creatine', 'caffeine', 'theanine', 'magnesium'];
const CAPS = [12, 3, 4, 4];
const COLORS = ['#8d4fea', '#ffb51b', '#19b997', '#f16a86'];
const TAU = Math.PI * 2;
const WHEEL_SPEED = TAU / durations.wheel;
const TRACK_LENGTH = mainCurve.getLength();
const TRACK_SPEED = TRACK_LENGTH / durations.track;
const GAP = .36;
const GATE_APPROACH = 1.12;
const STOP_DISTANCE = TRACK_LENGTH - GATE_APPROACH;
const LOAD_TIME = .6;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const ease = value => value * value * (3 - 2 * value);
const hermite = (u, a, b) => (-2 + a + b) * u ** 3 + (3 - 2 * a - b) * u ** 2 + a * u;

export function heapPosition(bin, slot) {
  let row = 0, column = slot, count = 6;
  if (slot >= 11) {row = 2; column = slot - 11; count = 4;}
  else if (slot >= 6) {row = 1; column = slot - 6; count = 5;}
  return new Vector3(binCenters[bin] + (column - (count - 1) / 2) * .335, -2.675 + row * .29, row % 2 ? .06 : -.12);
}

/** Persistent physical inventory. Only a smaller desired count initiates an exit. */
export function createInventory({reducedMotion = false, initialPlan = null} = {}) {
  const bodies = new Map(), slots = new Map(), cups = new Map();
  let clock = 0, wheelAngle = 0, serial = 0, nextSpawn = 0, gate = null;
  let counts = [0, 0, 0, 0], currentPlan = {entries: []};
  let quiet = reducedMotion;

  const remove = body => {
    if (gate?.body === body.id) gate = null;
    bodies.delete(body.id);
    if (slots.get(body.key) === body.id) slots.delete(body.key);
    if (cups.get(body.cup) === body.id) cups.delete(body.cup);
  };
  const settle = body => {
    if (gate?.body === body.id) gate = null;
    if (cups.get(body.cup) === body.id) cups.delete(body.cup);
    body.stage = 'settled'; body.cup = null; body.age = 0;
    body.position.copy(heapPosition(body.bin, body.slot));
    body.visible = true;
  };

  function setPlan(plan) {
    currentPlan = plan ?? {entries: []};
    const entries = new Map((currentPlan.entries ?? []).map(entry => [entry.id, entry]));
    counts = IDS.map((id, bin) => clamp(Math.trunc(Number(entries.get(id)?.balls) || 0), 0, CAPS[bin]));
    for (const body of [...bodies.values()]) {
      if (body.slot < counts[body.bin]) {
        if (body.stage === 'ejecting') {
          body.stage = 'returning'; body.age = 0; body.from = body.position.clone();
        }
        if (quiet) settle(body);
      } else if (quiet || body.stage === 'queued') remove(body);
      else if (body.stage !== 'ejecting') {
        if (gate?.body === body.id) gate = null;
        if (cups.get(body.cup) === body.id) cups.delete(body.cup);
        body.cup = null; body.stage = 'ejecting'; body.age = 0;
        body.from = body.position.clone();
      }
    }
    for (let bin = 0; bin < IDS.length; bin++) {
      const entry = entries.get(IDS[bin]);
      for (let slot = 0; slot < counts[bin]; slot++) {
        const key = `${IDS[bin]}:${slot}`;
        if (slots.has(key)) continue;
        const origin = clamp(Math.trunc(Number(entry?.origin) || 0), 0, 5);
        const body = {id: `${key}:${serial++}`, key, supplement: IDS[bin], bin, slot, origin,
          color: entry?.color || COLORS[bin], stage: 'queued', visible: false, age: 0,
          distance: 0, cup: null, loadedAngle: null, position: feedCurves[origin].getPointAt(0), spin: 0};
        bodies.set(body.id, body); slots.set(key, body.id);
        if (quiet) settle(body);
      }
    }
    return snapshot();
  }

  function tick(delta) {
    clock += delta;
    const previousAngle = wheelAngle;
    if (!gate) wheelAngle += WHEEL_SPEED * delta;
    if (clock >= nextSpawn) {
      const queued = [...bodies.values()].find(body => body.stage === 'queued');
      if (queued) {queued.stage = 'feed'; queued.visible = true; queued.age = 0; nextSpawn = clock + .45;}
    }
    for (const body of [...bodies.values()]) {
      body.spin += delta * 4;
      if (body.stage === 'feed') {
        body.age += delta;
        const feed = feedCurves[body.origin], u = clamp(body.age / durations.feed, 0, 1);
        body.position.copy(feed.getPointAt(clamp(hermite(u, 0, TRACK_SPEED / feed.getLength()), 0, 1)));
        if (u === 1) {body.stage = 'track'; body.distance = 0; body.age = 0;}
      } else if (body.stage === 'loading') {
        body.age += delta;
        const u = clamp(body.age / LOAD_TIME, 0, 1);
        const progress = hermite(u, TRACK_SPEED * LOAD_TIME / GATE_APPROACH, WHEEL_SPEED * wheelRadius * LOAD_TIME / GATE_APPROACH);
        body.distance = STOP_DISTANCE + GATE_APPROACH * progress;
        body.position.copy(mainCurve.getPointAt(body.distance / TRACK_LENGTH));
        if (u === 1) {body.stage = 'wheel'; body.loadedAngle = wheelAngle; gate = null;}
      } else if (body.stage === 'exit') {
        body.age += delta;
        const curve = exitCurves[body.bin], railTime = 1.55;
        if (body.age < railTime) {
          const u = body.age / railTime, average = curve.getLength() / railTime;
          body.position.copy(curve.getPointAt(clamp(hermite(u, WHEEL_SPEED * wheelRadius / average, .3 / average), 0, 1)));
        } else {
          const u = clamp((body.age - railTime) / (durations.exit - railTime), 0, 1);
          const start = curve.getPointAt(1), target = heapPosition(body.bin, body.slot);
          body.position.set(start.x + (target.x - start.x) * ease(u), start.y + (target.y - start.y) * u ** 2, start.z + (target.z - start.z) * ease(u));
          if (u === 1) settle(body);
        }
      } else if (body.stage === 'ejecting') {
        body.age += delta;
        const u = clamp(body.age / 1.2, 0, 1), side = body.bin < 2 ? -1 : 1;
        body.position.set(body.from.x + side * 3.4 * u, body.from.y + 12.5 * u - 3 * u ** 2, body.from.z + .55 * Math.sin(Math.PI * u));
        if (u === 1) remove(body);
      } else if (body.stage === 'returning') {
        body.age += delta;
        const u = clamp(body.age / .8, 0, 1), target = heapPosition(body.bin, body.slot);
        body.position.copy(body.from).lerp(target, ease(u));
        body.position.z += .3 * Math.sin(Math.PI * u);
        if (u === 1) settle(body);
      }
    }

    // The shared serpentine behaves as one queue, so waiting for a wheel cup
    // never stacks marbles at the final point or lets a newer token pass.
    const track = [...bodies.values()].filter(body => body.stage === 'track' || body.stage === 'waiting').sort((a, b) => b.distance - a.distance);
    let limit = gate ? Math.min(STOP_DISTANCE, bodies.get(gate.body).distance - GAP) : STOP_DISTANCE;
    for (const body of track) {
      const distance = Math.max(0, Math.min(body.distance + TRACK_SPEED * delta, limit));
      body.stage = distance >= limit - 1e-8 ? 'waiting' : 'track';
      body.distance = distance;
      body.position.copy(mainCurve.getPointAt(clamp(distance / TRACK_LENGTH, 0, 1)));
      limit = distance - GAP;
    }

    for (let cup = 0; cup < 6; cup++) {
      const offset = cup * TAU / 6;
      const previousTurn = Math.floor((previousAngle + offset + 1e-9) / TAU);
      const turn = Math.floor((wheelAngle + offset + 1e-9) / TAU);
      if (turn === previousTurn) continue;
      const occupant = bodies.get(cups.get(cup));
      if (occupant && wheelAngle - occupant.loadedAngle >= TAU - 1e-8) {
        occupant.stage = 'exit'; occupant.age = 0; occupant.cup = null;
        occupant.position.copy(exitCurves[occupant.bin].getPointAt(0));
        cups.delete(cup);
      }
      // A short detent leaves a full ball diameter between the unloading marble
      // and the next arrival. Every cup shares this one mechanical wheel.
      if (!cups.has(cup)) {
        const first = track.find(body => (body.stage === 'track' || body.stage === 'waiting') && body.distance >= STOP_DISTANCE - 1e-8);
        if (first) {
          wheelAngle = turn * TAU - offset;
          first.stage = 'loading'; first.cup = cup; first.age = 0;
          cups.set(cup, first.id); gate = {body: first.id};
        }
      }
    }
    for (const body of bodies.values()) {
      if (body.stage !== 'wheel') continue;
      const angle = wheelAngle + body.cup * TAU / 6;
      body.position.set(wheelCenter.x + Math.sin(angle) * wheelRadius, wheelCenter.y - Math.cos(angle) * wheelRadius, 0);
    }
  }

  function step(delta) {
    if (!Number.isFinite(delta) || delta <= 0 || quiet) return;
    let remaining = delta;
    while (remaining > 1e-10) {const dt = Math.min(1 / 120, remaining); tick(dt); remaining -= dt;}
  }
  function snapshot() {
    const all = [...bodies.values()];
    return {elapsed: clock, wheelAngle, counts: [...counts], active: all.filter(body => body.stage !== 'ejecting').length,
      settled: all.filter(body => body.stage === 'settled').length, ejecting: all.filter(body => body.stage === 'ejecting').length,
      bodies: all.map(body => ({id: body.id, supplement: body.supplement, bin: body.bin, slot: body.slot,
        stage: body.stage, visible: body.visible, position: body.position.toArray(), cup: body.cup, loadedAngle: body.loadedAngle}))};
  }
  function setReducedMotion(value) {quiet = Boolean(value); if (quiet) setPlan(currentPlan);}
  if (initialPlan) {const preference = quiet; quiet = true; setPlan(initialPlan); quiet = preference;}
  return {bodies, setPlan, step, snapshot, setReducedMotion, get wheelAngle() {return wheelAngle;}};
}
