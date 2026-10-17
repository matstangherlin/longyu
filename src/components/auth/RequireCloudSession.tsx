import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  finalizeOnboardingPath,
  isPublicAppPath,
  loginNextPath,
  onboardingEntryPath,
} from "../../lib/auth/publicRoutes";
import {
  canEnterJourney,
  resolveSessionAudience,
  type SessionAudience,
} from "../../lib/auth/sessionAudience";
import { pendingOnboardingStarted } from "../../lib/placement/pending";
import { PageFallback } from "../system/PageFallback";
import { readOnline, subscribeNetworkStatus } from "../../lib/platform/networkStatus";

/**
 * Guard de rotas autenticadas. Journey exige cloud_ready no servidor.
 * Sessao Supabase sozinha nao pinta conteudo privado.
 */
export function RequireCloudSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [audience, setAudience] = useState<SessionAudience | null>(null);
  // An offline answer is provisional: when the network returns, ask again.
  const [networkEpoch, setNetworkEpoch] = useState(0);
  useEffect(() => {
    let wasOnline = readOnline();
    return subscribeNetworkStatus((online) => {
      if (online && !wasOnline) setNetworkEpoch((n) => n + 1);
      wasOnline = online;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // RC2.3.13R.3.2.5 — stale-while-revalidate. A learner already let in keeps
    // the shell mounted while the session is re-checked: every tab tap used to
    // blank the screen, unmount AppShell and re-run every bootstrap (cloud pull,
    // economy fetch, league sync). Any other audience still waits on the gate,
    // because a login may just have happened or a redirect may be due.
    setAudience((previous) => (previous && canEnterJourney(previous) ? previous : null));
    void resolveSessionAudience().then((next) => {
      if (!cancelled) setAudience(next);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, networkEpoch]);

  if (isPublicAppPath(location.pathname)) {
    return <>{children}</>;
  }

  if (!audience) {
    // No private content before the session is known (AUTH-014). The frame after
    // the splash is the same loading state as the next one, and it says so.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg" data-testid="auth-gate">
        <PageFallback />
      </div>
    );
  }

  if (canEnterJourney(audience)) {
    return <>{children}</>;
  }

  if (audience === "cloud_pending_onboarding") {
    return <Navigate to={finalizeOnboardingPath(`${location.pathname}${location.search}`)} replace />;
  }

  if (audience === "legacy") {
    return <Navigate to={`/salvar-progresso?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (pendingOnboardingStarted()) {
    return <Navigate to={loginNextPath(location.pathname, location.search)} replace />;
  }

  return <Navigate to={onboardingEntryPath()} replace />;
}
