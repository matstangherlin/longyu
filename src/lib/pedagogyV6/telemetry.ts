/**
 * RC2.3.0 — telemetria local sem PII (prepara Personal Mastery / RC2.3.6).
 */
import type { LessonStep } from "../../data/journey";
import { cognitiveOperationFor } from "../semanticRepetition";
import { interactionFamilyFor } from "./perceptualRepetition";

export type ResponseTimeBucket = "fast" | "normal" | "slow" | "unknown";

export interface PedagogyTelemetryEvent {
  at: number;
  lessonId: string;
  conceptId: string | null;
  masteryPass: number;
  cognitiveOperation: string;
  interactionFamily: string;
  helpUsed: boolean;
  correct: boolean | null;
  responseTimeBucket: ResponseTimeBucket;
  remediation: boolean;
  visualUsed: boolean;
  audioUsed: boolean;
}

const LIMIT = 200;
const buffer: PedagogyTelemetryEvent[] = [];

export function responseTimeBucket(ms: number | null | undefined): ResponseTimeBucket {
  if (ms == null || !Number.isFinite(ms)) return "unknown";
  if (ms < 2500) return "fast";
  if (ms < 8000) return "normal";
  return "slow";
}

export function recordPedagogyTelemetry(event: PedagogyTelemetryEvent): void {
  buffer.push(event);
  if (buffer.length > LIMIT) buffer.splice(0, buffer.length - LIMIT);
  if (typeof window !== "undefined") {
    (window as Window & { __longyuPedagogyTelemetry?: PedagogyTelemetryEvent[] }).__longyuPedagogyTelemetry =
      buffer.slice();
  }
}

export function pedagogyTelemetry(): readonly PedagogyTelemetryEvent[] {
  return buffer.slice();
}

export function resetPedagogyTelemetryForTests(): void {
  buffer.length = 0;
}

export function telemetryFromStep(input: {
  lessonId: string;
  masteryPass: number;
  step: LessonStep;
  correct?: boolean | null;
  helpUsed?: boolean;
  responseMs?: number | null;
}): PedagogyTelemetryEvent {
  const step = input.step;
  return {
    at: Date.now(),
    lessonId: input.lessonId,
    conceptId: step.discoveryConceptIds?.[0] ?? step.targetHanzi ?? step.hanzi ?? null,
    masteryPass: input.masteryPass,
    cognitiveOperation: cognitiveOperationFor(step.kind),
    interactionFamily: interactionFamilyFor(step.kind),
    helpUsed: Boolean(input.helpUsed),
    correct: input.correct ?? null,
    responseTimeBucket: responseTimeBucket(input.responseMs),
    remediation: step.pedagogyRole === "remediation",
    visualUsed: Boolean(step.imageId || step.iconId || step.kind === "image_choice"),
    audioUsed: Boolean(step.audioText || step.kind === "listen" || step.kind === "listen_select"),
  };
}
