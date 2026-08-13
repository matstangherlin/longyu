import { useEffect, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { PageFallback } from "../system/PageFallback";
import { warmUpVoices, installTTSGestureUnlock } from "../../lib/tts";
import { markSessionStart } from "../../lib/proOfferEngine";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { AchievementsWatcher } from "../achievements/AchievementsWatcher";
import { StreakWatcher } from "../achievements/StreakWatcher";
import { StreakRecoveryWatcher } from "../achievements/StreakRecoveryWatcher";
import { AuthBootstrap } from "../auth/AuthBootstrap";
import { CloudSyncBootstrap } from "../auth/CloudSyncBootstrap";
import { EntitlementBootstrap } from "../auth/EntitlementBootstrap";
import { DesktopFeedbackFab } from "../feedback/DesktopFeedbackFab";
import { EconomySyncBanner } from "../economy/EconomySyncBanner";
import { EconomyBootstrap } from "../economy/EconomyBootstrap";
import { TelemetryConsentBootstrap } from "../privacy/TelemetryConsentBootstrap";
import { TelemetryConsentWatcher } from "../privacy/TelemetryConsentWatcher";
import { ErrorBoundary } from "../system/ErrorBoundary";
import { useLessonPlayerScrollLock } from "../../hooks/useLessonPlayerScrollLock";

export function AppShell() {
  const theme = useStore((s) => s.theme);
  const registerActivity = useStore((s) => s.registerActivity);
  const reconcileStreak = useStore((s) => s.reconcileStreak);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const completedLessons = useStore((s) => s.completedLessons);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/esqueci-senha" ||
    location.pathname === "/redefinir-senha" ||
    location.pathname === "/confirmar-email";
  const isOnboarding = location.pathname === "/conta" && !accountSetupComplete;
  const isAdminRoute = location.pathname.startsWith("/admin");
  // Modo foco: durante lição e desafio o app esconde TopBar (mobile) e TabBar
  // para liberar espaço vertical — nada compete com o exercício.
  const isLessonPlayer = /^\/licao\/[^/]+\/player$/.test(location.pathname);
  const focusMode = isLessonPlayer || location.pathname.startsWith("/teste/");

  // Aplica o tema no <html> e prepara as vozes de TTS.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    registerActivity();
    // Ao abrir a tela: zera a ofensiva se passou 24h sem estudo e abre a janela
    // de recuperação (aviso + recuperar fazendo um exercício).
    reconcileStreak();
    warmUpVoices();
    const removeTTSUnlock = installTTSGestureUnlock();
    // Ancora do "primeiro minuto de uso": o ProOfferEngine não oferece Pro logo
    // na entrada do app (evita interromper quem acabou de abrir).
    markSessionStart();
    return removeTTSUnlock;
  }, [registerActivity, reconcileStreak]);

  // Usuário sem conta/progresso em página interna volta para a landing "/",
  // que dá contexto antes do onboarding (/conta continua acessível direto).
  // Páginas públicas (privacidade, sobre) ficam acessíveis sem conta — SEO/legal.
  useEffect(() => {
    const publicGuestPaths = new Set([
      "/conta",
      "/login",
      "/esqueci-senha",
      "/redefinir-senha",
      "/confirmar-email",
      "/pro",
      "/privacidade",
      "/sobre",
    ]);
    if (
      !accountSetupComplete &&
      completedLessons.length === 0 &&
      !publicGuestPaths.has(location.pathname) &&
      !(isAdminRoute)
    ) {
      navigate("/", { replace: true });
    }
  }, [
    accountSetupComplete,
    completedLessons.length,
    location.pathname,
    navigate,
    isAdminRoute,
  ]);

  // Rola para o topo ao trocar de rota.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Lesson Player: trava scroll da página — só a região da atividade rola.
  useLessonPlayerScrollLock(isLessonPlayer);

  useEffect(() => {
    if (!isLessonPlayer) {
      delete document.documentElement.dataset.lessonPlayer;
      return undefined;
    }
    document.documentElement.dataset.lessonPlayer = "1";
    window.scrollTo(0, 0);
    return () => {
      delete document.documentElement.dataset.lessonPlayer;
    };
  }, [isLessonPlayer]);

  if (isOnboarding || isAuthPage) {
    return (
      <>
        <div className="theme-transition min-h-screen overflow-x-clip bg-bg px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
          <ErrorBoundary resetKey={location.pathname} area="auth">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
        <AuthBootstrap />
        <CloudSyncBootstrap />
        <EntitlementBootstrap />
        <TelemetryConsentBootstrap />
      </>
    );
  }

  return (
    <div
      className={[
        "theme-transition flex min-w-0 overflow-x-clip bg-bg",
        focusMode ? "h-dvh max-h-dvh overflow-hidden" : "min-h-screen",
      ].join(" ")}
    >
      {/* Modo foco = lição/desafio: nada de sidebar, topbar, tab bar ou FAB.
          Só o conteúdo do exercício, como um app de idiomas. */}
      {!focusMode && <Sidebar />}
      <div className={["flex min-w-0 flex-1 flex-col", focusMode ? "h-full min-h-0" : ""].join(" ")}>
        {!focusMode && <TopBar />}
        {/* Padding bottom cobre a altura da tab bar + safe area: nenhum botão
            principal pode ficar escondido atrás dela no mobile. No modo foco a
            tab bar some e o player assume o enquadramento (100dvh / visualViewport). */}
        <main
          data-app-main
          className={[
            "mx-auto min-w-0 w-full max-w-content flex-1",
            focusMode
              ? isLessonPlayer
                ? // Lesson Player dono do viewport (100dvh / visualViewport).
                  "flex h-full min-h-0 flex-col overflow-hidden p-0"
                : "px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 sm:px-5 sm:pt-3 lg:px-6 lg:pb-6"
              : "px-3 pb-[calc(var(--app-bottom-nav-height)+1rem)] pt-4 sm:px-5 sm:pt-5 lg:px-6 lg:pb-12",
          ].join(" ")}
        >
          <ErrorBoundary resetKey={location.pathname} area="page">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
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
      <StreakWatcher />
      <StreakRecoveryWatcher />
      <TelemetryConsentWatcher />
    </div>
  );
}
