/** Render persisted real states from the fixed-goal recovery probe. */
import fs from 'node:fs';
import path from 'node:path';
import {createFrameRenderer} from '../frameRenderer';

async function main(){
  const [input,out,candidate]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));
  const pair=data.pairs.find((p:{candidate:string})=>p.candidate===candidate);
  const def=data.definitions.find((d:{id:string})=>d.id===candidate).def;
  const frames=[...pair.states];
  if(pair.recovery?.reinfiltrationState)frames.push({label:'7-reinfiltration',s:pair.recovery.reinfiltrationState});
  const clear=pair.recovery?.plans.find((p:{missionClear:boolean})=>p.missionClear);
  if(clear)frames.push({label:'8-mission-clear',s:clear.endState});
  fs.mkdirSync(out,{recursive:true});const renderer=await createFrameRenderer(1.25);
  for(const f of frames)renderer.render(def,structuredClone(f.s),path.join(out,`07-01-${candidate}-fixed-${f.label}.png`));
  fs.writeFileSync(path.join(out,`07-01-${candidate}-fixed-scenes.json`),JSON.stringify({kind:'OFFLINE_PRODUCTION_RENDERER',nativeSimulator:false,source:input,
    camera:{x:-16,y:-55},scale:1.25,scenario:data.settings.scenario,initialStateHash:data.settings.initialStateHash,target:pair.target,
    frames:frames.map(f=>({label:f.label,elapsed:+(f.s.t-data.scenario.initialState.t).toFixed(4),phase:f.s.events.phase,complete:f.s.mission.complete}))},null,2)+'\n');
  console.log(`${candidate}: ${frames.length} persisted production simulation states rendered`);
}
void main();
