import {Skia} from '@shopify/react-native-skia';
import type {SkCanvas} from '@shopify/react-native-skia';
import type {StageTheme} from '../../game/levels/StageDefinition';
import {Cell,TILE,type CompiledStage} from '../../game/world/compileStage';
import {MATERIALS} from '../../game/levels/chapterArt';
import {fill,stroke} from '../paints';

/** Static replacement materials. No extra layer, texture, shader or per-frame work. */
export const VENUE_FINISH:Record<StageTheme,{floor:string;alternate:string;face:string;cap:string;warm:readonly[number,number,number,number]}>= {
 museum:{floor:'#47535a',alternate:'#4d585e',face:'#74817d',cap:'#202e38',warm:[255,230,187,.76]},
 gallery:{floor:'#848b86',alternate:'#8a908a',face:'#c8c9bb',cap:'#78837f',warm:[255,239,207,.65]},
 bank:{floor:'#3e4b50',alternate:'#465358',face:'#697b7b',cap:'#1c2b32',warm:[255,228,177,.72]},
 lab:{floor:'#304a55',alternate:'#36515b',face:'#5c7e87',cap:'#182d38',warm:[231,244,235,.56]},
 casino:{floor:'#382b3a',alternate:'#3e303f',face:'#705649',cap:'#231c29',warm:[255,220,163,.76]},
 mansion:{floor:'#4b3e32',alternate:'#514335',face:'#87735c',cap:'#282521',warm:[255,225,177,.72]},
 warehouse:{floor:'#454e4d',alternate:'#4a5351',face:'#778075',cap:'#272f33',warm:[255,231,190,.65]},
 security:{floor:'#2c414d',alternate:'#334956',face:'#597180',cap:'#172833',warm:[237,240,217,.58]},
 blacksite:{floor:'#2b3943',alternate:'#303f49',face:'#526674',cap:'#17242e',warm:[237,236,214,.58]},
 vault:{floor:'#374653',alternate:'#3e4d5c',face:'#738494',cap:'#1d2b37',warm:[250,237,207,.65]},
};

export function drawVenueMaterial(c:SkCanvas,s:CompiledStage):void {
 const theme=s.def.theme,m=MATERIALS[theme],finish=VENUE_FINISH[theme];
 const base=[fill(finish.floor),fill(finish.alternate)];base.forEach(p=>p.setAntiAlias(false));
 const seam=stroke(m.seam,.8,.6),edge=stroke(m.trim,.7,.16),detail=stroke(m.trim,.6,.12);
 for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++){
  if(s.grid[y*s.cols+x]!==Cell.Floor)continue;
  const xx=x*TILE,yy=y*TILE;
  c.drawRect(Skia.XYWHRect(xx,yy,TILE,TILE),base[(Math.floor(x/2)*3+Math.floor(y/2))%2]);
  if(theme==='mansion'){
   // Longer timber boards, staggered joints and one restrained grain stroke.
   c.drawLine(xx,yy,xx+TILE,yy,seam);c.drawLine(xx,yy+20,xx+TILE,yy+20,seam);
   if(x%3===y%3)c.drawLine(xx,yy,xx,yy+20,seam);
   if(x%3===(y+1)%3)c.drawLine(xx,yy+20,xx,yy+40,seam);
   if((x+y)%3===0)c.drawLine(xx+4,yy+9,xx+35,yy+11,detail);
  }else if(theme==='casino'){
   // Quiet woven carpet with sparse brass stitch motifs, no dense diamond grid.
   if(x%2===0&&y%2===0){c.drawLine(xx+16,yy+17,xx+20,yy+13,detail);c.drawLine(xx+20,yy+13,xx+24,yy+17,detail);}
  }else{
   if(x%2===0){c.drawLine(xx,yy,xx,yy+TILE,seam);c.drawLine(xx+1,yy,xx+1,yy+TILE,edge);}
   if(y%2===0)c.drawLine(xx,yy,xx+TILE,yy,seam);
   if(theme==='museum'||theme==='bank'){
    if((x*3+y*7)%7===0)c.drawLine(xx+4,yy+12,xx+35,yy+18,detail);
   }else if(theme==='warehouse'){
    if((x*7+y*3)%6===0)c.drawLine(xx+10,yy+26,xx+26,yy+23,detail);
   }else if(theme!=='gallery'&&x%2===0&&y%2===0){
    // Brushed alloy / sealed lab panels; fittings only at panel intersections.
    c.drawLine(xx+4,yy+4,xx+12,yy+4,edge);
   }
  }
 }
 const {x,y}=s.objective;c.drawCircle(x,y,42,stroke(m.trim,.9,.4));c.drawCircle(x,y,37,stroke(m.trim,.7,.18));
 if(s.def.landmark){const p=s.def.landmark;c.drawOval(Skia.XYWHRect(p.x*TILE-29,p.y*TILE-12,58,27),stroke(m.trim,1,.4));}
}
