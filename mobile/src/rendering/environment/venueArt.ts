import {Skia} from '@shopify/react-native-skia';
import type {SkCanvas} from '@shopify/react-native-skia';
import type {CompiledProp,CompiledStage} from '../../game/world/compileStage';
import {Cell,TILE} from '../../game/world/compileStage';
import {MATERIALS} from '../../game/levels/chapterArt';
import {fill,stroke} from '../paints';

// Static, theme-specific architectural drawing. Baked once, never on the UI frame.
const rect=(c:SkCanvas,x:number,y:number,w:number,h:number,color:string)=>c.drawRect(Skia.XYWHRect(x,y,w,h),fill(color));
const line=(c:SkCanvas,x:number,y:number,x2:number,y2:number,color:string,width=1)=>c.drawLine(x,y,x2,y2,stroke(color,width));
const oval=(c:SkCanvas,x:number,y:number,w:number,h:number,color:string)=>c.drawOval(Skia.XYWHRect(x,y,w,h),fill(color));
function box(c:SkCanvas,w:number,h:number,top:string,front:string,trim:string){
 rect(c,-w/2,-h,w,h,front);rect(c,-w/2,-h-7,w,9,top);
 line(c,-w/2,-h-7,w/2,-h-7,trim);line(c,w/2,-h-7,w/2,0,'#080e14',2);
 line(c,-w/2,0,w/2,0,'#0a1118',2);
}
function bolts(c:SkCanvas,w:number,h:number){for(const x of [-w/2+4,w/2-4])for(const y of [-h+4,-4])c.drawCircle(x,y,1.2,fill('#a1acb6'));}

export function drawVenueFloor(c:SkCanvas,s:CompiledStage){
 const theme=s.def.theme,m=MATERIALS[theme],variant=(s.def.mission??1)-1;
 for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++){
  if(s.grid[y*s.cols+x]!==Cell.Floor)continue;
  c.save();c.translate(x*TILE,y*TILE);rect(c,0,0,TILE,TILE,m.floor);
  if(theme==='mansion'){
   for(let i=0;i<4;i++){const yy=i*10;line(c,0,yy,40,yy,m.seam);line(c,(x%2?10:28),yy,(x%2?10:28),yy+10,m.seam);line(c,3,yy+4,33,yy+5,'#81614344');}
  }else if(theme==='casino'){
   for(let i=0;i<2;i++)for(let j=0;j<2;j++){const xx=i*20+10,yy=j*20+10;line(c,xx,yy-5,xx+5,yy,m.inlay);line(c,xx+5,yy,xx,yy+5,m.inlay);line(c,xx,yy+5,xx-5,yy,m.inlay);line(c,xx-5,yy,xx,yy-5,m.inlay);}
  }else if(theme==='warehouse'){
   line(c,0,0,40,0,m.seam);line(c,0,0,0,40,m.seam);
   for(let n=0;n<5;n++){const xx=(x*13+y*7+n*11)%39,yy=(y*17+x*3+n*7)%39;rect(c,xx,yy,1,1,'#87908430');}
  }else if(theme==='security'||theme==='vault'||theme==='blacksite'){
   rect(c,2,2,36,36,(x+y+variant)%3===0?m.inlay:m.floor);
   line(c,1,1,39,1,m.trim+'55');line(c,1,1,1,39,m.trim+'33');line(c,39,1,39,39,m.seam,2);line(c,1,39,39,39,m.seam,2);
   if(theme==='vault')for(const a of [5,35])for(const b of [5,35])c.drawCircle(a,b,0.8,fill('#9ca6b288'));
  }else if(theme==='lab'){
   line(c,0,0,40,0,m.seam,2);line(c,0,0,0,40,m.seam,2);
   if((x+y+variant)%4===0){rect(c,3,3,34,2,'#92c8d055');rect(c,3,5,2,30,'#92c8d022');}
  }else{
   const dark=(Math.floor(x/(variant%2+1))+Math.floor(y/(variant%2+1)))%2===0;
   if(dark)rect(c,0,0,40,40,m.inlay+'55');line(c,0,0,40,0,m.seam);line(c,0,0,0,40,m.seam);
   if(theme==='museum'||theme==='bank'){line(c,3,11,19,15,'#b3babb18');line(c,19,15,35,12,'#b3babb18');}
  }
  c.restore();
 }
 // A room medallion, not a debug/pathfinding line across the playfield.
 const {x,y}=s.objective;c.drawCircle(x,y,42,stroke(m.trim+'77',1.5));c.drawCircle(x,y,37,stroke(m.trim+'33',1));
 if(s.def.landmark){const p=s.def.landmark; c.drawOval(Skia.XYWHRect(p.x*TILE-29,p.y*TILE-12,58,27),stroke(m.trim+'99',1));}
}

