import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { canUseQaFastPathSession, exitQaFastPathSession } from "../../lib/qaFastPathAccess";

/** Banner visível só em TEST STATE (preview/dev). Sair restaura REAL USER STATE. */
export function QaTestStateBanner() {
  const location = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(canUseQaFastPathSession());
  }, [location.pathname]);

  if (!active) return null;

  return (
    <div
      data-qa-test-state-banner
      role="status"
      className="z-[80] flex w-full shrink-0 items-center justify-between gap-3 bg-accent px-3 py-2 text-xs font-medium text-white"
    >
      <p>Estado de teste QA — não é progresso real, Pro, economia nem sync.</p>
      <button
        type="button"
        data-qa-exit
        className="min-h-9 shrink-0 rounded-lg bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25"
        onClick={() => {
          exitQaFastPathSession();
          window.location.replace("/");
        }}
      >
        Sair do QA
      </button>
    </div>
  );
}
