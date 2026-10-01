/** Runtime-sized catalog inspection, not a packaged asset sheet or approval. */
import fs from 'node:fs';
import type {CanvasKit} from 'canvaskit-wasm';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
import type {EnvironmentManifest,EnvironmentAsset} from './contract';
type Bounds={x:number;y:number;w:number;h:number};
async function main(){
 const ck:CanvasKit=await initSkiaNode();
 const catalog:EnvironmentManifest=JSON.parse(fs.readFileSync('assets/environment/environment-assets.json','utf8'));
 const grayscale=process.env.GRAYSCALE==='1',zoom=Number(process.env.PREVIEW_ZOOM??1.064),width=1000,height=920;
 const surface=ck.MakeSurface(width,height);if(!surface)throw Error('Surface unavailable');
 const c=surface.getCanvas();c.clear(ck.parseColorString('#09131e'));
 const font=loadLabelFont(ck,14),title=loadLabelFont(ck,23);if(!font||!title)throw Error('Font unavailable');
 const ink=new ck.Paint();ink.setColor(ck.parseColorString('#dce6ee'));ink.setAntiAlias(true);
 const imagePaint=new ck.Paint();imagePaint.setAntiAlias(true);
 const filter=grayscale?ck.ColorFilter.MakeMatrix([.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,0,0,0,1,0]):null;
 if(filter)imagePaint.setColorFilter(filter);
 c.drawText('MUSEUM / ART GALLERY | SAME 40-UNIT TILE SCALE',24,36,ink,title);
 c.drawText(`Actual PNG bounds / runtime drawWidth, ${zoom.toFixed(3)} screen px per world unit; style review pending.`,24,60,ink,font);
 for(const [chapter,col]of [['museum',0],['gallery',1]]as const){
  const left=24+col*500;c.drawText(chapter.toUpperCase(),left,94,ink,title);
  const assets=catalog.assets.filter(a=>a.chapter===chapter);
  for(let i=0;i<assets.length;i++){
   const a=assets[i]as EnvironmentAsset&{objectBounds?:Bounds};
   const x=left+110+(i%2)*225,y=232+Math.floor(i/2)*122;
   c.drawText(a.id.replace(chapter+'_',''),left+(i%2)*225,y+26,ink,font);
   c.drawText(`${a.category} ${a.losBehavior}`,left+(i%2)*225,y+44,ink,font);
   if(!fs.existsSync(a.path)){c.drawText('MISSING PNG',x-60,y,ink,font);continue;}
   const image=ck.MakeImageFromEncoded(fs.readFileSync(a.path));if(!image)throw Error(`PNGdecode ${a.id}`);
   const b=a.objectBounds??{x:0,y:0,w:image.width(),h:image.height()},w=a.drawWidth*40*a.defaultScale*zoom,h=w*b.h/b.w;
   c.drawImageRect(image,ck.XYWHRect(b.x,b.y,b.w,b.h),ck.XYWHRect(x-w*a.pivot.x,y-h*a.pivot.y,w,h),imagePaint);image.delete();
  }
  for(const [who,offset]of [['player',0],['guard',1]]as const){
   const image=ck.MakeImageFromEncoded(fs.readFileSync(`assets/characters/${who}_idle.png`));if(!image)throw Error('Characterdecode');
   // Current atlas128x128, groundpivot64,112; locoScale exact from runtimeconst.
   const {locoScale}=await import('../../src/game/core/locomotionAtlas');
   const unit=locoScale(who)*zoom;
   c.drawImageRect(image,ck.XYWHRect(0,0,128,128),ck.XYWHRect(left+100+offset*230-64*unit,875-112*unit,128*unit,128*unit),imagePaint);
   c.drawText(who.toUpperCase(),left+70+offset*230,900,ink,font);image.delete();
  }
 }
 surface.flush();const shot=surface.makeImageSnapshot();fs.mkdirSync('Reports/EnvironmentKitV1',{recursive:true});
 const file=`Reports/EnvironmentKitV1/Chapter-01-vs-02-${grayscale?'Grayscale':'Color'}-${zoom===1.064?'GameplayScale':'Enlarged'}.png`;
 fs.writeFileSync(file,shot.encodeToBytes()!);console.log(file);shot.delete();surface.delete();font.delete();title.delete();ink.delete();imagePaint.delete();filter?.delete();
}
void main();
