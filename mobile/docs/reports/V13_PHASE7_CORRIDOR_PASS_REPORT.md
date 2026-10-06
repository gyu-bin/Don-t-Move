# V13 Phase 7 — long corridor and exposure pass, Chapter 1–6 (2026-10-06)

Not committed. **Not finished**: 8 of the 30 missions still have a stretch of more than eight tiles without cover
(02-02, 02-04, 03-02, 03-04, 04-01, 04-05 and their Chapter 5 / 6 twins 05-02, 05-03, 06-04). By this phase's own
rule that is a hard fail, so the pass is reported as partial.

The local campaign is 9 chapters × 5 missions = 45. Chapters 7–9 are byte-identical to before (their plans are now
built from frozen copies of the Museum and Lab plans, `V13_MUSEUM_FROZEN` / `V13_LAB_FROZEN`).

## How it was measured

`tools/campaign/v13Corridor.ts`, on the baked stage, for the safe, risk, quick-escape and lockdown-escape routes:

- **cover gap** — the longest stretch on which no spot within two tiles (nor the path itself) is hidden from the
  point three tiles further along (approach) or three tiles back (escape). This is the "worst gap" below.
- **sightline** — the longest near-straight walk with clear sight end to end.
- **pinned** — the longest stretch in full view of one guard position or camera with nowhere in reach to duck.

Guard cones and timing are ignored: it is geometry only, a ranking aid. It does not see wall alcoves deeper than two
tiles from the path, and it counts a walk past an island as covered only if a body fits behind the island.

`tools/campaign/v13CoverSearch.ts` then proposes a spot for one small opaque piece of the chapter's kit: on floor,
touching walls only, 1.5 tiles from every other solid, clear of authored route nodes, patrol legs, doors, camera
axes and entry / prize / exit, and not against a south wall if tall. Every accepted piece was composed, audited
(0 topology errors, 0 sealed pockets, 0 squeezes) and looked at.

## Corridor audit — 30 missions

| Mission | Long segments (routes over 6 tiles, before → after) | Worst gap before | Worst gap after | Longest stretch now | Rework |
|---|---:|---:|---:|---|---|
| 01-01 | 0 → 0 | 4.0 | 4.0 | lockdown 4,5→8,4 | PASS |
| 01-02 | 3 → 3 | 12.8 | 7.9 | quick 10,4→17,5 | PASS (6–8 left), changed |
| 01-03 | 2 → 2 | 6.6 | 6.6 | risk 13,17→9,15 | PASS (6–8 left) |
| 01-04 | 0 → 0 | 5.8 | 5.8 | safe 6,14→11,13 | PASS |
| 01-05 | 0 → 0 | 4.5 | 4.5 | safe 8,10→8,15 | PASS |
| 02-01 | 1 → 1 | 11.3 | 6.9 | lockdown 14,17→21,17 | PASS (6–8 left), changed |
| 02-02 | 2 → 1 | 10.7 | 8.5 | safe 8,18→16,17 | NEEDS COVER — not solved, changed |
| 02-03 | 1 → 1 | 14.8 | 6.6 | safe 22,10→23,4 | PASS (6–8 left), changed |
| 02-04 | 3 → 3 | 8.5 | 8.5 | quick 12,15→17,12 | NEEDS COVER — not solved |
| 02-05 | 2 → 2 | 12.7 | 6.3 | lockdown 19,16→13,16 | PASS (6–8 left), changed |
| 03-01 | 1 → 1 | 6.7 | 6.7 | safe 13,19→14,13 | PASS (6–8 left) |
| 03-02 | 1 → 1 | 9.1 | 9.1 | lockdown 5,12→2,18 | NEEDS COVER — not solved |
| 03-03 | 0 → 0 | 5.5 | 5.5 | lockdown 21,14→22,10 | PASS |
| 03-04 | 1 → 1 | 10.1 | 10.1 | quick 18,3→10,5 | NEEDS COVER — not solved |
| 03-05 | 1 → 1 | 7.2 | 7.2 | lockdown 4,20→11,20 | PASS (6–8 left) |
| 04-01 | 3 → 3 | 9.9 | 9.9 | safe 20,18→10,17 | NEEDS COVER — not solved |
| 04-02 | 1 → 1 | 6.5 | 6.5 | quick 12,5→17,4 | PASS (6–8 left) |
| 04-03 | 4 → 1 | 11.7 | 6.7 | safe 7,16→8,11 | PASS (6–8 left), changed |
| 04-04 | 2 → 0 | 14.5 | 6.0 | lockdown 14,20→20,20 | PASS, changed |
| 04-05 | 2 → 2 | 9.3 | 9.3 | safe 8,13→15,15 | NEEDS COVER — not solved, changed |
| 05-01 | 1 → 1 | 7.0 | 7.0 | safe 14,19→13,12 | PASS (6–8 left) |
| 05-02 | 1 → 1 | 8.8 | 8.8 | lockdown 19,12→22,18 | NEEDS COVER — not solved |
| 05-03 | 3 → 3 | 10.1 | 10.1 | quick 7,3→15,5 | NEEDS COVER — not solved |
| 05-04 | 0 → 0 | 5.8 | 5.8 | lockdown 4,14→4,10 | PASS |
| 05-05 | 1 → 1 | 7.2 | 7.2 | lockdown 24,19→17,20 | PASS (6–8 left) |
| 06-01 | 1 → 1 | 11.3 | 6.9 | lockdown 13,17→7,17 | PASS (6–8 left), changed |
| 06-02 | 2 → 2 | 7.7 | 7.7 | lockdown 9,8→8,15 | PASS (6–8 left), changed |
| 06-03 | 1 → 1 | 15.2 | 7.8 | safe 3,11→2,4 | PASS (6–8 left), changed |
| 06-04 | 4 → 4 | 10.8 | 10.8 | quick 16,15→8,12 | NEEDS COVER — not solved |
| 06-05 | 2 → 1 | 12.7 | 6.5 | lockdown 7,16→14,16 | PASS (6–8 left), changed |

