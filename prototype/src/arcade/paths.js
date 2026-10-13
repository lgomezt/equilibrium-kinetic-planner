import {CubicBezierCurve3, CurvePath, LineCurve3, Vector3} from 'three';

// Coordinates are local to the inclined cabinet. Every visible rail and every
// marble uses this same geometry; no second, approximate motion path exists.
export const cabinetIncline = .1;
export const ballRadius = .25;
export const railHalfWidth = .36;
// Fit the measured plate pitch without scaling physical marbles or heap slots.
export const binCenters = Object.freeze([-5.798500, -3.509167, -1.219834, 1.069499, 3.358831, 5.648164]);
export const feedX = Object.freeze([-4.524264767324695,-2.612153814890732,-0.700042862456768,1.2120680899771958,3.1241790424111597,5.036289994845124]);
export const controlPanelOffsetZ = -.65;
export const wheelCenter = new Vector3(4.9558316654, 2.20, 2.8210430652);
export const wheelRadius = 1.2994978042;
export const wheelTiltX = -.65;
export const cupCount = 6;
export const returnLaneZ = 6.36;
export const binFrontZ = 6.82;
export const binTopY = .95;
export const launchGateForward = .38;
export const launchGateLift = .52;
export const routingGateY = 1.88;
export const routingGateZ = 5.14;
export const trapdoorWidth = 1.76;
export const trapdoorHingeZ = returnLaneZ - .38;
export const trapdoorDepth = .76;
export const returnChannelY = -1.2;
export const returnChannelZ = 8.15;
export const returnBedOffset = ballRadius + .01;
export const recyclingOutlet = new Vector3(5.986234, -1.56, 10.850277);
const wheelXAxis = new Vector3(1, 0, 0);
export function wheelCupPosition(angle, target = new Vector3()) {
  return target.set(Math.sin(angle) * wheelRadius, -Math.cos(angle) * wheelRadius, 0)
    .applyAxisAngle(wheelXAxis, wheelTiltX).add(wheelCenter);
}
export function wheelLocalPosition(position, target = new Vector3()) {
  return target.copy(position).sub(wheelCenter).applyAxisAngle(wheelXAxis, -wheelTiltX);
}
export const wheelBottom = wheelCupPosition(0);
export const point = (x, y, z) => new Vector3(x, y, z);
const vector = value => value instanceof Vector3 ? value.clone() : point(...value);
const line = (start, end) => new LineCurve3(vector(start), vector(end));
export const cubic = (a, b, c, d) => {
  const curve = new CubicBezierCurve3(...[a, b, c, d].map(vector));
  curve.arcLengthDivisions = 320;
  return curve;
};
const path = (...curves) => {
  const result = new CurvePath();
  curves.filter(curve => curve.getLength() > 1e-9).forEach(curve => result.add(curve));
  // CurvePath.getPoint already distributes its parameter by component length.
  // Avoid applying an approximate arc-length conversion a second time.
  result.getPointAt = (u, target) => result.getPoint(u, target);
  result.arcLengthDivisions = 1800;
  return result;
};

