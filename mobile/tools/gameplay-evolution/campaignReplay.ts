import { Awareness, Gait } from '../../src/game/core/types';
import { HearingPhase } from '../../src/game/guards/guardHearing';
import { BODY } from '../../src/game/guards/guardTuning';
import { campaignStages } from '../../src/game/levels/campaignStages';
import type { StageDefinition } from '../../src/game/levels/StageDefinition';
import { createPlaygroundState, stepPlayground } from '../../src/game/playground/playgroundState';
import { compileStage, TILE } from '../../src/game/world/compileStage';
import { buildNavigation } from '../../src/game/world/navigation';
import quickWitnesses from '../../docs/design/late-campaign-diversity/REVIEWED_QUICK_ESCAPES.json';
import coverWitnesses from '../campaign/v13CoverWitnesses.json';

export const REPRESENTATIVE_MISSIONS = [
  '01-01', '01-03', '02-03', '03-04', '04-04', '05-03', '06-03', '07-01', '08-04', '09-05',
] as const;

export interface RouteInputs {
  approach: number;
  escape: number;
  mode: number;
  delay: number;
  approachRunLeg?: number;
}

type Witness = { name: string; inputs: RouteInputs };
const covers: Record<string, RouteInputs | undefined> = coverWitnesses;
const quicks: Record<string, Omit<RouteInputs, 'escape'> | undefined> = quickWitnesses;
const dt = 1 / 60;

/** Replay actual tap-to-move targets. No teleport, guard override, injected perception, or door override. */
export function replayRoute(def: StageDefinition, inputs: RouteInputs, hearingEnabled: boolean) {
  const entry = def.testRoutes?.[inputs.approach]?.points;
  const exit = def.escapeRoutes?.[inputs.escape]?.points;
  if (!entry || !exit) throw new Error(`Missing authored route for ${def.id}`);
  const stage = compileStage(def);
  const navigation = buildNavigation(stage, BODY.guardRadius);
  const state = createPlaygroundState(stage, undefined, { hearingEnabled });
  state.playerMode = Gait.Idle;
  const bounds = { x: 0, y: 0, w: stage.width, h: stage.height };
  const points = [...entry, ...exit.slice(1)];
  const reacted = new Set<string>();
  const started = new Set<string>();
  const investigations = new Set<string>();
  const reactionModes = { sneak: 0, walk: 0, run: 0, idle: 0 };
  const phaseFrames = { chase: 0, search: 0, return: 0 };
  let leg = 1;
  let treasureAt: number | null = null;
  let hiddenAlertFrames = 0;
  let postStepUnseenLocationChanges = 0;
  let lastSeen: { x: number; y: number } | undefined;
  let firstInvestigation: { episode: string; guard: string; x: number; y: number; start: number;
    listenerTravel: number; playerSeparation: number } | undefined;

  for (let frame = 0; frame < 9000 && !state.events.caught && !state.mission.complete; frame++) {
    const issued = state.t >= inputs.delay;
    if (issued) {
      state.playerMode = leg >= entry.length || leg === inputs.approachRunLeg ? Gait.Run : inputs.mode;
      state.player.tx = points[leg].x * TILE;
      state.player.ty = points[leg].y * TILE;
      state.player.hasTarget = true;
    }
    stepPlayground(state, dt, TILE, 400, 800, bounds, stage.movementBlockers, stage.visionBlockers, navigation);
    if (state.mission.treasure && treasureAt === null) treasureAt = state.t;
    for (const guard of state.guards) {
      const hearing = guard.hearing;
      if (!hearing || hearing.phase === HearingPhase.None) continue;
      reacted.add(guard.id);
      const episode = `${guard.id}/${hearing.startedAt}`;
      if (hearing.phase === HearingPhase.Investigate) {
        investigations.add(episode);
        firstInvestigation ??= { episode, guard: guard.id, x: hearing.heardX, y: hearing.heardY, start: +state.t.toFixed(2),
          listenerTravel: 0, playerSeparation: 0 };
        if (firstInvestigation.episode === episode) {
          firstInvestigation.listenerTravel = Math.max(firstInvestigation.listenerTravel, Math.hypot(guard.x - hearing.originX, guard.y - hearing.originY));
          firstInvestigation.playerSeparation = Math.max(firstInvestigation.playerSeparation, Math.hypot(state.player.x - hearing.heardX, state.player.y - hearing.heardY));
        }
      }
      if (started.has(episode)) continue;
      started.add(episode);
      const gait = state.footsteps?.last?.gait;
      if (gait === Gait.Sneak) reactionModes.sneak++;
      else if (gait === Gait.Walk) reactionModes.walk++;
      else if (gait === Gait.Run) reactionModes.run++;
      else reactionModes.idle++;
    }
    if (state.guards.some(guard => guard.awareness === Awareness.Chase)) phaseFrames.chase++;
    if (state.events.phase === 'SEARCH') phaseFrames.search++;
    if (state.events.phase === 'RETURN') phaseFrames.return++;
    if (state.events.globalAlert) {
      const { globalX: x, globalY: y } = state.events;
      if (lastSeen && !state.events.cameraSeesPlayer && !state.guards.some(guard => guard.canSee)) {
        hiddenAlertFrames++;
        if (x !== lastSeen.x || y !== lastSeen.y) postStepUnseenLocationChanges++;
      }
      lastSeen = { x, y };
    } else lastSeen = undefined;
    if (issued && Math.hypot(state.player.x - state.player.tx, state.player.y - state.player.ty) < 2 && leg < points.length - 1) leg++;
  }

  return {
    result: state.mission.complete ? 'clear' : state.events.caught ? 'caught' : 'timeout',
    time: +state.t.toFixed(2),
    treasureAt: treasureAt === null ? null : +treasureAt.toFixed(2),
    guards: stage.guards.length,
    cameras: state.securityCameras.length,
    cameraAlerts: state.events.cameraAlertRevision ?? 0,
    spottedEpisodes: state.events.spottedWhistleRevision,
    reactions: started.size,
    investigations: investigations.size,
    firstInvestigation,
    reactedGuards: reacted.size,
    reactionModes,
    phaseFrames,
    hiddenAlertFrames,
    postStepUnseenLocationChanges,
  } as const;
}

