# V11 Phase B implementation plan

Scope: 60 runtime missions remain; map changes limited to Phase A's 12 TUNE + 5 PARTIAL REBUILD IDs. 13 KEEP and all Chapters 4–9 level definitions stay identical to the frozen pre-Phase-B campaign. Legacy Unity stays untouched.

## Shared timer and HUD

Confirmed Theft Alert starts a common 28-second countdown exactly once. Unknown pickup and player sighting before theft confirmation do not start it. Spotted/Search/Return never restart it. Zero means existing lockdown pressure, not loss. Theft carries no player position; actual sighting retains its existing priority. HUD uses runtime phase/countdown and hides after clear/caught, with no chapter identity branch. Existing mission-specific guard role contracts and chase speeds are preserved.

## Structural overlays

Pure authored overlays run after existing V9/V10 authoring. Museum owner handles 01-04/08/10 partial changes and 01-01/03/05 targeted review. Gallery/Bank owner handles 02-10/03-01 partial changes and the nine remaining TUNE reviews. Geometry requires player radius clearance and actual opaque sight breaks. Low props or glass cannot masquerade as full cover.

## Evidence and gates

Before snapshot: Reports/V11B/campaign-before.json. Compare semantic hashes for all 60 missions. Run campaign, stability, theft/search, CCTV, tilt, animation, audio tests plus TypeScript/lint and unchanged pressure audit. Record native attempts for the eight requested missions separately from offline simulation; only observed CLEAR is native Full-Heist verification. Physical Tilt remains a separate evidence gate.
