import { useSyncExternalStore } from "react";

/**
 * Uma cerimônia por vez. O reveal de Selo Cultural e o modal de medalha podem
 * nascer do mesmo evento (concluir a missão que fecha o selo também pode
 * desbloquear "Primeiro Selo Cultural"). Selo e medalha são objetos distintos
 * e cada um tem a sua tela — mas nunca uma em cima da outra.
 */
const active = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

export function holdCelebration(id: string): () => void {
  active.add(id);
  emit();
  return () => {
    if (active.delete(id)) emit();
  };
}

export function isCelebrationActive(exceptId?: string): boolean {
  for (const id of active) if (id !== exceptId) return true;
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** true enquanto alguma outra cerimônia estiver na tela. */
export function useOtherCelebrationActive(selfId: string): boolean {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return isCelebrationActive(selfId);
}
