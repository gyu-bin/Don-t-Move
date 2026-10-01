/** Offline visual audit. Counts projected production sprite bounds in captured camera views,
 * not geometry counts, visibility/occlusion proof, native FPS, or mission difficulty PASS. */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
require.extensions['.png']=m=>{m.exports=0;};
const {PROP_KIT}=require('../../src/game/world/propKit');
const {DRESSING_KIT}=require('../../src/game/world/dressingKit');
const {ENVIRONMENT_ASSETS,environmentAssetForProp}=require('../../src/assets/environmentKit');
const {ASSET_MANIFEST}=require('../../src/assets/manifest');
const root=process.env.AUDIT_ROOT??'Reports/ChaptersFinalAuditV1/before';
const stages:StageDefinition[]=JSON.parse(fs.readFileSync(path.join(root,'campaignStages.json'),'utf8'));
const assets=new Map(ENVIRONMENT_ASSETS.map((a:{id:string})=>[a.id,a]));
const replacement:Record<string,string>={display_low:'museum_display_low',display_glass_small:'museum_display_low',pedestal_small:'museum_pedestal',pedestal_medium:'museum_pedestal',rope_barrier:'museum_rope_barrier'};
const proxy:Record<string,string>={counter:'displayCase',table:'bench',shelf:'crate',partition:'painting',equipment:'displayCase',sofa:'bench',objectiveCase:'displayCase'};
type Box={id:string;x:number;y:number;w:number;h:number;role:'Major'|'Medium'|'Small';asset?:string};
function projected(id:string,asset:string|undefined,kind:string,x:number,y:number,width:number,height:number):Box{
 const spec=asset?assets.get(asset) as {objectBounds:{w:number;h:number};pivot:{x:number;y:number}}|undefined:undefined;
 const legacy=ASSET_MANIFEST.environment.museum?.frames[kind]??ASSET_MANIFEST.environment.museum?.frames[proxy[kind]];
 const ratio=spec?spec.objectBounds.h/spec.objectBounds.w:legacy?legacy.h/legacy.w:height/width;
 const h=width*ratio,ax=spec?.pivot.x??.5,ay=spec?.pivot.y??.97;
 // Larger than a head/placard: the stricter threshold excludes tiny busts/plinths.
 const role=((width>=52&&h>=32)||(width>=28&&h>=64))?'Major':width>=24&&h>=16?'Medium':'Small';
 return {id,asset,x:x-width*ax,y:y-h*ay,w:width,h,role};
}
const results=[];
for(const d of stages.filter(d=>d.chapter===1||d.chapter===2)){
 const boxes:Box[]=d.props.filter(p=>!['painting','door','galleryGlassPanel','galleryGlassPanelVertical'].includes(p.kind)).map((p,i)=>{const s=PROP_KIT[p.kind],w=s.drawWidth*40*(p.scale??1);return projected(`prop-${i}`,environmentAssetForProp(d,p),p.kind,p.x*40,p.y*40-s.mountHeight,w,w);});
 for(const cluster of d.dressing??[])for(const [i,item] of cluster.items.entries()){
  const s=DRESSING_KIT[item.kind];if(s.category!=='soft'||s.floorDetail)continue;
  const asset=item.visualAssetId??(d.chapter===1?replacement[item.kind]:undefined),scale=item.scale??1;
  boxes.push(projected(`${cluster.id}/${i}`,asset,item.kind,item.x*40,item.y*40-s.mountHeight,s.drawWidth*40*scale,s.drawHeight*40*scale));
 }
 const metadata=JSON.parse(fs.readFileSync(path.join(root,String(d.chapter).padStart(2,'0'),'gameplay-preview.json'),'utf8'));
 const objectiveMetadata=path.join(root,String(d.chapter).padStart(2,'0'),'objective/gameplay-preview.json');
 if(fs.existsSync(objectiveMetadata))metadata.captures.push(...JSON.parse(fs.readFileSync(objectiveMetadata,'utf8')).captures.filter((v:{file?:string})=>v.file?.includes('Objective-Focus')).map((v:{file:string})=>({...v,file:'objective/'+v.file,phase:'ObjectiveFocus'})));
 const centralMetadata=path.join(root,String(d.chapter).padStart(2,'0'),'centralcourt/gameplay-preview.json');
 if(fs.existsSync(centralMetadata))metadata.captures.push(...JSON.parse(fs.readFileSync(centralMetadata,'utf8')).captures.filter((v:{file?:string})=>v.file?.includes('CentralCourt-Focus')).map((v:{file:string})=>({...v,file:'centralcourt/'+v.file,phase:'CentralCourtFocus'})));
 const views=metadata.captures.filter((v:{missionId:string;camera?:unknown})=>v.missionId===d.id&&v.camera).map((v:{file:string;camera:{x:number;y:number};zoom:number;phase:string})=>{
  const viewport={x:v.camera.x,y:v.camera.y,w:400/v.zoom,h:800/v.zoom};
  const visible=boxes.filter(b=>{const w=Math.max(0,Math.min(b.x+b.w,viewport.x+viewport.w)-Math.max(b.x,viewport.x));const h=Math.max(0,Math.min(b.y+b.h,viewport.y+viewport.h)-Math.max(b.y,viewport.y));return w*h/(b.w*b.h)>=.5;});
  return {file:v.file,phase:v.phase,camera:v.camera,MajorVisibleCount:visible.filter(b=>b.role==='Major').length,MediumVisibleCount:visible.filter(b=>b.role==='Medium').length,excludedSmallCount:visible.filter(b=>b.role==='Small').length,visible:visible.filter(b=>b.role!=='Small')};
 });
 results.push({missionId:d.id,title:d.title,landmark:d.landmark?.name??null,views,majorRange:[Math.min(...views.map((v:{MajorVisibleCount:number})=>v.MajorVisibleCount)),Math.max(...views.map((v:{MajorVisibleCount:number})=>v.MajorVisibleCount))],mediumRange:[Math.min(...views.map((v:{MediumVisibleCount:number})=>v.MediumVisibleCount)),Math.max(...views.map((v:{MediumVisibleCount:number})=>v.MediumVisibleCount))]});
}
fs.writeFileSync(path.join(root,'viewport-presence.json'),JSON.stringify({method:'Actual400x800 renderer captured Entry, static StructureFocus and ObjectiveFocus cameras; extra02-06 same-coordinate CentralCourtFocus. Sprite objectBounds/anchor same as production; >=50% projected area inside viewport. Major width>=52worldpx AND height>=32, or width>=28 AND height>=64; Medium width>=24 AND height>=16; no walls/tiny decoration/glass counts. Bounds count does NOT subtract painter occlusion; screenshot review remains required. Sampled camera counts, not all-frame minimum.',missions:results},null,2)+'\n');
console.log(results.map(r=>({id:r.missionId,major:r.majorRange,medium:r.mediumRange})));
