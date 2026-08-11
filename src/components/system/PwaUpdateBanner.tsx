import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/primitives";

/**
 * Avisa quando há bundle novo do service worker.
 * Evita o aluno ficar preso em cache antigo achando que a beta "quebrou".
 */
export function PwaUpdateBanner() {
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
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-lift sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto"
    >
      <p className="min-w-0 flex-1 leading-5 text-ink-soft">
        <span className="font-semibold text-ink">Nova versão</span>
        <span className="mx-1 text-ink-faint">·</span>
        Atualize para pegar correções da beta.
      </p>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => {
          void updateSWRef.current?.(true);
        }}
      >
        Atualizar
      </Button>
      <button
        type="button"
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-ink-faint hover:bg-surface-2 hover:text-ink"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dispensar aviso de atualização"
      >
        Depois
      </button>
    </div>
  );
}
