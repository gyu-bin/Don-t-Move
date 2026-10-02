/** QA aid: per-mission security pressure and scripted clear rate. Not a design oracle.
 *  Usage: node --import tsx tools/campaign/securityPressure.ts > Reports/HeistV8/pressure.tsv */
import {campaignStages} from '../../src/game/levels/campaignStages';
import {exposureRun} from './cameraExposure';
console.log(['id','floorTiles','guards','cameras','guardsPer100Tiles','scriptedWins','runs','winRate','cameraAlertRuns','highSecurity'].join('\t'));
for(const def of campaignStages.filter(d=>(d.chapter??9)<=3)){
 const floor=def.layout.join('').split('').filter(c=>c==='.').length;
 let wins=0,runs=0,cam=0;
 for(let r=0;r<def.testRoutes!.length;r++)for(let e=0;e<def.escapeRoutes!.length;e++)for(const m of [1,2])for(const d of [0,.5,1,2,3]){
  const x=exposureRun(def,r,e,m,d);runs++;if(x.clear)wins++;if(x.cameraAlertAt!==null)cam++;
 }
 console.log([def.id,floor,def.guards.length,def.cameras?.length??0,(def.guards.length*100/floor).toFixed(2),wins,runs,(wins/runs).toFixed(2),cam,def.objective?.highSecurity?'yes':''].join('\t'));
}
