# CR3@TIX PONG — Mobile performance pass

## Goals

Preserve gameplay and the visual identity while reducing intermittent frame drops on Android/mobile browsers.

## Changes

- Fixed-step physics reduced from 120 Hz to 60 Hz.
- Mobile-first visual budgets for particles, trails and blur.
- Ultra quality is no longer auto-selected on high-DPR mobile devices.
- Canvas environment is cached instead of rebuilding large gradients every frame.
- Ball trails no longer allocate one radial gradient per trail point per frame.
- Particle rendering avoids per-particle save/restore transforms.
- Particle spawning is capped against the active visual budget.
- Touch sensitivity input is coalesced to one processed move per animation frame.
- DOM mutation synchronization for the sensitivity UI is requestAnimationFrame-throttled.
- Decorative page blur/noise layers are disabled while the Canvas game is active.
- An FPS guard removes non-essential CSS shadows only after a sustained framerate drop and restores them after recovery.

## Non-regression constraints

- Same world size and collision geometry.
- Same maximum ball speed.
- Same game modes, campaign, bosses, power-ups and Ultimates.
- Same touch sensitivity range and default value.
- Same core Ice/Fire arena identity.
