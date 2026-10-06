/** Authoring aid: whole-map checks the renders cannot show — camera coverage, guard presence per zone, sprites that hide a guard post. */
import live from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';
import {V13_MISSIONS} from './v13Build';
import {cameraView} from './v13QaLib';
const ids=process.argv.slice(2);
// Sprite height in tiles at scale 1, measured from the asset sheets (only the tall ones matter here).
const TALL:Record<string,number>={labCryoUnit:2.9,labCryoChamber:3.7,labEquipmentRack:3.4,labSampleStorage:3,labPrototypeMachine:3.25,labCentralExperiment:3.2,labObservationRoom:2.6,labWall:1.7,bankWall:1.7,bankDepositBoxWall:1.9,bankVaultCorridorWall:1.7,bankMainVault:3.3,bankVaultDoor:2.4,bankSecurityCheckpoint:2,bankSecurityGate:2.4,bankFilingCabinet:1.6};
for(const m of V13_MISSIONS.filter(m=>ids.length?ids.includes(m.id):m.id>='03')){
 const def=(live as unknown as StageDefinition[]).find(d=>d.id===m.id)!,stage=compileStage(def),plan=def.topologyPlan!,notes:string[]=[];
 const zoneOf=(x:number,y:number)=>plan.rooms.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)?.id??'?';
 // Cameras: share of the cone (range × half-angle incl. sweep) that is actually visible, and the nearest blocker straight ahead.
 for(const c of stage.cameras??[]){
  const {share,ahead}=cameraView(stage,c);
  notes.push(`camera ${zoneOf(c.x/TILE,c.y/TILE)} @${(c.x/TILE).toFixed(1)},${(c.y/TILE).toFixed(1)}: sees ${share}% of its floor, clear ahead ${(ahead/TILE).toFixed(1)} of ${(c.range/TILE).toFixed(1)} tiles`);
 }
 // Zones on a declared route with no guard stop and no camera.
 const watched=new Set<string>();for(const r of def.patrolRoutes)for(const p of r.points)watched.add(zoneOf(p.x,p.y));for(const c of stage.cameras??[])watched.add(zoneOf(c.x/TILE,c.y/TILE));
 const onRoute=[...new Set([...m.approach,...m.risk,...m.quickEscape,...m.alternateEscape])];
 notes.push(`guards ${def.guards.length}: ${def.guards.map(g=>`${g.role}@${zoneOf(g.x,g.y)}`).join(', ')}`);
 const empty=onRoute.filter(z=>!watched.has(z));if(empty.length)notes.push(`route zones with no guard stop or camera: ${empty.join(', ')}`);
 // Guard posts hidden behind a tall sprite (post is north of the prop base and inside the sprite's box).
 for(const r of def.patrolRoutes)for(const p of r.points.filter(p=>(p.wait??0)>0))for(const s of def.props){const tall=TALL[s.kind];if(!tall)continue;const k=PROP_KIT[s.kind],sc=s.scale??1,w=k.drawWidth*sc/2,h=tall*sc;
  if(Math.abs(p.x-s.x)<w&&p.y<s.y-k.footprint.h*sc&&p.y>s.y-h+.6)notes.push(`guard post ${r.id} @${p.x},${p.y} stands behind ${s.visualAssetId??s.kind} @${s.x},${s.y}`);}
 // Tall sprites that rise above the top of the map or over the floor of the room above.
 for(const s of def.props){const tall=TALL[s.kind];if(!tall||PROP_KIT[s.kind].wallMounted)continue;const sc=s.scale??1,top=s.y-tall*sc;
  if(top<-.15)notes.push(`${s.visualAssetId??s.kind} @${s.x},${s.y} rises ${(-top).toFixed(1)} tile above the map`);
  else{const k=PROP_KIT[s.kind],ft=s.y-k.footprint.h*sc;for(let y=Math.floor(ft)-1;y>=Math.max(0,Math.floor(top+.35));y--){const row=def.layout[y]??'';const cell=row[Math.floor(s.x)];const below=def.layout[y+1]?.[Math.floor(s.x)];if(cell==='.'&&below==='#'){notes.push(`${s.visualAssetId??s.kind} @${s.x},${s.y} covers floor of the room above (row ${y})`);break;}}}
 }
 // Structures by kind, to see repetition.
 const kinds=new Map<string,number>();for(const s of def.props){const k=(s.visualAssetId??s.kind).replace(/^(bank|lab)_/,'');kinds.set(k,(kinds.get(k)??0)+1);}
 notes.push(`props ${def.props.length}: ${[...kinds].sort((a,b)=>b[1]-a[1]).map(([k,n])=>n>1?`${k}×${n}`:k).join(', ')}`);
 console.log(`\n${m.id} ${m.title}`);for(const n of notes)console.log('  - '+n);
}
