import type { Point, RoomRole, V124bEdge } from './v124bTypes';
import type { V13Camera, V13Mission, V13Structure } from './v13Types';

type Room = [key: string, name: string, role: RoomRole, x: number, y: number, width: number, height: number, hub?: Point];
type Passage = [key: string, from: string, to: string, x: number, y: number, width: number, height: number, role?: RoomRole];
type Pier = [x: number, y: number, width: number, height: number];
type Routes = Pick<V13Mission, 'approach' | 'risk' | 'quickEscape' | 'alternateEscape'>;
type Thresholds = Record<string, NonNullable<V124bEdge['door']>>;

const point = (x: number, y: number): Point => ({ x, y });
const stop = (x: number, y: number, lookX: number, lookY: number, wait: number) => ({ x, y, look: point(lookX, lookY), wait });
const prop = (name: string, kind: V13Structure['kind'], asset: V13Structure['asset'], x: number, y: number, scale = 1): V13Structure => ({
  name, kind, asset, x, y, scale, roles: ['hiding', 'losBreak'],
});
const column = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoColumn', 'casino_column', x, y, scale);
const slots = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoSlotBank', 'casino_slot_bank', x, y, scale);
const table = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoCardTable', 'casino_card_table', x, y, scale);
const cage = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoCashierCage', 'casino_cashier_cage', x, y, scale);
const sofa = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoSofa', 'casino_sofa', x, y, scale);
const desk = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoSecurityStation', 'casino_security_station', x, y, scale);
const bar = (name: string, x: number, y: number, scale = 1) => prop(name, 'casinoBarCounter', 'casino_bar_counter', x, y, scale);
const art = (name: string, x: number, y: number): V13Structure => ({
  name, kind: 'casinoWallArt', asset: 'casino_wall_art', x, y, scale: 1, roles: ['decor'],
});
const threshold = (x: number, y: number, orientation: 'horizontal' | 'vertical', lockdown = false): NonNullable<V124bEdge['door']> => ({
  at: point(x, y), orientation, lockdown, style: 'casinoVip4d',
});
const cctv = (zone: string, x: number, y: number, facing: number, watches: string): V13Camera => ({ zone, at: point(x, y), facing, watches });

interface CasinoDraft extends Omit<V13Mission, 'map' | 'zones' | 'edges' | 'family' | 'walls'> {
  rooms: Room[];
  passages: Passage[];
  piers: Pier[];
  thresholds: Thresholds;
}

