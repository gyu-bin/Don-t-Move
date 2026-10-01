/** Offline actual-game-renderer inspection. Not a Simulator or device screenshot.
 * Run: TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/campaign/renderMuseumQA.ts
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
  const {Skia,TileMode} = require('../sprites/skiaNodeShim');
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
  const {decodeEnvironmentImages}=require('../../src/assets/environmentKit');
  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    ...decodeEnvironmentImages(decode),
    museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
    guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'),
  });
  // CAMPAIGN_JSON renders another baked campaign (e.g. the pre-density version) for comparison.
  const source: StageDefinition[] = process.env.CAMPAIGN_JSON ? JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON, 'utf8')) : campaignStages;
  const {museumDensity} = require('./museumDensity');
  const {PROP_KIT} = require('../../src/game/world/propKit');
  const finalDesign = process.env.DESIGN_OVERLAY==='1' ? require('./museumDesignOverlay') : null;
  const centralOverlay = process.env.CENTRAL_OVERLAY==='1' ? require('./museumCentralOverlay') : null;
  const securityOverlay = process.env.SECURITY_OVERLAY==='1' ? require('./museumSecurityOverlay') : null;
  const previewMissions = (process.env.PREVIEW_MISSIONS ?? '01-05,01-08,01-10').split(',');
  const definitions: StageDefinition[] = source.filter((d: StageDefinition) => /^01-(0[1-9]|10)$/.test(d.id));
  if (definitions.length !== 10) throw Error('Expected all ten Museum missions.');
  const compiled = definitions.map(d => compileStage(d));
  const mapW = Math.max(...compiled.map(s => s.width));
  const mapH = Math.max(...compiled.map(s => s.height));
  const cellW = mapW + 48, cellH = mapH + 174;
  const outDir = path.resolve(process.env.OUT_DIR ?? 'Reports/MuseumChapterV2');
  fs.mkdirSync(outDir, {recursive:true});
  const font = loadLabelFont(ck, 17), titleFont = loadLabelFont(ck, 24), smallFont = loadLabelFont(ck, 14);
  if (!font || !titleFont || !smallFont) throw Error('QA label font unavailable.');
  const paint = (color: string) => {const p = new ck.Paint();p.setColor(ck.parseColorString(color));p.setAntiAlias(true);return p;};
  const textPaint = paint('#e5edf5'), bgPaint = paint('#08131e');
  const colors = {entry:'#7effb2',objective:'#59d9ff',exit:'#b5ff77',guard:'#e5a4ff',safe:'#4ef3bb',risk:'#ffae54',cover:'#ffe8b0',landmark:'#ffffff'};
  const board = ck.MakeSurface(cellW * 5, cellH * 2 + 148)!;
  const bc = board.getCanvas();bc.clear(ck.parseColorString('#08131e'));
  bc.drawText('MUSEUM 01-01 TO 01-10 | SAME SCALE OVERVIEW',24,36,textPaint,titleFont);
  bc.drawText('Offline actual Skia renderer + QA overlays. NOT Simulator/device captures. Start positions; no playability claim.',24,64,textPaint,font);
  bc.drawText('E Entry   O Objective   X Exit   G Guard   L Landmark   A-F semantic zones',24,90,textPaint,font);
  bc.drawText(centralOverlay?'C cyan: central cover | E gold: edge cover | Green points/links: hide/nav | Red: gap proxy | Magenta: anchor LOS proxy':finalDesign?'Green: main/safe  Orange: risk  Cyan: escape  Purple: patrol | Cyan box: full cover  Gold box: LOS breaker  Green dot: escape pocket':'Green: main/safe path   Orange: risk path   Cyan: escape route   Purple: patrol   Gold box: major structure   Red fill: LOS blocker',24,116,textPaint,font);
  const gameplayMetadata: unknown[] = [];
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
    if (process.env.GAMEPLAY_PREVIEW === '1' && previewMissions.includes(d.id)) {
      const {stepPlayground} = require('../../src/game/playground/playgroundState');
      const {guardStrideContract} = require('../../src/rendering/characters/guardAnimation');
      const nav = buildNavigation(stage, BODY.guardRadius);
      // Same 9.4-tile horizontal field and world bounds as StageGame. Only the
      // input is scripted: no teleports, forced alerts or invulnerability.
      const width = 400, height = 800, zoom = width / (9.4 * 40);
      const viewW = width / zoom, viewH = height / zoom;
      const bounds = {x:0,y:-124,w:stage.width,h:stage.height+124};
      const vignette = Skia.Paint();
      vignette.setShader(Skia.Shader.MakeRadialGradient({x:width/2,y:height*.48},Math.max(width,height)*.72,
        [Skia.Color('rgba(0,0,0,0)'),Skia.Color('rgba(0,0,0,0.18)'),Skia.Color('rgba(0,0,0,0.72)')],[.45,.7,1],TileMode.Clamp));
      const gameResources = {...resources,screen:Skia.XYWHRect(0,0,width,height),zoom,vignette,
        showObjective:true,exitPosition:d.exitPosition ? {x:d.exitPosition.x*40,y:d.exitPosition.y*40}:undefined,
        guidanceInsets:{top:147,bottom:54,left:0,right:0}};
      type Scenario = {route:number;escape:number;mode:number;delay:number};
      const seeds: Record<string, Scenario> = {
        '01-05':{route:0,escape:0,mode:1,delay:0},
        '01-08':{route:0,escape:1,mode:1,delay:6},
        '01-10':{route:1,escape:0,mode:1,delay:3},
      };
      const candidates = [seeds[d.id] ?? {route:0,escape:0,mode:1,delay:0}];
      for (const route of [0,1]) for (const mode of [1,2,3]) for (const delay of [0,3,6])
        candidates.push({route,escape:0,mode,delay});
      const captured = new Set<string>();
      for (const scenario of candidates) {
        if (captured.size === 3) break;
        const entry = d.testRoutes?.[scenario.route]?.points;
        const escape = d.escapeRoutes?.[scenario.escape]?.points;
        if (!entry || !escape) continue;
        const points = [...entry,...escape.slice(1)];
        const run = createPlaygroundState(stage, guardStrideContract(ASSET_MANIFEST.characters.guard));
        run.playerMode = 0;
        const clamp = (v:number,a:number,b:number) => Math.max(a,Math.min(b,v));
        run.cam.x = bounds.w <= viewW ? bounds.x+(bounds.w-viewW)/2 : clamp(run.player.x-viewW/2,bounds.x,bounds.x+bounds.w-viewW);
        run.cam.y = bounds.h <= viewH ? bounds.y+(bounds.h-viewH)/2 : clamp(run.player.y-viewH*.52,bounds.y,bounds.y+bounds.h-viewH);
        let leg = 1;
        for (let f=0;f<9000 && !run.events.caught && !run.mission.complete;f++) {
          if (run.t >= scenario.delay) {
            run.playerMode = leg >= entry.length ? 3 : scenario.mode;
            run.player.tx = points[leg].x*40;run.player.ty = points[leg].y*40;run.player.hasTarget = true;
          }
          stepPlayground(run,1/60,40,viewW,viewH,bounds,stage.movementBlockers,stage.visionBlockers,nav);
          if (!Number.isFinite(run.player.x) || !Number.isFinite(run.player.y)) throw Error(`${d.id}: nonfinite replay player`);
          const phase = !run.mission.treasure && Math.hypot(run.player.x-stage.objective.x,run.player.y-stage.objective.y)<140
            ? 'Approach' : run.mission.treasure && run.events.globalAlert ? 'Chase'
              : run.mission.treasure && run.events.theftAlert ? 'Theft' : null;
          if (phase && !captured.has(phase) && !run.events.caught) {
            const pic = renderPlaygroundFrame(run,gameResources,false);
            const surface = ck.MakeSurface(width,height)!;
            surface.getCanvas().drawPicture(pic.ref);surface.flush();
            const file = `${d.id}-Gameplay-${phase}.png`;
            const snapshot=surface.makeImageSnapshot();
            fs.writeFileSync(path.join(outDir,file),snapshot.encodeToBytes()!);
            snapshot.delete();surface.delete();pic.dispose();captured.add(phase);
            gameplayMetadata.push({missionId:d.id,file,phase,time:run.t,scenario,treasure:run.mission.treasure,
              enginePhase:run.events.phase,globalAlert:run.events.globalAlert,camera:{...run.cam},zoom,
              player:{x:run.player.x,y:run.player.y},guards:run.guards.map((g:{id:string;x:number;y:number;awareness:number;action:number})=>({id:g.id,x:g.x,y:g.y,awareness:g.awareness,action:g.action}))});
          }
          if (run.t >= scenario.delay && Math.hypot(run.player.x-run.player.tx,run.player.y-run.player.ty)<2 && leg<points.length-1) leg++;
        }
      }
      vignette.dispose();
      gameplayMetadata.push({missionId:d.id,missing:['Approach','Theft','Chase'].filter(phase=>!captured.has(phase))});
    }
    const picture=renderPlaygroundFrame(state,resources,false);
    for(const overlay of (process.env.OVERLAY_ONLY === '1' ? [true] : [false,true])) {
      const surface=ck.MakeSurface(cellW,cellH)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
      c.drawText(`${d.id} | ${d.title}`,24,32,textPaint,titleFont);
      c.drawText(overlay?(centralOverlay?'QA: central / edge cover, hide chain, gap & exposure proxies':'QA: routes / patrol / landmarks'):'DEBUG OFF | actual game renderer, full-map overview',24,58,textPaint,smallFont);
      c.save();c.translate(24,70);c.clipRect(ck.XYWHRect(0,0,stage.width,stage.height+40),ck.ClipOp.Intersect,false);c.drawPicture(picture.ref);
      if(overlay){
        c.translate(0,40);
        if(finalDesign)finalDesign.drawMuseumDesignOverlay(ck,c,d,smallFont);
        const line=(points:{x:number;y:number}[],color:string,width:number) => {
          if(points.length<2)return;const p=new ck.PathBuilder();p.moveTo(points[0].x,points[0].y);
          points.slice(1).forEach(v=>p.lineTo(v.x,v.y));const pen=paint(color);pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(width);const pp=p.detach();c.drawPath(pp,pen);pp.delete();p.delete();pen.delete();
        };
        for(const route of d.testRoutes??[]){
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
        for(const p of d.props){
          if(finalDesign)continue;
          const k=PROP_KIT[p.kind];if(!k.blocksMovement||p.kind==='objectiveCase')continue;
          const sc=p.collisionScale??1,w=k.footprint.w*sc*40,h=k.footprint.h*sc*40,r=ck.XYWHRect(p.x*40-w/2,p.y*40-h,w,h);
          if(k.blocksVision){const f=paint('#ff4d4d55');c.drawRect(r,f);f.delete();}
          const pen=paint('#ffd36e');pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(2);c.drawRect(r,pen);pen.delete();
        }
        if(d.landmark)marker('L',d.landmark.x*40,d.landmark.y*40,colors.landmark);
        if(centralOverlay)centralOverlay.drawMuseumCentralOverlay(ck,c,d,smallFont);
        if(securityOverlay&&d.id==='01-08')securityOverlay.drawMuseumSecurityOverlay(ck,c,d,smallFont);
      }
      const m=museumDensity(d);
      c.restore();c.drawText(`Landmark: ${d.landmark?.name??'none'} | ${d.guards.length} guards | ${stage.width/40} x ${stage.height/40} tiles | major ${m.majorStructures} | LOS ${m.losBlockers} | ${m.structuresPer100Tiles}/100 tiles`,24,cellH-37,textPaint,smallFont);
      c.drawText(overlay&&centralOverlay?'C=central E=edge H=hide; green=nav hide chain; red=gap; magenta=anchor LOS proxy (not timed exposure).':'Offline capture. 1 world unit = 1 pixel. Existing sprites and lighting.',24,cellH-15,textPaint,smallFont);
      const snapshot=surface.makeImageSnapshot();
      fs.writeFileSync(path.join(outDir,`${d.id}-${overlay?'Routes-Guards':'Debug-OFF'}.png`),snapshot.encodeToBytes()!);
      if(overlay)bc.drawImage(snapshot,(index%5)*cellW,148+Math.floor(index/5)*cellH);
      snapshot.delete();surface.delete();
    }
    picture.dispose();
    resources.stage.floor.dispose();for(const l of resources.stage.layers)l.picture.dispose();resources.stage.darkness.dispose();resources.stage.glow.dispose();resources.stage.exitActive?.dispose();
  }
  fs.writeFileSync(path.join(outDir,'Museum-All10-Overview.png'),board.makeImageSnapshot().encodeToBytes()!);
  if (process.env.GAMEPLAY_PREVIEW === '1') fs.writeFileSync(path.join(outDir,'gameplay-preview.json'),JSON.stringify({method:'Offline actual renderPlaygroundFrame 400x800, StageGame 9.4-tile camera, continuous 60Hz authored route input. AI/capture enabled; no teleport or forced alert. Different bounded witness runs may supply separate phases. No debug/HUD QA overlay. Not Simulator/device.',captures:gameplayMetadata},null,2)+'\n');
  board.delete();font.delete();titleFont.delete();smallFont.delete();textPaint.delete();bgPaint.delete();
  console.log(outDir);
}
void main();
