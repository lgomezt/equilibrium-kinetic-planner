const WORLD = { width: 1200, height: 500, top: 390, floor: 455, left: 100, binWidth: 250 };
const RADIUS = 11;
const GRAVITY = 1800;
const STEP = 1 / 120;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** A slot keeps exclusive ownership of its body until that generation exits. */
export class TokenRegistry {
  constructor() {
    this.tokens = new Map();
    this.generations = new Map();
    this.desiredCounts = {};
  }

  create(entry, slot) {
    const key = `${entry.id}:${slot}`;
    const generation = (this.generations.get(key) || 0) + 1;
    this.generations.set(key, generation);
    return {
      key, bodyId: `${key}@${generation}`, id: entry.id, slot,
      color: entry.color || '#8960D2', origin: clamp(Math.floor(entry.origin || 0), 0, 5),
      desired: true, state: 'queued', committed: false, radius: RADIUS,
    };
  }

  reconcile(entries = []) {
    const wanted = new Map();
    this.desiredCounts = {};
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || !entry.id) continue;
      const balls = Number.isFinite(entry.balls) ? clamp(Math.floor(entry.balls), 0, 64) : 0;
      this.desiredCounts[entry.id] = balls;
      for (let slot = 0; slot < balls; slot++) wanted.set(`${entry.id}:${slot}`, { entry, slot });
    }
    for (const [key, token] of this.tokens) {
      token.desired = wanted.has(key);
      if (!token.desired && token.state === 'queued') this.tokens.delete(key);
      else if (!token.desired && token.state !== 'retiring') {
        token.previousState = token.state;
        token.state = 'retiring';
      } else if (token.desired && token.state === 'retiring' && !token.committed) {
        token.state = token.previousState;
      }
    }
    for (const [key, { entry, slot }] of wanted) {
      const existing = this.tokens.get(key);
      if (!existing) this.tokens.set(key, this.create(entry, slot));
      else {
        existing.color = entry.color || existing.color;
        existing.origin = clamp(Math.floor(entry.origin || 0), 0, 5);
      }
    }
  }

  setState(key, state) {
    const token = this.tokens.get(key);
    if (token) token.state = state;
  }

  commitRetirement(key) {
    const token = this.tokens.get(key);
    if (token?.state === 'retiring') token.committed = true;
  }

  exit(key, bodyId) {
    const token = this.tokens.get(key);
    if (!token || token.bodyId !== bodyId) return;
    this.tokens.delete(key);
    if (token.desired) this.tokens.set(key, this.create(token, token.slot));
  }

  snapshot() {
    const activeCounts = Object.fromEntries(Object.keys(this.desiredCounts).map(id => [id, 0]));
    const settledCounts = { ...activeCounts };
    const states = { queued: 0, rail: 0, falling: 0, settled: 0, retiring: 0 };
    for (const token of this.tokens.values()) {
      states[token.state] = (states[token.state] || 0) + 1;
      if (token.state !== 'retiring') activeCounts[token.id] = (activeCounts[token.id] || 0) + 1;
      if (token.state === 'settled') settledCounts[token.id] = (settledCounts[token.id] || 0) + 1;
    }
    return { desiredCounts: { ...this.desiredCounts }, activeCounts, settledCounts, ...states };
  }
}

/** Gravity projected onto a captured rail, with solid-sphere rotational inertia. */
export function railAcceleration(tangent, velocity, curvature = 0) {
  const gravityAlong = GRAVITY * tangent.y;
  const normalLoad = Math.abs(velocity * velocity * curvature - GRAVITY * tangent.x);
  const resistance = 0.003 * normalLoad;
  const direction = Math.sign(velocity) || Math.sign(gravityAlong);
  if (!velocity && Math.abs(gravityAlong) <= resistance) return 0;
  return (gravityAlong - resistance * direction) / 1.4 - velocity * 0.09;
}

