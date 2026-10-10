# Equilibrium

A single-screen supplement reference planner expressed as a kinetic sculpture.

Serve `dist/` with `python3 -m http.server 4173 --directory dist` and open http://localhost:4173. The self-contained offline version in the delivered outputs can be opened directly.

Run `node --test tests/*.test.mjs` for planner and physics verification. The suite includes all 46,656 priority combinations and token delivery/ejection regressions.

`dist/data/supplements.json` and `safety.json` are the datasets used by the planner. `research/` preserves the independent, source-traceable evidence and safety reviews conducted before implementation.

Priorities are preference heuristics, not clinical scores. Creatine is selected as a fixed 3 g daily training reference; optional caffeine is one 75 mg early-day portion shared by Focus and Energy, with Sleep/Calm vetoes. Theanine and magnesium are not automatically recommended. The screen states that health, medicines and current intake are not checked; detailed assumptions and authoritative sources are available in the inline popovers.

Materials use native SVG and CSS; balls use fixed-timestep rail gravity and circle contacts, with an extraction impulse/actuator and ballistic departure. Each supplement slot has one generation-owned body. Reduced motion uses static piles.
