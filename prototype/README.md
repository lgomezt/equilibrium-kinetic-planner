# 3D machine study

Independent React Three Fiber / Three.js / Drei prototype at `/prototype/`.

The original planner remains at `/`. None of its HTML, CSS, calculation code, physics, datasets or state management are changed. The prototype reuses the original typography and battery styles in a separate React shell. Its battery values are local visual controls and deliberately have no connection to the sample animation or calculation code.

The orthographic scene uses real tube/ribbon geometry, physical chrome and glass materials, a procedural Drei environment with softbox Lightformers, soft shadows, rotating mechanical cups, and four collection compartments. The repeating 25-second sequence sends one sample marble through an input, the serpentine, one full wheel turn, and its matching tray compartment. Successive cycles alternate the four sample colors. These are visual samples, not recommended quantities. Motion is deterministic curve animation with a short gravity-like exit fall, rather than a new physics or recommendation engine.

Run `npm ci`, `npm run dev`, then open the printed `/prototype/` URL. `npm run build` writes only `../dist/prototype/`; original production assets are retained. `npm test` verifies route continuity, all input/bin combinations, a complete wheel revolution, collection positions, monotonic downhill travel and cycle recycling.

Reduced motion freezes the moving demonstration and leaves the static material study. Browser-only `window.machineStudy.seek(seconds)`, `.snapshot()` and `.resume()` support visual verification; they are not UI controls or planner integrations.

Visual direction must be approved before replacing the original visualization or connecting recommendation state.

Implementation references: [Fiber installation and React compatibility](https://r3f.docs.pmnd.rs/getting-started/installation), [Drei environment and Lightformers](https://drei.docs.pmnd.rs/staging/environment), [Three.js physical materials](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial).