/** Rectangles and openings are authored per floor. This only draws and compiles their named chains. */
function drawCasino({ rooms, passages, piers, thresholds, ...mission }: CasinoDraft): V13Mission {
  const byRoom = new Map(rooms.map(room => [room[0], room[1]]));
  const rectangles = new Map(rooms.map(room => [room[0], room]));
  const floor: Room[] = [...rooms, ...passages.map(([key, from, to, x, y, width, height, role]): Room => [
    key, `${byRoom.get(from)} / ${byRoom.get(to)} Threshold`, role ?? 'transition', x, y, width, height,
  ])];
  const width = Math.max(...floor.map(([, , , x, , w]) => x + w)) + 1;
  const height = Math.max(...floor.map(([, , , , y, , h]) => y + h)) + 1;
  const cells = Array.from({ length: height }, () => Array<string>(width).fill('#'));
  const zones: V13Mission['zones'] = {};
  for (const [key, name, role, x, y, w, h, hub] of floor) {
    zones[key] = { id: key, name, role, purpose: name, ...(hub ? { hub } : {}) };
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      if (cells[row][col] !== '#') throw Error(`${mission.id}: overlapping ${key} at ${col},${row}`);
      cells[row][col] = key;
    }
  }
  for (const [x, y, w, h] of piers) {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) cells[row][col] = '#';
  }
  const edges: V124bEdge[] = [];
  const roomRoutes: Routes = { approach: [], risk: [], quickEscape: [], alternateEscape: [] };
  const pairKey = (a: string, b: string) => [a, b].sort().join('/');
  for (const role of ['approach', 'risk', 'quickEscape', 'alternateEscape'] as const) {
    const chain = mission[role];
    roomRoutes[role] = [chain[0]];
    for (let i = 1; i < chain.length; i++) {
      const from = chain[i - 1], to = chain[i];
      const bridge = passages.find(([, a, b]) => pairKey(from, to) === pairKey(a, b));
      if (!bridge) throw Error(`${mission.id}: missing passage ${from}–${to}`);
      const [opening, , , x, y, width, height] = bridge;
      const shoulder = (key: string): Point => {
        const [, , , rx, ry, rw, rh] = rectangles.get(key)!;
        if (x + width === rx) return point(rx + 1, y + height / 2);
        if (rx + rw === x) return point(rx + rw - 1, y + height / 2);
        if (y + height === ry) return point(x + width / 2, ry + 1);
        if (ry + rh === y) return point(x + width / 2, ry + rh - 1);
        throw Error(`${mission.id}: passage ${opening} does not touch ${key}`);
      };
      roomRoutes[role].push(opening, to);
      for (const [a, b] of [[from, opening], [opening, to]]) {
        if (edges.some(edge => edge.from === a && edge.to === b && edge.role === role)) continue;
        const door = thresholds[opening];
        const alreadyPlaced = edges.some(edge => edge.door && edge.door.at.x === door?.at.x && edge.door.at.y === door?.at.y);
        const at = shoulder(a === opening ? b : a);
        // Going through a door first keeps the shoulder inside the destination room.
        const via = a === opening && door && !alreadyPlaced ? [door.at, at] : [at];
        edges.push({ from: a, to: b, role, via, ...(a === opening && door && !alreadyPlaced ? { door } : {}) });
      }
    }
  }
  return {
    ...mission, ...roomRoutes, map: cells.map(row => row.join('')), zones, edges,
    family: 'Casino', objectiveAsset: 'museum_diamond_case', objectiveScale: 1.15, secureDoorStyle: 'casinoVip4d',
    walls: piers.map(([x, y], index) => ({ name: `Pier ${index + 1}`, roles: ['hiding', 'losBreak'], at: `${x},${y}` })),
  };
}

const cashierFloor = drawCasino({
  id: '05-01', title: 'Cashier Floor', topology: 'Split gaming floor with a western cash office and north shift-change bypass',
  rooms: [
    ['x', 'Street Cash Dispatch', 'escape', 1, 1, 6, 6],
    ['n', 'North Shift-Change Room', 'escape', 10, 1, 7, 6],
    ['o', 'Cashier Office', 'objective', 1, 10, 6, 6, point(2.5, 14.5)],
    ['t', 'Table Island', 'restricted', 10, 10, 7, 6, point(11.5, 13.5)],
    ['r', 'Open Slot Floor', 'restricted', 20, 10, 6, 6],
    ['w', 'Western Cage Queue', 'restricted', 1, 19, 6, 5],
    ['s', 'South Lounge', 'public', 10, 19, 7, 5],
    ['e', 'Gaming Floor Arrival', 'public', 20, 19, 6, 5, point(22.5, 21.5)],
  ],
  passages: [
    ['q', 'x', 'o', 2, 7, 3, 3, 'escape'],
    ['f', 'x', 'n', 7, 2, 3, 3, 'escape'],
    ['c', 'n', 't', 12, 7, 3, 3, 'escape'],
    ['k', 'o', 't', 7, 11, 3, 3],
    ['j', 't', 'r', 17, 11, 3, 3],
    ['b', 'e', 'r', 21, 16, 3, 3],
    ['h', 'e', 's', 17, 20, 3, 3],
    ['d', 's', 'w', 7, 20, 3, 3],
    ['a', 'w', 'o', 2, 16, 3, 3],
  ],
  piers: [[4, 12, 1, 2]],
  entry: point(24.8, 22.8), objective: point(2.4, 11.3), exit: point(2.4, 2.3),
  entryEdge: 'right', exitEdge: 'left', placement: ['bottom-right', 'left-centre', 'top-left'],
  approach: ['e', 's', 'w', 'o'], risk: ['e', 'r', 't', 'o'],
  quickEscape: ['o', 'x'], alternateEscape: ['o', 't', 'n', 'x'],
  thresholds: { a: threshold(3.5, 17.5, 'horizontal'), q: threshold(3.5, 8.5, 'horizontal', true) },
  structures: [
    sofa('Arrival Bench', 24.2, 20.7, .72), sofa('South Lounge Sofa', 13.7, 20.65, .8),
    cage('Cage Queue Screen', 4.8, 21.6, .55), slots('Open Slot Bank', 23.5, 13.65, .78),
    table('Table Island Cover', 14.5, 14, .8), desk('Shift Desk', 14.6, 4.8, .82),
    column('Dispatch Pillar', 4.7, 4.5), art('Cash Office Sign', 2.7, 10.15),
  ],
  cover: { safe: ['Arrival Bench', 'South Lounge Sofa', 'Cage Queue Screen'], risk: ['Open Slot Bank', 'Table Island Cover'], escape: ['Pier 1', 'Shift Desk', 'Dispatch Pillar'] },
  guards: [
    { role: 'restricted', zone: 'r', watches: 'The slot floor from its east shoulder', stops: [stop(24.8, 12.3, 22.5, 12.3, 2), stop(24.6, 15.2, 25.5, 15.2, 4)] },
    { role: 'crossing', zone: 't', watches: 'The table island and northern connector', stops: [stop(15.8, 11.4, 15.8, 13.8, 2), stop(15.7, 14.9, 16.8, 14.9, 4)] },
    { role: 'escape', zone: 'n', watches: 'The dispatch threshold from the shift desk', stops: [stop(15.6, 2.3, 14.6, 4.8, 2), stop(15.8, 5.8, 16.8, 5.8, 3)] },
    { role: 'objective', zone: 'o', watches: 'The jewel and then the cashier rear wall', startDelay: 2, stops: [stop(2.45, 12.6, 2.4, 11.3, 2), stop(5.8, 14.6, 6.9, 15, 5)] },
  ],
  cameras: [cctv('r', 20.5, 12.8, 0, 'The lateral cut across the slot floor'), cctv('n', 16.4, 3.6, Math.PI, 'The east-to-west shift-change room crossing')],
});

