import test from 'node:test';
import assert from 'node:assert/strict';
import { catchCause, CATCH_CAUSE_KEY } from '../catchCause';
import { Awareness } from '../../core/types';
import { translations } from '../../../ui/menu/strings';

const snap = (awareness: number, globalAlert = false, spottedSource = '') => ({
  events: { caughtBy: 'g1', globalAlert, spottedSource },
  guards: [{ id: 'g1', awareness }, { id: 'g2', awareness: Awareness.Patrol }],
  securityCameras: [{ id: 'cam1' }],
});

test('contact with a guard who never raised the alarm is guardContact, in every non-alarm state', () => {
  for (const a of [Awareness.Patrol, Awareness.Suspicious, Awareness.Investigate, Awareness.Return]) assert.equal(catchCause(snap(a)), 'guardContact');
});

test('an alarm raised by a guard is guardChase; by a camera is cameraChase', () => {
  assert.equal(catchCause(snap(Awareness.Chase, true, 'g1')), 'guardChase');
  assert.equal(catchCause(snap(Awareness.Alert, false, '')), 'guardChase');
  assert.equal(catchCause(snap(Awareness.Chase, true, 'cam1')), 'cameraChase');
  assert.equal(catchCause(snap(Awareness.Investigate, true, 'cam1')), 'cameraChase');
});

test('every cause has text in both languages', () => {
  for (const key of Object.values(CATCH_CAUSE_KEY)) for (const lang of ['en', 'ko'] as const) assert.ok(translations[lang][key].length > 10, `${lang}.${key}`);
});
