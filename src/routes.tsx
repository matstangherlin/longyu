import type { RouteObject } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { JourneyPage } from "./features/journey/JourneyPage";
import { TreinoPage } from "./features/treino/TreinoPage";
import { MissoesPage } from "./features/missoes/MissoesPage";
import { LojaPage } from "./features/loja/LojaPage";
import { SomPage } from "./features/som/SomPage";
import { PinyinLabPage } from "./features/pinyin/PinyinLabPage";
import { HanziPage } from "./features/hanzi/HanziPage";
import { IdeogramasPage } from "./features/hanzi/IdeogramasPage";
import { HanziAtlasPage } from "./features/hanzi/HanziAtlasPage";
import { FalaPage } from "./features/fala/FalaPage";
import { LeituraPage } from "./features/leitura/LeituraPage";
import { RevisaoPage } from "./features/revisao/RevisaoPage";
import { BibliotecaPage } from "./features/biblioteca/BibliotecaPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AccountPage } from "./features/account/AccountPage";
import { LessonDetailPage } from "./features/lesson/LessonDetailPage";
import { LessonPlayer } from "./features/lesson/LessonPlayer";
import { ModuleChallengePage } from "./features/challenge/ModuleChallengePage";
import { ImmersionPage } from "./features/immersion/ImmersionPage";
import { ProPage } from "./features/pro/ProPage";
import { LigasPage } from "./features/ligas/LigasPage";
import { AchievementsPage } from "./features/conquistas/AchievementsPage";
import { MorePage } from "./features/more/MorePage";
import { AboutPage } from "./features/about/AboutPage";
import { LoginPage } from "./features/auth/LoginPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <JourneyPage /> },
      { path: "jornada", element: <JourneyPage /> },
      { path: "treino", element: <TreinoPage /> },
      { path: "praticar", element: <TreinoPage /> },
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
      { path: "conquistas", element: <AchievementsPage /> },
      { path: "pro", element: <ProPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "perfil", element: <AccountPage /> },
      { path: "conta", element: <AccountPage /> },
      { path: "config", element: <SettingsPage /> },
      { path: "ajustes", element: <SettingsPage /> },
      { path: "mais", element: <MorePage /> },
      { path: "sobre", element: <AboutPage /> },
      { path: "licao/:lessonId", element: <LessonDetailPage /> },
      { path: "licao/:lessonId/player", element: <LessonPlayer /> },
      { path: "teste/:unitId", element: <ModuleChallengePage /> },
    ],
  },
];
