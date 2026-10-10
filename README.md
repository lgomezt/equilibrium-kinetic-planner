# Equilibrium

## Overview

A single-screen, playable supplement reference blend expressed as a 3D kinetic sculpture. The React Three Fiber application is served at `/` and `/prototype/`; the original SVG application remains available at `/legacy/`.

## Architecture

The React controls use a pure, discrete planner and feed its quantities into a persistent marble inventory. An accepted `+` can add or retain balls; only `−` can remove them. Conflicting increases leave both priorities and quantities unchanged. Ingredient benefits overlap across goals, so a higher priority need not increase a dose.

The [evidence review](research/playful-blend-evidence.md) distinguishes supported associations from exploratory links. Priority weights and caffeine locks are gameplay rules, not clinical effect sizes or medical thresholds. Quantities are real, capped application references; health, medicines, and other intake are not assessed.

## Implementation Details

The planner enumerates 72 permitted combinations of ingredient tiers, subject to caps and Sleep/Calm caffeine allowances. Increases constrain each ingredient count to be at least its current count; decreases constrain counts to be no greater. The approved chrome-and-glass scene uses physical materials, a fixed orthographic camera, procedural environment reflections, and a shared six-cup wheel. See [the runtime guide](prototype/README.md) for state, motion, and quantity contracts.

## Key Files

| Path | Responsibility |
|---|---|
| [prototype/src/main.jsx](prototype/src/main.jsx) | React battery controls, atomic state reducer, dose labels, evidence popovers |
| [prototype/src/planner.js](prototype/src/planner.js) | Feasible blends, monotonic changes, blocked controls |
| [prototype/src/data/supplements.json](prototype/src/data/supplements.json) and [safety.json](prototype/src/data/safety.json) | Portion tiers, exploratory affinities, caps, source qualifications |
| [prototype/src/Scene.jsx](prototype/src/Scene.jsx) | Rails, wheel, tray, lighting, physical materials |
| [prototype/src/inventory.js](prototype/src/inventory.js) and [InventoryMarbles.jsx](prototype/src/InventoryMarbles.jsx) | Stable marble identities, routing, wheel occupancy, ejection, instanced rendering |
| [prototype/publish-prep.mjs](prototype/publish-prep.mjs) | Promote the built React entry point while retaining the legacy application |
| [research/](research/) | Original research and the revised playable-blend evidence review |

## Access Patterns

From this repository root:

```sh
npm ci --prefix prototype
npm run dev --prefix prototype
```

Open the printed `/prototype/` development URL. For a production preview:

```sh
npm test --prefix prototype
node --test tests/*.test.mjs
npm run build --prefix prototype
node prototype/publish-prep.mjs
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173/`. Vite writes `dist/prototype/`; the preparation script promotes its entry point to `/` and preserves `/legacy/`. Deploy the complete `dist/` directory using the existing Sites hosting manifest.

## Change History

- **2026-10-10:** Connected the approved 3D machine to a constrained, playable blend with real quantities, shared benefits, and monotonic additions/removals.
- **2026-10-10:** Created the independent React Three Fiber material-and-motion study and demonstrated one full mechanism journey.
- **2026-10-10:** Built the original SVG planner after independent evidence and safety research.

## Deprecated Features

The standalone repeating sample animation and disconnected visual battery values have been replaced by actual blend inventory. The previous automatic reoptimization could remove caffeine when another goal increased; the new transition constraints prevent that behavior. The original SVG runtime is retained at `/legacy/` for comparison. The earlier self-contained `equilibrium.html` output is that legacy runtime, not an offline build of the 3D application.

## Quick Reference

| Item | Reference |
|---|---|
| Active routes | `/`, `/prototype/` |
| Original application | `/legacy/` |
| Runtime tests | `npm test --prefix prototype` |
| Legacy tests | `node --test tests/*.test.mjs` |
| Scientific qualifications | [research/playful-blend-evidence.md](research/playful-blend-evidence.md) |
| Browser verification APIs | `window.supplementPlanner.snapshot()`, `window.supplementMachine.snapshot()`, `window.supplementMachine.advanceForTest(seconds)` |
