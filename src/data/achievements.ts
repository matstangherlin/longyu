import { JOURNEY } from "./journey";
import { charById } from "./characters";
import type { SRSItem } from "../lib/srs";
import type {
  AchievementReward,
  LifetimeStats,
  MandarinDisplayMode,
  Medal,
  MissionHistoryEntry,
  RewardHistoryEntry,
} from "../lib/store";

// Catálogo de medalhas gerais do Longyu (além da medalha mensal).
// Cada medalha calcula o próprio progresso a partir de um snapshot da store:
// nada aqui grava estado — o desbloqueio (idempotente) vive em unlockAchievement.

export type AchievementCategory =
  | "jornada"
  | "sequencia"
  | "xp"
  | "hanzi"
  | "som"
  | "fala"
  | "leitura"
  | "revisao"
  | "missoes";

export type AchievementTier = "small" | "medium" | "large";

export interface AchievementProgress {
  current: number;
  target: number;
}

/** Fatia da store que as medalhas leem para calcular progresso. */
export interface AchievementSnapshot {
  completedLessons: string[];
  longestStreak: number;
  xpTotal: number;
  learnedChars: string[];
  learnedChunks: string[];
  srs: Record<string, SRSItem>;
  lifetimeStats: LifetimeStats;
  medals: Medal[];
  missionHistory: MissionHistoryEntry[];
  rewardHistory: RewardHistoryEntry[];
  mandarinDisplayMode: MandarinDisplayMode;
}

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  tier: AchievementTier;
  /** Glifo da medalha (hànzì) — identidade Longyu, sem emoji de cassino. */
  glyph: string;
  title: string;
  desc: string;
  reward: AchievementReward;
  progress: (s: AchievementSnapshot) => AchievementProgress;
}

export const ACHIEVEMENT_CATEGORY_META: Record<AchievementCategory, { label: string; glyph: string }> = {
  jornada: { label: "Jornada", glyph: "路" },
  sequencia: { label: "Sequência", glyph: "火" },
  xp: { label: "XP", glyph: "力" },
  hanzi: { label: "Hànzì", glyph: "字" },
  som: { label: "Som e tons", glyph: "音" },
  fala: { label: "Fala", glyph: "说" },
  leitura: { label: "Leitura", glyph: "读" },
  revisao: { label: "Revisão", glyph: "复" },
  missoes: { label: "Missões", glyph: "章" },
};

// Recompensas por porte (a medalha mensal continua especial, fora deste catálogo):
// pequenas +5 Qi · médias +15 Qi · grandes +50 Qi ou baú.
const REWARD_SMALL: AchievementReward = { qi: 5 };
const REWARD_MEDIUM: AchievementReward = { qi: 15 };
const REWARD_LARGE_QI: AchievementReward = { qi: 50 };

function capped(current: number, target: number): AchievementProgress {
  return { current: Math.max(0, Math.min(current, target)), target };
}

function unitsCompleted(completedLessons: string[]): number {
  const done = new Set(completedLessons);
  let count = 0;
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      if (unit.lessons.length > 0 && unit.lessons.every((lesson) => done.has(lesson.id))) count += 1;
    }
  }
  return count;
}

function perfectUnitsCompleted(s: AchievementSnapshot): number {
  const done = new Set(s.completedLessons);
  const skippedUnits = new Set(
    s.rewardHistory
      .map((entry) => /^challenge:(.+):skip:qi$/.exec(entry.id)?.[1])
      .filter((id): id is string => Boolean(id))
  );
  let count = 0;
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      if (skippedUnits.has(unit.id)) continue;
      if (unit.lessons.length > 0 && unit.lessons.every((lesson) => done.has(lesson.id))) count += 1;
    }
  }
  return count;
}

function phasesCompleted(completedLessons: string[]): number {
  const done = new Set(completedLessons);
  let count = 0;
  for (const phase of JOURNEY) {
    const lessons = phase.units.flatMap((unit) => unit.lessons);
    if (lessons.length > 0 && lessons.every((lesson) => done.has(lesson.id))) count += 1;
  }
  return count;
}

function reviewEventsTotal(srs: Record<string, SRSItem>): number {
  return Object.values(srs).reduce((sum, item) => sum + item.reps + item.lapses, 0);
}

function srsCount(srs: Record<string, SRSItem>, predicate: (item: SRSItem) => boolean): number {
  return Object.values(srs).filter(predicate).length;
}

