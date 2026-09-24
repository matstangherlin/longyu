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
 */
export type BackAction = "dismiss-overlay" | "history-back" | "navigate-home" | "minimize-app";

export const BACK_ROOT_PATHS: readonly string[] = ["/", "/jornada"];
export const BACK_HOME_PATH = "/jornada";

export function decideBackAction(input: { overlayOpen: boolean; canGoBack: boolean; pathname: string }): BackAction {
  if (input.overlayOpen) return "dismiss-overlay";
  if (input.canGoBack) return "history-back";
  const path = input.pathname.replace(/\/+$/, "") || "/";
  if (BACK_ROOT_PATHS.includes(path)) return "minimize-app";
  return "navigate-home";
}

/** Modal, sheet, popover ou paywall aberto — todos fecham com Escape hoje. */
export function isOverlayOpen(doc: Document = document): boolean {
  if (doc.body?.dataset.modalScrollLock) return true;
  return Boolean(doc.querySelector('[aria-modal="true"], [role="dialog"], [data-native-back-dismiss]'));
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
