/** Actual production frame renderer replay; offline whole-map evidence, without native HUD/audio/haptics. */
import fs from 'node:fs';
import path from 'node:path';
import type {PlaygroundState} from '../../../src/game/playground/playgroundState';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {Awareness} from '../../../src/game/core/types';
import {world} from '../v4/chaseLab';
import type {Scenario,Spotted} from '../v4/chaseLab';
import {createFrameRenderer} from '../frameRenderer';
import {bindState,measureRun} from './experiment';
import type {FlightStrategy} from './experiment';

async function main(){
  const [input,out,mission,candidate,scenarioId,strategy]=process.argv.slice(2);
  const data=JSON.parse(fs.readFileSync(input,'utf8'));
  const def:StageDefinition=data.definitions.find((c:{mission:string;id:string})=>c.mission===mission&&c.id===candidate).def;
  const sc:Scenario&{initialState:PlaygroundState;id:string}=data.scenarios.find((s:{id:string})=>s.id===scenarioId);
  if(!sc?.initialState)throw Error('Select a spotted scenario from experiment.json');
  const w=world(def),sp={s:sc.initialState} as Spotted,t0=sp.s.t;
  const frames:{label:string;elapsed:number;state:PlaygroundState}[]=[],labels=new Set<string>();
  const take=(label:string,s:PlaygroundState)=>{if(labels.has(label))return;labels.add(label);frames.push({label,elapsed:+(s.t-t0).toFixed(4),state:structuredClone(s)});};
  const initial=bindState(w,sp).s;take('01-detected',initial);
  let los:number|null=null;
  const metric=measureRun(w,sp,sc,strategy as FlightStrategy,{budget:data.settings.budget,reinfiltrate:true,onFrame:s=>{
    const visible=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
    if(s.guards.some(g=>g.awareness===Awareness.Chase))take('02-chase',s);
    if(s.t-t0>=0.5)take('03-first-route',s);
    if(!visible&&los===null){los=s.t;take('04-los-break',s);}
    if(los!==null&&s.t-los>=0.5&&!visible)take('05-cover-turn',s);
    if(!visible&&s.guards.some(g=>g.awareness===Awareness.Search))take('06-search',s);
    if(!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)&&!s.events.caught)take('07-calm',s);
    if(s.events.caught)take('09-caught',s);
  },onReinfiltration:s=>take('08-reinfiltration',s),onPlanEnd:s=>take('10-mission-clear',s)});
  const recorded=data.runs.find((r:{mission:string;candidate:string;scenario:string;strategy:string})=>r.mission===mission&&r.candidate===candidate&&r.scenario===scenarioId&&r.strategy===strategy);
  if(!recorded||JSON.stringify(metric)!==JSON.stringify(Object.fromEntries(Object.keys(metric).map(k=>[k,recorded[k]]))))
    throw Error('Rendered replay differs from the saved experiment metrics');
  fs.mkdirSync(out,{recursive:true});
  // One renderer per process/variant: the shared renderer caches artwork by mission ID.
  const renderer=await createFrameRenderer(1.25);
  for(const f of frames)renderer.render(def,f.state as never,path.join(out,`${mission}-${candidate}-${strategy}-${f.label}.png`));
  fs.writeFileSync(path.join(out,`${mission}-${candidate}-${strategy}.json`),JSON.stringify({kind:'OFFLINE_PRODUCTION_RENDERER',nativeSimulator:false,
    scale:1.25,camera:{x:-16,y:-55},includes:'production map/actors/cones/indicators',excludes:'native HUD,banners,audio,haptics',scenario:scenarioId,metric,
    frames:frames.map(({state,...f})=>({...f,phase:state.events.phase,player:{x:state.player.x,y:state.player.y},treasure:state.mission.treasure,complete:state.mission.complete}))},null,2)+'\n');
  console.log(`${mission} ${candidate} ${strategy}: ${frames.length} real rendered states`);
}
void main();
