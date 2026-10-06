/**
 * Authoring aid for the density pass: per zone, how much floor there is, how many structures stand free in it
 * (islands) and how many only line its walls, and the largest open disc. It ranks rooms to look at; the verdict
 * is made on the picture.
 * Usage: node --import tsx tools/campaign/v13Density.ts [<mission>…]
 */
import {V13_MISSIONS} from './v13Build';
import {PROP_KIT} from '../../src/game/world/propKit';
import {pickMissions} from './v13QaLib';
for(const m of pickMissions(V13_MISSIONS,process.argv.slice(2))){
 const wall=(x:number,y:number)=>{const ch=m.map[Math.floor(y)]?.[Math.floor(x)];return !ch||ch==='#'||ch===' ';};
 const boxes=m.structures.map(s=>{const k=PROP_KIT[s.kind],w=k.footprint.w*s.scale,h=k.footprint.h*s.scale;return{s,k,x0:s.x-w/2,x1:s.x+w/2,y0:k.wallMounted?s.y-h:s.y-h/2,y1:k.wallMounted?s.y:s.y+h/2};}).filter(b=>b.k.blocksMovement);
 const flush=(b:typeof boxes[number])=>{for(let x=b.x0;x<=b.x1+1e-6;x+=.25)if(wall(x,b.y0-.3)||wall(x,b.y1+.3))return true;for(let y=b.y0;y<=b.y1+1e-6;y+=.25)if(wall(b.x0-.3,y)||wall(b.x1+.3,y))return true;return false;};
 const lines:string[]=[];
 for(const[letter,z]of Object.entries(m.zones)){
  let area=0,open=0,at={x:0,y:0};const cells:[number,number][]=[];m.map.forEach((r,y)=>[...r].forEach((ch,x)=>{if(ch===letter){area++;cells.push([x,y]);}}));
  const mine=boxes.filter(b=>m.map[Math.floor(b.s.y)]?.[Math.floor(b.s.x)]===letter||cells.some(([x,y])=>b.s.x>=x&&b.s.x<x+1&&Math.abs(b.s.y-y-.5)<1));
  for(const[cx,cy]of cells)for(const[dx,dy]of[[.25,.25],[.75,.25],[.25,.75],[.75,.75]]){const x=cx+dx,y=cy+dy;let d=9;
   for(let yy=Math.floor(y-4);yy<=y+4;yy++)for(let xx=Math.floor(x-4);xx<=x+4;xx++)if(wall(xx+.5,yy+.5))d=Math.min(d,Math.hypot(Math.max(xx-x,0,x-xx-1),Math.max(yy-y,0,y-yy-1)));
   for(const b of boxes)d=Math.min(d,Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.y0-y,0,y-b.y1)));
   if(d>open){open=d;at={x,y};}}
  const islands=mine.filter(b=>!flush(b)),lined=mine.filter(flush),routes=[m.approach.includes(z.id)?'A':'',m.quickEscape.includes(z.id)?'Q':'',m.alternateEscape.includes(z.id)?'L':''].join('');
  const size=area<28?'S':area<50?'M':area<90?'L':'XL',want=size==='S'?0:size==='M'?1:2;
  const flag=open>=2.6?'OPEN':islands.length<want&&z.role!=='objective'?'THIN':islands.length<want?'THIN*':'';
  lines.push(`  ${z.id.padEnd(16)} ${String(area).padStart(3)}t ${size.padEnd(2)} ${routes.padEnd(3)} islands ${islands.length} lined ${lined.length} open ${open.toFixed(1)}@${at.x.toFixed(0)},${at.y.toFixed(0)} ${flag}`);
 }
 console.log(`${m.id} ${m.title} (${m.map[0].length}x${m.map.length}, ${m.structures.length} structures)`);console.log(lines.join('\n'));
}
