# V13 Phase 6 — final polish and play QA (2026-10-06)

Not committed. **No Production Candidate verdict is given**: the hand-play this phase requires was done on 3 of
the 26 listed missions, one attempt each, by an agent stepping the real app through the touch fallback. Tilt was
not exercised at all (it needs the phone). Nothing major was found in what was checked.

## Phase 5 leftovers

| Item | Looked at | Decision |
|---|---|---|
| 06-03 armour / bookshelf / glass overlap | Simulator, normal camera, full resolution (`Reports/V13_PHASE5/zoom/crop-06-03.png`) | Kept. The armour niche and the bookshelf read as two pieces; the glass rail crosses the armour's plinth, which reads as a barrier in front of it. Nothing moved. |
| Chapter 8 dark furniture | Simulator, normal camera, 08-01 … 08-05 | Desks, lockers, consoles read. The server row was the darkest piece (mean tone at the floor's level): lifted once (`gamma .82` in `labTune.cjs`), nothing else changed, floor untouched. Before / after: `Reports/V13_PHASE6/08-04_before.png`, `08-04_after.png`. |
| Server row resolution (131 px source) | same captures | Kept. At the normal camera it is not visibly softer than the lockers beside it. |

## Play in the real app

Tool: `tools/native/v13StepPlay.py`. The game runs only while a command executes and is paused in between, so each
decision is made with the world frozen and the next seconds are played for real with native taps (TAP TO MOVE).
Each command costs about a second of standing still, which a person with a finger on the screen does not pay.

| Mission | Attempt | How far | Result | What it showed |
|---|---|---|---|---|
| 01-01 | safe lane | to the last room before the prize, 52 s | caught | The south lane of the map lies under the touch panel: a point there cannot be tapped, only reached by tapping beside the panel. Guards' facing in the telemetry matched where they caught sight. Lost by walking four waypoints blind into the objective guard. |
| 09-02 | safe lane, quick exit | prize taken unseen at 79 s; caught two tiles from the exit at 90 s | caught | Every piece of cover did its job: cases against the arrival camera, hall islands against the west-hall guard, gold islands in the north hall, the pier in the vault. The two door cameras leave a pass between sweeps. One glimpse (no alert) at the certified hiding spot behind the pier as the vault guard turns north at the bay. Seen at the south door by the returning vault guard and run down. |
| 09-05 | risk opening in, then safe | inside the prize bay unseen at 106 s | caught | Checkpoint and antechamber guards walk in step, so one opening is always free; the lockers, the antechamber screen and the pier hid the thief as designed; the wall under the vault camera is a blind strip. Committed late in the vault guard's round and was met at the bay mouth. |

Not played: 23 of the 26 listed missions, every Risk attempt, anything on Tilt.

| Chapter | Missions played | PASS | POLISH | MINOR | MAJOR |
|---|---:|---:|---:|---:|---:|
| 1 | 1 (partial) | – | – | – | – |
| 2–8 | 0 | – | – | – | – |
| 9 | 2 (to the prize) | – | – | 1 (09-02 hiding spot glimpse) | 0 |

No row is marked PASS: a caught run by a slow player is not evidence of a pass.

## Changed

- `hq_server_row` art (brightness). No mission data changed: the baked campaign is the Phase 5 bake
  (`campaignStages.json` hash f4612cac…), and with picture ids removed it equals the Phase 4 bake on all 45 missions.

## Seen and left

- 09-02: the hiding spot behind the vault pier is caught for an instant (no alert) when the vault guard turns north
  at the bay; standing half a tile further north avoids it. Not moved without a second run to confirm.
- Touch fallback only: the bottom rows of a map sit under the gait panel when the camera is clamped at the map's
  south edge (01-01 south lane). Not a Tilt issue.
- 06-03 overlap, server-row source size: see the table above.

## Regression

- 45 missions, 9 chapters. Guards, cameras, entry / objective / exit and every route edge are identical to the
  Phase 4 dump (`tools/campaign/v13SecurityDump.ts`).
- Tilt, guard, CCTV, save and touch-movement sources were not written in this phase (file times predate it).
- `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors (2 existing warnings), `test:environment` 11 / 11,
  manifest 0 missing / 0 invalid.
