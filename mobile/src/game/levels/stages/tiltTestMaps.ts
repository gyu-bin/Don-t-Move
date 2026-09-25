import type { GuardDef, PatrolRoute, PropDef, StageDefinition } from '../StageDefinition';

type Room = [x: number, y: number, width: number, height: number];
/** Authoring only: union floor rectangles, surround every exposed edge/corner with walls.
 * Returns ordinary StageDefinition rows; no procedural runtime level generation. */
function layout(cols: number, rows: number, rooms: Room[], islands: Room[] = []): string[] {
  const floor = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  for (const [x,y,w,h] of rooms) for (let r=y;r<y+h;r++) for(let c=x;c<x+w;c++) floor[r][c]=true;
  for (const [x,y,w,h] of islands) for (let r=y;r<y+h;r++) for(let c=x;c<x+w;c++) floor[r][c]=false;
  return floor.map((row,y) => row.map((f,x) => {
    if(f) return '.';
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(floor[y+dy]?.[x+dx]) return '#';
    return ' ';
  }).join(''));
}
const point = (x: number,y: number) => ({x,y});
function route(id: string, coords: number[][], mode: PatrolRoute['mode'] = 'pingpong'): PatrolRoute {
  return { id, mode, points: coords.map(([x,y]) => ({x,y,wait:1.2})) };
}
function guard(id: string,x: number,y: number,routeId: string,facing=0): GuardDef {
  return {id,x,y,routeId,facing,visionRange:4.6,startDelay:1.5,pace:0.85};
}
const cover = (kind: PropDef['kind'],x: number,y: number): PropDef => ({kind,x,y});
function museum(def: Omit<StageDefinition,'theme'|'lights'> & { lightPoints: number[][] }): StageDefinition {
  const {lightPoints,...data}=def;
  const objective=data.objective!;
  return {...data,theme:'museum',ambientDarkness:0.5,
    lights:[...lightPoints.map(([x,y]) => ({x,y,radius:3.5,kind:'warm' as const,intensity:0.85})),
      {x:objective.x,y:objective.y,radius:2.4,kind:'cyan',intensity:1}]};
}

