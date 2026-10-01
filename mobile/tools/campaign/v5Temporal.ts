/** Isolated actual-AI surveillance/search probe, not a spawn-to-exit playthrough. */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {stepSecurityCameras} from '../../src/game/security/cctv';
import {pointVisible} from '../../src/game/guards/guardVision';
import {Awareness} from '../../src/game/core/types';
export function auditV5Temporal(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const regions=def.securityZones??[];
 const runs=([false,true]as const).map(stolen=>{
  const s=createPlaygroundState(stage);s.theft.empty=stolen;
  const hidden={x:-1000,y:-1000,gait:0};
  const tracks=s.guards.map(g=>({id:g.id,visitedZones:new Set<string>(),visitedSectorAnchors:new Set<string>(),collisionSamples:0,states:new Set<number>(),distance:0,last:{x:g.x,y:g.y}}));
  const covered=new Set<string>(),cameraCovered=new Set<string>(),states:Record<string,Set<string>>={};let theftAt:number|null=null;
  const duration=stolen?90:60;
  for(let f=0;f<duration*60;f++){
   const t=(f+1)/60;
   stepSecurityCameras(s.securityCameras,hidden,stage.visionBlockers,s.events,1/60,t);
   stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);
   if(s.events.theftAlert&&theftAt===null)theftAt=t;
   for(let i=0;i<s.guards.length;i++){
    const g=s.guards[i],track=tracks[i];track.states.add(g.awareness);track.distance+=Math.hypot(g.x-track.last.x,g.y-track.last.y);track.last={x:g.x,y:g.y};
    if(!clearSegment(g.x,g.y,g.x,g.y,stage.movementBlockers,BODY.guardRadius))track.collisionSamples++;
    if(!stolen||s.events.theftAlert){for(const z of regions)if(Math.hypot(g.x/TILE-z.x,g.y/TILE-z.y)<=z.radius)track.visitedZones.add(z.name);for(const sector of s.theft.sectors?.[i]??[])for(const [j,p]of sector.anchors.entries())if(Math.hypot(g.x-p.x,g.y-p.y)<24)track.visitedSectorAnchors.add(`${sector.id}:${j}`);}
   }
   if(f%60)continue;
   for(let y=.5;y<stage.rows;y++)for(let x=.5;x<stage.cols;x++){
    const wx=x*TILE,wy=y*TILE;if(!clearSegment(wx,wy,wx,wy,stage.movementBlockers,BODY.playerRadius))continue;
    const key=`${x},${y}`;
    for(const g of s.guards)if(pointVisible(g,wx,wy,stage.visionBlockers)){covered.add(key);const name=Object.entries(Awareness).find(([,v])=>v===g.awareness)?.[0]??String(g.awareness);(states[name]??=new Set()).add(key);}
    if(s.securityCameras.some(c=>pointVisible(c,wx,wy,stage.visionBlockers)))cameraCovered.add(key);
   }
  }
  return{fixture:stolen?'empty-case-at-start':'normal-patrol',seconds:duration,theftAt,secondsAfterTheft:theftAt===null?0:duration-theftAt,actualTheftAlert:s.events.theftAlert,globalPlayerAlert:s.events.globalAlert,guards:tracks.map(({last,visitedZones,visitedSectorAnchors,states,...r})=>({...r,distanceTiles:r.distance/TILE,visitedZones:[...visitedZones],visitedSectorAnchors:[...visitedSectorAnchors],states:[...states]})),guardCoveredTiles:[...covered],cameraCoveredTiles:[...cameraCovered],stateCoverage:Object.fromEntries(Object.entries(states).map(([name,cells])=>[name,[...cells]]))};
 });
 return{id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),native:false,method:'Real guard/camera engine, fixed external hidden observer. Empty-case fixture is a seeded stolen-objective condition; no synthetic theft alert, no modified AI. Isolated circulation test, NOT proof of actual pickup/escape or Spotted/Search/Return flow.',runs};
}

if(process.argv[1]?.endsWith('v5Temporal.ts')){
 const source=process.env.CAMPAIGN_JSON??'Reports/LevelDesignV5/candidate.json';
 const out=process.env.OUT_DIR??'Reports/LevelDesignV5';
 const missions=process.env.MISSIONS?.split(',');
 const defs=(JSON.parse(fs.readFileSync(source,'utf8'))as StageDefinition[]).filter(d=>(d.chapter??0)<=3&&(!missions||missions.includes(d.id)));
 const reports=defs.map(d=>{const r=auditV5Temporal(d);console.log(JSON.stringify({id:r.id,runs:r.runs.map(s=>({fixture:s.fixture,theftAt:s.theftAt,secondsAfterTheft:s.secondsAfterTheft,guardVisits:s.guards.map(g=>g.visitedZones),collisions:s.guards.reduce((n,g)=>n+g.collisionSamples,0)}))}));return r;});
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/temporal-search.json`,JSON.stringify(reports,null,2)+'\n');
}
