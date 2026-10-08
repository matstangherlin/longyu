/**
 * RC2.3.0 — piloto de contexto humano no início da Jornada.
 * RC2.3.2 — classificador delega ao contrato EverydayIntent (regex = fallback).
 */
import type { LessonStep } from "../../data/journey";
import {
  inferEverydayIntentFromText,
  intentIsCommunicative,
  type EverydayIntent,
} from "../everydayMandarin/intents";

export type HumanContextKind =
  | "METALINGUISTIC"
  | "HUMAN_SITUATION"
  | "PRODUCTION"
  | "CONVERSATION"
  | "TRANSFER"
  | "VISUAL"
  | "AUDIO";

export function classifyHumanContext(step: LessonStep): HumanContextKind {
  if (step.kind === "conversation_scene" || step.kind === "conversation_repair") return "CONVERSATION";
  if (step.kind === "transfer_task" || step.learnerAgency === "TRANSFER") return "TRANSFER";
  if (step.kind === "image_choice" || step.kind === "compare_with_image") return "VISUAL";
  if (step.kind === "listen" || step.kind === "listen_select" || step.kind === "audio_discrimination") return "AUDIO";
  if (/produc|write|free_production|sentence_build|reverse_recall|dialogue_completion/.test(step.kind)) {
    return "PRODUCTION";
  }

  const intent = (step.everydayIntent as EverydayIntent | undefined) ||
    inferEverydayIntentFromText(
      [step.title, step.prompt, step.promptPt, step.dialoguePrompt, step.body].filter(Boolean).join(" ")
    ).everydayIntent;

  if (intentIsCommunicative(intent) || step.kind === "dialogue_choice" || step.kind === "contextual_choice") {
    return "HUMAN_SITUATION";
  }
  if (intent === "METALINGUISTIC" || step.kind === "intro") return "METALINGUISTIC";
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
