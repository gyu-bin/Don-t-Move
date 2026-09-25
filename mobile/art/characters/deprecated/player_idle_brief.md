# Production brief — `player_idle.png` (Agent Zero IDLE)

Status: **waiting for art.** Frames must be generated or painted outside this repo;
the repo prepares, validates and integrates them.

## Three sources, three roles (do not mix them)

| Source | File | Use it for |
|---|---|---|
| **Design LOCK** | `art/characters/reference/agent_zero_design_sheet.png` | Look: face, hair, proportions, outfit, gloves, shoes, backpack, palette, painted style |
| Design views at sprite scale | `art/characters/reference/player_design_views.png` | The same four views cut from the sheet, already at 172 px on the (128, 224) anchor |
| **Pose/timing** | `SPEC.md`, `templates/player_idle_guide.png` | Grid, anchor, ground line, head-height band, frame beats. **Ignore the guide figure's appearance** |
| Start image | `templates/player_idle_base.png` | 4×4 sheet where every cell is the locked view at the exact position. Use it as the img2img init image or the artist's underlay |

## Deliverable

- One PNG, **1024 × 1024**, 4 columns × 4 rows, 256 × 256 cells, no padding.
- Rows: **1 Down · 2 Up · 3 Left · 4 Right.** Columns: frames 1 → 4 (looping).
- Background: **transparent** (preferred). If the tool cannot output alpha,
  use a flat **#00FF00** with no gradient, vignette, texture or shadow.
- Character only: no text, labels, grid lines, foot markers, checkerboard or ground shadow.
- Size and placement exactly as the base sheet: soles on y = 224, body centred on x = 128, 172 px tall (Down).

## Motion (subtle, stealthy — not frozen, not bouncy)

Start every row from its base cell (frame 1 = the locked view, unchanged).

| Frame | Beat | Shoulders / chest | Head | Hips / weight | Backpack (secondary) | Feet |
|---|---|---|---|---|---|---|
| 1 | neutral | 0 | 0 | 0 | 0 | fixed |
| 2 | inhale | up 1–2 px, chest opens slightly | up 1 px | shift 1–2 px toward the planted (left) leg | 0 (lags one frame) | fixed |
| 3 | hold / top | up 2 px | up 1–2 px | holds the shift | up 1 px, slight settle | fixed |
| 4 | exhale | up 1 px | 0–1 px | returns halfway | up 1 px (still lagging) | fixed |

- Down/Up rows: weight shift is sideways. Left/Right rows: weight shift is a
  1 px lean forward and back. Arms and gloves follow the shoulders, and the
  hands may drift 1 px.
- Feet may not move more than 1 px (validator: ±4 px on the ground line).
- The motion must be visible: the validator rejects rows whose frames are
  identical (fewer than 60 silhouette pixels change).

## Identity rules (from the design LOCK — any change fails review)

Same hair shape and fringe over the eyes, face, lean athletic proportions (not
chibi), short dark tactical top, dark cargo pants, **fingerless dark gloves**,
dark sneakers, **compact black backpack always on the back** (clearly visible
in Up), warm muted skin, black/charcoal/dark-grey palette with faint cool-grey
highlights. Neutral dark lighting. Do not bake museum light or ground shadows.

## Prompt pack (for image-generation tools)

Positive:
> Agent Zero from the provided design sheet, identical character, stylized painted 2D game sprite,
> top-down 3/4 view, young adult male, lean athletic build, near-black layered hair with fringe
> covering part of the eyes, short dark tactical jacket, dark cargo pants, fingerless black gloves,
> dark sneakers, compact black backpack on the back, black and charcoal palette, soft neutral
> lighting, subtle idle breathing animation sprite sheet, 4 rows (front, back, left side, right side)
> × 4 frames, every frame the same character at the same scale and position, feet fixed,
> transparent background

Negative:
> chibi, big head, pixel art, anime exaggeration, flat vector, 3d render, photorealistic, different
> outfit, missing backpack, gloves missing, color changes, text, labels, grid lines, frame numbers,
> checkerboard, ground shadow, background, vignette, walking pose, jumping

Use `templates/player_idle_base.png` as the init image at **low denoise strength**. It
already has the exact scale and position. Generate small variations per frame; don't redesign.

## After delivery (repo side)

```bash
cd mobile
# transparent PNG in the exact 1024×1024 grid:
npm run sprites:extract -- --src <delivered.png> --grid 0,0,1024,1024 --inset 0 --bg alpha --align row --sheet player_idle.png
# or on flat green:
npm run sprites:extract -- --src <delivered.png> --grid 0,0,1024,1024 --inset 0 --bg chroma:#00ff00 --align row --sheet player_idle.png
npm run sprites:validate -- --only player_idle.png
```

`--align row` keeps the breathing and weight shift. **Do not use `--align frame` for Idle**,
because it would re-centre the frames and erase the motion. Then review the previews
(`art/characters/preview/`), check in the Museum, and wire it into `ASSET_MANIFEST` after approval.
