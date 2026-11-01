/** Same detected position and camera for before/after map comparisons. */
import fs from 'node:fs';
import path from 'node:path';
import {createFrameRenderer} from '../frameRenderer';
import {world} from '../v4/chaseLab';
import {bindState,invalidStart} from './experiment';
import type {Spotted} from '../v4/chaseLab';

async function main(){
  const [input,out,mission,candidate]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));
  const def=data.definitions.find((d:{mission:string;id:string})=>d.mission===mission&&d.id===candidate).def;
  const id=mission==='07-01'?'07-01:13':mission==='06-03'?'06-03:15':'08-03:5';
  const initial=data.scenarios.find((s:{id:string})=>s.id===id).initialState;
  const w=world(def),s=bindState(w,{s:initial} as Spotted).s;
  if(invalidStart(w,s).length)throw Error('Invalid shared overview state');
  fs.mkdirSync(out,{recursive:true});const renderer=await createFrameRenderer(1.25);
  renderer.render(def,s as never,path.join(out,`${mission}-${candidate}-overview.png`));
  console.log(`${mission} ${candidate}: same-state overview rendered`);
}
void main();
