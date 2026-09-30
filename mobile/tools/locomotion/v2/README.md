# Production Locomotion V2 — cutout rig from the Character Design Sheet

Source art: `art/characters/masters/character_design_sheet_v2.png` (user-supplied final
Character Design Sheet). The eight turnaround figures are keyed to RGBA masters
(`art/characters/masters/<who>_<dir>_master.png`) — these are the only paintings used.

Pipeline (Python 3 + OpenCV + NumPy; run inside a scratch copy of this folder):

1. `extract.py`, `extract2.py`, `masters.py` — key the sheet's turnaround figures into
   `master_<who>_<dir>.png` (GrabCut ∪ outline/warm-rim/neutral evidence, hole fill).
2. `params.py` — per-view landmarks: hip cut line, arm/leg polygons and joints.
   Thief legs (and Guard side legs) are assembled from clean master pieces
   (pants strip + that view's boot) because the masters hide one leg.
3. `rig2.py` — the rig: painted body (head/torso/pack) moves rigidly; arms and legs are
   master textures on a skinned triangle mesh (LBS, thigh/shin/foot, upper/forearm) driven
   by an IK gait whose stance foot moves back exactly with the body.
4. `bake2.py <out>` then `manifest2.py <out>` — 128×128 cells, rows DOWN/LEFT/RIGHT/UP,
   pivot (64,112); writes the atlases, `locomotion-feet.json` and `locomotion-manifest.json`.
   Copy `guard_idle.png` to `guard_whistle.png` / `guard_search.png` (stand-ins).

Contract numbers (frames, reach, stance, depth) must match
`src/game/core/locomotionAtlas.ts`; `tools/locomotion/atlas.test.ts` fails otherwise.
The V1 procedural rig is kept only as a reference in `../v1-procedural/`.
