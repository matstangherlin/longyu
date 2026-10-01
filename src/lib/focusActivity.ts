import { useEffect, useSyncExternalStore } from "react";

/**
 * RC2.2.24 — FOCUS MODE para atividades fora do LessonPlayer (Tone Trainer,
 * Revisão, Pinyin, Hànzì, Fala, tarefa de Imersão/Cultura).
 *
 * O hub escolhe; depois do COMEÇAR a atividade é dona da tela: o AppShell
 * esconde TopBar, TabBar e atalhos (o mesmo `focusMode` do player). Mostrar
 * só: X, progresso, atividade, feedback, CTA. Contador (não booleano): duas
 * telas sobrepostas não se desligam uma à outra.
 */
let active = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of Array.from(listeners)) listener();
}

export function enterFocusActivity(): () => void {
  active += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active = Math.max(0, active - 1);
    emit();
  };
}

export function focusActivityActive(): boolean {
  return active > 0;
}

/** A tela declara: "agora estou em atividade" (enquanto `on` for true). */
export function useFocusActivity(on: boolean): void {
  useEffect(() => (on ? enterFocusActivity() : undefined), [on]);
}

export function useIsFocusActivity(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    focusActivityActive,
    () => false
  );
}

export function resetFocusActivityForTests(): void {
  active = 0;
  emit();
}
