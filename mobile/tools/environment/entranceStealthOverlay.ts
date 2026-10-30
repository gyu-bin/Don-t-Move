/** QA annotation over an actual renderer capture. Never loaded by the game. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
import defs from '../../src/game/levels/stages/campaignStages.json';
import {ENTRANCE_HIDE_PROBES} from '../campaign/v13EntranceStealth';

async function main(){
 const ck=await initSkiaNode(),root=process.argv[2]??'Reports/MuseumCover';
 const image=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/after/map.png`))!;
 const surface=ck.MakeSurface(image.width(),image.height()+170)!,c=surface.getCanvas();
 c.clear(ck.parseColorString('#09131c'));
 const font=loadLabelFont(ck,16)!,small=loadLabelFont(ck,13)!;
 const paint=(color:string)=>{const p=new ck.Paint();p.setAntiAlias(true);p.setColor(ck.parseColorString(color));return p;};
 const text=paint('#ebe9df');
 c.drawText('MUSEUM 01-01 | COVER / CROSSING / PATROL',16,28,text,font);
 c.drawText('Green: Safe   Amber: Risk   Cyan: Service escape',16,51,text,small);
 c.drawText('H: hidden waiting place   P: inspection post (2 guards, not 4)',16,72,text,small);
 c.save();c.translate(0,88);c.drawImage(image,0,0);
 const def=defs[0],xy=(p:{x:number;y:number})=>({x:p.x*40,y:p.y*40+40});
 for(const [route,color] of [[def.testRoutes[0],'#4fe2abbb'],[def.testRoutes[1],'#ffb24cbb'],[def.escapeRoutes[1],'#50c9ff88']] as const){
  const line=new ck.PathBuilder();route.points.forEach((p,i)=>{const q=xy(p);if(!i)line.moveTo(q.x,q.y);else line.lineTo(q.x,q.y);});
  const pen=paint(color);pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(2.5);const path=line.detach();c.drawPath(path,pen);path.delete();pen.delete();line.delete();
 }
 const marker=(label:string,q:{x:number;y:number},color:string)=>{
  const {x,y}=xy(q),pen=paint(color),bg=paint('#09131cdd');c.drawCircle(x,y,5,pen);
  c.drawRect(ck.XYWHRect(x+7,y-20,label.length*8+9,21),bg);c.drawText(label,x+11,y-5,pen,small);pen.delete();bg.delete();
 };
 ENTRANCE_HIDE_PROBES.forEach((p,i)=>{marker(`H${i+1}`,p.hidden,'#7bffbc');marker(`P${i+1}`,p.post,'#ff9c69');});
 c.restore();
 c.drawText('H1 Desk  /  H2 Column  /  H3 Display case  /  H4 Exhibition partition',16,image.height()+111,text,small);
 c.drawText('Actual LOS/body tests: hidden 0/3 visible samples; adjacent peeks visible.',16,image.height()+135,text,small);
 c.drawText('Offline review overlay. Not a device playtest or in-game UI.',16,image.height()+158,text,small);
 const result=surface.makeImageSnapshot();fs.writeFileSync(`${root}/cover-routes.png`,result.encodeToBytes()!);
 result.delete();image.delete();surface.delete();text.delete();font.delete();small.delete();
}
void main();
