# Equilibrium pinball cabinet

The React planner is presented as an inclined space-themed arcade cabinet at `/prototype/` in development and at both `/` and `/prototype/` after the production preparation step. React Three Fiber, Three.js and Drei render the walnut frame, printed navy playfield, chrome serpentine, six launch chutes, star-centered Ferris wheel, collection compartments and transparent return channel. Accessible HTML controls and dosage labels are attached to physical panels.

The supplied cabinet reference guides the arched illuminated backglass, scalloped cream control panel, raised Saturn and rocket, angled collector and opposing chrome serpentine, tilted champagne wheel, jewel-marked compartments, curved glass return loop and compact engraved fuel/evidence pocket. The portrait cabinet stays centered at up to 1280px wide; shorter desktop windows scroll vertically so controls retain their size. `ReferenceHeader.jsx`, `ReferenceDecor.jsx` and `ReferenceMechanisms.jsx` contain the corresponding visual assemblies.

On phones, **Zoom cabinet** enlarges the same mounted cabinet for readable controls and native touch scrolling. **Fit cabinet** restores the complete composition. Zooming retains the current quantities, token identities and evidence controls. The HTML fallback remains a normal scrollable planner.

The narrow fuel bar's round info button opens the complete status and evidence boundaries. Live status announcements remain available to assistive technology. Pressing a blocked increase also opens its explanation without changing the selected quantities.

`planner.js`, the supplement data and the atomic React reducer remain authoritative. The cabinet uses the existing four supplements and leaves two compartments unassigned. A marble represents the same fixed portion as before; no illustrative recommendation enters the application state. The original SVG application is retained at `/legacy/`.

The repository synchronization includes the upstream planner safety-limit enforcement and immutable catalog, fixes to the earlier inventory and motion modules, and evidence-dialog accessibility improvements. The cabinet uses its own `src/arcade/mechanical-inventory.js` and `src/arcade/paths.js`; the earlier `src/inventory.js`, `src/motion.js` and `src/Scene.jsx` remain as tested prior implementation modules. The visual redesign checkpoint documented below predates this synchronization, so its source-equality guards are historical evidence rather than a claim that the current planner is unchanged.

## Run and build

Use **Node.js 22.12 or newer**. From the repository root:

```sh
npm ci --prefix prototype
npm run dev --prefix prototype
```

Open **http://127.0.0.1:4175/prototype/**, or the `/prototype/` URL printed by Vite if that port is occupied. To preview the production build, stop the development server and run:

```sh
npm run build --prefix prototype
node prototype/publish-prep.mjs
python3 -m http.server 4173 --directory dist
```

Open **http://localhost:4173/** or **http://localhost:4173/prototype/**. Vite writes only `dist/prototype/`; `publish-prep.mjs` copies its built entry point to `dist/index.html` and retains the original SVG application at `/legacy/`. The generated `dist/prototype/` directory is ignored by Git and must be rebuilt after a fresh checkout. Serving `dist/` without rebuilding and preparing it can show an older entry point or missing generated assets. Deploy the complete prepared `dist/` directory using the existing Sites hosting manifest.

Two independent review pages are included:

- `/prototype/material-study.html`: the initial cabinet, material and artwork study, with no planner or animation integration.
- `/prototype/cabinet-study.html`: the complete static composition, with the six explicitly illustrative sample labels from the design specification. These samples are isolated from the live planner. Existing sample tokens are distributed across their launch cups, wheel holders, tracks, return lane and remaining bin heaps; the live interface always displays its authoritative inventory.

Cabinet artwork combines local mesh geometry, procedural/SVG textures and **11 selected photographic surface assets**: the large foreground moon, Saturn globe, rocket's silver body, seven small playfield asteroids and the small foreground companion. Object-only crops from the supplied cabinet reference are mapped onto real opaque 3D sculptures. Their masks blend surface color while retaining physical geometry, depth and shadows; excluded regions keep the native material. The small rocks' native edge color was also corrected to reduce pale rims and lifted shadows around the photographic surface. The original-RGB artwork carries lighting from the fixed reference view, so it is not fully procedural or a view-independent lighting reconstruction. Source bounds, masks and provenance accompany the assets. Separate title-only reference glyph artwork preserves the semantic native heading and has a native visual fallback if its image fails to load. The procedural studio environment is supplemented by `public/reflections/cabinet-interior.hdr`, a bundled, prefiltered CubeUV capture prepared offline from the fixed cabinet. `CabinetReflections.jsx` projects that map within the cabinet bounds onto selected metals, preserving their existing shader finishes. The app loads this already-filtered local asset without recapturing or filtering it at runtime; if it cannot load, the cabinet retains the procedural studio reflections. Rendering requires no third-party asset host. Open Sans ExtraBold is bundled under Apache 2.0, and Nimbus Sans Narrow under AGPL-3 with the font exception. Their license notices are included in `src/arcade/fonts/`.