export function preservedWitnesses(id: string): Witness[] {
  if (id === '01-01') return [
    { name: 'safe/quick', inputs: { approach: 0, escape: 0, mode: Gait.Walk, delay: 0 } },
    { name: 'alternate/quick', inputs: { approach: 1, escape: 0, mode: Gait.Sneak, delay: 6 } },
    { name: 'safe/service', inputs: { approach: 0, escape: 1, mode: Gait.Walk, delay: 2 } },
    { name: 'chase/service', inputs: { approach: 0, escape: 1, mode: Gait.Run, delay: 10 } },
  ];
  const cover = covers[id];
  if (!cover) throw new Error(`Missing preserved witness for ${id}`);
  const quick = quicks[id];
  return [
    { name: 'cover', inputs: cover },
    ...(quick ? [{ name: 'quick', inputs: { ...quick, escape: 0 } }] : []),
  ];
}

/** Recent layout revisions documented neighboring phases to avoid one-frame clears. */
export function neighboringWitnesses(id: string): Witness[] {
  if (!quicks[id]) return [];
  return preservedWitnesses(id).flatMap(witness => [-0.25, 0.25]
    .filter(offset => witness.inputs.delay + offset >= 0)
    .map(offset => ({ name: `${witness.name} ${offset > 0 ? '+' : ''}${offset}s`,
      inputs: { ...witness.inputs, delay: witness.inputs.delay + offset } })));
}

function audit(stages: StageDefinition[], sampleGaits: boolean, sampleWindows: boolean) {
  return stages.map(stage => {
    const witnesses = sampleWindows ? [...preservedWitnesses(stage.id), ...neighboringWitnesses(stage.id)] : preservedWitnesses(stage.id);
    const routes = witnesses.map(({ name, inputs }) => ({
      name,
      inputs,
      before: replayRoute(stage, inputs, false),
      after: replayRoute(stage, inputs, true),
    }));
    const gaits = sampleGaits ? [Gait.Sneak, Gait.Walk, Gait.Run].map(mode => {
      const inputs = { ...routes[0].inputs, mode };
      return { inputs, before: replayRoute(stage, inputs, false), after: replayRoute(stage, inputs, true) };
    }) : undefined;
    return { id: stage.id, routes, gaits };
  });
}

if (process.argv[1]?.endsWith('/campaignReplay.ts')) {
  const args = process.argv.slice(2);
  const selected = args.filter(arg => /^\d{2}-\d{2}$/.test(arg));
  const stages = campaignStages.filter(stage => {
    if (selected.length) return selected.includes(stage.id);
    return !args.includes('--representative') || REPRESENTATIVE_MISSIONS.some(id => id === stage.id);
  });
  console.log(JSON.stringify(audit(stages, args.includes('--gaits'), args.includes('--windows')), null, 2));
}
