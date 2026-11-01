/** Route helpers shared by the audit bots: authored tile points → world points, legs made walkable for the body. */
import {TILE} from '../../src/game/world/compileStage';
import {findPath,clearSegment} from '../../src/game/world/navigation';
import type {Navigation} from '../../src/game/world/navigation';
import type {PlaygroundState} from '../../src/game/playground/playgroundState';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';

export type Pt = {x:number;y:number};
export const toWorld = (p:Pt):Pt => ({x:p.x*TILE,y:p.y*TILE});

/** Expand a waypoint list so every leg is walkable for the player body (authored legs are already straight). */
export function polyline(nav:Navigation, pts:Pt[]):Pt[] {
  const out:Pt[] = [pts[0]];
  for (let i=1;i<pts.length;i++){
    const a=out[out.length-1],b=pts[i];
    if (clearSegment(a.x,a.y,b.x,b.y,nav.blockers,nav.radius)) { out.push(b); continue; }
    const p=findPath(nav,a.x,a.y,b.x,b.y);
    for (let k=0;k+1<p.length;k+=2) out.push({x:p[k],y:p[k+1]});
    if (!p.length) out.push(b);
  }
  return out;
}

/** Player-caused alarms only: a guard's "spotted" whistle or a camera reaching full suspicion (theft whistles excluded). */
export const spotSignature = (s:PlaygroundState) => (s.events.spottedWhistleRevision??0)+(s.events.cameraAlertRevision??0);

/** Campaign missions always author an objective and an exit; the type keeps them optional for sandbox maps. */
export function objectiveTile(def:StageDefinition):Pt {
  if (!def.objective) throw Error(`${def.id} has no objective`);
  return def.objective;
}
export function exitCenterTile(def:StageDefinition):Pt {
  if (!def.exit) throw Error(`${def.id} has no exit`);
  return {x:def.exit.x+def.exit.w/2,y:def.exit.y+def.exit.h/2};
}
