# Production brief — Player (Agent Zero)

**Formula:** ASSETS look + FALLBACK body mechanics + `locomotion.ts` foot planting.
The numbers are in `../SPEC.md`: §3 (look), §3-A (mechanics), §4-A (foot planting).

## References and what each one is for

| Reference | File | Use for | Ignore |
|---|---|---|---|
| Look | `assets/characters/player_walk.png` (the ASSETS Agent Zero) | Face, hair, outfit, backpack, palette, painted style, **head-to-body proportions**, silhouette | Its motion: walks in place, weak Down/Up arm swing, duplicate frames, Down #1 smear, soft upscale |
| Motion | Playground `CHARS → FALLBACK` and `templates/player_*_guide.png` (faint figure) | Arm swing, stride, torso lean, bounce, crouch, weight transfer, timing per frame | Its look: SD head, flat vector shapes |
| Feet | Green ● L/R on the guide templates; SPEC §4-A tables | Exact grounded-foot position per frame | — |

## Order (one sheet at a time, approval between each)

1. `player_idle.png`: 4×4. Breathing ±1.4 px, shoulders 1–2 px, 1–2 px weight shift, backpack lags one frame, feet fixed. Not frozen.
2. `player_sneak.png`: 6×4. Crouch 11 px lower, lean 9°, hands forward (arm 32°, elbow 77°), small swing ±13°, foot lift 7 px, grounded foot 15 px back per frame.
3. `player_run.png`: 8×4. Lean 13°, arm swing ±54° with elbows at 89°, bounce 7.6 px, foot lift 18 px, **flight on frames 4 and 8**, grounded foot 24.3 px back per frame.
4. `player_walk.png` (final): 8×4. Arm swing ±32° with elbows at 20°, bounce 4.4 px, lift 11 px, grounded foot 18.7 px back per frame (+37 → +19 → 0 → −19 → −37). Replaces the temporary sheet and fixes W1–W7.

## Must hold in every frame

- Same Agent Zero as ASSETS. **Do not enlarge the head or make him chibi, SD or anime.**
- Backpack always on the back and always the same size.
- 256×256 cells, rows Down/Up/Left/Right, soles on y = 224, 172 px tall, transparent background, character only (no shadow, text or markers).
- Neutral dark lighting. Museum light is added at runtime.
- The motion must be of the whole body. A walk where only the feet move fails.

## Prompt pack (image tools)

Positive:
> the same character as the reference sprite, young stealth agent, dark near-black messy hair, charcoal
> short-sleeve top, dark pants, dark shoes, small dark backpack on the back, stylized painted 2D game
> sprite, top-down 3/4 view, natural head-to-body proportions like the reference, soft neutral lighting,
> sprite sheet, 4 rows (front, back, left side, right side), <N> frames per row, <animation beats from SPEC>,
> transparent background

Negative:
> chibi, big head, super deformed, anime, pixel art, flat vector, 3d render, photorealistic, different
> outfit, missing backpack, text, labels, grid lines, frame numbers, checkerboard, ground shadow, background

Use the guide template of that sheet as a pose and layout reference (ControlNet, pose or img2img
underlay). Do not copy its appearance.

## After delivery

```bash
cd mobile
npm run sprites:extract -- --src <file> --grid 0,0,<W>,1024 --inset 0 --bg alpha --align row --sheet player_<anim>.png
#   flat green instead of alpha: --bg chroma:#00ff00
npm run sprites:validate -- --only player_<anim>.png
```

Use `--align row` for every sheet, because it preserves bounce, weight shift and foot travel.
If the asset fails, fix the asset; the validator is not loosened. Then review
`art/characters/preview/` and check in the Museum before wiring the sheet in `ASSET_MANIFEST`.