## Planner contract

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

`isDoseAllowed` filters tiers against the smallest applicable catalog cap, planner cap and established limit before candidate enumeration. `toPlan` reports that effective cap. Catalog and safety data are immutable.

## Presentation mechanics

`src/arcade/paths.js` supplies the shared rail and marble paths. `mechanical-inventory.js` advances paused GSAP timelines deterministically: launch gates open, each token traverses the connected serpentine, completes one wheel revolution, and enters its correct bin. Surplus tokens leave through the front trapdoor and return channel. Queued, carried and recycling tokens retain their identities through rapid changes and converge to the latest planner quantities.

The selected main rail uses a deeper hanging metal skirt with a maximum depth of 0.85 world units, tapering at the distributor approach. It partly conceals the straight support posts; constant wall normals keep the broad metal faces smooth while the upper rims retain their rolled geometry. The wheel adapter has a warmer metal finish. Each of the six bins owns one fastener asset set shared by its four domed corner screws. Colored marbles use a separate softbox reflection map; the cabinet's metal and studio environments retain their own lighting.

The selected main rail is 0.60 world units wide, reducing the oversized dark trough area. Its native paths and sphere radius stay fixed, but width-derived clamp spans, wheel-mouth floor and lamp offsets change; the lamps move approximately 2.5–3.3 reference pixels inward. A new strict fixed-geometry scan passes, and the floor contact texture was rebaked from the narrower geometry. The return badge now uses three open cream chevrons. Both changes were selected from actual native renders; they remain partial visual improvements.

`ArcadeMarbles.jsx` renders six instanced batches and updates meshes and mechanical refs without React state changes per frame. Fixed opaque cabinet parts share merged geometry, preserving per-vertex pigments and mirrored winding. Compatible opaque parts within each actuator are also merged in that actuator's local coordinates. The original actuator groups and native animation refs remain in place; independently moving descendants, such as counter-rotating wheel cups, receive separate local batches. Transparent and transmissive parts remain separate. Cleanup restores the authored meshes and disposes only the generated batch geometry. Projected labels appear only after their fonts and camera/object matrices have settled, including after resizing. The scene requests frames while a journey is active and uses demand rendering when settled. Hidden pages pause the presentation timeline. Reduced motion immediately displays exact selected quantities. A scrollable HTML planner remains available when WebGL cannot initialize.

The existing browser inspection hooks remain available: `window.supplementPlanner.snapshot()` reports the authoritative state; `window.supplementMachine.snapshot()` reports the presentation inventory, and `.advanceForTest(seconds)` advances its deterministic timeline. They are verification hooks, not product controls.

## Reference review checkpoint

This section records the selected visual redesign before synchronization with upstream `main`. Its paired-crop artifacts and later validation paths refer to the cloud review archive; they are not application dependencies and are not included in the repository.

The reference inventory contains **361 features**, and **all 361 now have individual paired-crop reviews**. Each per-ID record identifies the image checkpoint, visible shape, material, placement, pose, residual differences and any uncertainty. The review artifacts include named bounds, native pairs and contact sheets outside the application bundle. Later observations supersede earlier checkpoints rather than adding duplicate features to the count.

**There are zero pixel-exact feature certifications.** Close contours or anchors are limited findings, not acceptance of their materials, lighting or every repeated detail. Numbered same-color marbles cannot always be uniquely matched between images; the review preserves that ambiguity rather than assigning identities from general heap similarity.

Remaining differences include feed topology and broad rail floors, angular wheel supports and shallow relief, the lower return housing, some typography, compact tall heaps instead of the reference's lower loose rows, and photographic reflections and contact shading. The selected surface artwork improves specific visible details without establishing exact whole-feature equivalence. Mechanical clearance and test success do not establish visual fidelity.

Floor-only contact shading is selected at **0.4 strength**. Its **384 × 320 texture** was baked from the real fixed geometry using **3,932,160 offline rays**. The application samples that local texture on the floor; it adds no runtime AO pass, extra lights or runtime ray casting.

## Validation

The merged repository passes **63/63 prototype tests**, **20/20 original application tests**, and the production build. This includes the upstream regression coverage and the cabinet tests. These results supersede the two prototype baseline failures recorded in the historical checkpoint below. The build retains Vite's large-chunk advisory.

Run the current code's checks from the repository root:

