// Prints a V13 plan: ASCII map with column ruler, structures (footprint boxes), guard stops, cameras, hubs and vias.
import {V13_MISSIONS} from './v13Build';
import {PROP_KIT} from '../../src/game/world/propKit';
for(const id of process.argv.slice(2)){const m=V13_MISSIONS.find(m=>m.id===id)!;
 console.log(`\n== ${m.id} ${m.title}  entry ${m.entry.x},${m.entry.y} obj ${m.objective.x},${m.objective.y} exit ${m.exit.x},${m.exit.y}`);
 console.log('   '+[...m.map[0]].map((_,i)=>i%10).join(''));m.map.forEach((r,y)=>console.log(String(y).padStart(2)+' '+r));
 console.log('zones',Object.entries(m.zones).map(([k,z])=>`${k}=${z.id}${z.hub?`@${z.hub.x},${z.hub.y}`:''}`).join(' '));
 for(const s of m.structures){const k=PROP_KIT[s.kind],w=k.footprint.w*s.scale,h=k.footprint.h*s.scale;console.log(`  S ${s.name.padEnd(26)} ${s.kind}/${s.asset??'-'} @${s.x},${s.y} s${s.scale} box x${(s.x-w/2).toFixed(2)}..${(s.x+w/2).toFixed(2)} y${(k.wallMounted?s.y-h:s.y-h/2).toFixed(2)}..${(k.wallMounted?s.y:s.y+h/2).toFixed(2)} ${k.blocksMovement?'':'walk '}${k.blocksVision?'opaque':'clear'}${k.wallMounted?' wall':''} [${s.roles}]`);}
 for(const g of m.guards)console.log(`  G ${g.role}@${g.zone} ${g.stops.map(s=>`(${s.x},${s.y})→(${s.look.x},${s.look.y})w${s.wait??1.5}`).join(' ')}${g.loop?' loop':''}`);
 for(const c of m.cameras)console.log(`  C ${c.zone} @${c.at.x},${c.at.y} facing ${c.facing}`);
 for(const e of m.edges)console.log(`  E ${e.from}→${e.to} ${e.role} ${(e.via??[]).map(v=>`${v.x},${v.y}`).join(' ')}${e.door?` door@${e.door.at.x},${e.door.at.y}`:''}`);
 console.log('  cover',JSON.stringify(m.cover));
}
