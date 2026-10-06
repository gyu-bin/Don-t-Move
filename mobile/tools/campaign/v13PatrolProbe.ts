/** Authoring aid: walks every Chapter 1–4 patrol for 120 s on the real guard code and reports any step that touches collision. */
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {loadCampaign,walkPatrols} from './v13QaLib';
for(const def of loadCampaign().filter(d=>d.chapter!<=4)){
 const bad=new Set<string>();
 walkPatrols(compileStage(def),(g,_i,seconds)=>{if(bad.size<2)bad.add(`${def.id} ${g.id} at ${(g.x/TILE).toFixed(2)},${(g.y/TILE).toFixed(2)} t=${seconds.toFixed(1)}`);});
 console.log(def.id,bad.size?[...bad].join(' | '):'ok');
}