Long sightlines were not shortened: the pieces stand beside the lanes, so the 20-tile walks of 02-03, 02-05, 03-02,
03-05, 04-01, 04-03 (and twins) are still straight; what changed is that there is now something to step behind.

## Modified missions

| Mission | Worst gap | Piece | Role | Guard / CCTV |
|---|---|---|---|---|
| 01-02 | 12.8 → 7.9 | + Rotunda Floor Display Case | risk lane up the rotunda: the only cover between the vestibule and the anteroom door | none |
| 02-01 (06-01) | 11.3 → 6.9 | Curator Plinth (see-through) → sculpture, same wall, narrower | lockdown escape down the curator aisle: breaks its nine-tile sightline | none |
| 02-02 (06-02) | 10.7 → 8.5 | + South Ring Sculpture | safe lane: cover at the east end of the south ring | none |
| 02-03 (06-03) | 14.8 → 6.6 (15.2 → 7.8) | + East Turn Sculpture, on the east wall | safe lane: cover where the south lane turns north under the camera | none; camera coverage 97% as before |
| 02-05 (06-05) | 12.7 → 6.3 (6.5) | + Loading Corridor Sculpture | quick escape: a pocket half-way down the loading corridor | none |
| 04-03 | 11.7 → 6.7 | + South Lane Gas Rack, + North Lab Gas Rack | risk lane before the glass gap; second island on the walk across the north lab | none; north-lab camera 86% → 84% |
| 04-04 | 14.5 → 6.0 | + Coolant Passage Monitor Station, + Intake Gas Rack | lockdown escape pocket in the coolant passage; cover in the west half of the intake | none |
| 04-05 | risk 9.3 → 6.5, safe 9.3 unchanged | + Glass Lab Sample Fridge | risk lane: cover against the north wall of the glass lab | none |

In Chapter 6 the inherited sculptures are drawn as Mansion armour or cabinets (three quarters of the size).
Entry, prize, exit, doors, every guard stop, every camera and every authored route node are identical on all 45
missions (`Reports/V13_PHASE7/security-after.txt` equals the Phase 4 dump). Scripted thief, 15 runs per lane, on the
changed maps: unchanged on 7 of 12; 02-01 risk 7 → 6, 02-03 safe 7 → 8, 04-03 risk 8 → 7, 06-01 safe 6 → 3 and
risk 7 → 9 (the opaque sculpture in the aisle changes what the guard there sees).

