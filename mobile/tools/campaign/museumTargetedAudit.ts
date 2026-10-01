/** Final audit: one existing low exhibit relocates; routes/guards/full cover remain authored. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';

export function applyMuseumTargetedAudit(s:StageDefinition):StageDefinition {
 if(s.id==='01-02'){
  const pillar=s.props.find(p=>p.kind==='pillar'&&p.x===6.4&&p.y===7.65);
  if(!pillar)throw Error('01-02 missing northwest rotunda pillar targeted by visual audit');
  // Existing approved sculpture gives the Rotunda a focal silhouette. Its real body
  // moves east enough to retain the west flank; the southern column and both routes stay.
  Object.assign(pillar,{kind:'statue',x:6.65,scale:1.3,collisionScale:1.3});
  if(s.landmark?.name==='Central Rotunda')s.landmark={...s.landmark,kind:'statue',x:6.65,y:7.65};
  for(const light of s.lights)if(light.x===6.4&&light.y===7.65)light.x=6.65;
  return s;
 }
 if(s.id!=='01-05')return s;
 const pedestal=s.props.find(p=>p.kind==='diamondPedestal'&&p.x===14&&p.y===4);
 if(!pedestal)throw Error('01-05 missing legacy pedestal targeted by visual audit');
 // Separate the legacy empty display from the statue/objective stack. Flush to the
 // east wall, above the foreground wall face, outside unchanged circulation.
 pedestal.x=15.5;pedestal.y=7.72;
 // The named chamber remains anchored to its actual objective case, not its moved empty display.
 const objectiveCase=s.props.find(p=>p.kind==='objectiveCase');
 if(!objectiveCase)throw Error('01-05 objective case missing');
 if(s.landmark?.name==='Diamond Chamber')s.landmark={...s.landmark,kind:'objectiveCase',x:objectiveCase.x,y:objectiveCase.y};
 return s;
}