/** Playable V1 stages. The old export name remains below for map tooling only. */
const foundations: StageDefinition[] = [
  museum({
    id:'museum',number:1,title:'THE MUSEUM',
    testPurpose:'매우 쉬움 · 넓은 오픈 홀과 외곽 Safe Route',
    layout:layout(24,22,[[2,2,20,18],[1,8,22,6]],[[9,8,2,4],[15,8,2,4]]),
    playerSpawn:{x:4.5,y:18.5,facing:-Math.PI/2},
    objective:{kind:'diamond',x:20.5,y:3.5}, exit:{x:3.8,y:19.1,w:1.8,h:0.7},
    props:[cover('statue',7.5,8),cover('statue',18.5,8),cover('displayCase',7,15.5),cover('bench',5.5,12.5)],
    carpets:[{x:11.5,y:3,w:2,h:16}], lightPoints:[[5,4],[12,5],[19,4],[5,17],[19,17]],
    guards:[guard('g1',10.5,6.5,'upper'),guard('g2',17.5,15,'lower',Math.PI)],
    patrolRoutes:[route('upper',[[7,6.5],[14,6.5]]),route('lower',[[12.5,15],[18.5,15]])],
    safeZones:[{x:4.5,y:18.5,radius:1.4},{x:3.5,y:10.5,radius:1.1},{x:20.5,y:18,radius:1}],
    testRoutes:[
      {name:'Safe Route',points:[point(4.5,18.5),point(3.5,18.5),point(3.5,3.5),point(20.5,3.5)]},
      {name:'Risk Route',points:[point(4.5,18.5),point(12.5,18.5),point(12.5,6.5),point(20.5,6.5),point(20.5,3.5)]},
    ],
    escapeRoutes:[{name:'Escape Route',points:[point(20.5,3.5),point(20.5,18.5),point(4.7,19.45)]}],
  }),
  museum({
    id:'corridor',number:2,title:'THE CORRIDOR',
    testPurpose:'쉬움 · 넓어진 L/S 복도와 세 개의 대기 포켓',
    layout:layout(21,24,[[1,18,8,5],[5,13,4,7],[5,11,11,4],[12,6,4,7],[8,3,8,4],[8,1,11,5],[1,11,6,4],[15,7,4,5]]),
    playerSpawn:{x:3.5,y:20.5,facing:0},objective:{kind:'diamond',x:17,y:2.5},exit:{x:2.2,y:21,w:0.7,h:1.2},
    props:[cover('crate',3.2,20),cover('bench',3.2,13.8),cover('displayCase',10.5,11.8),cover('statue',17.2,10.8)],
    lightPoints:[[3.5,20],[6.5,15],[3,13],[10,13],[14,9],[17,9],[12,4],[17,2.5]],
    guards:[guard('g1',11.5,4.5,'landing',0),guard('g2',14,8,'upper',Math.PI/2),guard('g3',8.5,13,'middle',0)],
    patrolRoutes:[route('landing',[[11.5,4.5],[15.5,4.5]]),route('upper',[[14,7],[14,10.5]]),route('middle',[[8.5,13],[11.5,13]])],
    safeZones:[{x:3.5,y:20.5,radius:1.4},{x:2.8,y:12.8,radius:1},{x:17.2,y:9.5,radius:1}],
    testRoutes:[
      {name:'Safe Route',points:[point(3.5,20.5),point(6.5,20.5),point(6.5,13),point(14,13),point(14,4.5),point(17,4.5),point(17,2.5)]},
      {name:'Risk Route',points:[point(3.5,20.5),point(6.5,18.5),point(6.5,13),point(14,13),point(14,4.5),point(17,2.5)]},
    ],
    escapeRoutes:[{name:'Escape Route',points:[point(17,2.5),point(14,4.5),point(14,13),point(6.5,13),point(6.5,20.5),point(2.55,21.6)]}],
  }),
  museum({
    id:'gallery',number:3,title:'THE GALLERY',
    testPurpose:'보통 · 넓은 Ring에서 Safe/Risk 경로 선택',
    layout:layout(27,23,[[1,1,24,20],[24,9,2,5]],[[9,7,9,8]]),
    playerSpawn:{x:3.5,y:18.5,facing:-Math.PI/2},objective:{kind:'diamond',x:22.5,y:3.5},exit:{x:2.8,y:19.5,w:1.4,h:0.7},
    props:[cover('statue',8,6.5),cover('statue',19,6.5),cover('displayCase',8,16),cover('displayCase',19,16),cover('bench',24.5,12)],
    lightPoints:[[4,4],[13.5,4],[22,4],[4,18],[13.5,18],[22,18],[24.5,12]],
    guards:[guard('g1',12,4.5,'north',0),guard('g2',21,10,'east',Math.PI/2),guard('g3',14,17.5,'south',Math.PI),guard('g4',5,11,'west',-Math.PI/2)],
    patrolRoutes:[route('north',[[7,4.5],[17,4.5]]),route('east',[[21,7],[21,15]]),route('south',[[19,17.5],[9,17.5]]),route('west',[[5,15],[5,7]])],
    safeZones:[{x:3.5,y:18.5,radius:1.2},{x:4,y:4,radius:1},{x:24.5,y:10.5,radius:0.8}],
    testRoutes:[
      {name:'Safe Route',points:[point(3.5,18.5),point(4,4),point(22.5,4),point(22.5,3.5)]},
      {name:'Risk Route',points:[point(3.5,18.5),point(21,18),point(22,16),point(22.5,3.5)]},
    ],
    escapeRoutes:[{name:'Escape Route',points:[point(22.5,3.5),point(22,18),point(3.5,18.5),point(3.5,19.85)]}],
  }),
  museum({
    id:'security-wing',number:4,title:'SECURITY WING',
    testPurpose:'어려움 · 확장된 연결형 보안 구역과 Alert 탈출 공간',
    layout:layout(31,26,[[1,1,12,10],[10,5,13,16],[3,17,10,7],[20,11,10,13],[15,2,12,6],[6,9,7,10]]),
    playerSpawn:{x:5,y:22,facing:-Math.PI/2},objective:{kind:'diamond',x:4.5,y:3.5},exit:{x:4.2,y:22.8,w:1.6,h:0.7},
    props:[cover('statue',7,8),cover('displayCase',11,13),cover('crate',18.5,18.5),cover('statue',22,19),cover('crate',8,18),cover('displayCase',19,3.8),cover('bench',29,23)],
    lightPoints:[[5,4],[10,8],[17,6],[15,13],[8,20],[23,14],[27,21]],
    guards:[guard('g1',7,6,'north'),guard('g2',18,5,'upper'),guard('g3',15,12,'core',Math.PI/2),guard('g4',25,16,'east'),guard('g5',10,20,'lower',Math.PI)],
    patrolRoutes:[route('north',[[4,6],[9,6]]),route('upper',[[16,5],[24,5]]),route('core',[[15,9],[15,17]]),route('east',[[25,13],[25,21]]),route('lower',[[7,20],[12,20]])],
    safeZones:[{x:5,y:22,radius:1.2},{x:8,y:14,radius:1},{x:27,y:22,radius:1}],
    testRoutes:[
      {name:'Safe Route',points:[point(5,22),point(9.5,18.5),point(9.5,9.5),point(4.5,9.5),point(4.5,3.5)]},
      {name:'Risk Route',points:[point(5,22),point(12,19),point(21,19),point(21,6),point(16,6),point(10,6),point(4.5,3.5)]},
    ],
    escapeRoutes:[{name:'Escape Route',points:[point(4.5,3.5),point(4.5,9.5),point(9.5,9.5),point(9.5,18.5),point(5,22),point(5,23.15)]}],
  }),
  museum({
    id:'heist',number:5,title:'THE HEIST',
    testPurpose:'최고 난이도 · 다중 방/Loop와 세 가지 판단 경로',
    layout:layout(40,35,[[1,27,16,6],[2,3,6,26],[2,2,33,6],[31,3,7,18],[11,10,19,13],[6,13,8,7],[12,20,7,10],[23,20,13,11],[16,28,20,5],[28,15,10,7]]),
    playerSpawn:{x:8.5,y:30,facing:Math.PI},objective:{kind:'diamond',x:34,y:4},exit:{x:7.5,y:31.5,w:1.8,h:0.7},
    props:[cover('crate',3.5,31.5),cover('statue',7,18),cover('displayCase',13,15),cover('crate',20,11.5),cover('statue',27,20),cover('displayCase',35,17),cover('crate',27,24.5),cover('bench',18,21.5)],
    carpets:[{x:18,y:11,w:3,h:11}],lightPoints:[[8,30],[5,23],[5,15],[5,6],[14,4.5],[24,4.5],[34,4],[13,12],[21,19],[29,28],[35,16]],
    guards:[guard('g1',5,16,'west',Math.PI/2),guard('g2',15,5,'north',0),guard('g3',16,13,'main',0),guard('g4',18,20,'lower',0),guard('g5',34,12,'east',Math.PI/2),guard('g6',28,27,'south',0)],
    patrolRoutes:[route('west',[[5,8],[5,22]]),route('north',[[10,5],[22,5]]),route('main',[[15,13],[25,13]]),route('lower',[[14,20],[24,20]]),route('east',[[34,8],[34,18]]),route('south',[[24,27],[33,27]])],
    safeZones:[{x:8.5,y:30,radius:1.2},{x:5,y:25,radius:1},{x:9,y:16,radius:1},{x:33,y:29,radius:1}],
    testRoutes:[
      {name:'Safe Route',points:[point(8.5,30),point(5,30),point(5,5),point(34,5),point(34,4)]},
      {name:'Risk Route',points:[point(8.5,30),point(15,30),point(15,20),point(25,20),point(25,16),point(34,16),point(34,4)]},
    ],
    escapeRoutes:[{name:'Escape Route',points:[point(34,4),point(34,16),point(25,16),point(25,20),point(33,29),point(8.5,30),point(8.4,31.85)]}],
  }),
];

