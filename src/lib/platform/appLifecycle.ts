import { isNativePluginAvailable } from "./nativePlatform";

/**
 * RC2.2.10 — foreground/background do app.
 *
 * Contrato: ir para background NUNCA reseta lição, Review, Culture, Phase
 * Challenge nem estado não concluído. O store do Longyu já persiste a cada
 * mudança; aqui só se AVISA quem quer aproveitar a transição (ex.: o Quiet
 * Sync empurra o progresso antes do Android poder matar o processo).
 *
 * - web: visibilitychange (como antes);
 * - Android: também App.appStateChange (pause/resume da Activity).
 * Transições repetidas são deduplicadas.
 */
export type AppLifecycleState = "active" | "background";

export function subscribeAppLifecycle(onChange: (state: AppLifecycleState) => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  let last: AppLifecycleState = document.visibilityState === "hidden" ? "background" : "active";
  const emit = (next: AppLifecycleState) => {
    if (next === last) return;
    last = next;
    onChange(next);
  };
  const onVisibility = () => emit(document.visibilityState === "hidden" ? "background" : "active");
  document.addEventListener("visibilitychange", onVisibility);

  let disposed = false;
  let removeNative: (() => void) | null = null;
  if (isNativePluginAvailable("App")) {
    void import("@capacitor/app")
      .then(async ({ App }) => {
        const handle = await App.addListener("appStateChange", ({ isActive }) => emit(isActive ? "active" : "background"));
        if (disposed) void handle.remove();
        else removeNative = () => void handle.remove();
      })
      .catch(() => {
        /* sem plugin: visibilitychange basta */
      });
  }

  return () => {
    disposed = true;
    document.removeEventListener("visibilitychange", onVisibility);
    removeNative?.();
  };
}
