import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHAPTER_COUNT, MISSION_COUNT, chapterMissionIndices, missionId } from '../../levels/campaignCatalog';
import { resolveInitialMissionIndex } from '../../../ui/branding/missionLaunch';
import { chapterRoute } from '../../../ui/menu/missionRoute';
import { canPlayMission, freshCampaign, normalizeCampaign, type CampaignProgress } from '../campaignProgress';
import { DEFAULT_PROGRESS } from '../stageProgress';
import { qaUnlockAllEnabled, QA_UNLOCK_ALL } from '../qaUnlock';

const all = Array.from({ length: MISSION_COUNT }, (_, i) => i);
/** A save that has cleared the first `n` missions, as the game writes it. */
const clearedFirst = (n: number): CampaignProgress => normalizeCampaign({
  version: 5, lastMission: missionId(Math.min(n, MISSION_COUNT - 1)), highestUnlocked: Math.min(n, MISSION_COUNT - 1),
  records: Object.fromEntries(all.slice(0, n).map((i) => [missionId(i), { cleared: true, bestTime: 30 }])),
});

test('QA unlock is on only for a development bundle or the explicit flag', () => {
  assert.equal(qaUnlockAllEnabled(false, undefined), false, 'a release bundle built without the variable');
  assert.equal(qaUnlockAllEnabled(false, ''), false);
  assert.equal(qaUnlockAllEnabled(false, '0'), false);
  assert.equal(qaUnlockAllEnabled(false, 'true'), false, 'only the exact value 1 turns it on');
  assert.equal(qaUnlockAllEnabled(false, '1'), true);
  assert.equal(qaUnlockAllEnabled(true, undefined), true);
  assert.equal(QA_UNLOCK_ALL, false, 'this test run has no flag and is not a development bundle');
});

test('flag OFF: progression is exactly the normal one', () => {
  const fresh = freshCampaign();
  assert.deepEqual(all.filter((i) => canPlayMission(fresh, i, false)), [0]);
  // Five missions cleared: the sixth is open, nothing after it.
  const five = clearedFirst(5);
  assert.deepEqual(all.filter((i) => canPlayMission(five, i, false)), [0, 1, 2, 3, 4, 5]);
  assert.equal(canPlayMission(five, missionIdx('07-01'), false), false);
  assert.equal(canPlayMission(five, missionIdx('09-05'), false), false);
  // Chapter cards: a chapter is open when one of its missions is.
  const openChapters = (p: CampaignProgress, qa: boolean) => Array.from({ length: CHAPTER_COUNT }, (_, c) => c).filter((c) => chapterMissionIndices(c).some((m) => canPlayMission(p, m, qa)));
  assert.deepEqual(openChapters(fresh, false), [0]);
  assert.deepEqual(openChapters(five, false), [0, 1]);
  // Mission cards of a locked chapter cannot be started.
  assert(chapterRoute(fresh, 5, false).missions.every((m) => m.state === 'locked' && !m.playable && !m.devUnlocked));
});

test('flag ON: 45 of 45 missions can be selected and started, in all nine chapters', () => {
  for (const save of [freshCampaign(), clearedFirst(5), clearedFirst(MISSION_COUNT)]) {
    assert.deepEqual(all.filter((i) => canPlayMission(save, i, true)), all);
    for (let chapter = 0; chapter < CHAPTER_COUNT; chapter++) {
      const route = chapterRoute(save, chapter, true);
      assert.equal(route.missions.length, 5);
      assert(route.missions.every((m) => m.playable), `chapter ${chapter + 1}`);
    }
  }
  assert.equal(canPlayMission(freshCampaign(), -1, true), false);
  assert.equal(canPlayMission(freshCampaign(), MISSION_COUNT, true), false, 'there is no 46th mission');
});

test('flag ON: 07-01, 08-01 and 09-05 start from a save that has them locked', () => {
  for (const id of ['07-01', '08-01', '09-05']) {
    const index = missionIdx(id);
    assert.equal(resolveInitialMissionIndex(DEFAULT_PROGRESS, index, true), index, id);
    // The same save without the override falls back to its own mission.
    assert.equal(resolveInitialMissionIndex(DEFAULT_PROGRESS, index, false), 0, id);
  }
});

test('the override forges nothing: the save and what it shows as cleared stay as they are', () => {
  const save = clearedFirst(5), before = JSON.stringify(save);
  for (const i of all) canPlayMission(save, i, true);
  for (let chapter = 0; chapter < CHAPTER_COUNT; chapter++) chapterRoute(save, chapter, true);
  assert.equal(JSON.stringify(save), before);
  // Missions the override opens are still locked in the save: none shows as cleared, and each is marked as QA-opened.
  const late = chapterRoute(save, 8, true).missions;
  assert(late.every((m) => m.state === 'locked' && m.devUnlocked && m.record === undefined));
  assert.equal(chapterRoute(save, 8, true).cleared, 0);
  assert.equal(chapterRoute(save, 0, true).cleared, 5, 'real clears are still shown as clears');
  assert(chapterRoute(save, 0, true).missions.every((m) => !m.devUnlocked));
  // What the game would write back after only looking at the list is the same progress.
  assert.deepEqual(normalizeCampaign(JSON.parse(before)), save);
});

function missionIdx(id: string): number {
  return (Number(id.slice(0, 2)) - 1) * 5 + Number(id.slice(3)) - 1;
}