const highRollerRooms = drawCasino({
  id: '05-02', title: 'High Roller Rooms', topology: 'Nested private salons, with a rear stair and an outboard staff return',
  rooms: [
    ['e', 'Private Booking Lobby', 'public', 1, 16, 6, 6],
    ['l', 'Grand Stair Lounge', 'restricted', 1, 8, 6, 6],
    ['s', 'Service Vestibule', 'restricted', 10, 16, 7, 6],
    ['h', 'High Roller Salon', 'restricted', 10, 8, 7, 6, point(14.8, 12.2)],
    ['o', 'Private Collection Room', 'objective', 20, 8, 7, 6, point(21.6, 12.5)],
    ['q', 'South Dispatch Anteroom', 'escape', 20, 16, 7, 6],
    ['x', 'Private Car Dispatch', 'escape', 20, 24, 7, 5],
    ['u', 'Staff Landing', 'escape', 20, 1, 7, 5],
    ['v', 'Upper Linen Room', 'escape', 30, 1, 6, 6],
    ['j', 'East Staff Gallery', 'escape', 30, 10, 6, 8],
    ['k', 'Lower Service Cages', 'escape', 30, 21, 6, 8],
  ],
  passages: [
    ['a', 'e', 'l', 2, 14, 3, 2], ['b', 'l', 'h', 7, 9, 3, 3],
    ['c', 'e', 's', 7, 18, 3, 3], ['d', 's', 'h', 11, 14, 3, 2],
    ['f', 'h', 'o', 17, 11, 3, 3], ['g', 'o', 'q', 22, 14, 3, 2, 'escape'],
    ['i', 'q', 'x', 22, 22, 3, 2, 'escape'], ['m', 'o', 'u', 21, 6, 3, 2, 'escape'],
    ['n', 'u', 'v', 27, 2, 3, 3, 'escape'], ['p', 'v', 'j', 31, 7, 3, 3, 'escape'],
    ['r', 'j', 'k', 31, 18, 3, 3, 'escape'], ['t', 'k', 'x', 27, 25, 3, 3, 'escape'],
  ],
  piers: [[23, 10, 1, 2]],
  entry: point(2.3, 20.6), objective: point(25.4, 9.5), exit: point(25.5, 27.5),
  entryEdge: 'left', exitEdge: 'bottom', placement: ['bottom-left', 'top-right', 'bottom-right'],
  approach: ['e', 'l', 'h', 'o'], risk: ['e', 's', 'h', 'o'],
  quickEscape: ['o', 'q', 'x'], alternateEscape: ['o', 'u', 'v', 'j', 'k', 'x'],
  thresholds: { f: threshold(18.5, 12.5, 'vertical'), g: threshold(23.5, 15, 'horizontal', true) },
  structures: [
    sofa('Booking Banquette', 3.5, 18.5, .85), table('Grand Stair Table', 4.5, 11.9, .7),
    desk('Service Desk', 13.9, 20.1), prop('Private High Roller Table', 'casinoHighRollerTable', 'casino_high_roller_table', 13.3, 10.1, .6),
    column('Dispatch Side Pillar', 24.8, 19.7), column('Car Door Pillar', 22.3, 26.4),
    sofa('Staff Landing Bench', 24.5, 4.8, .75), column('Linen Stair Support', 34.1, 5.6),
    column('Gallery North Support', 33.4, 12.4), column('Gallery South Support', 31.1, 15.7),
    cage('South Service Cage', 34, 23.1, .82), column('Collection Return Pillar', 32.5, 27.4), art('Private Collection Plaque', 25.1, 8.2),
  ],
  cover: { safe: ['Booking Banquette', 'Grand Stair Table', 'Private High Roller Table'], risk: ['Service Desk', 'Private High Roller Table'], escape: ['Pier 1', 'Staff Landing Bench', 'Gallery North Support', 'Gallery South Support', 'South Service Cage'] },
  guards: [
    { role: 'restricted', zone: 's', watches: 'The service vestibule and crossing up to the salon', stops: [stop(15.6, 18.1, 11.7, 18.1, 2), stop(15.7, 21.1, 16.9, 21.1, 4)] },
    { role: 'restricted', zone: 'h', watches: 'The upper wall and the private table turn', stops: [stop(15.6, 9.5, 13.5, 9.8, 2), stop(15.7, 11.1, 16.9, 10.5, 4)] },
    { role: 'escape', zone: 'v', watches: 'Linen-room stock beside the staff gallery', stops: [stop(34.7, 2.8, 32.5, 2.8, 2), stop(34.8, 4.8, 35.7, 5.2, 4)] },
    { role: 'objective', zone: 'o', watches: 'Private jewel inspection and return to the west recess', startDelay: 2, stops: [stop(25.4, 10.8, 25.4, 9.5, 2), stop(21.3, 9.2, 20.2, 9.2, 6)] },
  ],
  cameras: [cctv('s', 10.8, 19, 0, 'The exposed service vestibule route'), cctv('j', 34.9, 11.1, Math.PI / 2, 'The outer staff gallery below the linen landing')],
});

