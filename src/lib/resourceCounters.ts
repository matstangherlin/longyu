/**
 * RC2.2.22 — contadores de recursos do lado JS (QA).
 *
 * Quem registra um ouvinte nativo ou um timer crítico chama `track*` e usa o
 * "liberar" devolvido. Em repouso, o esperado é 0 — ou um valor explicitamente
 * justificado (ex.: a captura técnica global, instalada uma vez no boot).
 * Só números; nenhum conteúdo.
 */
let observers = 0;
let criticalTimers = 0;

function tracker(inc: () => void, dec: () => void): () => void {
  inc();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    dec();
  };
}

export function trackObserver(): () => void {
  return tracker(
    () => {
      observers += 1;
    },
    () => {
      observers = Math.max(0, observers - 1);
    }
  );
}

export function trackCriticalTimer(): () => void {
  return tracker(
    () => {
      criticalTimers += 1;
    },
    () => {
      criticalTimers = Math.max(0, criticalTimers - 1);
    }
  );
}

export interface JsResourceCounters {
  activeObservers: number;
  activeTimersCritical: number;
}

export function jsResourceCounters(): JsResourceCounters {
  return { activeObservers: observers, activeTimersCritical: criticalTimers };
}

/** Recursos que justificadamente ficam vivos em repouso (documentados no console). */
export const JUSTIFIED_IDLE_RESOURCES = ["captura técnica global (instalada uma vez no boot, só em QA)", "ouvinte do estado do TTS (um por app)"] as const;

/** Algum contador acima de 0 em repouso? (nativo + JS) */
export function idleLeaks(counters: Record<string, number | string | undefined>): string[] {
  return Object.entries(counters)
    .filter(([key, value]) => typeof value === "number" && value > 0 && key !== "practiceStateCode")
    .map(([key]) => key);
}

export function resetResourceCountersForTests(): void {
  observers = 0;
  criticalTimers = 0;
}
