import type { V13Camera, V13Guard, V13Mission, V13Structure } from './v13Types';
import type { Point, RoomRole, V124bEdge } from './v124bTypes';

type Room = [id: string, name: string, role: RoomRole, x: number, y: number, width: number, height: number, hub?: Point];
type Link = [id: string, from: string, to: string, offset: number, lockdown?: boolean];
type PatrolStop = [x: number, y: number, lookX: number, lookY: number, wait: number];
type Lane = 'approach' | 'risk' | 'quickEscape' | 'alternateEscape';

interface FloorSpec {
  id: string;
  title: string;
  topology: string;
  rooms: Room[];
  links: Link[];
  entry: Point;
  objective: Point;
  exit: Point;
  entryEdge: V13Mission['entryEdge'];
  exitEdge: V13Mission['exitEdge'];
  lanes: Record<Lane, string>;
  piers: [name: string, x: number, y: number, width: number, height: number][];
  structures: V13Structure[];
  guards: V13Guard[];
  cameras: V13Camera[];
  cover: V13Mission['cover'];
}

/** Fills the drawn rooms and their authored, three-tile openings. This helper never chooses a room graph. */
export function distinctSecurityFloor(spec: FloorSpec, family: 'Security HQ' | 'Vault'): V13Mission {
  const width = Math.max(...spec.rooms.map(([, , , x, , w]) => x + w)) + 1;
  const height = Math.max(...spec.rooms.map(([, , , , y, , h]) => y + h)) + 1;
  const floor = Array.from({ length: height }, () => Array<string>(width).fill('#'));
  const zones: V13Mission['zones'] = {};
  const rooms = new Map(spec.rooms.map(room => [room[0], room]));
  const shoulders = new Map<string, Point>();
  const doors = new Map<string, NonNullable<V124bEdge['door']>>();
  const style = family === 'Vault' ? 'vaultReinforced' : 'hqSteel';
  function fill(id: string, name: string, role: RoomRole, x: number, y: number, w: number, h: number, hub?: Point) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (floor[row]?.[col] !== '#') throw Error(`${spec.id}: overlapping room ${name} at ${col},${row}`);
        floor[row][col] = id;
      }
    }
    zones[id] = { id, name, role, purpose: name, ...(hub ? { hub } : {}) };
  }
  for (const room of spec.rooms) fill(...room);
  for (const [id, from, to, offset, lockdown] of spec.links) {
    const a = rooms.get(from)!;
    const b = rooms.get(to)!;
    const west = a[3] < b[3] ? a : b;
    const east = west === a ? b : a;
    const north = a[4] < b[4] ? a : b;
    const south = north === a ? b : a;
    const name = `${a[1]} / ${b[1]} threshold`;
    if (west[3] + west[5] < east[3] && Math.max(a[4], b[4]) <= offset && Math.min(a[4] + a[6], b[4] + b[6]) >= offset + 3) {
      const x = west[3] + west[5];
      fill(id, name, 'transition', x, offset, east[3] - x, 3);
      shoulders.set(`${id}/${west[0]}`, { x: x - .9, y: offset + 1.5 });
      shoulders.set(`${id}/${east[0]}`, { x: east[3] + .9, y: offset + 1.5 });
      if (lockdown !== undefined) doors.set(id, { at: { x: (x + east[3]) / 2, y: offset + 1.5 }, orientation: 'vertical', lockdown, style });
    } else if (north[4] + north[6] < south[4] && Math.max(a[3], b[3]) <= offset && Math.min(a[3] + a[5], b[3] + b[5]) >= offset + 3) {
      const y = north[4] + north[6];
      fill(id, name, 'transition', offset, y, 3, south[4] - y);
      shoulders.set(`${id}/${north[0]}`, { x: offset + 1.5, y: y - .9 });
      shoulders.set(`${id}/${south[0]}`, { x: offset + 1.5, y: south[4] + .9 });
      if (lockdown !== undefined) doors.set(id, { at: { x: offset + 1.5, y: (y + south[4]) / 2 }, orientation: 'horizontal', lockdown, style });
    } else {
      throw Error(`${spec.id}: ${name} has no three-tile opening at offset ${offset}`);
    }
  }
  for (const [, x, y, w, h] of spec.piers) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) floor[row][col] = '#';
    }
  }

  const lanes = {
    approach: spec.lanes.approach.split(' '),
    risk: spec.lanes.risk.split(' '),
    quickEscape: spec.lanes.quickEscape.split(' '),
    alternateEscape: spec.lanes.alternateEscape.split(' '),
  };
  const edges: V124bEdge[] = [];
  for (const [role, rooms] of Object.entries(lanes) as [Lane, string[]][]) {
    for (let i = 1; i < rooms.length; i++) {
      const from = rooms[i - 1];
      const to = rooms[i];
      const entryDoor = doors.get(to);
      const door = entryDoor?.lockdown ? entryDoor : zones[to].role === 'objective' ? doors.get(from) : undefined;
      const useDoor = door && !edges.some(edge => edge.door === door);
      if (!edges.some(edge => edge.from === from && edge.to === to && edge.role === role)) {
        const shoulder = shoulders.get(`${from}/${to}`) ?? shoulders.get(`${to}/${from}`);
        const via = shoulder ? [shoulder] : [];
        if (useDoor) {
          if (entryDoor?.lockdown) via.push(door.at);
          else via.unshift(door.at);
        }
        edges.push({ from, to, role, via, ...(useDoor ? { door } : {}) });
      }
    }
  }
  const placement = (p: Point): string => {
    const row = Math.floor(p.y * 3 / height);
    const col = Math.floor(p.x * 3 / width);
    const vertical = ['top', 'centre', 'bottom'][row];
    const horizontal = ['left', 'centre', 'right'][col];
    if (vertical === 'centre') return horizontal === 'centre' ? 'centre' : `${horizontal}-centre`;
    return `${vertical}-${horizontal}`;
  };
  return {
    id: spec.id, title: spec.title, family, topology: spec.topology, layoutRevision: 2,
    map: floor.map(row => row.join('')), zones, edges, ...lanes,
    entry: spec.entry, objective: spec.objective, exit: spec.exit, entryEdge: spec.entryEdge, exitEdge: spec.exitEdge,
    placement: [placement(spec.entry), placement(spec.objective), placement(spec.exit)],
    walls: spec.piers.map(([name, x, y]) => ({ name, roles: ['hiding', 'losBreak'], at: `opaque masonry starting at ${x},${y}` })),
    structures: spec.structures, guards: spec.guards, cameras: spec.cameras, cover: spec.cover,
    ...(family === 'Vault'
      ? { secureDoorStyle: 'vaultReinforced', objectiveAsset: 'museum_diamond_case', objectiveScale: 1.15, highSecurity: false }
      : { secureDoorStyle: 'hqSteel' }),
  };
}

