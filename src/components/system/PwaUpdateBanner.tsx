import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Avisa quando há bundle novo do service worker.
 * Evita o aluno ficar preso em cache antigo achando que a beta "quebrou".
 */
export function PwaUpdateBanner() {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        updateSWRef.current = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
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

  if (!needRefresh) return null;

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
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-ink-faint hover:bg-surface-2 hover:text-ink"
        onClick={() => setNeedRefresh(false)}
        aria-label={t("errors.pwaDismiss")}
      >
        {t("common.later")}
      </button>
    </div>
  );
}
