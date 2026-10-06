/** Authoring aid: one empty room per venue with every solid prop of that venue at scale 1, for the offline renderer. */
import fs from 'node:fs';
import live from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition,PropDef} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
const defs=live as unknown as StageDefinition[],out:StageDefinition[]=[];
for(const [prefix,id] of [['bank','03-01'],['lab','04-01'],['casino','05-01']] as const){
 const base=defs.find(d=>d.id===id)!,kinds=(Object.keys(PROP_KIT) as PropDef['kind'][]).filter(k=>k.startsWith(prefix));
 const cols=34,rows=Math.ceil(kinds.length/6)*6+3,layout=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>y===0||x===0||y===rows-1||x===cols-1?'#':'.').join(''));
 const props:PropDef[]=kinds.map((kind,i)=>({kind,visualAssetId:(({labServerRack:'lab_server_rack_front',labSampleFridge:'lab_sample_fridge_front',labGlassPartition:'lab_glass_partition_front',labSpecimenTank:'lab_specimen_tank_low'} as Record<string,string>)[kind]??kind.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())) as PropDef['visualAssetId'],x:3.5+(i%6)*5.2,y:5.5+Math.floor(i/6)*6,scale:1,collisionScale:1}));
 console.log(prefix,kinds.map((k,i)=>`${i%6},${Math.floor(i/6)}:${k}`).join(' '));
 out.push({...base,layout,props,dressing:[],carpets:[],lights:[],guards:[],patrolRoutes:[],cameras:[],doors:[],lockdownDoors:[],securityZones:[],patrolPlan:undefined,topologyPlan:undefined,functionalZones:[],testRoutes:[],escapeRoutes:[],safeZones:[],
  playerSpawn:{x:1.6,y:2,facing:0},entryPosition:undefined,entryEdge:undefined,exitPosition:undefined,exitEdge:undefined,exit:{x:31,y:1.2,w:1.2,h:1.2},objective:{...base.objective!,x:32,y:rows-2},objectiveZone:undefined,landmark:undefined} as unknown as StageDefinition);
}
fs.writeFileSync('Reports/V13Phase2/sheets/sheet.json',JSON.stringify(out));
