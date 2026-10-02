/**
 * RC2.3.0 — Pedagogy V6 · estágio Descoberta.
 *
 * Descoberta = exposição pedagógica de primeira classe (não vídeo, não tutorial).
 * Prova EXPOSTO, não DOMINADO. Mastery continua medindo aprendizagem.
 *
 * Integra-se ao LessonPlayer/GuidedLessonShell via passos `intro`/`listen`
 * anotados com `pedagogyRole: "discovery"` — sem segundo player.
 */
import type { LessonStep } from "../../data/journey";
import { resolveVisualConcept } from "../../data/visualVocabulary";

export const PEDAGOGY_V6_VERSION = "RC2.3.0" as const;

export type PedagogyRole = "discovery" | "graded" | "remediation" | "review_explain";

export interface TeachingMoment {
  id: string;
  conceptIds: readonly string[];
  titlePt: string;
  explanationPt: string;
  hanzi?: string;
  pinyin?: string;
  meaningPt?: string;
  visualConceptId?: string;
  audioText?: string;
  exampleHanzi?: string;
  examplePinyin?: string;
  exampleMeaningPt?: string;
  /** Lições piloto onde esta Descoberta pode ser injetada. */
  pilotLessonIds: readonly string[];
}

/** Catálogo piloto — primeiras sessões (foundation + cumprimentos). */
export const PILOT_TEACHING_MOMENTS: readonly TeachingMoment[] = [
  {
    id: "discover:nihao:v1",
    conceptIds: ["concept:nihao", "concept:greeting"],
    titlePt: "Um cumprimento real",
    explanationPt: "Em mandarim, as pessoas se cumprimentam dizendo 你好. Ouça, veja e sinta a frase antes de praticar.",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    meaningPt: "Olá",
    audioText: "你好",
    exampleHanzi: "你好！",
    examplePinyin: "nǐ hǎo!",
    exampleMeaningPt: "Olá!",
    pilotLessonIds: ["p1-o-que-e-mandarim", "l2"],
  },
  {
    id: "discover:pinyin:v1",
    conceptIds: ["concept:pinyin"],
    titlePt: "Pinyin: o mapa do som",
    explanationPt: "Pinyin escreve o som do mandarim com letras latinas. nǐ hǎo é o som de 你好 — não a língua falada em si.",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    meaningPt: "Olá (escrito em pinyin: nǐ hǎo)",
    audioText: "你好",
    pilotLessonIds: ["p1-o-que-e-pinyin"],
  },
  {
    id: "discover:tone-ma:v1",
    conceptIds: ["concept:tone", "concept:tone1", "concept:tone2", "concept:tone3", "concept:tone4"],
    titlePt: "O tom muda o significado",
    explanationPt: "A mesma sílaba ma muda de sentido com o tom: mā má mǎ mà. Ouça a diferença antes de escolher.",
    hanzi: "妈",
    pinyin: "mā",
    meaningPt: "mãe (1º tom)",
    audioText: "妈",
    exampleHanzi: "马",
    examplePinyin: "mǎ",
    exampleMeaningPt: "cavalo (3º tom)",
    pilotLessonIds: ["p1-o-que-e-tom"],
  },
  {
    id: "discover:hanzi-ni:v1",
    conceptIds: ["concept:hanzi", "concept:ni", "concept:hao"],
    titlePt: "Hànzì: forma com sentido",
    explanationPt: "你好 são dois caracteres. 你 (você) + 好 (bom) formam o cumprimento. Veja a forma grande antes de montar.",
    hanzi: "你",
    pinyin: "nǐ",
    meaningPt: "você",
    audioText: "你",
    exampleHanzi: "好",
    examplePinyin: "hǎo",
    exampleMeaningPt: "bom",
    pilotLessonIds: ["p1-o-que-e-hanzi", "p1-primeiros-hanzi"],
  },
  {
    id: "discover:water:v1",
    conceptIds: ["concept:shui", "concept:water"],
    titlePt: "Água no dia a dia",
    explanationPt: "水 (shuǐ) é água. Em situações reais você pode pedir: 我要水。",
    hanzi: "水",
    pinyin: "shuǐ",
    meaningPt: "água",
    visualConceptId: "water",
    audioText: "水",
    exampleHanzi: "我要水。",
    examplePinyin: "wǒ yào shuǐ.",
    exampleMeaningPt: "Eu quero água.",
    pilotLessonIds: ["l3", "p1-engine-2-lab"],
  },
  {
    id: "discover:fan:v1",
    conceptIds: ["concept:fan", "concept:meal"],
    titlePt: "Refeição",
    explanationPt: "饭 (fàn) é refeição / arroz cozido. Uma frase simples: 我吃饭。",
    hanzi: "饭",
    pinyin: "fàn",
    meaningPt: "refeição / arroz cozido",
    visualConceptId: "rice",
    audioText: "饭",
    exampleHanzi: "我吃饭。",
    examplePinyin: "wǒ chī fàn.",
    exampleMeaningPt: "Eu como / faço uma refeição.",
    pilotLessonIds: [],
  },
] as const;

