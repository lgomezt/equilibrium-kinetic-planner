import test from 'node:test';
import assert from 'node:assert/strict';
import {Triangle, Vector3} from 'three';
import {
  ballRadius, binCenters, binCurves, binRoute, binTopY, binFrontZ, distributionCurve, distributionProgress,
  leftReturnElbow, exitCurve, feedCurves, feedMergeProgress, heapPosition, loadingProgress, mainCurve,
  returnChannelZ, recyclingOutlet, returnCurve, returnCurves, returnDropCurve, returnLaneZ, returnMergeProgress,
  wheelBottom, wheelCenter, wheelCupPosition, wheelLocalPosition, wheelRadius, wheelTiltX, worldGravityHeight,
} from '../src/arcade/paths.js';

const close = (a, b, message) => assert.ok(a.distanceTo(b) < 1e-8, `${message}: ${a.distanceTo(b)}`);

test('all six launches, wheel, branches, and recycling channel form connected paths', () => {
  assert.equal(feedCurves.length, 6);
  assert.equal(binCurves.length, 6);
  for (let bin = 0; bin < 6; bin++) {
    close(feedCurves[bin].getPointAt(1), mainCurve.getPointAt(feedMergeProgress[bin]), 'collector join');
    close(binCurves[bin].getPointAt(0), distributionCurve.getPointAt(distributionProgress[bin]), 'branch join');
    for (const slot of [0, 8, 11, 23]) {
      close(binRoute(bin, slot).getPointAt(0), binCurves[bin].getPointAt(0), 'delivery join');
      close(binRoute(bin, slot).getPointAt(1), heapPosition(bin, slot), 'delivery target');
      const drop = returnDropCurve(bin, heapPosition(bin, slot));
      close(drop.getPointAt(0), heapPosition(bin, slot), 'trapdoor source');
      close(drop.getPointAt(1), returnCurve.getPointAt(returnMergeProgress[bin]), 'return collector');
    }
  }
  close(mainCurve.getPointAt(1), wheelBottom, 'wheel inlet');
  close(exitCurve.getPointAt(0), wheelBottom, 'wheel outlet');
  close(exitCurve.getPointAt(1), distributionCurve.getPointAt(0), 'distribution inlet');
  close(returnCurve.getPointAt(1), recyclingOutlet, 'recycling outlet');
  assert.ok(mainCurve.getTangentAt(1).x > .999);
  assert.ok(exitCurve.getTangentAt(0).x > .999);
  feedCurves.forEach((curve,index)=>{
    const collectorTangent=mainCurve.getTangentAt(feedMergeProgress[index]);
    assert.ok(curve.getTangentAt(1).dot(collectorTangent) > .999, `feed ${index} must join the curved collector tangentially`);
  });
});

test('first-bin returns use the left elbow and other bins keep their original shared-lane entry', () => {
  assert.equal(returnMergeProgress[0],0);
  close(returnCurve.getPointAt(0),leftReturnElbow.getPointAt(0),'active elbow entry');
  for(let slot=0;slot<24;slot++) {
    const drop=returnDropCurve(0,heapPosition(0,slot));
    close(drop.getPointAt(1),leftReturnElbow.getPointAt(0),'every first-bin slot enters the elbow');
    assert.ok(drop.getTangentAt(1).dot(leftReturnElbow.getTangentAt(0))>.999);
  }
  let minX=Infinity;
  for(let sample=0;sample<=500;sample++) minX=Math.min(minX,leftReturnElbow.getPointAt(sample/500).x);
  assert.ok(minX< -7.8,'active route must wrap outside the left bin');
  for(let bin=1;bin<6;bin++) {
    const merge=returnCurve.getPointAt(returnMergeProgress[bin]);
    assert.ok(Math.abs(merge.x-binCenters[bin])<1e-8);
    assert.ok(Math.abs(merge.z-returnChannelZ)<1e-8);
  }
});

