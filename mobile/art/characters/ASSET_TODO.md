# Character asset TODO

Known defects in adopted assets. Fix them when the art is regenerated; do not
patch them procedurally.

## player_walk.png — adopted as the temporary Stage 01 production asset

Source: extracted from the delivered WALK board (`npm run sprites:extract`),
then Left row = horizontal mirror of the Right row.

**Validator: FAILS the foot-planting check in all 4 rows (W7).** The sheet is kept only
as the temporary Stage 01 asset. It must be regenerated to the SPEC §4-A planting table before
final. When regenerated to spec, set its clip `strideLength` to `GAIT_STRIDE` (40), or
remove the override.

| # | Row / frame | Issue | Fix at regeneration |
|---|---|---|---|
| W1 | Down #1, #5 (faint in #7) | Pale grey smear on the left leg (from the source art) | Clean frames |
| W2 | Down, Up (all) | Weak opposite-arm swing; legs carry most of the motion | Stronger arm swing + slight shoulder/torso counter-rotation |
| W3 | Down #5→#6, Up #8→#1 | Near-identical consecutive frames, which reads as a small hitch in the loop | Distinct "down" and "up" beats |
| W4 | Left (whole row) | Original Left row had no clear passing pose (feet never came together). Currently replaced by a mirror of Right, so face and hair are mirrored too | Author a true Left row, or keep the mirror if acceptable |
| W5 | All | Source cells were ~150 px, upscaled ×1.41 to spec (172 px), so the art is slightly soft | Deliver at native 256 px cells |
| W6 | Right #1–3 vs #5–7 | The two halves of the cycle are not symmetric (contact frames at different spreads) | Even two-step cycle per spec beats |
| **W7 (blocker)** | All rows (stance) | Walking in place: the grounded foot does not travel backward (validator measures ≈0 px/frame vs 18.7 required), so feet slide in game at any stride. Measured ≈ 4 world units of slip per frame at stride 33 | Follow SPEC §4-A: grounded foot moves back 18.7 px per frame (L +37 → +19 → 0 → −19 → −37, then R) |

Runtime notes:
- Gameplay walk speed (72 u/s ≈ 1.6 body heights/s) is a brisk pace for this body size.
  V1 deliberately slows the temporary visual cadence to Sneak 1.41 / Walk 2.40 /
  Run 3.75 steps/s while preserving movement speed. This improves feel but cannot fix W7.
- Temporary clip cycle lengths are 54 / 60 / 80 world units in
  `PLAYER_SPRITE_STRIDE`. When the sheet is regenerated with planted feet, replace
  these visual overrides with the authored gait stride.
- Until `player_idle.png` exists, idle holds walk frame #4 of each row.
  Sneak and Run fall back to the walk clip.

## Next production order

Design sources (SPEC → "Design sources"): Player look = this ASSETS Agent Zero
(`player_walk.png` art), Player motion = FALLBACK rig mechanics + foot planting;
Guard look = LEGACY guard. The Agent Zero Design Sheet is withdrawn (`deprecated/`).

Player: **Idle → Sneak → Run → Walk (final, foot-planted)**, see `briefs/player.md`.
Guard afterwards: Idle → Walk → Run → Whistle → Search, see `briefs/guard.md`.
The final Walk keeps this sheet's look and fixes W1–W7.
