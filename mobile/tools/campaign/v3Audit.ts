/** V3 measurable gates. Visual composition and human Tilt approval remain separate. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {buildCampaign} from './buildCampaign';
import {BANK_V3_DESIGNS} from './bankProductionDesign';
import {v3MuseumGalleryDesign} from './v3MuseumGallery';
import {auditV3MuseumGallery} from './v3MuseumGalleryQA';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';

const dir='Reports/LevelDesignV3';
const before:StageDefinition[]=JSON.parse(fs.readFileSync(`${dir}/before/campaignStages.json`,'utf8'));
const defs=buildCampaign();
const hashes:Record<string,string>=JSON.parse(fs.readFileSync(`${dir}/before/protected-system-sha.json`,'utf8'));
const changedProtected=Object.entries(hashes).filter(([file,hash])=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash).map(([file])=>file);
const changedLater=defs.filter(d=>(d.chapter??0)>3&&JSON.stringify(d)!==JSON.stringify(before.find(b=>b.id===d.id))).map(d=>d.id);
const designs=[...defs.slice(0,20).map(v3MuseumGalleryDesign),...BANK_V3_DESIGNS];
const reports=defs.slice(0,30).map(def=>{
 const design=designs.find(d=>d.id===def.id)!;
 const movement=auditV3MuseumGallery(def);
 const issues=[...movement.issues];
 if(movement.entryExitDistance<=3)issues.push('Entry/Exit within3tiles');
 if(!design.missionFantasy||!design.landmark.reason)issues.push('Missing fantasy/landmark relation');
 const stage=compileStage(def);
 const largeZones=design.zones.filter(z=>z.bounds.w*z.bounds.h>=90).map(z=>{
  const b=z.bounds,x0=b.x+b.w*.22,x1=b.x+b.w*.78,y0=b.y+b.h*.22,y1=b.y+b.h*.78;
  const props=def.props.filter(p=>p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1&&(PROP_KIT[p.kind].blocksMovement||PROP_KIT[p.kind].blocksVision));
  const patrolPoints=def.patrolRoutes.flatMap(r=>r.points).filter(p=>p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1);
  return {name:z.name,centralStructures:props.length,centralPatrolPoints:patrolPoints.length,features:z.features,intentionalSafeReason:z.intentionalSafeReason??null,reviewRequired:props.length+patrolPoints.length===0};
 });
 const cameras=(def.cameras??[]).map(c=>{
  let wallDistance=Infinity;
  for(let y=0;y<stage.rows;y++)for(let x=0;x<stage.cols;x++)if(stage.grid[y*stage.cols+x]===2){
   const dx=Math.max(x*TILE-c.x*TILE,0,c.x*TILE-(x+1)*TILE),dy=Math.max(y*TILE-c.y*TILE,0,c.y*TILE-(y+1)*TILE);
   wallDistance=Math.min(wallDistance,Math.hypot(dx,dy)/TILE);
  }
  return {id:c.id,wallDistanceTiles:wallDistance,mountContext:design.cctv.find(v=>v.id===c.id)?.mountContext??null};
 });
 return {...movement,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),issues,largeZones,cameras,visualGate:'PENDING_INDEPENDENT_IMAGE_REVIEW',nativeTilt:'NOT_VERIFIED'};
});
const signatures=designs.map(d=>({id:d.id,...d.topology}));
const out={scope:{protectedFiles:Object.keys(hashes).length,changedProtected,changedLater,campaignCount:defs.length},designs,reports,signatures,issues:reports.flatMap(r=>r.issues.map(issue=>({id:r.id,issue}))),method:'Measurable portal, radius18 movement, Guard Nav/search anchors and protected-file checks. Metadata is an authored claim, not a visual or human-play approval.'};
fs.writeFileSync(`${dir}/semantic-audit.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({scope:out.scope,issues:out.issues,largeZoneReview:reports.flatMap(r=>r.largeZones.filter(z=>z.reviewRequired).map(z=>({id:r.id,...z})))},null,2));
if(changedProtected.length||changedLater.length||out.issues.length)process.exitCode=1;
