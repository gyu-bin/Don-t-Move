import type { StageDefinition } from '../StageDefinition';

const DOWN = Math.PI / 2;
const UP = -Math.PI / 2;
const LEFT = Math.PI;

/**
 * VISUAL PLAYGROUND — a single museum gallery used to compare rendering
 * against the art reference before gameplay systems are built on top.
 * Authored in the same StageDefinition format as real stages.
 */
export const visualPlayground: StageDefinition = {
  id: 'playground-museum',
  number: 1,
  title: 'The Museum',
  theme: 'museum',
  ambientDarkness: 0.72,
  layout: [
    '   #######   ', // 0
    '   #.....#   ', // 1  diamond alcove
    '####.....####', // 2
    '#...........#', // 3
    '#...........#', // 4
    '#...........#', // 5
    '#...........#', // 6
    '#..#.....#..#', // 7  wall stubs = cover
    '#..#.....#..#', // 8
    '#...........#', // 9
    '#...........#', // 10
    '#...........#', // 11
    '####.....####', // 12
    '   #.....#   ', // 13
    '   #.....#   ', // 14
    '   ##...##   ', // 15
    '    #...#    ', // 16 exit
    '    #####    ', // 17
  ],
  carpets: [{ x: 5, y: 3.2, w: 3, h: 12.6 }],
  props: [
    // Diamond alcove
    { kind: 'diamondPedestal', x: 6.5, y: 2.55 },
    { kind: 'lamp', x: 4.6, y: 1 },
    { kind: 'lamp', x: 8.4, y: 1 },
    // Gallery walls (south-facing faces of row 2)
    { kind: 'painting', x: 1.9, y: 3 },
    { kind: 'painting', x: 11.1, y: 3 },
    { kind: 'cctv', x: 3.6, y: 3 },
    // Statues on pedestals
    { kind: 'statue', x: 1.7, y: 4.9 },
    { kind: 'statue', x: 11.3, y: 4.9, flip: true },
    // Wall-stub cover
    { kind: 'lamp', x: 3.5, y: 9 },
    { kind: 'lamp', x: 9.5, y: 9 },
    // Lower gallery
    { kind: 'displayCase', x: 11.2, y: 7.9 },
    { kind: 'bench', x: 1.7, y: 7.2 },
    { kind: 'crate', x: 1.6, y: 11.75 },
    { kind: 'crate', x: 2.55, y: 11.8, scale: 0.9 },
    { kind: 'crate', x: 1.75, y: 10.95, scale: 0.85 },
    { kind: 'plant', x: 11.4, y: 11.75 },
    { kind: 'plant', x: 3.6, y: 13.8 },
    { kind: 'plant', x: 9.4, y: 13.8, flip: true },
    { kind: 'pillar', x: 4.3, y: 3.95 },
    { kind: 'pillar', x: 8.7, y: 3.95 },
  ],
  lights: [
    { x: 6.5, y: 2.3, radius: 2.9, kind: 'cyan', intensity: 1 },
    { x: 4.6, y: 1.7, radius: 1.9, kind: 'warm', intensity: 0.8 },
    { x: 8.4, y: 1.7, radius: 1.9, kind: 'warm', intensity: 0.8 },
    { x: 1.9, y: 4.2, radius: 2.4, kind: 'warm', intensity: 0.75 },
    { x: 11.1, y: 4.2, radius: 2.4, kind: 'warm', intensity: 0.75 },
    { x: 3.5, y: 9.9, radius: 2.1, kind: 'warm', intensity: 0.8 },
    { x: 9.5, y: 9.9, radius: 2.1, kind: 'warm', intensity: 0.8 },
    { x: 6.5, y: 13.9, radius: 2.3, kind: 'warm', intensity: 0.55 },
    { x: 6.5, y: 16.4, radius: 1.7, kind: 'green', intensity: 0.8 },
  ],
  playerSpawn: { x: 6.5, y: 14.3, facing: UP },
  objective: { kind: 'diamond', x: 6.5, y: 2.55 },
  exit: { x: 5, y: 16, w: 3, h: 1 },
  guards: [
    { id: 'g1', x: 3.5, y: 5.6, facing: DOWN, routeId: 'hall', visionRange: 4.6, pace: 1 },
    {
      id: 'g2',
      x: 10.9,
      y: 10.6,
      facing: LEFT,
      routeId: 'post',
      visionRange: 4.2,
      startDelay: 1.3,
      pace: 0.85,
    },
  ],
  patrolRoutes: [
    {
      id: 'hall',
      mode: 'pingpong',
      points: [
        { x: 3.5, y: 5.6, wait: 1.4, look: DOWN },
        { x: 9.5, y: 5.6, wait: 1.8, look: DOWN },
      ],
    },
    {
      id: 'post',
      mode: 'pingpong',
      points: [
        { x: 10.9, y: 10.6, wait: 2.2, look: LEFT },
        { x: 10.9, y: 9.4, wait: 1.2, look: UP },
      ],
    },
  ],
};
