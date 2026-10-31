/** Annotated offline game-renderer captures; not in-game UI or device evidence. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
import defs from '../../src/game/levels/stages/campaignStages.json';
import {COVER_CHECKPOINTS} from '../campaign/v13CoverCheckpoints';

async function main(){
 const ck=await initSkiaNode(),root=process.argv[2]??'Reports/CampaignCover';
 const ids=['01-02','02-05','03-05','04-02','05-05','06-04','07-02','08-05','09-03'];
 const surface=ck.MakeSurface(1200,1500)!,c=surface.getCanvas();c.clear(ck.parseColorString('#09131c'));
 const font=loadLabelFont(ck,20)!,small=loadLabelFont(ck,13)!;
 const paint=(color:string)=>{const p=new ck.Paint();p.setAntiAlias(true);p.setColor(ck.parseColorString(color));return p;};
 const text=paint('#eeeee4'),green=paint('#56efba'),cyan=paint('#55caff'),amber=paint('#ffb45d');
 c.drawText('CAMPAIGN | COVER + INSPECTION',20,30,text,font);
 c.drawText('Green = hidden / Cyan = exposed crossing / Amber = inspection post',20,54,text,small);
 c.drawText('9 chapter examples. Actual game renderer + review overlay; not iPhone captures.',20,76,text,small);
 for(let i=0;i<ids.length;i++){
  const id=ids[i],def=defs.find(d=>d.id===id)!,x=14+(i%3)*397,y=104+Math.floor(i/3)*450;
  const img=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/${id}/after/map.png`))!,scale=Math.min(376/img.width(),354/img.height());
  c.drawText(`${id}  ${def.title}`,x,y,text,small);
  const dx=x+(376-img.width()*scale)/2,dy=y+16;
  c.save();c.translate(dx,dy);c.scale(scale,scale);c.drawImage(img,0,0);c.restore();
  for(const [j,p] of COVER_CHECKPOINTS[id].entries()){
   const mark=(q:{x:number;y:number},ink:InstanceType<typeof ck.Paint>)=>c.drawCircle(dx+q.x*40*scale,dy+(q.y*40+40)*scale,4,ink);
   mark(p.hidden,green);mark(p.exposed,cyan);mark(p.post,amber);
   c.drawText(`${j+1}. ${p.structure}`,x,y+390+j*16,text,small);
  }
  img.delete();
 }
 c.drawText('No new effects. Existing collision/LOS rules. Guard speed and chapter security retained.',20,1490,text,small);
 const image=surface.makeImageSnapshot();fs.writeFileSync(`${root}/chapter-cover-review.png`,image.encodeToBytes()!);
 image.delete();surface.delete();for(const p of [text,green,cyan,amber])p.delete();font.delete();small.delete();
}
void main();
