import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {findWitness,playthrough} from './museumPlaythrough';
import {describeV5MuseumGallery,V5_MG_REDESIGNED_IDS} from './v5MuseumGallery';
export function auditV5MG(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),issues:string[]=[];
 for(const r of [...def.testRoutes??[],...def.escapeRoutes??[]])for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18))issues.push(`${r.name}: radius18 blocked leg${i}`);}
 for(const g of stage.guards)for(const q of [...g.route,...g.theftPosts??[],...g.theftSearchSectors?.flatMap(s=>s.anchors)??[]]){const r=findPath(nav,g.x,g.y,q.x,q.y);if(!clearSegment(q.x,q.y,q.x,q.y,stage.movementBlockers,BODY.guardRadius)||r.length<2||Math.hypot(r.at(-2)!-q.x,r.at(-1)!-q.y)>.1)issues.push(`${g.id}: blocked compiled patrol/search anchor ${q.x/TILE},${q.y/TILE}`);}
 return {id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),issues,radius18:issues.every(v=>!v.includes('radius18')),guardNav:issues.every(v=>!v.includes('anchor')),entryExit:Math.hypot(def.entryPosition!.x-def.exitPosition!.x,def.entryPosition!.y-def.exitPosition!.y),objectiveExit:Math.hypot(def.objective!.x-def.exitPosition!.x,def.objective!.y-def.exitPosition!.y)};
}
if(process.argv[1]?.endsWith('v5MuseumGalleryQA.ts')){
 const input=process.env.CAMPAIGN_JSON??'Reports/LevelDesignV5/mg-candidate.json';const defs=(JSON.parse(readFileSync(input,'utf8'))as StageDefinition[]).filter(d=>d.chapter===1||d.chapter===2),audit=defs.map(auditV5MG),replays=[];
 for(const def of defs){const indexes=process.env.ALL_ROUTES==='1'&&V5_MG_REDESIGNED_IDS.includes(def.id)?[0,1,2]:[0];const cases=[];for(const routeIndex of indexes){const result=findWitness(def,routeIndex);cases.push({routeIndex,...result});console.log(JSON.stringify({id:def.id,routeIndex,...result}));}replays.push({id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),geometry:playthrough(def,0,2,0,true),routes:cases});}
 mkdirSync('Reports/LevelDesignV5',{recursive:true});writeFileSync('Reports/LevelDesignV5/museum-gallery-gameplay.json',JSON.stringify({designs:defs.map(describeV5MuseumGallery),audit,replays,limits:['Continuous actual-engine target inputs; zero player teleport, forced pickup or AI suppression in route witnesses.','Geometry-only is explicitly separate; headless play is not physical Tilt/FPS evidence.','Long theft search/statecoverage and manual DebugOFF screenshot gates remain separately required.']},null,2));
 console.log(JSON.stringify({radius18:audit.every(r=>r.radius18),guardNav:audit.every(r=>r.guardNav),allMainClear:replays.every(r=>r.routes[0].found),issues:audit.flatMap(r=>r.issues)}));
}
