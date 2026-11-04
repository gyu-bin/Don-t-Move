import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chapterOneHint } from './chapterOneHints';
import type { ChapterOneHintInput } from './chapterOneHints';
import { chapterMissionIndices, missionId } from '../levels/campaignCatalog';

const museumIds = chapterMissionIndices(0).map(missionId);

const input: ChapterOneHintInput = { missionId: '01-01', failures: 2, cause: 'guardChase', secured: false, language: 'en' };
const hint = (patch: Partial<ChapterOneHintInput> = {}) => chapterOneHint({ ...input, ...patch });

test('first capture does not interrupt discovery; repeated captures in the exact first chapter qualify', () => {
  for (const failures of [-1, 0, 1, 1.5, NaN, Infinity]) assert.equal(hint({ failures }), null);
  for (const missionId of museumIds) {
    assert.ok(hint({ missionId }));
    assert.ok(hint({ missionId, failures: 5 }));
  }
  for (const missionId of ['', '01-00', '01-11', '02-01', '09-05', '1-1', 'toString', '__proto__']) assert.equal(hint({ missionId }), null);
});

test('a secured objective switches from approach advice to that mission’s alternate escape route', () => {
  const bodies = new Set<string>();
  for (const missionId of museumIds) {
    const approach = hint({ missionId })!;
    const escape = hint({ missionId, secured: true })!;
    assert.equal(escape.id, `${missionId}:escape`);
    assert.notEqual(approach.body, escape.body);
    assert.match(escape.body, /closes/);
    bodies.add(escape.body);
    // Capture by touch after pickup still needs the post-lockdown route, not pre-objective advice.
    assert.equal(hint({ missionId, secured: true, cause: 'guardContact' })?.id, escape.id);
  }
  assert.equal(bodies.size, museumIds.length);
});

test('direct-contact capture explains physical collision rather than promising stillness makes the player safe', () => {
  const contact = hint({ cause: 'guardContact' })!;
  assert.equal(contact.id, '01-01:contact');
  assert.match(contact.body, /Standing still does not protect/);
  assert.notEqual(contact.body, hint({ cause: 'guardChase' })?.body);
});

test('camera advice is restricted to the actual camera-bearing Museum missions', () => {
  const stages = JSON.parse(readFileSync(new URL('../levels/stages/campaignStages.json', import.meta.url), 'utf8')) as {id:string;cameras?:unknown[];escapeRoutes?:unknown[]}[];
  const museum = stages.filter(stage => museumIds.includes(stage.id));
  assert.equal(museum.length, museumIds.length);
  assert.deepEqual(museum.filter(stage => stage.cameras?.length).map(stage => stage.id), ['01-04', '01-09', '01-10']);
  for (const stage of museum) {
    assert.equal(stage.escapeRoutes?.length, 2, `${stage.id}: alternate route must still exist`);
    const advice = hint({ missionId: stage.id, cause: 'cameraChase' })!;
    assert.equal(advice.id.endsWith(':camera'), !!stage.cameras?.length);
  }
});

test('supported locales have complete copy for each branch, unknown locales use English', () => {
  for (const missionId of museumIds) {
    for (const patch of [{ cause: 'guardContact' as const }, { cause: 'cameraChase' as const }, { secured: true }, {}]) {
      const localized = ['en', 'ko', 'ja'].map(language => hint({ missionId, ...patch, language })!);
      assert.equal(new Set(localized.map(row => row.body)).size, 3);
      for (const row of localized) { assert.ok(row.title.length); assert.ok(row.body.length > 20); }
      assert.deepEqual(hint({ missionId, ...patch, language: 'fr' }), localized[0]);
    }
  }
});

test('new Museum detour hints name real service rooms in the authored layouts', () => {
  const stages = JSON.parse(readFileSync(new URL('../levels/stages/campaignStages.json', import.meta.url), 'utf8')) as {
    id:string;topologyPlan?:{rooms:{name:string}[]};
  }[];
  const serviceRooms = {
    '01-06': 'Packing Workroom', '01-07': 'Sculpture Workshop', '01-08': 'Restoration Workshop',
    '01-09': 'Monitoring Backroom', '01-10': 'Collection Handling Room',
  };
  for (const [missionId, room] of Object.entries(serviceRooms)) {
    const stage = stages.find(stage => stage.id === missionId);
    assert(stage?.topologyPlan?.rooms.some(candidate => candidate.name === room), `${missionId}: real service room`);
    assert(hint({ missionId, secured: true })?.body.includes(room), `${missionId}: hint names its own detour`);
  }
});
