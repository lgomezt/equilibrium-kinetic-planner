import {gsap} from 'gsap';
import {
  binCenters, binRoute, cupCount, distributionCurve, distributionProgress,
  durations, exitCurve, feedCurves, feedMergeProgress, heapPosition,
  loadingProgress, mainCurve, mainLength, returnCurve, returnDropCurve, returnMergeProgress,
  wheelCupPosition, wheelRadius,
} from './paths.js';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const opening = (age, total) => Math.min(1, age / .18, Math.max(0, (total - age) / .18));
const toCount = value => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
const hermiteEase = (startSlope, endSlope) => u => (-2 + startSlope + endSlope) * u ** 3
  + (3 - 2 * startSlope - endSlope) * u ** 2 + startSlope * u;

/**
 * Presentation inventory only. The planner's portion counts are authoritative.
 * Paused GSAP timelines are advanced explicitly, so loading, wheel transport,
 * routing, and recycling remain reproducible without a physics solver or clock.
 */
export function createMechanicalInventory({initialPlan = null, reducedMotion = false} = {}) {
  const bodies = new Map();
  const tokens = new Map();
  let desired = new Map(), desiredCounts = binCenters.map(() => 0);
  let currentPlan = {entries: []}, serial = 0, elapsed = 0, wheelAngle = 0;
  let activeJourney = null, nextAdmission = 0, quiet = Boolean(reducedMotion), disposed = false;
  const gateAngles = binCenters.map(() => 0);
  const distributionGateAngles = binCenters.map(() => 0);
  const trapdoorAngles = binCenters.map(() => 0);

  function normalizePlan(plan) {
    const entries = Array.isArray(plan) ? plan : plan?.entries ?? [];
    const result = new Map();
    const occupied = new Set();
    entries.forEach((entry, index) => {
      if (!entry || typeof entry.id !== 'string') return;
      const bin = Number.isInteger(entry.bin) ? entry.bin : index;
      if (bin < 0 || bin >= binCenters.length || occupied.has(bin)) return;
      occupied.add(bin);
      const cap = Number(entry.cap), quantity = Number(entry.ballQuantity);
      const capacity = Number.isFinite(cap) && cap >= 0 && Number.isFinite(quantity) && quantity > 0
        ? Math.floor(cap / quantity) : 24;
      const balls = clamp(toCount(entry.balls), 0, Math.min(24, capacity));
      const origin = clamp(toCount(entry.origin), 0, feedCurves.length - 1);
      for (let slot = 0; slot < balls; slot++) {
        const key = `${entry.id}:${slot}`;
        result.set(key, {key, supplement: entry.id, bin, slot, origin, color: entry.color || '#cfc6a5'});
      }
    });
    return result;
  }

  const park = body => {
    body.stage = 'settled'; body.visible = true; body.cup = null;
    body.position.copy(heapPosition(body.bin, body.slot));
  };
  const queue = body => {
    body.stage = 'queued'; body.visible = false; body.cup = null;
    body.position.copy(feedCurves[body.origin].getPointAt(0));
  };
  const retire = body => {
    body.stage = 'dormant'; body.visible = false; body.cup = null;
  };

  function settleImmediately() {
    activeJourney?.timeline.kill();
    activeJourney = null;
    gateAngles.fill(0); distributionGateAngles.fill(0); trapdoorAngles.fill(0);
    wheelAngle = Math.ceil((wheelAngle - 1e-10) / TAU) * TAU;
    for (const body of bodies.values()) desired.has(body.key) ? park(body) : retire(body);
  }

  function setPlan(plan) {
    if (disposed) return snapshot();
    currentPlan = plan ?? {entries: []};
    desired = normalizePlan(currentPlan);
    desiredCounts = binCenters.map(() => 0);
    for (const target of desired.values()) {
      desiredCounts[target.bin]++;
      let body = tokens.get(target.key);
      if (!body) {
        body = {...target, id: `${target.key}:${serial++}`, stage: 'queued', visible: false,
          cup: null, loadedAngle: null, carriedAngle: 0, position: feedCurves[target.origin].getPointAt(0)};
        tokens.set(target.key, body); bodies.set(body.id, body);
      } else {
        body.color = target.color; body.origin = target.origin;
        // A token that has already crossed its trapdoor completes recycling
        // before relaunching. A pending release can still be cancelled in place.
        if (body.stage === 'dormant') queue(body);
        else if (body.stage === 'returnQueued') park(body);
      }
    }
    for (const body of bodies.values()) {
      if (desired.has(body.key)) continue;
      if (body.stage === 'queued') retire(body);
      else if (body.stage === 'settled') body.stage = 'returnQueued';
      // In-flight additions finish their connected route before leaving by
      // the bin trapdoor. They are never teleported onto a return rail.
    }
    if (quiet) settleImmediately();
    return snapshot();
  }

  function timelineFor(segments) {
    const state = {};
    const timeline = gsap.timeline({paused: true, defaults: {ease: 'none'}});
    let time = 0;
    const schedule = [];
    for (const segment of segments) {
      if (segment.duration <= 1e-8) continue;
      const key = `progress${schedule.length}`;
      state[key] = 0;
      timeline.to(state, {[key]: 1, duration: segment.duration, ease: segment.ease ?? 'none'}, time);
      schedule.push({...segment, key, start: time, end: time + segment.duration});
      time += segment.duration;
    }
    return {timeline, state, schedule, duration: time, age: 0};
  }

  function admitAddition(body) {
    const merge = feedMergeProgress[body.origin];
    const delivery = binRoute(body.bin, body.slot);
    const feedSpeed = feedCurves[body.origin].getLength() / durations.feed;
    const trackSpeed = mainLength / durations.track;
    const loadSpeed = mainLength * (1 - loadingProgress) / durations.loading;
    const wheelSpeed = TAU * wheelRadius / durations.wheel;
    const exitSpeed = exitCurve.getLength() / durations.exit;
    const distributionSpeed = distributionCurve.getLength() / durations.distribution;
    const deliverySpeed = delivery.getLength() / durations.bin;
    const releaseSpeed = distributionProgress[body.bin] > 0 ? distributionSpeed : deliverySpeed;
    const initialRollSpeed = 1.5;
    const segments = [
      {stage: 'launch', duration: durations.launch, curve: feedCurves[body.origin], from: 0, to: 0},
      {stage: 'feed', duration: durations.feed, curve: feedCurves[body.origin], from: 0, to: 1,
        ease: hermiteEase(0, initialRollSpeed / feedSpeed)},
      {stage: 'track', duration: durations.track * (loadingProgress - merge), curve: mainCurve, from: merge, to: loadingProgress,
        ease: hermiteEase(initialRollSpeed / trackSpeed, loadSpeed / trackSpeed)},
      {stage: 'loading', duration: durations.loading, curve: mainCurve, from: loadingProgress, to: 1,
        ease: hermiteEase(1, wheelSpeed / loadSpeed)},
      {stage: 'wheel', duration: durations.wheel},
      {stage: 'exit', duration: durations.exit, curve: exitCurve, from: 0, to: 1,
        ease: hermiteEase(wheelSpeed / exitSpeed, releaseSpeed / exitSpeed)},
      {stage: 'distribution', duration: durations.distribution * distributionProgress[body.bin],
        curve: distributionCurve, from: 0, to: distributionProgress[body.bin],
        ease: hermiteEase(1, deliverySpeed / distributionSpeed)},
      {stage: 'bin', duration: durations.bin, curve: delivery, from: 0, to: 1,
        ease: hermiteEase(1, 0)},
    ];
    activeJourney = {...timelineFor(segments), kind: 'addition', body, origin: body.origin, wheelBase: wheelAngle};
    body.visible = true; body.carriedAngle = 0; body.loadedAngle = null;
    renderJourney(activeJourney);
  }

  function admitReturn(body) {
    const drop = returnDropCurve(body.bin, body.position);
    const merge = returnMergeProgress[body.bin];
    const segments = [
      {stage: 'return', duration: durations.returnDrop, curve: drop, from: 0, to: 1},
      {stage: 'recycling', duration: durations.recycle * (1 - merge), curve: returnCurve, from: merge, to: 1},
    ];
    activeJourney = {...timelineFor(segments), kind: 'return', body};
    renderJourney(activeJourney);
  }

  function renderJourney(journey) {
    const segment = journey.schedule.find(part => journey.age < part.end - 1e-10)
      ?? journey.schedule[journey.schedule.length - 1];
    const progress = clamp(journey.state[segment.key], 0, 1);
    const body = journey.body;
    body.stage = segment.stage; body.visible = true;
    body.cup = segment.stage === 'loading' || segment.stage === 'wheel' ? 0 : null;
    if (segment.stage === 'wheel') {
      body.loadedAngle = journey.wheelBase;
      body.carriedAngle = progress * TAU;
      wheelAngle = journey.wheelBase + body.carriedAngle;
      wheelCupPosition(wheelAngle, body.position);
    } else {
      body.position.copy(segment.curve.getPointAt(segment.from + (segment.to - segment.from) * progress));
      if (journey.kind === 'addition' && ['exit', 'distribution', 'bin'].includes(segment.stage)) {
        body.carriedAngle = TAU;
        wheelAngle = journey.wheelBase + TAU;
      }
    }
    if (journey.kind === 'addition') {
      // This overhead flap swings forward, away from the waiting ball. Open
      // it completely during the stationary launch stage before rolling.
      gateAngles[journey.origin] = -Math.PI * .42 * opening(journey.age, durations.launch + durations.feed);
      distributionGateAngles.fill(0);
      const binSegment = journey.schedule.find(part => part.stage === 'bin');
      const approach = journey.age - binSegment.start;
      distributionGateAngles[body.bin] = Math.PI * .38 * Math.min(1,
        Math.max(0, (approach + .45) / .18), Math.max(0, (binSegment.duration + .08 - approach) / .18));
    } else {
      // The front hatch opens before the token reaches its vertical drop, and
      // closes while that token continues along the lower return channel.
      trapdoorAngles[body.bin] = Math.PI / 2 * Math.min(1, journey.age / .18,
        Math.max(0, (durations.returnDrop + .18 - journey.age) / .18));
    }
  }

  function finishJourney(journey) {
    const body = journey.body;
    journey.timeline.kill();
    gateAngles.fill(0); distributionGateAngles.fill(0); trapdoorAngles.fill(0);
    if (journey.kind === 'addition') {
      wheelAngle = journey.wheelBase + TAU;
      body.carriedAngle = TAU;
      park(body);
      if (!desired.has(body.key)) body.stage = 'returnQueued';
    } else if (desired.has(body.key)) queue(body);
    else retire(body);
    activeJourney = null;
    nextAdmission = elapsed + durations.spawnGap;
  }

  function tick(delta) {
    elapsed += delta;
    if (!activeJourney && elapsed >= nextAdmission) {
      const release = [...bodies.values()].filter(body => body.stage === 'returnQueued')
        .sort((a, b) => b.slot - a.slot || a.bin - b.bin)[0];
      if (release) admitReturn(release);
      else {
        const addition = [...bodies.values()].find(body => body.stage === 'queued' && desired.has(body.key));
        if (addition) admitAddition(addition);
      }
    }
    if (!activeJourney) return;
    const journey = activeJourney;
    journey.age = Math.min(journey.duration, journey.age + delta);
    journey.timeline.totalTime(journey.age, true);
    renderJourney(journey);
    if (journey.age >= journey.duration - 1e-10) finishJourney(journey);
  }

  function step(seconds) {
    if (disposed || quiet || !Number.isFinite(seconds) || seconds <= 0) return;
    // A fixed integration boundary gives identical sequencing at 60/120 Hz
    // and bounds visible movement when a browser frame is delayed.
    let remaining = seconds;
    while (remaining > 1e-10) {
      const delta = Math.min(1 / 120, remaining);
      tick(delta); remaining -= delta;
    }
  }

  function snapshot() {
    const shown = [...bodies.values()].filter(body => body.stage !== 'dormant');
    const counts = binCenters.map((_, bin) => shown.filter(body => body.bin === bin
      && ['settled', 'returnQueued'].includes(body.stage)).length);
    return {
      elapsed, wheelAngle, cupAngles: Array.from({length: cupCount}, (_, cup) => wheelAngle + cup * TAU / cupCount),
      gateAngles: [...gateAngles], launchGateAngles: [...gateAngles],
      distributionGateAngles: [...distributionGateAngles], trapdoorAngles: [...trapdoorAngles],
      counts, desiredCounts: [...desiredCounts],
      active: desired.size,
      settled: shown.filter(body => body.stage === 'settled' && desired.has(body.key)).length,
      returning: shown.filter(body => ['returnQueued', 'return', 'recycling'].includes(body.stage)).length,
      pending: shown.filter(body => desired.has(body.key) && body.stage !== 'settled').length,
      bodies: shown.map(body => ({id: body.id, key: body.key, supplement: body.supplement,
        bin: body.bin, slot: body.slot, color: body.color, stage: body.stage,
        position: body.position.toArray(), visible: body.visible, cup: body.cup,
        loadedAngle: body.loadedAngle, carriedAngle: body.carriedAngle,
        desired: desired.has(body.key), spin: elapsed * 4 + body.slot})),
    };
  }

  function setReducedMotion(value) {
    quiet = Boolean(value);
    if (quiet && !disposed) settleImmediately();
    return snapshot();
  }

  function dispose() {
    activeJourney?.timeline.kill(); activeJourney = null;
    bodies.clear(); tokens.clear(); desired.clear();
    desiredCounts.fill(0);
    gateAngles.fill(0); distributionGateAngles.fill(0); trapdoorAngles.fill(0);
    disposed = true;
  }

  if (initialPlan) {
    const preference = quiet;
    quiet = true; setPlan(initialPlan); quiet = preference;
  }
  return {setPlan, step, setReducedMotion, snapshot, dispose, bodies,
    get wheelAngle() {return wheelAngle;}, get reducedMotion() {return quiet;},
    get gateAngles() {return gateAngles;}, get launchGateAngles() {return gateAngles;},
    get distributionGateAngles() {return distributionGateAngles;},
    get trapdoorAngles() {return trapdoorAngles;},
    get hasWork() {
      if (quiet || disposed) return false;
      if (activeJourney) return true;
      for (const body of bodies.values()) {
        if (body.stage === 'returnQueued' || (body.stage === 'queued' && desired.has(body.key))) return true;
      }
      return false;
    }};
}

// Familiar name for scene integrations; isolated from the original inventory.
export const createInventory = createMechanicalInventory;
