// Drei's transform Html roots commit separately from the Three scene. A scene
// effect or a nonzero DOM box alone does not mean those roots are positioned.
export function readOverlayProjection(container, expectedCount, size, fontsReady = true) {
 if (!container || !fontsReady || size.width <= 0 || size.height <= 0) return null;
 const roots = [...container.querySelectorAll('.arcade-projected-overlay')];
 if (roots.length !== expectedCount) return null;
 const signature = [size.width, size.height];
 for (const root of roots) {
  const cameraLayer = root.firstElementChild;
  const objectLayer = cameraLayer?.firstElementChild;
  const content = objectLayer?.firstElementChild;
  if (!cameraLayer?.style.transform.includes('matrix3d(')
   || !objectLayer?.style.transform.includes('matrix3d(') || !content?.hasChildNodes()) return null;
  if (Math.abs(parseFloat(root.style.width) - size.width) > .5
   || Math.abs(parseFloat(root.style.height) - size.height) > .5
   || !Number.isFinite(parseFloat(root.style.width)) || !Number.isFinite(parseFloat(root.style.height))) return null;
  const bounds = content.getBoundingClientRect();
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
   || bounds.width <= 0 || bounds.height <= 0) return null;
  signature.push(cameraLayer.style.transform, objectLayer.style.transform,
   bounds.x, bounds.y, bounds.width, bounds.height);
 }
 return JSON.stringify(signature);
}

export function createProjectionReadiness() {
 let previous = null;
 return {
  reset() {previous = null;},
  observe(signature) {
   const stable = signature !== null && signature === previous;
   previous = signature;
   return stable;
  },
 };
}
