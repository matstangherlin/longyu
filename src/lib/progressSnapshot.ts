import type { AuthMode, LearningAccount } from "./store";

export const PROGRESS_SNAPSHOT_SCHEMA_VERSION = 1;

export interface ProgressSnapshotAccountMeta {
  id: string;
  name: string;
  email?: string;
  authMode: AuthMode;
  createdAt: number;
  updatedAt: number;
}

export interface ProgressSnapshotBody {
  schemaVersion: number;
  exportedAt: number;
  account: ProgressSnapshotAccountMeta;
  progress: Omit<LearningAccount, "id" | "name" | "email" | "authMode" | "createdAt" | "updatedAt">;
}

export interface LocalProgressSnapshot {
  schemaVersion: number;
  exportedAt: number;
  snapshot: ProgressSnapshotBody;
}

const REQUIRED_PROGRESS_KEYS = [
  "completedLessons",
  "lessonTaskProgress",
  "learnedChars",
  "learnedChunks",
  "srs",
  "points",
  "dailyEnergy",
  "dailyTasks",
  "weeklyMissions",
  "monthlyMission",
  "missionHistory",
  "chests",
  "chestOpenHistory",
  "achievementsUnlocked",
  "achievementHistory",
  "placement",
  "xpTotal",
  "xpToday",
  "weeklyXp",
  "monthlyXp",
] as const;

export function buildProgressSnapshot(account: LearningAccount): LocalProgressSnapshot {
  const { id, name, email, authMode, createdAt, updatedAt, ...progress } = account;
  return {
    schemaVersion: PROGRESS_SNAPSHOT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    snapshot: {
      schemaVersion: PROGRESS_SNAPSHOT_SCHEMA_VERSION,
      exportedAt: Date.now(),
      account: { id, name, email, authMode, createdAt, updatedAt },
      progress,
    },
  };
}

export function validateProgressSnapshot(snapshot: LocalProgressSnapshot): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (snapshot.schemaVersion !== PROGRESS_SNAPSHOT_SCHEMA_VERSION) {
    errors.push(`schemaVersion esperado ${PROGRESS_SNAPSHOT_SCHEMA_VERSION}, recebido ${snapshot.schemaVersion}`);
  }
  if (!snapshot.snapshot?.account?.id) errors.push("account.id ausente");
  if (!snapshot.snapshot?.progress || typeof snapshot.snapshot.progress !== "object") {
    errors.push("progress ausente");
    return { ok: false, errors };
  }
  for (const key of REQUIRED_PROGRESS_KEYS) {
    if (!(key in snapshot.snapshot.progress)) errors.push(`progress.${key} ausente`);
  }
  return { ok: errors.length === 0, errors };
}

function getProgressBody(
  source: LocalProgressSnapshot | ProgressSnapshotBody["progress"] | null | undefined
): ProgressSnapshotBody["progress"] | null {
  if (!source) return null;
  if ("snapshot" in source) return source.snapshot?.progress ?? null;
  return source;
}

function hasAnyPositiveValue(values: Record<string, unknown> | null | undefined): boolean {
  if (!values) return false;
  return Object.values(values).some((value) => Number(value) > 0);
}

function countPositiveValues(values: Record<string, unknown> | null | undefined): number {
  if (!values) return 0;
  return Object.values(values).filter((value) => Number(value) > 0).length;
}

function countObjectKeys(values: Record<string, unknown> | null | undefined): number {
  return values ? Object.keys(values).length : 0;
}

function chestInventoryScore(chests: Record<string, unknown> | null | undefined): number {
  if (!chests) return 0;
  return Object.values(chests).reduce<number>((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function isMeaningfulProgress(
  source: LocalProgressSnapshot | ProgressSnapshotBody["progress"] | null | undefined
): boolean {
  const progress = getProgressBody(source);
  if (!progress) return false;
  return (
    (progress.completedLessons?.length ?? 0) > 0 ||
    hasAnyPositiveValue(progress.lessonStarsById) ||
    hasAnyPositiveValue(progress.lessonTaskProgress) ||
    (progress.learnedChars?.length ?? 0) > 0 ||
    (progress.learnedChunks?.length ?? 0) > 0 ||
    countObjectKeys(progress.srs) > 0 ||
    (progress.xpTotal ?? 0) > 0 ||
    (progress.points ?? 0) > 0 ||
    (progress.streak ?? 0) > 0 ||
    countObjectKeys(progress.achievementsUnlocked) > 0 ||
    chestInventoryScore(progress.chests as unknown as Record<string, unknown> | undefined) > 0 ||
    (progress.rewardHistory?.length ?? 0) > 0 ||
    progress.placement != null
  );
}

export function getProgressScore(
  source: LocalProgressSnapshot | ProgressSnapshotBody["progress"] | null | undefined
): number {
  const progress = getProgressBody(source);
  if (!progress) return 0;

  const totalStars = Object.values(progress.lessonStarsById ?? {}).reduce<number>(
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0
  );
  const lessonTaskUnits = Object.values(progress.lessonTaskProgress ?? {}).reduce(
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0
  );

  return (
    (progress.completedLessons?.length ?? 0) * 100 +
    totalStars * 25 +
    lessonTaskUnits * 10 +
    (progress.learnedChars?.length ?? 0) * 8 +
    (progress.learnedChunks?.length ?? 0) * 8 +
    countObjectKeys(progress.srs) * 12 +
    Math.max(0, progress.xpTotal ?? 0) +
    Math.max(0, progress.points ?? 0) * 2 +
    Math.max(0, progress.streak ?? 0) * 20 +
    countObjectKeys(progress.achievementsUnlocked) * 30 +
    (progress.rewardHistory?.length ?? 0) * 10 +
    chestInventoryScore(progress.chests as unknown as Record<string, unknown> | undefined) * 10 +
    (progress.placement ? 40 : 0) +
    countPositiveValues(progress.correctedMistakes) * 4 +
    (progress.recentErrors?.length ?? 0) * 2 +
    (progress.recentActivityErrors?.length ?? 0) * 2 +
    (progress.journeyChestsOpened?.length ?? 0) * 5 +
    (progress.validatedModules?.length ?? 0) * 12
  );
}
