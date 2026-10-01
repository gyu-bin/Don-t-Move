/** Idempotent packaging of exactly20 Museum/Gallery pilot assets. */
import fs from 'node:fs';
import path from 'node:path';
import {PROP_KIT} from '../../src/game/world/propKit';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import {normalizePng} from './normalizePng';
import type {EnvironmentAsset} from './contract';
type Kind=keyof typeof PROP_KIT;
const rows:[string,EnvironmentAsset['category'],Kind| 'rope_barrier'][]=[
 ['museum_column','ARCHITECTURE','pillar'],['museum_partition','ARCHITECTURE','partition'],
 ['museum_display_case_large','MAJOR','displayCase'],['museum_statue_large','MAJOR','statue'],['museum_security_desk','MAJOR','counter'],
 ['museum_display_low','SOFT','table'],['museum_pedestal','SOFT','statuePedestal'],
 ['museum_painting','DECORATION','painting'],['museum_rope_barrier','DECORATION','rope_barrier'],['museum_diamond_case','LANDMARK','objectiveCase'],
 ['gallery_white_wall','ARCHITECTURE','partition'],['gallery_movable_art_wall','ARCHITECTURE','partition'],
 ['gallery_sculpture_large','MAJOR','statue'],['gallery_installation_art','MAJOR','equipment'],['gallery_central_plinth','MAJOR','table'],
 ['gallery_low_pedestal','SOFT','statuePedestal'],['gallery_modern_bench','SOFT','bench'],
 ['gallery_abstract_frame','DECORATION','painting'],['gallery_track_light','DECORATION','lamp'],['gallery_masterpiece_wall','LANDMARK','partition'],
];
async function main(){
 const assets=[];
 const reuseFile='Reports/EnvironmentKitV1/museum-reuse-metadata.json';
 const reuse=fs.existsSync(reuseFile)?JSON.parse(fs.readFileSync(reuseFile,'utf8')):[];
 for(const [id,category,kind]of rows){
  const chapter=id.startsWith('museum_')?'museum':'gallery';
  const size=category==='LANDMARK'?768:category==='DECORATION'?256:category==='SOFT'?384:512;
  const file=`assets/environment/${chapter}/${category.toLowerCase()}/${id}.png`,source=`assets/environment/_source/${id}.png`;
  const spec=kind==='rope_barrier'?DRESSING_KIT.rope_barrier:PROP_KIT[kind];
  const reused=reuse.find((r:{id:string})=>r.id===id);
  if(!reused&&fs.existsSync(source)&&(!fs.existsSync(file)||fs.statSync(source).mtimeMs>fs.statSync(file).mtimeMs))await normalizePng(source,file,size);
  const sidecar=file.replace(/\.png$/,'.metadata.json');
  const metadata=reused??(fs.existsSync(sidecar)?JSON.parse(fs.readFileSync(sidecar,'utf8')):null);
  const bounds=metadata?.objectBounds;
  const blocksVision=spec.blocksVision;
  // Standalone rope retains the physical DRESSING_KIT contract. The renderer's
  // contained case attachment is explicitly nonsolid and creates no collider.
  const collision=kind==='rope_barrier'?true:category==='DECORATION'?false:spec.blocksMovement;
  const drawWidth=spec.drawWidth;
  assets.push({id,chapter,category,path:file,image:file,resolution:metadata?.resolution??{width:size,height:size},objectBounds:bounds,
   pivot:{x:.5,y:.97,units:'normalized'},footprint:collision?spec.footprint:{w:0,h:0},collision,
   losBehavior:blocksVision?(kind==='statue'||kind==='equipment'?'BREAKER':'BLOCK'):'PASS',
   defaultScale:1,drawWidth,drawHeight:bounds?drawWidth*bounds.h/bounds.w:drawWidth*1.3,
   status:fs.existsSync(file)?'NEEDS_REVIEW':'PENDING_PRODUCTION',source:reused?.source??{kind:'IMAGEGEN_INDEPENDENT_RUNTIME_CUTOUT',path:source},
   physicalKind:kind,...(kind==='rope_barrier'?{attachmentOverride:{collision:false,footprint:{w:0,h:0},losBehavior:'PASS',reason:'Visual-only attachment contained inside an existing case footprint. It does not instantiate a dressing item or collider.'}}:{}),review:{style:'USER_VISUAL_REVIEW_PENDING',native:'SIMULATOR_REVIEW_PENDING',productionApproved:false},
  });
 }
 const manifest={schemaVersion:1,units:{footprint:'tiles',tileWorldUnits:40},pilotCounts:{museum:10,gallery:10},assets};
 const dest='assets/environment/environment-assets.json';fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({manifest:dest,available:assets.filter(a=>a.status==='NEEDS_REVIEW').length,total:20}));
}
void main();
