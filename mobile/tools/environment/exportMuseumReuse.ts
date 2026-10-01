/** Export four genuine existing game atlas assets, never the reference board. */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../sprites/skiaNode';
import {pixelDiagnostics} from './contract';
async function main(){
  const ck=await initSkiaNode();const source='assets/museum/museum_atlas.png';
  const image=ck.MakeImageFromEncoded(fs.readFileSync(source));if(!image)throw Error('Atlas decode failed');
  const definitions=[
    {id:'museum_display_case_large',category:'major',x:378,y:375,w:202,h:230,size:512},
    {id:'museum_statue_large',category:'major',x:96,y:352,w:145,h:259,size:512},
    {id:'museum_pedestal',category:'soft',x:1027,y:99,w:148,h:182,size:384},
    {id:'museum_painting',category:'decoration',x:60,y:693,w:225,h:178,size:256},
  ];
  const metadata=[];
  for(const d of definitions){
    const s=ck.MakeSurface(d.size,d.size);if(!s)throw Error('Surface allocation failed');
    const scale=Math.min(d.size*.94/d.w,d.size*.94/d.h);
    const w=d.w*scale,h=d.h*scale,x=(d.size-w)/2,y=d.size*.97-h;
    const paint=new ck.Paint();paint.setAntiAlias(true);
    const canvas=s.getCanvas();canvas.clear(ck.TRANSPARENT);
    canvas.drawImageRect(image,ck.XYWHRect(d.x,d.y,d.w,d.h),ck.XYWHRect(x,y,w,h),paint);
    s.flush();const snapshot=s.makeImageSnapshot();
    const file=`assets/environment/museum/${d.category}/${d.id}.png`;
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,snapshot.encodeToBytes()!);
    const data=snapshot.readPixels(0,0,{width:d.size,height:d.size,colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB}) as Uint8Array;
    metadata.push({id:d.id,path:file,resolution:{width:d.size,height:d.size},pivot:{x:.5,y:.97,units:'normalized'},objectBounds:pixelDiagnostics(data,d.size,d.size).bounds,source:{kind:'EXISTING_GAME_ATLAS_REUSE',path:source,rect:{x:d.x,y:d.y,w:d.w,h:d.h}},contentWidthFraction:w/d.size,contentHeightFraction:h/d.size});
    snapshot.delete();s.delete();paint.delete();
  }
  image.delete();fs.mkdirSync('Reports/EnvironmentKitV1',{recursive:true});
  fs.writeFileSync('Reports/EnvironmentKitV1/museum-reuse-metadata.json',JSON.stringify(metadata,null,2)+'\n');console.log(metadata);
}
void main();