test('wheel transport follows the tilted physical circle with continuous inlet and outlet poses', () => {
  let minimumZ = Infinity, maximumZ = -Infinity;
  for (let sample = 0; sample <= 720; sample++) {
    const angle = sample * Math.PI * 2 / 720;
    const position = wheelCupPosition(angle);
    const dx = position.x - wheelCenter.x, dy = position.y - wheelCenter.y, dz = position.z - wheelCenter.z;
    assert.ok(Math.abs(Math.hypot(dx, dy, dz) - wheelRadius) < 1e-10, 'orbit must remain a true circle');
    assert.ok(Math.abs(-dy * Math.sin(wheelTiltX) + dz * Math.cos(wheelTiltX)) < 1e-10,
      'orbit must lie on the rendered wheel plane');
    assert.ok(Math.abs(dx - Math.sin(angle) * wheelRadius) < 1e-10);
    assert.ok(Math.abs(dy + Math.cos(angle) * wheelRadius * Math.cos(wheelTiltX)) < 1e-10);
    assert.ok(Math.abs(dz + Math.cos(angle) * wheelRadius * Math.sin(wheelTiltX)) < 1e-10);
    minimumZ = Math.min(minimumZ, position.z); maximumZ = Math.max(maximumZ, position.z);
  }
  assert.ok(Math.abs(maximumZ-minimumZ-2*wheelRadius*Math.abs(Math.sin(wheelTiltX)))<1e-9,
    'actual marble depth must match the tilted rotor, not an image-only transform');
  close(wheelCupPosition(0), mainCurve.getPointAt(1), 'tilted loading pose');
  close(wheelCupPosition(Math.PI * 2), exitCurve.getPointAt(0), 'tilted full-turn release');
});

test('all twenty-four deliveries and releases clear every retained marble in each compartment', () => {
  for (let bin = 0; bin < 6; bin++) {
    for (let slot = 0; slot < 24; slot++) {
      const retained = Array.from({length: slot}, (_, earlier) => heapPosition(bin, earlier));
      for (const [name, curve] of [['delivery', binRoute(bin, slot)], ['release', returnDropCurve(bin, heapPosition(bin, slot))]]) {
        for (let sample = 0; sample <= 600; sample++) {
          const position = curve.getPointAt(sample / 600);
          for (let earlier = 0; earlier < retained.length; earlier++) {
            const clearance = position.distanceTo(retained[earlier]);
            assert.ok(clearance >= ballRadius * 2 + .001,
              `${name} bin ${bin} slot ${slot} clips retained slot ${earlier}: ${clearance}`);
          }
        }
      }
    }
  }
});

test('unpowered curves are downhill in world space on the inclined cabinet', () => {
  const curves = [...feedCurves, mainCurve, exitCurve, distributionCurve,
    ...binCurves, ...returnCurves, returnCurve,
    ...binCenters.flatMap((_, bin) => [binRoute(bin, 0), binRoute(bin, 23), returnDropCurve(bin, heapPosition(bin, 23))])];
  curves.forEach((curve, index) => {
    let previous = worldGravityHeight(curve.getPointAt(0));
    for (let sample = 1; sample <= 1200; sample++) {
      const position = curve.getPointAt(sample / 1200);
      assert.ok(position.toArray().every(Number.isFinite));
      const height = worldGravityHeight(position);
      assert.ok(height <= previous + 1e-8, `uphill curve ${index} at ${sample}: ${height - previous}`);
      previous = height;
    }
  });
});

test('the serpentine clears the rotating wheel until the dedicated bottom inlet', () => {
  for (let sample = 0; sample <= 2000; sample++) {
    const position = mainCurve.getPointAt(loadingProgress * sample / 2000);
    const local = wheelLocalPosition(position);
    const radial = Math.hypot(local.x, local.y);
    const clearance = Math.hypot(radial - wheelRadius, local.z);
    assert.ok(clearance > ballRadius * 2 + .04, `wheel/rail intersection: ${clearance}`);
  }
});

test('all render-capacity slots fit the compartment and have sphere clearance', () => {
  for (let bin = 0; bin < 6; bin++) {
    const slots = Array.from({length: 24}, (_, slot) => heapPosition(bin, slot));
    for (let a = 0; a < slots.length; a++) {
      const p = slots[a];
      assert.ok(Math.abs(p.x - binCenters[bin]) + ballRadius < 1.05);
      assert.ok(p.y - ballRadius >= -.75 - 1e-9);
      assert.ok(p.y + ballRadius <= binTopY + 1e-9);
      assert.ok(p.z - ballRadius >= 4.3 && p.z + ballRadius <= binFrontZ);
      for (let b = a + 1; b < slots.length; b++) assert.ok(p.distanceTo(slots[b]) > ballRadius * 2 + .01);
    }
  }
});

