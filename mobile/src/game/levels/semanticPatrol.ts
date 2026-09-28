import type { StageDefinition } from './StageDefinition';

export interface PatrolPlan {
  zones: { id: string; name: string }[];
  anchors: { id: string; zone: string; subject: string; x: number; y: number; look: number; wait: number }[];
  assignments: { guardId: string; zones: string[]; anchors: string[]; roaming: boolean }[];
}

/** Additive patrol authoring; the 45 baked maps, collision and mission data stay intact. */
export const MUSEUM_PATROL: PatrolPlan = {
  zones: [
    {id:'A',name:'Lobby threshold'}, {id:'B',name:'Gallery Recess entrance'},
    {id:'C',name:'Grand Statue'}, {id:'D',name:'First Exhibition'},
    {id:'E',name:'Objective Room'}, {id:'F',name:'Side Exit threshold'},
  ],
  anchors: [
    {id:'main-south',zone:'D',subject:'Direct exhibition crossing',x:9.7,y:10.8,look:Math.PI,wait:1.5},
    {id:'entrance',zone:'A',subject:'Lobby archway from exhibition',x:6.8,y:10.5,look:Math.PI,wait:1.1},
    {id:'main-west',zone:'C',subject:'Grand Statue eastern shoulder',x:9.5,y:7,look:Math.PI,wait:1.8},
    {id:'main-north',zone:'B',subject:'Gallery Recess archway',x:9.5,y:5.5,look:-Math.PI/2,wait:1.2},
    {id:'diamond-door',zone:'E',subject:'Case inspection from south',x:15.6,y:8,look:-Math.PI/2,wait:1.8},
    {id:'main-east',zone:'E',subject:'Direct exhibition entrance',x:12.8,y:8.5,look:Math.PI,wait:1.3},
    {id:'north-exhibit',zone:'E',subject:'Gallery Recess arrival',x:13.5,y:5.8,look:-Math.PI/2,wait:1.3},
    {id:'exit-checkpoint',zone:'F',subject:'Side Exit archway',x:16.5,y:8.8,look:0,wait:1.2},
  ],
  assignments: [
    {guardId:'01-01-g1',zones:['A','B','C','D'],anchors:['main-south','entrance','main-west','main-north'],roaming:false},
    {guardId:'01-01-g2',zones:['E','F'],anchors:['diamond-door','main-east','north-exhibit','exit-checkpoint'],roaming:false},
  ],
};

export function patrolPlan(stage: StageDefinition): PatrolPlan | undefined {
  return stage.patrolPlan ?? (stage.id === '01-01' ? MUSEUM_PATROL : undefined);
}
