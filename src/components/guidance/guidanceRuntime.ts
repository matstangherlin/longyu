import { useSyncExternalStore } from "react";
import {
  EMPTY_GUIDANCE_SESSION,
  type GuidancePresentation,
  type GuidanceSession,
} from "../../lib/guidanceOrchestrator";

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

export function getCurrentGuidance(): GuidancePresentation | null {
  return current;
}

export function setCurrentGuidance(next: GuidancePresentation | null): void {
  if (next === current) return;
  current = next;
  emit();
}

export function useGuidanceRuntime(): { session: GuidanceSession; current: GuidancePresentation | null } {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return { session, current };
}

/** Sessão de orientação nova (ex.: "Rever dicas do aplicativo"). */
export function startNewGuidanceSession(): void {
  session = EMPTY_GUIDANCE_SESSION;
  current = null;
  emit();
}

/** Alias para testes. */
export const resetGuidanceRuntimeForTests = startNewGuidanceSession;