export function patrol(role: V13Guard['role'], zone: string, watches: string, ...stops: PatrolStop[]): V13Guard {
  return { role, zone, watches, stops: stops.map(([x, y, lookX, lookY, wait]) => ({ x, y, look: { x: lookX, y: lookY }, wait })) };
}

export function surveillance(zone: string, x: number, y: number, facing: number, watches: string): V13Camera {
  return { zone, at: { x, y }, facing, watches };
}

const rack = (name: string, x: number, y: number, scale = 1): V13Structure =>
  ({ name, x, y, scale, kind: 'labServerRack', asset: 'hq_server_row', roles: ['hiding', 'losBreak'] });
const console = (name: string, x: number, y: number, scale = 1): V13Structure =>
  ({ name, x, y, scale, kind: 'labMonitorStation', asset: 'hq_security_desk', roles: ['hiding', 'losBreak'] });

const monitoringSpine = distinctSecurityFloor({
  id: '08-01', title: 'Monitoring Spine',
  topology: 'South bridge or staggered monitoring bays; north support spine replaces the blocked local exit',
  rooms: [
    ['e', 'Southwest service arrival', 'public', 1, 17, 7, 6],
    ['s', 'Signal calibration bay', 'restricted', 1, 9, 7, 6],
    ['t', 'Upper observation booth', 'transition', 1, 1, 7, 6],
    ['n', 'North support spine', 'escape', 10, 1, 7, 6],
    ['c', 'Central relay room', 'restricted', 10, 9, 7, 6],
    ['r', 'Exposed access bridge', 'restricted', 10, 17, 7, 6],
    ['o', 'Monitoring archive', 'objective', 19, 17, 7, 6, { x: 23.7, y: 21.7 }],
    ['q', 'Local lockdown vestibule', 'escape', 19, 9, 7, 6],
    ['x', 'Northeast dispatch', 'escape', 19, 1, 7, 6],
  ],
  links: [
    ['a','e','s',2], ['b','s','c',11], ['d','c','r',11], ['f','r','o',20,false],
    ['g','e','r',18], ['h','o','q',23,true], ['i','q','x',22], ['j','c','n',13],
    ['k','n','x',2], ['l','s','t',2], ['m','t','n',3],
  ],
  entry: { x: 2.4, y: 21.1 }, objective: { x: 24.1, y: 20.2 }, exit: { x: 24.1, y: 3.5 }, entryEdge: 'bottom', exitEdge: 'right',
  lanes: {
    approach: 'e a s b c d r f o',
    risk: 'e g r f o',
    quickEscape: 'o h q i x',
    alternateEscape: 'o f r d c j n k x',
  },
  piers: [['Archive security pier', 22, 17, 1, 4]],
  structures: [
    rack('Service rack', 4.1, 20.7), console('Calibration station', 5.1, 10.7),
    rack('Observation rack', 4.1, 4.9), rack('Support row', 14, 5.1),
    console('Relay desk', 14.5, 11.1), rack('Bridge shelter', 15, 19.55, 1.2),
    rack('Vestibule locker', 20.5, 13.2), console('Dispatch desk', 22, 5.2),
  ],
  guards: [
    patrol('restricted','s','Checks the calibration rack, then watches the west arrival stairs.', [6.5,10.2,4,10.2,2], [2.1,10.2,2.1,13.4,3]),
    patrol('escape','q','Inspects the local gate from its west side and steps away from the north dispatch door.', [20.2,11.0,23,11,2], [20.2,14,20.2,16,3]),
    patrol('crossing','n','Sweeps the north support room from the south service lane.', [12.1,6.2,12.1,3,2], [15.5,6.2,17.4,4,3]),
    patrol('objective','o','Checks the archive terminal from the east wall, then turns north to the equipment panel.', [25.25,20.4,24.1,20.2,2], [25.25,18.3,26,18.3,5]),
  ],
  cameras: [
    surveillance('r', 16.6, 18.0, Math.PI, 'Watches the exposed bridge; the north relay reaches its far shoulder.'),
    surveillance('c', 10.4, 10.3, 0, 'Watches the upper half of the relay from its northwest end.'),
    surveillance('q', 25.6, 12.4, Math.PI, 'Reads the lockdown vestibule across its central lane.'),
  ],
  cover: { safe: ['Service rack','Calibration station','Relay desk'], risk: ['Bridge shelter','Archive security pier'], escape: ['Archive security pier','Support row','Dispatch desk'] },
}, 'Security HQ');

