import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveWithCollision } from '../../world/collision';
import { clearSegment } from '../../world/navigation';
import { createDoor, doorBlockers, doorOccupied, doorRect, stepDoor, stepDoors } from '../doorSystem';
import type { DoorDefinition } from '../doorTypes';

const definition: DoorDefinition = {
  id: 'museum-secure', type: 'solid', x: 100, y: 100,
  width: 80, thickness: 8, orientation: 'horizontal', closeDuration: 0.6,
};

test('open and closing doors allow actual player movement and LOS; closed solid door blocks both', () => {
  const door = createDoor(definition);
  for (const state of ['OPEN', 'CLOSING'] as const) {
    door.state = state;
    const geometry = doorBlockers([door]);
    const player = { x: 100, y: 75 };
    moveWithCollision(player, 0, 30, 9, geometry.movementBlockers);
    assert.equal(player.y, 105);
    assert.equal(clearSegment(100, 75, 100, 125, geometry.visionBlockers), true);
  }
  assert.equal(stepDoor(door, 0.6, true, []), true);
  assert.equal(door.state, 'CLOSED');
  const geometry = doorBlockers([door]);
  const player = { x: 100, y: 75 };
  moveWithCollision(player, 0, 30, 9, geometry.movementBlockers);
  assert.ok(player.y < 87);
  assert.equal(clearSegment(100, 75, 100, 125, geometry.visionBlockers), false);
});

test('closed glass door blocks movement but preserves CCTV/guard LOS', () => {
  const door = createDoor({ ...definition, type: 'glass', initialState: 'CLOSED' });
  const geometry = doorBlockers([door]);
  assert.equal(clearSegment(100, 75, 100, 125, geometry.movementBlockers, 9), false);
  assert.equal(clearSegment(100, 75, 100, 125, geometry.visionBlockers), true);
});

for (const orientation of ['horizontal', 'vertical'] as const) {
  test(`${orientation} door pauses for full player/guard body contact without teleport`, () => {
    const door = createDoor({ ...definition, orientation, occupancyMargin: 2 });
    const rect = doorRect(door);
    const player = { x: rect.x - 11, y: 100, radius: 9 };
    const guard = { x: 200, y: 200, radius: 10 };
    const before = { ...player };
    assert.equal(doorOccupied(door, [player, guard]), true);
    stepDoor(door, 5, true, [player, guard]);
    assert.equal(door.state, 'CLOSING');
    assert.equal(door.progress, 0);
    assert.equal(door.pausedForOccupancy, true);
    assert.deepEqual(player, before);
    player.x = 200;
    guard.x = 100; guard.y = 100;
    stepDoor(door, 5, false, [player, guard]);
    assert.equal(door.progress, 0);
    guard.x = 200;
    assert.equal(stepDoor(door, 0.3, false, [player, guard]), false);
    assert.equal(door.progress, 0.5);
    assert.equal(stepDoor(door, 0.3, false, [player, guard]), true);
    assert.equal(door.collisionRevision, 1);
  });
}

test('actor entering near the final closing tick pauses and keeps aperture open', () => {
  const door = createDoor(definition);
  stepDoor(door, 0.5, true, []);
  const player = { x: 100, y: 100, radius: 9 };
  const progress = door.progress;
  assert.equal(stepDoor(door, 2, true, [player]), false);
  assert.equal(door.progress, progress);
  assert.equal(doorBlockers([door]).movementBlockers.length, 0);
  player.y = 130;
  assert.equal(stepDoor(door, 0.1, false, [player]), true);
});

test('invalid timestep does not latch request or mutate state; repeated closure is idempotent', () => {
  const door = createDoor(definition);
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.equal(stepDoor(door, dt, true, []), false);
    assert.equal(door.state, 'OPEN');
  }
  assert.equal(stepDoor(door, 1, true, []), true);
  for (let i = 0; i < 10; i++) assert.equal(stepDoor(door, 1, true, []), false);
  assert.equal(door.collisionRevision, 1);
  assert.equal(door.progress, 1);
});

test('explicit ID requests close only intended doors; base geometry and other doors remain unchanged', () => {
  const doors = [createDoor(definition), createDoor({ ...definition, id: 'alternate', x: 300 })];
  assert.equal(stepDoors(doors, 1, ['museum-secure'], []), 1);
  assert.equal(doors[1].state, 'OPEN');
  const base = [0, 0, 5, 5];
  const geometry = doorBlockers(doors, base, base);
  assert.deepEqual(base, [0, 0, 5, 5]);
  assert.equal(geometry.movementBlockers.length, 8);
  assert.equal(geometry.visionBlockers.length, 8);
  assert.equal(stepDoors(doors, 1, ['museum-secure'], []), 0);
});

test('circle clearance handles corners and fails safe for invalid actor data', () => {
  const door = createDoor({ ...definition, occupancyMargin: 0 });
  const r = doorRect(door);
  assert.equal(doorOccupied(door, [{ x: r.x - 8, y: r.y - 8, radius: 9 }]), false);
  assert.equal(doorOccupied(door, [{ x: r.x - 6, y: r.y - 6, radius: 9 }]), true);
  assert.equal(doorOccupied(door, [{ x: NaN, y: 0, radius: 9 }]), true);
  stepDoor(door, 1, true, [{ x: 0, y: 0, radius: -1 }]);
  assert.equal(door.state, 'CLOSING');
  assert.equal(door.progress, 0);
});

test('invalid authored door geometry is rejected before worklet initialization', () => {
  for (const patch of [{ width: 0 }, { x: Infinity }, { closeDuration: 0 }, { occupancyMargin: -1 }]) {
    assert.throws(() => createDoor({ ...definition, ...patch }), /Invalid physical door/);
  }
});

test('invalid style is rejected before native rendering',()=>{
 assert.throws(()=>createDoor({...definition,style:'galleryTypo' as DoorDefinition['style']}),/Invalid physical door/);
});
