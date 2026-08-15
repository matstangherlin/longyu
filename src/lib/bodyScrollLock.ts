/**
 * Trava de scroll do body compartilhada entre Lesson Player e modais.
 *
 * Sem isto, o ModalOverlay capturava `overflow: hidden` do player como
 * "valor anterior" e, ao fechar a medalha na Jornada, reaplicava hidden —
 * a tela congelava e não rolava.
 */

let modalLockCount = 0;

export function acquireModalBodyScrollLock(): void {
  modalLockCount += 1;
  document.body.dataset.modalScrollLock = String(modalLockCount);
  document.body.style.overflow = "hidden";
}

export function releaseModalBodyScrollLock(): void {
  modalLockCount = Math.max(0, modalLockCount - 1);
  if (modalLockCount === 0) {
    delete document.body.dataset.modalScrollLock;
    // Player ativo mantém a trava; fora dele, libera de verdade.
    if (document.documentElement.dataset.lessonPlayer === "1") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return;
  }
  document.body.dataset.modalScrollLock = String(modalLockCount);
}

export function hasModalBodyScrollLock(): boolean {
  return modalLockCount > 0;
}

/**
 * Libera qualquer trava residual do Lesson Player ao sair da rota.
 * Respeita modal aberto (só tira position:fixed / touch-action).
 */
export function releaseLessonPlayerPageScrollLock(options?: { restoreScrollY?: number }): void {
  const html = document.documentElement;
  const body = document.body;
  delete html.dataset.lessonPlayer;
  html.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.touchAction = "";
  if (modalLockCount === 0) {
    body.style.overflow = "";
  } else {
    body.style.overflow = "hidden";
  }
  const y = options?.restoreScrollY;
  if (typeof y === "number" && Number.isFinite(y)) {
    window.scrollTo(0, Math.max(0, y));
  }
}

/** Cinto de segurança em rotas normais (Jornada etc.): limpa lock órfão. */
export function ensurePageScrollUnlocked(): void {
  if (document.documentElement.dataset.lessonPlayer === "1") return;
  if (modalLockCount > 0) return;
  const body = document.body;
  const html = document.documentElement;
  if (
    body.style.position === "fixed" ||
    body.style.overflow === "hidden" ||
    body.style.touchAction === "none" ||
    html.style.overflow === "hidden"
  ) {
    releaseLessonPlayerPageScrollLock({ restoreScrollY: window.scrollY });
  }
}