test('the final wheel approach passes below the full bed of the earlier rail, including its front edge', () => {
  const overhead = mainCurve.curves[6];
  const approach = mainCurve.curves.at(-1);
  const start = overhead.getPoint(0), end = overhead.getPoint(1);
  const tangent = overhead.getTangent(0);
  const normal = new Vector3(-tangent.z, 0, tangent.x).normalize();
  const bedDirection = tangent.clone().cross(normal).normalize();
  // The earlier straight rail has the same eleven-section rolled gutter as
  // the renderer. Its finite ends matter when the inlet curves around it.
  const section = p => Array.from({length: 11}, (_, column) => {
    const side = column / 10 * 2 - 1;
    const rise = .085 * side * side + .015 * side ** 4;
    return p.clone().addScaledVector(normal, side * .36).addScaledVector(bedDirection, ballRadius + .003 - rise);
  });
  const first = section(start), last = section(end), triangles = [];
  for (let column = 0; column < 10; column++) {
    triangles.push(new Triangle(first[column], first[column + 1], last[column]),
      new Triangle(first[column + 1], last[column + 1], last[column]));
  }
  const nearest = new Vector3();
  for (let sample = 0; sample <= 3000; sample++) {
    const position = approach.getPoint(sample / 3000);
    const clearance = Math.min(...triangles.map(triangle => position.distanceTo(triangle.closestPointToPoint(position, nearest))));
    assert.ok(clearance >= ballRadius + .02, `overpass bed clips wheel approach: ${clearance}`);
  }
});

test('the functional foreground return loop clears its curved guides and the real walnut tunnel', () => {
 for (const turn of returnCurve.curves.filter(curve=>curve.type==='CubicBezierCurve3')) {
  const guides = [];
  for (let sample = 0; sample <= 500; sample++) {
    const position = turn.getPointAt(sample / 500), tangent = turn.getTangentAt(sample / 500);
    const normal = tangent.clone().set(-tangent.z, 0, tangent.x).normalize();
    const bedDirection = tangent.clone().cross(normal).normalize();
    for (const side of [-1, 1]) guides.push(position.clone().addScaledVector(normal, side * .35).addScaledVector(bedDirection, .055));
  }
  for (let sample = 0; sample <= 500; sample++) {
    const position = turn.getPointAt(sample / 500);
    for (const guide of guides) assert.ok(position.distanceTo(guide) > ballRadius + .025 + .02);
  }
 }
  for(let index=1;index<returnCurve.curves.length;index++) {
    close(returnCurve.curves[index-1].getPointAt(1),returnCurve.curves[index].getPointAt(0),'foreground return join');
    assert.ok(returnCurve.curves[index-1].getTangentAt(1).dot(returnCurve.curves[index].getTangentAt(0))>.995,
      'foreground return must not change direction abruptly at its joins');
  }
  assert.ok(returnCurve.curves.at(-4).getTangentAt(.5).x<-.99,'lower lane must carry balls leftward');
  assert.ok(returnCurve.curves.at(-2).getTangentAt(.5).x>.99,'foreground lane must carry balls toward the outlet');
  for(let sample=0;sample<=1000;sample++) {
    const p=returnCurve.curves.at(-3).getPointAt(sample/1000);
    if(p.z>=9.29&&p.z<=9.71) {
      assert.ok(p.x-.40> -6.25&&p.x+.40< -4.99,'rounded glass must pass through the open walnut tunnel');
      assert.ok(p.y+.38<-.97,'glass roof must pass below the solid walnut header');
    }
  }
  assert.ok(recyclingOutlet.z>9.71&&recyclingOutlet.z<11.2,'recycling outlet belongs to the external foreground transport');
  assert.ok(recyclingOutlet.x + .665 < 7.57, 'outlet base must remain on its attached support shelf');
});

test('all bin deliveries clear the visible chute guides before fanning toward their reserved heap slot', () => {
  for (let bin = 0; bin < 6; bin++) {
    const chute = binCurves[bin], guides = [];
    for (let sample = 0; sample <= 250; sample++) {
      const u = sample / 250;
      if (u * chute.getLength() < .42 || (1-u) * chute.getLength() < .25) continue;
      const position = chute.getPointAt(u), tangent = chute.getTangentAt(u);
      const normal = tangent.clone().set(-tangent.z, 0, tangent.x).normalize();
      const bedDirection = tangent.clone().cross(normal).normalize();
      for (const side of [-1, 1]) guides.push(position.clone().addScaledVector(normal, side * .36).addScaledVector(bedDirection, .055));
    }
    for (let slot = 0; slot < 24; slot++) {
      const route = binRoute(bin, slot);
      for (let sample = 0; sample <= 250; sample++) {
        const position = route.getPointAt(sample / 250);
        for (const guide of guides) assert.ok(position.distanceTo(guide) > ballRadius + .047 + .015,
          `chute clips bin ${bin} slot ${slot}`);
      }
    }
    const frontRow = heapPosition(bin, 23).z;
    assert.ok(returnLaneZ - frontRow >= ballRadius * 2 + .02, 'return lane crosses retained front-row balls');
  }
});
