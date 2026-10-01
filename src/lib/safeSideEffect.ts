/**
 * RC2.2.31C — side effects never block pedagogical navigation.
 *
 * Use for gesture unlock, haptics, traces, sound FX, coachmarks.
 * Never wrap conversationReducer / setRuntime / goTo core mutations.
 */
import { recordTechEvent } from "./techEvents";

export function safeSideEffect(name: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    try {
      recordTechEvent("js_error", {
        errorClass: err instanceof Error ? err.name : "SideEffectError",
        source: `safeSideEffect:${name}`,
      });
    } catch {
      /* telemetry itself must not throw */
    }
  }
}
