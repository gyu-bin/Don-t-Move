# Production brief — Guard

**Formula:** LEGACY look + `locomotion.ts` body mechanics and foot planting.
The numbers are in `../SPEC.md`: §3 (look), §3-A (mechanics), §4-A (foot planting).

## References

| Reference | File | Use for |
|---|---|---|
| Look (locked) | `assets/characters/legacy/guard_directions.png` (Playground `CHARS → LEGACY`) | Navy uniform, navy cap with gold badge, sunglasses, gold buttons and shoulder marks, black belt with buckle, black gloves and shoes, current proportions and outline weight |
| Motion | `templates/guard_*_guide.png` (faint figure) + SPEC §3-A | Timing, arm swing, stride, lean, bounce |
| Feet | Green ● L/R on the guides; SPEC §4-A tables | Grounded-foot position per frame |

**Do not redesign the Guard.** Keep the LEGACY body and head proportions and palette.
Only add animation.

## Sheets (after the Player set; one at a time)

| File | Grid | Key motion |
|---|---|---|
| `guard_idle.png` | 4×4 | Slow, heavy breathing. Feet fixed |
| `guard_walk.png` | 8×4 | Arm swing ±32°, bounce kept small (≤ 4.8 px), firm heel strikes, grounded foot 18.6 px back per frame |
| `guard_run.png` | 8×4 | Chase: lean 13°, arm swing ±54°, flight on frames 4 and 8, grounded foot 24.2 px back per frame |
| `guard_whistle.png` | 6×4 | Stop → hand up → whistle at mouth → blow → hold → hand down. Readable at small size. **No `!` in the art** |
| `guard_search.png` | 6×4 | Head and torso turn ≤ 25° left, then right. Feet and facing stay on the row direction (game vision uses the row direction) |

Heavier than the Player: smaller bounce, planted landings, deliberate arm swing.

## After delivery

Same commands as the Player brief, with `--sheet guard_<anim>.png`, then validate, preview,
check in the Museum next to the Player, and wire in `ASSET_MANIFEST` (`characters.guard`) after approval.
