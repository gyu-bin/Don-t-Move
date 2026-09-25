# Game assets — drop-in contract

All game art is registered in `src/assets/manifest.ts` (`ASSET_MANIFEST`).
Renderers use a registered sprite first. They fall back to procedural Skia
drawing (`src/rendering/fallback/`) only when an entry is missing. The fallback
is a temporary placeholder and is not final art.

## Characters

Final character sprite sheets follow the production contract in
`art/characters/SPEC.md`: one PNG per animation, 256×256 cells, rows Down/Up/Left/Right,
feet anchor (128, 224). Validate deliveries with `npm run sprites:validate`.
Adopted sheets are wired in `ASSET_MANIFEST`: the Player uses temporary
`player_walk.png` (known defects: `art/characters/ASSET_TODO.md`) and gameplay Guards
use the locked LEGACY `guard_directions.png`. Anything without a sheet uses the
procedural fallback, which is a dev fallback only. Each sheet row maps to
a direction clip via `StripDef` (`y = row × 256`).

## Museum environment atlas

`museum/museum_atlas.png` plus named frames in `MUSEUM_ATLAS`.

- Props use the frame names from `PropKind`: statue, statuePedestal,
  displayCase, diamondPedestal, painting, plant, bench, crate, lamp, cctv,
  pillar, door. Floor props anchor at their base. Wall-mounted props use
  `mountHeight` from `src/game/world/propKit.ts`.
- Tiles are optional: `floor` (1×1 tile), `wallTop` (1×1 tile) and `wallFace`
  (1 tile wide × `WALL_HEIGHT`). When one is missing, it is drawn procedurally.
- Objective frames: `diamond`, `exitSign`.

## UI indicators

`ui.indicators` is an atlas with the frames `question`, `alert` and `search`,
each anchored at its centre (`anchor: [0.5, 0.5]`). The suspicion ring gauge
and the glows stay as Skia overlays because live values drive them.

## Legacy

`characters/legacy/*` holds the old single-pose Unity sheets (one static frame
per direction, no walk cycle). `guard_directions.png` is the active gameplay Guard
and the **locked Guard look**: all future guard sheets must keep it.
`agent_directions.png` is not a design source. The Player look is the ASSETS
Agent Zero (`player_walk.png`); see `art/characters/SPEC.md` → Design sources.
