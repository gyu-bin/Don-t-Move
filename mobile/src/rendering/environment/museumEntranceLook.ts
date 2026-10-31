import {Skia} from '@shopify/react-native-skia';
import type {SkCanvas} from '@shopify/react-native-skia';
import type {CompiledStage} from '../../game/world/compileStage';
import {Cell,TILE} from '../../game/world/compileStage';
import {fill,stroke} from '../paints';

/** Visual-only pilot. Never feeds collision, vision, StageDefinition or simulation. */
export function isMuseumEntrance(id:string):boolean {return id==='01-01';}
export const ENTRANCE_LOOK={
 floor:['#47535a','#4b575d','#4e595f','#465159'],
 seam:'#253139',vein:'#879599',edge:'#7b898b',
 wallFace:['#84908c','#39464c'],wallTop:'#202e38',trim:'#c1b28c',
 ambient:.32,warm:[255,230,187,.82],lightRadius:.94,glowRadius:.74,
} as const;

/** Honed blue-grey stone: larger panels, quiet seams and sparse mineral veins.
 * Replaces the existing checker/vein commands; no new overlay or texture pass.
 * Called only when recording the stage's existing floor picture. */
export function drawEntranceStone(c:SkCanvas,s:CompiledStage):void {
 const paints=ENTRANCE_LOOK.floor.map(color=>fill(color));
 paints.forEach(p=>p.setAntiAlias(false));
 const seam=stroke(ENTRANCE_LOOK.seam,.8,.65),edge=stroke(ENTRANCE_LOOK.edge,.65,.18);
 const vein=stroke(ENTRANCE_LOOK.vein,.7,.14);
 for(let row=0;row<s.rows;row++)for(let col=0;col<s.cols;col++){
  if(s.grid[row*s.cols+col]!==Cell.Floor)continue;
  const x=col*TILE,y=row*TILE,bx=Math.floor(col/2),by=Math.floor(row/2);
  c.drawRect(Skia.XYWHRect(x,y,TILE,TILE),paints[(bx*7+by*3)%paints.length]);
  if(col%2===0){c.drawLine(x,y,x,y+TILE,seam);c.drawLine(x+1,y,x+1,y+TILE,edge);}
  if(row%2===0){c.drawLine(x,y,x+TILE,y,seam);c.drawLine(x,y+1,x+TILE,y+1,edge);}
  if((col*3+row*7)%5===0){
   c.drawLine(x+3,y+11,x+21,y+17,vein);
   c.drawLine(x+21,y+17,x+36,y+14,vein);
  }
 }
 const {x,y}=s.objective;
 c.drawCircle(x,y,42,stroke(ENTRANCE_LOOK.trim,.9,.4));
 c.drawCircle(x,y,37,stroke(ENTRANCE_LOOK.trim,.7,.18));
 if(s.def.landmark){const p=s.def.landmark;c.drawOval(Skia.XYWHRect(p.x*TILE-29,p.y*TILE-12,58,27),stroke(ENTRANCE_LOOK.trim,1,.4));}
}
