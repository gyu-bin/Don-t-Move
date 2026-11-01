/** Mission-local adjustments applied after security authoring, never inherited by derived maps. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';

type PatrolTiming = {
 guardId:string;
 role?:'objective';
 point:number;
 x:number;
 y:number;
 before:number;
 after:number;
 label:string;
 why:string;
};

export const COMPOSE_PATROL_TIMINGS:Readonly<Record<string,PatrolTiming>>={
 '02-04':{guardId:'02-04-g1',point:0,x:2.25,y:12.1,before:3,after:4.5,label:'Crossing guard first stop',why:'Provide a gallery timing window without affecting derived missions'},
 '03-03':{guardId:'03-03-g1',point:1,x:14.5,y:4.25,before:3,after:2,label:'Sorting-aisle guard second stop',why:'Open a patrol observation window without altering the derived Casino mission'},
 '03-04':{guardId:'03-04-g4',role:'objective',point:0,x:22.75,y:4.4,before:2,after:4,label:'Objective guard first stop',why:'Adjust the bank vault timing without altering the derived Casino mission'},
 '04-02':{guardId:'04-02-g4',role:'objective',point:0,x:12,y:13.9,before:2,after:3,label:'Objective guard first stop',why:'Adjust lab approach timing without altering derived HQ missions'},
 '09-03':{guardId:'09-03-g1',point:0,x:19.9,y:12.6,before:3,after:1,label:'Entry guard first stop',why:'Provide an approach crossing window in the vault'},
};

export function applyComposePatrolTiming(def:StageDefinition):void {
 const tuning=COMPOSE_PATROL_TIMINGS[def.id];
 if(!tuning)return;
 const guard=def.guards.find(g=>g.id===tuning.guardId&&(!tuning.role||g.role===tuning.role));
 const stop=def.patrolRoutes.find(route=>route.id===guard?.routeId)?.points[tuning.point];
 if(!stop||stop.x!==tuning.x||stop.y!==tuning.y||stop.waitDuration!==tuning.before)
  throw Error(`${def.id}: expected ${tuning.label} for the reviewed timing`);
 stop.waitDuration=tuning.after;
}
