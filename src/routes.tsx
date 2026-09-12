import { lazy, type ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PublicAuthLayout } from "./components/auth/PublicAuthLayout";
import { RequireCloudSession } from "./components/auth/RequireCloudSession";
import { importWithStaleBundleRetry } from "./lib/staleBundle";
import { JourneyNodeGate } from "./components/journey/JourneyNodeGate";

function lazyNamed<T extends Record<string, unknown>>(
  importer: () => Promise<T>,
  name: keyof T & string
) {
  return lazy(() =>
    importWithStaleBundleRetry(importer).then((mod) => ({
      default: mod[name] as ComponentType,
    }))
  );
}

const JourneyPage = lazyNamed(() => import("./features/journey/JourneyPage"), "JourneyPage");
const LessonCapsulePage = lazyNamed(() => import("./features/journey/LessonCapsulePage"), "LessonCapsulePage");
const JourneyBoosterPage = lazyNamed(() => import("./features/journey/JourneyBoosterPage"), "JourneyBoosterPage");
const TreinoPage = lazyNamed(() => import("./features/treino/TreinoPage"), "TreinoPage");
const MandarinBlitzPage = lazyNamed(() => import("./features/arcade/MandarinBlitzPage"), "MandarinBlitzPage");
const MissoesPage = lazyNamed(() => import("./features/missoes/MissoesPage"), "MissoesPage");
const LojaPage = lazyNamed(() => import("./features/loja/LojaPage"), "LojaPage");
const SomPage = lazyNamed(() => import("./features/som/SomPage"), "SomPage");
const PinyinLabPage = lazyNamed(() => import("./features/pinyin/PinyinLabPage"), "PinyinLabPage");
const HanziPage = lazyNamed(() => import("./features/hanzi/HanziPage"), "HanziPage");
const IdeogramasPage = lazyNamed(() => import("./features/hanzi/IdeogramasPage"), "IdeogramasPage");
const HanziAtlasPage = lazyNamed(() => import("./features/hanzi/HanziAtlasPage"), "HanziAtlasPage");
const FalaPage = lazyNamed(() => import("./features/fala/FalaPage"), "FalaPage");
const LeituraPage = lazyNamed(() => import("./features/leitura/LeituraPage"), "LeituraPage");
const RevisaoPage = lazyNamed(() => import("./features/revisao/RevisaoPage"), "RevisaoPage");
const CultureHubPage = lazyNamed(() => import("./features/culture/CultureHubPage"), "CultureHubPage");
const CultureItemPage = lazyNamed(() => import("./features/culture/CultureItemPage"), "CultureItemPage");
const CultureReviewPage = lazyNamed(() => import("./features/culture/CultureReviewPage"), "CultureReviewPage");
const BibliotecaPage = lazyNamed(() => import("./features/biblioteca/BibliotecaPage"), "BibliotecaPage");
const SettingsPage = lazyNamed(() => import("./features/settings/SettingsPage"), "SettingsPage");
const ProfilePage = lazyNamed(() => import("./features/perfil/ProfilePage"), "ProfilePage");
const ContaRoute = lazyNamed(() => import("./features/conta/ContaRoute"), "ContaRoute");
const DadosLocaisPage = lazyNamed(() => import("./features/dados/DadosLocaisPage"), "DadosLocaisPage");
const PrivacyPage = lazyNamed(() => import("./features/privacy/PrivacyPage"), "PrivacyPage");
const LessonDetailPage = lazyNamed(() => import("./features/lesson/LessonDetailPage"), "LessonDetailPage");
const LessonPlayer = lazyNamed(() => import("./features/lesson/LessonPlayer"), "LessonPlayer");
const ModuleChallengePage = lazyNamed(() => import("./features/challenge/ModuleChallengePage"), "ModuleChallengePage");
const ImmersionPage = lazyNamed(() => import("./features/immersion/ImmersionPage"), "ImmersionPage");
const ProPage = lazyNamed(() => import("./features/pro/ProPage"), "ProPage");
const LigasPage = lazyNamed(() => import("./features/ligas/LigasPage"), "LigasPage");
const AchievementsPage = lazyNamed(() => import("./features/conquistas/AchievementsPage"), "AchievementsPage");
const MorePage = lazyNamed(() => import("./features/more/MorePage"), "MorePage");
const AboutPage = lazyNamed(() => import("./features/about/AboutPage"), "AboutPage");
const LoginPage = lazyNamed(() => import("./features/auth/LoginPage"), "LoginPage");
const ForgotPasswordPage = lazyNamed(() => import("./features/auth/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyNamed(() => import("./features/auth/ResetPasswordPage"), "ResetPasswordPage");
const ConfirmEmailPage = lazyNamed(() => import("./features/auth/ConfirmEmailPage"), "ConfirmEmailPage");
const FinalizeCadastroPage = lazyNamed(() => import("./features/auth/FinalizeCadastroPage"), "FinalizeCadastroPage");
const ReferralPage = lazyNamed(() => import("./features/referral/ReferralPage"), "ReferralPage");
const ReferralInvitePage = lazyNamed(() => import("./features/referral/ReferralInvitePage"), "ReferralInvitePage");
const AmigosPage = lazyNamed(() => import("./features/amigos/AmigosPage"), "AmigosPage");
const AdminFeedbackPage = lazyNamed(() => import("./features/admin/AdminFeedbackPage"), "AdminFeedbackPage");
const MarketingPage = lazyNamed(() => import("./features/marketing/MarketingPage"), "MarketingPage");
const BusinessPage = lazyNamed(() => import("./features/business/BusinessPage"), "BusinessPage");
const ComecarRoute = lazyNamed(() => import("./features/onboarding/ComecarPage"), "ComecarRoute");
const LegacyLocalMigrationPage = lazyNamed(
  () => import("./features/onboarding/LegacyLocalMigrationPage"),
  "LegacyLocalMigrationPage"
);
const QaHubPage = lazyNamed(() => import("./features/qa/QaHubPage"), "QaHubPage");
const QaScenarioPage = lazyNamed(() => import("./features/qa/QaScenarioPage"), "QaScenarioPage");
const QaAudioDiscriminationPage = lazyNamed(
  () => import("./features/qa/QaAudioDiscriminationPage"),
  "QaAudioDiscriminationPage"
);
const QaHanziBuilderPage = lazyNamed(() => import("./features/qa/QaHanziBuilderPage"), "QaHanziBuilderPage");
const QaConversationScenePage = lazyNamed(
  () => import("./features/qa/QaConversationScenePage"),
  "QaConversationScenePage"
);
import { QaFastPathGate } from "./components/qa/QaFastPathGate";

import { LandingPage } from "./features/landing/LandingPage";
import { NotFoundPage } from "./features/system/NotFoundPage";

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
      { path: "qa/audio-discrimination", element: <QaAudioDiscriminationPage /> },
      { path: "qa/hanzi-builder", element: <QaHanziBuilderPage /> },
      { path: "qa/conversation-scene", element: <QaConversationScenePage /> },
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
      { path: "jornada/capsula/:capsuleId", element: <LessonCapsulePage /> },
      { path: "jornada/reforco/:nodeId", element: <JourneyNodeGate><JourneyBoosterPage /></JourneyNodeGate> },
      { path: "treino", element: <TreinoPage /> },
      { path: "praticar", element: <TreinoPage /> },
      { path: "arcade/blitz", element: <JourneyNodeGate><MandarinBlitzPage /></JourneyNodeGate> },
      { path: "missoes", element: <MissoesPage /> },
      { path: "loja", element: <LojaPage /> },
      { path: "som", element: <JourneyNodeGate><SomPage /></JourneyNodeGate> },
      { path: "pinyin", element: <JourneyNodeGate><PinyinLabPage /></JourneyNodeGate> },
      { path: "hanzi", element: <JourneyNodeGate><HanziPage /></JourneyNodeGate> },
      { path: "ideogramas", element: <IdeogramasPage /> },
      { path: "hanzi/atlas", element: <HanziAtlasPage /> },
      { path: "fala", element: <FalaPage /> },
      { path: "leitura", element: <LeituraPage /> },
      { path: "revisao", element: <JourneyNodeGate><RevisaoPage /></JourneyNodeGate> },
      { path: "cultura", element: <CultureHubPage /> },
      { path: "cultura/revisao", element: <CultureReviewPage /> },
      { path: "cultura/:id", element: <CultureItemPage /> },
      { path: "biblioteca", element: <BibliotecaPage /> },
      { path: "imersao", element: <JourneyNodeGate><ImmersionPage /></JourneyNodeGate> },
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
  { path: "*", element: <NotFoundPage /> },
];
