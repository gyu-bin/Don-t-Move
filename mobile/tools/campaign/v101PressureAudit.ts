/** Frozen-baseline/current V10.1 runner, Chapters 1–3 only. Never combines axes into a weighted score. */
import fs from 'node:fs';
import path from 'node:path';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditDifficulty,summarizeDifficulty,chapterOrderingAcceptance} from './chapterDifficultyAudit';
import {auditPressureMitigation} from './v101PressureMetrics';
const input=process.argv[2]??'src/game/levels/stages/campaignStages.json';
const output=process.argv[3]??'Reports/V101/pressure-current.json';
const definitions=(JSON.parse(fs.readFileSync(input,'utf8')) as StageDefinition[]).filter(d=>(d.chapter??0)>=1&&(d.chapter??0)<=3);
const missions=definitions.map(def=>{console.log(`Measuring ${def.id}`);return{...auditDifficulty(def),mitigation:auditPressureMitigation(def)};});
const scalarAxes={
 guardCount:(r:typeof missions[number])=>r.guards,
 cctvCount:(r:typeof missions[number])=>r.cameras,
 traversableTileCenters:(r:typeof missions[number])=>r.floor,
 safePockets:(r:typeof missions[number])=>r.safePockets,
 escapeChoices:(r:typeof missions[number])=>r.escapeChoices,
 neverExposedFloorFraction:(r:typeof missions[number])=>r.mitigation.patrol.neverExposedFloorFraction,
 patrolCrossingsNearSafeRoutePerMinute:(r:typeof missions[number])=>r.mitigation.patrol.patrolCrossingsNearSafeRoutePerMinute,
 mapAreaTiles:(r:typeof missions[number])=>r.mitigation.mapAreaTiles,
 guardCoveredTiles:(r:typeof missions[number])=>r.guardCoverage*r.floor,
 cctvCoveredTiles:(r:typeof missions[number])=>r.cctvCoverage*r.floor,
 narrowTileFraction:(r:typeof missions[number])=>r.mitigation.narrowTileFraction,
 coverProximityFraction:(r:typeof missions[number])=>r.mitigation.coverProximityFraction,
 objectiveApproachExposure:(r:typeof missions[number])=>r.mitigation.patrol.objectiveApproachExposure,
 searchObjectiveApproachExposure:(r:typeof missions[number])=>r.mitigation.search.objectiveApproachExposure,
 geometricLosBreakFraction:(r:typeof missions[number])=>r.mitigation.patrol.geometricLosBreakFraction,
 searchGuardCoverage:(r:typeof missions[number])=>r.mitigation.search.guardCoverage,
 searchOverlap:(r:typeof missions[number])=>r.mitigation.search.overlap,
 timingWindowSeconds:(r:typeof missions[number])=>r.mitigation.patrol.safeRouteMedianLongestWindowSeconds,
 postTheftEscapeExposure:(r:typeof missions[number])=>Math.min(...r.mitigation.search.routes.filter(p=>p.collisionClear).map(p=>p.exposure)),
};
const extendedChapters=[1,2,3].map(chapter=>({chapter,axes:Object.fromEntries(Object.entries(scalarAxes).map(([axis,read])=>{const rows=missions.filter(r=>r.chapter===chapter).map(read).filter(Number.isFinite).sort((a,b)=>a-b),mid=Math.floor(rows.length/2);return[axis,{count:rows.length,mean:rows.length?rows.reduce((n,v)=>n+v,0)/rows.length:null,median:rows.length?(rows.length%2?rows[mid]:(rows[mid-1]+rows[mid])/2):null,min:rows[0]??null,max:rows.at(-1)??null}];}))}));
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({version:'V10.1',input,method:{sampling:'60s at 60Hz, observed every 0.5s; fresh deterministic patrol and pickup/search phases; hidden player prevents player-LKP chase.',routeSampling:'Half-tile spacing on authored paths, collision validity reported. Averaged occupancy is not a moving-player clear proof.',approach:'Collision-visible traversable tile centers within two tiles of objective.',mitigation:'Cover proximity <=0.75 tiles includes walls [PLACEHOLDER]; geometric LOS break ignores cone/range and requires blockers against all security sources; narrow means <=2 clear cardinal one-tile moves. Geometric proxies, not hide interaction/topological chokepoint certificates.',timing:'Median longest contiguous unexposed window per safe-route point in one 60s phase. Independent points do not imply synchronized route timing.',escape:'Each authored route reported separately. First low-exposure point <=10% occupancy [PLACEHOLDER]; first cover <=0.75 tile blocker proximity [PLACEHOLDER]. Neither guarantees safety.',search:'Empty objective from t=0, actual theft discovery/alarm; no forced global alert. If alert never fires this phase does not demonstrate search.',bias:'Area fractions favor large maps. Absolute covered tiles, routes, approach/search and mitigation accompany them. No weighted score or inferred human completion.'},missions,chapters:summarizeDifficulty(missions).slice(0,3),extendedChapters,orderingAcceptance:chapterOrderingAcceptance(missions)},null,2)+'\n');
console.log(output);