const guardNetwork = distinctSecurityFloor({
  id: '08-02', title: 'Guard Network',
  topology: 'Response junction with a southern maintenance loop and a separate overhead extraction loop',
  rooms: [
    ['e', 'West badge entry', 'public', 1, 9, 7, 6],
    ['f', 'Response dispatch', 'restricted', 10, 9, 7, 6],
    ['b', 'Observation niche', 'transition', 10, 1, 7, 6],
    ['o', 'Response network terminal', 'objective', 19, 9, 7, 6, { x: 23.7, y: 13.7 }],
    ['c', 'Upper dispatch stores', 'escape', 19, 1, 7, 6],
    ['d', 'Duty roster bridge', 'escape', 28, 1, 7, 6],
    ['h', 'East muster landing', 'escape', 28, 9, 7, 6],
    ['i', 'Maintenance bend', 'restricted', 1, 17, 7, 6],
    ['j', 'Incident relay gallery', 'restricted', 10, 17, 7, 6],
    ['k', 'Security records bay', 'restricted', 19, 17, 7, 6],
    ['x', 'East vehicle exit', 'escape', 28, 17, 7, 6],
  ],
  links: [
    ['a','e','f',10], ['g','f','o',12], ['l','f','b',11],
    ['m','e','i',3], ['n','i','j',19], ['p','j','k',18], ['q','k','o',23,false],
    ['r','o','h',11,true], ['s','h','x',31],
    ['t','o','c',23], ['u','c','d',2], ['v','d','h',29],
  ],
  entry: { x: 2.3, y: 13 }, objective: { x: 20.1, y: 12.3 }, exit: { x: 33.6, y: 21.5 }, entryEdge: 'left', exitEdge: 'right',
  lanes: { approach: 'e m i n j p k q o', risk: 'e a f g o', quickEscape: 'o r h s x', alternateEscape: 'o t c u d v h s x' },
  piers: [['Response terminal pier', 22, 9, 1, 4]],
  structures: [
    console('Badge desk', 4.6, 12.0), rack('Response shelter', 13.2, 11.8), rack('Niche monitor', 14.5, 4.6),
    console('Stores console', 20.8, 4.9), rack('Roster island', 30.6, 3.9), console('Muster desk', 33, 12.2),
    rack('Maintenance island', 1.9, 20.8), console('Incident relay table', 13.5, 20.6),
    rack('Records buffer', 22, 20.3), console('Vehicle control desk', 30.1, 21.0),
  ],
  guards: [
    patrol('restricted','f','Looks across the central dispatch then steps away toward the observation niche.', [15.6,9.8,15.6,12.8,2], [11.0,9.8,11.0,7.3,4]),
    patrol('crossing','b','Checks the observation nook and its south doorway.', [15.9,2.1,12.1,2.1,3], [11.1,2.1,12.5,6.7,3]),
    patrol('restricted','k','Inspects the records bay across the exposed south approach.', [24.7,20.2,22,20.2,2], [24.7,18.1,24.7,17,4]),
    patrol('escape','h','Watches the muster landing from the east wall, then walks away from the dispatch stairs.', [34.0,13.9,31,13.9,2], [34.0,10.4,32,9.5,4]),
    patrol('objective','o','Inspects the terminal from the east wall, then moves to its north service panel.', [20.0,11.0,20.1,12.3,2], [21.2,9.9,21.2,9,5]),
  ],
  cameras: [
    surveillance('f', 10.4, 13.9, 0, 'Sweeps the dispatch shortcut from the south counter; the maintenance branch avoids it.'),
    surveillance('c', 19.4, 5.9, 0, 'Watches the upper stores from the south shelf.'),
    surveillance('d', 34.6, 3.9, Math.PI, 'Sweeps the roster bridge before the muster landing.'),
  ],
  cover: { safe: ['Maintenance island','Incident relay table','Records buffer'], risk: ['Badge desk','Response shelter','Response terminal pier'], escape: ['Response terminal pier','Stores console','Roster island','Muster desk'] },
}, 'Security HQ');