export function drawVenueProp(c:SkCanvas,p:CompiledProp,s:CompiledStage):boolean{
 const t=s.def.theme,m=MATERIALS[t],kind=p.kind;
 const special=['counter','table','shelf','partition','equipment','sofa','objectiveCase','door'].includes(kind);
 if(!special)return false;
 c.save();c.translate(p.x,p.y);c.scale(p.scale,p.scale);
 if(kind==='door'){
  box(c,33,39,'#52616a','#192733',m.trim);rect(c,-13,-36,26,32,'#0a141e');line(c,0,-36,0,-4,m.trim);rect(c,8,-19,3,6,m.trim);
 }else if(kind==='counter'){
  box(c,56,25,t==='bank'?'#72817c':t==='casino'?'#715543':'#485966','#24313a',m.trim);
  for(let i=-20;i<23;i+=14)line(c,i,-19,i,-4,m.trim+'55');
  if(t==='bank'){rect(c,-20,-34,40,3,m.trim);for(let i=-18;i<20;i+=9)line(c,i,-34,i,-26,'#b1c6be');}
  else {rect(c,5,-36,18,12,'#122330');rect(c,7,-34,14,7,'#6cabb7');line(c,14,-24,14,-21,m.trim);}
 }else if(kind==='table'){
  rect(c,-21,-7,4,8,'#171d24');rect(c,18,-7,4,8,'#171d24');
  if(t==='casino'){
   oval(c,-27,-34,54,29,'#9c7b49');oval(c,-24,-32,48,24,'#183f3a');
   c.drawOval(Skia.XYWHRect(-20,-29,40,18),stroke('#bfac74',0.8));
   if((s.def.mission??1)%2===0){oval(c,-8,-29,17,17,'#b4986a');oval(c,-6,-27,13,13,'#23302f');for(let n=0;n<8;n++){const a=n*Math.PI/4;line(c,0,-21,Math.cos(a)*6,-21+Math.sin(a)*6,'#b2a57f');}}
   else{rect(c,-13,-26,7,10,'#d3cfb3');rect(c,-3,-24,7,10,'#ddd8c3');for(let i=0;i<3;i++)c.drawCircle(12+i*3,-21,2,fill('#b38a59'));}
  }else{
   box(c,47,22,t==='mansion'?'#816248':'#65808a',t==='mansion'?'#413127':'#34454f',m.trim);
   if(t==='lab'){rect(c,-17,-33,13,10,'#183441');rect(c,-14,-35,7,2,'#9acbd0');c.drawCircle(13,-27,4,fill('#62aeba'));}
   else {rect(c,-14,-32,17,8,'#b7a77f');line(c,-5,-31,-5,-25,'#6b5a43');}
  }
 }else if(kind==='shelf'){
  box(c,49,49,t==='mansion'?'#77604a':'#57636b',t==='mansion'?'#382b24':'#1b2934',m.trim);
  for(let row=0;row<3;row++){const y=-42+row*13;line(c,-23,y+11,23,y+11,m.trim,2);
   for(let col=0;col<5;col++){const x=-20+col*8;rect(c,x,y,6,10,t==='mansion'?['#785344','#526062','#948461'][col%3]:t==='security'?'#31495b':'#675d46');
    if(t==='security'){rect(c,x+1,y+2,4,1,'#69c3d0');rect(c,x+1,y+5,4,1,'#93b5c0');}}
  }
 }else if(kind==='partition'){
  box(c,56,43,t==='gallery'?'#ccc6b6':'#5b707a',t==='gallery'?'#b2b1a7':t==='lab'?'#46616c':'#263846',m.trim);
  if(t==='lab'){rect(c,-25,-39,50,30,'#71949b55');line(c,-20,-36,8,-12,'#b1d9da55');line(c,0,-40,0,-7,m.trim);}
  else if(t==='bank'||t==='security'||t==='vault'){for(let x=-22;x<=22;x+=8)line(c,x,-39,x,-6,m.trim+'88',2);rect(c,18,-25,7,11,'#172935');rect(c,20,-23,3,3,'#619c9c');}
  else {rect(c,-16,-35,32,24,'#282e34');rect(c,-13,-32,26,18,'#82705c');line(c,-9,-28,9,-18,'#a6a08b',3);}
 }else if(kind==='sofa'){
  box(c,55,24,'#806b62','#483b39',m.trim);rect(c,-24,-38,48,17,'#746158');
  rect(c,-28,-30,7,24,'#554943');rect(c,21,-30,7,24,'#554943');
  for(let x=-18;x<20;x+=18){rect(c,x,-22,16,12,'#8b7667');line(c,x,-21,x+15,-21,'#baa48977');}
 }else if(kind==='equipment'){
  if(t==='lab'){
   oval(c,-21,-10,42,14,'#162c37');rect(c,-18,-50,36,45,'#274b59');
   oval(c,-18,-56,36,13,'#809caa');rect(c,-14,-48,28,34,'#4d8d9c');
   oval(c,-14,-19,28,9,'#39606d');oval(c,-7,-39,14,24,'#96bdb2');line(c,-11,-46,-11,-17,'#b8dfdb',2);
   oval(c,-19,-54,38,6,'#355d70');line(c,-16,-8,16,-8,'#83c1ca',2);
  }else if(t==='mansion'){
   for(let n=0;n<6;n++){rect(c,-20,-6-n*7,40,8,'#594735');line(c,-20,-6-n*7,20,-6-n*7,'#b7a080');}
   line(c,-23,-4,-23,-49,m.trim,2);line(c,23,-4,23,-49,m.trim,2);
  }else if(t==='vault'||t==='bank'){
   box(c,43,47,'#87909b','#33414f',m.trim);rect(c,-18,-43,36,37,'#4d5b69');
   c.drawCircle(0,-25,12,stroke('#a3a9ae',3));c.drawCircle(0,-25,3,fill('#192b39'));
   for(let n=0;n<4;n++){const a=n*Math.PI/2;line(c,0,-25,Math.cos(a)*10,-25+Math.sin(a)*10,'#b4babd',2);}bolts(c,42,45);
  }else{
   box(c,42,44,'#526677','#1b2c3c',m.trim);
   for(let y=-37;y<-10;y+=13){rect(c,-17,y,34,10,'#071522');rect(c,-14,y+2,27,5,'#326c83');for(let x=-11;x<10;x+=8)line(c,x,y+6,x+4,y+3,'#8dbcbf');}
   rect(c,-13,-8,26,3,'#65808f');bolts(c,42,44);
  }
 }else if(kind==='objectiveCase'){
  // Always leaves an identifiable empty receptacle after pickup; no collision or gameplay changes.
  const wood=t==='mansion',industrial=t==='warehouse';
  box(c,40,24,wood?'#967047':industrial?'#687265':'#647886',wood?'#4b362b':'#273643',m.trim);
  if(t==='lab'){rect(c,-15,-49,30,27,'#467c8666');oval(c,-17,-52,34,8,'#8bacb4');line(c,-14,-46,-14,-25,'#b0d9d8');}
  else if(t==='security'){rect(c,-17,-46,34,22,'#142934');rect(c,-14,-43,28,15,'#30697b');line(c,-9,-39,8,-35,'#95c7c7');}
  else if(t==='warehouse'){bolts(c,39,23);rect(c,-22,-32,44,7,'#849380');rect(c,-3,-26,6,9,'#abb999');}
  else if(t==='bank'||t==='vault'){rect(c,-19,-30,38,5,'#a0aab4');bolts(c,40,24);line(c,-14,-18,14,-18,'#8498ad');}
  else if(wood){rect(c,-19,-30,38,6,'#b79864');line(c,-14,-20,-14,-5,'#a58654');line(c,14,-20,14,-5,'#a58654');}
  else {rect(c,-18,-48,36,24,'#93bec21e');c.drawRect(Skia.XYWHRect(-18,-48,36,24),stroke('#a7c5c6',1));line(c,-13,-43,-1,-29,'#c3dddd66');}
 }
 c.restore();return true;
}

