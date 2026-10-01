import { useSyncExternalStore } from "react";
import {
  EMPTY_GUIDANCE_SESSION,
  type GuidancePresentation,
  type GuidanceReasonCode,
  type GuidanceSession,
} from "../../lib/guidanceOrchestrator";
import { recordTechEvent } from "../../lib/techEvents";

/**
 * RC2.2.18 — estado de sessão do orquestrador (RAM): o que já apareceu nesta
 * abertura do app e o que está na tela agora. Um único dono (GuidanceHost)
 * escreve; a dica inline da Jornada só lê. Reabrir o app = sessão nova; o
 * que foi dispensado continua dispensado porque isso mora no store da conta.
 */
let session: GuidanceSession = EMPTY_GUIDANCE_SESSION;
let current: GuidancePresentation | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGuidanceSession(): GuidanceSession {
  return session;
}

export function setGuidanceSession(next: GuidanceSession): void {
  if (next === session) return;
  session = next;
  emit();
}

/**
 * RC2.2.19 — evidência de render. `visibleSince` só é preenchido pela própria
 * superfície quando ela está de fato na tela (posicionada, dentro da viewport,
 * não `invisible`). Escolher uma orientação não é mostrá-la.
 */
let visibleSince: number | null = null;
let evidenceCommitted = false;

export function getCurrentGuidance(): GuidancePresentation | null {
  return current;
}

export function setCurrentGuidance(next: GuidancePresentation | null): void {
  if (next === current) return;
  current = next;
  visibleSince = null;
  evidenceCommitted = false;
  emit();
}

/** Chamado pela superfície visível (coachmark posicionado, card na tela, dica inline). */
export function reportGuidanceVisible(presentation: GuidancePresentation, now: number = Date.now()): void {
  if (presentation !== current || visibleSince != null) return;
  visibleSince = now;
  emit();
}

export function getGuidanceVisibleSince(): number | null {
  return visibleSince;
}

export function isGuidanceEvidenceCommitted(): boolean {
  return evidenceCommitted;
}

export function markGuidanceEvidenceCommitted(): void {
  if (evidenceCommitted) return;
  evidenceCommitted = true;
  emit();
}

export function useGuidanceRuntime(): {
  session: GuidanceSession;
  current: GuidancePresentation | null;
  visibleSince: number | null;
  evidenceCommitted: boolean;
} {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return { session, current, visibleSince, evidenceCommitted };
}

/** Sessão de orientação nova (ex.: "Rever dicas do aplicativo"). */
export function startNewGuidanceSession(): void {
  session = EMPTY_GUIDANCE_SESSION;
  current = null;
  visibleSince = null;
  evidenceCommitted = false;
  emit();
}

/** Alias para testes. */
export const resetGuidanceRuntimeForTests = startNewGuidanceSession;

// ── RC2.2.23 — trilha de ENTREGA (memória; QA lê em /qa/device) ─────────────

export type GuidanceDeliveryStage = "selected" | "render_started" | "visible" | "shown" | "dismissed" | "anchor_fallback" | "render_timeout" | "suppressed";

export interface GuidanceDeliveryEntry {
  at: number;
  guidanceId: string;
  stage: GuidanceDeliveryStage;
  reasonCode?: GuidanceReasonCode | "ANCHOR_FALLBACK" | null;
}

const DELIVERY_LIMIT = 60;
const delivery: GuidanceDeliveryEntry[] = [];

export function recordGuidanceDelivery(entry: Omit<GuidanceDeliveryEntry, "at">): void {
  delivery.push({ ...entry, at: Date.now() });
  if (delivery.length > DELIVERY_LIMIT) delivery.splice(0, delivery.length - DELIVERY_LIMIT);
  recordTechEvent(entry.stage === "shown" ? "coachmark_shown" : "guidance_delivery", { guidanceId: entry.guidanceId, stage: entry.stage, reason: entry.reasonCode ?? null });
}

export function guidanceDeliveryTrace(): readonly GuidanceDeliveryEntry[] {
  return delivery.slice();
}

/** A âncora não apareceu depois de uma tentativa segura: a próxima vez vira card não ancorado. */
export function noteGuidanceAnchorMiss(guidanceId: string): void {
  const misses = session.anchorMisses ?? [];
  if (misses.includes(guidanceId)) return;
  session = { ...session, anchorMisses: [...misses, guidanceId] };
  recordGuidanceDelivery({ guidanceId, stage: "anchor_fallback", reasonCode: "ANCHOR_FALLBACK" });
  emit();
}
