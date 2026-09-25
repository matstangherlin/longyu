/**
 * RC2.2.14 · BG–DG — feedback tátil com significado.
 *
 * Componentes chamam `haptic(evento)`; este módulo decide:
 *   - preferência `hapticsEnabled` (desligada = nenhuma chamada física);
 *   - só Android nativo (Web: nada);
 *   - no máximo UM feedback por gesto (janela curta; evento mais forte vence);
 *   - `hapticOnce(chave, evento)`: a mesma conquista re-renderizada não vibra de novo.
 *
 * Proibido: vibrar em navegação, scroll, abrir/fechar modal, tocar áudio,
 * hover ou mudança de rota. O mapa abaixo é a lista fechada do que vibra.
 * Som e vibração são preferências independentes.
 */
import { useStore } from "./store";
import { playNativeHaptic, type NativeHapticPattern } from "./platform/nativeHaptics";

export type HapticEvent =
  | "selection"
  | "piecePlaced"
  | "pieceRemoved"
  | "answerCorrect"
  | "answerWrong"
  | "lessonComplete"
  | "practiceComplete"
  | "achievementReveal"
  | "streakMilestone"
  | "chestOpen"
  | "blocked";

/** Mapa central evento → padrão físico (curtos; APIs de impacto/notificação). */
export const HAPTIC_MAP: Record<HapticEvent, NativeHapticPattern> = {
  selection: "impactLight",
  piecePlaced: "impactLight",
  pieceRemoved: "impactLight",
  answerCorrect: "success",
  answerWrong: "warning",
  lessonComplete: "success",
  practiceComplete: "success",
  achievementReveal: "impactMedium",
  streakMilestone: "impactMedium",
  chestOpen: "impactMedium",
  blocked: "warning",
};

/** Força relativa: dentro da mesma janela, só um evento mais forte substitui. */
const HAPTIC_WEIGHT: Record<HapticEvent, number> = {
  selection: 1,
  piecePlaced: 1,
  pieceRemoved: 1,
  answerCorrect: 3,
  answerWrong: 3,
  blocked: 3,
  lessonComplete: 4,
  practiceComplete: 4,
  achievementReveal: 4,
  streakMilestone: 4,
  chestOpen: 4,
};

/** Um gesto = um feedback: eventos disparados juntos por um só toque colapsam. */
export const HAPTIC_GESTURE_WINDOW_MS = 120;

let lastAt = 0;
let lastWeight = 0;
const fired = new Set<string>();

export function hapticsEnabled(): boolean {
  return useStore.getState().hapticsEnabled !== false;
}

export function haptic(event: HapticEvent): void {
  if (!hapticsEnabled()) return;
  const now = Date.now();
  const weight = HAPTIC_WEIGHT[event];
  if (now - lastAt < HAPTIC_GESTURE_WINDOW_MS && weight <= lastWeight) return;
  lastAt = now;
  lastWeight = weight;
  playNativeHaptic(HAPTIC_MAP[event]);
}

/** Vibra só na primeira vez que a chave aparece (ex.: `achievement:<id>`). */
export function hapticOnce(key: string, event: HapticEvent): void {
  if (fired.has(key)) return;
  fired.add(key);
  haptic(event);
}

/** Testes: zera o orçamento e a memória de eventos. */
export function resetHapticsForTests(): void {
  lastAt = 0;
  lastWeight = 0;
  fired.clear();
}
