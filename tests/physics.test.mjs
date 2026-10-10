import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

let moduleSource = '';
try { moduleSource = await readFile(new URL('../dist/physics.js', import.meta.url), 'utf8'); } catch {}
const physics = moduleSource ? await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`) : {};

test('physics exposes a real token registry for desired quantities', () => {
  assert.equal(typeof physics.TokenRegistry, 'function', 'The lifecycle implementation is missing');
});

const plan = (creatine = 12, caffeine = 3) => [
  { id: 'creatine', balls: creatine, color: '#8960D2', origin: 3 },
  { id: 'caffeine', balls: caffeine, color: '#EAAF39', origin: 2 },
];

if (physics.TokenRegistry) {
  test('repeated plans never double the quantity already in flight', () => {
    const registry = new physics.TokenRegistry();
    registry.reconcile(plan());
    for (const token of registry.tokens.values()) registry.setState(token.key, 'rail');
    for (let i = 0; i < 40; i++) registry.reconcile(plan());
    assert.equal(registry.tokens.size, 15);
    assert.equal(new Set([...registry.tokens.values()].map(token => token.bodyId)).size, 15);
    assert.equal(registry.snapshot().activeCounts.creatine, 12);
    assert.equal(registry.snapshot().activeCounts.caffeine, 3);
  });

  test('removing an unspawned quantity cancels it without a phantom departure', () => {
    const registry = new physics.TokenRegistry();
    registry.reconcile(plan());
    registry.reconcile(plan(0, 0));
    assert.equal(registry.tokens.size, 0);
    assert.equal(registry.snapshot().retiring, 0);
  });

  test('a removal can be reversed before its body receives an ejection impulse', () => {
    const registry = new physics.TokenRegistry();
    registry.reconcile(plan(1, 0));
    registry.setState('creatine:0', 'settled');
    const firstBody = registry.tokens.get('creatine:0').bodyId;
    registry.reconcile(plan(0, 0));
    assert.equal(registry.tokens.get('creatine:0').state, 'retiring');
    registry.reconcile(plan(1, 0));
    assert.equal(registry.tokens.get('creatine:0').state, 'settled');
    assert.equal(registry.tokens.get('creatine:0').bodyId, firstBody);
  });

  test('readding during committed ejection waits for exit and replaces exactly one body', () => {
    const registry = new physics.TokenRegistry();
    registry.reconcile(plan(1, 0));
    registry.setState('creatine:0', 'falling');
    const oldBody = registry.tokens.get('creatine:0').bodyId;
    registry.reconcile(plan(0, 0));
    registry.commitRetirement('creatine:0');
    registry.reconcile(plan(1, 0));
    assert.equal(registry.tokens.size, 1);
    assert.equal(registry.tokens.get('creatine:0').state, 'retiring');
    assert.equal(registry.tokens.get('creatine:0').bodyId, oldBody);
    registry.exit('creatine:0', oldBody);
    const replacement = registry.tokens.get('creatine:0');
    assert.equal(replacement.state, 'queued');
    assert.notEqual(replacement.bodyId, oldBody);
    registry.exit('creatine:0', oldBody);
    assert.equal(registry.tokens.get('creatine:0').bodyId, replacement.bodyId, 'A stale exit must not delete its replacement');
  });

  test('a departing body obeys the latest target after rapid quantity reversals', () => {
    const registry = new physics.TokenRegistry();
    registry.reconcile(plan());
    for (const token of registry.tokens.values()) registry.setState(token.key, 'settled');
    registry.reconcile(plan(0, 0));
    for (const token of registry.tokens.values()) registry.commitRetirement(token.key);
    for (let i = 0; i < 101; i++) registry.reconcile(i % 2 ? plan() : plan(0, 0));
    assert.equal(registry.tokens.size, 15);
    assert.equal(registry.snapshot().desiredCounts.creatine, 0);
    const exits = [...registry.tokens.values()].map(token => [token.key, token.bodyId]);
    for (const [key, bodyId] of exits) registry.exit(key, bodyId);
    assert.equal(registry.tokens.size, 0);
  });

  test('invalid target counts cannot create unbounded or negative inventory', () => {
    const registry = new physics.TokenRegistry();
    registry.reconcile([{ id: 'creatine', balls: -4 }, { id: 'caffeine', balls: NaN }]);
    assert.equal(registry.tokens.size, 0);
    registry.reconcile([{ id: 'creatine', balls: 1.9 }]);
    assert.equal(registry.tokens.size, 1);
  });

  test('an approaching pair separates without adding kinetic energy', () => {
    const a = { x: 0, y: 0, vx: 120, vy: 0, radius: 12 };
    const b = { x: 20, y: 0, vx: -60, vy: 0, radius: 12 };
    const energyBefore = a.vx ** 2 + b.vx ** 2;
    for (let i = 0; i < 6; i++) physics.resolveCircleContact(a, b);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 23.8);
    assert.ok(a.vx ** 2 + b.vx ** 2 <= energyBefore + 0.001);
    assert.ok(b.vx >= a.vx, 'The pair must stop approaching');
  });

  test('rail motion accelerates downhill and resists horizontal motion', () => {
    assert.ok(physics.railAcceleration({ x: 0.8, y: 0.6 }, 80) > 0);
    assert.ok(physics.railAcceleration({ x: 1, y: 0 }, 80) < 0);
    assert.ok(physics.railAcceleration({ x: 0.8, y: -0.6 }, 80) < 0);
    assert.equal(physics.railAcceleration({ x: 1, y: 0 }, 0), 0);
  });

  function sculptureFixture(t) {
    let scheduled = null;
    let now = 1;
    const originalRAF = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = callback => { scheduled = callback; return 1; };
    globalThis.cancelAnimationFrame = () => { scheduled = null; };
    t.after(() => { globalThis.requestAnimationFrame = originalRAF; globalThis.cancelAnimationFrame = originalCancel; });
    const line = points => {
      const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
      const total = lengths.reduce((sum, length) => sum + length, 0);
      return { getTotalLength: () => total, getPointAtLength(distance) {
        let remaining = Math.min(total, Math.max(0, distance));
        for (let i = 0; i < lengths.length; i++) {
          if (remaining <= lengths[i] || i === lengths.length - 1) {
            const fraction = remaining / lengths[i];
            return { x: points[i][0] + (points[i + 1][0] - points[i][0]) * fraction, y: points[i][1] + (points[i + 1][1] - points[i][1]) * fraction };
          }
          remaining -= lengths[i];
        }
      } };
    };
    const paths = new Map();
    [175, 345, 515, 685, 855, 1025].forEach((x, index) => paths.set(`#feed-${index}`, line([[x, 6], [710, 92]])));
    paths.set('#main-route', line([[710, 92], [135, 155], [735, 216], [135, 280], [875, 335]]));
    paths.set('#wheel-route', line([[710, 92], [970, 105], [1070, 205], [970, 305], [1010, 335]]));
    [225, 475, 725, 975].forEach((x, index) => {
      paths.set(`#sort-main-${index}`, line([[875, 335], [x, 390]]));
      paths.set(`#sort-wheel-${index}`, line([[1010, 335], [x, 390]]));
    });
    const context = new Proxy({}, { get: (_object, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
    const controller = physics.createSculpture({
      canvas: { getContext: () => context },
      svg: { querySelector: selector => selector === '#rotor' ? { setAttribute() {} } : paths.get(selector) },
      supplements: [{ id: 'creatine' }, { id: 'caffeine' }, { id: 'theanine' }, { id: 'magnesium' }],
    });
    return { controller, advance(seconds) {
      for (let i = 0; i < seconds * 60 && scheduled; i++) {
        const callback = scheduled;
        scheduled = null;
        now += 1000 / 60;
        callback(now);
      }
    } };
  }

  test('shared rails deliver the full plan into separated finite reservoir heaps', t => {
    const { controller, advance } = sculptureFixture(t);
    controller.setPlan({ entries: plan() });
    advance(35);
    const result = controller.snapshot();
    assert.equal(result.queued, 0);
    assert.equal(result.rail, 0, 'No source may deadlock at the shared merge');
    assert.equal(result.settled, 15, JSON.stringify(result.bodies.filter(ball => ball.state !== 'settled')));
    assert.deepEqual(result.settledCounts, { creatine: 12, caffeine: 3 });
    for (const ball of result.bodies) {
      assert.ok(Number.isFinite(ball.x) && Number.isFinite(ball.y));
      assert.ok(ball.x >= 114 + ball.bin * 250 && ball.x <= 336 + ball.bin * 250);
      assert.ok(ball.y <= 444.05);
    }
    controller.destroy();
  });

  test('settled removals actually leave the world before their slots are replaced', t => {
    const { controller, advance } = sculptureFixture(t);
    controller.setPlan({ entries: plan() });
    advance(35);
    const oldBody = controller.snapshot().bodies.find(ball => ball.key === 'creatine:0').bodyId;
    controller.setPlan({ entries: plan(0, 0) });
    advance(0.1);
    assert.ok(controller.snapshot().retiring > 0);
    controller.setPlan({ entries: plan() });
    assert.equal(controller.snapshot().bodies.find(ball => ball.key === 'creatine:0').bodyId, oldBody);
    advance(35);
    const result = controller.snapshot();
    assert.equal(result.bodies.length, 15);
    assert.equal(result.settled, 15, JSON.stringify(result.bodies.filter(ball => ball.state !== 'settled')));
    assert.notEqual(result.bodies.find(ball => ball.key === 'creatine:0').bodyId, oldBody);
    controller.destroy();
  });

  test('removing part of a heap ejects surplus without stranding a buried slot', t => {
    const { controller, advance } = sculptureFixture(t);
    controller.setPlan({ entries: plan() });
    advance(35);
    controller.setPlan({ entries: plan(6, 3) });
    advance(20);
    const result = controller.snapshot();
    assert.equal(result.retiring, 0, JSON.stringify(result.bodies.filter(ball => ball.state === 'retiring')));
    assert.equal(result.bodies.length, 9);
    assert.deepEqual(result.settledCounts, { creatine: 6, caffeine: 3 });
    controller.destroy();
  });
}
