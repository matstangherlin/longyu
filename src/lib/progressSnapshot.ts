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
