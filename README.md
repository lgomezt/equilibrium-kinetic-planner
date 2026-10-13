# Equilibrium

## Overview

A playable supplement reference blend presented as a space-themed 3D pinball cabinet. The React Three Fiber application has a walnut frame, illuminated navy playfield, six priority controls, chrome marble tracks and a mechanical wheel. The portrait cabinet scrolls on shorter screens and offers Fit / Zoom controls on phones. After building and preparing production assets, it is served at `/` and `/prototype/`; the original SVG application remains available at `/legacy/`.

## Architecture

The React controls use a pure, discrete planner and feed its quantities into a persistent marble inventory. An accepted `+` can add or retain balls; only `−` can remove them. Conflicting increases leave both priorities and quantities unchanged. Ingredient benefits overlap across goals, so a higher priority need not increase a dose.

The [evidence review](research/playful-blend-evidence.md) distinguishes supported associations from exploratory links. Priority weights and caffeine locks are gameplay rules, not clinical effect sizes or medical thresholds. Quantities are real, capped application references; health, medicines, and other intake are not assessed.

## Implementation Details

The planner enumerates 72 permitted combinations of ingredient tiers, subject to caps and Sleep/Calm caffeine allowances. Increases constrain each ingredient count to be at least its current count; decreases constrain counts to be no greater. The cabinet uses physical materials, a fixed orthographic camera, bundled artwork and reflection assets, and a shared six-cup wheel. Its four live ingredient compartments reflect the real planner; two spare compartments remain unassigned. The separate composition study uses illustrative reference labels. See [the runtime guide](prototype/README.md) for state, motion, and quantity contracts.

## Key Files

| Path | Responsibility |
|---|---|
| [prototype/src/main.jsx](prototype/src/main.jsx) | React battery controls, atomic state reducer, dose labels, evidence popovers |
| [prototype/src/planner.js](prototype/src/planner.js) | Feasible blends, monotonic changes, blocked controls |
| [prototype/src/data/supplements.json](prototype/src/data/supplements.json) and [safety.json](prototype/src/data/safety.json) | Portion tiers, exploratory affinities, caps, source qualifications |
| [prototype/src/arcade/ArcadeScene.jsx](prototype/src/arcade/ArcadeScene.jsx) and [Cabinet.jsx](prototype/src/arcade/Cabinet.jsx) | Cabinet, fixed camera, lighting, physical materials, projected controls and WebGL fallback |
| [prototype/src/arcade/mechanical-inventory.js](prototype/src/arcade/mechanical-inventory.js) and [ArcadeMarbles.jsx](prototype/src/arcade/ArcadeMarbles.jsx) | Stable marble identities, connected delivery and return paths, wheel occupancy and instanced rendering |
| [prototype/src/arcade/paths.js](prototype/src/arcade/paths.js) | Shared cabinet rail and marble geometry |
| [prototype/src/arcade/arcade.css](prototype/src/arcade/arcade.css) and [reference-layout.css](prototype/src/arcade/reference-layout.css) | Responsive cabinet layout, controls and evidence dialogs |
| [prototype/publish-prep.mjs](prototype/publish-prep.mjs) | Promote the built React entry point while retaining the legacy application |
| [research/](research/) | Original research and the revised playable-blend evidence review |

## Access Patterns

Use **Node.js 22.12 or newer**. From this repository root:

```sh
npm ci --prefix prototype
npm run dev --prefix prototype
```

Open **http://127.0.0.1:4175/prototype/**, or the `/prototype/` URL printed by Vite if that port is occupied. For a production preview:

```sh
npm test --prefix prototype
node --test tests/*.test.mjs
npm run build --prefix prototype
node prototype/publish-prep.mjs
python3 -m http.server 4173 --directory dist
```

Open **http://localhost:4173/** or **http://localhost:4173/prototype/**. Vite writes `dist/prototype/`; the preparation script promotes its entry point to `/` and preserves `/legacy/`. Generated prototype assets are ignored by Git, so rebuild and run the preparation script after checking out the code. Deploy the complete prepared `dist/` directory using the existing Sites hosting manifest.

## Change History

- Recreated the reference as an interactive space-themed pinball cabinet with mobile Fit / Zoom, local artwork, mechanical delivery and recycling, and accessible evidence controls. Integrated upstream planner safety checks, earlier motion/inventory fixes and production preparation.
- **2026-10-10:** Connected the approved 3D machine to a constrained, playable blend with real quantities, shared benefits, and monotonic additions/removals.
- **2026-10-10:** Created the independent React Three Fiber material-and-motion study and demonstrated one full mechanism journey.
- **2026-10-10:** Built the original SVG planner after independent evidence and safety research.

## Deprecated Features

The live planner uses actual blend inventory; illustrative labels and sample heaps are isolated in `/prototype/cabinet-study.html`. The earlier white-background 3D scene and its motion/inventory modules remain in the source and test suite, while `src/arcade/` implements the active cabinet. The previous automatic reoptimization could remove caffeine when another goal increased; the new transition constraints prevent that behavior. The original SVG runtime is retained at `/legacy/` for comparison. The earlier self-contained `equilibrium.html` output is that legacy runtime, not an offline build of the 3D application.

## Quick Reference

| Item | Reference |
|---|---|
| Development route | `http://127.0.0.1:4175/prototype/` |
| Prepared production routes | `/`, `/prototype/` |
| Original application | `/legacy/` |
| Runtime tests | `npm test --prefix prototype` |
| Legacy tests | `node --test tests/*.test.mjs` |
| Scientific qualifications | [research/playful-blend-evidence.md](research/playful-blend-evidence.md) |
| Browser verification APIs | `window.supplementPlanner.snapshot()`, `window.supplementMachine.snapshot()`, `window.supplementMachine.advanceForTest(seconds)` |