// Calibrated projected rail runs. Gravity heights descend independently of
// cabinet-local Y, allowing the reference's taller stacked stanchions.
const collector = cubic([-6.2896401196,1.6071501823,-3.6648938467],[-3.9041542247,1.8522801471,-0.9212700661],[-1.033537895,1.815844765,-0.783574258],[0.8007777383,1.8288677851,-0.3532778628]);
const upperReturn = line([0.7729154758,1.8912593225,0.569056989],[-4.2093757825,1.8348637372,0.9585674257]);
// Move the middle runs toward the back while preserving endpoint world-gravity
// heights. The adjoining finite-radius turns remain tangent to both runs.
const middleOut = line([-4.0774241396,1.8679442004276983,1.8391863780132067],[0.6476237828,1.8127902177276982,2.241071426413207]);
const middleReturn = line([0.621660708,1.8572991354949724,3.185510289558072],[-5.2124452639,1.804749169651817,3.563265217569373]);
const lowerOut = line([-5.0723268178,1.897586176,4.7890392331],[1.2354517512,1.8533065363,4.7483872541]);
const turnBetween = (incoming, outgoing, startReach, endReach) => {
 const start=incoming.getPointAt(1),end=outgoing.getPointAt(0);
 return cubic(start,start.clone().addScaledVector(incoming.getTangentAt(1),startReach),
  end.clone().addScaledVector(outgoing.getTangentAt(0),-endReach),end);
};
export const mainCurve = path(
 collector,turnBetween(collector,upperReturn,.53,.53),
 upperReturn,turnBetween(upperReturn,middleOut,.52,.73),
 middleOut,turnBetween(middleOut,middleReturn,.63,.66),
 middleReturn,turnBetween(middleReturn,lowerOut,.84,.99),
 lowerOut,
 // Move behind the distributor while still high, then descend to the
 // unchanged horizontal wheel inlet. Both internal joins share a tangent.
 path(cubic(lowerOut.getPointAt(1),lowerOut.getPointAt(1).addScaledVector(lowerOut.getTangentAt(1),1.1),
  [2.45,1.73,3.70],[2.75,1.68,3.55]),
  cubic([2.75,1.68,3.55],[3.05,1.63,3.40],[3.40,1.188,3.56],[3.65,1.18,3.57]),
  cubic([3.65,1.18,3.57],[3.90,1.172,3.58],wheelBottom.clone().add(new Vector3(-.80,0,0)),wheelBottom)),
);
export const mainLength = mainCurve.getLength();
export const loadingProgress = 1 - 1.65 / mainLength;
export const loadingPoint = mainCurve.getPointAt(loadingProgress);
const collectorLength = mainCurve.curves[0].getLength();
// Resolve a lateral junction on the actual curved collector, then express it
// in the same arc-length parameter used by the complete moving track.
function collectorProgressAtX(x) {
  let lo=0,hi=1;
  for(let i=0;i<52;i++) {
    const mid=(lo+hi)/2;
    if(collector.getPointAt(mid).x<x)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
}
export const feedMergeX = Object.freeze([-3.5,-2.2,-.2,-.2,-.2,-.2]);
export const collectorZAtX = x => collector.getPointAt(collectorProgressAtX(x)).z;
export const feedMergeProgress = feedMergeX.map(x => collectorProgressAtX(x)*collectorLength/mainLength);
const gravity=p=>p.y*Math.cos(cabinetIncline)-p.z*Math.sin(cabinetIncline);
const atGravity=(p,g)=>p.clone().setY((g+p.z*Math.sin(cabinetIncline))/Math.cos(cabinetIncline));
// The four right launchers share one physical collector. Its finite-radius
// reversal joins the main track once; logical routes reuse these exact pieces.
const sharedMerge=collector.getPointAt(collectorProgressAtX(-.2));
const sharedTangent=collector.getTangentAt(collectorProgressAtX(-.2));
const turnRadius=.45,quarterHandle=.5522847498307936*turnRadius;
const turnT=point(sharedTangent.x,0,sharedTangent.z).normalize();
const turnN=point(-turnT.z,0,turnT.x);
const turnLast=sharedMerge.clone().addScaledVector(sharedTangent,-quarterHandle);
const turnGravity=gravity(sharedMerge);
const turnStart=atGravity(sharedMerge.clone().addScaledVector(turnN,-2*turnRadius),turnGravity+.075);
const turnB=atGravity(turnStart.clone().addScaledVector(turnT,-quarterHandle),turnGravity+.0748);
const turnMid=atGravity(sharedMerge.clone().addScaledVector(turnN,-turnRadius).addScaledVector(turnT,-turnRadius),turnGravity+.050);
const turnC=atGravity(turnMid.clone().addScaledVector(turnN,-quarterHandle),turnGravity+.070);
const turnE=atGravity(turnMid.clone().addScaledVector(turnN,quarterHandle),turnGravity+.030);
const turnIncoming=turnB.clone().sub(turnStart).normalize();
const sharedQuarterA=cubic(turnStart,turnB,turnC,turnMid);
const sharedQuarterB=cubic(turnMid,turnE,turnLast,sharedMerge);
const splitCubic=(curve,t)=>{
 const a=curve.v0.clone().lerp(curve.v1,t),b=curve.v1.clone().lerp(curve.v2,t),c=curve.v2.clone().lerp(curve.v3,t);
 const d=a.clone().lerp(b,t),e=b.clone().lerp(c,t),p=d.clone().lerp(e,t);
 return [cubic(curve.v0,a,d,p),cubic(p,e,c,curve.v3)];
};
const trunkRight=atGravity(point(feedX[5]-1.10,0,-.65),gravity(point(feedX[5],1.65,-3.36))-.014);
const sharedTrunk=cubic(trunkRight,atGravity(point(2.90,0,-1.10),gravity(trunkRight)-.005),
 turnStart.clone().addScaledVector(turnIncoming,-1.30),turnStart);
const trunkParameterAtX=x=>{
 let lo=0,hi=1;
 for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(sharedTrunk.getPoint(mid).x>x)lo=mid;else hi=mid;}
 return (lo+hi)/2;
};
const branchJoinX=[null,null,.25,1.65,2.15,feedX[5]-1.10];
const branchTails=feedX.map((x,i)=>i>1?path(splitCubic(sharedTrunk,trunkParameterAtX(branchJoinX[i]))[1],sharedQuarterA,sharedQuarterB):null);
export const feedCollectorCurve=path(sharedTrunk,sharedQuarterA,sharedQuarterB);
const inputReversal=(end,tangent)=>{
 const radius=.42,k=.5522847498307936*radius;
 const t=point(tangent.x,0,tangent.z).normalize(),n=point(-t.z,0,t.x);
 const last=end.clone().addScaledVector(tangent,-k),g=gravity(end),step=gravity(last)-g;
 const begin=end.clone().addScaledVector(n,2*radius),mid=end.clone().addScaledVector(n,radius).addScaledVector(t,-radius);
 const a=atGravity(begin,g+4*step),b=atGravity(begin.clone().addScaledVector(t,-k),g+4*step-.0001);
 const c=atGravity(mid.clone().addScaledVector(n,k),g+3*step),d=atGravity(mid,g+2*step),e=atGravity(mid.clone().addScaledVector(n,-k),g+step);
 return path(cubic(a,b,c,d),cubic(d,e,last,end));
};
export const feedRailCurves=feedX.map((x,index)=>{
 const start=point(x,1.65,-3.36),startGravity=gravity(start);
 if(index<2) {
  const merge=mainCurve.getPointAt(feedMergeProgress[index]);
  const tangent=collector.getTangentAt(collectorProgressAtX(feedMergeX[index]));
  const z=Math.min(-1.0,merge.z-.10);
  return cubic(start,atGravity(point(x-.04,0,z),startGravity),merge.clone().addScaledVector(tangent,-.38),merge);
 }
 const tail=branchTails[index],join=tail.getPointAt(0),incoming=tail.getTangentAt(0);
 if(index<4){
  const turn=inputReversal(join,incoming),entry=turn.getPointAt(0),entryT=turn.getTangentAt(0);
  return path(cubic(start,atGravity(point(x-.04,0,-2.60),startGravity-.005),entry.clone().addScaledVector(entryT,-.50),entry),...turn.curves);
 }
 return cubic(start,atGravity(point(x-.04,0,-2.85),startGravity-.005),join.clone().addScaledVector(incoming,-.85),join);
});
export const feedCurves=feedRailCurves.map((branch,index)=>index<2?branch:path(...(branch.curves??[branch]),...(branchTails[index].curves??[branchTails[index]])));

