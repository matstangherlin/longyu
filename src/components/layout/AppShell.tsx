import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { warmUpVoices } from "../../lib/tts";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { AchievementsWatcher } from "../achievements/AchievementsWatcher";
import { AuthBootstrap } from "../auth/AuthBootstrap";
import { CloudSyncBootstrap } from "../auth/CloudSyncBootstrap";
import { EntitlementBootstrap } from "../auth/EntitlementBootstrap";
import { DesktopFeedbackFab } from "../feedback/DesktopFeedbackFab";

export function AppShell() {
  const theme = useStore((s) => s.theme);
  const registerActivity = useStore((s) => s.registerActivity);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const completedLessons = useStore((s) => s.completedLessons);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === "/login";
  const isOnboarding = location.pathname === "/conta" && !accountSetupComplete;
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
  }, [registerActivity]);

  useEffect(() => {
    if (
      !accountSetupComplete &&
      completedLessons.length === 0 &&
      location.pathname !== "/conta" &&
      location.pathname !== "/login" &&
      location.pathname !== "/pro"
    ) {
      navigate("/conta", { replace: true });
    }
  }, [accountSetupComplete, completedLessons.length, location.pathname, navigate]);

  // Rola para o topo ao trocar de rota.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isOnboarding || isLoginPage) {
    return (
      <>
        <div className="theme-transition min-h-screen bg-bg px-4 py-6 sm:px-6">
          <Outlet />
        </div>
        <AuthBootstrap />
        <CloudSyncBootstrap />
      </>
    );
  }

  return (
    <>
    <div className="theme-transition flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {focusMode ? (
          <div className="hidden lg:block">
            <TopBar />
          </div>
        ) : (
          <TopBar />
        )}
        {/* Padding bottom cobre a altura da tab bar + safe area: nenhum botão
            principal pode ficar escondido atrás dela no mobile. No modo foco a
            tab bar some, então o padding encolhe. */}
        <main
          className={[
            "mx-auto w-full max-w-content flex-1 px-3 sm:px-5 lg:px-6 lg:pb-12",
            focusMode
              ? "pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 sm:pt-5"
              : "pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 sm:pt-5",
          ].join(" ")}
        >
          <Outlet />
        </main>
      </div>
      {!focusMode && <TabBar />}
      {!focusMode && <DesktopFeedbackFab />}
      <AuthBootstrap />
      <CloudSyncBootstrap />
      <EntitlementBootstrap />
      <AchievementsWatcher />
    </div>
    </>
  );
}
