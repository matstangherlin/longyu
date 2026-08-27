import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PublicAuthLayout } from "./components/auth/PublicAuthLayout";
import { RequireCloudSession } from "./components/auth/RequireCloudSession";

const JourneyPage = lazy(() => import("./features/journey/JourneyPage").then((m) => ({ default: m.JourneyPage })));
const TreinoPage = lazy(() => import("./features/treino/TreinoPage").then((m) => ({ default: m.TreinoPage })));
const MandarinBlitzPage = lazy(() => import("./features/arcade/MandarinBlitzPage").then((m) => ({ default: m.MandarinBlitzPage })));
const MissoesPage = lazy(() => import("./features/missoes/MissoesPage").then((m) => ({ default: m.MissoesPage })));
const LojaPage = lazy(() => import("./features/loja/LojaPage").then((m) => ({ default: m.LojaPage })));
const SomPage = lazy(() => import("./features/som/SomPage").then((m) => ({ default: m.SomPage })));
const PinyinLabPage = lazy(() => import("./features/pinyin/PinyinLabPage").then((m) => ({ default: m.PinyinLabPage })));
const HanziPage = lazy(() => import("./features/hanzi/HanziPage").then((m) => ({ default: m.HanziPage })));
const IdeogramasPage = lazy(() => import("./features/hanzi/IdeogramasPage").then((m) => ({ default: m.IdeogramasPage })));
const HanziAtlasPage = lazy(() => import("./features/hanzi/HanziAtlasPage").then((m) => ({ default: m.HanziAtlasPage })));
const FalaPage = lazy(() => import("./features/fala/FalaPage").then((m) => ({ default: m.FalaPage })));
const LeituraPage = lazy(() => import("./features/leitura/LeituraPage").then((m) => ({ default: m.LeituraPage })));
const RevisaoPage = lazy(() => import("./features/revisao/RevisaoPage").then((m) => ({ default: m.RevisaoPage })));
const BibliotecaPage = lazy(() => import("./features/biblioteca/BibliotecaPage").then((m) => ({ default: m.BibliotecaPage })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("./features/perfil/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const ContaRoute = lazy(() => import("./features/conta/ContaRoute").then((m) => ({ default: m.ContaRoute })));
const DadosLocaisPage = lazy(() => import("./features/dados/DadosLocaisPage").then((m) => ({ default: m.DadosLocaisPage })));
const PrivacyPage = lazy(() => import("./features/privacy/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const LessonDetailPage = lazy(() => import("./features/lesson/LessonDetailPage").then((m) => ({ default: m.LessonDetailPage })));
const LessonPlayer = lazy(() => import("./features/lesson/LessonPlayer").then((m) => ({ default: m.LessonPlayer })));
const ModuleChallengePage = lazy(() => import("./features/challenge/ModuleChallengePage").then((m) => ({ default: m.ModuleChallengePage })));
const ImmersionPage = lazy(() => import("./features/immersion/ImmersionPage").then((m) => ({ default: m.ImmersionPage })));
const ProPage = lazy(() => import("./features/pro/ProPage").then((m) => ({ default: m.ProPage })));
const LigasPage = lazy(() => import("./features/ligas/LigasPage").then((m) => ({ default: m.LigasPage })));
const AchievementsPage = lazy(() => import("./features/conquistas/AchievementsPage").then((m) => ({ default: m.AchievementsPage })));
const MorePage = lazy(() => import("./features/more/MorePage").then((m) => ({ default: m.MorePage })));
const AboutPage = lazy(() => import("./features/about/AboutPage").then((m) => ({ default: m.AboutPage })));
const LoginPage = lazy(() => import("./features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./features/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const ConfirmEmailPage = lazy(() => import("./features/auth/ConfirmEmailPage").then((m) => ({ default: m.ConfirmEmailPage })));
const FinalizeCadastroPage = lazy(() =>
  import("./features/auth/FinalizeCadastroPage").then((m) => ({ default: m.FinalizeCadastroPage }))
);
const ReferralPage = lazy(() => import("./features/referral/ReferralPage").then((m) => ({ default: m.ReferralPage })));
const ReferralInvitePage = lazy(() => import("./features/referral/ReferralInvitePage").then((m) => ({ default: m.ReferralInvitePage })));
const AmigosPage = lazy(() => import("./features/amigos/AmigosPage").then((m) => ({ default: m.AmigosPage })));
const AdminFeedbackPage = lazy(() => import("./features/admin/AdminFeedbackPage").then((m) => ({ default: m.AdminFeedbackPage })));
const MarketingPage = lazy(() => import("./features/marketing/MarketingPage").then((m) => ({ default: m.MarketingPage })));
const BusinessPage = lazy(() => import("./features/business/BusinessPage").then((m) => ({ default: m.BusinessPage })));
const ComecarRoute = lazy(() =>
  import("./features/onboarding/ComecarPage").then((m) => ({ default: m.ComecarRoute }))
);
const LegacyLocalMigrationPage = lazy(() =>
  import("./features/onboarding/LegacyLocalMigrationPage").then((m) => ({
    default: m.LegacyLocalMigrationPage,
  }))
);
const QaHubPage = lazy(() => import("./features/qa/QaHubPage").then((m) => ({ default: m.QaHubPage })));
const QaScenarioPage = lazy(() =>
  import("./features/qa/QaScenarioPage").then((m) => ({ default: m.QaScenarioPage }))
);
import { QaFastPathGate } from "./components/qa/QaFastPathGate";

import { LandingPage } from "./features/landing/LandingPage";

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/aprender-mandarim", element: <MarketingPage /> },
  { path: "/curso-de-mandarim-online", element: <MarketingPage /> },
  { path: "/tons-do-mandarim", element: <MarketingPage /> },
  { path: "/aprender-pinyin", element: <MarketingPage /> },
  { path: "/aprender-hanzi", element: <MarketingPage /> },
  { path: "/mandarim-para-brasileiros", element: <MarketingPage /> },
  { path: "/como-funciona", element: <MarketingPage /> },
  { path: "/metodo-longyu", element: <MarketingPage /> },
  { path: "/business", element: <BusinessPage /> },
  { path: "/convite/:code", element: <ReferralInvitePage /> },
  {
    element: <PublicAuthLayout />,
    children: [
      { path: "comecar", element: <ComecarRoute /> },
      { path: "login", element: <LoginPage /> },
      { path: "esqueci-senha", element: <ForgotPasswordPage /> },
      { path: "redefinir-senha", element: <ResetPasswordPage /> },
      { path: "confirmar-email", element: <ConfirmEmailPage /> },
      { path: "finalizar-cadastro", element: <FinalizeCadastroPage /> },
      { path: "salvar-progresso", element: <LegacyLocalMigrationPage /> },
      { path: "privacidade", element: <PrivacyPage /> },
      { path: "sobre", element: <AboutPage /> },
    ],
  },
  {
    element: <QaFastPathGate />,
    children: [
      { path: "qa", element: <QaHubPage /> },
      { path: "qa/player", element: <QaHubPage /> },
      { path: "qa/:scenario", element: <QaScenarioPage /> },
    ],
  },
  {
    element: (
      <RequireCloudSession>
        <AppShell />
      </RequireCloudSession>
    ),
    children: [
      { path: "jornada", element: <JourneyPage /> },
      { path: "treino", element: <TreinoPage /> },
      { path: "praticar", element: <TreinoPage /> },
      { path: "arcade/blitz", element: <MandarinBlitzPage /> },
      { path: "missoes", element: <MissoesPage /> },
      { path: "loja", element: <LojaPage /> },
      { path: "som", element: <SomPage /> },
      { path: "pinyin", element: <PinyinLabPage /> },
      { path: "hanzi", element: <HanziPage /> },
      { path: "ideogramas", element: <IdeogramasPage /> },
      { path: "hanzi/atlas", element: <HanziAtlasPage /> },
      { path: "fala", element: <FalaPage /> },
      { path: "leitura", element: <LeituraPage /> },
      { path: "revisao", element: <RevisaoPage /> },
      { path: "biblioteca", element: <BibliotecaPage /> },
      { path: "imersao", element: <ImmersionPage /> },
      { path: "ligas", element: <LigasPage /> },
      { path: "amigos", element: <AmigosPage /> },
      { path: "convide", element: <ReferralPage /> },
      { path: "conquistas", element: <AchievementsPage /> },
      { path: "pro", element: <ProPage /> },
      { path: "plano", element: <ProPage /> },
      { path: "perfil", element: <ProfilePage /> },
      { path: "conta", element: <ContaRoute /> },
      { path: "dados-locais", element: <DadosLocaisPage /> },
      { path: "config", element: <SettingsPage /> },
      { path: "ajustes", element: <SettingsPage /> },
      { path: "mais", element: <MorePage /> },
      { path: "admin/feedback", element: <AdminFeedbackPage /> },
      { path: "licao/:lessonId", element: <LessonDetailPage /> },
      { path: "licao/:lessonId/player", element: <LessonPlayer /> },
      { path: "teste/:unitId", element: <ModuleChallengePage /> },
    ],
  },
];
