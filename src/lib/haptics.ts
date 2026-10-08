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
import { playNativeHaptic } from "./platform/nativeHaptics";
import { HAPTIC_MAP, HAPTIC_WEIGHT, hapticDecision, type HapticEvent } from "./hapticPolicy";

export { HAPTIC_GESTURE_WINDOW_MS, HAPTIC_MAP, HAPTIC_RESULT_SETTLE_MS, hapticDecision, type HapticEvent } from "./hapticPolicy";
import { logSensory } from "./sensoryLog";

let lastAt = 0;
let lastWeight = 0;
const fired = new Set<string>();

export function hapticsEnabled(): boolean {
  return useStore.getState().hapticsEnabled !== false;
}

export function haptic(event: HapticEvent): void {
  const now = Date.now();
  const decision = hapticDecision({ enabled: hapticsEnabled(), event, now, lastAt, lastWeight });
  if (!decision.fire) {
    logSensory({ channel: "haptic", event, outcome: "suppressed", reason: decision.reason });
    return;
  }
  lastAt = now;
  lastWeight = HAPTIC_WEIGHT[event];
  logSensory({ channel: "haptic", event, outcome: "played" });
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