const surveillanceJunction = distinctSecurityFloor({
  id: '08-03', title: 'Surveillance Junction',
  topology: 'Central terminal reached from the overhead surveillance sweep or the exposed south fork; north archive takes over from the west gate',
  rooms: [
    ['e', 'Southeast inspection arrival', 'public', 19, 17, 7, 6],
    ['r', 'East surveillance gallery', 'restricted', 19, 9, 7, 6],
    ['p', 'Camera review room', 'restricted', 19, 1, 7, 6],
    ['u', 'Northern analysis booth', 'restricted', 10, 1, 7, 6],
    ['t', 'Emergency archive', 'escape', 1, 1, 7, 6],
    ['x', 'West emergency exit', 'escape', 1, 9, 7, 6],
    ['o', 'Surveillance junction terminal', 'objective', 10, 9, 7, 6, { x: 14.6, y: 13.7 }],
    ['s', 'Exposed southern feed', 'restricted', 10, 17, 7, 6],
    ['d', 'Response kit alcove', 'transition', 1, 17, 7, 6],
  ],
  links: [
    ['a','e','r',21], ['b','r','p',22], ['c','p','u',3], ['f','u','o',14,false],
    ['g','e','s',19], ['h','s','o',11], ['i','o','x',11,true],
    ['j','u','t',2], ['k','t','x',3], ['l','x','d',3],
  ],
  entry: { x: 24.8, y: 21.8 }, objective: { x: 11.7, y: 12.4 }, exit: { x: 2.2, y: 13.1 }, entryEdge: 'bottom', exitEdge: 'left',
  lanes: { approach: 'e a r b p c u f o', risk: 'e g s h o', quickEscape: 'o i x', alternateEscape: 'o f u j t k x' },
  piers: [['Junction terminal pier', 13, 9, 1, 4]],
  structures: [
    rack('Arrival equipment', 22.3, 19.1), console('East viewing console', 19.95, 12.2),
    console('Camera review console', 21.9, 5.2), rack('Analysis cover row', 11.5, 5.0),
    rack('Emergency archive row', 5.9, 4.6), console('Exit control desk', 5.3, 13.2),
    rack('Feed case island', 15, 18.9), rack('Response inventory', 3.7, 20.5),
  ],
  guards: [
    patrol('restricted','r','Checks the east viewing console from the back wall and turns toward the lower steps.', [25.2,13.5,22.5,13.5,2], [25.2,10.4,23.5,8,4]),
    patrol('restricted','p','Reviews the camera display from the upper aisle.', [24.7,1.9,21.4,1.9,2], [20,1.9,18,3.9,4]),
    patrol('escape','t','Inspects archive shelves and intermittently covers the west exit stairs.', [2,2.4,4.8,2.4,2], [2,5.5,4.4,6.8,4]),
    patrol('crossing','s','Crosses the south feed on the exposed approach, away from the northern analysis booth.', [16.2,20.1,12,20.1,2], [16.2,22,18.1,21,3]),
    patrol('objective','o','Checks the terminal from the north, then examines the west indicator panel.', [11.7,10.8,11.7,12.4,2], [10.8,9.9,10,9.9,5]),
  ],
  cameras: [
    surveillance('s', 10.4, 21.1, 0, 'Sweeps the southern feed across the lower direct approach.'),
    surveillance('u', 16.6, 2.2, Math.PI, 'Observes the upper half of the analysis booth.'),
    surveillance('d', 7.6, 19.5, Math.PI, 'Monitors response inventory from the wall opposite its entry.'),
  ],
  cover: { safe: ['Arrival equipment','East viewing console','Camera review console','Analysis cover row'], risk: ['Feed case island','Junction terminal pier'], escape: ['Junction terminal pier','Emergency archive row','Exit control desk'] },
}, 'Security HQ');

