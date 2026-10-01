/** 01-08 only: separate existing security furniture in projected game space. */
import type {PropKind, StageDefinition} from '../../src/game/levels/StageDefinition';

export const SECURITY_CLEANUP_MOVES: {kind:PropKind;from:[number,number];to:[number,number];group:string;purpose:string}[] = [
 {kind:'equipment',from:[18.6,7.85],to:[19.5,7.85],group:'C',purpose:'Separate checkpoint equipment silhouette from its access barrier; equipment remains attached to the east wall'},
 {kind:'equipment',from:[1.55,11],to:[1.5,9.8],group:'A',purpose:'Wall-side monitoring equipment no longer touches the west records shelf silhouette'},
 {kind:'partition',from:[9.1,12.1],to:[10,12.8],group:'B',purpose:'Stagger barrier southeast of central desk, leaving its raised face fully readable and preserving both desk flanks'},
 {kind:'partition',from:[12.35,16.35],to:[15.3,15.2],group:'B',purpose:'Separate evacuation barrier from desk, attach to east wall and leave the escape lane clear'},
];
export const SECURITY_CLUSTERS = [
 {id:'A',name:'Security Desk / Monitoring',regions:[{x:1,y:7,w:5,h:5},{x:7,y:9.7,w:6,h:3.3}],props:['counter:3,8.5','equipment:1.5,9.8','shelf:2.7,11.1','counter:9,10.8','equipment:12.5,12.3']},
 {id:'B',name:'Junction Control / Evacuation',regions:[{x:7,y:5,w:7,h:4.2},{x:9.2,y:11.6,w:1.6,h:1.4},{x:8,y:14,w:8,h:4}],props:['pillar:9.15,8.35','pillar:11.85,5.65','partition:10,12.8','partition:15.3,15.2','counter:11,17.1','equipment:8.7,17.85']},
 {id:'C',name:'Restricted Records / Access Checkpoint',regions:[{x:8,y:1,w:5,h:4},{x:15,y:7,w:5,h:5}],props:['shelf:8.7,1.75','displayCase:12.3,1.95','objectiveCase:10.5,2.62','partition:8.7,3.9','partition:17.65,8.65','equipment:19.5,7.85','counter:17.6,11.95']},
];
export function applyMuseumSecurityCleanup(s:StageDefinition):StageDefinition {
 if(s.id!=='01-08')return s;
 for(const move of SECURITY_CLEANUP_MOVES){
  const p=s.props.find(p=>p.kind===move.kind&&p.x===move.from[0]&&p.y===move.from[1]);
  if(!p)throw Error(`01-08: missing visual cleanup source ${move.kind} ${move.from}`);
  p.x=move.to[0];p.y=move.to[1];
 }
 // This decorative tray projected into the objective case's upper silhouette.
 // It has no movement/LOS footprint; removing it clarifies the authenticating core.
 const restricted=s.dressing?.find(c=>c.zoneId==='01-08-D');
 if(restricted)restricted.items=restricted.items.filter(p=>!(p.kind==='restoration_tray'&&p.x===10.5&&p.y===1.65));
 return s;
}
