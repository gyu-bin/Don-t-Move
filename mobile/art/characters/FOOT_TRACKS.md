# Player RIGHT Walk identity contract

Authoring metadata is not a substitute for art. Keep anatomical L/R labels from
the source drawing throughout the cycle, never by nearest x. If identity is
ambiguous, stop and resolve it with the animator. Never copy ideal coordinates
into annotations for artwork that does not match them.

Beside `player_walk.png`, supply `player_walk.feet.json` with `version: 1`,
`imageSha256` (SHA256 of those exact PNG bytes), and `rows.right` (frame array).
Each frame has:

- `phase`: i / frames, zero-based; `beat`: exact label from spriteSpec.SHEETS.
- `root`: common cell-local [x,y] anchor; no per-frame recentering.
- `hip`: measured pelvis centre (not root/anchor).
- `L`, `R`: each has `sole`, `ankle`, `knee` [x,y] and boolean `planted`.
- `sole`: a consistent support-point convention on the visible sole. Review
  heel/toe roll; do not cherry-pick different sole points to fit target motion.
- All anatomy landmarks must lie on visible image pixels. Occlusion or uncertain
  labels must be resolved in the source animation, not silently guessed.

Checks: digest, schema, phase/beats, root, pixel evidence, expected stance/swing,
lifted swing sole, distinct feet, runtime contact/passing/toe-off positions,
same-foot world residuals and separate 4→5 / 8→1. Existing transition band ±35%
and minimum75% are unchanged; both boundaries individually must pass.
Metadata cannot independently prove anatomical identity or body mechanics:
visual review and iPhone video remain mandatory even after automatic PASS.

This gate currently covers RIGHT Player Walk only. Other rows use existing
pixel-contact diagnostics, NOT identity-tracked approval. Missing RIGHT metadata
is ERROR, never a fallback to nearest contacts.

`footTrackFixture.ts` is synthetic unit-test data only, never annotations for
generated artwork or a game asset. The preserved third candidate is unapproved
and has no certified anatomical annotations.

Production: preserve design → label anatomy → common-root two-step timeline →
contact review → redraw full-body motion in that design → measured metadata →
validator → visual loop → temporary RIGHT-only iPhone review. No independent-frame
generation, limb warping, or procedural final sprite substitution.