```sh
npm test --prefix prototype
node --test tests/*.test.mjs
npm run build --prefix prototype
```

The focused cabinet checks can also be run from `prototype/` with `node --test tests/arcade-*.test.mjs tests/projection-readiness.test.mjs tests/return-cover.test.mjs`.

### Historical visual-redesign validation

All results below were recorded **before the upstream synchronization**. At that checkpoint, focused checks passed **34/34**: **29 arcade**, **4 readiness** and **1 cover-geometry** checks. The original application recheck passed **20/20**. The complete prototype recheck passed **57/59**, with two baseline failures: the legacy inventory's bottom-wheel overlap and the planner's independent safety-limit test. The upstream synchronization brings in fixes covering those areas; the historical 57/59 result does not describe the merged code's current test status. All **8 business-source guards passed at that earlier checkpoint**, confirming equality of the then-checked planner, data, reducer entry point, legacy motion/inventory and legacy test files against the saved pre-redesign baseline. Those source-equality results do not apply to upstream changes now included in the repository.

The selected 0.60-width geometry reports **0 contacts** across **191,299 route/slot samples** and **2,351 fixed source meshes**, including physical glass and return beds, at the actual colored-marble radius of **0.25** and zero contact tolerance. Front-mechanism sweeps report **0 contacts** across **168 moving meshes** and **393,120 sampled poses** at 1,200 Hz, using a conservative 0.265 clearance threshold. Cup sweeps report **0 contacts** across **54 meshes** and **11,160 relevant loading/wheel/exit frames**, drawn from a 15-second simulation at 2,400 Hz (36,000 total simulated frames). All four staged upper/falling spheres pass their full projected-disc visibility checks: **3,209 of 3,209 rays visible for each sphere**.

The fixed scan is recorded in `main-width-060-work/analysis/fixed.json`. Exact generated-geometry comparison confirms all 2,621 solid instances match the audited narrower copy, and all 270 moving solid instances plus their paths match the earlier `final-detail-mechanics` audit. The moving and staged-visibility results are retained from that unchanged hardware checkpoint. They are sampled geometric checks, not continuous collision proofs or optical transmission measurements. The fixed audit excludes moving assemblies, glow and hole masks, and reconstructs geometry before runtime batching. Separate native launch/routing tests and moving sweeps cover the actuators.

An earlier full production animation replay passed. It covered accepted and blocked quantity changes, automatic playback, wheel and return transport, retained token identities, hidden-page timeline pause, normal/reduced-motion state, evidence dialogs, resized HTML controls, isolated study pages and the WebGL fallback. That broader animation result is retained as an earlier checkpoint; it is not represented as a new full replay of every late finish.

The first integrated production checkpoint passed native control checks: blocked reasons, accepted quantities, retained token identities and evidence dialogs, with no recorded errors (`final-validation/production-captures.json`). The final mobile WebGL **Fit cabinet / Zoom cabinet** check also passed, preserving counts and token identities through zoom, scrolling, focus and return to fit (`final-validation/mobile-final`). These phone checks preceded the last rail-width and badge-paint changes; their responsive layout and control code are unchanged. The final narrower production build also passes the native control, retained-identity and evidence checks with zero recorded errors (`final-validation/production-captures-v2.json`). Its static study capture is byte-identical to the selected reviewed render; `final-working-planner-v2.png` shows the actual live inventory.

The title-artwork failure test passed with only the bundled title image forced to return 404. The native title remained visible and semantically available, the real WebGL cabinet stayed ready, and keyboard Strength changes, inventory convergence and evidence dialogs worked. The expected title-image failure was recorded separately, with no unrelated errors or failed requests (`final-validation/browser/title-artwork-missing`).

The separate optional-reflection failure replay passed. It returned 404 only for the bundled `cabinet-interior.hdr`, retained the ready WebGL cabinet through the local reflection boundary, and verified reduced-motion planner changes, evidence dialogs and converged native inventory. The expected HDR failure was logged separately; no unrelated errors or failed requests were accepted.

The earlier actuator-batching comparison reduced measured draw calls from **1,269 to 963**, retaining **4,002,006 triangles**. The native comparison differed at only **5 pixels**; disabling the batches restored the baseline image exactly. This isolates the batching change and does not describe the final scene's total geometry.

The selected native `polish-narrow-chevron` measurement reports **750 draw calls**, **3,037,492 triangles** and **37 textures** at 1212 × 1280, with **no recorded errors**. Its renderer frame counter remained **66, 66, 66** across the settled observations, providing direct evidence of idle demand rendering. These are checkpoint measurements, not a hardware frame-rate benchmark. Stable quantities or timeline pause alone were not used as proof of idle rendering.