/** Chapter authoring reuses the museum kit, with distinct floor plans and patrol lessons. */
function chapterStage(base: StageDefinition, number: number, title: string,
  changes: Partial<StageDefinition> = {}): StageDefinition {
  const stage: StageDefinition = { ...base, ...changes, id: `chapter1-${number}`, number, title };
  stage.patrolRoutes = stage.patrolRoutes.map((r, i) => ({ ...r,
    mode: i % 3 === 0 ? 'waitAndLook' : i % 3 === 1 ? 'pingpong' : 'loop',
    points: r.points.map((p, j) => ({ ...p, wait: undefined,
      waitDuration: number <= 3 ? 2.3 : 1.2 + (j % 2) * 0.6,
      lookDirection: (i + j) % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
      turnDuration: 0.8 + (i % 2) * 0.2,
    })),
  }));
  stage.guards = stage.guards.map((g, i) => ({ ...g, startDelay: 1.5 + i * 0.8,
    escapePatrol: number >= 4 && i % 2 === 1
      ? { pace: 0.95, waitDuration: number >= 7 ? 0.6 : 1, lookDirection: Math.PI / 2 }
      : undefined,
  }));
  return stage;
}

export const playableStages: StageDefinition[] = [
  chapterStage(foundations[0], 1, 'THE MUSEUM'),
  chapterStage(foundations[0], 2, 'COVER HALL', {
    layout: layout(25,23,[[2,2,20,18],[1,8,23,7]],[[9,8,2,4],[15,8,2,4],[10,13,1,1]]),
    testPurpose: 'Cover와 ? · 외곽 우회와 전시물 사이 숨기',
    testRoutes: [foundations[0].testRoutes![0], {name:'Risk Route',points:[point(4.5,18.5),point(14,18.5),point(14,6.5),point(20.5,6.5),point(20.5,3.5)]}],
  }),
  chapterStage(foundations[1], 3, 'THE CORRIDOR'),
  chapterStage(foundations[2], 4, 'THE CHOICE', {
    guards: foundations[2].guards.slice(0,3),
    layout: layout(28,24,[[1,1,24,20],[24,8,3,7]],[[9,7,9,8]]),
  }),
  chapterStage(foundations[2], 5, 'RING GALLERY'),
  chapterStage(foundations[2], 6, 'CROSSING WATCH', {
    layout: layout(30,25,[[1,1,27,22],[27,8,2,8]],[[9,7,9,8]]),
    patrolRoutes: [
      route('north',[[7,4.5],[23,4.5]]),
      route('east',[[21,3],[21,16.5]]),
      route('south',[[19,17.5],[7,17.5]]),
      route('west',[[5,19],[5,7]]),
    ],
    testPurpose:'교차 Patrol · 북동쪽 교차점에서 기다린 뒤 통과',
  }),
  chapterStage(foundations[3], 7, 'THE LONG ESCAPE', {
    guards: foundations[3].guards.filter((g) => g.id !== 'g2'),
    layout: layout(32,27,[[1,1,12,10],[10,5,13,16],[3,17,10,7],[20,11,11,14],[15,2,12,6],[6,9,7,10]]),
    exit: {x:29,y:23,w:1,h:1},
    escapeRoutes: [{name:'Long Escape',points:[point(4.5,3.5),point(4.5,9.5),point(9.5,9.5),point(15,9.5),point(15,16),point(27,16),point(27,23.5),point(29.5,23.5)]}],
  }),
  chapterStage(foundations[3], 8, 'SECURITY WING'),
  chapterStage(foundations[4], 9, 'INNER MUSEUM', {
    guards: foundations[4].guards.slice(0,5),
  }),
  chapterStage(foundations[4], 10, 'THE MUSEUM HEIST', {
    layout: layout(43,37,[[1,27,16,6],[2,3,6,26],[2,2,33,6],[31,3,10,20],[11,10,19,13],[6,13,8,7],[12,20,7,10],[23,20,16,14],[16,28,23,7],[28,15,13,7]]),
  }),
];

/** Backward-compatible tooling name; these are no longer temporary test maps. */
export const tiltTestMaps = playableStages;
