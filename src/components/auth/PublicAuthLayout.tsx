import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthBootstrap } from "./AuthBootstrap";
import { CloudSyncBootstrap } from "./CloudSyncBootstrap";
import { TelemetryConsentBootstrap } from "../privacy/TelemetryConsentBootstrap";
import { ErrorBoundary } from "../system/ErrorBoundary";
import { useStore } from "../../lib/store";

export function PublicAuthLayout({ children }: { children?: ReactNode }) {
  const theme = useStore((s) => s.theme);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="theme-transition min-h-screen overflow-x-clip bg-bg px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <ErrorBoundary resetKey={location.pathname} area="auth">
        {children ?? <Outlet />}
      </ErrorBoundary>
      <AuthBootstrap />
      <CloudSyncBootstrap />
      <TelemetryConsentBootstrap />
    </div>
  );
}
