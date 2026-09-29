import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { campaignStages } from '../../src/game/levels/campaignStages';
import { BODY } from '../../src/game/guards/guardTuning';
import { compileStage, TILE } from '../../src/game/world/compileStage';
import { clearSegment } from '../../src/game/world/navigation';
import { PROP_KIT } from '../../src/game/world/propKit';

/** Geometry evidence, not a guarantee that a guard is facing a route at a
 * particular time or that a human can clear it under Tilt/Lockdown pressure. */
export function auditMuseumEscape() {
  return campaignStages.filter(d=>d.chapter===1).map(def=>{
    const stage=compileStage(def);
    const routes=(def.escapeRoutes??[]).map(route=>{
      const samples:{x:number;y:number}[]=[];
      let length=0;
      route.points.slice(1).forEach((p,i)=>{
        const a=route.points[i],distance=Math.hypot(p.x-a.x,p.y-a.y);
        length+=distance;
        const n=Math.max(1,Math.ceil(distance/.25));
        for(let j=0;j<=n;j++) samples.push({x:a.x+(p.x-a.x)*j/n,y:a.y+(p.y-a.y)*j/n});
      });
      const zones=(def.securityZones??[]).filter(zone=>
        def.guards.find(g=>g.id===zone.guardId)?.role!=='objective' &&
        samples.some(p=>Math.hypot(p.x-zone.x,p.y-zone.y)<=zone.radius &&
          clearSegment(p.x*TILE,p.y*TILE,zone.x*TILE,zone.y*TILE,stage.visionBlockers)));
      const traversable=route.points.slice(1).every((p,i)=>{
        const a=route.points[i];
        return clearSegment(a.x*TILE,a.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,BODY.playerRadius);
      });
      const end=route.points.at(-1)!;
      const reachesExit=end.x*TILE>=stage.exit.x && end.x*TILE<=stage.exit.x+stage.exit.w &&
        end.y*TILE>=stage.exit.y && end.y*TILE<=stage.exit.y+stage.exit.h;
      assert(traversable && reachesExit,`${def.id}/${route.name}: body-clear exit route required`);
      if(def.mission!>=5) assert(zones.length>0,`${def.id}/${route.name}: needs non-objective guard-zone recrossing`);
      return {name:route.name,lengthTiles:Math.round(length*10)/10,traversable,reachesExit,
        nonObjectiveGuardZones:zones.map(z=>z.name)};
    });
    return {id:def.id,structurePlan:def.structurePlan,routes,
      structuralCover:def.props.filter(p=>PROP_KIT[p.kind].blocksMovement&&PROP_KIT[p.kind].blocksVision)
        .map(p=>({kind:p.kind,x:p.x,y:p.y,collisionScale:p.collisionScale??1})),
      layoutSha256:createHash('sha256').update(JSON.stringify(def.layout)).digest('hex')};
  });
}

if(process.argv[1]?.endsWith('museumEscapeAudit.ts')) {
  const report={notes:[
    'All existing floor plans and props retained: each05+ escape crosses a non-objective guard zone with an unblocked sightline to its authored center.',
    'Zone crossing is spatial evidence, not guaranteed detection at any patrol time; full runtime and human Tilt checks remain separate.',
    'Existing large statues, counters, partitions, equipment and display cases already provide collision/LOS cover; no decorative filler added.',
  ],missions:auditMuseumEscape()};
  mkdirSync('Reports/TheftAlertV1',{recursive:true});
  writeFileSync('Reports/TheftAlertV1/escape-geometry.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.missions.map(m=>({id:m.id,routes:m.routes,cover:m.structuralCover.length})),null,2));
}
