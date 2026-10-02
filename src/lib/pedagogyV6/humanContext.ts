/**
 * RC2.3.0 — piloto de contexto humano no início da Jornada.
 * Expansão completa = RC2.3.2.
 */
import type { LessonStep } from "../../data/journey";

export type HumanContextKind =
  | "METALINGUISTIC"
  | "HUMAN_SITUATION"
  | "PRODUCTION"
  | "CONVERSATION"
  | "TRANSFER"
  | "VISUAL"
  | "AUDIO";

const META_HINT =
  /o que é|qual (é|destes)|tradução correta|camada|pinyin|hànzì|hanzi|tom\b|alfabeto|variedade padrão|mandarim é/i;

const HUMAN_HINT =
  /pessoa|manhã|encontra|cumpriment|diz |você |amigo|garçom|na rua|ao chegar|quando alguém|olha para você|situação/i;

export function classifyHumanContext(step: LessonStep): HumanContextKind {
  if (step.kind === "conversation_scene" || step.kind === "conversation_repair") return "CONVERSATION";
  if (step.kind === "transfer_task") return "TRANSFER";
  if (step.kind === "image_choice" || step.kind === "compare_with_image") return "VISUAL";
  if (step.kind === "listen" || step.kind === "listen_select" || step.kind === "audio_discrimination") return "AUDIO";
  if (/produc|write|free_production|sentence_build|reverse_recall/.test(step.kind)) return "PRODUCTION";
  const blob = [step.title, step.prompt, step.promptPt, step.dialoguePrompt, step.body].filter(Boolean).join(" ");
  if (HUMAN_HINT.test(blob) || step.kind === "dialogue_choice" || step.kind === "contextual_choice") {
    return "HUMAN_SITUATION";
  }
  if (META_HINT.test(blob) || step.kind === "intro") return "METALINGUISTIC";
  return "METALINGUISTIC";
}

export interface HumanContextReport {
  total: number;
  metalinguistic: number;
  humanSituation: number;
  production: number;
  conversation: number;
  transfer: number;
  visual: number;
  audio: number;
  humanShare: number;
}

export function summarizeHumanContext(steps: readonly LessonStep[]): HumanContextReport {
  const counts: Record<HumanContextKind, number> = {
    METALINGUISTIC: 0,
    HUMAN_SITUATION: 0,
    PRODUCTION: 0,
    CONVERSATION: 0,
    TRANSFER: 0,
    VISUAL: 0,
    AUDIO: 0,
  };
  for (const step of steps) counts[classifyHumanContext(step)] += 1;
  const total = Math.max(1, steps.length);
  const humanish =
    counts.HUMAN_SITUATION + counts.PRODUCTION + counts.CONVERSATION + counts.TRANSFER + counts.VISUAL;
  return {
    total: steps.length,
    metalinguistic: counts.METALINGUISTIC,
    humanSituation: counts.HUMAN_SITUATION,
    production: counts.PRODUCTION,
    conversation: counts.CONVERSATION,
    transfer: counts.TRANSFER,
    visual: counts.VISUAL,
    audio: counts.AUDIO,
    humanShare: humanish / total,
  };
}
