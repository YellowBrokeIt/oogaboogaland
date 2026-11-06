# DSB Land: island-wide wading expansion (fork-only review branch)

Branch: `feature/dsb-island-wading` in `YellowBrokeIt/oogaboogaland`.
Base: synced `rock` at `c954b9468157f0e65f928e5869eedbbf51363a51`.

## Scope

Extend the **existing wading system**, not swimming, to all accessible sections
of the island coastline. The two excluded geographic regions are the **working
harbor** and the **back of Olympus**, with its sheer rocky coast and deep drop.
This patch does not alter the inland mountain, roads, lots, buildings, piers,
water level, walking controller, player body dimensions, ripple budgets, or
any interiors. It does not create new beaches.

The 34 segments of `dsb-geography.js`'s existing coastline polygon determine
the eligibility mask. The harbor is segments 22–28; the rear Olympus edge is
segments 31–33 plus 0–5 (the polygon wraps between its final and first point).
All other 18 segments receive the original underwater shelf profile, with
a two-metre taper at the segment boundaries adjacent to exclusions. The existing Chora
beach remains in those eligible sectors.

## Implementation

- `src/js/dsb-coast.js`: `wade(coast,x,z)` uses the actual nearest authored
  coastline segment and its fractional position. The explicit harbor and rear
  Olympus lists prevent accidental access there. Smooth ramps near boundaries
  avoid hard shelf walls.
- `src/js/dsb-geography.js`: grade only offshore seabed vertices (never
  dry-land vertices); share the same seabed mesh with `heightAt`, rendering,
  player support, and the five-point body-width depth gate. Eligible sections
  use the established `shelfHeight`, `maxDepth` and movement slowdown.
  The harbor quay and piers retain their independently modeled deck support.
- `src/js/dsb-water.js`: preserve the stronger authored Chora beach foam
  mask and add **subtle** shoaling optics to other eligible coastlines. Add
  limited shore-aware triangle subdivision and water/land clipping for Canvas
  outside Chora, without modifying the FFT, wave displacement, shaders, level,
  or the two-texture GPU budget.
- `src/js/dsb-water-interaction.js` is not changed: the pre-existing player
  ripple/splash/wake interactions respond to any reachable sea water, including
  all newly wadeable shores. Beach-specific swash and rocky contact effects
  remain as authored; rocky coastline is not converted into uniform sand.

## Safety and bounded behavior

A body-wide maximum depth of `min(1.65, actor.bodyHeight * .98)` still
prevents swimming into deep water; an actor already placed too deep can retreat.
The usual walking slope and obstruction gates remain unchanged. Neither
harbor water nor the rear Olympus cliffs get a traversable seabed shelf.

A browser-free regression exercises the **real** DSB modules:

1. All 34 coastline sectors and the exact two blocked regions.
2. Dry-land approach → safe shallow wading → safe return at all 18 eligible sectors.
3. Maximum-depth stop and all 16 blocked-sector seabed and walking checks.
4. Harbor piers/quay at their original 1.35 m support elevation.
5. Shore transitions and Chora's existing beach treatment.
6. The **8,957-point inland geometry fingerprint**, identical to the synced
   upstream baseline: FNV-1a `bc6a1a4f`.
7. Ocean depth-mask treatment, harbor/Olympus exemptions and a bounded Canvas
   shore mesh.

Run locally:

```bash
node --test test/dsb-island-wading.test.mjs
npm run test:unit
npm run build
```

A branch-only GitHub Actions workflow is defined for the development branch,
although programmatic connector commits may not trigger it. CI status is not
proof of a browser-based visual playthrough unless a hosted workflow actually
completes. Desktop/mobile WebGL and Canvas visual review remain required
before merging the feature into live `rock`.
