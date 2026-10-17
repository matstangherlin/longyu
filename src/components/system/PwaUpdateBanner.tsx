import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { shouldRegisterServiceWorker, unregisterNativeServiceWorkers } from "../../lib/platform/serviceWorkerPolicy";

/**
 * Avisa quando há bundle novo do service worker.
 * Evita o aluno ficar preso em cache antigo achando que a beta "quebrou".
 */
/**
 * RC2.3.13R.3.2.5 — AppShell marks <html data-lesson-player> while the focus
 * player is open. The update banner waits for the lesson to end: it used to
 * float over the exercise and the action dock, and "Atualizar" reloaded
 * mid-lesson.
 */
function useLessonPlayerOpen(): boolean {
  const read = () => typeof document !== "undefined" && Boolean(document.documentElement.dataset.lessonPlayer);
  const [open, setOpen] = useState(read);
  useEffect(() => {
    if (typeof MutationObserver !== "function") return undefined;
    const observer = new MutationObserver(() => setOpen(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lesson-player"] });
    setOpen(read());
    return () => observer.disconnect();
  }, []);
  return open;
}

export function PwaUpdateBanner() {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const lessonOpen = useLessonPlayerOpen();
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;

    // RC2.2.10 — no app Android os assets vêm do APK; SW do PWA só no web.
    if (!shouldRegisterServiceWorker()) {
      void unregisterNativeServiceWorkers();
      return () => {
        cancelled = true;
      };
    }

    void import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        updateSWRef.current = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onRegisteredSW(_url, registration) {
            if (!registration) return;
            void registration.update();
            window.setInterval(() => {
              void registration.update();
            }, 60 * 60 * 1000);
          },
        });
      })
      .catch(() => {
        /* SW indisponível em alguns ambientes de teste */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh || lessonOpen) return null;

  return (
    <div
      role="status"
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(var(--app-bottom-nav-height)+0.5rem)] z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-lift lg:inset-x-auto lg:right-4 lg:bottom-4 lg:left-auto"
    >
      <p className="min-w-0 flex-1 leading-5 text-ink-soft">
        <span className="font-semibold text-ink">{t("errors.pwaUpdateTitle")}</span>
        <span className="mx-1 text-ink-faint">·</span>
        {t("errors.pwaUpdateBody")}
      </p>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => {
          void updateSWRef.current?.(true);
        }}
      >
        {t("common.update")}
      </Button>
      <button
        type="button"
        className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs font-medium text-ink-soft hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        onClick={() => setNeedRefresh(false)}
        aria-label={t("errors.pwaDismiss")}
      >
        {t("common.later")}
      </button>
    </div>
  );
}