export function drawPortal(c:SkCanvas,s:CompiledStage,entry:boolean,active=false){
 const p=entry?s.def.entryPosition:s.def.exitPosition,edge=entry?s.def.entryEdge:s.def.exitEdge;
 if(!p||!edge)return;
 const theme=s.def.theme,m=MATERIALS[theme];
 c.save();c.translate(p.x*TILE,p.y*TILE);
 // The door's threshold lies on the navigable tile. Rotation points out of the building.
 c.rotate(edge==='top'?0:edge==='right'?90:edge==='bottom'?180:270,0,0);
 rect(c,-24,-14,48,29,'#0c1720');rect(c,-28,-17,6,31,m.trim);rect(c,22,-17,6,31,m.trim);
 rect(c,-24,-20,48,6,'#566575');rect(c,-21,-12,42,22,'#1d303e');
 if(theme==='warehouse'){for(let y=-10;y<10;y+=5)line(c,-20,y,20,y,'#7b897b');}
 else if(theme==='mansion'){rect(c,-18,-10,16,18,'#725039');rect(c,2,-10,16,18,'#725039');}
 else {line(c,0,-11,0,8,'#97a9b1');for(let x=-17;x<=17;x+=34)rect(c,x,-7,2,10,'#879ba8');}
 const color=entry?'#7a929f':active?'#73bca7':'#626d75';
 line(c,-19,15,19,15,color,3);line(c,-12,20,12,20,color+'88',1);
 if(!entry&&!active){rect(c,-3,-3,6,5,'#a5acac');c.drawCircle(0,-4,2,stroke('#a5acac',1));}
 c.restore();
}
