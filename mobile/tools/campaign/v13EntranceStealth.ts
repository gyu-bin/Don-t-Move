import type {V13Mission} from './v13Types';

/** Current entrance only. Keep the frozen Museum sources used by Warehouse intact. */
export function entranceStealth(m:V13Mission):V13Mission {
 if(m.id!=='01-01')return m;
 const positions:Record<string,{x:number;y:number}>={
  'Lobby Security Desk':{x:6.2,y:16.8},
  'Hall Column':{x:11.4,y:16.8},
  'Long Display Case':{x:15.4,y:16.6},
  'Collection Wall':{x:18.6,y:9.6},
 };
 return {...m,
  zones:{...m.zones,l:{...m.zones.l,hub:{x:3.5,y:18},purpose:'Observe behind the desk, then cross when the hall guard walks away'},
   h:{...m.zones.h,purpose:'Desk → column → case: short exposed moves between solid hiding places'},
   g:{...m.zones.g,hub:{x:15.5,y:11.5},purpose:'Wait below the exhibition partition; peek through its west opening before the collection door'}},
  structures:m.structures.map(s=>positions[s.name]?{...s,...positions[s.name],roles:[...new Set([...s.roles,'observation' as const])]}:s),
  edges:m.edges.map(e=>e.from==='hall'&&e.to==='wallGallery'&&e.role==='approach'?{...e,
   via:[{x:11.5,y:18.15},{x:15.9,y:18.4},{x:18.25,y:18.25},{x:17.5,y:13.5},{x:18,y:10.8},{x:15.6,y:11.2}]}:
   e.from==='wallGallery'&&e.to==='collection'&&e.role==='approach'?{...e,
    via:[{x:15.5,y:8},{x:17.5,y:8},{x:17.5,y:6.5}]}:e),
  guards:m.guards.map(g=>g.role==='lobby'?{...g,
   watches:'Court shortcut, desk opening, column shoulder and display-case opening; walk between checks to leave timed crossing windows',
   stops:[{x:10.25,y:11.75,look:{x:9.5,y:14.5},wait:2.5},
    {x:9,y:16,look:{x:7,y:18},wait:2},
    {x:13.1,y:15.1,look:{x:12.2,y:18.25},wait:2.5},
    {x:17.5,y:15.3,look:{x:16,y:18.2},wait:2.5}]}:
   {...g,watches:'Inspect the diamond, then the partition approach and the court opening; never know the hidden thief position',
    stops:[g.stops[0],g.stops[1],g.stops[2],
     {x:15.5,y:8.5,look:{x:16.8,y:10.8},wait:3},
     {...g.stops.at(-1)!,wait:3}]})};
}

/** Review probes, not player waypoints or hidden AI intelligence. Tile coordinates. */
export const ENTRANCE_HIDE_PROBES=[
 {name:'Desk',guard:'01-01-g1',post:{x:9,y:16},hidden:{x:6.7,y:18.15},exposed:{x:8.2,y:18.15},look:{x:7,y:18}},
 {name:'Column',guard:'01-01-g1',post:{x:13.1,y:15.1},hidden:{x:11.5,y:18.15},exposed:{x:12.8,y:18.15},look:{x:12.2,y:18.25}},
 {name:'Display case',guard:'01-01-g1',post:{x:17.5,y:15.3},hidden:{x:15.9,y:18.4},exposed:{x:17.35,y:18.3},look:{x:16,y:18.2}},
 {name:'Exhibition partition',guard:'01-01-g2',post:{x:15.5,y:8.5},hidden:{x:18,y:10.8},exposed:{x:15.6,y:11.2},look:{x:16.8,y:10.8}},
] as const;
