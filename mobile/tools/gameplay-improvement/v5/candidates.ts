/** Offline v5 cover candidates, cloned from the CURRENT baked campaign; no production imports this file. */
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';

export interface CoverChange {
  propIndex:number;
  kind:string;
  asset:string|undefined;
  from:{x:number;y:number};
  to:{x:number;y:number};
  reason:string;
}
export interface SpatialCandidate {
  id:string;
  mission:string;
  label:string;
  def:StageDefinition;
  changes:CoverChange[];
}

/** Baseline first. Security, layout, glass, scale and authored routes remain byte-identical. */
export function candidatesFor(source:StageDefinition):SpatialCandidate[] {
  const base=():StageDefinition=>structuredClone(source);
  const out:SpatialCandidate[]=[{id:'baseline',mission:source.id,label:'Current production baseline',def:base(),changes:[]}];
  const add=(id:string,label:string,moves:{i:number;x?:number;y?:number;reason:string}[])=>{
    const def=base();
    const changes:CoverChange[]=moves.map(m=>{
      const p=def.props![m.i];
      const from={x:p.x,y:p.y};
      p.x=m.x??p.x; p.y=m.y??p.y;
      // topologyPlan.structures is render/debug metadata of these same placed pieces, not a new object.
      const structure=def.topologyPlan?.structures?.find(q=>q.kind===p.kind&&q.x===from.x&&q.y===from.y);
      if (structure) {structure.x=p.x;structure.y=p.y;}
      return {propIndex:m.i,kind:p.kind,asset:p.visualAssetId,from,to:{x:p.x,y:p.y},reason:m.reason};
    });
    out.push({id,mission:source.id,label,def,changes});
  };
  if(source.id==='07-01') {
    add('court-corner','Court container closer to southern turn',[
      {i:4,x:11,y:11.2,reason:'Move the existing opaque container 1 tile west and 0.85 south: permit a turn behind its southern face before the hall/court convergence; retain the north breach and both old approaches.'},
    ]);
    add('freight-screen','Lower plank screen in West Gallery',[
      {i:7,y:11,reason:'Move existing plank stack 1.015 tiles south, closer to the freight retreat; keep its v3 x=17.5 and the east camera-side lane.'},
    ]);
    add('lobby-turn','Workbench corner below the freight entry',[
      {i:0,y:15.54,reason:'Move existing lobby workbench 1.43 tiles north, flush to the existing hall wall, giving the retreat from freight a second occlusion turn before reaching the spawn-side lobby; keep spawn and all connections.'},
    ]);
  }
  if(source.id==='06-03') {
    add('bookshelf-loop','Separate the bookshelf from the lower glass',[
      {i:4,y:11.6,reason:'Move the opaque bookshelf 0.915 tiles south: leave a traversable gap between glass and shelf so a player can change sides instead of stopping at the last sighting. Preserve all five transparent panels.'},
    ]);
    add('armor-turn','Armor closer to the east patrol lane',[
      {i:5,x:9.6,y:8.6,reason:'Move existing opaque armor from the central lower-glass joint to the west edge of the eastern patrol lane: shorten the distance to genuine occlusion while keeping the glass courtyard and guard route.'},
    ]);
    add('linked-cover','Armor turn followed by bookshelf separation',[
      {i:5,x:9.6,y:8.6,reason:'Use the eastern armor corner as the first break.'},
      {i:4,y:11.6,reason:'Use the separated lower bookshelf as a second turn away from the last sighting; test whether two-stage movement avoids a blind waiting pocket.'},
    ]);
  }
  return out;
}
