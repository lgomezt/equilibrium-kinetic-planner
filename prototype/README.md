# Playable 3D supplement machine

## Overview

The approved React Three Fiber / Three.js / Drei machine now renders the actual playable blend. It is served at `/` and `/prototype/`, with the original SVG planner retained at `/legacy/`. The interface preserves the typography, six battery controls, white background, and single-screen composition.

## Architecture

`src/main.jsx` owns the React state through one atomic reducer. `src/planner.js` evaluates allowed ingredient tiers before committing a priority change. `src/inventory.js` owns persistent marble bodies; `src/InventoryMarbles.jsx` renders them as four colored instanced meshes. `src/Scene.jsx` retains the approved fixed orthographic camera, chrome rails, mechanical wheel, transparent tray, and procedural Drei softbox reflections. No external environment image is required.

Gameplay affinities give each goal several ingredient associations and count shared ingredients once. They are deliberately chosen balancing weights, not measured clinical effects. The [evidence review](../research/playful-blend-evidence.md) records supporting sources, weaker links, and assumptions. The visitor's health, medicines, and existing intake are not assessed.

## Implementation Details

### Planner contract

`createGameState()` constructs a feasible initial blend. `attemptChange(state, goal, delta)` accepts one `+1` or `−1` step; `getControls(state)` exposes locks and their reasons; `toPlan(state)` produces quantities and input-chute origins for the scene.

- An accepted increase keeps every ingredient count at or above its previous value.
- An accepted decrease keeps every ingredient count at or below its previous value and retains support required by other goals.
- An infeasible increase returns the same state. A blocked `+` communicates its reason without changing the blend.
- The planner searches 72 discrete combinations. Priorities cannot create a dose outside the permitted tiers or caps.

| Ingredient | One ball | Allowed nonzero daily quantities | Application cap |
|---|---:|---|---:|
| Creatine monohydrate | 250 mg | 3 g | 3 g |
| Caffeine | 25 mg | 25, 50, 75 mg | 75 mg |
| L-theanine | 50 mg | 100, 200 mg | 200 mg |
| Magnesium | 50 mg elemental | 100, 200 mg elemental | 200 mg elemental |

Zero is also permitted for each ingredient. These are application caps, not universal safety clearances. Creatine and L-theanine have no established population UL in the cited material. The magnesium cap is below the cited US 350 mg supplemental UL and narrower European 250 mg limit; unknown other products still matter.

| Higher of Sleep / Calm priorities | Caffeine allowed |
|---|---:|
| 0–1 | Up to 75 mg |
| 2 | Up to 50 mg |
| 3 | Up to 25 mg |
| 4–5 | None |

These priority cutoffs are explicit gameplay rules. High Sleep and Focus can coexist through nonstimulant associations. Exploratory links do not establish additive efficacy, and theanine or magnesium is not treated as neutralizing caffeine.

### Inventory and motion contract

The initial blend appears in the tray. New portions enter one of six chutes, traverse the continuous serpentine, wait for an available wheel cup, complete one full shared wheel revolution, and exit into their ingredient compartment. Existing tray balls persist rather than recycling on an animation timer.

Only reduced desired quantities trigger extraction. Queued portions can be cancelled before appearing; visible portions eject. Stable token identities preserve survivors and allow a rapid decrease/reincrease to revive a departing token without duplicating it. Reduced motion places desired quantities directly in the tray and applies removals immediately.

Motion is deterministic curve animation with mechanical gating and a gravity-like exit, not a general rigid-body simulation. The wheel timeline is shared by its cups and marbles.

## Key Files

| Path | Responsibility |
|---|---|
| [src/main.jsx](src/main.jsx) | Reducer, priority controls, quantities, existing-style evidence presentation |
| [src/planner.js](src/planner.js) | Candidate enumeration, directional count constraints, caffeine locks |
| [src/data/supplements.json](src/data/supplements.json) | Fixed portions, tiers, goal associations, evidence labels and sources |
| [src/data/safety.json](src/data/safety.json) | Application caps, established-limit scope, relevant cautions |
| [src/Scene.jsx](src/Scene.jsx) | Fixed camera, connected geometry, wheel, glass tray, materials and lights |
| [src/motion.js](src/motion.js) | Shared curves and route geometry; sample-journey reference calculations |
| [src/inventory.js](src/inventory.js) | Token lifecycle, queue, wheel occupancy, settlement and ejection |
| [src/InventoryMarbles.jsx](src/InventoryMarbles.jsx) | Instanced physical-material marbles and frame updates |
| [src/study.css](src/study.css) | Responsive single-screen layout and control refinements |
| [tests/](tests/) | Planner transition, inventory lifecycle, and route-continuity regressions |
| [vite.config.js](vite.config.js) | `/prototype/` asset base and `../dist/prototype/` build output |

## Access Patterns

From `prototype/`, run `npm ci`, `npm run dev`, and open the printed `/prototype/` URL. Run `npm test` for planner, inventory, and route tests. Run `npm run build`, then from the repository root run `node prototype/publish-prep.mjs` before serving or deploying the complete `dist/` directory. See the [root guide](../README.md) for the full production-preview commands and legacy tests.

Browser-only verification helpers are not additional interface controls:

```js
window.supplementPlanner.snapshot();
window.supplementMachine.snapshot();
window.supplementMachine.advanceForTest(30);
```

The planner snapshot reports priorities, counts, quantities, caps, and control locks. The machine snapshot reports its inventory and motion state. Advancing the machine supports deterministic verification without changing planner priorities.

## Change History

- **2026-10-10:** Integrated real blend quantities, constrained priority changes, persistent marbles, full wheel delivery, and reduction-only ejection.
- **2026-10-10:** Approved the chrome/glass material study with six input chutes, continuous serpentine, mechanical wheel, and four collection compartments.
- **2026-10-10:** Added the standalone sample journey and route verification before connecting application state.

## Deprecated Features

Disconnected prototype battery state, static sample heaps, and the repeating one-ball color cycle have been superseded by the planner and persistent inventory. The old `window.machineStudy` seek/resume API has been replaced by the planner and inventory verification APIs. Sample-motion calculations remain in `src/motion.js` as tested geometry references.

## Quick Reference

| Item | Reference |
|---|---|
| Goals | Sleep, Memory, Focus, Strength, Calm, Energy; integer priorities 0–5 |
| Colors identify | Ingredients, independently of goal labels |
| `+` | Add or retain quantities; block conflicts before committing |
| `−` | Retain or remove quantities; never add a replacement ingredient |
| Reduced motion | Immediate static inventory |
| Evidence and limits | [Playable blend review](../research/playful-blend-evidence.md) |
| Rendering references | [Fiber compatibility](https://r3f.docs.pmnd.rs/getting-started/installation), [Drei environments](https://drei.docs.pmnd.rs/staging/environment), [Three.js physical materials](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial) |
