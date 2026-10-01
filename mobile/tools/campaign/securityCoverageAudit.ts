/** Deterministic spatial coverage, not a human difficulty/FPS certification. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {stepSecurityCameras} from '../../src/game/security/cctv';
import {buildVisionFan,pointVisible} from '../../src/game/guards/guardVision';
const input:StageDefinition[]=JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON??'src/game/levels/stages/campaignStages.json','utf8'));
const reports=input.filter(d=>(d.chapter??0)<=3).map(def=>{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),state=createPlaygroundState(stage);
 const points:{x:number;y:number;key:string}[]=[];
 for(let y=0;y<stage.rows;y++)for(let x=0;x<stage.cols;x++){
  const wx=(x+.5)*TILE,wy=(y+.5)*TILE;
  if(stage.grid[y*stage.cols+x]===1&&clearSegment(wx,wy,wx,wy,stage.movementBlockers,BODY.playerRadius))points.push({x:wx,y:wy,key:`${x},${y}`});
 }
 const guardSeen=new Set<string>(),cameraSeen=new Set<string>();
 const cameras=state.securityCameras.map(c=>({id:c.id,hits:new Map<string,number>(),objectiveSamples:0,exitSamples:0}));
 let samples=0,objectiveGuard=false,objectiveCamera=false,exitGuard=false,exitCamera=false;
 const zones=(def.securityZones??[]).map(z=>({...z,guardSamples:0,cameraSamples:0,navigableKeys:points.filter(p=>Math.hypot(p.x-z.x*TILE,p.y-z.y*TILE)<=z.radius*TILE).map(p=>p.key)}));
 const hidden={x:-10000,y:-10000,gait:0};
 for(let f=0;f<120*60;f++){
  const t=(f+1)/60;
  stepSecurityCameras(state.securityCameras,hidden,stage.visionBlockers,state.events,1/60,t);
  stepGuards(state.guards,hidden,stage.visionBlockers,nav,1/60,state.events,t,true,1,state.theft);
  if(f%60)continue;samples++;
  for(const g of state.guards)buildVisionFan(g,stage.visionBlockers);
  const guardsSee=(x:number,y:number)=>state.guards.some(g=>pointVisible(g,x,y,stage.visionBlockers));
  const camerasSee=(x:number,y:number)=>state.securityCameras.some(c=>pointVisible(c,x,y,stage.visionBlockers));
  const guardNow=new Set<string>(),cameraNow=new Set<string>();
  for(const p of points){if(guardsSee(p.x,p.y)){guardSeen.add(p.key);guardNow.add(p.key);}
   state.securityCameras.forEach((c,i)=>{if(pointVisible(c,p.x,p.y,stage.visionBlockers)){cameraSeen.add(p.key);cameraNow.add(p.key);cameras[i].hits.set(p.key,(cameras[i].hits.get(p.key)??0)+1);}});
  }
  objectiveGuard ||=guardsSee(stage.objective.x,stage.objective.y);objectiveCamera ||=camerasSee(stage.objective.x,stage.objective.y);
  const ex=stage.exit.x+stage.exit.w/2,ey=stage.exit.y+stage.exit.h/2;
  exitGuard ||=guardsSee(ex,ey);exitCamera ||=camerasSee(ex,ey);
  for(const z of zones){if(z.navigableKeys.some(k=>guardNow.has(k)))z.guardSamples++;if(z.navigableKeys.some(k=>cameraNow.has(k)))z.cameraSamples++;}
 }
 const combined=new Set([...guardSeen,...cameraSeen]);
 const covered=(x:number,y:number)=>combined.has(`${Math.floor(x)},${Math.floor(y)}`);
 let maxUncoveredTravel=0;
 for(const r of def.testRoutes??[]){let run=0;for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i],distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance*4));
  for(let j=1;j<=steps;j++){run=covered(a.x+(b.x-a.x)*j/steps,a.y+(b.y-a.y)*j/steps)?0:run+distance/steps;maxUncoveredTravel=Math.max(maxUncoveredTravel,run);}
 }}
 return{id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),guards:state.guards.length,cameraCount:cameras.length,navigableSampleTiles:points.length,navigableTileKeys:points.map(p=>p.key),guardTiles:guardSeen.size,cameraTiles:cameraSeen.size,combinedTiles:combined.size,potentialCoveredTileKeys:[...combined],guardCoveredTileKeys:[...guardSeen],cameraCoveredTileKeys:[...cameraSeen],combinedFraction:combined.size/points.length,objective:{guard:objectiveGuard,camera:objectiveCamera},exit:{guard:exitGuard,camera:exitCamera},zones:zones.map(({navigableKeys,...z})=>({...z,navigableTiles:navigableKeys.length,guardCoveredTiles:navigableKeys.filter(k=>guardSeen.has(k)).length,cameraCoveredTiles:navigableKeys.filter(k=>cameraSeen.has(k)).length,combinedCoveredTiles:navigableKeys.filter(k=>combined.has(k)).length,combinedFraction:navigableKeys.length?navigableKeys.filter(k=>combined.has(k)).length/navigableKeys.length:0})),uncoveredMajorZones:zones.filter(z=>!z.guardSamples&&!z.cameraSamples).map(z=>z.name),maxUncoveredTravelTiles:maxUncoveredTravel,cameras:cameras.map(c=>({id:c.id,visibleSampleTiles:c.hits.size,temporalBlindSpotTiles:[...c.hits.values()].filter(n=>n<samples).length,permanentBlindSpotTiles:points.length-c.hits.size,alwaysVisibleTiles:[...c.hits.values()].filter(n=>n===samples).length,notHumanFairnessApproval:true}))};
});
const outDir=process.env.OUT_DIR??'Reports/SecurityBankV1';
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(`${outDir}/security-coverage.json`,JSON.stringify({method:'Actual moving Guard and CCTV exact shared VisionFan + LOS, 120s at60Hz, coverage sampled1s on radius9 navigable tile centres. Union coverage is potential exposure, not simultaneous pressure or a guaranteed crossing solution.',native:false,reports},null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({id:r.id,coverage:Math.round(r.combinedFraction*100),objective:r.objective,exit:r.exit,maxUncovered:r.maxUncoveredTravelTiles,uncovered:r.uncoveredMajorZones,cameras:r.cameras})),null,2));
