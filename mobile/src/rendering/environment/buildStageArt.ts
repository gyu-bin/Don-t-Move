import { BlendMode, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPicture } from '@shopify/react-native-skia';

import { Cell, TILE, WALL_HEIGHT } from '../../game/world/compileStage';
import type { CompiledProp, CompiledStage } from '../../game/world/compileStage';
import {environmentAssetForProp} from '../../assets/environmentKit';
import { PROP_KIT } from '../../game/world/propKit';
import {
  drawFallbackFloor,
  drawFallbackProp,
  drawFallbackWallRow,
  VOID_COLOR,
} from '../fallback/proceduralMuseum';
import { fill, stroke } from '../paints';
import { fillOval, fillRect } from '../skiaScratch';
import type { SpriteAtlas, SpriteFrame } from '../sprites/spriteTypes';
import {drawVenueFloor,drawVenueProp,drawPortal} from './venueArt';
import { DRESSING_KIT } from '../../game/world/dressingKit';
import { drawDressingFloor, drawDressingItem } from './museumDressingArt';
import {MATERIALS} from '../../game/levels/chapterArt';
import { northBoundaryColumns } from './northBoundary';

/**
 * Bakes everything static in a stage into SkPictures once at load:
 *
 *   floor      tiles, carpet, ambient occlusion, contact shadows, exit pad
 *   layers[]   wall rows and props, each with a painter's sort key so
 *              characters can be interleaved for correct 3/4 occlusion
 *   darkness   ambient dark with soft holes at every static light
 *   glow       warm / cyan / green light pools (screen blend)
 *
 * Every visual element is taken from the environment atlas when it has a
 * frame for it, otherwise from the procedural fallback. Atlas frame names:
 *   floor, wallTop, wallFace          tiles (optional)
 *   <PropKind>                        e.g. statue, crate, lamp, pillar …
 *   exitSign, diamond                 objective pieces
 */
export interface StaticLayer {
  sortY: number;
  picture: SkPicture;
}

export interface StageArt {
  exitActive?:SkPicture;
  floor: SkPicture;
  layers: StaticLayer[];
  darkness: SkPicture;
  glow: SkPicture;
}

type Bounds = { x: number; y: number; w: number; h: number };

function record(bounds: Bounds, draw: (c: SkCanvas) => void): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(bounds.x, bounds.y, bounds.w, bounds.h));
  draw(c);
  return rec.finishRecordingAsPicture();
}

function gradient(shader: ReturnType<typeof Skia.Shader.MakeLinearGradient>, mode?: BlendMode): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(shader);
  if (mode !== undefined) p.setBlendMode(mode);
  return p;
}

function linear(x0: number, y0: number, x1: number, y1: number, colors: string[]): SkPaint {
  return gradient(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      colors.map((c) => Skia.Color(c)),
      null,
      TileMode.Clamp,
    ),
  );
}

function radial(
  cx: number,
  cy: number,
  r: number,
  colors: string[],
  pos: number[],
  mode: BlendMode,
): SkPaint {
  return gradient(
    Skia.Shader.MakeRadialGradient(
      { x: cx, y: cy },
      r,
      colors.map((c) => Skia.Color(c)),
      pos,
      TileMode.Clamp,
    ),
    mode,
  );
}

/** Draws an atlas frame at world width `width`, anchor at (x, y). */
function drawFrame(c: SkCanvas, f: SpriteFrame, x: number, y: number, width: number, flip: boolean) {
  const s = width / f.sw;
  c.save();
  if (flip) {
    c.translate(x, 0);
    c.scale(-1, 1);
    c.translate(-x, 0);
  }
  c.drawImageRect(
    f.image,
    Skia.XYWHRect(f.sx, f.sy, f.sw, f.sh),
    Skia.XYWHRect(x - f.ax * s, y - f.ay * s, f.sw * s, f.sh * s),
    fill('#ffffff'),
  );
  c.restore();
}

// ------------------------------------------------------------------ floor

