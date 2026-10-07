/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESULT_LABEL, resultActions } from '../resultNavigation';
import { translate } from '../menu/strings';
import { CHAPTER_MISSION_COUNTS, MISSION_COUNT, missionId, missionIndex } from '../../game/levels/campaignCatalog';
import { canPlayMission, completeMission, freshCampaign, normalizeCampaign } from '../../game/progress/campaignProgress';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../../game/progress/stageProgress';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** The clear screen of mission `id` for a save that has just cleared it. */
function afterClear(id: string, save = freshCampaign(), qa = false) {
  const index = missionIndex(id), [chapter, mission] = id.split('-').map(Number);
  const campaign = completeMission(save, index, 40, 0);
  const actions = resultActions({ index, missionCount: MISSION_COUNT, chapterFinal: mission === CHAPTER_MISSION_COUNTS[chapter-1],
    nextPlayable: canPlayMission(campaign, index+1, qa) });
  return { index, campaign, ...actions, label: translate('ko', RESULT_LABEL[actions.primary]), labelEn: translate('en', RESULT_LABEL[actions.primary]) };
}
const upTo = (id: string) => normalizeCampaign({ version: 5, lastMission: id, highestUnlocked: missionIndex(id),
  records: Object.fromEntries(Array.from({ length: missionIndex(id) }, (_, i) => [missionId(i), { cleared: true, bestTime: 30 }])) });

test('Inside a chapter the main button is "다음 스테이지" and the next mission is the one after it', () => {
  for (const id of ['01-01', '01-02', '03-04', '07-02', '08-04', '09-04']) {
    const r = afterClear(id, upTo(id));
    assert.equal(r.primary, 'nextStage', id); assert.equal(r.label, '다음 스테이지'); assert.equal(r.labelEn, 'NEXT STAGE');
    assert.deepEqual(r.secondary, ['chapters', 'retry', 'home']);
    assert.equal(missionId(r.index+1).slice(0, 2), id.slice(0, 2), 'same chapter');
  }
});

test('On a chapter\'s last mission the main button is "다음 챕터" and starts the first mission of the next chapter', () => {
  for (let chapter = 1; chapter <= 8; chapter++) {
    const id = `${String(chapter).padStart(2, '0')}-05`;
    const r = afterClear(id, upTo(id));
    assert.equal(r.primary, 'nextChapter', id); assert.equal(r.label, '다음 챕터'); assert.equal(r.labelEn, 'NEXT CHAPTER');
    assert.equal(missionId(r.index+1), `${String(chapter+1).padStart(2, '0')}-01`);
    assert(canPlayMission(r.campaign, r.index+1, false), 'the clear itself unlocked it: nothing is forced open');
  }
});

test('09-05 has no next chapter: the main button is the chapter list, never "다음 챕터" or "다음 스테이지"', () => {
  for (const qa of [false, true]) {
    const r = afterClear('09-05', upTo('09-05'), qa);
    assert.equal(r.index, MISSION_COUNT-1);
    assert.equal(r.primary, 'chapters'); assert.equal(r.label, '챕터 선택');
    assert.deepEqual(r.secondary, ['retry', 'home']);
    assert(!r.secondary.includes('nextChapter') && !r.secondary.includes('nextStage'));
  }
});

test('A next mission that is still locked is never offered, whatever the screen is', () => {
  for (const chapterFinal of [false, true]) {
    const r = resultActions({ index: 9, missionCount: MISSION_COUNT, chapterFinal, nextPlayable: false });
    assert.equal(r.primary, 'chapters'); assert.deepEqual(r.secondary, ['retry', 'home']);
  }
});

test('Every clear screen offers the chapter list, play again and home, each once, in Korean and English', () => {
  for (let index = 0; index < MISSION_COUNT; index++) {
    const r = afterClear(missionId(index), upTo(missionId(index)));
    const all = [r.primary, ...r.secondary];
    for (const action of ['chapters', 'retry', 'home'] as const) assert.equal(all.filter(a => a === action).length, 1, `${missionId(index)} ${action}`);
    assert.equal(new Set(all).size, all.length);
  }
  assert.equal(translate('ko', RESULT_LABEL.chapters), '챕터 선택'); assert.equal(translate('ko', RESULT_LABEL.retry), '다시 하기');
  assert.equal(translate('ko', RESULT_LABEL.home), '홈'); assert.equal(translate('en', RESULT_LABEL.retry), 'PLAY AGAIN');
});

test('The clear is on disk before any button can act: record, unlock and best time survive Result → Home → restart', async () => {
  const saved = new Map<string, string>(), get = AsyncStorage.getItem, set = AsyncStorage.setItem;
  AsyncStorage.getItem = async key => saved.get(key) ?? null;
  AsyncStorage.setItem = async (key, value) => { saved.set(key, value); };
  try {
    // What the game does at the moment of the clear, before the result screen is shown.
    const cleared = completeMission(upTo('05-05'), missionIndex('05-05'), 52.4, 1);
    await saveProgress({ ...DEFAULT_PROGRESS, hasStarted: true, campaign: cleared });
    // Home / chapter list / play again write nothing. Restart:
    const restarted = (await loadProgress(true)).campaign!;
    assert.equal(restarted.records['05-05']?.cleared, true); assert.equal(restarted.records['05-05']?.bestTime, 52.4);
    assert.equal(restarted.highestUnlocked, missionIndex('06-01'));
    assert(canPlayMission(restarted, missionIndex('06-01'), false));
    assert(!canPlayMission(restarted, missionIndex('06-02'), false), 'and nothing beyond it');
  } finally { AsyncStorage.getItem = get; AsyncStorage.setItem = set; }
});
