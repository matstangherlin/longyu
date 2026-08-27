import { Navigate, Outlet } from "react-router-dom";
import { isQaFastPathAllowed } from "../../lib/appEnvironment";

/**
 * Impede `/qa` em Production Beta mesmo se a rota existir no bundle.
 * Query string, marker localStorage, deep link e refresh não contornam o env.
 */
export function QaFastPathGate() {
  if (!isQaFastPathAllowed()) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="min-h-dvh bg-bg px-4 py-6 text-ink">
      <Outlet />
    </div>
  );
}
