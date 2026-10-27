import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isBusinessSurfaceEnabled, isSocialSurfaceEnabled } from "../../lib/cloud/backendCapability";

/** LGY-032 — /amigos e /convide voltam ao perfil quando a superfície está desligada. */
export function SocialSurface({ children }: { children: ReactNode }) {
  if (!isSocialSurfaceEnabled()) return <Navigate to="/perfil" replace />;
  return children;
}

/** LGY-046 — /business volta à jornada quando a superfície está desligada. */
export function BusinessSurface({ children }: { children: ReactNode }) {
  if (!isBusinessSurfaceEnabled()) return <Navigate to="/jornada" replace />;
  return children;
}
