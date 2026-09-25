import AsyncStorage from '@react-native-async-storage/async-storage';

export const STAGE_COUNT = 10;
const STORAGE_KEY = 'dont-move.playable-v1.progress';

export interface StageProgress {
  currentStage: number;
  highestUnlocked: number;
  heistComplete: boolean;
  soundEnabled: boolean;
  clearedStages: number[];
  bestTimes: Record<string, number>;
}

export const DEFAULT_PROGRESS: StageProgress = {
  currentStage: 0,
  highestUnlocked: 0,
  heistComplete: false,
  soundEnabled: true,
  clearedStages: [],
  bestTimes: {},
};

const stageIndex = (value: unknown) =>
  Math.max(0, Math.min(STAGE_COUNT - 1, Number.isFinite(value) ? Math.floor(value as number) : 0));

export function normalizeProgress(value: unknown): StageProgress {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PROGRESS };
  const row = value as Partial<StageProgress>;
  const legacyFinale = !Array.isArray(row.clearedStages) && row.heistComplete === true && row.highestUnlocked === 4;
  const highestUnlocked = legacyFinale ? 5 : stageIndex(row.highestUnlocked);
  return {
    currentStage: Math.min(stageIndex(row.currentStage), highestUnlocked),
    highestUnlocked,
    heistComplete: row.heistComplete === true && highestUnlocked === STAGE_COUNT - 1,
    soundEnabled: row.soundEnabled !== false,
    clearedStages: Array.isArray(row.clearedStages)
      ? [...new Set(row.clearedStages.filter((n) => Number.isInteger(n) && n >= 0 && n < STAGE_COUNT))]
      : Array.from({ length: highestUnlocked }, (_, i) => i),
    bestTimes: Object.fromEntries(Object.entries(row.bestTimes ?? {}).filter(([key, time]) =>
      /^\d+$/.test(key) && Number(key) < STAGE_COUNT && Number.isFinite(time) && time > 0)),
  };
}

export function clearStage(progress: StageProgress, stage: number, seconds?: number): StageProgress {
  const cleared = stageIndex(stage);
  const bestTimes = { ...progress.bestTimes };
  if (seconds !== undefined && Number.isFinite(seconds) && seconds > 0) {
    bestTimes[cleared] = Math.min(bestTimes[cleared] ?? Infinity, seconds);
  }
  progress = { ...progress, bestTimes, clearedStages: [...new Set([...progress.clearedStages, cleared])] };
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

export async function loadProgress(): Promise<StageProgress> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value ? normalizeProgress(JSON.parse(value)) : { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let saving: Promise<void> = Promise.resolve();
export function saveProgress(progress: StageProgress): Promise<void> {
  const encoded = JSON.stringify(normalizeProgress(progress));
  saving = saving.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, encoded));
  return saving;
}
