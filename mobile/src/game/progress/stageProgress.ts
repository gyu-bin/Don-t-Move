import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateCampaign,normalizeCampaign } from './campaignProgress';
import type {CampaignProgress} from './campaignProgress';
import { DEFAULT_CONTROL_MODE, normalizeControlMode } from '../input/controlMode';
import type { ControlMode } from '../input/controlMode';

export const STAGE_COUNT = 10;
const STORAGE_KEY = 'dont-move.playable-v1.progress';

export interface StageProgress {
  campaign?:CampaignProgress;
  currentStage: number;
  highestUnlocked: number;
  heistComplete: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  language: 'ko' | 'en';
  /** Settings → Controls. Saved with the other settings; absent in older saves, which read as Tilt. */
  controlMode: ControlMode;
  hasStarted: boolean;
  clearedStages: number[];
  bestTimes: Record<string, number>;
  /** Fewest alerts in a completed run of each stage. */
  bestAlerts: Record<string, number>;
}

export const DEFAULT_PROGRESS: StageProgress = {
  currentStage: 0,
  highestUnlocked: 0,
  heistComplete: false,
  soundEnabled: true,
  musicEnabled: true,
  language: 'en',
  controlMode: DEFAULT_CONTROL_MODE,
  hasStarted: false,
  clearedStages: [],
  bestTimes: {},
  bestAlerts: {},
};

const stageIndex = (value: unknown) =>
  Math.max(0, Math.min(STAGE_COUNT - 1, Number.isFinite(value) ? Math.floor(value as number) : 0));

/** `firstRunControlMode` applies only where no control mode has been saved; a saved one is never replaced. */
export function normalizeProgress(value: unknown, firstRunControlMode: ControlMode = DEFAULT_CONTROL_MODE): StageProgress {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PROGRESS, controlMode: firstRunControlMode };
  const row = value as Partial<StageProgress>;
  const legacyFinale = !Array.isArray(row.clearedStages) && row.heistComplete === true && row.highestUnlocked === 4;
  const highestUnlocked = legacyFinale ? 5 : stageIndex(row.highestUnlocked);
  const campaign = row.campaign ? normalizeCampaign(row.campaign) : undefined;
  return {
    ...(campaign ? {campaign} : {}),
    currentStage: Math.min(stageIndex(row.currentStage), highestUnlocked),
    highestUnlocked,
    heistComplete: row.heistComplete === true && highestUnlocked === STAGE_COUNT - 1,
    soundEnabled: row.soundEnabled !== false,
    musicEnabled: typeof row.musicEnabled === 'boolean' ? row.musicEnabled : row.soundEnabled !== false,
    language: row.language === 'ko' ? 'ko' : 'en',
    controlMode: normalizeControlMode(row.controlMode, firstRunControlMode),
    hasStarted: row.hasStarted === true || highestUnlocked > 0 || (row.clearedStages?.length ?? 0) > 0 || !!(campaign && (campaign.highestUnlocked > 0 || Object.values(campaign.records).some(record => record.cleared))),
    clearedStages: Array.isArray(row.clearedStages)
      ? [...new Set(row.clearedStages.filter((n) => Number.isInteger(n) && n >= 0 && n < STAGE_COUNT))]
      : Array.from({ length: highestUnlocked }, (_, i) => i),
    bestTimes: Object.fromEntries(Object.entries(row.bestTimes ?? {}).filter(([key, time]) =>
      /^\d+$/.test(key) && Number(key) < STAGE_COUNT && Number.isFinite(time) && time > 0)),
    bestAlerts: Object.fromEntries(Object.entries(row.bestAlerts ?? {}).filter(([key, count]) =>
      /^\d+$/.test(key) && Number(key) < STAGE_COUNT && Number.isInteger(count) && count >= 0)),
  };
}

export function clearStage(progress: StageProgress, stage: number, seconds?: number, alerts?: number): StageProgress {
  const cleared = stageIndex(stage);
  const bestTimes = { ...progress.bestTimes };
  if (seconds !== undefined && Number.isFinite(seconds) && seconds > 0) {
    bestTimes[cleared] = Math.min(bestTimes[cleared] ?? Infinity, seconds);
  }
  const bestAlerts = { ...progress.bestAlerts };
  if (alerts !== undefined && Number.isInteger(alerts) && alerts >= 0)
    bestAlerts[cleared] = Math.min(bestAlerts[cleared] ?? Infinity, alerts);
  progress = { ...progress, hasStarted:true, bestTimes, bestAlerts, clearedStages: [...new Set([...progress.clearedStages, cleared])] };
  if (cleared === STAGE_COUNT - 1) {
    return { ...progress, currentStage: cleared, highestUnlocked: cleared, heistComplete: true };
  }
  const next = cleared + 1;
  return {
    ...progress,
    currentStage: next,
    highestUnlocked: Math.max(progress.highestUnlocked, next),
  };
}

export function canSelectStage(progress: StageProgress, stage: number, devUnlock = false): boolean {
  return Number.isInteger(stage) && stage >= 0 && stage < STAGE_COUNT &&
    (devUnlock || stage <= progress.highestUnlocked || progress.clearedStages.includes(stage));
}

export async function loadProgress(throwOnError = false, firstRunControlMode: ControlMode = DEFAULT_CONTROL_MODE): Promise<StageProgress> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    const progress=normalizeProgress(value ? JSON.parse(value) : null, firstRunControlMode);
    return {...progress,campaign:migrateCampaign(progress)};
  } catch (error) {
    console.error('Settings/progress read failed', error);
    if (throwOnError) throw error;
    return { ...DEFAULT_PROGRESS, controlMode: firstRunControlMode };
  }
}

let saving: Promise<void> = Promise.resolve();
export function saveProgress(progress: StageProgress): Promise<void> {
  const encoded = JSON.stringify(normalizeProgress(progress));
  saving = saving.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, encoded));
  return saving;
}
