# Museum 01-01 — approved topology implementation / Tilt approval pending

2026-09-27. Only 01-01 is changed in this pass. Dimensions and play feel are not approved.

## Visual evidence

- [Approved original floor plan](MuseumDesignLockV1/01-01-Floor-Plan.png)
- [Actual StageDefinition rendered overview](Entrance-FloorPlan-Implementation.png)
- [Main / Safe / Risk / Escape overlay](Entrance-Routes-Debug.png)
- [Patrol / runtime LOS snapshot at 8 seconds](Entrance-Patrol-LOS-Debug.png)
- [Debug OFF Simulator gameplay capture](Entrance-Simulator-Debug-Off.png)

The overview uses the existing game renderer and atlas, not a new concept illustration. It omits characters. The gameplay capture is from iPhone 17 Simulator, not a physical iPhone.

## Architecture and routes

Provisional bounding size: 21 × 14 tiles / 840 × 560 world units. The footprint is stepped, not one rectangular room. Door openings are two tiles wide.

Lobby → First Exhibition / Grand Statue → either north Gallery Recess or direct sightline crossing → Objective Room → east Side Exit.

- Main/Risk: direct exhibition crossing, timing around Guard A and then Guard B.
- Safe: Grand Statue eastern shoulder → north archway → Gallery Recess → north approach to Objective Room. Walls break LOS; it is not a guarantee against capture when entering occupied guard paths without observing.
- Escape: Objective → eastern side of chamber → Side Exit. No mandatory return through the Lobby.
- Route overlay: green Safe; gold Risk with translucent white Main on the same direct path; cyan Escape.

Four structural covers: Lobby partition, Grand Statue, southern display case, Objective Room pillar. Objective glass case is separate. Decoration is one painting on the north wall and two lamps; no bench or plant repetition. Architecture and door thresholds provide the remaining cover.

## Guard anchors

Guard A: southern exhibition crossing → Lobby archway → Grand Statue shoulder → north gallery archway.

Guard B: case inspection from south → direct exhibition entrance → north gallery arrival → Side Exit archway.

Fixed authored anchors, existing navigation, arrival waits 1.1–1.8 seconds and turn duration 1.1 seconds. Guard pace, vision and suspicion model were not retuned. Patrol/LOS overlay shows A in peach, B in purple, current guard positions white and actual occlusion-clipped vision red. It is a snapshot, not a guarantee of safety at every patrol phase.

## Verification

- Full `npm test`: PASS, including locomotion, guard vision/AI, rules, global alert, theft/stealth, Tilt, navigation/maps, playable mission flow, character contracts, branding and campaign.
- Campaign suite: 57 PASS; campaign plus polish targeted run: 64 PASS.
- TypeScript: PASS. Lint: PASS, zero warnings. Diff whitespace check: PASS.
- Other 44 baked mission objects are byte-equivalent under JSON serialization to the pre-change snapshot. SHA-256: `7ee97b1504714d69b1630a8853a1f98bb1f6bbfa10ae50320ba0069173cd3ddc`.
- Authored route segments are checked for body clearance, without silently repairing blocked routes through A*.

Same-speed continuous runtime simulation, Walk, initial patrol phase, no player teleport or forced objective pickup:

| Route | Spawn → Objective → Exit | Peak suspicion | Caught / alert / theft |
| --- | ---: | ---: | --- |
| Safe | 15.48 s | 27.75% | none |
| Main/Risk | 11.57 s | 37.97% | none |

These are ideal scripted traversal times, **not human average clear times**. Delaying departure changes patrol encounters; blindly following either path without stopping can be caught. Observation/timing is still required.

Simulator: verified new room layout, touch movement, Debug OFF rendering, CAUGHT and Retry. One manual crossing attempt ended in CAUGHT after remaining at the doorway. A manual complete Safe/Risk playthrough has not been claimed. At spawn the portrait camera includes substantial black space outside the stepped floor boundary; this framing remains a visual-review item, not a reason to add decorative filler.

## Outstanding acceptance

- Physical iPhone Tilt play: not performed in this pass; awaiting user availability.
- Human average clear time: unmeasured.
- Actual Tilt map-size feel and cover-spacing feel: unverified. The dimension numbers and scripted traversal times do not establish these.
- Confirm reading of next cover, observation pockets, worthwhile direct crossing and separate escape on device before approving 01-01.
- Guard Walk: **ASSET REQUIRED**. LEGACY stationary sprites still slide; no new animation was applied or approved.

No expansion to 01-02 onward, no legacy-unity changes, and no physical-play approval implied by this report.