/** Equal-mass sphere contact: position correction, normal impulse, Coulomb friction. */
export function resolveCircleContact(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const diameter = a.radius + b.radius;
  if (distance >= diameter) return false;
  const nx = distance > 0.0001 ? dx / distance : 1;
  const ny = distance > 0.0001 ? dy / distance : 0;
  const correction = Math.max(0, diameter - distance - 0.03) * 0.42;
  a.x -= nx * correction;
  a.y -= ny * correction;
  b.x += nx * correction;
  b.y += ny * correction;
  const relativeX = b.vx - a.vx;
  const relativeY = b.vy - a.vy;
  const normalSpeed = relativeX * nx + relativeY * ny;
  if (normalSpeed < 0) {
    const restitution = normalSpeed < -75 ? 0.13 : 0;
    const impulse = -(1 + restitution) * normalSpeed / 2;
    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
    b.vx += impulse * nx;
    b.vy += impulse * ny;
    const tangentSpeed = relativeX * -ny + relativeY * nx;
    const friction = clamp(-tangentSpeed / 2, -0.22 * impulse, 0.22 * impulse);
    a.vx -= friction * -ny;
    a.vy -= friction * nx;
    b.vx += friction * -ny;
    b.vy += friction * nx;
  }
  return true;
}

function samplePath(element) {
  if (!element) throw new Error('The sculpture is missing a rail path.');
  const length = element.getTotalLength();
  const count = Math.max(2, Math.ceil(length / 3));
  const samples = [];
  for (let i = 0; i <= count; i++) {
    const s = length * i / count;
    const point = element.getPointAtLength(s);
    const before = element.getPointAtLength(Math.max(0, s - 1.5));
    const after = element.getPointAtLength(Math.min(length, s + 1.5));
    const norm = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    samples.push({ x: point.x, y: point.y, tx: (after.x - before.x) / norm, ty: (after.y - before.y) / norm });
  }
  return {
    length,
    at(s) {
      const fraction = clamp(s / length, 0, 1) * count;
      const i = Math.min(count - 1, Math.floor(fraction));
      const f = fraction - i;
      const a = samples[i];
      const b = samples[i + 1];
      let tx = a.tx + (b.tx - a.tx) * f;
      let ty = a.ty + (b.ty - a.ty) * f;
      const norm = Math.hypot(tx, ty) || 1;
      tx /= norm;
      ty /= norm;
      const curvature = (Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx)) / (length / count);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, tx, ty, curvature: clamp(curvature, -0.04, 0.04) };
    },
  };
}

function tint(hex, amount) {
  const value = parseInt(hex.replace('#', ''), 16);
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return `rgb(${rgb.map(channel => Math.round(clamp(channel + amount, 0, 255))).join(',')})`;
}

