import {Skia} from '@shopify/react-native-skia';
import type {SkCanvas,SkPathBuilder} from '@shopify/react-native-skia';
import {MATERIALS} from '../../game/levels/chapterArt';
import type {CompiledStage} from '../../game/world/compileStage';
import {Cell,TILE} from '../../game/world/compileStage';
import {fill,stroke} from '../paints';

/** Themes using the existing, separately approved wall and contact finish. */
export function hasVenueFinish(theme:string):boolean {
  return theme==='museum'||theme==='gallery'||theme==='casino'||theme==='mansion'||theme==='security'||theme==='vault';
}

/** Bank and Warehouse get floor-only finishing; their existing walls remain unchanged. */
export function hasFinishedFloor(theme:string):boolean {
  return hasVenueFinish(theme)||theme==='bank'||theme==='warehouse';
}

const segment=(p:SkPathBuilder,x:number,y:number,x1:number,y1:number)=>{p.moveTo(x,y);p.lineTo(x1,y1);};
const hash=(x:number,y:number)=>((x*73856093)^(y*19349663))>>>0;

/** No new textures, light or per-frame drawing. Paths batch the same material marks into the static picture. */
export function drawFinishedVenueFloor(c:SkCanvas,s:CompiledStage):boolean {
  const theme=s.def.theme;if(!hasFinishedFloor(theme))return false;
  const m=MATERIALS[theme],variant=(s.def.mission??1)-1;
  const base=Skia.PathBuilder.Make(),inset=Skia.PathBuilder.Make(),seams=Skia.PathBuilder.Make();
  const rim=Skia.PathBuilder.Make(),grain=Skia.PathBuilder.Make(),grainFine=Skia.PathBuilder.Make();
  const soft=Skia.PathBuilder.Make(),dark=Skia.PathBuilder.Make(),fasteners=Skia.PathBuilder.Make();
  const speckle=theme==='warehouse'?Skia.PathBuilder.Make():null;
  // Mansion strokes keep identical geometry; bounded paths avoid map-wide strokes.
  const woodChunks=theme==='mansion'?new Map<string,{grain:SkPathBuilder;fine:SkPathBuilder;seams:SkPathBuilder;rim:SkPathBuilder}>():null;
  for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++){
    if(s.grid[y*s.cols+x]!==Cell.Floor)continue;
    const xx=x*TILE,yy=y*TILE,h=hash(x,y);
    base.addRect(Skia.XYWHRect(xx,yy,TILE,TILE));
    if(theme==='museum'){
      // Preserve the mission's existing marble-check rhythm and base colour.
      if((Math.floor(x/(variant%2+1))+Math.floor(y/(variant%2+1)))%2===0)inset.addRect(Skia.XYWHRect(xx,yy,TILE,TILE));
      segment(seams,xx,yy,xx+TILE,yy);segment(seams,xx,yy,xx,yy+TILE);
      segment(rim,xx+1.4,yy+1.4,xx+38.6,yy+1.4);
      // Sparse, differently oriented veins avoid the same arc on every stone tile.
      if(h%4!==0){
        const dy=7+h%19,up=(h&4)===0?1:-1,x0=3+(h>>>3)%7,x1=27+(h>>>7)%10;
        grain.moveTo(xx+x0,yy+dy);grain.quadTo(xx+(x0+x1)*.5,yy+dy+up*(2+(h>>>10)%4),xx+x1,yy+dy-up*2);
        if(h%5===0){grainFine.moveTo(xx+x0+4,yy+dy+up*4);grainFine.quadTo(xx+(x0+x1)*.5,yy+dy+up*3,xx+x1-2,yy+dy+up*5);}
      }
    }else if(theme==='gallery'){
      // The large, clean 2x2 matte-stone panels stay distinct from Museum marble.
      if(x%2===0){segment(seams,xx,yy,xx,yy+TILE);segment(rim,xx+1.1,yy,xx+1.1,yy+TILE);}
      if(y%2===0){segment(seams,xx,yy,xx+TILE,yy);segment(rim,xx,yy+1.1,xx+TILE,yy+1.1);}
      if(h%4===0)soft.addRect(Skia.XYWHRect(xx+5,yy+5,30,2));
      if(h%3===0)grainFine.addCircle(xx+5+h%29,yy+5+(h>>>5)%29,.45);
    }else if(theme==='bank'){
      // Preserve the existing stone checker and quiet marble, with restrained stone edge relief.
      if((Math.floor(x/(variant%2+1))+Math.floor(y/(variant%2+1)))%2===0)inset.addRect(Skia.XYWHRect(xx,yy,TILE,TILE));
      segment(seams,xx,yy,xx+TILE,yy);segment(seams,xx,yy,xx,yy+TILE);
      segment(rim,xx+1.5,yy+1.5,xx+38.5,yy+1.5);
      const dy=10+h%5;
      grain.moveTo(xx+3,yy+dy);grain.quadTo(xx+19,yy+dy+4,xx+35,yy+dy+1);
      if(h%4===0){grainFine.moveTo(xx+7,yy+dy+9);grainFine.quadTo(xx+18,yy+dy+7,xx+29,yy+dy+10);}
    }else if(theme==='warehouse'){
      // Concrete seams remain on the original grid; subtle varied aggregate replaces the identical five dots.
      segment(seams,xx,yy,xx+TILE,yy);segment(seams,xx,yy,xx,yy+TILE);
      segment(rim,xx+1.2,yy+1.2,xx+38.8,yy+1.2);
      for(let n=0;n<3;n++){
        const q=hash(x*7+n,y*11+n),sx=xx+4+q%32,sy=yy+4+(q>>>7)%32;
        speckle!.addRect(Skia.XYWHRect(sx,sy,n===0?1.4:.8,n===0?1.4:.8));
      }
      if(h%6===0)segment(grainFine,xx+9,yy+23,xx+25,yy+22.5);
    }else if(theme==='casino'){
      // Keep the four existing woven diamonds; finer threads leave actors and cones readable.
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){
        const cx=xx+i*20+10,cy=yy+j*20+10;
        seams.moveTo(cx,cy-5);seams.lineTo(cx+5,cy);seams.lineTo(cx,cy+5);seams.lineTo(cx-5,cy);seams.close();
      }
      if(h%3===0){segment(grain,xx+4,yy+6+(h%4),xx+35,yy+6+(h%4));segment(grainFine,xx+7,yy+29,xx+30,yy+29);}
    }else if(theme==='mansion'){
      // Same warm wood and four-board spacing, with staggered joints and broken, bowed grain.
      const chunkKey=`${Math.floor(x/4)},${Math.floor(y/4)}`;
      let chunk=woodChunks!.get(chunkKey);
      if(!chunk){chunk={grain:Skia.PathBuilder.Make(),fine:Skia.PathBuilder.Make(),seams:Skia.PathBuilder.Make(),rim:Skia.PathBuilder.Make()};woodChunks!.set(chunkKey,chunk);}
      for(let i=0;i<4;i++){
        const row=y*4+i,py=yy+i*10,bh=hash(x,row),join=8+(row%2?19:0);
        segment(chunk.seams,xx,py,xx+TILE,py);
        segment(chunk.seams,xx+join,py,xx+join,py+10);
        if(bh%4===0)soft.addRect(Skia.XYWHRect(xx+1,py+1,38,8));
        if(bh%5===0)dark.addRect(Skia.XYWHRect(xx+1,py+1,38,8));
        const gx=xx+3+bh%8,gy=py+3+(bh>>>3)%3,len=15+(bh>>>6)%12;
        chunk.grain.moveTo(gx,gy);chunk.grain.quadTo(gx+len*.45,gy-1.2,gx+len,gy+.35);
        if(bh%3===0){chunk.fine.moveTo(gx+3,gy+2);chunk.fine.quadTo(gx+12,gy+.8,gx+len-2,gy+1.7);}
        segment(chunk.rim,xx+1,py+1.1,xx+39,py+1.1);
      }
    }else{
      // HQ/vault keep the original panel layout; inset contrast and rivets no longer dominate the room.
      if((x+y+variant)%3===0)inset.addRect(Skia.XYWHRect(xx+2,yy+2,36,36));
      segment(rim,xx+1,yy+1,xx+39,yy+1);segment(rim,xx+1,yy+1,xx+1,yy+39);
      segment(seams,xx+39,yy+1,xx+39,yy+39);segment(seams,xx+1,yy+39,xx+39,yy+39);
      if(h%3===0){segment(grain,xx+7,yy+9,xx+31,yy+9);segment(grainFine,xx+12,yy+12,xx+33,yy+12);}
      if(theme==='vault')for(const a of [5,35])for(const b of [5,35])fasteners.addCircle(xx+a,yy+b,.7);
    }
  }
  const substrate=fill(m.floor);substrate.setAntiAlias(false);
  c.drawPath(base.detach(),substrate);
  c.drawPath(inset.detach(),fill(m.inlay,theme==='museum'||theme==='bank'?1/3:theme==='security'?.63:.72));
  c.drawPath(soft.detach(),fill(theme==='mansion'?m.inlay:m.trim,theme==='mansion'?.075:.025));
  c.drawPath(dark.detach(),fill('#000000',.025));
  const seamPaint=stroke(theme==='casino'?m.inlay:m.seam,theme==='gallery'?.7:theme==='casino'?.7:theme==='mansion'?.7:theme==='museum'?1:1.4,theme==='casino'?.68:theme==='gallery'?.4:.9);
  if(woodChunks)for(const chunk of woodChunks.values())c.drawPath(chunk.seams.detach(),seamPaint);
  else c.drawPath(seams.detach(),seamPaint);
  const rimPaint=stroke(m.trim,theme==='gallery'?.55:.55,theme==='museum'?.10:theme==='mansion'?.09:theme==='gallery'?.12:theme==='bank'||theme==='warehouse'?.10:.29);
  if(woodChunks)for(const chunk of woodChunks.values())c.drawPath(chunk.rim.detach(),rimPaint);
  else c.drawPath(rim.detach(),rimPaint);
  const grainPaint=stroke(theme==='mansion'?'#816143':theme==='museum'||theme==='bank'?'#b3babb':m.trim,theme==='mansion'?.45:.5,theme==='mansion'?.25:theme==='casino'?.055:theme==='museum'||theme==='bank'?.085:.10);
  if(woodChunks)for(const chunk of woodChunks.values())c.drawPath(chunk.grain.detach(),grainPaint);
  else c.drawPath(grain.detach(),grainPaint);
  const grainFinePaint=stroke(theme==='mansion'?'#816143':m.trim,.4,theme==='mansion'?.15:theme==='gallery'?.13:.065);
  if(woodChunks)for(const chunk of woodChunks.values())c.drawPath(chunk.fine.detach(),grainFinePaint);
  else c.drawPath(grainFine.detach(),grainFinePaint);
  c.drawPath(fasteners.detach(),fill('#9ca6b2',.29));
  if(speckle)c.drawPath(speckle.detach(),fill('#879084',.12));
  return true;
}
