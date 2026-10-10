# Playable blend verification

2026-10-10. The approved 3D scene is connected to the real-quantity, conservative-cap game model.

- Prototype suite: 29 tests (10 planner, 13 persistent inventory, 6 shared route/sample reference). Tests were introduced with failing behavior before implementation. Independent safety dataset constraints, established upper limits and stricter regional limits are enforced during dose enumeration.
- Legacy suite: 20 planner/physics tests retained for the unchanged SVG fallback.
- Planner review enumerated 23,760 feasible initial priority vectors; every nonzero priority decrease remained feasible. All-max goals are infeasible. A 6,000-step mixed move test verifies directional quantities and cap compliance.
- Independent reviewer ran 1,800 planner-to-inventory transitions, accepting 1,431 moves. Every increase retained the active tokens. Final inventory matched its 16 desired settled marbles with no pending ejection. Reduced-motion switching was included.
- Browser checks: 1440×900, 1024×768, 390×667, 390×844, actual controls, blocked Sleep feedback, multiple rapid React clicks, complete wheel journey and actual quantities, overlap, live decrease ejection and rapid re-add. Increases retained current token IDs and initiated no ejections. A four-ball decrease/re-add restored the exact IDs and settled count without duplicates.
- Initial inventory is seeded immediately. New additions travel through input, shared track, loading detent, six exclusive wheel cups for a full turn, and the appropriate compartment. Survivor tray slots remain fixed. Exit rails ramp toward the camera to pass above the serpentine in three-dimensional space.
- Keyboard: details open with focus on the close control and restore focus to the opener. Mobile detail popovers remain in bounds and scroll internally. Blocked controls are exposed with aria-disabled and an accessible reason; clicking/focusing a lock explains it without changing the blend.
- Browser console: no errors or warnings on a fresh preview. White background, existing typography, controls, materials, lighting and layout concept retained. No navigation or new permanent panels.

The build uses the existing React/Fiber/Drei/Three dependencies. Vite reports a large single 3D chunk (about 343 kB gzip); it is a successful production build, not a rendering or test failure. The game uses prescribed curve motion, queue spacing and a mechanically gated wheel rather than a general-purpose rigid-body solver. Evidence weights and conflict thresholds are gameplay choices, not clinical efficacy or medical suitability scores.
