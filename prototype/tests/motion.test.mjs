import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMotion } from '../src/motion.js';

const close = (actual, expected, tolerance = 1e-5) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test('a marble crosses every feed, track, wheel, and exit join without teleporting', () => {
  for (let feed = 0; feed < 6; feed++) {
    for (let bin = 0; bin < 4; bin++) {
      for (const boundary of [1, 10, 18, 19.55, 20]) {
        const before = sampleMotion(boundary - 1e-5, feed, bin);
        const after = sampleMotion(boundary + 1e-5, feed, bin);
        assert.ok(before.position.distanceTo(after.position) < 0.001);
      }
    }
  }
});

test('the wheel carries the marble through one complete rotation before releasing it', () => {
  const quarters = [
    [10, 4.6, -1.05, 0],
    [12, 6.2, 0.55, Math.PI / 2],
    [14, 4.6, 2.15, Math.PI],
    [16, 3.0, 0.55, 3 * Math.PI / 2],
    [18, 4.6, -1.05, 2 * Math.PI],
  ];
  for (const [time, x, y, angle] of quarters) {
    const sample = sampleMotion(time);
    close(sample.position.x, x);
    close(sample.position.y, y);
    close(sample.wheelAngle, angle);
  }
  assert.equal(sampleMotion(17.999).stage, 'wheel');
  assert.equal(sampleMotion(18).stage, 'exit');
  close(sampleMotion(5).wheelAngle, 0);
  close(sampleMotion(22).wheelAngle, 2 * Math.PI);
});

test('each sample marble lands in its designated collection compartment', () => {
  for (const [bin, x] of [-4.8, -1.6, 1.6, 4.8].entries()) {
    const sample = sampleMotion(22, 3, bin);
    assert.equal(sample.stage, 'settled');
    assert.equal(sample.visible, true);
    close(sample.position.x, x);
    close(sample.position.y, -2.675);
  }
});

test('the cycle briefly clears the moving marble, then repeats the same route', () => {
  assert.equal(sampleMotion(24).visible, false);
  const initial = sampleMotion(0.5, 2, 1);
  const repeated = sampleMotion(25.5, 2, 1);
  assert.equal(repeated.visible, true);
  assert.equal(repeated.stage, initial.stage);
  close(repeated.position.distanceTo(initial.position), 0);
  close(repeated.wheelAngle - initial.wheelAngle, 2 * Math.PI);
});

test('unpowered chutes and serpentine never carry a marble uphill', () => {
  for (let feed = 0; feed < 6; feed++) {
    let lastY = sampleMotion(0, feed).position.y;
    for (let step = 1; step <= 1000; step++) {
      const sample = sampleMotion(step / 100, feed);
      assert.ok(sample.position.y <= lastY + 1e-6);
      assert.ok(Number.isFinite(sample.position.x));
      assert.ok(Number.isFinite(sample.position.y));
      lastY = sample.position.y;
    }
  }
});

test('right-hand input chutes turn directly into the shared rail without curling outward', () => {
  for (const feed of [3, 4, 5]) {
    let lastX = sampleMotion(0, feed).position.x;
    for (let step = 1; step <= 100; step++) {
      const sample = sampleMotion(step / 100, feed);
      assert.ok(sample.position.x <= lastX + 1e-6, `feed ${feed} curled outward`);
      lastX = sample.position.x;
    }
  }
});
