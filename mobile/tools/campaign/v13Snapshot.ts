/**
 * Runtime gameplay snapshot of every mission (Phase 8). For each mission it records the baked stage definition and
 * what the game compiles from it — wall grid, collision and sight boxes, props with the kit entry and the picture
 * each resolves to, guards, cameras, doors, spawn, prize, exit — in a canonical form (object keys sorted, array
 * order kept), and a SHA-256 of that. A refactor that is behaviour-preserving leaves all 45 hashes unchanged.
 *
 *   node --import tsx tools/campaign/v13Snapshot.ts write <dir> [<campaign.json>]   write snapshots and hashes
 *   node --import tsx tools/campaign/v13Snapshot.ts compare <dirA> <dirB>           SAME / DIFF per mission
 *   node --import tsx tools/campaign/v13Snapshot.ts check <hashes.json>             the live campaign against frozen hashes
 *
 * `npm run campaign:snapshot` runs `check` against docs/design/v13/PHASE8_SNAPSHOT_HASHES.json, the tracked copy of the
 * Phase 8 baseline. After an intended map change, look at the DIFF list, then refresh that file from a `write`.
 */
import fs from 'node:fs';
import {createRequire} from 'node:module';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {canonical,sha256 as hash,loadCampaign,writeReport} from './v13QaLib';
const require_=createRequire(import.meta.url);require_.extensions['.png']=(module:{exports:unknown})=>{module.exports=0;};
export function missionSnapshot(def:StageDefinition){
 const {compileStage}=require_('../../src/game/world/compileStage'),{PROP_KIT}=require_('../../src/game/world/propKit'),{environmentAssetForProp}=require_('../../src/assets/environmentKit');
 const {MISSION_BRIEFS}=require_('../../src/game/levels/missionBriefs'),{CHAPTER_AREAS,CHAPTER_AREAS_KO}=require_('../../src/game/levels/chapterArt'),{CHAPTERS,missionIndex}=require_('../../src/game/levels/campaignCatalog');
 const stage=compileStage(def),{def:_def,...runtime}=stage,ch=def.chapter!-1,m=def.mission!-1;
 return canonical({id:def.id,definition:def,runtime:{...runtime,props:stage.props.map((p:{kind:string})=>({...p,picture:environmentAssetForProp(def,p)??null,kit:PROP_KIT[p.kind]}))},
  metadata:{brief:MISSION_BRIEFS[def.id]??null,area:CHAPTER_AREAS[ch]?.[m]??null,areaKo:CHAPTER_AREAS_KO[ch]?.[m]??null,chapterTheme:CHAPTERS[ch]?.theme??null,chapterName:CHAPTERS[ch]?.name??null,index:missionIndex(def.id)}});
}
if(process.argv[1]?.endsWith('v13Snapshot.ts')){
 const [cmd,a,b]=process.argv.slice(2);
 if(cmd==='write'){
  const defs=loadCampaign(b),snaps:Record<string,unknown>={},hashes:Record<string,string>={};
  for(const def of defs){snaps[def.id]=missionSnapshot(def);hashes[def.id]=hash(snaps[def.id]);}
  writeReport(`${a}/mission-snapshots.json`,JSON.stringify(snaps));writeReport(`${a}/hashes.json`,JSON.stringify(hashes,null,1)+'\n');
  console.log(`${defs.length} missions, campaign ${hash(hashes).slice(0,12)} → ${a}`);
 }else if(cmd==='compare'){
  const ha=JSON.parse(fs.readFileSync(`${a}/hashes.json`,'utf8')),hb=JSON.parse(fs.readFileSync(`${b}/hashes.json`,'utf8')),ids=[...new Set([...Object.keys(ha),...Object.keys(hb)])].sort();let diff=0;
  const first=(x:unknown,y:unknown,path:string):string|null=>{if(JSON.stringify(x)===JSON.stringify(y))return null;if(x&&y&&typeof x==='object'&&typeof y==='object'){for(const k of new Set([...Object.keys(x),...Object.keys(y)])){const r=first((x as never)[k],(y as never)[k],`${path}.${k}`);if(r)return r;}}return `${path}: ${JSON.stringify(x)?.slice(0,60)} → ${JSON.stringify(y)?.slice(0,60)}`;};
  let sa:Record<string,unknown>|null=null,sb:Record<string,unknown>|null=null;
  for(const id of ids){const same=ha[id]===hb[id];if(!same){diff++;sa??=JSON.parse(fs.readFileSync(`${a}/mission-snapshots.json`,'utf8'));sb??=JSON.parse(fs.readFileSync(`${b}/mission-snapshots.json`,'utf8'));}
   console.log(id,(ha[id]??'-').slice(0,12),(hb[id]??'-').slice(0,12),same?'SAME':'DIFF '+first(sa![id],sb![id],id));}
  console.log(`${ids.length-diff} / ${ids.length} SAME`);process.exitCode=diff?1:0;
 }else if(cmd==='check'){
  const frozen=JSON.parse(fs.readFileSync(a,'utf8')) as Record<string,string>,defs=loadCampaign(b);
  const now=Object.fromEntries(defs.map(def=>[def.id,hash(missionSnapshot(def))])),ids=[...new Set([...Object.keys(frozen),...Object.keys(now)])].sort(),diff=ids.filter(id=>frozen[id]!==now[id]);
  for(const id of diff)console.log(id,(frozen[id]??'-').slice(0,12),(now[id]??'-').slice(0,12),'DIFF');
  console.log(`${ids.length-diff.length} / ${ids.length} SAME`);process.exitCode=diff.length?1:0;
 }else{console.log('usage: v13Snapshot.ts write <dir> [<campaign.json>] | compare <dirA> <dirB> | check <hashes.json> [<campaign.json>]');process.exitCode=1;}
}
