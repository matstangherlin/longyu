import { useEffect } from "react";
import { useStore } from "../../lib/store";
import { zLayerClass } from "../ui/layers";
import { cx } from "../ui/primitives";
import { isTestFixturesAllowed } from "../../lib/appEnvironment";

const SYNC_BANNER_MS = 6000;

declare global {
  interface Window {
    __longyuSetEconomySyncMessage?: (message: string | null) => void;
  }
}

/**
 * Aviso transitório de sync. Fica abaixo do header — nunca no rodapé,
 * para não cobrir CTA nem a TabBar. Expira sozinho e não sobrevive a reload.
 */
export function EconomySyncBanner() {
  const message = useStore((s) => s.economySyncMessage);
  const setEconomySyncMessage = useStore((s) => s.setEconomySyncMessage);
  const testFixtures = isTestFixturesAllowed();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setEconomySyncMessage(null), SYNC_BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [message, setEconomySyncMessage]);

  useEffect(() => {
    if (!testFixtures) return;
    window.__longyuSetEconomySyncMessage = setEconomySyncMessage;
    return () => {
      if (window.__longyuSetEconomySyncMessage === setEconomySyncMessage) {
        delete window.__longyuSetEconomySyncMessage;
      }
    };
  }, [testFixtures, setEconomySyncMessage]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-economy-sync-banner=""
      className={cx(
        "pointer-events-none fixed inset-x-0 top-[calc(var(--app-header-height)+0.5rem)] mx-auto w-[min(calc(100vw-2rem),24rem)] px-3",
        zLayerClass.toast
      )}
    >
      <div className="rounded-2xl border border-line/80 bg-surface/95 px-3 py-2 text-center text-xs font-medium text-ink-soft shadow-card backdrop-blur">
        {message}
      </div>
    </div>
  );
}
