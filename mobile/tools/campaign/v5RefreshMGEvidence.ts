/** Re-run only changed mission witnesses against final bytes; never relabel old evidence. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditV5MG} from './v5MuseumGalleryQA';
import {describeV5MuseumGallery} from './v5MuseumGallery';
import {findWitness,playthrough} from './museumPlaythrough';
import {playV5MG,type V5MGScenario} from './v5MuseumGalleryReplay';
const ids=process.argv.slice(2);if(!ids.length)throw Error('Explicit changed mission IDs are required');
const defs=JSON.parse(readFileSync('Reports/LevelDesignV5/mg-candidate.json','utf8'))as StageDefinition[];
const q=JSON.parse(readFileSync('Reports/LevelDesignV5/museum-gallery-gameplay.json','utf8'));
const t=JSON.parse(readFileSync('Reports/LevelDesignV5/mg-transition-witnesses.json','utf8'));
q.designs=defs.map(describeV5MuseumGallery);
for(const id of ids){const def=defs.find(d=>d.id===id)!;if(!def)throw Error(id);const sourceSha256=createHash('sha256').update(JSON.stringify(def)).digest('hex');q.audit=q.audit.map((a:{id:string})=>a.id===id?auditV5MG(def):a);q.replays=q.replays.map((r:{id:string})=>r.id===id?{id,sourceSha256,geometry:playthrough(def,0,2,0,true),routes:[0,1,2].map(routeIndex=>({routeIndex,...findWitness(def,routeIndex)}))}:r);const row=t.missions.find((r:{id:string})=>r.id===id);row.theft=playV5MG(def,row.theft as V5MGScenario);row.spotted=playV5MG(def,row.spotted as V5MGScenario);row.theftFound=row.theft.clear&&row.theft.theftAt!==null;row.spottedLOSFound=row.spotted.spottedAt!==null&&row.spotted.losBreakAt!==null;row.sourceSha256=sourceSha256;row.attempts+=2;console.log({id,sourceSha256,theft:row.theftFound,spottedLOS:row.spottedLOSFound});}
writeFileSync('Reports/LevelDesignV5/museum-gallery-gameplay.json',JSON.stringify(q,null,2));writeFileSync('Reports/LevelDesignV5/mg-transition-witnesses.json',JSON.stringify(t,null,2));