## Guard review

No guard was added, moved or retimed, and none is proposed: no room was found that is large, already has cover and
a waiting pocket, and is unwatched.

## Left over — more than eight tiles

| Mission | Stretch | Why the search found nothing |
|---|---|---|
| 03-04 (05-03) | quick escape, vault door → north passage, 10.1 | the route hugs the only free column; every other spot is within 1.5 tiles of the deposit island or the box wall |
| 04-01 | safe lane along the bottom of the reception, 9.9 | the only spot that helps is against the south wall, where the tall Lab pieces are cut by the wall cap |
| 04-05 | safe lane through the glass lab, 9.3 | lane between the lab pillar and the wall; a piece there is under 1.5 tiles from one or the other |
| 03-02 (05-02) | lockdown escape, pool → copy room, 9.1 | three-wide corridor with a patrol leg down its middle |
| 02-04 (06-04) | both escapes across the forecourt, 8.5 (10.8) | the one position that helps blocks the forecourt's route node in the Mansion version |
| 02-02 | safe lane along the south ring, 8.5 | patrol loop and route node fill the east half |

These need a hand redesign of the lane (shift a route node, or cut an alcove into the wall), not another prop.
None is declared an intentional exposure zone.

## Checks

- Simulator, whole map: all 12 changed missions (`Reports/V13_PHASE7/sim/`).
- Simulator, normal camera, standing beside the new piece: 02-01, 02-05, 04-03, 04-04 (`Reports/V13_PHASE7/zoom/`).
- Not played by hand in this phase. Touch-fallback play is only a reference in any case; the Tilt verdict is the
  user's, on the iPhone.