export type TaughtConceptMap = Record<string, number>;

export const TAUGHT_CONCEPTS_STORAGE_KEY = "longyu:taught-concepts-v6";

export function loadTaughtConcepts(): TaughtConceptMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TAUGHT_CONCEPTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: TaughtConceptMap = {};
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === "number") out[id] = at;
    }
    return out;
  } catch {
    return {};
  }
}

export function persistTaughtConcepts(map: TaughtConceptMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TAUGHT_CONCEPTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function hasLearnerBeenTaught(conceptId: string, taught: TaughtConceptMap = loadTaughtConcepts()): boolean {
  return typeof taught[conceptId] === "number" && taught[conceptId] > 0;
}

export function markConceptsTaught(
  conceptIds: readonly string[],
  taught: TaughtConceptMap = loadTaughtConcepts(),
  at = Date.now()
): TaughtConceptMap {
  const next = { ...taught };
  for (const id of conceptIds) next[id] = at;
  persistTaughtConcepts(next);
  return next;
}

export function teachingMomentForLesson(
  lessonId: string,
  catalog: readonly TeachingMoment[] = PILOT_TEACHING_MOMENTS
): TeachingMoment | null {
  return catalog.find((m) => m.pilotLessonIds.includes(lessonId)) ?? null;
}

/** Precisa de Descoberta se algum conceptId do momento ainda não foi ensinado. */
export function needsDiscovery(
  moment: TeachingMoment,
  taught: TaughtConceptMap
): boolean {
  return moment.conceptIds.some((id) => !hasLearnerBeenTaught(id, taught));
}

/**
 * Converte TeachingMoment em passos de Descoberta (não graduados).
 * Minimalista: título + corpo + listen opcional + exemplo.
 */
export function discoveryStepsFromMoment(moment: TeachingMoment): LessonStep[] {
  const visual = moment.visualConceptId ? resolveVisualConcept(moment.visualConceptId as never) : null;
  const bodyParts = [
    moment.explanationPt,
    moment.hanzi && moment.pinyin && moment.meaningPt
      ? `${moment.hanzi} · ${moment.pinyin} · ${moment.meaningPt}`
      : null,
    visual ? `Visual: ${visual.meaningPt ?? visual.id}` : null,
    moment.exampleHanzi
      ? `Exemplo: ${moment.exampleHanzi}${moment.examplePinyin ? ` (${moment.examplePinyin})` : ""}${moment.exampleMeaningPt ? ` — ${moment.exampleMeaningPt}` : ""}`
      : null,
  ].filter(Boolean);

  const steps: LessonStep[] = [
    {
      kind: "intro",
      title: moment.titlePt,
      body: bodyParts.join("\n\n"),
      pedagogyRole: "discovery",
      discoveryMomentId: moment.id,
      discoveryConceptIds: [...moment.conceptIds],
      objective: "Descoberta: exposição antes da avaliação",
      ...(moment.visualConceptId
        ? { imageId: moment.visualConceptId, iconId: moment.visualConceptId }
        : {}),
      ...(moment.hanzi ? { hanzi: moment.hanzi, targetHanzi: moment.hanzi } : {}),
      ...(moment.pinyin ? { pinyin: moment.pinyin, targetPinyin: moment.pinyin } : {}),
      ...(moment.meaningPt ? { pt: moment.meaningPt, targetMeaningPt: moment.meaningPt } : {}),
    },
  ];

  if (moment.audioText || moment.hanzi) {
    steps.push({
      kind: "listen",
      text: moment.hanzi ?? moment.audioText!,
      pinyin: moment.pinyin ?? "",
      pt: moment.meaningPt ?? "",
      audioText: moment.audioText ?? moment.hanzi,
      pedagogyRole: "discovery",
      discoveryMomentId: moment.id,
      discoveryConceptIds: [...moment.conceptIds],
      objective: "Descoberta: ouvir o modelo canônico",
    });
  }

  return steps;
}

/**
 * Injeta Descoberta no início do plano (Pass 1) se o aluno ainda não foi
 * exposto. Em replay / conta madura, não obriga — só deixa "Rever explicação"
 * disponível via discoveryMomentId no contexto.
 */
export function withDiscoveryStage(
  lessonId: string,
  pass: number,
  plan: LessonStep[],
  taught: TaughtConceptMap
): { steps: LessonStep[]; injected: boolean; momentId: string | null } {
  if (pass !== 1) return { steps: plan, injected: false, momentId: null };
  const moment = teachingMomentForLesson(lessonId);
  if (!moment || !needsDiscovery(moment, taught)) {
    return { steps: plan, injected: false, momentId: moment?.id ?? null };
  }
  // Já há intro de discovery no plano? Não duplicar.
  if (plan.some((s) => s.pedagogyRole === "discovery" || s.discoveryMomentId === moment.id)) {
    return { steps: plan, injected: false, momentId: moment.id };
  }
  const discovery = discoveryStepsFromMoment(moment);
  return { steps: [...discovery, ...plan], injected: true, momentId: moment.id };
}

/** Conceptos cobrados em um passo (para gate teach-before-test). */
export function conceptIdsDemandedByStep(step: LessonStep): string[] {
  if (step.discoveryConceptIds?.length) return [...step.discoveryConceptIds];
  const ids: string[] = [];
  const text = [step.hanzi, step.targetHanzi, step.correctAnswer, step.answer, step.audioText, step.text]
    .filter(Boolean)
    .join("");
  if (text.includes("你好")) ids.push("concept:nihao", "concept:greeting");
  if (text.includes("水") || text.includes("shuǐ")) ids.push("concept:shui", "concept:water");
  if (text.includes("饭")) ids.push("concept:fan", "concept:meal");
  if (/\bmā\b|妈/.test(`${step.pinyin ?? ""} ${text}`)) ids.push("concept:tone1");
  return ids;
}

/** Gate: cobrado antes de ensinado? */
export function conceptsChargedBeforeTaught(
  steps: readonly LessonStep[],
  taught: TaughtConceptMap
): { stepIndex: number; conceptId: string }[] {
  const known = { ...taught };
  const violations: { stepIndex: number; conceptId: string }[] = [];
  steps.forEach((step, index) => {
    if (step.pedagogyRole === "discovery") {
      for (const id of step.discoveryConceptIds ?? []) known[id] = known[id] ?? Date.now();
      return;
    }
    if (step.kind === "intro") return;
    for (const id of conceptIdsDemandedByStep(step)) {
      if (!hasLearnerBeenTaught(id, known)) {
        // Só falha para conceitos do catálogo piloto (não inventar dívida).
        if (PILOT_TEACHING_MOMENTS.some((m) => m.conceptIds.includes(id))) {
          violations.push({ stepIndex: index, conceptId: id });
        }
      }
    }
  });
  return violations;
}
