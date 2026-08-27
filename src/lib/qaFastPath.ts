/**
 * QA Fast Path — atalhos internos para preview/dev.
 * Nunca ativo em Production Beta. Não substitui QA físico nem staging.
 */
import { ALL_LESSONS } from "../data/journey";
import { isQaFastPathAllowed } from "./appEnvironment";
import { QA_FAST_PATH_MARKER } from "./qaFastPathAccess";
import { todayKey } from "./storage";

export { QA_FAST_PATH_MARKER, clearQaFastPathSession, isQaFastPathSessionMarked } from "./qaFastPathAccess";
export const QA_STORE_KEY = "longyu-v1";
/** Deve acompanhar `version` do persist em src/lib/store.ts. */
export const QA_STORE_VERSION = 20;

export type QaScenarioId =
  | "m1"
  | "m2"
  | "m3"
  | "m4"
  | "pinyin"
  | "tone"
  | "hanzi"
  | "conversation"
  | "review"
  | "free-production"
  | "transfer"
  | "energy-empty"
  | "pro"
  | "mission"
  | "sync-error"
  | "onboarding-pending"
  | "onboarding-ready"
  | "topic-mastery-1"
  | "topic-mastery-3";

export type QaScenario = {
  id: QaScenarioId;
  title: string;
  summary: string;
  href: string;
  group: "mastery" | "skills" | "states" | "auth";
};

export const QA_SCENARIOS: readonly QaScenario[] = [
  { id: "m1", title: "M1 · Descoberta", summary: "Primeira pass do primeiro tema.", href: "/licao/p1-o-que-e-mandarim/player", group: "mastery" },
  { id: "m2", title: "M2 · Consolidação", summary: "Mesmo nó, pass 2/4.", href: "/licao/p1-o-que-e-mandarim/player", group: "mastery" },
  { id: "m3", title: "M3 · Produção", summary: "Mesmo nó, pass 3/4.", href: "/licao/p1-o-que-e-mandarim/player", group: "mastery" },
  { id: "m4", title: "M4 · Domínio", summary: "Mesmo nó, pass 4/4.", href: "/licao/p1-o-que-e-mandarim/player", group: "mastery" },
  { id: "topic-mastery-1", title: "Jornada 1/4", summary: "M1 concluída; próximo tema bloqueado.", href: "/jornada", group: "mastery" },
  { id: "topic-mastery-3", title: "Jornada 3/4", summary: "Três passes; próximo tema ainda bloqueado.", href: "/jornada", group: "mastery" },
  { id: "pinyin", title: "Pinyin", summary: "Tema «O que é pinyin?» desbloqueado.", href: "/licao/p1-o-que-e-pinyin/player", group: "skills" },
  { id: "tone", title: "Tom", summary: "Tema de tons.", href: "/licao/p1-o-que-e-tom/player", group: "skills" },
  { id: "hanzi", title: "Hànzì", summary: "Tema de caracteres.", href: "/licao/p1-o-que-e-hanzi/player", group: "skills" },
  { id: "conversation", title: "Conversa", summary: "Lição Olá com conversa.", href: "/licao/l1/player", group: "skills" },
  { id: "review", title: "Review (fila grande)", summary: "Dezenas de itens vencidos.", href: "/revisao", group: "skills" },
  { id: "free-production", title: "Produção livre", summary: "L15 / transferência combinacional.", href: "/licao/l2-rev/player", group: "skills" },
  { id: "transfer", title: "Transferência", summary: "Mesma lição; prova de leak.", href: "/licao/l2-rev/player", group: "skills" },
  { id: "energy-empty", title: "Sem energia", summary: "Cargas do dia esgotadas.", href: "/licao/p1-o-que-e-mandarim/player", group: "states" },
  { id: "pro", title: "Pro", summary: "Tela de plano com Pro local de preview.", href: "/pro", group: "states" },
  { id: "mission", title: "Missão", summary: "Objetivos e baús.", href: "/missoes", group: "states" },
  { id: "sync-error", title: "Perda de sync", summary: "Banner de erro de nuvem.", href: "/conta", group: "states" },
  { id: "onboarding-pending", title: "Onboarding pendente", summary: "Finalizar cadastro.", href: "/finalizar-cadastro", group: "auth" },
  { id: "onboarding-ready", title: "Onboarding pronto", summary: "Jornada após handoff.", href: "/jornada", group: "auth" },
] as const;