const surveillanceSuite = drawCasino({
  id: '05-03', title: 'Surveillance Suite', topology: 'An observation bypass around monitored booths, then a lower switchback extraction',
  rooms: [
    ['e', 'Visitor Control Entry', 'public', 1, 1, 6, 5],
    ['a', 'Recorded Booths', 'restricted', 10, 1, 8, 5],
    ['s', 'Soundproof Waiting Room', 'restricted', 1, 9, 6, 6],
    ['t', 'Central Recording Atrium', 'restricted', 10, 9, 8, 6, point(14.2, 12.6)],
    ['o', 'Surveillance Evidence Office', 'objective', 21, 1, 7, 5, point(22.6, 4.5)],
    ['b', 'Secure Playback Room', 'escape', 21, 9, 7, 6, point(23.5, 12.4)],
    ['c', 'South Backup Storage', 'escape', 21, 18, 7, 6],
    ['v', 'Lower Cable Switchback', 'escape', 10, 18, 8, 6],
    ['x', 'Southwest Evidence Dispatch', 'escape', 1, 18, 6, 6],
  ],
  passages: [
    ['d', 'e', 'a', 7, 2, 3, 3], ['f', 'e', 's', 2, 6, 3, 3], ['g', 's', 't', 7, 11, 3, 3],
    ['h', 't', 'a', 12, 6, 3, 3], ['i', 'a', 'o', 18, 2, 3, 3],
    ['j', 'o', 'b', 22, 6, 3, 3, 'escape'], ['k', 'b', 't', 18, 11, 3, 3, 'escape'],
    ['l', 's', 'x', 2, 15, 3, 3, 'escape'], ['m', 'b', 'c', 23, 15, 3, 3, 'escape'],
    ['n', 'c', 'v', 18, 20, 3, 3, 'escape'], ['p', 'v', 'x', 7, 20, 3, 3, 'escape'],
  ],
  piers: [[24, 2, 1, 2]],
  entry: point(2.2, 2.3), objective: point(26.4, 2.2), exit: point(2.3, 19.25),
  entryEdge: 'left', exitEdge: 'left', placement: ['top-left', 'top-right', 'bottom-left'],
  approach: ['e', 's', 't', 'b', 'o'], risk: ['e', 'a', 'o'],
  quickEscape: ['o', 'b', 't', 's', 'x'], alternateEscape: ['o', 'b', 'c', 'v', 'x'],
  thresholds: { j: threshold(23.5, 7.5, 'horizontal'), k: threshold(19.5, 12.5, 'vertical', true), l: threshold(3.5, 16.5, 'horizontal', true) },
  structures: [
    sofa('Control Entry Sofa', 5.25, 4.35, .6), desk('Recording Booth Desk', 13.6, 2.85, .8),
    sofa('Soundproof Waiting Sofa', 3.7, 12.4, .64), table('Recording Atrium Table', 15.6, 11.6, .82),
    column('Atrium Turn Column', 12.4, 13.1, .78), desk('Playback Desk', 26.2, 11, .9), column('Playback Turn Pillar', 23.4, 13.9, .74),
    cage('Backup Storage Cage', 25.4, 20.8, .88), column('Cable Bend Column', 15.1, 20.3),
    column('Switchback West Column', 12.3, 22, .78), column('Evidence Dispatch Column', 3.8, 20.3), art('Evidence Placard', 26.6, 1.15),
  ],
  cover: { safe: ['Control Entry Sofa', 'Soundproof Waiting Sofa', 'Atrium Turn Column', 'Playback Desk'], risk: ['Recording Booth Desk'], escape: ['Pier 1', 'Playback Desk', 'Backup Storage Cage', 'Cable Bend Column', 'Evidence Dispatch Column'] },
  guards: [
    { role: 'restricted', zone: 'a', watches: 'The booth monitor wall and the outer bank of desks', stops: [stop(16.8, 1.7, 14.5, 2.1, 2), stop(16.8, 4.8, 17.9, 4.8, 4)] },
    { role: 'crossing', zone: 't', watches: 'The isolated south end of the atrium', stops: [stop(16.7, 13.8, 12.3, 13.7, 2), stop(16.8, 13.1, 17.8, 14.5, 3)] },
    { role: 'escape', zone: 'c', watches: 'Backup case checks away from the cable-room opening', stops: [stop(26.7, 19.3, 26.7, 22, 2), stop(26.9, 22.7, 27.8, 23.4, 3)] },
    { role: 'objective', zone: 'o', watches: 'The evidence jewel and the outboard office recess', startDelay: 3, stops: [stop(26.4, 3.5, 26.4, 2.2, 2), stop(22.4, 1.8, 21.4, 1.8, 6)] },
  ],
  cameras: [cctv('a', 11.2, 3.9, 0, 'The booths along the exposed top branch'), cctv('b', 27.3, 12.7, Math.PI, 'The playback room toward the short exit cut')],
});