// The wheel is the only powered ascent. Its outlet moves out of the wheel
// plane before joining a gently descending right-to-left distribution rail.
export const exitCurve = path(
  line(wheelBottom, [5.40, wheelBottom.y, wheelBottom.z]),
  cubic([5.40, wheelBottom.y, wheelBottom.z], [6.20, wheelBottom.y, wheelBottom.z],
    [6.48, 1.20, 4.60], [6, 1.20, 4.60]),
);
export const distributionCurve = line([6, 1.20, 4.60], [-6, 1.18, 4.60]);
export const distributionProgress = binCenters.map(x => (6 - x) / 12);
export const binCurves = binCenters.map((x, bin) => {
  const merge = distributionCurve.getPointAt(distributionProgress[bin]);
  // The mild rise remains downhill after the cabinet incline is applied.
  return cubic(merge,[x,merge.y+(1.20-merge.y)/3,4.6+.24/3],
    [x,merge.y+(1.20-merge.y)*2/3,4.6+.24*2/3],[x,1.20,4.84]);
});

export function heapPosition(bin, slot) {
  const safeBin = Math.max(0, Math.min(5, Math.trunc(bin)));
  const safeSlot = Math.max(0, Math.min(23, Math.trunc(slot)));
  // Close-packed 3/2/3 columns retain all 24 slots at the actual .25 radius.
  // Each layer fills rear-to-front; reverse release order clears the aisle.
  // A shallower row pitch moves the heap toward the label without crossing
  // the native front trapdoor or changing supported layer/column ordering.
  const pitch=.525,rowPitch=.515,layerRise=.44;
  let x,z,layer;
  if(safeSlot<9) {
    layer=0;x=(safeSlot%3-1)*pitch;z=4.78+Math.floor(safeSlot/3)*rowPitch;
  } else if(safeSlot<15) {
    const local=safeSlot-9;
    layer=1;x=(local%2-.5)*pitch;z=4.78+Math.floor(local/2)*rowPitch;
  } else {
    const local=safeSlot-15;
    layer=2;x=(local%3-1)*pitch;z=4.78+Math.floor(local/3)*rowPitch;
  }
  return point(binCenters[safeBin]+x,-.495+layer*layerRise,z);
}

