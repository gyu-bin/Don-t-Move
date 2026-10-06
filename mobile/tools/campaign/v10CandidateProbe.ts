import fs from 'node:fs';
import {exposureRun} from './cameraExposure';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const before=JSON.parse(fs.readFileSync('Reports/V10/campaign-before.json','utf8')) as StageDefinition[];
const rows=[];
for(const id of ['01-05','01-08'])for(const scale of [1,.96,.92]){
 const d=structuredClone(before.find(d=>d.id===id)!);
 for(const g of d.guards)if(id==='01-05'||g.id.endsWith('g2'))g.visionRange=+(g.visionRange!*scale).toFixed(3);
 const cases=id==='01-05'?[{r:1,e:0,m:1,d:0},{r:2,e:0,m:3,d:0}]:[{r:1,e:1,m:2,d:.5},{r:2,e:0,m:3,d:0},{r:1,e:1,m:1,d:0}];
 const results=cases.map(c=>({...c,...exposureRun(d,c.r,c.e,c.m,c.d)})); rows.push({id,scale,results});console.log(JSON.stringify(rows.at(-1)));
}
fs.writeFileSync('Reports/V10/candidates-g2.json',JSON.stringify(rows,null,2));
