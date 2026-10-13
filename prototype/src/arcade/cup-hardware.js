// Presentation dimensions shared by the rendered wheel holders and the
// moving-hardware clearance tests. Coordinates are local to an upright cup.
import {ballRadius} from './paths.js';
const vector = values => Object.freeze(values);
const box = (position, size, radius, material) => Object.freeze({
  position: vector(position), size: vector(size), radius, material,
});
const rim = (id, radius, tube, z, material, radialSegments, tubularSegments) => Object.freeze({
  id, radius, tube, position: vector([0, 0, z]), material, radialSegments, tubularSegments,
});

export const cupHardware = Object.freeze({
  floor: box([0, -ballRadius-.040, -.04], [.40, .06, .56], .025, 'chrome'),
  rearWall: box([0, -.170, -.33], [.44, .22, .025], .012, 'brushed'),
  // A shallow back surround and low toe retain the sphere without a front cage.
  frontWall: box([0, -ballRadius-.012, .35], [.40, .046, .025], .011, 'chrome'),
  backPlate: Object.freeze({position: vector([0, 0, -.35]), radius: .316, depth: .045}),
  backFace: Object.freeze({position: vector([0, 0, -.326]), radius: .295}),
  rims: Object.freeze([
    rim('rear-chrome', .307, .024, -.318, 'chrome', 12, 48),
    rim('rear-gold', .303, .009, -.295, 'gold', 8, 40),
  ]),
  frontLinks: Object.freeze([-.14, .14].map(x =>
    Object.freeze({from:vector([x,-ballRadius-.025,-.29]),to:vector([x,-ballRadius-.025,.35]),radius:.014}),
  )),
});
