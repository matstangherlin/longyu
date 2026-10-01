/**
 * RC2.2.20 — contrato de atualização (N → N+1) para o QA físico.
 *
 * Atualizar o app nunca pode: resetar a Jornada, duplicar XP/Pérolas/recompensa,
 * resetar o SRS, reexibir todas as orientações ou trancar de novo uma área.
 *
 * O owner tira um retrato ANTES do update (/qa/device), instala a versão
 * N+1 pela Play e compara DEPOIS. O retrato só tem contagens e totais — nada
 * de e-mail, nome, username, resposta ou conteúdo de gravação — e fica no
 * localStorage do próprio aparelho (sobrevive ao update do mesmo package).
 */

export const UPGRADE_SNAPSHOT_SCHEMA = "longyu-upgrade-snapshot/1";
export const UPGRADE_SNAPSHOT_STORAGE_KEY = "longyu:upgrade-snapshot:v1";

export interface UpgradeSnapshot {
  schema: typeof UPGRADE_SNAPSHOT_SCHEMA;
  takenAt: string;
  versionCode: number | null;
  buildSha: string | null;
  completedLessons: number;
  /** XP. */
  points: number;
  dragonPearls: number;
  rewardHistory: number;
  pearlMilestonesClaimed: number;
  journeyChestsOpened: number;
  medals: number;
  achievementsUnlocked: number;
  srsItems: number;
  srsTotalReps: number;
  cultureCompleted: number;
  /** Orientações por estado (SHOWN/DISMISSED/SKIPPED/SNOOZED/AUTO_SEEDED). */
  guidance: Record<string, number>;
  guidanceOptionalEnabled: boolean;
  /** Áreas já liberadas (memória monotônica da descoberta progressiva). */
  availableFeatures: string[];
  settings: { dailyGoalMinutes: number | null; courseDirection: string | null; profileFrameId: string | null; profileTitleId: string | null };
}

/** Conta como o store a guarda (só os campos lidos aqui, todos opcionais). */
export interface UpgradeSnapshotSource {
  completedLessons?: readonly string[];
  points?: number;
  dragonPearls?: number;
  rewardHistory?: readonly unknown[];
  pearlMilestonesClaimed?: Record<string, unknown>;
  journeyChestsOpened?: readonly unknown[];
  medals?: readonly unknown[];
  achievementsUnlocked?: Record<string, unknown>;
  srs?: Record<string, { reps?: number } | undefined>;
  cultureCompletedIds?: readonly string[];
  guidance?: { records?: Record<string, { status?: string } | undefined>; enabled?: boolean; availabilityMemory?: readonly string[] };
  dailyGoalMinutes?: number | null;
  courseDirection?: string | null;
  profileFrameId?: string | null;
  profileTitleId?: string | null;
}

export function takeUpgradeSnapshot(
  account: UpgradeSnapshotSource,
  build: { versionCode: number | null; buildSha: string | null },
  takenAt = new Date().toISOString()
): UpgradeSnapshot {
  const guidance: Record<string, number> = {};
  for (const record of Object.values(account.guidance?.records ?? {})) {
    const status = record?.status ?? "UNKNOWN";
    guidance[status] = (guidance[status] ?? 0) + 1;
  }
  const srs = Object.values(account.srs ?? {});
  return {
    schema: UPGRADE_SNAPSHOT_SCHEMA,
    takenAt,
    versionCode: build.versionCode,
    buildSha: build.buildSha,
    completedLessons: account.completedLessons?.length ?? 0,
    points: account.points ?? 0,
    dragonPearls: account.dragonPearls ?? 0,
    rewardHistory: account.rewardHistory?.length ?? 0,
    pearlMilestonesClaimed: Object.keys(account.pearlMilestonesClaimed ?? {}).length,
    journeyChestsOpened: account.journeyChestsOpened?.length ?? 0,
    medals: account.medals?.length ?? 0,
    achievementsUnlocked: Object.keys(account.achievementsUnlocked ?? {}).length,
    srsItems: srs.length,
    srsTotalReps: srs.reduce((sum, item) => sum + (item?.reps ?? 0), 0),
    cultureCompleted: account.cultureCompletedIds?.length ?? 0,
    guidance,
    guidanceOptionalEnabled: account.guidance?.enabled !== false,
    availableFeatures: [...(account.guidance?.availabilityMemory ?? [])].sort(),
    settings: {
      dailyGoalMinutes: account.dailyGoalMinutes ?? null,
      courseDirection: account.courseDirection ?? null,
      profileFrameId: account.profileFrameId ?? null,
      profileTitleId: account.profileTitleId ?? null,
    },
  };
}

