/**
 * RC2.2.10 — botão VOLTAR do Android.
 *
 * Ordem (a primeira que se aplica vence):
 * 1. modal / overlay / detail aberto → fecha (Escape, o mesmo caminho do teclado);
 * 2. há histórico no app → volta uma rota;
 * 3. rota interna sem histórico (ex.: aberta por deep link) → vai para a Jornada;
 * 4. SÓ na raiz → minimiza o app (não mata o processo: a lição em andamento,
 *    Review, Culture e Phase Challenge continuam salvos pelo store de sempre).
 *
 * Nunca `exitApp()` em rota arbitrária (test:android-platform-boundaries).
 *
 * RC2.2.21 — prioridade completa (BACK_PRIORITY): teclado aberto → fecha o
 * teclado; sheet/modal → fecha o do topo; orientação → fecha; subtela/lição
 * (guarda da tela) → a tela decide; rota → volta; raiz → minimiza.
 */
export type BackAction = "close-keyboard" | "dismiss-overlay" | "dismiss-guidance" | "history-back" | "navigate-home" | "minimize-app";

export const BACK_PRIORITY = ["keyboard", "modal", "guidance", "subview", "route", "exit"] as const;

export const BACK_ROOT_PATHS: readonly string[] = ["/", "/jornada"];
export const BACK_HOME_PATH = "/jornada";

export function decideBackAction(input: { keyboardOpen?: boolean; overlayOpen: boolean; guidanceOpen?: boolean; canGoBack: boolean; pathname: string }): BackAction {
  if (input.keyboardOpen) return "close-keyboard";
  if (input.overlayOpen) return "dismiss-overlay";
  if (input.guidanceOpen) return "dismiss-guidance";
  if (input.canGoBack) return "history-back";
  const path = input.pathname.replace(/\/+$/, "") || "/";
  if (BACK_ROOT_PATHS.includes(path)) return "minimize-app";
  return "navigate-home";
}

/** Modal, sheet, popover ou paywall aberto — todos fecham com Escape hoje. */
export function isOverlayOpen(doc: Document = document): boolean {
  return isModalOpen(doc) || isGuidanceOpen(doc);
}

/** RC2.2.21 — modal/sheet de verdade (a orientação é separada, vem depois). */
export function isModalOpen(doc: Document = document): boolean {
  if (doc.body?.dataset.modalScrollLock) return true;
  return Array.from(doc.querySelectorAll('[aria-modal="true"], [role="dialog"]')).some((element) => !element.closest("[data-native-back-dismiss], [data-guidance-surface]"));
}

/** Coachmark/orientação na tela (GuidanceHost marca data-native-back-dismiss). */
export function isGuidanceOpen(doc: Document = document): boolean {
  return Boolean(doc.querySelector("[data-native-back-dismiss], [data-guidance-surface]"));
}

/** Teclado aberto (o shell nativo marca data-native-keyboard). */
export function isKeyboardOpen(doc: Document = document): boolean {
  return doc.documentElement?.dataset.nativeKeyboard === "open";
}

/** Fecha o teclado tirando o foco do campo (o SO recolhe o IME). */
export function closeKeyboard(doc: Document = document): void {
  const active = doc.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

export function dismissTopOverlay(doc: Document = document): void {
  const target = (doc.activeElement as HTMLElement | null) ?? doc.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
}

/** react-router guarda o índice da entrada em history.state.idx. */
export function routerCanGoBack(win: Window = window): boolean {
  const state = win.history.state as { idx?: unknown } | null;
  return typeof state?.idx === "number" && state.idx > 0;
}
