# RC hotfix — QA unlock-all and 05-05 objective security (2026-10-07)

Not committed. No OTA published. Two changes only; no redesign, no refactor, no other map touched.

## 1. QA unlock-all

### What was there

Progression has one rule, `canPlayMission(progress, index, testBuild)` in `campaignProgress.ts`: a mission can be
played if it is at or below `highestUnlocked`, or already cleared, or `testBuild` is true. The third argument is the
existing test unlock. All five places that ask (start a mission, the Continue button, chapter cards, mission cards,
the mission the game screen opens on) passed `__DEV__` for it, so it worked in the dev client and never on TestFlight.
There was no `unlockAll` option and no QA flag for it.

### What changed

That same argument is now fed from one constant, `QA_UNLOCK_ALL` (`src/game/progress/qaUnlock.ts`):

```
QA_UNLOCK_ALL = development bundle  OR  EXPO_PUBLIC_DM_QA_UNLOCK_ALL === '1'
```

`campaignProgress.ts` is untouched (it is one of the hash-protected files). Nothing new was built beside the
existing rule; the five call sites pass `QA_UNLOCK_ALL` where they passed `__DEV__`.

- **On**: all nine chapter cards and all 45 mission cards can be opened and started, from any save, including a
  fresh install.
- **Off** (a bundle built without the variable): exactly the previous progression.
- **The save is not written to.** The override only answers "may this be started?". The list keeps showing the real
  state: cleared missions as cleared, the chapter counter as it is. A mission that is open only because of the
  override is drawn open and tagged `QA` (before, in the dev client, it was drawn locked and still tappable, which
  read as locked).
- Settings shows `QA: ALL MISSIONS UNLOCKED` at the bottom while it is on. Nothing is shown on Home.

One thing to know: clearing a mission still records that clear, as any clear does, and the normal rule then also
raises `highestUnlocked` to the mission after it. Opening and looking does not change the save; finishing 09-05 does.

### Getting it onto TestFlight