export function getQaScenario(id: string | undefined): QaScenario | undefined {
  if (!id) return undefined;
  return QA_SCENARIOS.find((item) => item.id === id);
}

type MasteryRecord = {
  level: number;
  passCount: number;
  lastPass: number;
  recoveryPending: boolean;
  updatedAt: number;
};

function masteryRecord(level: number, now: number): MasteryRecord {
  const clamped = Math.max(0, Math.min(4, level));
  return {
    level: clamped,
    passCount: clamped,
    lastPass: Math.max(1, clamped),
    recoveryPending: false,
    updatedAt: now,
  };
}

function topicPathMasteryById(
  completedLessons: string[],
  override?: { lessonId: string; level: number }
): Record<string, MasteryRecord> {
  const acquired = new Set(completedLessons);
  const pointer = ALL_LESSONS.findIndex((lesson) => !acquired.has(lesson.id));
  const last = pointer < 0 ? ALL_LESSONS.length : pointer;
  const now = Date.now();
  const byId: Record<string, MasteryRecord> = {};
  for (let index = 0; index < last; index += 1) {
    const lesson = ALL_LESSONS[index];
    if (!lesson || !acquired.has(lesson.id)) continue;
    if (lesson.isReview || lesson.reviewMasteryMode) continue;
    byId[lesson.id] = masteryRecord(4, now);
  }
  if (override && override.level > 0) {
    byId[override.lessonId] = masteryRecord(override.level, now);
  }
  return byId;
}

function foundationThrough(throughId: string): string[] {
  const foundation = [
    "p1-o-que-e-mandarim",
    "p1-o-que-e-pinyin",
    "p1-o-que-e-tom",
    "p1-o-que-e-hanzi",
    "p1-primeiros-hanzi",
    "p1-engine-2-lab",
  ];
  const index = foundation.indexOf(throughId);
  return index >= 0 ? foundation.slice(0, index + 1) : foundation;
}

function lessonsBefore(lessonId: string): string[] {
  const targetIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const journeyCompleted = targetIndex > 0 ? ALL_LESSONS.slice(0, targetIndex).map((lesson) => lesson.id) : [];
  const foundation = foundationThrough("p1-engine-2-lab");
  return [...new Set([...foundation, ...journeyCompleted])];
}

function isoDate(): string {
  return todayKey();
}

function weekKeyNow(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKeyNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function baseSeed(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    accountSetupComplete: true,
    completedLessons: [],
    holdAchievementModals: true,
    points: 40,
    isPremium: false,
    serverIsPro: false,
    ...extra,
  };
}

function reviewQueueSeed(): Record<string, unknown> {
  const now = Date.now();
  const srs: Record<string, unknown> = {};
  for (let i = 0; i < 120; i += 1) {
    const id = `chunk:qa-review-${i}`;
    srs[id] = {
      id,
      type: "chunk",
      itemId: `qa-review-${i}`,
      ease: 2.3,
      intervalDays: 1,
      due: now - (i + 1) * 60_000,
      reps: 1,
      lapses: 0,
      createdAt: now - 86_400_000,
      reviewDomain: "significado",
    };
  }
  return srs;
}