export function binRoute(bin, slot) {
  const target = heapPosition(bin, slot);
  const handoff = point(binCenters[bin], 1.20, 4.92);
  const overhead = point(target.x,1.15,returnLaneZ);
  // Enter through the clear front aisle rather than falling through the fixed
  // distribution bed over the rear row. Fill order leaves the target column
  // ahead empty; staggered layers clear the retained spheres underneath.
  const front=point(target.x,target.y+.105*(returnLaneZ-target.z),returnLaneZ);
  return path(
    binCurves[bin],
    line(binCurves[bin].getPointAt(1), handoff),
    cubic(handoff,[handoff.x,1.20,5.10],[target.x,1.15,returnLaneZ-.1],overhead),
    line(overhead,front),line(front,target),
  );
}

// The first bin enters a live left elbow before the shared horizontal lane.
export const leftReturnElbow = path(
  cubic([-7.1,-1.28,returnLaneZ],[-7.8,-1.28,returnLaneZ],
    [-7.95,-1.235,6.85],[-7.95,-1.22,7.10]),
  cubic([-7.95,-1.22,7.10],[-7.95,-1.1975,7.475],
    [-7.25,-1.1848178138,returnChannelZ],[-6,returnChannelY,returnChannelZ]),
);
export const returnCurve = path(
  ...leftReturnElbow.curves,
  line([-6, returnChannelY, returnChannelZ], [6.35, -1.35, returnChannelZ]),
  // The same live return lane winds around the service pocket. A local rise
  // on the forward right bend is downhill in the inclined cabinet's frame.
  cubic([6.35, -1.35, returnChannelZ], [7.30, -1.35, returnChannelZ],
    [7.30, -1.27, 9.03], [6.35, -1.27, 9.03]),
  line([6.35, -1.27, 9.03], [-4.75, -1.39, 9.03]),
  // This crescent passes through a real opening in the front walnut rail.
  cubic([-4.75, -1.39, 9.03], [-5.90, -1.39, 9.03],
    [-5.90, -1.45, 10.15], [-4.75, -1.45, 10.15]),
  line([-4.75, -1.45, 10.15], [5.20, -1.51, 10.15]),
  cubic([5.20,-1.51,10.15],[5.64,-1.512653,10.15],
    [5.55,-1.56,10.850277],recyclingOutlet),
);
// The swept floor must clear the spherical marble through the vertical knee.
// Blend back to the shared bed height so the physical collector join is flush.
export function returnDropBedOffset(u) {
  const q = Math.max(0, Math.min(1, (u - .60) / .40));
  return ballRadius+.15 - (ballRadius+.15 - returnBedOffset) * q * q * (3 - 2 * q);
}
export const returnStraight = returnCurve.curves[2];
export const returnMergeProgress = binCenters.map((x,bin) => bin===0?0:
  (leftReturnElbow.getLength()+((x+6)/12.35)*returnStraight.getLength())/returnCurve.getLength());
export function returnDropCurve(bin, from = heapPosition(bin, 0)) {
  const start = vector(from);
  const lane = point(start.x, start.y, returnLaneZ);
  if(bin===0) {
    const aligned=point(binCenters[0],start.y,returnLaneZ);
    const underDoor=point(binCenters[0],-1.28,returnLaneZ);
    return path(line(start,lane),line(lane,aligned),line(aligned,underDoor),line(underDoor,leftReturnElbow.getPointAt(0)));
  }
  const underDoor = point(start.x, returnChannelY, returnLaneZ);
  const merge = returnCurve.getPointAt(returnMergeProgress[bin]);
  return path(line(start, lane),line(lane, underDoor), cubic(underDoor,
    [start.x, returnChannelY, 6.65], [merge.x, merge.y, returnChannelZ-.4], merge));
}
// Only the common chute below the floor has fixed rail geometry. The roll
// across the heap's clear front lane is a free movement, with no tube inside
// the settled marbles. Individual x offsets converge below the trapdoor.
export const returnCurves = binCenters.map((x, bin) => returnDropCurve(bin, point(x, -.84, returnLaneZ)));
export const worldGravityHeight = position => position.y * Math.cos(cabinetIncline) - position.z * Math.sin(cabinetIncline);
export const durations = Object.freeze({launch: .18, feed: .7, track: 4.7, loading: .45, wheel: 3.5, exit: .7, distribution: .9, bin: .7, returnDrop: 1.0, recycle: 3.0, spawnGap: .2});