- `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors (1 existing warning), `test:environment` 11 / 11,
  manifest 0 / 0. One test failed on the way (02-01 guard clipped the first, wider sculpture) and was fixed by
  narrowing the piece.
- TestFlight progression (Chapter 7 locked, Chapter 1 once showing ten missions) was not touched.

---

# V13 Phase 7B — six-lane local rework (2026-10-06)

Not committed. After this pass no mission of Chapter 1–6 has a stretch of more than eight tiles without cover by
the measure above (`Reports/V13_PHASE7/corridor-after-7b.txt`; worst is 01-02 at 7.9, untouched here). Only the six
target missions and their four twins changed; Chapters 7–9 are byte-identical to before Phase 7.

## Lane results — worst gap per route (safe / risk / quick escape / lockdown escape)

| Mission | Before | After | Fix |
|---|---|---|---|
| 03-04 | 3.4 / 3.3 / **10.1** / 5.2 | 3.4 / 3.3 / 5.2 / 5.2 | The vault's west opening loses its south cell (3 wide → 2): the first turn out of the vault is now a corner to stand behind. |
| 04-01 | **9.9** / 6.8 / 3.3 / 7.2 | 2.9 / 3.4 / 3.3 / 7.2 | One wall pier on the south wall of the reception (column 14), a pocket on each side. No tall Lab piece against that wall. |
| 04-05 | **9.3** / 6.3 / 4.6 / 6.0 | 5.6 / 6.3 / 4.6 / 6.0 | One wall pier on the south wall of the glass lab west of the glass; the safe lane's first anchor moves 0.6 north to pass it. Glass untouched. |
| 03-02 | 5.3 / 4.6 / 4.0 / **9.1** | 5.3 / 4.6 / 4.0 / 4.3 | The stair guard walks the west side of the copy-room opening (0.5 west), the route takes the east side (anchor 0.7 east), beside the wall that hides a waiting thief. |
| 02-04 | 6.8 / 4.8 / **8.5** / **8.5** | 6.8 / 2.5 / 2.2 / 5.5 | Free-standing art wall in the forecourt between the private door and the east cell. |
| 02-02 | **8.5** / 4.9 / 3.4 / 6.0 | 5.9 / 4.9 / 3.4 / 6.0 | One wall pier on the south wall under the colossus (column 13); the ring guard's south stop moves 0.15 north to clear it. |

All lanes keep at least 1.9 tiles of width beside a new pier or wall (the 03-04 opening is 2.0). 0 sealed pockets,
0 squeezes, 0 topology errors on all ten maps.

## Patrol changes

| Mission | Guard | Old stop | New stop | Why |
|---|---|---|---|---|
| 03-02 (05-02 mirrored) | stair guard | (3, 16) and (3, 11.2) | (2.5, 16) and (2.5, 11.2) | he and the escape route shared the middle of a three-wide opening |
| 02-02 (06-02 mirrored) | ring guard | (12.5, 17.9) | (12.5, 17.75) | his walk passed 0.18 tile over the new pier |

No guard or camera added or removed; speeds, vision and detection untouched; camera positions and coverage unchanged.

## Route anchors moved

04-05 safe lane (8.25, 15) → (8.25, 14.4); 03-02 / 05-02 lockdown escape (3.5, 14.5) → (4.2, 14.5). Entry, prize,
exit and doors: unchanged.

## Shared map regression

| Twin | Worst gap before → after | Compose / gaps | Patrols (120 s walk) | Scripted thief |
|---|---|---|---|---|
| 05-02 | 8.8 → 5.8 | clean | clean, except one graze of guard 4 at (3.95, 16.05) that was there before this phase | 14 / 6 → 14 / 6 |
| 05-03 | 10.1 → 6.6 | clean | clean | 6 / 0 → 6 / 0 |
| 06-02 | 7.7 → 7.7 | clean | clean | 0 / 0 → 0 / 0 |
| 06-04 | 10.8 → 6.8 | clean | clean | 7 / 8 → 7 / 8 |

Scripted thief on the six targets (safe / risk clears of 15): 03-04 11 / 0 → 11 / 0, 04-01 5 / 12 → 5 / 12,
04-05 0 / 0 → 0 / 0, 03-02 13 / 6 → 15 / 6, 02-04 9 / 9 → 9 / 9, 02-02 15 / 11 → 15 / 11.

## Remaining over eight tiles

None in Chapter 1–6.

## Checks

- Simulator whole map: all ten (`Reports/V13_PHASE7/sim7b/`). Simulator normal camera at the reworked spot: the six
  targets (`Reports/V13_PHASE7/zoom/zoom-*-7b.png`); the twins were not captured at the normal camera.
- `npm test` 1007 / 1007 (one failure on the way: the 02-02 ring guard grazed the art wall after his stop was first
  moved 0.5; 0.15 is enough and passes), TypeScript PASS, lint 0 errors, `test:environment` 11 / 11, manifest 0 / 0.
- Not played by hand. The measure is geometry; whether the pockets feel right on Tilt is for the iPhone.
- Found, not changed: 05-02 guard 4 grazes a corner at (3.95, 16.05) on his round (present before this phase;
  no test covers Chapter 5 patrols that way).

---

# V13 Phase 7C — Chapter 7–9 long corridor pass (2026-10-06)

Not committed. All 15 missions of Chapter 7–9 now have every route at or under eight tiles without cover (worst 7.9).
Six missions changed; the other nine passed as they were and were not touched. Chapters 1–6 are byte-identical to
the Phase 7B bake.

## Audit — worst cover gap per route (safe / risk / quick escape / lockdown escape)

| Mission | Before | Worst before | Verdict before | After | Worst after |
|---|---|---:|---|---|---:|
| 07-01 | 2.9 / 3.8 / 1.9 / 3.5 | 3.8 | PASS | unchanged | 3.8 |
| 07-02 | 7.1 / **12.8** / 2.8 / 3.5 | 12.8 | NEEDS COVER | 7.1 / 7.3 / 2.8 / 3.5 | 7.3 |
| 07-03 | 5.7 / 6.6 / 2.8 / 6.6 | 6.6 | PASS | unchanged | 6.6 |
| 07-04 | 5.8 / 3.0 / 2.8 / 2.9 | 5.8 | PASS | unchanged | 5.8 |
| 07-05 | 4.5 / 4.5 / 3.0 / 4.4 | 4.5 | PASS | unchanged | 4.5 |
| 08-01 | **10.1** / 6.8 / 3.3 / 7.2 | 10.1 | NEEDS WAITING POCKET | 2.9 / 3.4 / 3.3 / 7.2 | 7.2 |
| 08-02 | 5.8 / 3.3 / 6.5 / 4.9 | 6.5 | PASS | unchanged | 6.5 |
| 08-03 | 6.7 / **11.7** / 6.5 / 7.8 | 11.7 | NEEDS COVER | 6.7 / 6.0 / 5.5 / 5.5 | 6.7 |
| 08-04 | **10.0** / **8.3** / 4.0 / **11.7** | 11.7 | NEEDS COVER | 7.7 / 4.8 / 4.0 / 6.0 | 7.7 |
| 08-05 | **9.3** / **9.3** / 4.6 / 6.0 | 9.3 | NEEDS WAITING POCKET | 5.6 / 6.3 / 4.6 / 6.0 | 6.3 |
| 09-01 | 7.3 / 3.3 / 5.7 / 7.2 | 7.3 | PASS | unchanged | 7.3 |
| 09-02 | 5.7 / 5.7 / 2.4 / 3.9 | 5.7 | PASS | unchanged | 5.7 |
| 09-03 | 3.5 / 7.1 / 2.9 / 4.9 | 7.1 | PASS | unchanged | 7.1 |
| 09-04 | 3.0 / 3.0 / 2.8 / 5.0 | 5.0 | PASS | unchanged | 5.0 |
| 09-05 | 7.9 / 7.7 / 6.1 / **8.7** | 8.7 | NEEDS PATH ADJUST | 7.9 / 4.5 / 6.1 / 6.2 | 7.9 |

## What changed

| Mission | Change | Role |
|---|---|---|
| 07-02 | + crate stack in the freight hall (the spot that worked in 01-02) | risk lane: the only cover between the entrance and the anteroom door |
| 08-01 | one wall pier on the south wall of the reception | safe lane: a pocket on each side, nothing against the wall cap |
| 08-03 | + server row at the foot of the south lane, + server row across the north room | risk lane before the glass gap; second island on both escapes |
| 08-04 | server rows keep the footprint of the Lab's units (see below); + security desk in the south passage; + server row in the intake | lockdown escape pocket; safe-lane cover before the storage opening |
| 08-05 | one wall pier on the south wall, safe-lane anchor 0.6 north; + server row on the north wall | safe-lane pocket; risk-lane cover |
| 09-05 | the vault's blast screen moves 0.4 tile north | lockdown escape along the north lane: the screen's west end is now in reach as cover |

08-04 / 08-05, server rows: when the cryo units became server racks in Phase 4 they were also made shallower
(1.1 → 0.5 tile). That was the cause of most of 08-04's long gaps. They are now drawn as racks on the Lab unit's own
footprint, so the cover is what the Lab original has.

Chapter 7 and 8 are built from frozen Museum and Lab plans; their changes are applied to the finished mission
(`LATE` in `tools/campaign/v13Phase7.ts`) and touch nothing else. Chapter 9's change is in `v13Vault.ts`.

## Guards, cameras, routes

- Guards: +0. Cameras: +0. No patrol stop moved. No camera moved; coverage within two points of before
  (08-03 north room 86 → 84%, 09-05 vault 87 → 85%).
- Route anchor moved: 08-05 safe lane (19.75, 15) → (19.75, 14.4). Entry, prize, exit, doors: unchanged.
- No guard candidate is proposed: nothing was found that is large, covered, pocketed and unwatched.
- 09-05: no guard, no camera, nothing added; one screen moved.

## Checks

- Compose: 0 topology errors, 0 sealed pockets, 0 squeezes on the six. Narrowest lane beside a new pier: 1.9 tiles.
- Patrols simulated for 120 s on the six: no clip.
- Scripted thief (safe / risk clears of 15), before → after: 07-02 8 / 9 → 8 / 9, 08-01 4 / 0 → 4 / 0,
  08-03 0 / 0 → 0 / 0, 08-04 7 / 14 → 7 / 14, 08-05 0 / 0 → 0 / 0, 09-05 0 / 0 → 0 / 0.
- Simulator whole map and normal camera at the changed spot: all six (`Reports/V13_PHASE7C/sim/`, `zoom/`).
  The two wall piers (08-01, 08-05) sit under the touch panel at the normal camera and were seen on the whole map only.
- `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors, `test:environment` 11 / 11, manifest 0 / 0.
- Not played by hand; Tilt is for the iPhone.
