import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const ck=await initSkiaNode(),root='Reports/EnvironmentKitV1';
 const font=loadLabelFont(ck,22),ink=new ck.Paint();ink.setColor(ck.parseColorString('#dce6ee'));ink.setAntiAlias(true);if(!font)throw Error('Font unavailable');
 for(const id of ['01-01','01-05','01-08','01-10','02-01','02-03','02-05']){
  const chapter=id.slice(0,2),before=`${root}/before/${chapter}/${id}-Debug-OFF.png`,after=`${root}/after/${chapter}/${id}-Debug-OFF.png`;
  if(!fs.existsSync(before)||!fs.existsSync(after))continue;
  const a=ck.MakeImageFromEncoded(fs.readFileSync(before)),b=ck.MakeImageFromEncoded(fs.readFileSync(after));if(!a||!b)throw Error('Snapshot decodefailed');
  const cellW=Math.max(a.width(),b.width()),cellH=Math.max(a.height(),b.height());
  const board=ck.MakeSurface(cellW*2,cellH+65);if(!board)throw Error('Surface unavailable');
  const c=board.getCanvas();c.clear(ck.parseColorString('#08131e'));c.drawText(`${id} BEFORE / AFTER | 1 WORLD UNIT = 1 PIXEL`,24,32,ink,font);
  c.drawImage(a,0,65);c.drawImage(b,cellW,65);board.flush();const shot=board.makeImageSnapshot();
  fs.writeFileSync(`${root}/${id}-BeforeAfter.png`,shot.encodeToBytes()!);shot.delete();board.delete();a.delete();b.delete();
 }
 const pair=['01-05','02-03'].map(id=>ck.MakeImageFromEncoded(fs.readFileSync(`${root}/after/${id.slice(0,2)}/${id}-Gameplay-${id.startsWith('02')?'Identity':'Approach'}.png`)));
 if(pair.every(Boolean)){
  const surface=ck.MakeSurface(800,865)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));c.drawText('MUSEUM / GALLERY | SAME GAME CAMERA SCALE',14,35,ink,font);
  c.drawImage(pair[0]!,0,65);c.drawImage(pair[1]!,400,65);surface.flush();const shot=surface.makeImageSnapshot();
  fs.writeFileSync(`${root}/Chapter-01-vs-02-Gameplay.png`,shot.encodeToBytes()!);shot.delete();surface.delete();pair.forEach(p=>p?.delete());
 }
 font.delete();ink.delete();
}
void main();
