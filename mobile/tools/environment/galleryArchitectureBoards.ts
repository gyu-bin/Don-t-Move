/** Same-world-scale review artifacts made from actual renderer captures.
 * No stage edits; no native/device or playability claim.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode(),root=process.env.REPORT_ROOT??'Reports/GalleryArchitectureV2';
 const baseline: {id:string;chapter:number}[]=JSON.parse(fs.readFileSync(`${root}/before/campaignStages.json`,'utf8'));
 const current: {id:string;chapter:number}[]=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8'));
 const preserved=baseline.filter(stage=>stage.chapter!==2).map(stage=>{
  const after=current.find(candidate=>candidate.id===stage.id);
  const beforeHash=createHash('sha256').update(JSON.stringify(stage)).digest('hex');
  const afterHash=after?createHash('sha256').update(JSON.stringify(after)).digest('hex'):null;
  assert.equal(afterHash,beforeHash,`${stage.id}: non-Gallery StageDefinition changed`);
  return {id:stage.id,chapter:stage.chapter,beforeHash,afterHash,unchanged:true};
 });
 assert.equal(current.filter(stage=>stage.chapter!==2).length,preserved.length,'Unexpected non-Gallery mission added');
 const beforeRender:{assets:{id:string;path:string;sha256:string}[]}=JSON.parse(fs.readFileSync(`${root}/before/render-metadata.json`,'utf8'));
 const assetPreservation=beforeRender.assets.map(asset=>{
  const afterHash=createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex');
  assert.equal(afterHash,asset.sha256,`${asset.id}: approved PNG changed during architecture-only pass`);
  return {id:asset.id,beforeHash:asset.sha256,afterHash,unchanged:true};
 });
 fs.writeFileSync(path.join(root,'preservation-check.json'),JSON.stringify({museum:preserved.filter(stage=>stage.chapter===1).length,otherChapters:preserved.filter(stage=>stage.chapter!==1).length,approvedPngs:assetPreservation.length,stages:preserved,assets:assetPreservation},null,2)+'\n');
 const font=loadLabelFont(ck,20),small=loadLabelFont(ck,15);
 if(!font||!small)throw Error('Review label font unavailable');
 const ink=new ck.Paint();ink.setColor(ck.parseColorString('#dae7ef'));ink.setAntiAlias(true);
 const imagePaint=new ck.Paint();
 const gray=ck.ColorFilter.MakeMatrix([.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,0,0,0,1,0]);
 const evidence:{file:string;sources:{path:string;sha256:string}[];worldUnitsPerPixel:number}[]=[];
 const load=(file:string)=>{const bytes=fs.readFileSync(file),image=ck.MakeImageFromEncoded(bytes);if(!image)throw Error(`Capture decode failed: ${file}`);return {file,bytes,image};};
 const save=(surface:NonNullable<ReturnType<typeof ck.MakeSurface>>,file:string,sources:{file:string;bytes:Buffer}[])=>{
  surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,file),shot.encodeToBytes()!);shot.delete();surface.delete();
  evidence.push({file,sources:sources.map(s=>({path:s.file,sha256:createHash('sha256').update(s.bytes).digest('hex')})),worldUnitsPerPixel:1});
 };
 for(const id of ['02-01','02-04','02-06','02-08','02-10']){
  const a=load(`${root}/before/${id}-Debug-OFF.png`),b=load(`${root}/after/02/${id}-Debug-OFF.png`);
  const w=Math.max(a.image.width(),b.image.width()),h=Math.max(a.image.height(),b.image.height());
  const surface=ck.MakeSurface(w*2,h+70);if(!surface)throw Error('Comparison surface unavailable');
  const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
  c.drawText(`${id} BEFORE / AFTER | SAME 1 WORLD UNIT = 1 PIXEL`,24,28,ink,font);
  c.drawText('Actual production renderer, Debug OFF. Offline CanvasKit; not native/device.',24,52,ink,small);
  c.drawImage(a.image,0,70);c.drawImage(b.image,w,70);save(surface,`${id}-BeforeAfter.png`,[a,b]);a.image.delete();b.image.delete();
 }
 const pairs=['02','05','08','10'].map(n=>[load(`${root}/after/01/01-${n}-Debug-OFF.png`),load(`${root}/after/02/02-${n}-Debug-OFF.png`)]);
 const cellW=Math.max(...pairs.flatMap(row=>row.map(x=>x.image.width()))),cellH=Math.max(...pairs.flatMap(row=>row.map(x=>x.image.height())));
 for(const grayscale of [false,true]){
  const surface=ck.MakeSurface(cellW*2,cellH*pairs.length+90);if(!surface)throw Error('Chapter board surface unavailable');
  const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));imagePaint.setColorFilter(grayscale?gray:null);
  c.drawText(`MUSEUM / ART GALLERY | ${grayscale?'GRAYSCALE SILHOUETTE':'COLOR'} | 1 WORLD UNIT = 1 PIXEL`,24,32,ink,font);
  c.drawText('01-02/02-02, 01-05/02-05, 01-08/02-08, 01-10/02-10. Offline actual renderer; not native.',24,58,ink,small);
  for(let row=0;row<pairs.length;row++)for(let col=0;col<2;col++)c.drawImage(pairs[row][col].image,col*cellW,90+row*cellH,imagePaint);
  save(surface,`Museum-vs-Gallery-${grayscale?'Grayscale':'Color'}.png`,pairs.flat());
 }
 pairs.flat().forEach(s=>s.image.delete());
 const overview=Array.from({length:10},(_,i)=>load(`${root}/after/02/02-${String(i+1).padStart(2,'0')}-Debug-OFF.png`));
 const w=Math.max(...overview.map(s=>s.image.width())),h=Math.max(...overview.map(s=>s.image.height()));
 const surface=ck.MakeSurface(w*5,h*2+80);if(!surface)throw Error('Overview surface unavailable');
 const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
 c.drawText('CHAPTER 02 ARCHITECTURE V2 | ALL 10 | DEBUG OFF | SAME WORLD SCALE',24,30,ink,font);
 c.drawText('Actual production PNGs and static renderer; camera is full-map overview, not native gameplay.',24,55,ink,small);
 overview.forEach((s,i)=>c.drawImage(s.image,(i%5)*w,80+Math.floor(i/5)*h));save(surface,'02-All10-Debug-OFF-Overview.png',overview);overview.forEach(s=>s.image.delete());
 fs.writeFileSync(path.join(root,'comparison-metadata.json'),JSON.stringify({method:'No resize: source snapshots retain 1 world unit per pixel. Grayscale uses luminance color filter only.',native:false,artifacts:evidence},null,2)+'\n');
 font.delete();small.delete();ink.delete();imagePaint.delete();gray.delete();
 console.log(`Saved ${evidence.length} comparison artifacts to ${root}`);
}
void main();