const operationsBlock = distinctSecurityFloor({
  id: '08-04', title: 'Operations Block',
  topology: 'West operational horseshoe wraps into a lower terminal; a second freight crescent feeds the northeast exit after lockdown',
  rooms: [
    ['e','Northwest staff arrival','public',1,1,7,6], ['s','West routing room','restricted',1,9,7,6],
    ['c','Central operations','restricted',10,9,7,6], ['b','Power transfer','restricted',10,17,7,6],
    ['o','Operations block terminal','objective',1,17,7,6,{x:5.7,y:21.8}],
    ['t','Tactical staging','escape',19,17,7,6], ['p','Command dispatch','escape',19,9,7,6],
    ['a','Upper operations bridge','escape',19,1,7,6], ['x','Northeast gate','escape',28,1,7,6],
    ['j','South maintenance turn','escape',1,25,7,6], ['k','Freight crescent','escape',10,25,7,6],
    ['l','Cargo control','escape',19,25,7,6], ['d','East logistics','escape',28,17,7,6], ['g','Vertical logistics lift','escape',28,9,7,6],
  ],
  links: [
    ['A','e','s',3], ['B','s','c',11], ['C','c','b',12], ['D','b','o',20,false], ['E','s','o',1],
    ['F','b','t',18], ['G','t','p',20,true], ['H','p','a',23], ['I','a','x',3],
    ['J','o','j',2], ['K','j','k',26], ['L','k','l',27], ['M','l','t',22],
    ['N','t','d',20], ['O','d','g',30], ['P','g','x',31],
  ],
  entry: { x: 2.2, y: 2.4 }, objective: { x: 2.3, y: 19 }, exit: { x: 33.5, y: 3.7 }, entryEdge: 'top', exitEdge: 'right',
  lanes: { approach: 'e A s B c C b D o', risk: 'e A s E o', quickEscape: 'o D b F t G p H a I x', alternateEscape: 'o J j K k L l M t N d O g P x' },
  piers: [['Terminal protective pier',4,17,1,4]],
  structures: [
    rack('Staff arrival lockers',5.5,4.8), rack('Routing cover',4.6,13.4), console('Operations desk',14.5,10.1),
    rack('Power transfer screen',14.7,21.2), console('Staging work island',22.4,20.6), rack('Command dispatch station',20.5,12.4),
    rack('Upper bridge cover',24.2,3.15), console('Gate desk',31,5.5), rack('Maintenance turn rack',4.4,27.4),
    rack('Freight buffer',14.6,28.9), console('Cargo control desk',21.1,27.1), rack('Logistics locker',33.5,19.2),
    rack('Lift wall locker',33.5,12.2),
  ],
  guards: [
    patrol('restricted','s','Checks the routing cover from the west wall, then faces the direct terminal doorway.',[1.9,13.9,3.3,15.5,2],[1.9,10.6,1.9,8,4]),
    patrol('crossing','c','Patrols the upper edge of central operations across the east entrance.',[16.2,9.9,14,10.1,2],[11.0,9.9,10,11.9,4]),
    patrol('escape','t','Inspects staging from the lower wall, leaving the northern threshold open on alternate stops.',[24.9,22.0,22.4,20.6,2],[20.2,22.0,20.2,24.1,4]),
    patrol('objective','o','Checks the terminal, then walks north to a control point on the pier.',[3.45,19,2.3,19,2],[6.7,18.8,7.8,18.8,5]),
  ],
  cameras: [
    surveillance('b', 16.6, 19.1, Math.PI, 'Watches the exposed power transfer crossing from the east wall.'),
    surveillance('p', 25.6, 10.1, Math.PI, 'Covers the command dispatch floor without covering the logistics lift.'),
    surveillance('g', 28.4, 14.1, 0, 'Sweeps the separate logistics lift from the south landing.'),
  ],
  cover: { safe: ['Staff arrival lockers','Routing cover','Operations desk','Power transfer screen'], risk: ['Routing cover','Terminal protective pier'], escape: ['Terminal protective pier','Freight buffer','Cargo control desk','Lift wall locker'] },
}, 'Security HQ');