export function buildQaStoreState(id: QaScenarioId): Record<string, unknown> | null {
  const now = Date.now();
  const first = "p1-o-que-e-mandarim";
  const day = isoDate();
  const week = weekKeyNow();
  const month = monthKeyNow();

  switch (id) {
    case "m1":
      return baseSeed();
    case "m2":
    case "topic-mastery-1":
      return baseSeed({
        completedLessons: [first],
        lessonStarsById: { [first]: 3 },
        lessonMasteryById: { [first]: masteryRecord(1, now) },
      });
    case "m3":
      return baseSeed({
        completedLessons: [first],
        lessonStarsById: { [first]: 3 },
        lessonMasteryById: { [first]: masteryRecord(2, now) },
      });
    case "m4":
    case "topic-mastery-3":
      return baseSeed({
        completedLessons: [first],
        lessonStarsById: { [first]: 3 },
        lessonMasteryById: { [first]: masteryRecord(id === "m4" ? 3 : 3, now) },
      });
    case "pinyin": {
      const completed = foundationThrough("p1-o-que-e-mandarim");
      return baseSeed({
        completedLessons: completed,
        lessonStarsById: Object.fromEntries(completed.map((item) => [item, 3])),
        lessonMasteryById: topicPathMasteryById(completed),
      });
    }
    case "tone": {
      const completed = foundationThrough("p1-o-que-e-pinyin");
      return baseSeed({
        completedLessons: completed,
        lessonStarsById: Object.fromEntries(completed.map((item) => [item, 3])),
        lessonMasteryById: topicPathMasteryById(completed),
      });
    }
    case "hanzi": {
      const completed = foundationThrough("p1-o-que-e-tom");
      return baseSeed({
        completedLessons: completed,
        lessonStarsById: Object.fromEntries(completed.map((item) => [item, 3])),
        lessonMasteryById: topicPathMasteryById(completed),
      });
    }
    case "conversation": {
      const completed = lessonsBefore("l1");
      return baseSeed({
        completedLessons: completed,
        lessonStarsById: Object.fromEntries(completed.map((item) => [item, 3])),
        lessonMasteryById: topicPathMasteryById(completed),
        isPremium: true,
        points: 80,
        folego: 20,
      });
    }
    case "free-production":
    case "transfer": {
      const completed = lessonsBefore("l2-rev");
      return baseSeed({
        completedLessons: completed,
        lessonStarsById: Object.fromEntries(completed.map((item) => [item, 3])),
        lessonMasteryById: topicPathMasteryById(completed, { lessonId: "l2-rev", level: 0 }),
        isPremium: true,
        points: 80,
        folego: 20,
      });
    }
    case "review":
      return baseSeed({
        completedLessons: [first],
        lessonMasteryById: { [first]: masteryRecord(1, now) },
        srs: reviewQueueSeed(),
      });
    case "energy-empty":
      return baseSeed({
        dailyEnergy: {
          date: day,
          charges: 0,
          maxCharges: 5,
          usedCharges: 5,
          bonusChargesClaimed: {},
          folegoEarned: 0,
          consumedChargeKeys: [`lesson:${first}:1:${day}`],
        },
        folego: 0,
      });
    case "pro":
      return baseSeed({
        isPremium: true,
        serverIsPro: true,
        folego: 20,
      });
    case "mission":
      return baseSeed({
        xpToday: 5,
        xpDayKey: day,
        weeklyXp: 400,
        xpWeekKey: week,
        today: { date: day, som: 2, fala: 0, hanzi: 0, leitura: 0 },
        dailyTasks: {
          date: day,
          audioHeard: 8,
          phrasesSpoken: 0,
          reviewsDone: 10,
          hanziDecomposed: 0,
          microtextsRead: 0,
          errorsCorrected: 6,
          threeStarLessons: 0,
          tonesTrained: 0,
          claimedMissions: {},
        },
        dailyMissions: { date: day, claimed: { "daily-audio": true } },
        weeklyMissions: { weekKey: week, claimed: { "weekly-xp": true }, lessons: 2 },
        monthlyMission: { monthKey: month, completed: 2, claimed: false },
      });
    case "sync-error":
      return baseSeed({
        cloudSyncState: {
          status: "error",
          message: "QA Fast Path: perda temporária de sync",
          updatedAt: now,
        },
      });
    case "onboarding-pending":
      return null;
    case "onboarding-ready":
      return baseSeed();
    default:
      return baseSeed();
  }
}

export type ApplyQaScenarioResult = {
  ok: boolean;
  href: string;
  error?: "qa_fast_path_disabled" | "unknown_scenario";
};

export function applyQaScenario(id: string | undefined): ApplyQaScenarioResult {
  if (!isQaFastPathAllowed()) {
    return { ok: false, href: "/", error: "qa_fast_path_disabled" };
  }
  const scenario = getQaScenario(id);
  if (!scenario) {
    return { ok: false, href: "/qa", error: "unknown_scenario" };
  }
  if (typeof localStorage === "undefined") {
    return { ok: true, href: scenario.href };
  }
  try {
    localStorage.setItem(QA_FAST_PATH_MARKER, "1");
    localStorage.setItem("longyu:telemetry-consent", "0");
    if (scenario.id === "onboarding-pending") {
      localStorage.setItem("longyu:e2e-session-audience", "cloud_pending_onboarding");
      localStorage.removeItem(QA_STORE_KEY);
    } else {
      localStorage.removeItem("longyu:e2e-session-audience");
      const state = buildQaStoreState(scenario.id);
      if (state) {
        localStorage.setItem(QA_STORE_KEY, JSON.stringify({ state, version: QA_STORE_VERSION }));
      }
    }
  } catch {
    /* private mode */
  }
  return { ok: true, href: scenario.href };
}
