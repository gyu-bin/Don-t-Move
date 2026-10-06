/** Reviewed spatial easing. Absolute authored values keep repeated bakes idempotent.
 * Guard/CCTV counts, patrol velocity, detection timing, layout and theft roles are unchanged.
 * 01-05 gains a little more approach margin; 01-08's junction guard loses 4% reach,
 * allowing the existing cautious crossing while an exposed run remains catchable.
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
export function applyDifficultyTuning(source:StageDefinition):StageDefinition{
 if(!['01-04','01-05','01-08','02-09','02-10'].includes(source.id))return source;
 const def=structuredClone(source);
 for(const g of def.guards){
  // Compact 01-04 has the chapter's largest simultaneous coverage; soften reach, keep its three roles.
  if(source.id==='01-04')g.visionRange=3.5;
  if(source.id==='01-05')g.visionRange=3.727;
  if(source.id==='01-08'&&g.id==='01-08-g2')g.visionRange=4.224;
  // Check the southern private exhibition first, then sweep back toward the
  // security crossing. The existing north post still guards the threshold;
  // the reversed circuit leaves a timed escape shoulder after the theft alarm.
  if(source.id==='02-10'&&g.id==='02-10-g7'&&g.theftSearchSectors?.[0]){
   g.theftSearchSectors[0].anchors=[
    {x:32.75,y:29.75},{x:30.25,y:27.25},{x:29.25,y:23.75},
    {x:22.25,y:17.25},{x:20.75,y:14.25},{x:20.75,y:11.75},
   ];
  }
 }
 // Keep the semantic patrol anchor and serialized route in agreement: this
 // first observation faces the lower room instead of the narrow north crossing.
 if(source.id==='01-04'){
  const guard=def.guards.find(g=>g.id==='01-04-g1');
  if(guard){guard.facing=0;guard.initialFacing=0;}
  const pause=def.patrolRoutes?.find(r=>r.id==='01-04-g1')?.points[0];
  if(pause)pause.lookDirection=0;
  const anchor=def.patrolPlan?.anchors.find(a=>a.id==='0-0');
  if(anchor)anchor.look=0;
 }
 if(source.id==='01-08'){
  const pause=def.patrolRoutes?.find(r=>r.id==='01-08-g3')?.points[1];
  if(pause)pause.lookDirection=Math.PI/2;
 }
 // Existing inspection shoulder moves toward the painting for a brief,
 // visible observation before the guard continues around the open gallery.
 if(source.id==='02-09'){
  const pause=def.patrolRoutes?.find(r=>r.id==='02-09-g3')?.points[1];
  if(pause){pause.y=26.75;pause.waitDuration=.8;pause.lookDirection=Math.atan2(.25,-.75);}
 }
 return def;
}
