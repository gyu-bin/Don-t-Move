/** Offline actual-game-renderer inspection. Not a Simulator or device screenshot.
 * Run: TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/campaign/renderMuseumProductionLock.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {initSkiaNode, loadLabelFont} from '../sprites/skiaNode';

async function main() {
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {campaignStages} = require('../../src/game/levels/campaignStages');
  const {compileStage} = require('../../src/game/world/compileStage');
  const {buildNavigation, findPath} = require('../../src/game/world/navigation');
  const {BODY} = require('../../src/game/guards/guardTuning');
  const {createPlaygroundState} = require('../../src/game/playground/playgroundState');
  const {buildVisionFan} = require('../../src/game/guards/guardVision');
  const {buildStageArt} = require('../../src/rendering/environment/buildStageArt');
  const {createCharacterVisual} = require('../../src/rendering/characters/characterVisual');
  const {createCharacterArt} = require('../../src/rendering/fallback/proceduralCharacter');
  const {PLAYER_PALETTE, GUARD_PALETTE} = require('../../src/rendering/fallback/characterPalettes');
  const {createConeArt} = require('../../src/rendering/effects/visionCone');
  const {createIconArt} = require('../../src/rendering/effects/alertIcons');
  const {createLightFx} = require('../../src/rendering/effects/lightFx');
  const {createDebugArt} = require('../../src/rendering/debug/guardDebug');
  const {renderPlaygroundFrame} = require('../../src/rendering/renderFrame');
  const {fill} = require('../../src/rendering/paints');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
  const assets = buildGameAssets(ASSET_MANIFEST, {
    museumAtlas: decode('assets/museum/museum_atlas.png'),
    legacyGuard: decode('assets/characters/legacy/guard_directions.png'),
    playerWalk: decode('assets/characters/player_walk.png'),
  });
  const definitions: StageDefinition[] = campaignStages.filter((d: StageDefinition) => /^01-0[1-5]$/.test(d.id));
  if (definitions.length !== 5) throw Error('Expected first five Museum missions.');
  const compiled = definitions.map(d => compileStage(d));
  const metrics = definitions.map(d => {
    const counts: Record<string, number> = {};
    for (const p of d.props) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
    const floorTiles = d.layout.join('').split('').filter(c => c === '.').length;
    const length = (points: {x:number;y:number}[]) => points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
    return {id:d.id,title:d.title,widthTiles:Math.max(...d.layout.map(r=>r.length)),heightTiles:d.layout.length,floorTiles,
      guardCount:d.guards.length,landmark:d.landmark,structure:d.structurePlan,entry:d.entryEdge,exit:d.exitEdge,
      routes:d.testRoutes?.map(r=>({name:r.name,lengthTiles:+length(r.points).toFixed(2)})),
      escape:d.escapeRoutes?.map(r=>({name:r.name,lengthTiles:+length(r.points).toFixed(2)})),
      props:counts,lights:d.lights.length,lightsPer100FloorTiles:+(100*d.lights.length/floorTiles).toFixed(2),
      guardRoles:d.guards.map(g=>({id:g.id,role:g.role,theftRole:g.theftRole})),securityZones:d.securityZones};
  });
  const mapW = Math.max(...compiled.map(s => s.width));
  const mapH = Math.max(...compiled.map(s => s.height));
  const cellW = mapW + 48, cellH = mapH + 174;
  const outDir = path.resolve('Reports/MuseumProductionLockCurrent');
  fs.mkdirSync(outDir, {recursive:true});
  const font = loadLabelFont(ck, 17), titleFont = loadLabelFont(ck, 24), smallFont = loadLabelFont(ck, 14);
  if (!font || !titleFont || !smallFont) throw Error('QA label font unavailable.');
  const paint = (color: string) => {const p = new ck.Paint();p.setColor(ck.parseColorString(color));p.setAntiAlias(true);return p;};
  const textPaint = paint('#e5edf5'), bgPaint = paint('#08131e');
  const colors = {entry:'#7effb2',objective:'#59d9ff',exit:'#b5ff77',guard:'#e5a4ff',safe:'#4ef3bb',risk:'#ffae54',cover:'#ffe8b0',landmark:'#ffffff'};
  const board = ck.MakeSurface(cellW * 5, cellH + 148)!;
  const cleanBoard = ck.MakeSurface(cellW * 5, cellH + 148)!;
  const cleanCanvas = cleanBoard.getCanvas();cleanCanvas.clear(ck.parseColorString('#08131e'));
  cleanCanvas.drawText('MUSEUM 01-01 TO 01-05 | SAME SCALE — DEBUG OFF',24,36,textPaint,titleFont);
  cleanCanvas.drawText('Offline current Skia renderer. Full-map comparison only, NOT a Simulator or device capture.',24,64,textPaint,font);
  const bc = board.getCanvas();bc.clear(ck.parseColorString('#08131e'));
  bc.drawText('MUSEUM 01-01 TO 01-05 | SAME SCALE OVERVIEW',24,36,textPaint,titleFont);
  bc.drawText('Offline actual Skia renderer + QA overlays. NOT Simulator/device captures. Start positions; no playability claim.',24,64,textPaint,font);
  bc.drawText('E Entry   O Objective   X Exit   G Guard   C Major cover   L Landmark',24,90,textPaint,font);
  bc.drawText('Green: authored main/safe path   Orange: alternate/risk path   Cyan: escape route   Purple: navigation-resolved patrol   Gold: major cover locators',24,116,textPaint,font);
  for (let index=0; index<definitions.length;index++) {
    const d=definitions[index], stage=compiled[index];
    const state=createPlaygroundState(stage);state.cam={x:0,y:-40};
    for (const g of state.guards) buildVisionFan(g,stage.visionBlockers);
    const resources={
      stage:buildStageArt(stage,assets.museum),
      player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),
      guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true)),
      cone:createConeArt(),icons:createIconArt(assets.indicators),fx:createLightFx(),
      diamond:assets.museum.diamond,diamondPos:stage.objective,
      exit:Skia.XYWHRect(stage.exit.x,stage.exit.y,stage.exit.w,stage.exit.h),
      debug:createDebugArt(null),vignette:fill('#000000',0),screen:Skia.XYWHRect(0,0,stage.width,stage.height+40),zoom:1,
    };
    const picture=renderPlaygroundFrame(state,resources,false);
    for(const overlay of [false,true]) {
      const surface=ck.MakeSurface(cellW,cellH)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
      c.drawText(`${d.id} | ${d.title}`,24,32,textPaint,titleFont);
      c.drawText(overlay?'QA: routes / patrol / landmarks':'DEBUG OFF | actual game renderer, full-map overview',24,58,textPaint,smallFont);
      c.save();c.translate(24,70);c.clipRect(ck.XYWHRect(0,0,stage.width,stage.height+40),ck.ClipOp.Intersect,false);c.drawPicture(picture.ref);
      if(overlay){
        c.translate(0,40);
        const line=(points:{x:number;y:number}[],color:string,width:number) => {
          if(points.length<2)return;const p=new ck.PathBuilder();p.moveTo(points[0].x,points[0].y);
          points.slice(1).forEach(v=>p.lineTo(v.x,v.y));const pen=paint(color);pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(width);const pp=p.detach();c.drawPath(pp,pen);pp.delete();p.delete();pen.delete();
        };
        for(const route of d.testRoutes??[]){
          if(route.name.startsWith('main:') && d.testRoutes?.some(r=>r.name.startsWith('safe:'))) continue;
          const risk=route.name.startsWith('risk:');line(route.points.map(p=>({x:p.x*40,y:p.y*40})),risk?colors.risk:colors.safe,risk?2.5:3.5);
        }
        for(const route of d.escapeRoutes??[])line(route.points.map(p=>({x:p.x*40,y:p.y*40})),'#66ddff',3);
        const nav=buildNavigation(stage,BODY.guardRadius);
        for(const g of stage.guards){
          const pts=[];for(let j=0;j<g.route.length;j++){
            const a=g.route[j],b=g.route[(j+1)%g.route.length];pts.push(a);const route=findPath(nav,a.x,a.y,b.x,b.y);
            for(let k=0;k<route.length;k+=2)pts.push({x:route[k],y:route[k+1]});
          }line(pts,'#e5a4ff99',1.5);
        }
        const marker=(name:string,x:number,y:number,color:string) => {
          const markerPaint=paint(color);c.drawCircle(x,y,5,markerPaint);
          const bx=Math.min(stage.width-name.length*10-12,Math.max(0,x+7));
          c.drawRect(ck.XYWHRect(bx,y-24,name.length*10+8,22),bgPaint);
          c.drawText(name,bx+4,y-7,markerPaint,font);markerPaint.delete();
        };
        marker('E',stage.playerSpawn.x,stage.playerSpawn.y,colors.entry);
        marker('O',stage.objective.x,stage.objective.y,colors.objective);
        marker('X',stage.exit.x+stage.exit.w/2,stage.exit.y+stage.exit.h/2,colors.exit);
        stage.guards.forEach((g:{x:number;y:number},i:number)=>marker(`G${i+1}`,g.x,g.y,colors.guard));
        const major=d.props.filter(p=>['statue','statuePedestal','displayCase','pillar','shelf','equipment','partition','counter'].includes(p.kind));
        major.forEach((p,i)=>{const pen=paint('#ffe8b099');pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(1);c.drawCircle(p.x*40,p.y*40,16,pen);pen.delete();if(i<3)marker('C',p.x*40,p.y*40,colors.cover);});
        if(d.landmark)marker('L',d.landmark.x*40,d.landmark.y*40,colors.landmark);
      }
      c.restore();c.drawText(`Landmark: ${d.landmark?.name??'none'} | ${d.guards.length} guards | ${stage.width/40} x ${stage.height/40} tiles`,24,cellH-37,textPaint,smallFont);
      c.drawText('Offline capture. 1 world unit = 1 pixel. Existing sprites and lighting.',24,cellH-15,textPaint,smallFont);
      const snapshot=surface.makeImageSnapshot();
      fs.writeFileSync(path.join(outDir,`${d.id}-${overlay?'Routes-Guards':'Debug-OFF'}.png`),snapshot.encodeToBytes()!);
      if(overlay)bc.drawImage(snapshot,(index%5)*cellW,148+Math.floor(index/5)*cellH);
      else cleanCanvas.drawImage(snapshot,index*cellW,148);
      snapshot.delete();surface.delete();
    }
    picture.dispose();
    resources.stage.floor.dispose();for(const l of resources.stage.layers)l.picture.dispose();resources.stage.darkness.dispose();resources.stage.glow.dispose();resources.stage.exitActive?.dispose();
  }
  fs.writeFileSync(path.join(outDir,'Museum-First5-Overview.png'),board.makeImageSnapshot().encodeToBytes()!);
  fs.writeFileSync(path.join(outDir,'Museum-First5-Offline-Debug-OFF.png'),cleanBoard.makeImageSnapshot().encodeToBytes()!);
  cleanBoard.delete();
  board.delete();font.delete();titleFont.delete();smallFont.delete();textPaint.delete();bgPaint.delete();
  fs.writeFileSync(path.join(outDir,'visual-structure-metrics.json'),JSON.stringify(metrics,null,2));
  console.log(outDir);
}
void main();
