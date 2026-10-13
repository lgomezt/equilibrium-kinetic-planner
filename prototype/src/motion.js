import { CubicBezierCurve3, CurvePath, Vector3 } from 'three';

// Shared geometry drives the rails and persistent inventory. The original sample
// trajectory remains a testable reference for the approved one-marble study.
const point = (x, y, z = 0) => new Vector3(x, y, z);
const cubic = (a, b, c, d) => {
  const curve = new CubicBezierCurve3(...[a, b, c, d].map(v => point(...v)));
  curve.arcLengthDivisions = 240;
  return curve;
};

export const feedX = [-5.8, -3.48, -1.16, 1.16, 3.48, 5.8];
export const binCenters = [-4.8, -1.6, 1.6, 4.8];
export const wheelCenter = point(4.6, 0.55);
export const wheelRadius = 1.6;
export const restingY = -2.675;

export const feedCurves = feedX.map(x => cubic(
  [x, 4], [x, 3.05], [0.65, 2.5], [0, 2.5],
));

export const mainCurve = new CurvePath();
mainCurve.add(cubic(
  [0, 2.5], [-1.8, 2.5], [-5.8, 2.4], [-5.8, 1.65],
));
mainCurve.add(cubic(
  [-5.8, 1.65], [-5.8, 0.95], [0.3, 1.25], [0.3, 0.55],
));
mainCurve.add(cubic(
  [0.3, 0.55], [0.3, -0.12], [-5.8, 0.28], [-5.8, -0.35],
));
mainCurve.add(cubic(
  [-5.8, -0.35], [-5.8, -0.96], [-2, -1.05], [4.6, -1.05],
));
mainCurve.arcLengthDivisions = 1400;

// The chutes end at the tray opening. The final short fall is free of the rail.
export const exitCurves = binCenters.map(x => cubic(
  [4.6, -1.05, 0], [6.35, -1.05, .65], [x, -1.72, .45], [x, -2.10, .38],
));

export const durations = Object.freeze({
  feed: 1,
  track: 9,
  wheel: 8,
  exit: 2,
  settled: 3,
  recycle: 2,
  cycle: 25,
  total: 25,
});

const TAU = Math.PI * 2;
const wheelSpeed = TAU * wheelRadius / durations.wheel;
const trackAverageSpeed = mainCurve.getLength() / durations.track;
const trackStartSpeed = trackAverageSpeed * 0.9;
const exitRailTime = 1.55;
const dropTime = durations.exit - exitRailTime;
const dropStartSpeed = 0.55;
const dropDistance = -2.10 - restingY;
const dropAcceleration = 2 * (dropDistance - dropStartSpeed * dropTime) / (dropTime ** 2);

// Match velocities at the mechanism joins while allowing a gentle slowdown
// before the wheel. Arc-length sampling avoids speed pulses at curved sections.
const hermiteProgress = (u, startSlope, endSlope) => (
  (-2 + startSlope + endSlope) * u ** 3
  + (3 - 2 * startSlope - endSlope) * u ** 2
  + startSlope * u
);

const curveSample = (curve, u) => ({
  position: curve.getPointAt(Math.max(0, Math.min(1, u))),
  tangent: curve.getTangentAt(Math.max(0, Math.min(1, u))),
});

/** A repeating, deterministic, unsynchronized sample of one marble's route. */
export function sampleMotion(elapsed, feedIndex = 3, binIndex = 0) {
  const safeTime = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const cycle = Math.floor(safeTime / durations.cycle);
  const time = safeTime % durations.cycle;
  const feed = feedCurves[Math.max(0, Math.min(5, Math.trunc(feedIndex)))];
  const bin = Math.max(0, Math.min(3, Math.trunc(binIndex)));
  const previousTurns = cycle * TAU;
  const result = (stage, stageProgress, sample, wheelAngle, visible = true) => ({
    stage, stageProgress, ...sample, wheelAngle, visible,
  });

  if (time < 1) {
    const u = time / durations.feed;
    const finalSlope = trackStartSpeed * durations.feed / feed.getLength();
    return result('feed', u, curveSample(feed, hermiteProgress(u, 0, finalSlope)), previousTurns);
  }

  if (time < 10) {
    const u = (time - durations.feed) / durations.track;
    const progress = hermiteProgress(u, 0.9, wheelSpeed / trackAverageSpeed);
    return result('track', u, curveSample(mainCurve, progress), previousTurns);
  }

  if (time < 18) {
    const u = (time - 10) / durations.wheel;
    const angle = u * TAU;
    return result('wheel', u, {
      position: point(
        wheelCenter.x + Math.sin(angle) * wheelRadius,
        wheelCenter.y - Math.cos(angle) * wheelRadius,
      ),
      tangent: point(Math.cos(angle), Math.sin(angle)),
    }, previousTurns + angle);
  }

  if (time < 20) {
    const localTime = time - 18;
    const curve = exitCurves[bin];
    let sample;
    if (localTime < exitRailTime) {
      const u = localTime / exitRailTime;
      const averageSpeed = curve.getLength() / exitRailTime;
      const progress = hermiteProgress(u, wheelSpeed / averageSpeed, dropStartSpeed / averageSpeed);
      sample = curveSample(curve, progress);
    } else {
      const fallingTime = localTime - exitRailTime;
      sample = {
        position: point(binCenters[bin], -2.10 - dropStartSpeed * fallingTime - 0.5 * dropAcceleration * fallingTime ** 2, curve.getPointAt(1).z*(1-fallingTime/dropTime)),
        tangent: point(0, -1),
      };
    }
    return result('exit', localTime / durations.exit, sample, previousTurns + TAU);
  }

  return result('settled', Math.min(1, (time - 20) / durations.settled), {
    position: point(binCenters[bin], restingY),
    tangent: point(0, -1),
  }, previousTurns + TAU, time < 23);
}