export function createSculpture({ canvas, svg, supplements, reducedMotion = false, onActivity = () => {} }) {
  const context = canvas.getContext('2d');
  const registry = new TokenRegistry();
  const binById = new Map(supplements.map((supplement, index) => [supplement.id, index]));
  const paths = new Map();
  for (let origin = 0; origin < 6; origin++) paths.set(`feed-${origin}`, samplePath(svg.querySelector(`#feed-${origin}`)));
  paths.set('main', samplePath(svg.querySelector('#main-route')));
  paths.set('wheel', samplePath(svg.querySelector('#wheel-route')));
  for (let bin = 0; bin < 4; bin++) {
    paths.set(`sort-main-${bin}`, samplePath(svg.querySelector(`#sort-main-${bin}`)));
    paths.set(`sort-wheel-${bin}`, samplePath(svg.querySelector(`#sort-wheel-${bin}`)));
  }
  const rotor = svg.querySelector('#rotor');
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
  canvas.width = WORLD.width * ratio;
  canvas.height = WORLD.height * ratio;
  let frame = null;
  let lastTime = 0;
  let accumulator = 0;
  let elapsed = 0;
  let destroyed = false;
  let wheelAngle = 0;
  let wheelVelocity = 0;
  let lastActivity = null;
  let settledFor = 0;
  const lastSpawn = Array(6).fill(-1);

  function drawBall(ball) {
    if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y)) return;
    const { x, y, radius: r, color } = ball;
    context.save();
    context.fillStyle = 'rgba(35,32,42,.12)';
    context.beginPath();
    context.ellipse(x + 1.5, y + r - 0.5, r * 0.78, r * 0.32, 0, 0, Math.PI * 2);
    context.fill();
    const gradient = context.createRadialGradient(x - r * 0.38, y - r * 0.45, r * 0.07, x + r * 0.12, y + r * 0.15, r * 1.15);
    gradient.addColorStop(0, tint(color, 105));
    gradient.addColorStop(0.28, tint(color, 27));
    gradient.addColorStop(0.68, color);
    gradient.addColorStop(1, tint(color, -57));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,.28)';
    context.lineWidth = 0.7;
    context.beginPath();
    context.arc(x, y, r - 0.8, Math.PI * 1.06, Math.PI * 1.78);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,.78)';
    context.beginPath();
    context.ellipse(x - r * 0.3, y - r * 0.46, r * 0.26, r * 0.105, -0.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,.4)';
    context.beginPath();
    context.arc(x + r * 0.37, y + r * 0.46, r * 0.07, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function render() {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, WORLD.width, WORLD.height);
    const balls = [...registry.tokens.values()].filter(ball => ball.state !== 'queued');
    balls.sort((a, b) => a.y - b.y);
    for (const ball of balls) drawBall(ball);
    if (rotor) rotor.setAttribute('transform', `rotate(${wheelAngle * 180 / Math.PI} 970 205)`);
  }

  function announceActivity(active) {
    if (active !== lastActivity) {
      lastActivity = active;
      onActivity(active);
    }
  }

  function startFrame() {
    if (destroyed || reducedMotion || frame !== null) return;
    lastTime = 0;
    settledFor = 0;
    frame = requestAnimationFrame(tick);
    announceActivity(true);
  }

  function placeStatic() {
    for (const [key, ball] of registry.tokens) {
      if (!ball.desired) registry.tokens.delete(key);
      else {
        ball.state = 'settled';
        ball.committed = false;
        ball.bin = binById.get(ball.id) ?? 0;
        const center = WORLD.left + WORLD.binWidth * (ball.bin + 0.5);
        const rows = [5, 4, 3, 2, 1];
        let index = ball.slot;
        let row = 0;
        while (row < rows.length - 1 && index >= rows[row]) index -= rows[row++];
        ball.x = center + (index - (rows[row] - 1) / 2) * (RADIUS * 2 + 0.6);
        ball.y = WORLD.floor - RADIUS - row * (RADIUS * 1.75);
        ball.vx = ball.vy = 0;
      }
    }
    wheelVelocity = 0;
    render();
    announceActivity(false);
  }

  function putOnRail(ball) {
    ball.bin = binById.get(ball.id) ?? 0;
    ball.branch = ball.slot % 3 === 0 ? 'wheel' : 'main';
    ball.edge = `feed-${ball.origin}`;
    ball.s = 0;
    ball.speed = 135;
    ball.spin = 0;
    ball.state = 'rail';
    updateRailPosition(ball);
  }

  function updateRailPosition(ball) {
    const point = paths.get(ball.edge).at(ball.s);
    ball.x = point.x;
    ball.y = point.y;
    ball.vx = point.tx * ball.speed;
    ball.vy = point.ty * ball.speed;
    return point;
  }

  function canEnter(ball, nextEdge) {
    const start = paths.get(nextEdge).at(0);
    for (const other of registry.tokens.values()) {
      if (other === ball || other.state !== 'rail') continue;
      if (other.edge === nextEdge && other.s < RADIUS * 2 + 2) return false;
      if (nextEdge === 'main' || nextEdge === 'wheel') {
        if (!other.edge.startsWith('feed-') && Math.hypot(other.x - start.x, other.y - start.y) < RADIUS * 2 + 3) return false;
        if (other.edge.startsWith('feed-') && other.edge !== ball.edge && paths.get(other.edge).length - other.s < RADIUS * 2 + 4 && other.key < ball.key) return false;
      }
    }
    return true;
  }

  function advanceRail(ball, dt) {
    const path = paths.get(ball.edge);
    const point = path.at(ball.s);
    const acceleration = railAcceleration({ x: point.tx, y: point.ty }, ball.speed, point.curvature);
    ball.speed = clamp(ball.speed + acceleration * dt, 0, 640);
    const travel = ball.speed * dt;
    ball.s += travel;
    ball.spin += travel / RADIUS;
    if (ball.edge === 'wheel') {
      const angularSpeed = ball.speed / 100;
      wheelVelocity += (angularSpeed - wheelVelocity) * dt * 4;
    }
    if (ball.s >= path.length) {
      let nextEdge = null;
      if (ball.edge.startsWith('feed-')) nextEdge = ball.branch;
      else if (ball.edge === 'main' || ball.edge === 'wheel') nextEdge = `sort-${ball.edge}-${ball.bin}`;
      if (nextEdge) {
        if (canEnter(ball, nextEdge)) {
          ball.s -= path.length;
          ball.edge = nextEdge;
        } else {
          ball.s = path.length;
          ball.speed = 0;
        }
      } else {
        const end = path.at(path.length);
        ball.x = end.x;
        ball.y = end.y;
        ball.vx = end.tx * ball.speed + ((ball.slot * 47) % 61 - 30);
        ball.vy = Math.max(45, end.ty * ball.speed);
        ball.state = 'falling';
        ball.restTime = 0;
        return;
      }
    }
    updateRailPosition(ball);
  }

  function railContacts() {
    const byEdge = new Map();
    for (const ball of registry.tokens.values()) {
      if (ball.state !== 'rail') continue;
      if (!byEdge.has(ball.edge)) byEdge.set(ball.edge, []);
      byEdge.get(ball.edge).push(ball);
    }
    for (const balls of byEdge.values()) {
      balls.sort((a, b) => b.s - a.s);
      for (let i = 1; i < balls.length; i++) {
        const ahead = balls[i - 1];
        const behind = balls[i];
        if (ahead.s - behind.s < RADIUS * 2 + 0.5) {
          behind.s = Math.max(0, ahead.s - RADIUS * 2 - 0.5);
          if (behind.speed > ahead.speed) {
            const speed = (behind.speed + ahead.speed) * 0.5;
            ahead.speed = speed;
            behind.speed = speed * 0.94;
          }
          updateRailPosition(behind);
        }
      }
    }
  }

  function eject(ball) {
    registry.commitRetirement(ball.key);
    ball.direction = ball.x < WORLD.width / 2 ? -1 : 1;
    const rise = Math.max(0, ball.y - (WORLD.top - RADIUS - 10));
    ball.vy = -Math.sqrt(2 * GRAVITY * (rise + 55));
    ball.vx = ball.direction * (rise ? 100 : 840);
    ball.clearedLip = !rise;
    ball.restTime = 0;
  }

  function wallContacts(ball) {
    if (ball.y < WORLD.top - RADIUS) return;
    const left = WORLD.left + ball.bin * WORLD.binWidth + RADIUS + 3;
    const right = left + WORLD.binWidth - RADIUS * 2 - 6;
    if (ball.x < left) {
      ball.x = left;
      if (ball.vx < 0) ball.vx *= -0.1;
    }
    if (ball.x > right) {
      ball.x = right;
      if (ball.vx > 0) ball.vx *= -0.1;
    }
    if (ball.y > WORLD.floor - RADIUS) {
      ball.y = WORLD.floor - RADIUS;
      if (ball.vy > 0) ball.vy = ball.vy > 90 ? -ball.vy * 0.12 : 0;
      ball.vx *= 0.87;
    }
  }

  function sphereContacts(balls) {
    const cellSize = RADIUS * 2 + 1;
    const grid = new Map();
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const gx = Math.floor(ball.x / cellSize);
      const gy = Math.floor(ball.y / cellSize);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nearby = grid.get(`${gx + dx},${gy + dy}`);
        if (nearby) for (const other of nearby) {
          if (ball.bin !== other.bin && ball.state !== 'retiring' && other.state !== 'retiring') continue;
          resolveCircleContact(ball, other);
        }
      }
      const key = `${gx},${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(ball);
    }
  }

  function simulate(dt) {
    elapsed += dt;
    const balls = [...registry.tokens.values()];
    for (const ball of balls) {
      if (ball.state !== 'queued') continue;
      if (elapsed - lastSpawn[ball.origin] < 0.17) continue;
      const feed = `feed-${ball.origin}`;
      if (balls.some(other => other.state === 'rail' && other.edge === feed && other.s < RADIUS * 2 + 2)) continue;
      putOnRail(ball);
      lastSpawn[ball.origin] = elapsed;
    }
    for (const ball of balls) {
      if (ball.state === 'rail') advanceRail(ball, dt);
      else if (ball.state === 'retiring' && !ball.committed) eject(ball);
    }
    railContacts();
    const free = balls.filter(ball => ['falling', 'settled', 'retiring'].includes(ball.state));
    for (const ball of free) {
      if (ball.state === 'retiring' && !ball.clearedLip && ball.y < WORLD.top - RADIUS - 5) {
        ball.clearedLip = true;
        ball.vx = ball.direction * 1050;
      }
      // The extraction actuator supplies lift until the body clears the glass.
      // A single impulse can be absorbed by retained balls above a buried slot.
      const lift = ball.state === 'retiring' && !ball.clearedLip ? 14000 : 0;
      ball.vy += (GRAVITY - lift) * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.state !== 'retiring' || !ball.clearedLip) wallContacts(ball);
    }
    for (let pass = 0; pass < 6; pass++) {
      sphereContacts(free);
      for (const ball of free) if (ball.state !== 'retiring' || !ball.clearedLip) wallContacts(ball);
    }
    for (const ball of free) {
      if (ball.state === 'retiring') {
        if (ball.x < -RADIUS || ball.x > WORLD.width + RADIUS || ball.y > WORLD.height + RADIUS || ball.y < -RADIUS) registry.exit(ball.key, ball.bodyId);
      } else {
        const slow = Math.hypot(ball.vx, ball.vy) < 20 && ball.y > WORLD.top;
        ball.restTime = slow ? (ball.restTime || 0) + dt : 0;
        ball.state = ball.restTime > 0.2 ? 'settled' : 'falling';
      }
    }
    wheelVelocity *= Math.exp(-dt * 1.4);
    if (Math.abs(wheelVelocity) < 0.015) wheelVelocity = 0;
    wheelAngle = (wheelAngle + wheelVelocity * dt) % (Math.PI * 2);
  }

  function tick(now) {
    frame = null;
    if (destroyed || reducedMotion) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.08) : STEP;
    lastTime = now;
    accumulator += dt;
    while (accumulator >= STEP) {
      simulate(STEP);
      accumulator -= STEP;
    }
    render();
    const hasTransit = [...registry.tokens.values()].some(ball => ['queued', 'rail', 'retiring', 'falling'].includes(ball.state));
    const active = hasTransit || wheelVelocity !== 0;
    settledFor = active ? 0 : settledFor + dt;
    if (settledFor < 0.4) frame = requestAnimationFrame(tick);
    else announceActivity(false);
  }

  render();
  return {
    setPlan(plan) {
      if (destroyed) return;
      registry.reconcile(Array.isArray(plan) ? plan : plan?.entries || []);
      if (reducedMotion) placeStatic();
      else {
        render();
        startFrame();
      }
    },
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        accumulator = 0;
        placeStatic();
      } else startFrame();
    },
    destroy() {
      destroyed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      announceActivity(false);
    },
    snapshot() {
      return {
        ...registry.snapshot(), reducedMotion, wheelAngle, wheelVelocity,
        bodies: [...registry.tokens.values()].map(({ key, bodyId, id, state, desired, x, y, vx, vy, edge, s, bin }) => ({ key, bodyId, id, state, desired, x, y, vx, vy, edge, s, bin })),
      };
    },
  };
}
