import {readFileSync,writeFileSync} from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {auditHideability} from './museumHideabilityQA';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';

async function main(){
 const ck=await initSkiaNode(),root=process.env.REPORT_ROOT??'Reports/MuseumFinalDesignV2';
 const before:StageDefinition[]=JSON.parse(readFileSync(`${root}/before/campaignStages.json`,'utf8'));
 const font=loadLabelFont(ck,17)!,title=loadLabelFont(ck,23)!;const pen=new ck.Paint();pen.setColor(ck.parseColorString('#e6eff8'));pen.setAntiAlias(true);
 for(const id of (process.env.MISSIONS??'01-05,01-08').split(',')){
  const def=campaignStages.find(d=>d.id===id)!,cols=Math.max(...def.layout.map(r=>r.length));
  const w=cols*40+48,h=def.layout.length*40+120;
  for(const variant of ['Routes-Guards','Debug-OFF']){
   const surface=ck.MakeSurface(w*2,h+150)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
   c.drawText(`${id} | BEFORE / AFTER | identical scale and camera`,20,32,pen,title);
   c.drawText('Offline actual game renderer. Geometry/design comparison; not a device play test.',20,59,pen,font);
   for(const [index,version] of ['before','after'].entries()){
    const im=ck.MakeImageFromEncoded(readFileSync(`${root}/${version}/${id}-${variant}.png`))!;
    c.drawImageRect(im,ck.XYWHRect(0,0,w,h),ck.XYWHRect(index*w,78,w,h),pen);im.delete();
    const qa=auditHideability(version==='before'?before.find(d=>d.id===id)!:def);
    c.drawText(`${version.toUpperCase()} | Hide witnesses ${qa.hidePoints} | Escape pockets ${qa.escapePockets}`,index*w+20,h+109,pen,font);
    c.drawText(`Full-cover props ${qa.fullCover} | LOS-breaker props ${qa.losBreakers}`,index*w+20,h+135,pen,font);
   }
   const snapshot=surface.makeImageSnapshot();writeFileSync(`${root}/${id}-BeforeAfter-${variant}.png`,snapshot.encodeToBytes()!);snapshot.delete();surface.delete();
  }
 }
 pen.delete();font.delete();title.delete();
}
void main();
