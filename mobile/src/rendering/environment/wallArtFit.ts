import {Cell,TILE,WALL_HEIGHT} from '../../game/world/compileStage';
import type {CompiledProp,CompiledStage} from '../../game/world/compileStage';
import {PROP_KIT} from '../../game/world/propKit';
import type {SpriteAtlas} from '../sprites/spriteTypes';

/** Where a wall-mounted picture is actually drawn: anchor x, anchor y (bottom of the frame) and world width. */
export interface WallArtPlacement {x:number;y:number;width:number}

/**
 * Visual Polish Pass 4: keeps wall-mounted decoration (paintings, wall screens, signs — footprint 0, no movement
 * or sight rule) on its wall. Presentation only: the prop's data, collision, LOS and sort key are untouched.
 *  - Too tall: a picture whose top would rise past the top of the wall cap above it (into the void beyond the map
 *    edge) is hung on the wall face instead — bottom 8 units below the wall foot like the wall screens, scaled
 *    down uniformly so its top stays 2 units inside the cap.
 *  - Hidden: a picture whose drawn rectangle overlaps a movement-blocking prop's sprite slides along the same wall
 *    to the nearest clear span (≤ 2 tiles, quarter-tile steps, wall above and open floor in front of every column
 *    it covers); if there is none it stays where it was.
 * Pictures that already fit are returned unchanged, so every other placement in the campaign draws as before.
 */
/** `pictureFor` is environmentAssetForProp (passed in so this module stays free of the PNG registry). */
export function fitWallArt(stage:CompiledStage,atlas:SpriteAtlas|null,pictureFor:(def:CompiledStage['def'],p:CompiledProp)=>string|undefined):Map<CompiledProp,WallArtPlacement>{
 const out=new Map<CompiledProp,WallArtPlacement>();
 if(!atlas)return out;
 const frameOf=(p:CompiledProp)=>{const id=pictureFor(stage.def,p);return id?atlas[id]??null:null;};
 const rectOf=(p:CompiledProp,x:number,y:number,width:number)=>{
  const f=frameOf(p);if(!f)return null;const s=width/f.sw;
  return {x0:x-f.ax*s,x1:x-f.ax*s+f.sw*s,y0:y-f.ay*s,y1:y-f.ay*s+f.sh*s};
 };
 const isWall=(col:number,row:number)=>col<0||row<0||col>=stage.cols||row>=stage.rows||stage.grid[row*stage.cols+col]===Cell.Wall;
 const blockers=stage.props.filter(q=>!PROP_KIT[q.kind].wallMounted&&!PROP_KIT[q.kind].floorDetail&&PROP_KIT[q.kind].blocksMovement)
  .map(q=>rectOf(q,q.x,q.y-PROP_KIT[q.kind].mountHeight,PROP_KIT[q.kind].drawWidth*TILE*q.scale)).filter(r=>r!==null);
 for(const p of stage.props){
  const spec=PROP_KIT[p.kind];
  if(!spec.wallMounted||!frameOf(p))continue;
  let x=p.x,y=p.y-spec.mountHeight,width=spec.drawWidth*TILE*p.scale;
  const col=Math.floor(p.x/TILE),row=Math.floor(p.y/TILE);
  let wallRow=row-1;while(wallRow>=0&&!isWall(col,wallRow))wallRow--;
  const capTop=wallRow*TILE-WALL_HEIGHT,wallFoot=(wallRow+1)*TILE;
  let r=rectOf(p,x,y,width)!;
  // Portrait Hall's freestanding-size portraits otherwise cover the wall cap:
  // treat the front face as the hanging area, leaving the cap as architecture.
  const hangTop=stage.def.id==='02-01'&&p.kind==='painting'?capTop+TILE/2:capTop;
  if(r.y0<hangTop){
   const bottom=Math.min(y,wallFoot+8),f=frameOf(p)!,s=width/f.sw,below=(f.sh-f.ay)*s;
   const k=Math.min(1,(bottom-below-(hangTop+2))/(f.ay*s));
   y=bottom;width*=k;r=rectOf(p,x,y,width)!;
  }
  const hit=(rr:{x0:number;x1:number;y0:number;y1:number})=>blockers.some(b=>b.x0<rr.x1-4&&b.x1>rr.x0+4&&b.y0<rr.y1&&b.y1>rr.y0);
  if(hit(r)){
   let placed:WallArtPlacement|null=null;
   for(let step=1;step<=8&&!placed;step++)for(const dir of [1,-1]){
    const nx=p.x+dir*step*TILE/4,nr=rectOf(p,nx,y,width)!;
    // Every column under the picture needs the wall above and open floor in front (a pier would cover it).
    let spanOnWall=true;
    for(let cc=Math.floor(nr.x0/TILE);cc<=Math.floor((nr.x1-1)/TILE);cc++)if(!isWall(cc,wallRow)||isWall(cc,wallRow+1))spanOnWall=false;
    if(spanOnWall&&!hit(nr)){placed={x:nx,y,width};break;}
   }
   // No clear span: keep it where it was (a partial overlap reads as normal depth; removing art is worse).
   if(placed)out.set(p,placed);
   else if(x!==p.x||y!==p.y-spec.mountHeight||width!==spec.drawWidth*TILE*p.scale)out.set(p,{x,y,width});
   continue;
  }
  if(x!==p.x||y!==p.y-spec.mountHeight||width!==spec.drawWidth*TILE*p.scale)out.set(p,{x,y,width});
 }
 return out;
}
