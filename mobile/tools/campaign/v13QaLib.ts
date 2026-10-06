/**
 * Shared helpers of the V13 QA tools (Phase 8B): loading and selecting missions, writing a report, canonical JSON and
 * hashing, and the two measurements several tools repeated (what a camera sees, where a patrol touches collision).
 * Tool side only: nothing under src/ imports this file, and it calls the game's own code without changing it.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {TILE,type CompiledStage} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,createGuardEvents} from '../../src/game/guards/guardBrain';
import {stepGuards} from '../../src/game/guards/guardSystem';

/** The baked campaign the game ships. */
export const CAMPAIGN_FILE='src/game/levels/stages/campaignStages.json';
export const loadCampaign=(file:string=CAMPAIGN_FILE):StageDefinition[]=>JSON.parse(fs.readFileSync(file,'utf8')) as StageDefinition[];
/** Missions whose id starts with one of `wanted` ('04-05' or a chapter prefix '04'); all of them when nothing is asked for. */
export const pickMissions=<T extends {id:string}>(list:T[],wanted:string[]):T[]=>wanted.length?list.filter(m=>wanted.some(w=>m.id.startsWith(w))):list;
/** Writes a report file, creating its folder. Objects are written as indented JSON. */
export function writeReport(file:string,content:string|object,indent:number|undefined=2):void{
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof content==='string'?content:JSON.stringify(content,null,indent));
}
/** Same value with object keys sorted (array order kept, typed arrays as plain arrays, non-finite numbers as text). */
export const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):ArrayBuffer.isView(v)?Array.from(v as unknown as ArrayLike<number>)
 :v&&typeof v==='object'?Object.fromEntries(Object.keys(v as object).sort().map(k=>[k,canonical((v as Record<string,unknown>)[k])])):typeof v==='number'&&!Number.isFinite(v)?String(v):v;
export const sha256=(v:unknown):string=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

/** Length of the patrol walk the tools use, and its frame rate. */
export const PATROL_SECONDS=120,PATROL_FPS=60;
/**
 * Walks every guard of a stage along his patrol on the game's own guard code, with the thief out of sight, and
 * reports each frame on which a guard's step touches collision (his body radius against the navigation blockers).
 */
export function walkPatrols(stage:CompiledStage,onTouch:(guard:{id:string;x:number;y:number},index:number,seconds:number)=>void,seconds:number=PATROL_SECONDS):void{
 const nav=buildNavigation(stage,BODY.guardRadius),guards=stage.guards.map(g=>createGuardState(g)),events=createGuardEvents(),hidden={x:-1000,y:-1000,gait:0} as never;
 for(let f=0;f<seconds*PATROL_FPS;f++){
  const prev=guards.map(g=>({x:g.x,y:g.y}));stepGuards(guards,hidden,stage.visionBlockers,nav,1/PATROL_FPS,events,f/PATROL_FPS,true);
  guards.forEach((g,i)=>{if(!clearSegment(prev[i].x,prev[i].y,g.x,g.y,nav.blockers,BODY.guardRadius))onTouch(g,i,f/PATROL_FPS);});
 }
}
type Camera=NonNullable<CompiledStage['cameras']>[number];
/**
 * What a camera sees: the share (0–100) of the standable floor inside its cone (range × half-angle including the
 * sweep) that nothing hides, and how far it sees straight ahead before the first sight blocker (world units).
 */
export function cameraView(stage:CompiledStage,c:Camera):{share:number;ahead:number}{
 let seen=0,total=0;const spread=c.sweepAngle+c.visionAngle/2;
 for(let a=-spread;a<=spread;a+=spread/12)for(let r=TILE*.75;r<=c.range;r+=TILE*.25){const x=c.x+Math.cos(c.centerFacing+a)*r,y=c.y+Math.sin(c.centerFacing+a)*r;
  if(!clearSegment(x,y,x,y,stage.movementBlockers,6))continue;total++;if(clearSegment(c.x,c.y,x,y,stage.visionBlockers))seen++;}
 let ahead=c.range;for(let r=TILE*.25;r<=c.range;r+=TILE*.25)if(!clearSegment(c.x,c.y,c.x+Math.cos(c.centerFacing)*r,c.y+Math.sin(c.centerFacing)*r,stage.visionBlockers)){ahead=r;break;}
 return {share:Math.round(100*seen/Math.max(1,total)),ahead};
}
