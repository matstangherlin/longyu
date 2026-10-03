/**
 * RC2.3.2 — qualidade de contexto cotidiano + anti-vazamento de resposta.
 */
import type { LessonStep } from "../../data/journey";
import type { EverydayScenario } from "./scenarios";
import { intentIsCommunicative, type EverydayIntent } from "./intents";

export const CONTEXT_LEAKS_EXPECTED_ANSWER = "CONTEXT_LEAKS_EXPECTED_ANSWER" as const;
export const EVERYDAY_CONTEXT_QUALITY = "EVERYDAY_CONTEXT_QUALITY" as const;
export const EVERYDAY_CURRICULUM_LEAK = "EVERYDAY_CURRICULUM_LEAK" as const;

export type ContextQualityLevel = "ERROR" | "WARNING" | "JUSTIFIED" | "OK";

export interface ContextQualityFinding {
  code: typeof EVERYDAY_CONTEXT_QUALITY | typeof CONTEXT_LEAKS_EXPECTED_ANSWER | typeof EVERYDAY_CURRICULUM_LEAK;
  level: ContextQualityLevel;
  where: string;
  why: string;
}

/** Detecta prompt PT que entrega a tradução esperada nos passes altos. */
export function detectContextAnswerLeak(input: {
  masteryPass: number;
  promptPt?: string;
  expectedHanzi?: string;
  expectedMeaningPt?: string;
}): ContextQualityFinding | null {
  if (input.masteryPass < 3) return null;
  const prompt = (input.promptPt ?? "").trim();
  if (!prompt) return null;
  const meaning = (input.expectedMeaningPt ?? "").trim();
  if (meaning.length >= 3) {
    const escaped = meaning.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`significa\\s+['"]?${escaped}`, "i").test(prompt) || new RegExp(`['"]${escaped}['"]`).test(prompt)) {
      return {
        code: CONTEXT_LEAKS_EXPECTED_ANSWER,
        level: "ERROR",
        where: "promptPt",
        why: `Pass ${input.masteryPass} prompt reproduces expected meaning: ${meaning}`,
      };
    }
  }
  // "Qual frase significa X" pattern — only when prompt actually states it
  if (prompt && /qual frase significa|tradução de|que significa ['"]/i.test(prompt)) {
    return {
      code: CONTEXT_LEAKS_EXPECTED_ANSWER,
      level: "ERROR",
      where: "promptPt",
      why: "direct translation framing in high mastery pass",
    };
  }
  return null;
}

export function assessEverydayContextQuality(step: LessonStep, masteryPass: number): ContextQualityFinding[] {
  const findings: ContextQualityFinding[] = [];
  // Só prompts de tarefa — títulos de seção ("Tradução") não contam como leak de resposta.
  const taskPrompt = [step.dialoguePrompt, step.promptPt, step.prompt].filter(Boolean).join(" ");
  const blob = [taskPrompt, step.title, step.body].filter(Boolean).join(" ");
  if (taskPrompt.length > 160) {
    findings.push({
      code: EVERYDAY_CONTEXT_QUALITY,
      level: "WARNING",
      where: step.kind,
      why: "context prompt too long (>160 chars)",
    });
  }
  if (/magicamente|está andando pela China|três palavras flutuando/i.test(blob)) {
    findings.push({
      code: EVERYDAY_CONTEXT_QUALITY,
      level: "ERROR",
      where: step.kind,
      why: "artificial storybook context",
    });
  }
  const leak = detectContextAnswerLeak({
    masteryPass,
    promptPt: taskPrompt,
    expectedHanzi: step.correctAnswer || step.targetHanzi || step.hanzi,
    expectedMeaningPt: step.targetMeaningPt || step.pt,
  });
  if (leak) findings.push(leak);
  return findings;
}

export function detectEverydayCurriculumLeak(input: {
  scenario: EverydayScenario;
  taughtHanzi: ReadonlySet<string>;
  allowDiscoveryIntro?: boolean;
}): ContextQualityFinding | null {
  if (input.allowDiscoveryIntro) return null;
  const needed = [
    ...(input.scenario.prerequisiteHanzi ?? []),
    input.scenario.expectedHanzi,
    ...(input.scenario.npcLineHanzi ? [input.scenario.npcLineHanzi.replace(/[！？。]/g, "")] : []),
  ];
  for (const raw of needed) {
    const h = raw.replace(/[！？。、\s]/g, "");
    if (!h) continue;
    // substring match: taught set may hold shorter chunks
    const ok = [...input.taughtHanzi].some((t) => h.includes(t) || t.includes(h) || h === t);
    if (!ok && input.scenario.prerequisiteHanzi?.length) {
      const prereqOk = input.scenario.prerequisiteHanzi.every((p) =>
        [...input.taughtHanzi].some((t) => t.includes(p) || p.includes(t))
      );
      if (!prereqOk) {
        return {
          code: EVERYDAY_CURRICULUM_LEAK,
          level: "ERROR",
          where: input.scenario.id,
          why: `requires ${h} before taught`,
        };
      }
    }
  }
  return null;
}

export function isProductionKind(kind: string): boolean {
  return /produc|write|free_production|sentence_build|reverse_recall|dialogue_completion|fill_blank|substitution/.test(
    kind
  );
}

export function isConversationKind(kind: string): boolean {
  return /conversation|dialogue/.test(kind);
}

export function isTransferKind(kind: string): boolean {
  return /transfer_task|conversation_repair/.test(kind) || kind === "contextual_choice";
}

export function humanQualityDimensions(
  steps: readonly LessonStep[],
  intents: readonly EverydayIntent[]
): {
  metalinguisticShare: number;
  humanSituationShare: number;
  communicativeIntentCoverage: number;
  productionShare: number;
  conversationShare: number;
  transferShare: number;
  contextualReuseShare: number;
  directTranslationShare: number;
  everydayScenarioCount: number;
  uniqueIntentCount: number;
} {
  const n = Math.max(1, steps.length);
  let meta = 0;
  let human = 0;
  let production = 0;
  let conversation = 0;
  let transfer = 0;
  let reuse = 0;
  let translation = 0;
  let scenarios = 0;
  for (const step of steps) {
    const blob = [step.dialoguePrompt, step.promptPt, step.title, step.body].filter(Boolean).join(" ");
    if (/o que é|tradução|pinyin|tom\b|hànzì|alfabeto/i.test(blob) || step.kind === "intro") meta += 1;
    if (step.everydayIntent && intentIsCommunicative(step.everydayIntent as EverydayIntent)) human += 1;
    else if (/você |alguém |encontrou|pede|restaurante|hotel|metrô/i.test(blob)) human += 1;
    if (isProductionKind(step.kind)) production += 1;
    if (isConversationKind(step.kind)) conversation += 1;
    if (isTransferKind(step.kind) || step.learnerAgency === "TRANSFER") transfer += 1;
    if (step.contextRole === "CONTEXTUAL_REUSE") reuse += 1;
    if (/tradução|significa '/i.test(blob)) translation += 1;
    if (step.everydayScenarioId) scenarios += 1;
  }
  const unique = new Set(intents.filter(intentIsCommunicative));
  return {
    metalinguisticShare: meta / n,
    humanSituationShare: human / n,
    communicativeIntentCoverage: unique.size / Math.max(1, intents.length),
    productionShare: production / n,
    conversationShare: conversation / n,
    transferShare: transfer / n,
    contextualReuseShare: reuse / n,
    directTranslationShare: translation / n,
    everydayScenarioCount: scenarios,
    uniqueIntentCount: unique.size,
  };
}