function drawFloor(c: SkCanvas, stage: CompiledStage, atlas: SpriteAtlas | null): void {
  if(stage.def.chapter){drawVenueFloor(c,stage);return;}
  const tile = atlas?.floor;
  if (tile) {
    for (let r = 0; r < stage.rows; r++) {
      for (let cc = 0; cc < stage.cols; cc++) {
        if (stage.grid[r * stage.cols + cc] !== Cell.Floor) continue;
        c.drawImageRect(
          tile.image,
          Skia.XYWHRect(tile.sx, tile.sy, tile.sw, tile.sh),
          Skia.XYWHRect(cc * TILE, r * TILE, TILE, TILE),
          fill('#ffffff'),
        );
      }
    }
  } else {
    drawFallbackFloor(c, stage);
  }
}

/** Ambient occlusion, contact shadows and the exit pad — independent of the art source. */
function drawFloorShading(c: SkCanvas, stage: CompiledStage): void {
  const { cols, rows, grid } = stage;
  const at = (cc: number, rr: number) =>
    cc < 0 || rr < 0 || cc >= cols || rr >= rows ? Cell.Void : grid[rr * cols + cc];

  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      if (at(cc, r) !== Cell.Floor) continue;
      const x = cc * TILE;
      const y = r * TILE;
      if (at(cc, r - 1) === Cell.Wall) {
        fillRect(c, x, y, TILE, 18, linear(0, y, 0, y + 18, ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']));
      }
      if (at(cc - 1, r) === Cell.Wall) {
        fillRect(c, x, y, 12, TILE, linear(x, 0, x + 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
      }
      if (at(cc + 1, r) === Cell.Wall) {
        const x1 = x + TILE;
        fillRect(c, x1 - 12, y, 12, TILE, linear(x1, 0, x1 - 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
      }
    }
  }

  const shadow = fill('#000000', 0.42);
  for (const p of stage.props) {
    const spec = PROP_KIT[p.kind];
    if (spec.shadow <= 0) continue;
    const rw = spec.shadow * TILE * p.scale;
    fillOval(c, p.x - rw, p.y - rw * 0.32, rw * 2, rw * 0.64, shadow);
  }

  if (!stage.def.exit) return;
  const ex = stage.exit;
  fillRect(c, ex.x + 2, ex.y, ex.w - 4, ex.h, fill('#111820', 0.9));
  fillRect(
    c,
    ex.x + 2,
    ex.y,
    ex.w - 4,
    ex.h,
    linear(0, ex.y, 0, ex.y + ex.h, ['rgba(140,155,175,0.04)', 'rgba(140,155,175,0.2)']),
  );
  for (let i = 1; i < 4; i++) {
    const yy = ex.y + (ex.h * i) / 4;
    c.drawLine(ex.x + 4, yy, ex.x + ex.w - 4, yy, stroke('#52606f', 1, 0.5));
  }
}

// ------------------------------------------------------------------ walls / props

function drawWallRow(c: SkCanvas, stage: CompiledStage, r: number, atlas: SpriteAtlas | null): boolean {
  const north = r === -1 ? northBoundaryColumns(stage.def) : [];
  if(stage.def.chapter){
    const m=MATERIALS[stage.def.theme];let any=false;
    for(let x=0;x<stage.cols;x++){
      if(r === -1 ? !north.includes(x) : stage.grid[r*stage.cols+x]!==Cell.Wall)continue;any=true;
      const xx=x*TILE,yy=(r+1)*TILE-WALL_HEIGHT;
      if(stage.grid[(r+1)*stage.cols+x]!==Cell.Wall){
        fillRect(c,xx,yy,TILE,WALL_HEIGHT,linear(0,yy,0,yy+WALL_HEIGHT,stage.def.theme==='gallery'?['#d4d0bb','#989d91']:[m.inlay,m.seam]));
        c.drawLine(xx,yy+WALL_HEIGHT-4,xx+TILE,yy+WALL_HEIGHT-4,stroke(m.trim,2,0.6));
        c.drawLine(xx+2,yy+3,xx+2,yy+WALL_HEIGHT-5,stroke(m.trim,1,0.22));
        if(stage.def.theme==='gallery'){
          // Quiet plaster panel rhythm and a grounded metal baseboard, not a Museum cornice.
          fillRect(c,xx,yy+WALL_HEIGHT-6,TILE,5,fill('#c3c4b6'));
          c.drawLine(xx,yy+WALL_HEIGHT-1,xx+TILE,yy+WALL_HEIGHT-1,stroke('#545c57',1,.7));
          if(x%3===0)c.drawLine(xx+1,yy+5,xx+1,yy+WALL_HEIGHT-8,stroke('#8b9487',.7,.35));
        }
      }
      fillRect(c,xx,r*TILE-WALL_HEIGHT,TILE,TILE,fill(stage.def.theme==='gallery'?'#b5b6a9':m.seam));
      c.drawLine(xx,r*TILE-WALL_HEIGHT,xx+TILE,r*TILE-WALL_HEIGHT,stroke(m.trim,1,0.5));
    }
    return any;
  }
  const top = atlas?.wallTop;
  const face = atlas?.wallFace;
  if (!top || !face) return drawFallbackWallRow(c, stage, r);
  let any = false;
  const white = fill('#ffffff');
  for (let cc = 0; cc < stage.cols; cc++) {
    if (stage.grid[r * stage.cols + cc] !== Cell.Wall) continue;
    any = true;
    const x = cc * TILE;
    const y = r * TILE;
    const southWall = r + 1 < stage.rows && stage.grid[(r + 1) * stage.cols + cc] === Cell.Wall;
    if (!southWall) {
      c.drawImageRect(
        face.image,
        Skia.XYWHRect(face.sx, face.sy, face.sw, face.sh),
        Skia.XYWHRect(x, y + TILE - WALL_HEIGHT, TILE, WALL_HEIGHT),
        white,
      );
    }
    c.drawImageRect(
      top.image,
      Skia.XYWHRect(top.sx, top.sy, top.sw, top.sh),
      Skia.XYWHRect(x, y - WALL_HEIGHT, TILE, TILE),
      white,
    );
  }
  return any;
}

function drawProp(c: SkCanvas, p: CompiledProp, atlas: SpriteAtlas | null,stage:CompiledStage): void {
  // The existing Portrait Hall painting was occluded behind a movable wall.
  // Remount its visual on that hall's blank central panel below; never duplicate it.
  if(stage.def.id==='02-02'&&p.kind==='painting')return;
  const productionId=environmentAssetForProp(stage.def,p),production=productionId?atlas?.[productionId]:null;
  if(production){
    const spec=PROP_KIT[p.kind];drawFrame(c,production,p.x,p.y-spec.mountHeight,spec.drawWidth*TILE*p.scale,p.flip);
    // Wall-face exhibit attachment: reuse the approved frame inside the panel,
    // never as a floating independent prop or a new movement/LOS blocker.
    if(stage.def.theme==='gallery'&&productionId==='gallery_movable_art_wall'){
      const wallIndex=stage.props.filter(q=>environmentAssetForProp(stage.def,q)==='gallery_movable_art_wall').indexOf(p);
      const portraitHall=stage.def.id==='02-02'&&wallIndex===0;
      const remountedPortrait=stage.def.id==='02-02'&&wallIndex===1;
      // Odd panels used to stay blank grey slabs; they now carry a portrait.
      const oddPortrait=wallIndex%2===1&&!remountedPortrait;
      const artwork=remountedPortrait?atlas?.gallery_portrait_frame_a:wallIndex%2===0?(portraitHall?atlas?.gallery_portrait_frame_b:atlas?.gallery_abstract_frame):wallIndex%4===1?atlas?.gallery_portrait_frame_a:atlas?.gallery_portrait_frame_b;
      const width=spec.drawWidth*TILE*p.scale;
      if(artwork)drawFrame(c,artwork,p.x,p.y-width*.30,width*((portraitHall||remountedPortrait||oddPortrait)?.30:.57),!portraitHall&&!remountedPortrait&&wallIndex%4===2);
    }
    // A contained exhibit-case attachment, not a freestanding barrier. Its entire
    // ground span is narrower than the existing case footprint and its base is
    // inside the case. No PropDef, dressing item, collider or LOS rule is added.
    const rope=stage.def.chapter===1&&p.kind==='displayCase'?atlas?.museum_rope_barrier:null;
    if(rope)drawFrame(c,rope,p.x,p.y-2*p.scale,TILE*p.scale,p.flip);
    return;
  }
  if(stage.def.chapter&&drawVenueProp(c,p,stage))return;
  const proxy: Partial<Record<CompiledProp['kind'],string>>={counter:'displayCase',table:'bench',shelf:'crate',partition:'painting',equipment:'displayCase',sofa:'bench',objectiveCase:'displayCase'};
  const f = atlas?.[p.kind] ?? atlas?.[proxy[p.kind] ?? ''];
  if (!f) {
    drawFallbackProp(c, p);
    return;
  }
  const spec = PROP_KIT[p.kind];
  drawFrame(c, f, p.x, p.y - spec.mountHeight, spec.drawWidth * TILE * p.scale, p.flip);
}

// ------------------------------------------------------------------ lights

const LIGHT_RGB: Record<string, [number, number, number, number]> = {
  warm: [255, 170, 88, 0.5],
  cool: [150, 180, 255, 0.2],
  cyan: [70, 205, 255, 0.46],
  green: [70, 255, 150, 0.36],
  red: [255, 60, 50, 0.3],
};

export function buildStageArt(stage: CompiledStage, atlas: SpriteAtlas | null): StageArt {
  const pad = { x: -TILE * 3, y: -TILE * 3, w: stage.width + TILE * 6, h: stage.height + TILE * 6 };

  const floor = record(pad, (c) => {
    c.drawColor(Skia.Color(VOID_COLOR));
    drawFloor(c, stage, atlas);
    for(const prop of stage.props)if(PROP_KIT[prop.kind].floorDetail)drawProp(c,prop,atlas,stage);
    for (const cluster of stage.def.dressing ?? []) for (const item of cluster.items) drawDressingFloor(c, item);
    drawFloorShading(c, stage);
    if(stage.def.entryEdge){drawPortal(c,stage,true);drawPortal(c,stage,false);}
  });

  const layers: StaticLayer[] = [];
  // The two V5 rooms meet y=0. Draw the existing world rim at its exact
  // contact line; do not replace floor cells or move any interior geometry.
  if (northBoundaryColumns(stage.def).length) {
    layers.push({ sortY: 0, picture: record(pad, c => { drawWallRow(c, stage, -1, atlas); }) });
  }
  for (let r = 0; r < stage.rows; r++) {
    let any = false;
    const pic = record(pad, (c) => {
      any = drawWallRow(c, stage, r, atlas);
    });
    if (any) layers.push({ sortY: (r + 1) * TILE, picture: pic });
  }
  for (const p of stage.props) {
    const spec = PROP_KIT[p.kind];
    if(spec.floorDetail)continue;
    layers.push({
      sortY: spec.wallMounted ? p.y + 0.5 : p.sortY,
      picture: record(pad, (c) => drawProp(c, p, atlas,stage)),
    });
  }
  for (const cluster of stage.def.dressing ?? []) for (const item of cluster.items) {
    const spec = DRESSING_KIT[item.kind];
    if (spec.floorDetail) continue;
    layers.push({
      sortY: item.y * TILE + (spec.mountHeight > 0 ? 0.5 : 0),
      picture: record(pad, c => {
        const id=stage.def.chapter===2&&item.visualAssetId?item.visualAssetId:stage.def.chapter===1?({display_low:'museum_display_low',display_glass_small:'museum_display_low',pedestal_small:'museum_pedestal',pedestal_medium:'museum_pedestal',rope_barrier:'museum_rope_barrier',painting_wall:'museum_painting'} as const)[item.kind as 'display_low'|'display_glass_small'|'pedestal_small'|'pedestal_medium'|'rope_barrier'|'painting_wall']:undefined;
        // A paired, vertical portrait grouping on the three existing artwork anchors.
        // Visual only: no dressing data, physical footprint, LOS or light is altered.
        if(stage.def.id==='02-02'&&item.kind==='painting_wall'&&atlas?.gallery_portrait_frame_a&&atlas?.gallery_portrait_frame_b){
          const width=spec.drawWidth*TILE*(item.scale??1),x=item.x*TILE,y=item.y*TILE-spec.mountHeight;
          drawFrame(c,atlas.gallery_portrait_frame_a,x-width*.27,y,width*.46,false);
          drawFrame(c,atlas.gallery_portrait_frame_b,x+width*.27,y,width*.46,false);
          return;
        }
        const f=id?atlas?.[id]:null;
        if(f)drawFrame(c,f,item.x*TILE,item.y*TILE-spec.mountHeight,spec.drawWidth*TILE*(item.scale??1),!!item.flip);
        else drawDressingItem(c,item,atlas);
      }),
    });
  }
  // EXIT sign on the wall top beyond the exit.
  const sign = atlas?.exitSign;
  if (sign && stage.def.exit && !stage.def.exitEdge) {
    const ex = stage.exit;
    layers.push({
      sortY: ex.y + ex.h + TILE + 0.5,
      picture: record(pad, (c) =>
        drawFrame(c, sign, ex.x + ex.w / 2, ex.y + ex.h + TILE - WALL_HEIGHT + 20, TILE * 1.6, false),
      ),
    });
  }
  layers.sort((a, b) => a.sortY - b.sortY);

  const ambient = stage.def.ambientDarkness ?? 0.6;
  const darkness = record(pad, (c) => {
    c.drawRect(Skia.XYWHRect(pad.x, pad.y, pad.w, pad.h), fill('#03050a', ambient));
    for (const l of stage.lights) {
      const a = Math.min(0.97, 0.6 + l.intensity * 0.4);
      const r = l.radius * 1.15;
      c.drawCircle(
        l.x,
        l.y,
        r,
        radial(
          l.x,
          l.y,
          r,
          [`rgba(0,0,0,${a})`, `rgba(0,0,0,${a * 0.55})`, 'rgba(0,0,0,0)'],
          [0, 0.5, 1],
          BlendMode.DstOut,
        ),
      );
    }
  });

  const glow = record(pad, (c) => {
    if(stage.def.objectiveZone?.spotlight){
      const {x,y}=stage.objective;
      const beam=Skia.PathBuilder.Make();
      beam.moveTo(x-7,y-125);beam.lineTo(x+7,y-125);beam.lineTo(x+38,y+8);beam.lineTo(x-38,y+8);beam.close();
      c.drawPath(beam.build(),linear(0,y-125,0,y+8,['rgba(255,239,195,0.02)','rgba(255,239,195,0.13)']));
      c.save();c.translate(x,y);c.scale(1,0.45);
      c.drawCircle(0,0,42,radial(0,0,42,['rgba(255,233,177,0.22)','rgba(255,233,177,0)'],[0,1],BlendMode.Screen));
      c.restore();
    }
    for (const l of stage.lights) {
      const [r, g, b, a0] = LIGHT_RGB[l.kind];
      const a = a0 * l.intensity;
      c.drawCircle(
        l.x,
        l.y,
        l.radius,
        radial(
          l.x,
          l.y,
          l.radius,
          [`rgba(${r},${g},${b},${a})`, `rgba(${r},${g},${b},${a * 0.4})`, `rgba(${r},${g},${b},0)`],
          [0, 0.45, 1],
          BlendMode.Screen,
        ),
      );
    }
  });

  return { floor, layers, darkness, glow,exitActive:stage.def.exitEdge?record(pad,c=>drawPortal(c,stage,false,true)):undefined };
}
