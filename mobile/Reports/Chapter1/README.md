# Chapter 1 gameplay acceptance

Stage counts: 2 / 2 / 3 / 3 / 4 / 4 / 4 / 5 / 5 / 6 guards.
Stage 01–03 teach movement, cover, hiding; 04 choice, 05 ring, 06 crossing patrols,
07 long east-side escape, 08 security response, 09 interconnected rooms, 10 finale.

Mission completion now runs after player movement and before new guard contact.
An already-caught run remains terminal. Alert state never locks an active Exit.
Tests reproduce Exit arrival in Alert, Chase and Search, including contact on arrival.

Patrol points support waitDuration, lookDirection, turnDuration and loop/pingpong/waitAndLook.
Turning is stationary, so residual speed no longer drifts off the authored route.
Escape pressure is data-only per guard: pace, waypoint waits and look headings change once
on pickup, without teleportation, forced alert or knowledge of a hidden player.

Stage progress retains the existing storage key, migrates the former five-stage finale,
stores cleared stages and minimum positive best times, and serializes writes in order.
Dev Unlock is a session-only Settings option; Release cannot enable it.

Pickup uses an original temporary two-note WAV, cyan flash, haptic, one-second banner,
then escape prompt and persistent diamond HUD. Sound OFF mutes both pickup and whistle.
Caught uses red flash and haptic. Results show simulation time (excluding pause/calibration),
whistle count and best time. Stage 10 reports Chapter Complete.

Animation limitations: temporary player sheet has walking-in-place/foot sliding;
legacy guard has no gait cycle. Cadence remains 1.41 / 2.40 / 3.75 steps per second.
Final sprite replacement remains separate work.

Automated: 139 pass, 0 fail; existing physical Tilt acceptance remains pending.
Typecheck passes; lint has zero errors and six existing warnings.
Map traversal tests validate geometry with guards removed; they do not establish human
stealth difficulty or guarantee an unseen route at every moment of the patrol cycle.
Physical all-stage playthrough, haptic/audio feel and sustained FPS require iPhone play.

Simulator UI: title → Start → Stage 01, Pause → Settings → Stage Select,
01 unlocked / 02–10 locked, Dev Unlock, and Stage 10 load/render were directly checked.
iPhone 14 Pro is connected; launch was rejected by iOS because the device was locked.
No Chapter 1 physical playthrough is claimed.
