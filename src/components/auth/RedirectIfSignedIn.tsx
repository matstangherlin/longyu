import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { canEnterJourney, resolveSessionAudience } from "../../lib/auth/sessionAudience";
import { PageFallback } from "../system/PageFallback";

/**
 * LGY-007 — /login and /cadastro skip the form when a session can already
 * enter the Journey. The form stays unmounted during the check so it cannot flash.
 */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "journey" | "form">("checking");

  useEffect(() => {
    let cancelled = false;
    void resolveSessionAudience()
      .then((audience) => {
        if (cancelled) return;
        setPhase(canEnterJourney(audience) ? "journey" : "form");
      })
      .catch(() => {
        if (!cancelled) setPhase("form");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" data-testid="auth-redirect-check">
        <PageFallback />
      </div>
    );
  }

  if (phase === "journey") return <Navigate to="/jornada" replace />;
  return children;
}
