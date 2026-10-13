// The front access flap and under-floor shutter share the existing trapdoor
// command. These are presentation transforms; inventory state is untouched.
export const FRONT_HATCH = Object.freeze({
 flapOpenAngle: Math.PI / 2,
 flapPivot: Object.freeze([0, -.40, 7.51]),
 flapSlide: Object.freeze([0, -1.28, -1.44]),
 flapFaceOffset: Object.freeze([0, .52, 0]),
 shutterClosedY: -1.205,
 shutterZ: 7.12,
 shutterSlatClosedY: Object.freeze([-.21, 0, .21]),
 shutterSlatOpenY: -.45,
 skirtClosedY: -1.08,
 skirtClosedOffsets: Object.freeze([-.33,.33]),
 skirtOpenY: -2.145,
 skirtZ: 7.60,
});
export function poseFrontHatch(actuator, angle = 0) {
 if (!actuator) return;
 const opening = Math.max(0, Math.min(1, angle / (Math.PI / 2)));
 if (actuator.flap) {
  actuator.flap.rotation.x = opening * FRONT_HATCH.flapOpenAngle;
  actuator.flap.position.set(...FRONT_HATCH.flapSlide.map(v => v * opening));
 }
 for (let i=0;i<3;i++) {
  const slat=actuator[`shutter${i}`];
  if(slat) slat.position.y=FRONT_HATCH.shutterClosedY+FRONT_HATCH.shutterSlatClosedY[i]*(1-opening)+FRONT_HATCH.shutterSlatOpenY*opening;
 }
 for (let i=0;i<2;i++) {
  const slat=actuator[`skirt${i}`];
  if(slat) slat.position.y=(FRONT_HATCH.skirtClosedY+FRONT_HATCH.skirtClosedOffsets[i])*(1-opening)+FRONT_HATCH.skirtOpenY*opening;
 }
}
