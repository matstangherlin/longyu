/**
 * RC2.2.14 — adapter ÚNICO de @capacitor/haptics.
 *
 * Nenhum componente importa o plugin: tudo passa por src/lib/haptics.ts, que
 * decide SE e QUANDO vibrar (preferência, orçamento por gesto, uma vez por
 * evento). Aqui só existe o "como": impacto curto ou notificação do sistema.
 * Nada de vibração longa. Web: no-op (sem navigator.vibrate).
 */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isAndroid } from "./nativePlatform";

export type NativeHapticPattern = "impactLight" | "impactMedium" | "success" | "warning";

export function hasNativeHaptics(): boolean {
  return isAndroid();
}

/** Fire-and-forget: nunca bloqueia a UI e nunca mostra erro ao aluno. */
export function playNativeHaptic(pattern: NativeHapticPattern): void {
  if (!hasNativeHaptics()) return;
  let call: Promise<void>;
  try {
    switch (pattern) {
      case "impactLight":
        call = Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "impactMedium":
        call = Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case "success":
        call = Haptics.notification({ type: NotificationType.Success });
        break;
      case "warning":
        call = Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  } catch {
    return;
  }
  void call.catch(() => {
    /* aparelho sem motor de vibração: segue sem feedback tátil */
  });
}