const rouletteExchange = drawCasino({
  id: '05-04', title: 'Roulette Exchange', topology: 'A central roulette jewel approached from opposing spokes, with two outer exchange loops',
  rooms: [
    ['e', 'Exchange Reception', 'public', 2, 1, 6, 5],
    ['w', 'West Chip Exchange', 'restricted', 2, 9, 6, 6],
    ['n', 'Upper Gaming Gallery', 'public', 11, 1, 7, 5],
    ['r', 'East Bridge Lounge', 'restricted', 21, 1, 6, 5],
    ['o', 'Roulette Jewel Floor', 'objective', 11, 9, 7, 6, point(12.5, 13.4)],
    ['a', 'Outer Cash Cage', 'restricted', 21, 9, 6, 6],
    ['f', 'West Staff Pay Room', 'escape', 2, 18, 6, 5],
    ['c', 'East Staff Cash Room', 'escape', 21, 18, 6, 5],
    ['x', 'South Chip Dispatch', 'escape', 11, 18, 7, 5],
  ],
  passages: [
    ['b', 'e', 'w', 3, 6, 3, 3], ['d', 'e', 'n', 8, 2, 3, 3], ['g', 'n', 'r', 18, 2, 3, 3],
    ['h', 'r', 'a', 22, 6, 3, 3], ['i', 'w', 'o', 8, 11, 3, 3], ['j', 'a', 'o', 18, 11, 3, 3],
    ['k', 'o', 'x', 12, 15, 3, 3, 'escape'], ['l', 'w', 'f', 3, 15, 3, 3, 'escape'],
    ['m', 'f', 'x', 8, 19, 3, 3, 'escape'], ['p', 'a', 'c', 22, 15, 3, 3, 'escape'],
    ['q', 'c', 'x', 18, 19, 3, 3, 'escape'],
  ],
  piers: [[14, 10, 1, 2]],
  entry: point(3.2, 2.3), objective: point(16.4, 10.2), exit: point(14.3, 22),
  entryEdge: 'top', exitEdge: 'bottom', placement: ['top-left', 'centre', 'bottom-centre'],
  approach: ['e', 'w', 'o'], risk: ['e', 'n', 'r', 'a', 'o'],
  quickEscape: ['o', 'x'], alternateEscape: ['o', 'a', 'c', 'x'],
  thresholds: { i: threshold(9.5, 12.5, 'vertical'), k: threshold(13.5, 16.5, 'horizontal', true) },
  structures: [
    cage('West Chip Counter', 6.4, 10.7, .78),
    table('Gaming Gallery Table', 14, 3.7), bar('East Bridge Bar', 24.2, 3.9, .66),
    column('Outer Cage Pillar', 24.9, 13.15, .82), desk('Staff Pay Desk', 5.9, 20.3, .9),
    cage('East Staff Cage', 24.8, 20.7, .9), column('Chip Dispatch Pillar', 15.8, 19.5), art('Roulette Wall Emblem', 15.6, 9.15),
  ],
  cover: { safe: ['West Chip Counter', 'Pier 1'], risk: ['Gaming Gallery Table', 'East Bridge Bar', 'Outer Cage Pillar'], escape: ['Pier 1', 'East Staff Cage', 'Chip Dispatch Pillar'] },
  guards: [
    { role: 'crossing', zone: 'w', watches: 'The far edge of the west chip counter', stops: [stop(6.9, 13.8, 6.4, 10.7, 2), stop(6.8, 14.5, 7.7, 14.5, 3)] },
    { role: 'restricted', zone: 'r', watches: 'The bridge rail beside the gaming gallery', stops: [stop(25.7, 2.4, 21.5, 2.4, 2), stop(25.7, 4.8, 26.8, 4.8, 3)] },
    { role: 'escape', zone: 'c', watches: 'The staff cage from the outer wall', stops: [stop(25.8, 19.1, 22.9, 20, 2), stop(25.8, 21.9, 26.8, 22.2, 3)] },
    { role: 'objective', zone: 'o', watches: 'The roulette jewel and the pier-side shoulder', startDelay: 2, stops: [stop(16.45, 11.4, 16.4, 10.2, 2), stop(12.3, 10.4, 11.3, 10.4, 5)] },
  ],
  cameras: [cctv('n', 17.2, 2.8, Math.PI, 'The open bridge branch above roulette'), cctv('a', 26.4, 11.5, Math.PI, 'The outer cage across the roulette spoke')],
});