`EXPO_PUBLIC_*` values are inlined when the bundle is exported. For `eas update`, Expo's documentation says that
with `--environment` only the variables of that EAS environment are used. All three EAS environments of this
project are empty today. So the variable goes into an EAS environment that is not the release one, and the QA update
is published from that environment to the channel TestFlight listens to:

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_DM_QA_UNLOCK_ALL --value 1 --visibility plaintext
```

```bash
npx eas-cli@latest update --channel production --environment preview --message "QA: all missions unlocked"
```

A release update stays as it is (`npm run update:production`, environment `production`, no variable): progression
is locked again for everyone on that update. **Build 2 listens to the `production` channel, so a QA update reaches
every TestFlight tester, and the store release must be built or updated from the `production` environment.**
The Settings line is the check.

Neither command was run. Whether a variable set only in the shell would also be picked up by `eas update` was not
tested, since that needs a publish.

### Checked

Release builds in the Simulator (scratch copy, fresh install each time):

| Build | Chapter cards | Mission cards | Start |
|---|---|---|---|
| Flag **on** | 01–09 all open | Ch7, Ch8, Ch9: 5 of 5 open, tagged QA | 07-01, 08-01, 09-05 each started from the fresh save |
| Flag **off** | 01 open, 02–09 locked | 01-01 open, 01-02…01-05 locked | 01-01 started; the Chapter 7 card cannot be opened |

Save file of the flag-on app after starting those three missions: `highestUnlocked 0`, `records {}`,
`lastMission 01-01`.

## 2. 05-05 objective security

### Before

| Guard | Role | Patrol |
|---|---|---|
| 1 | hall | (17.5, 13) ↔ (9.5, 15.5) |
| 2 | corridor | (14.25, 7.75) ↔ (9, 7.75); looks at the count room door from the east post |
| 3 | exit stair | (5, 13.3) ↔ (4.6, 14.3) |
| 4 | **objective** | (8.75, 4) at the jewel, 2 s → out of the count room to the chip room (23.5, 8), **6 s there** → back |

Guard 4's cycle is about 40 s, of which he is outside the count room 38 % of the time. Measured on the real guard
code, over every half-second start time: a thief who walks from the corridor door to the jewel **without looking at
anyone** arrives unseen **49 %** of the time; the longest open window is 12 s and the walk needs 5.4 s. That is the
"nobody near the prize" seen on the phone. (05-05 takes its plan from Bank 03-05, mirrored; this is that patrol.)

### Change — guard 4's patrol only

| | Old | New |
|---|---|---|
| Stops | (8.75, 4) 2 s ↔ (23.5, 8) 6 s | (8.75, 4) 2 s ↔ **(19.5, 4.5) 3 s**, looking into the chip room opening |
| Baked route | 8 points through the chip room | (8.75, 4) → (11.25, 4.25) → (19.5, 4.5) → (9.75, 4.25) |
| In the count room | 62 % of the time | 100 % |
| Blind walk door → jewel unseen | 49 % | **26 %** |
| Longest open window | 12 s | 8 s (walk needs 5.4 s, run 2.6 s) |

He crosses the count room between the door and the jewel instead of leaving it: wait by the door or behind the count
room islands, let him pass east, go. He is at the jewel for the same two seconds per round as before, not parked on
it. No guard added; guard 4's spawn, facing, speed, vision and start delay are the same; guards 1–3 and both cameras
are the same; walls, pieces, entry, jewel, exit and all four routes are the same.

Implemented as a Casino-only table, `PATROL` in `tools/campaign/v13Casino.ts` (the Bank plan is not changed), listed
by `npm run campaign:overrides -- 05-05`.

Three other end points were measured and not used: by the door (17.5, 4.75) leaves a 3.5 s window, shorter than the
walk; inside the chip room opening (21.5, 4.5) leaves 10 s, close to the old feel.

### Is it harder?

For someone who does not look: yes (49 % → 26 %). For someone who waits and reads him, the scripted thief says it is
not: over 48 timed runs on the safe lane it clears 9 before and 31 after, because the old patrol caught it 22 times
coming back from the chip room behind its back, and the new one never does. Risk lane 19 / 48 both. Caught after
pickup: 0 both.

### Escape

Routes unchanged. Guard 4's theft posts and search anchors follow his stops, so after a theft he no longer has a
post in the chip room: the lockdown escape through the chip room has one watcher fewer than before; the quick escape
west is as it was. Not harder.

### Checked

- Audit: 45 / 45 clean — patrol collision 0, topology 0, fake gap 0, jewel and exit reachable, cameras unchanged.
- Running app (Simulator, dev build): guard 4 over two rounds stays within x 8.75–19.5, y 4.0–4.5, stands 2.1–2.2 s
  at the jewel post and 3.7–3.9 s at the east end, walks 1.03 tiles/s, phase STEALTH throughout.
- Walking the thief to the jewel in the running app: **not shown.** Two stepped touch runs from cover behind the
  count room island were both seen by guard 4, because the stepped harness took about 6 s to get the thief round the
  island and he had already turned back. That is the harness (it has never managed a timed crossing), not a result
  about the patrol. **PENDING — iPhone Tilt.**

## Campaign snapshot

- QA unlock: no change to any mission.
- 05-05: `44 / 45 SAME`, 05-05 intended. 38 values differ, all of them guard 4: route (13), theft posts (2), search
  sector anchors (2), and the same in the definition and the topology plan. Tracked hash of 05-05 refreshed
  (`d251d83b5493` → `e968b65fdb2e`); `campaign:snapshot` 45 / 45.

## Tests

| Check | Result |
|---|---|
| `npm test` | 1044 / 1044 (1039 + 5 new QA unlock tests) |
| `npm run typecheck` | 0 errors |
| lint | 0 errors (1 existing warning) |
| `campaign:audit` | 45 / 45 clean, 1 known finding (05-02) |
| `campaign:snapshot` | 45 / 45 SAME |
| `test:environment` / manifest | 15 / 15, missing 0 / invalid 0 |

New tests (`src/game/progress/__tests__/qaUnlock.test.ts`): on only for a dev bundle or the exact flag `1` · flag off
is the normal progression · flag on is 45 of 45 in nine chapters · 07-01, 08-01, 09-05 start from a locked save ·
nothing is forged. The override tables test also covers `PATROL` (Chapter 5 only, same guards and order as the
Bank plan, no guard added).

## Files

Changed: `src/ui/branding/StartupScreen.tsx`, `src/ui/menu/StageSelectScreen.tsx`, `MissionSelect.tsx`,
`MenuScreens.tsx`, `strings.ts`, `src/ui/VisualPlaygroundScreen.tsx` (one argument); `tools/campaign/v13Casino.ts`,
`v13Overrides.ts`, `v13Integrity.test.ts`, `README.md`; `package.json` (test list);
`docs/design/v13/PHASE8_SNAPSHOT_HASHES.json`; generated `campaignStages.json`.
Added: `src/game/progress/qaUnlock.ts`, `src/game/progress/__tests__/qaUnlock.test.ts`, this report.
