import {Skia,TileMode,matchFont} from '@shopify/react-native-skia';
import type {SkFont,SkPaint} from '@shopify/react-native-skia';
import type {GameAssets} from '../assets/buildSprites';
import type {StageDefinition} from '../game/levels/StageDefinition';
import {TILE} from '../game/world/compileStage';
import type {CompiledStage} from '../game/world/compileStage';
import {VALUABLES} from '../game/levels/stagePresentation';
import {createDoorArt} from '../rendering/environment/doorArt';
import {createCharacterVisual} from '../rendering/characters/characterVisual';
import {createDebugArt} from '../rendering/debug/guardDebug';
import {createIconArt} from '../rendering/effects/alertIcons';
import {createLightFx} from '../rendering/effects/lightFx';
import {createConeArt} from '../rendering/effects/visionCone';
import {createCctvArt} from '../rendering/effects/cctvArt';
import {GUARD_PALETTE,PLAYER_PALETTE} from '../rendering/fallback/characterPalettes';
import {createCharacterArt} from '../rendering/fallback/proceduralCharacter';
import type {RenderResources} from '../rendering/renderFrame';
import type {prepareMission} from './preparedMission';

function debugFont(): SkFont | null {
  try {
    return matchFont({ fontFamily: 'Menlo', fontSize: 8.5 });
  } catch {
    return null;
  }
}

function makeVignette(w: number, h: number): SkPaint {
  const p = Skia.Paint();
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: w / 2, y: h * 0.48 },
      Math.max(w, h) * 0.72,
      [Skia.Color('rgba(0,0,0,0)'), Skia.Color('rgba(0,0,0,0.18)'), Skia.Color('rgba(0,0,0,0.72)')],
      [0.45, 0.7, 1],
      TileMode.Clamp,
    ),
  );
  return p;
}

/** Creates per-view drawing resources; prepared mission art remains owned by its cache. */
export function createStageRenderResources({assets,stage,prepared,definition,width,height,zoom,insets}:{
 assets:GameAssets|null; stage:CompiledStage; prepared:ReturnType<typeof prepareMission>|null;
 definition:StageDefinition; width:number; height:number; zoom:number;
 insets:{top:number;bottom:number;left:number;right:number};
}):RenderResources|null {
  if (!assets || !assets.guard) return null;
  const authoredLabCase = definition.chapter === 4 && definition.visualRevision === 'v12-4c'
    && definition.props.some(p => p.kind === 'objectiveCase' && p.visualAssetId === 'lab_sample_case');
  return {
    stage: prepared!.art,
    doors: stage.doors?.length?createDoorArt():undefined,
    player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false)),
    guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true)),
    cone: createConeArt(),
    cctv: createCctvArt(assets.museum?.cctv ?? null),
    icons: createIconArt(assets.indicators),
    fx: createLightFx(),
    diamond: authoredLabCase ? null : assets.museum?.[VALUABLES[definition.objective?.kind ?? 'diamond'].sprite] ?? null,
    objectiveGlowHeight: authoredLabCase ? 20 : undefined,
    diamondPos: stage.objective,
    exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h),
    exitPosition: definition.exitPosition ? {x:definition.exitPosition.x*TILE,y:definition.exitPosition.y*TILE} : undefined,
    guidanceInsets: {top:insets.top+100,bottom:insets.bottom+20,left:insets.left,right:insets.right},
    showObjective: true,
    debug: createDebugArt(debugFont()),
    vignette: makeVignette(width, height),
    screen: Skia.XYWHRect(0, 0, width, height),
    zoom,
  };
}
