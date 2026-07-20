import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { warmUpVoices } from "../../lib/tts";
import { markSessionStart } from "../../lib/proOfferEngine";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { AchievementsWatcher } from "../achievements/AchievementsWatcher";
import { AuthBootstrap } from "../auth/AuthBootstrap";
import { CloudSyncBootstrap } from "../auth/CloudSyncBootstrap";
import { EntitlementBootstrap } from "../auth/EntitlementBootstrap";
import { DesktopFeedbackFab } from "../feedback/DesktopFeedbackFab";
import { FeedbackProvider } from "../feedback/FeedbackContext";
import { EconomySyncBanner } from "../economy/EconomySyncBanner";
import { EconomyBootstrap } from "../economy/EconomyBootstrap";
import { TelemetryConsentBootstrap } from "../privacy/TelemetryConsentBootstrap";
import { TelemetryConsentWatcher } from "../privacy/TelemetryConsentWatcher";
import { ErrorBoundary } from "../system/ErrorBoundary";
import { isAdminEmail } from "../../lib/feedback";

export function AppShell() {
  const theme = useStore((s) => s.theme);
  const registerActivity = useStore((s) => s.registerActivity);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const completedLessons = useStore((s) => s.completedLessons);
  const account = useStore((s) => s.accounts[s.currentAccountId]);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/esqueci-senha" ||
    location.pathname === "/redefinir-senha";
  const isOnboarding = location.pathname === "/conta" && !accountSetupComplete;
  const isAdminRoute = location.pathname.startsWith("/admin");
  // Modo foco: durante lição e desafio o app esconde TopBar (mobile) e TabBar
  // para liberar espaço vertical — nada compete com o exercício.
  const focusMode =
    /^\/licao\/[^/]+\/player$/.test(location.pathname) || location.pathname.startsWith("/teste/");

  // Aplica o tema no <html> e prepara as vozes de TTS.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    registerActivity();
    warmUpVoices();
    // Ancora do "primeiro minuto de uso": o ProOfferEngine não oferece Pro logo
    // na entrada do app (evita interromper quem acabou de abrir).
    markSessionStart();
  }, [registerActivity]);

  // Usuário sem conta/progresso em página interna volta para a landing "/",
  // que dá contexto antes do onboarding (/conta continua acessível direto).
  useEffect(() => {
    if (
      !accountSetupComplete &&
      completedLessons.length === 0 &&
      location.pathname !== "/conta" &&
      location.pathname !== "/login" &&
      location.pathname !== "/esqueci-senha" &&
      location.pathname !== "/redefinir-senha" &&
      location.pathname !== "/pro" &&
      !(isAdminRoute && isAdminEmail(account?.email))
    ) {
      navigate("/", { replace: true });
    }
  }, [accountSetupComplete, completedLessons.length, location.pathname, navigate, isAdminRoute, account?.email]);

  // Rola para o topo ao trocar de rota.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isOnboarding || isAuthPage) {
    return (
      <FeedbackProvider>
        <div className="theme-transition min-h-screen bg-bg px-4 py-6 sm:px-6">
          <ErrorBoundary resetKey={location.pathname} area="auth">
            <Outlet />
          </ErrorBoundary>
        </div>
        <AuthBootstrap />
        <CloudSyncBootstrap />
        <EntitlementBootstrap />
        <TelemetryConsentBootstrap />
      </FeedbackProvider>
    );
  }

  return (
    <FeedbackProvider>
    <div className="theme-transition flex min-h-screen bg-bg">
      {/* Modo foco = lição/desafio: nada de sidebar, topbar, tab bar ou FAB.
          Só o conteúdo do exercício, como um app de idiomas. */}
      {!focusMode && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        {!focusMode && <TopBar />}
        {/* Padding bottom cobre a altura da tab bar + safe area: nenhum botão
            principal pode ficar escondido atrás dela no mobile. No modo foco a
            tab bar some, então o padding encolhe. */}
        <main
          className={[
            "mx-auto w-full max-w-content flex-1 px-3 sm:px-5 lg:px-6",
            focusMode
              ? "pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 sm:pt-3 lg:pb-6"
              : "pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 sm:pt-5 lg:pb-12",
          ].join(" ")}
        >
          <ErrorBoundary resetKey={location.pathname} area="page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {!focusMode && <TabBar />}
      {!focusMode && <DesktopFeedbackFab />}
      <EconomySyncBanner />
      <AuthBootstrap />
      <CloudSyncBootstrap />
      <EntitlementBootstrap />
      <TelemetryConsentBootstrap />
      <EconomyBootstrap />
      <AchievementsWatcher />
      <TelemetryConsentWatcher />
    </div>
    </FeedbackProvider>
  );
}
