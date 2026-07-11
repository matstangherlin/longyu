import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/primitives";
import { usePwaUpdateActions } from "../../hooks/usePwaUpdate";
import {
  getPwaUpdateBlockReason,
  pwaUpdateBlockMessage,
  shouldDeferPwaUpdate,
} from "../../lib/pwaUpdatePolicy";
import { isPwaUpdateAvailable } from "../../lib/pwaUpdateState";

export function PwaUpdatePrompt() {
  const location = useLocation();
  const { applying, applyUpdate } = usePwaUpdateActions();
  const [visible, setVisible] = useState(false);
  const [blockReason, setBlockReason] = useState<ReturnType<typeof getPwaUpdateBlockReason>>(null);

  useEffect(() => {
    const sync = () => {
      const available = isPwaUpdateAvailable();
      const reason = getPwaUpdateBlockReason(location.pathname, location.search);
      setBlockReason(reason);
      setVisible(available);
    };

    sync();
    const timer = window.setInterval(sync, 1500);
    return () => window.clearInterval(timer);
  }, [location.pathname, location.search]);

  if (!visible) return null;

  const deferred = shouldDeferPwaUpdate(location.pathname, location.search);

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[70] mx-auto max-w-lg rounded-2xl border border-line bg-surface p-4 shadow-lift sm:bottom-6"
    >
      <p className="text-sm font-semibold text-ink">Nova versão disponível</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">
        {deferred
          ? pwaUpdateBlockMessage(blockReason)
          : "Seu progresso será sincronizado antes de recarregar."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={deferred || applying}
          onClick={() => void applyUpdate()}
        >
          {applying ? "Atualizando…" : "Atualizar agora"}
        </Button>
        <Link to="/sobre#changelog">
          <Button size="sm" variant="outline">
            Ver novidades
          </Button>
        </Link>
      </div>
    </div>
  );
}
