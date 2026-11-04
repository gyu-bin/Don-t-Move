import type { MissionRecord } from './campaignProgress';
import { isCurrentMissionBenchmark } from './missionRevision';

export type ChapterOneBadge = 'firstEscape' | 'cleanEscape' | 'personalBest';
export interface ChapterOneMasteryRecord { cleanEscape?: true; personalBest?: true }
const BADGES: readonly ChapterOneBadge[] = ['firstEscape', 'cleanEscape', 'personalBest'];

export const isChapterOneMission = (id: string) => /^01-(?:0[1-9]|10)$/.test(id);

export interface MasteryDetectionEvents {
  alertCount: number;
  theftRevision: number;
  spottedWhistleRevision: number;
  cameraAlertRevision?: number;
}

/** Evidence for the zero-detection gate, not a count of distinct episodes. A guard's
 * suspicion can reach Alert before its whistle; theft alone must still count as zero. */
export function extraDetectionsForMastery(events: MasteryDetectionEvents): number | undefined {
  const cameras = events.cameraAlertRevision === undefined ? 0 : events.cameraAlertRevision;
  const counters = [events.alertCount, events.theftRevision, events.spottedWhistleRevision, cameras];
  if (!counters.every(value => Number.isFinite(value) && Number.isInteger(value) && value >= 0)) return undefined;
  const evidence = Math.max(events.alertCount - events.theftRevision, events.spottedWhistleRevision + cameras, 0);
  return Number.isFinite(evidence) ? evidence : undefined;
}

/** Only explicit earned flags survive a save boundary; old whistle totals prove no clean run. */
export function normalizeChapterOneMastery(value: unknown): ChapterOneMasteryRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const result: ChapterOneMasteryRecord = {};
  if (row.cleanEscape === true) result.cleanEscape = true;
  if (row.personalBest === true) result.personalBest = true;
  return Object.keys(result).length ? result : undefined;
}

/** Per-run extra detections exclude the mandatory theft alarm. Missing evidence never grants a clean badge. */
export function recordChapterOneMastery(
  id: string, previous: MissionRecord | undefined, seconds: number, extraDetections?: number,
): ChapterOneMasteryRecord | undefined {
  if (!isChapterOneMission(id)) return undefined;
  const result = previous?.cleared && !previous.legacy ? normalizeChapterOneMastery(previous.mastery) ?? {} : {};
  if (Number.isFinite(seconds) && seconds > 0) {
    if (extraDetections === 0) result.cleanEscape = true;
    if (previous?.cleared && isCurrentMissionBenchmark(id,previous) && typeof previous.bestTime === 'number' &&
      Number.isFinite(previous.bestTime) && previous.bestTime > 0 && seconds < previous.bestTime) result.personalBest = true;
  }
  return Object.keys(result).length ? result : undefined;
}

/** First escape can be credited from old clear entitlement; the other badges need new evidence. */
export function chapterOneMastery(id: string, record: MissionRecord | undefined): {
  earned: ChapterOneBadge[]; nextGoal: ChapterOneBadge | null;
} {
  if (!isChapterOneMission(id)) return { earned: [], nextGoal: null };
  const earned: ChapterOneBadge[] = [];
  if (record?.cleared) {
    earned.push('firstEscape');
    if (!record.legacy && record.mastery?.cleanEscape === true) earned.push('cleanEscape');
    if (!record.legacy && record.mastery?.personalBest === true) earned.push('personalBest');
  }
  return { earned, nextGoal: BADGES.find(badge => !earned.includes(badge)) ?? null };
}

export function newChapterOneBadges(id: string, before: MissionRecord | undefined, after: MissionRecord | undefined): ChapterOneBadge[] {
  const previous = chapterOneMastery(id, before).earned;
  return chapterOneMastery(id, after).earned.filter(badge => !previous.includes(badge));
}
