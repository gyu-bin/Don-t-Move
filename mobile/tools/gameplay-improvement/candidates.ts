/** v2 mission variant candidates (guard / camera re-routes only). None shipped: the v2 campaign layer was removed (docs/reports/gameplay-improvement-v2/). */
import type {VarietyPatch} from './variety';

const foyerSentry={zone:'foyer',watches:'The collection door and the exit in turn, from the foyer corner',
  stops:[{x:13.25,y:4.9,look:{x:8.5,y:3.25},wait:3},{x:13.5,y:4.6,look:{x:18,y:4.25},wait:3}]};

/** Pre-v2 stops of 07-01 g3 (west gallery), restated so candidates that leave him alone are measured from the original. */
const G3_0701={zone:'westGallery',watches:'The West Gallery, end to end',stops:[{x:15.5,y:11,look:{x:20,y:11},wait:3},{x:20,y:11,look:{x:15.5,y:11},wait:3}]};

export const CANDIDATES:Record<string,VarietyPatch>={
  // 07-01: the west-gallery guard (g3) is unused by every approach and by the quick escape.
  '07-01:foyerA':{why:'g3 patrols the foyer east-west',guards:{2:{zone:'foyer',watches:'The North Foyer between the collection door and the exit',
    stops:[{x:10,y:4.75,look:{x:13.5,y:4.75},wait:2.5},{x:13.25,y:4.75,look:{x:9,y:4.75},wait:2.5}]}}},
  '07-01:foyerB':{why:'g3 patrols foyer ↔ side gallery mouth',guards:{2:{zone:'foyer',watches:'The North Foyer and the side gallery mouth',
    stops:[{x:9.75,y:4.5,look:{x:13,y:3},wait:2},{x:15.5,y:4.5,look:{x:12,y:4.5},wait:3}]}}},
  '07-01:foyerC':{why:'g3 sentry in the foyer SE corner: looks at the collection door, then down the side gallery',guards:{2:foyerSentry}},
  '07-01:foyerC+court':{why:'foyerC + the west-gallery camera sweeps the court',guards:{2:foyerSentry},
    cameras:{1:{facing:2.6,watches:'The court crossing between the hall door and the collection wall'}}},
  // patrolSearch.ts 07-01 g3 (seed 7): best scoring re-routes
  '07-01:s4':{why:'g3 walks the court–hall doorway: waits on each side watching the door',guards:{2:{zone:'court',watches:'The court–hall doorway, from the court side and from the hall side in turn',
    stops:[{x:12.5,y:11.5,look:{x:12.5,y:13.5},wait:3},{x:12.5,y:15.5,look:{x:12.5,y:13.5},wait:3}]}}},
  '07-01:s4b':{why:'s4 with the court stop moved 1.5 tiles east of the court guard\'s post (no two guards on one spot)',guards:{2:{zone:'court',watches:'The court–hall doorway, from the court side and from the hall side in turn',
    stops:[{x:13.75,y:11.25,look:{x:12.5,y:13.5},wait:3},{x:12.5,y:15.5,look:{x:12.5,y:13.5},wait:3}]}}},
  '07-01:s4c':{why:'s4 with the court stop 1.35 tiles from the court guard\'s post',guards:{2:{zone:'court',watches:'The court–hall doorway, from the court side and from the hall side in turn',
    stops:[{x:13.1,y:11.6,look:{x:12.5,y:13.5},wait:3},{x:12.5,y:15.5,look:{x:12.5,y:13.5},wait:3}]}}},
  // patrolSearch.ts 06-03 g3 (seed 11): the art-store guard moves to the start of the two approach lanes
  '06-03:s18':{why:'g3 watches the two lane mouths of the west hall in turn (west lane from the west stop, centre lane from the east stop)',guards:{2:{zone:'southLane',watches:'The two lane mouths at the foot of the west hall, in turn',
    stops:[{x:4.5,y:11.5,look:{x:2.5,y:11.75},wait:3},{x:9.5,y:12.5,look:{x:9.75,y:14.75},wait:2}]}}},
  '06-03:s15':{why:'g3 patrols the top of the west column',guards:{2:{zone:'westColumn',watches:'The west column below the north lane',
    stops:[{x:2.5,y:7.5,look:{x:2,y:3.5},wait:3},{x:5.5,y:6.5,look:{x:2.5,y:7.5},wait:2}]}}},
  // softened after the accessibility check (v2 final conditions): a readable door window instead of a closed lane
  '07-01:soft1':{why:'g3 watches the court–hall door from the court for 2 s, then walks east and looks away for 4 s',guards:{2:{zone:'court',
    watches:'The court–hall doorway from the court side, then the west gallery mouth',
    stops:[{x:13.1,y:11.6,look:{x:12.5,y:13.5},wait:2},{x:16.5,y:11.25,look:{x:20,y:11.25},wait:4}]}}},
  '07-01:soft2':{why:'g3 keeps his west-gallery beat but starts it at the court door: 2 s on the door, long walk east, 3 s away',guards:{2:{zone:'westGallery',
    watches:'The court–hall doorway at one end of his beat, the west gallery at the other',
    stops:[{x:13.6,y:11.25,look:{x:12.5,y:13.5},wait:2},{x:20,y:11,look:{x:15.5,y:11},wait:3}]}}},
  '06-03:soft1':{why:'g3 watches the two lane mouths from further back (4 tiles), 2 s each',guards:{2:{zone:'southLane',
    watches:'The two lane mouths at the foot of the west hall, in turn, from further back',
    stops:[{x:6.5,y:12,look:{x:2.5,y:12},wait:2},{x:10.5,y:12.25,look:{x:9.75,y:15},wait:2}]}}},
  '06-03:soft2':{why:'g3 watches only the centre lane mouth and the hall, leaving the west lane to the camera',guards:{2:{zone:'southLane',
    watches:'The centre lane mouth, then back along the hall',
    stops:[{x:9.5,y:12.5,look:{x:9.75,y:15},wait:2},{x:12.5,y:12.5,look:{x:15,y:12.5},wait:3}]}}},
  '07-01:mid':{why:'g3: 3 s on the court–hall door, then 3 s looking away from the east end of the court',guards:{2:{zone:'court',
    watches:'The court–hall doorway from the court side, then the west gallery mouth',
    stops:[{x:13.1,y:11.6,look:{x:12.5,y:13.5},wait:3},{x:16,y:11.25,look:{x:20,y:11.25},wait:3}]}}},
  // camera re-seat: the west-gallery camera (watched only the alternate escape) moves to the court's north wall and sweeps
  // the risk lane's court crossing — a periodic, readable timing window instead of a guard that closes the lane
  '07-01:cam10':{why:'west-gallery camera re-seated on the court north wall, sweeping the risk lane crossing',cameras:{1:{zone:'court',at:{x:10,y:7.4},facing:1.5708,watches:'The court crossing between the hall door and the collection wall'}}},
  '07-01:cam13':{why:'west-gallery camera re-seated on the court north wall (east half)',cameras:{1:{zone:'court',at:{x:13.5,y:7.4},facing:1.5708,watches:'The court crossing between the hall door and the collection wall'}}},
  '07-01:cam10o':{why:'cam10 with g3 on his original west-gallery beat',guards:{2:G3_0701},cameras:{1:{zone:'court',at:{x:10,y:7.4},facing:1.5708,watches:'The court crossing between the hall door and the collection wall'}}},
  '07-01:cam13o':{why:'cam13 with g3 on his original west-gallery beat',guards:{2:G3_0701},cameras:{1:{zone:'court',at:{x:13.5,y:7.4},facing:1.5708,watches:'The court crossing between the hall door and the collection wall'}}},
  '07-01:s2':{why:'g3 patrols the hall between the gallery doorway and the court doorway',guards:{2:{zone:'hall',watches:'The hall, between the two doorways north',
    stops:[{x:7.5,y:14.5,look:{x:4.5,y:13.5},wait:3},{x:12.5,y:16.5,look:{x:13.75,y:14.75},wait:2}]}}},
  '07-01:s14':{why:'g3 patrols the collection-wall gallery watching its two south openings',guards:{2:{zone:'wallGallery',watches:'The collection-wall gallery and its south openings',
    stops:[{x:6.5,y:10.5,look:{x:4.5,y:11.5},wait:3},{x:2.5,y:12.5,look:{x:4.5,y:13.5},wait:3}]}}},
};
