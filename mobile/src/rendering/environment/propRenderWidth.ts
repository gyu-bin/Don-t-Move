import type {PropDef} from '../../game/levels/StageDefinition';
import {PROP_KIT} from '../../game/world/propKit';
import {TILE} from '../../game/world/compileStage';

/** Preserve artwork aspect/pivot while ensuring its projection contains its existing floor footprint.
 * Static picture recording only. Never changes collision, LOS, anchors or texture pixels. */
export function propRenderWidth(p:PropDef,f:{sw:number;sh:number;ax:number;ay:number}):number {
 const spec=PROP_KIT[p.kind],width=spec.drawWidth*TILE*(p.scale??1);
 if(!spec.blocksMovement)return width;
 const scaled=p.kind.startsWith('bank')||p.kind.startsWith('lab')||p.kind.startsWith('casino')||p.kind.startsWith('galleryGlass');
 const scale=p.collisionScale??(scaled?p.scale??1:1),w=spec.footprint.w*TILE*scale,h=spec.footprint.h*TILE*scale;
 const side=Math.min(f.ax,f.sw-f.ax);
 if(side<=0||f.ay<=0)return width;
 return Math.max(width,w*f.sw/(2*side),Math.max(0,h-spec.mountHeight)*f.sw/f.ay);
}
