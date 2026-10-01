# Environment pilot pipeline

Scope: exactly ten Museum and ten Art Gallery independent PNGs. Source images are generated separately; no asset is cut from the reference board. Four documented Museum images reuse the genuine existing runtime atlas. Production visual approval remains with the user.

## Runtime budgets

| Category | Canvas | Count across two chapters | Maximum decoded RGBA bytes |
|---|---:|---:|---:|
| Architecture | 512 × 512 | 4 | 4 MiB |
| Major | 512 × 512 | 6 | 6 MiB |
| Soft | 384 × 384 | 4 | 2.25 MiB |
| Decoration | 256 × 256 | 4 | 1 MiB |
| Landmark | 768 × 768 | 2 | 4.5 MiB |

Total pilot texture budget: 17.75 MiB decoded RGBA, excluding existing characters, floor atlas, SkPictures and GPU copies. Each asset uses one RGBA PNG; no new shader, particle system or per-frame texture allocation. Existing static environment pictures are recorded at stage load. Native GPU/memory/FPS measurements are pending; this table is a specification, not a measured performance result.

## Coordinates and scale

- One tile equals 40 world units.
- Sprite `objectBounds` exclude transparent canvas margins. The normalized ground pivot is defined **within these bounds**, not within the full PNG.
- `drawWidth` is in tiles. Runtime height follows cropped PNG aspect. Scale and individual physical kinds retain authored collision and LOS contracts.
- Physical boxes center on base x and extend upward from base y.
- Replacement images do not change Museum physics, routes, guard anchors, difficulty or stage layout.
- Gray/colored RGB values in pixels with alpha zero are invisible. Inspect composited Skia output and alpha readback; a raw-image viewer can display those hidden RGB values misleadingly.

## Commands

Run from `mobile/`:

```sh
node --import tsx tools/environment/exportMuseumReuse.ts
node --import tsx tools/environment/buildManifest.ts
node --import tsx tools/environment/validate.ts
node --import tsx --test tools/environment/contract.test.ts
node --import tsx tools/environment/galleryQA.ts
node --import tsx tools/environment/searchQA.ts
CHAPTER=01 OUT_DIR=Reports/EnvironmentKitV1/after/01 GAMEPLAY_PREVIEW=1 PREVIEW_MISSIONS=01-01,01-05,01-08,01-10 TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/renderChapter.ts
CHAPTER=02 OUT_DIR=Reports/EnvironmentKitV1/after/02 GAMEPLAY_PREVIEW=1 PREVIEW_MISSIONS=02-01,02-03,02-06,02-08,02-10 TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/renderChapter.ts
node --import tsx tools/environment/comparisonBoard.ts
GRAYSCALE=1 node --import tsx tools/environment/comparisonBoard.ts
node --import tsx tools/environment/compareMaps.ts
```

The normalization command only trims transparent padding and resamples into the category canvas. It preserves aspect and writes bounds metadata; it cannot repair perspective, backgrounds, checkerboards, text or style. Regenerate those failures with the image tool. `buildManifest.ts` is idempotent and preserves the four genuine atlas reuse files.

## Evidence limits

The PNG validator fails on missing files, invalid bounds, empty images and opaque boards. Corner and edge diagnostics require visual inspection. It does not certify absence of labels/characters, angle, premium material quality, visual passability or chapter identity.

Map previews use the actual `buildGameAssets`, `buildStageArt` and `renderPlaygroundFrame` paths with decoded final PNGs, the current player/guard animation assets and real vision fans. Gameplay captures use continuous authored-route input in the actual 60 Hz engine. The output is an offline CanvasKit/Skia screenshot, **not** an iPhone Simulator or device screenshot and not a React HUD capture.

The historical Gallery campaign contained only five missions. Before images exist for 02-01 through 02-05; no invented before images are made for the five new missions. Both chapter overviews use one world unit per pixel and identical cell extents within a capture run. The catalog comparison uses the actual 9.4-tile gameplay horizontal scale (400 / 376 = 1.064 screen pixels per world unit).

`NEEDS_REVIEW` means a file exists; it does not mean production approval. Simulator review, physical Tilt readability and final user style review remain separate gates.