const commandCampus = distinctSecurityFloor({
  id: '08-05', title: 'Control Core Heist',
  topology: 'Three connected command wings around a data core, with a diagonal approach choice and an independent east freight escape',
  rooms: [
    ['a','Visitor records wing','restricted',1,1,7,6], ['e','North service entrance','public',10,1,7,6],
    ['c','Screening bridge','restricted',19,1,7,6], ['d','Supervisor suite','transition',28,1,7,6],
    ['f','West command bay','restricted',1,9,7,6], ['g','Response hall','restricted',10,9,7,6],
    ['o','Command data core','objective',19,9,7,6,{x:23.7,y:13.7}], ['i','East service lift','escape',28,9,7,6],
    ['x','Southwest comms exit','escape',1,17,7,6], ['k','Backfeed room','escape',10,17,7,6],
    ['l','Freight switchboard','escape',19,17,7,6], ['m','East freight yard','escape',28,17,7,6],
  ],
  links: [
    ['A','e','a',3], ['B','a','f',2], ['C','f','g',11], ['D','g','o',12,false],
    ['E','e','c',2], ['F','c','o',23], ['G','c','d',3], ['H','d','i',30],
    ['I','f','x',2,true], ['J','o','i',10], ['K','i','m',31], ['L','m','l',19], ['M','l','k',18], ['N','k','x',20],
  ],
  entry: {x:14.2,y:2.2}, objective: {x:24.2,y:12.5}, exit: {x:2.1,y:21.2}, entryEdge:'top', exitEdge:'left',
  lanes: {approach:'e A a B f C g D o', risk:'e E c F o', quickEscape:'o D g C f I x', alternateEscape:'o J i K m L l M k N x'},
  piers: [['Core blackout wall',22,9,1,4]],
  structures: [
    rack('Visitor file row',5.5,4.7), console('Service inspection desk',13.5,5.2), rack('Screening lockers',23.3,5.2),
    console('Supervisor station',31.2,4.7), rack('Command bay island',5.5,11.2), console('Response hall island',13.5,11.6),
    rack('East lift controller',32.3,11.5), rack('Freight yard barrier',29.8,18.8), console('Freight switchboard',22.6,20.8),
    rack('Backfeed buffer',13.5,20.5), rack('Comms exit shelves',5.6,19.7),
  ],
  guards: [
    patrol('restricted','a','Reviews the visitor file wall and occasionally faces the way down to command.',[2.0,4.0,5.1,4.0,2],[2.0,1.9,4.0,1.9,4]),
    patrol('crossing','f','Sweeps the west command bay from its upper aisle.',[7.2,9.9,5.6,11.8,2],[2.1,9.9,2.1,7.3,4]),
    patrol('escape','i','Inspects the upper service lift panel and the east doorway, then moves clear of the freight stairs.',[34.2,12.2,31.8,13,2],[34.2,10.0,33,9.2,4]),
    patrol('escape','k','Checks the backfeed buffer and southern freight line from behind the switchboard.',[13.3,22.2,13.3,20.5,2],[15.9,22.2,17.0,22.2,4]),
    patrol('objective','o','Inspects the data terminal, then turns toward its north control panel.',[25.25,12.5,24.2,12.5,2],[25.25,10.1,26,10.1,5]),
  ],
  cameras: [
    surveillance('c', 25.5, 3.8, Math.PI, 'Sweeps the screening bridge, including the short path down to the data core.'),
    surveillance('g', 10.4, 9.8, 0, 'Watches the upper response hall across its command consoles.'),
    surveillance('m', 34.6, 21.9, Math.PI, 'Sweeps the lower freight yard from its outer wall.'),
  ],
  cover: {safe:['Service inspection desk','Visitor file row','Command bay island','Response hall island'],risk:['Screening lockers','Core blackout wall'],escape:['Core blackout wall','East lift controller','Freight switchboard','Backfeed buffer']},
}, 'Security HQ');

export const V13_HQ_DISTINCT: V13Mission[] = [monitoringSpine, guardNetwork, surveillanceJunction, operationsBlock, commandCampus];
