import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isPublicAppPath, loginNextPath, onboardingEntryPath } from "../../lib/auth/publicRoutes";
import { resolveSessionAudience, type SessionAudience } from "../../lib/auth/sessionAudience";
import { pendingOnboardingStarted } from "../../lib/placement/pending";

/**
 * Guard de rotas autenticadas. Sem sessão cloud, não pinta conteúdo privado.
 */
export function RequireCloudSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [audience, setAudience] = useState<SessionAudience | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAudience(null);
    void resolveSessionAudience().then((next) => {
      if (!cancelled) setAudience(next);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (isPublicAppPath(location.pathname)) {
    return <>{children}</>;
  }

  if (!audience) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg" data-testid="auth-gate" aria-hidden="true" />
    );
  }

  if (audience === "cloud" || audience === "seeded") {
    return <>{children}</>;
  }

  if (audience === "legacy") {
    return <Navigate to={`/salvar-progresso?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (pendingOnboardingStarted()) {
    return <Navigate to={loginNextPath(location.pathname, location.search)} replace />;
  }

  return <Navigate to={onboardingEntryPath()} replace />;
}