export type UpgradeViolation =
  | "JOURNEY_RESET"
  | "XP_DUPLICATED"
  | "XP_LOST"
  | "PEARLS_DUPLICATED"
  | "PEARLS_LOST"
  | "REWARD_DUPLICATED"
  | "SRS_RESET"
  | "MEDALS_LOST"
  | "ACHIEVEMENTS_LOST"
  | "GUIDANCE_RESET"
  | "FEATURE_RELOCKED"
  | "SETTINGS_RESET"
  | "SAME_BUILD";

/** Guidance que já foi decidida pelo aluno (render real ou toque) nunca volta. */
const DECIDED_GUIDANCE = ["SHOWN", "DISMISSED", "SKIPPED"] as const;

/**
 * Compara antes/depois de um update SEM atividade no meio. Qualquer diferença
 * de progresso/economia é violação: o update em si não pode dar nem tirar nada.
 */
export function compareUpgradeSnapshots(before: UpgradeSnapshot, after: UpgradeSnapshot): UpgradeViolation[] {
  const violations: UpgradeViolation[] = [];
  if (before.versionCode != null && after.versionCode != null && after.versionCode <= before.versionCode) violations.push("SAME_BUILD");
  if (after.completedLessons < before.completedLessons) violations.push("JOURNEY_RESET");
  if (after.points > before.points) violations.push("XP_DUPLICATED");
  if (after.points < before.points) violations.push("XP_LOST");
  if (after.dragonPearls > before.dragonPearls) violations.push("PEARLS_DUPLICATED");
  if (after.dragonPearls < before.dragonPearls) violations.push("PEARLS_LOST");
  if (
    after.rewardHistory > before.rewardHistory ||
    after.pearlMilestonesClaimed > before.pearlMilestonesClaimed ||
    after.journeyChestsOpened > before.journeyChestsOpened
  ) {
    violations.push("REWARD_DUPLICATED");
  }
  if (after.srsItems < before.srsItems || after.srsTotalReps < before.srsTotalReps) violations.push("SRS_RESET");
  if (after.medals < before.medals) violations.push("MEDALS_LOST");
  if (after.achievementsUnlocked < before.achievementsUnlocked) violations.push("ACHIEVEMENTS_LOST");
  const decided = (snapshot: UpgradeSnapshot) => DECIDED_GUIDANCE.reduce((sum, status) => sum + (snapshot.guidance[status] ?? 0), 0);
  if (decided(after) < decided(before) || (before.guidanceOptionalEnabled === false && after.guidanceOptionalEnabled)) {
    violations.push("GUIDANCE_RESET");
  }
  if (before.availableFeatures.some((feature) => !after.availableFeatures.includes(feature))) violations.push("FEATURE_RELOCKED");
  const settingsChanged = (Object.keys(before.settings) as (keyof UpgradeSnapshot["settings"])[]).some(
    (key) => before.settings[key] != null && before.settings[key] !== after.settings[key]
  );
  if (settingsChanged) violations.push("SETTINGS_RESET");
  return violations;
}

export function saveUpgradeSnapshot(snapshot: UpgradeSnapshot): void {
  try {
    localStorage.setItem(UPGRADE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* sem armazenamento: exportar o JSON à mão */
  }
}

export function loadUpgradeSnapshot(): UpgradeSnapshot | null {
  try {
    const raw = localStorage.getItem(UPGRADE_SNAPSHOT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as UpgradeSnapshot) : null;
    return parsed?.schema === UPGRADE_SNAPSHOT_SCHEMA ? parsed : null;
  } catch {
    return null;
  }
}
