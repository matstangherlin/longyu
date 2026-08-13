import { useStore } from "../../lib/store";

export function EconomySyncBanner() {
  const message = useStore((s) => s.economySyncMessage);
  if (!message) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-[calc(var(--app-bottom-nav-height)+0.5rem)] left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-line/80 bg-surface/95 px-3 py-2 text-center text-xs font-medium text-ink-soft shadow-card backdrop-blur lg:bottom-6"
    >
      {message}
    </div>
  );
}
