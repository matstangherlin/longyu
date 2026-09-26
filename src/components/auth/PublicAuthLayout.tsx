import { useResolvedTheme } from "../../lib/useResolvedTheme";
import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthBootstrap } from "./AuthBootstrap";
import { CloudSyncBootstrap } from "./CloudSyncBootstrap";
import { TelemetryConsentBootstrap } from "../privacy/TelemetryConsentBootstrap";
import { ErrorBoundary } from "../system/ErrorBoundary";

export function PublicAuthLayout({ children }: { children?: ReactNode }) {
  const theme = useResolvedTheme();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="theme-transition min-h-screen overflow-x-clip bg-bg px-4 pb-[max(1.5rem,var(--app-safe-bottom))] pt-[max(1.5rem,var(--app-safe-top))] sm:px-6">
      <ErrorBoundary resetKey={location.pathname} area="auth">
        {children ?? <Outlet />}
      </ErrorBoundary>
      <AuthBootstrap />
      <CloudSyncBootstrap />
      <TelemetryConsentBootstrap />
    </div>
  );
}