const casinoHeist = drawCasino({
  id: '05-05', title: 'Casino Heist', topology: 'A diagonal descent to the count room, with a direct cash corridor and a longer loading-yard loop',
  rooms: [
    ['e', 'Casino Promenade Arrival', 'public', 12, 1, 6, 5],
    ['r', 'East Mezzanine', 'public', 21, 1, 7, 5],
    ['t', 'Dealer Station Spine', 'restricted', 12, 9, 6, 6],
    ['v', 'Chip Verification Hall', 'restricted', 21, 9, 7, 6],
    ['o', 'Deep Count Room', 'objective', 21, 18, 7, 7, point(23.4, 22.1)],
    ['j', 'Cash Transit Corridor', 'escape', 12, 18, 6, 7],
    ['l', 'West Cash Dispatch', 'escape', 2, 18, 7, 7],
    ['x', 'West Staff Exit', 'escape', 2, 10, 7, 5],
    ['u', 'South Loading Yard', 'escape', 21, 28, 7, 5],
    ['m', 'Lower Service Arcade', 'escape', 12, 28, 6, 5],
    ['p', 'Loading Cage Return', 'escape', 2, 28, 7, 5],
  ],
  passages: [
    ['a', 'e', 't', 13, 6, 3, 3], ['b', 'e', 'r', 18, 2, 3, 3], ['c', 'r', 'v', 22, 6, 3, 3],
    ['d', 't', 'v', 18, 10, 3, 3], ['f', 'v', 'o', 22, 15, 3, 3],
    ['g', 'o', 'j', 18, 20, 3, 3, 'escape'], ['h', 'j', 'l', 9, 20, 3, 3, 'escape'],
    ['i', 'l', 'x', 3, 15, 3, 3, 'escape'], ['k', 'o', 'u', 22, 25, 3, 3, 'escape'],
    ['n', 'u', 'm', 18, 29, 3, 3, 'escape'], ['q', 'm', 'p', 9, 29, 3, 3, 'escape'],
    ['s', 'p', 'l', 3, 25, 3, 3, 'escape'],
  ],
  piers: [[24, 20, 1, 3]],
  entry: point(13.4, 2.3), objective: point(26.4, 19.4), exit: point(3.4, 11.5),
  entryEdge: 'top', exitEdge: 'left', placement: ['top-centre', 'right-centre', 'left-centre'],
  approach: ['e', 't', 'v', 'o'], risk: ['e', 'r', 'v', 'o'],
  quickEscape: ['o', 'j', 'l', 'x'], alternateEscape: ['o', 'u', 'm', 'p', 'l', 'x'],
  thresholds: { f: threshold(23.5, 16.5, 'horizontal'), g: threshold(19.5, 21.5, 'vertical', true) },
  structures: [
    slots('Mezzanine Slot Bank', 25.2, 3.1, .7),
    desk('Dealer Station', 15.4, 12.9, .7), table('Chip Verification Table', 25.6, 12.7, .85),
    column('Cash Transit Column', 15.6, 22.8), cage('West Dispatch Cage', 6.7, 22.7, .84), column('West Exit Pillar', 5.5, 12.6),
    desk('Loading Yard Desk', 25.5, 30.9), column('Lower Arcade Column', 14.6, 30.2), cage('Loading Return Cage', 5.4, 30.2, .82),
    art('Count Room Plaque', 26.4, 18.15),
  ],
  cover: { safe: ['Dealer Station', 'Chip Verification Table', 'Pier 1'], risk: ['Mezzanine Slot Bank', 'Chip Verification Table'], escape: ['Pier 1', 'Loading Yard Desk', 'Lower Arcade Column', 'Loading Return Cage', 'West Dispatch Cage'] },
  guards: [
    { role: 'restricted', zone: 't', watches: 'The dealer desk from its western wall', stops: [stop(12.85, 11.5, 15.4, 10.4, 2), stop(12.8, 13.5, 12.1, 14.6, 3)] },
    { role: 'crossing', zone: 'v', watches: 'The verification table and the right service wall', stops: [stop(26.7, 10.4, 23.6, 10.4, 2), stop(26.8, 11.5, 27.9, 11.5, 4)] },
    { role: 'escape', zone: 'p', watches: 'The loading-return cage from its outside end', stops: [stop(7.8, 29, 5, 29, 2), stop(7.8, 31.7, 8.7, 31.8, 4)] },
    { role: 'objective', zone: 'o', watches: 'The deep jewel and the far side of the count-room pier', startDelay: 2, stops: [stop(26.4, 20.8, 26.4, 19.4, 2), stop(22, 19.5, 21.2, 19.5, 6)] },
  ],
  cameras: [cctv('r', 26.9, 2.4, Math.PI, 'The exposed mezzanine branch from its outer wall'), cctv('m', 17.2, 30.5, Math.PI, 'The lower service arcade at the second loading turn')],
});

export const V13_CASINO_DISTINCT = [cashierFloor, highRollerRooms, surveillanceSuite, rouletteExchange, casinoHeist];
