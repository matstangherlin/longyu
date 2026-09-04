/**
 * V4.6.1 — topic fidelity: does this activity teach the title's promise?
 *
 * DIRECT_TOPIC     — teaches, practices or proves the topic itself
 * SUPPORTING_TOPIC — needed scaffold (e.g. withdraw pinyin using 你好)
 * GENERIC_REUSE    — could sit in any lesson (image "olá", random 谢谢, etc.)
 *
 * Intros / passive explanation are tagged but excluded from the 70% ratio.
 */

import type { LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { isConceptFoundationTopic } from "./topicMastery";

export type TopicRelation = "DIRECT_TOPIC" | "SUPPORTING_TOPIC" | "GENERIC_REUSE";

export const PASSIVE_KINDS = new Set(["intro", "listen", "flashcard", "hanzi_evolution", "microread"]);

export function isPassiveFidelityStep(step: Pick<LessonStep, "kind">): boolean {
  return PASSIVE_KINDS.has(step.kind);
}

function blobOf(step: LessonStep): string {
  const pairs = (step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]).join(" ");
  const options = (step.options ?? []).join(" ");
  return [
    step.title,
    step.body,
    step.prompt,
    step.dialoguePrompt,
    step.situationPt,
    step.explanation,
    step.audioText,
    step.hanzi,
    step.pinyin,
    step.text,
    step.correctAnswer,
    step.answer,
    step.blankAnswer,
    pairs,
    options,
    (step.target ?? []).join(""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const PINYIN_DIRECT =
  /pinyin|romaniz|nǐ|nǐ hǎo|\bnǐ\b|\bhǎo\b|sílaba|marca de tom|marcas de tom|contorno tonal|letras latinas|pronúncia escrita|guiar a pronúncia|n\+i|h\+ao|ˇ|ˉ|´|mapa do som|não é tradução|não é hànzì/;
const MANDARIN_DIRECT =
  /língua falada|mandarim|variedade padrão|camada|pinyin \(som|hànzì \(escrita|não é a língua|fala ≠|falado/;
const TONE_DIRECT =
  /contorno|vale|reta|sobe|cai|tom da voz|tons? das sílabas|[1-4]º tom|mā|má|mǎ|mà|curva da voz|fenômeno|mapa das marcas|marca e tom|ˉ|´|ˇ|`/;
const HANZI_DIRECT =
  /hànzì|caractere|peça escrita|peças de 你好|sistema de escrita|forma escrita|componentes|não necessariamente — juntos/;

function classifyPinyin(step: LessonStep, pass: MasteryPass, blob: string): TopicRelation {
  if (PINYIN_DIRECT.test(blob)) return "DIRECT_TOPIC";
  if (step.kind === "listen_select" && (step.options ?? []).some((option) => /[āáǎàēéěèīíǐìōóǒòūúǔùü]/.test(option))) {
    return "DIRECT_TOPIC";
  }
  if (step.kind === "match_pairs" && (step.pairs ?? []).some((pair) => /nǐ|hǎo/.test(`${pair.left}${pair.right}`))) {
    return "DIRECT_TOPIC";
  }
  const nihaoOnly =
    step.correctAnswer === "你好" ||
    step.answer === "你好" ||
    (step.target ?? []).join("") === "你好";
  if (nihaoOnly && (pass === 4 || pass === 3) && /pinyin|mapa|sem o pinyin|sem ver o pinyin/.test(blob)) {
    return "SUPPORTING_TOPIC";
  }
  if (nihaoOnly && pass === 4) return "SUPPORTING_TOPIC";
  if (step.kind === "image_choice") return "GENERIC_REUSE";
  if (step.correctAnswer === "谢谢" || step.answer === "谢谢") return "GENERIC_REUSE";
  if (/qual imagem|significa olá/.test(blob)) return "GENERIC_REUSE";
  if (nihaoOnly) return "GENERIC_REUSE";
  return "GENERIC_REUSE";
}

function classifyMandarin(step: LessonStep, pass: MasteryPass, blob: string): TopicRelation {
  if (MANDARIN_DIRECT.test(blob)) return "DIRECT_TOPIC";
  if (step.kind === "conversation_scene") return "DIRECT_TOPIC";
  if (step.kind === "match_pairs" && /pinyin|hànzì|tradução|falado/.test(blob)) return "DIRECT_TOPIC";
  if (step.kind === "listen_select" && step.correctAnswer === "你好" && pass === 1) return "DIRECT_TOPIC";
  if (step.kind === "listen" && step.text === "你好" && pass === 1) return "DIRECT_TOPIC";
  if (
    (step.kind === "free_production" || step.kind === "reverse_recall" || step.kind === "sentence_build") &&
    pass >= 3
  ) {
    return "SUPPORTING_TOPIC";
  }
  if (step.kind === "comprehend" && step.answer === "Olá") return "SUPPORTING_TOPIC";
  if (step.kind === "image_choice") return "GENERIC_REUSE";
  return /你好|olá/.test(blob) ? "SUPPORTING_TOPIC" : "GENERIC_REUSE";
}

function classifyTone(step: LessonStep, _pass: MasteryPass, blob: string): TopicRelation {
  if (TONE_DIRECT.test(blob) || step.kind === "tone" || step.kind === "tone_pair") return "DIRECT_TOPIC";
  if (step.kind === "listen_select" && ["妈", "麻", "马", "骂"].includes(step.correctAnswer ?? "")) return "DIRECT_TOPIC";
  if (step.kind === "listen_select" && step.audioText === "你好") return "DIRECT_TOPIC";
  if (step.kind === "listen" && step.text === "你好") return "SUPPORTING_TOPIC";
  if (step.kind === "reverse_recall" && step.answer === "你好") return "SUPPORTING_TOPIC";
  if (step.kind === "image_choice") return "GENERIC_REUSE";
  return "GENERIC_REUSE";
}

function classifyHanzi(step: LessonStep, pass: MasteryPass, blob: string): TopicRelation {
  if (HANZI_DIRECT.test(blob) || step.kind === "hanzi_build" || step.kind === "recognize" || step.kind === "decompose") {
    return "DIRECT_TOPIC";
  }
  if (step.kind === "sentence_build" && (step.target ?? []).join("") === "你好") return "DIRECT_TOPIC";
  if (step.kind === "match_pairs") return "DIRECT_TOPIC";
  if (step.kind === "listen_select" && step.correctAnswer === "你好") {
    return pass >= 4 ? "SUPPORTING_TOPIC" : "DIRECT_TOPIC";
  }
  if (step.kind === "reverse_recall" && step.answer === "你好") return "SUPPORTING_TOPIC";
  if (step.kind === "image_choice") return "GENERIC_REUSE";
  return /caractere|hànzì|你|好/.test(blob) ? "SUPPORTING_TOPIC" : "GENERIC_REUSE";
}

export function classifyTopicRelation(
  lessonId: string,
  pass: MasteryPass,
  step: LessonStep
): TopicRelation {
  const blob = blobOf(step);
  if (lessonId === "p1-o-que-e-pinyin") return classifyPinyin(step, pass, blob);
  if (lessonId === "p1-o-que-e-mandarim") return classifyMandarin(step, pass, blob);
  if (lessonId === "p1-o-que-e-tom") return classifyTone(step, pass, blob);
  if (lessonId === "p1-o-que-e-hanzi") return classifyHanzi(step, pass, blob);
  return "SUPPORTING_TOPIC";
}

export function fidelityReason(lessonId: string, relation: TopicRelation, step: LessonStep): string {
  if (relation === "DIRECT_TOPIC") {
    return `ensina a promessa de ${lessonId} (${step.kind}: ${step.title ?? step.prompt ?? ""})`.trim();
  }
  if (relation === "SUPPORTING_TOPIC") {
    return `apoia o tema (scaffold/uso) — ${step.kind}`;
  }
  return `reuso genérico — ${step.kind}: ${step.title ?? step.correctAnswer ?? ""}`;
}

export function scoredActivities(steps: LessonStep[]): LessonStep[] {
  return steps.filter((step) => !isPassiveFidelityStep(step));
}

export function fidelityPercents(
  lessonId: string,
  pass: MasteryPass,
  steps: LessonStep[]
): { direct: number; supporting: number; generic: number; scored: number } {
  const scored = scoredActivities(steps);
  if (scored.length === 0) return { direct: 0, supporting: 0, generic: 0, scored: 0 };
  let direct = 0;
  let supporting = 0;
  let generic = 0;
  for (const step of scored) {
    const relation = classifyTopicRelation(lessonId, pass, step);
    if (relation === "DIRECT_TOPIC") direct += 1;
    else if (relation === "SUPPORTING_TOPIC") supporting += 1;
    else generic += 1;
  }
  return {
    direct: direct / scored.length,
    supporting: supporting / scored.length,
    generic: generic / scored.length,
    scored: scored.length,
  };
}

export function maxPassiveRun(steps: LessonStep[]): number {
  let run = 0;
  let max = 0;
  for (const step of steps) {
    if (isPassiveFidelityStep(step)) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

export function usesConceptFoundationGate(lessonId: string): boolean {
  return isConceptFoundationTopic(lessonId);
}