function tonesMastered(learnedChars: string[]): number {
  const tones = new Set<number>();
  for (const id of learnedChars) {
    const tone = charById[id]?.tone;
    if (tone && tone >= 1 && tone <= 4) tones.add(tone);
  }
  return tones.size;
}

function microtextsRead(s: AchievementSnapshot): number {
  // Vitalício + lições de microleitura concluídas (histórico anterior ao contador).
  const microreadLessons = JOURNEY.flatMap((phase) => phase.units)
    .flatMap((unit) => unit.lessons)
    .filter((lesson) => lesson.steps.some((step) => step.kind === "microread"))
    .filter((lesson) => s.completedLessons.includes(lesson.id)).length;
  return Math.max(s.lifetimeStats.microtextsRead, microreadLessons);
}

function phrasesSpoken(s: AchievementSnapshot): number {
  return Math.max(s.lifetimeStats.phrasesSpoken, s.learnedChunks.length);
}

function dailyMissionsClaimed(s: AchievementSnapshot): number {
  return s.missionHistory.filter((entry) => entry.scope === "daily").length;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // 1. Jornada -------------------------------------------------------------
  {
    id: "jornada-primeira-licao",
    category: "jornada",
    tier: "small",
    glyph: "一",
    title: "Primeiro passo",
    desc: "Conclua sua primeira lição.",
    reward: REWARD_SMALL,
    progress: (s) => capped(s.completedLessons.length, 1),
  },
  {
    id: "jornada-primeiro-modulo",
    category: "jornada",
    tier: "medium",
    glyph: "门",
    title: "Porta aberta",
    desc: "Conclua um módulo inteiro.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(unitsCompleted(s.completedLessons), 1),
  },
  {
    id: "jornada-modulo-perfeito",
    category: "jornada",
    tier: "large",
    glyph: "星",
    title: "Módulo estelar",
    desc: "Complete todas as lições de um módulo com 3 estrelas (sem pular).",
    reward: REWARD_LARGE_QI,
    progress: (s) => capped(perfectUnitsCompleted(s), 1),
  },
  {
    id: "jornada-primeira-fase",
    category: "jornada",
    tier: "large",
    glyph: "山",
    title: "Primeira montanha",
    desc: "Conclua uma fase inteira da jornada.",
    reward: { chest: "dragon" },
    progress: (s) => capped(phasesCompleted(s.completedLessons), 1),
  },
  {
    id: "jornada-primeiro-teste",
    category: "jornada",
    tier: "medium",
    glyph: "跳",
    title: "Salto do dragão",
    desc: "Seja aprovado em um teste de pular módulo.",
    reward: REWARD_MEDIUM,
    progress: (s) =>
      capped(s.rewardHistory.filter((entry) => /^challenge:.+:skip:qi$/.test(entry.id)).length, 1),
  },

  // 2. Sequência -----------------------------------------------------------
  {
    id: "sequencia-3",
    category: "sequencia",
    tier: "small",
    glyph: "火",
    title: "Chama acesa",
    desc: "Estude 3 dias seguidos.",
    reward: REWARD_SMALL,
    progress: (s) => capped(s.longestStreak, 3),
  },
  {
    id: "sequencia-7",
    category: "sequencia",
    tier: "medium",
    glyph: "周",
    title: "Semana inteira",
    desc: "Estude 7 dias seguidos.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.longestStreak, 7),
  },
  {
    id: "sequencia-14",
    category: "sequencia",
    tier: "medium",
    glyph: "炎",
    title: "Fogo constante",
    desc: "Estude 14 dias seguidos.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.longestStreak, 14),
  },
  {
    id: "sequencia-30",
    category: "sequencia",
    tier: "large",
    glyph: "月",
    title: "Um mês de dragão",
    desc: "Estude 30 dias seguidos.",
    reward: REWARD_LARGE_QI,
    progress: (s) => capped(s.longestStreak, 30),
  },
  {
    id: "sequencia-100",
    category: "sequencia",
    tier: "large",
    glyph: "百",
    title: "Centenário",
    desc: "Estude 100 dias seguidos.",
    reward: { chest: "dragon" },
    progress: (s) => capped(s.longestStreak, 100),
  },

  // 3. XP ------------------------------------------------------------------
  {
    id: "xp-100",
    category: "xp",
    tier: "small",
    glyph: "芽",
    title: "Broto de Qi",
    desc: "Acumule 100 XP de estudo.",
    reward: REWARD_SMALL,
    progress: (s) => capped(s.xpTotal, 100),
  },
  {
    id: "xp-500",
    category: "xp",
    tier: "medium",
    glyph: "竹",
    title: "Bambu firme",
    desc: "Acumule 500 XP de estudo.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.xpTotal, 500),
  },
  {
    id: "xp-1000",
    category: "xp",
    tier: "medium",
    glyph: "树",
    title: "Árvore enraizada",
    desc: "Acumule 1000 XP de estudo.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.xpTotal, 1000),
  },
  {
    id: "xp-5000",
    category: "xp",
    tier: "large",
    glyph: "林",
    title: "Floresta interior",
    desc: "Acumule 5000 XP de estudo.",
    reward: { chest: "dragon" },
    progress: (s) => capped(s.xpTotal, 5000),
  },

  // 4. Hànzì ---------------------------------------------------------------
  {
    id: "hanzi-10",
    category: "hanzi",
    tier: "small",
    glyph: "十",
    title: "Dez formas",
    desc: "Reconheça 10 hànzì.",
    reward: REWARD_SMALL,
    progress: (s) => capped(s.learnedChars.length, 10),
  },
  {
    id: "hanzi-50",
    category: "hanzi",
    tier: "medium",
    glyph: "半",
    title: "Meio caminho",
    desc: "Reconheça 50 hànzì.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.learnedChars.length, 50),
  },
  {
    id: "hanzi-100",
    category: "hanzi",
    tier: "large",
    glyph: "百",
    title: "Cem caracteres",
    desc: "Reconheça 100 hànzì.",
    reward: { chest: "small" },
    progress: (s) => capped(s.learnedChars.length, 100),
  },
  {
    id: "hanzi-decomposto",
    category: "hanzi",
    tier: "small",
    glyph: "分",
    title: "Desmontador",
    desc: "Decomponha seu primeiro caractere em peças.",
    reward: REWARD_SMALL,
    progress: (s) =>
      capped(
        Math.max(
          s.lifetimeStats.hanziDecomposed,
          srsCount(s.srs, (item) => item.type === "char" && item.reviewDomain === "forma" && item.reps + item.lapses > 0)
        ),
        1
      ),
  },
  {
    id: "hanzi-radical",
    category: "hanzi",
    tier: "small",
    glyph: "部",
    title: "Primeira peça",
    desc: "Domine seu primeiro radical na revisão.",
    reward: REWARD_SMALL,
    progress: (s) => capped(srsCount(s.srs, (item) => item.type === "radical" && item.reps > 0), 1),
  },

  // 5. Som e tons ----------------------------------------------------------
  {
    id: "som-primeiro-audio",
    category: "som",
    tier: "small",
    glyph: "耳",
    title: "Ouvido curioso",
    desc: "Ouça seu primeiro áudio guiado.",
    reward: REWARD_SMALL,
    progress: (s) => capped(s.lifetimeStats.audioHeard, 1),
  },
  {
    id: "som-50-audios",
    category: "som",
    tier: "medium",
    glyph: "听",
    title: "Escuta treinada",
    desc: "Ouça 50 áudios guiados.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.lifetimeStats.audioHeard, 50),
  },
  {
    id: "som-4-tons",
    category: "som",
    tier: "medium",
    glyph: "四",
    title: "Os quatro tons",
    desc: "Aprenda caracteres nos 4 tons do mandarim.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(tonesMastered(s.learnedChars), 4),
  },
  {
    id: "som-sequencia-tons",
    category: "som",
    tier: "small",
    glyph: "调",
    title: "Sequência tonal",
    desc: "Domine o som de 3 itens na revisão sem errar.",
    reward: REWARD_SMALL,
    progress: (s) =>
      capped(
        srsCount(s.srs, (item) => item.reviewDomain === "som" && item.reps > 0 && item.lapses === 0),
        3
      ),
  },

  // 6. Fala ----------------------------------------------------------------
  {
    id: "fala-primeira-frase",
    category: "fala",
    tier: "small",
    glyph: "口",
    title: "Primeira voz",
    desc: "Fale sua primeira frase em voz alta.",
    reward: REWARD_SMALL,
    progress: (s) => capped(phrasesSpoken(s), 1),
  },
  {
    id: "fala-10-frases",
    category: "fala",
    tier: "medium",
    glyph: "说",
    title: "Conversa iniciada",
    desc: "Fale 10 frases em voz alta.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(phrasesSpoken(s), 10),
  },
  {
    id: "fala-50-frases",
    category: "fala",
    tier: "large",
    glyph: "言",
    title: "Voz confiante",
    desc: "Fale 50 frases em voz alta.",
    reward: REWARD_LARGE_QI,
    progress: (s) => capped(phrasesSpoken(s), 50),
  },

  // 7. Leitura -------------------------------------------------------------
  {
    id: "leitura-primeiro-texto",
    category: "leitura",
    tier: "small",
    glyph: "页",
    title: "Primeira página",
    desc: "Leia seu primeiro microtexto.",
    reward: REWARD_SMALL,
    progress: (s) => capped(microtextsRead(s), 1),
  },
  {
    id: "leitura-10-textos",
    category: "leitura",
    tier: "medium",
    glyph: "书",
    title: "Leitor em formação",
    desc: "Leia 10 microtextos.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(microtextsRead(s), 10),
  },
  {
    id: "leitura-sem-pinyin",
    category: "leitura",
    tier: "medium",
    glyph: "独",
    title: "Sem rodinhas",
    desc: "Leia um microtexto com a exibição só em caracteres (sem pinyin).",
    reward: REWARD_MEDIUM,
    progress: (s) =>
      capped(s.mandarinDisplayMode === "hanzi_only" && microtextsRead(s) >= 1 ? 1 : 0, 1),
  },

  // 8. Revisão -------------------------------------------------------------
  {
    id: "revisao-10",
    category: "revisao",
    tier: "small",
    glyph: "回",
    title: "Retorno",
    desc: "Faça 10 revisões.",
    reward: REWARD_SMALL,
    progress: (s) => capped(reviewEventsTotal(s.srs), 10),
  },
  {
    id: "revisao-50",
    category: "revisao",
    tier: "medium",
    glyph: "复",
    title: "Memória ativa",
    desc: "Faça 50 revisões.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(reviewEventsTotal(s.srs), 50),
  },
  {
    id: "revisao-100",
    category: "revisao",
    tier: "large",
    glyph: "习",
    title: "Guardião da memória",
    desc: "Faça 100 revisões.",
    reward: REWARD_LARGE_QI,
    progress: (s) => capped(reviewEventsTotal(s.srs), 100),
  },
  {
    id: "revisao-7-dias",
    category: "revisao",
    tier: "medium",
    glyph: "常",
    title: "Ritual de revisão",
    desc: "Revise em 7 dias diferentes.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.lifetimeStats.reviewDays.length, 7),
  },

  // 9. Missões -------------------------------------------------------------
  {
    id: "missoes-primeira-diaria",
    category: "missoes",
    tier: "small",
    glyph: "旗",
    title: "Missão cumprida",
    desc: "Resgate sua primeira missão diária.",
    reward: REWARD_SMALL,
    progress: (s) => capped(dailyMissionsClaimed(s), 1),
  },
  {
    id: "missoes-10-diarias",
    category: "missoes",
    tier: "medium",
    glyph: "军",
    title: "Veterano das missões",
    desc: "Resgate 10 missões diárias.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(dailyMissionsClaimed(s), 10),
  },
  {
    id: "missoes-medalha-mensal",
    category: "missoes",
    tier: "medium",
    glyph: "奖",
    title: "Mês dourado",
    desc: "Conquiste uma medalha mensal.",
    reward: REWARD_MEDIUM,
    progress: (s) => capped(s.medals.length, 1),
  },
  {
    id: "missoes-3-medalhas",
    category: "missoes",
    tier: "large",
    glyph: "冠",
    title: "Colecionador de meses",
    desc: "Conquiste 3 medalhas mensais.",
    reward: { chest: "dragon" },
    progress: (s) => capped(s.medals.length, 3),
  },
];

export function isAchievementComplete(def: AchievementDef, snapshot: AchievementSnapshot): boolean {
  const { current, target } = def.progress(snapshot);
  return current >= target;
}

export function achievementRewardLabel(reward: AchievementReward): string {
  if (reward.chest === "dragon") return "Baú Raro";
  if (reward.chest === "small") return "Baú Comum";
  if (reward.chest === "monthly") return "Baú Épico";
  if (reward.qi) return `+${reward.qi} Qi`;
  return "Medalha";
}
