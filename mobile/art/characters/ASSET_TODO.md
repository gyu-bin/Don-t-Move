# Character asset TODO

## Production Locomotion Atlas V1 (2026-09-29) — current runtime asset

Direct frame generation cannot guarantee frame-consistent planted feet, so the
atlas is baked from a 2D cutout rig (`tools/locomotion`, `npm run locomotion:bake`):
`assets/characters/{player_idle,player_sneak,player_walk,player_run,guard_idle,guard_walk,guard_run}.png`,
128×128 cells, rows DOWN/LEFT/RIGHT/UP, pivot (64,112), contract in
`src/game/core/locomotionAtlas.ts`, QA in `tools/locomotion/atlas.test.ts`
(`npm run locomotion:validate`, `npm run locomotion:previews`). The 256-cell
contract below (SPEC.md, tools/sprites) is superseded for these states.
Shipped 2026-09-29: `finalApproved` set for Player/Guard locomotion atlas so
production no longer blocks on the incomplete-asset gate. Guard Whistle/Search
use dedicated idle-pose sheets (`guard_whistle.png` / `guard_search.png`) until
authored action cycles arrive. Previous `player_walk.png` kept at
`deprecated/player_walk_256_v0.png`.

## Supplied Character Master Sheet integration assessment

**MASTER SHEET NOT PRODUCTION READY.** The supplied1536×1024 opaque overview
was preserved and36 diagnostic state/direction GIFs were extracted; no runtime
assets were replaced. Direction inconsistencies and uncertified gait/alpha block
integration. [Review and previews](candidates/master-integration-v1/REVIEW.md).
Guard sliding remains **ASSET REQUIRED**; the release blocker below remains open.

## Current decision — Guard image generation closed (2026-09-27)

**ASSET GENERATION LIMIT REACHED — confirmed by user.** Preserve all failed
candidates, source images, prompts, measurements and previews; do not regenerate.
Final attempt: [production record](candidates/guard-walk-final/REVIEW.md).

**Release blocker: `Guard locomotion final asset required`.**
Release Guard remains the existing LEGACY directional static sprite as a temporary
asset. Sliding remains **ASSET REQUIRED**, not fixed. No Validator relaxation,
Guard speed adjustment, or unapproved candidate integration is authorized.
Professional sprite animation production is needed; automated image production
is closed. Historical production orders below are records, not instructions to
restart Guard generation.

Current work returns to Museum level-design preparation. Keep 01-01 unchanged
pending physical iPhone Tilt approval; prepare 01-02–01-05 only, without applying
StageDefinitions. This does not resolve or waive the separate Guard release blocker.

## 2026-09-25 Animation V1 production attempt

Nine imagegen candidates plus a Player Walk revision are preserved in
`candidates/animation-v1/`. No candidate is approved for gameplay.

**GUARD WALK: ASSET REQUIRED.** Release still uses the LEGACY directional idle artwork while moving; Walk/Run/Whistle/Search candidates have not passed the direction, identity, and foot-planting gates. Guard speed must not be used to hide this sliding.
All five moving sheets fail unchanged Foot Planting validation; combined nine-sheet
validation has 22 errors / 223 warnings. The template-guided Walk revision still
fails all four rows. Idle (Player/Guard), Whistle and Search have zero automatic
errors but warnings and visual review remain. See `../../Reports/CharacterAnimationV1.md`.
Release now explicitly detects the incomplete final animation set; development
continues to display the temporary assets.

Known defects in adopted assets. Fix them when the art is regenerated; do not
patch them procedurally.

## player_walk.png — adopted as the temporary Stage 01 production asset

Source: extracted from the delivered WALK board (`npm run sprites:extract`),
then Left row = horizontal mirror of the Right row.

**Validator: FAILS the foot-planting check in all 4 rows (W7).** The sheet is kept only
as the temporary Stage 01 asset. It must be regenerated to the SPEC §4-A planting table before
final. Final Player Walk now uses runtime `PLAYER_SPRITE_STRIDE.walk`.
Do NOT restore the old `GAIT_STRIDE` (40) or remove the Player override.

| # | Row / frame | Issue | Fix at regeneration |
|---|---|---|---|
| W1 | Down #1, #5 (faint in #7) | Pale grey smear on the left leg (from the source art) | Clean frames |
| W2 | Down, Up (all) | Weak opposite-arm swing; legs carry most of the motion | Stronger arm swing + slight shoulder/torso counter-rotation |
| W3 | Down #5→#6, Up #8→#1 | Near-identical consecutive frames, which reads as a small hitch in the loop | Distinct "down" and "up" beats |
| W4 | Left (whole row) | Original Left row had no clear passing pose (feet never came together). Currently replaced by a mirror of Right, so face and hair are mirrored too | Author a true Left row, or keep the mirror if acceptable |
| W5 | All | Source cells were ~150 px, upscaled ×1.41 to spec (172 px), so the art is slightly soft | Deliver at native 256 px cells |
| W6 | Right #1–3 vs #5–7 | The two halves of the cycle are not symmetric (contact frames at different spreads) | Even two-step cycle per spec beats |
| **W7 (blocker)** | All rows (stance) | Walking in place; previous 18.7px/frame test used the obsolete 40-unit Player target | Follow runtime-derived SPEC §4-A and track the same anatomical foot, including contact/loop boundaries |

Runtime notes:
- Gameplay walk speed (72 u/s ≈ 1.6 body heights/s) is a brisk pace for this body size.
  V1 deliberately slows the temporary visual cadence to Sneak 1.41 / Walk 2.40 /
  Run 3.75 steps/s while preserving movement speed. This improves feel but cannot fix W7.
- Player cycle lengths in `PLAYER_SPRITE_STRIDE` are now the authoring source,
  not overrides to discard when final art arrives. Runtime behavior is unchanged.
- Until `player_idle.png` exists, idle holds walk frame #4 of each row.
  Sneak and Run fall back to the walk clip.

## Next production order

Design sources (SPEC → "Design sources"): Player look = this ASSETS Agent Zero
(`player_walk.png` art), Player motion = FALLBACK rig mechanics + foot planting;
Guard look = LEGACY guard. The Agent Zero Design Sheet is withdrawn (`deprecated/`).

Player: **RIGHT Walk first**. Other directions/actions wait until RIGHT passes
runtime-derived checks, visual review and iPhone playback. Then Idle → Sneak → Run.
Guard afterwards: Idle → Walk → Run → Whistle → Search, see `briefs/guard.md`.
The final Walk keeps this sheet's look and fixes W1–W7.
