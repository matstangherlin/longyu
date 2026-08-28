import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { JOURNEY, currentLessonId } from "../../data/journey";
import { ProgressBar } from "../../components/ui/primitives";
import {
  IconChat,
  IconFlame,
  IconRefresh,
  IconShield,
  IconSound,
  IconTarget,
} from "../../components/ui/Icon";
import { canAccessDetailedErrors, canUsePracticeTool, useIsPro, type PracticeToolId } from "../../lib/proAccess";
import { dueItems } from "../../lib/srs";
import { DAILY_GOAL_PER_TRACK, useStore } from "../../lib/store";
import { buildMissionViews, type MissionView } from "../../data/missions";
import { EconomyExplainer } from "../../components/economy/EconomyExplainer";
import { TONE_SHORT_LABEL, weakestToneFromProgress, type MandarinTone } from "../../data/toneTrainer";
import { ProPaywall } from "../../components/pro/ProPaywall";
import {
  HubHeader,
  HubHeroCard,
  HubNavGrid,
  HubNavItem,
  HubPage,
  HubProStrip,
  HubSection,
} from "../../components/layout/HubLayout";
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslateVars } from "../../i18n/catalog";
import type { MessageKey } from "../../locales/pt-BR";

const RECENT_ERROR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type TranslateFn = (key: MessageKey | string, vars?: TranslateVars) => string;

export function TreinoPage() {
  const { t } = useTranslation();
  const today = useStore((s) => s.today);
  const srs = useStore((s) => s.srs);
  const completed = useStore((s) => s.completedLessons);
  const lessonMasteryById = useStore((s) => s.lessonMasteryById);
  const isPremium = useIsPro();
  const toneTrainer = useStore((s) => s.toneTrainer);
  const learnedChunks = useStore((s) => s.learnedChunks);
  const learnedChars = useStore((s) => s.learnedChars);
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyClaimed = useStore((s) => s.dailyMissions.claimed);
  const [paywallKind, setPaywallKind] = useState<"errors" | "training" | null>(null);

  const accessContext = { isPremium, completedLessons: completed };
  const detailedErrorsAccess = canAccessDetailedErrors(accessContext);
  const due = dueItems(srs).length;
  const weakCount = Object.values(srs).filter((item) => item.lapses > 0 && item.reps === 0).length;
  const recentErrors = Object.values(srs).filter(
    (item) => item.lapses > 0 && (item.reviewedAt ?? item.createdAt) >= Date.now() - RECENT_ERROR_WINDOW_MS
  ).length;
  const totalMin = today.som + today.fala + today.hanzi + today.leitura;
  const goalMin = DAILY_GOAL_PER_TRACK * 4;
  const weakTone = weakestToneFromProgress(toneTrainer);
  const dailyViews = buildMissionViews("daily", aggregates, dailyClaimed);
  const reviewMission = dailyViews.find((mission) => mission.id === "daily-reviews" && !mission.claimed);
  const currentLesson = currentLessonId(completed, false, lessonMasteryById);
  const quickTestUnit = JOURNEY.flatMap((phase) => phase.units).find((unit) =>
    unit.lessons.some((lesson) => lesson.id === currentLesson || !completed.includes(lesson.id))
  );
  const recommendation = buildPracticeRecommendation({
    recentErrors: detailedErrorsAccess.allowed ? recentErrors : 0,
    reviewMission,
    weakTone,
    weakCount: detailedErrorsAccess.allowed ? weakCount : 0,
    learnedChunksCount: learnedChunks.length,
    t,
  });

  const practiceItems: HubNavItem[] = [
    {
      title: "Mandarin Blitz",
      desc: t("hub.blitzDesc"),
      icon: IconFlame,
      to: "/arcade/blitz",
      status: "60 s",
      featured: learnedChunks.length + learnedChars.length >= 2,
    },
    {
      title: t("review.basic"),
      desc: t("hub.basicReviewDesc"),
      icon: IconRefresh,
      to: "/revisao",
      status: due > 0 ? t("navigation.dueReady", { count: due }) : t("hub.caughtUp"),
      featured: due > 0,
    },
    {
      title: t("navigation.pinyinLab"),
      desc: t("hub.pinyinLabDesc"),
      icon: IconSound,
      to: "/pinyin",
      status: toolStatus("pinyin_lab", accessContext, t),
      featured: true,
      disabled: !canUsePracticeTool("pinyin_lab", accessContext).allowed,
    },
    toolNavItem(t("hub.sound"), t("hub.soundDesc"), IconSound, "/som", "som", accessContext, t),
    toolNavItem(t("navigation.speaking"), t("hub.speakingDesc"), IconChat, "/fala", "fala", accessContext, t),
    {
      title: t("review.detailedErrors"),
      desc: detailedErrorsAccess.allowed
        ? t("hub.detailedErrorsDesc")
        : t("hub.detailedErrorsProDesc"),
      icon: IconTarget,
      to: detailedErrorsAccess.allowed ? "/revisao?modo=erros&sessao=corrigir" : undefined,
      onClick: detailedErrorsAccess.allowed ? undefined : () => setPaywallKind("errors"),
      status: detailedErrorsAccess.allowed && recentErrors > 0 ? t("hub.errorsCount", { count: recentErrors }) : t("common.pro"),
      statusTone: "gold",
      pro: !detailedErrorsAccess.allowed,
      featured: detailedErrorsAccess.allowed && recentErrors > 0,
    },
    {
      title: t("hub.quickPractice"),
      desc: t("hub.quickPracticeDesc"),
      icon: IconTarget,
      to: quickTestUnit ? `/teste/${quickTestUnit.id}` : "/revisao",
      status: quickTestUnit ? t("hub.test") : t("hub.openAccess"),
    },
    {
      title: t("hub.learnedPhrases"),
      desc: t("hub.learnedPhrasesDesc"),
      icon: IconChat,
      to: "/fala",
      status: learnedChunks.length > 0 ? t("hub.phrasesCount", { count: learnedChunks.length }) : t("common.getStarted"),
      featured: learnedChunks.length > 0,
    },
  ];

  // Treino completo: visível para todos; no grátis abre o paywall honesto em
  // vez de sumir da tela (a revisão essencial continua sempre livre).
  const extraReview: HubNavItem[] = detailedErrorsAccess.allowed
    ? [
        {
          title: t("review.weakItems"),
          desc: t("hub.weakItemsDesc"),
          icon: IconShield,
          to: "/revisao?modo=fracos",
          status: weakCount > 0 ? t("hub.itemsCount", { count: weakCount }) : t("hub.stable"),
          featured: weakCount > 0,
        },
      ]
    : [
        {
          title: t("review.weakItems"),
          desc: t("hub.weakItemsProDesc"),
          icon: IconShield,
          onClick: () => setPaywallKind("training"),
          status: t("common.pro"),
          statusTone: "gold",
          pro: true,
        },
      ];

  return (
    <HubPage>
      <HubHeader
        eyebrow={t("hub.eyebrow")}
        title={t("navigation.practice")}
        desc={t("hub.practiceDesc")}
      />

      <EconomyExplainer isPro={isPremium} context="treino" />

      <HubHeroCard
        title={recommendation.title}
        desc={recommendation.desc}
        status={recommendation.status}
        icon={recommendation.icon}
        cta={recommendation.cta}
        ctaTo={recommendation.to}
        footer={
          <div className="mt-2.5 max-w-xs">
            <div className="mb-1 flex justify-between text-[10px] font-medium text-ink-faint">
              <span>{t("common.today")}</span>
              <span>{t("hub.todayMinutes", { current: totalMin, goal: goalMin })}</span>
            </div>
            <ProgressBar value={totalMin} max={goalMin} className="h-1" />
          </div>
        }
      />

      <HubSection title={t("hub.practiceSection")} desc={t("hub.practiceSectionDesc")}>
        <HubNavGrid items={practiceItems} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
      </HubSection>

      {extraReview.length > 0 && (
        <HubSection
          title={t("hub.advancedReview")}
          desc={detailedErrorsAccess.allowed ? t("hub.advancedReviewPro") : t("hub.advancedReviewLocked")}
        >
          <HubNavGrid items={extraReview} columns="grid-cols-2 sm:grid-cols-3" />
        </HubSection>
      )}

      <HubProStrip isPremium={isPremium} />
      <ProPaywall open={paywallKind !== null} kind={paywallKind ?? "errors"} onClose={() => setPaywallKind(null)} />
    </HubPage>
  );
}

interface PracticeRecommendation {
  title: string;
  desc: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  cta: string;
  status?: string;
}

function buildPracticeRecommendation({
  recentErrors,
  reviewMission,
  weakTone,
  weakCount,
  learnedChunksCount,
  t,
}: {
  recentErrors: number;
  reviewMission?: MissionView;
  weakTone?: MandarinTone | null;
  weakCount: number;
  learnedChunksCount: number;
  t: TranslateFn;
}): PracticeRecommendation {
  if (recentErrors > 0) {
    return {
      title: t("hub.recoFixErrors"),
      desc: recentErrors === 1 ? t("hub.recoFixErrorsOne", { count: recentErrors }) : t("hub.recoFixErrorsMany", { count: recentErrors }),
      to: "/revisao?modo=erros",
      icon: IconTarget,
      cta: t("hub.recoFixCta"),
      status: t("hub.recoPriority"),
    };
  }
  if (reviewMission && !reviewMission.complete) {
    return {
      title: t("hub.recoReviewTen"),
      desc: t("hub.recoReviewTenDesc"),
      to: "/revisao",
      icon: IconRefresh,
      cta: t("hub.recoReviewCta"),
      status: `${reviewMission.progress}/${reviewMission.goal}`,
    };
  }
  if (weakTone) {
    return {
      title: t("hub.recoTones"),
      desc: t("hub.recoTonesDesc", { tone: TONE_SHORT_LABEL[weakTone] }),
      to: "/som",
      icon: IconSound,
      cta: t("hub.recoTonesCta"),
      status: t("hub.recoWeakTone"),
    };
  }
  if (weakCount > 0) {
    return {
      title: t("hub.recoWeakItems"),
      desc: t("hub.recoWeakItemsDesc"),
      to: "/revisao?modo=fracos",
      icon: IconShield,
      cta: t("hub.recoReviewCta"),
      status: t("hub.itemsCount", { count: weakCount }),
    };
  }
  return {
    title: t("hub.recoPhrases"),
    desc: learnedChunksCount > 0 ? t("hub.recoPhrasesCount", { count: learnedChunksCount }) : t("hub.recoPhrasesStart"),
    to: "/fala",
    icon: IconChat,
    cta: t("hub.recoSpeakNow"),
    status: t("hub.recoLight"),
  };
}

function toolNavItem(
  title: string,
  desc: string,
  icon: ComponentType<SVGProps<SVGSVGElement>>,
  to: string,
  toolId: PracticeToolId,
  context: { isPremium: boolean; completedLessons: string[] },
  t: TranslateFn
): HubNavItem {
  const decision = canUsePracticeTool(toolId, context);
  return {
    title,
    desc,
    icon,
    to,
    status: decision.allowed ? accessLabel(decision.pro, decision.limited, t) : t("hub.blocked"),
    disabled: !decision.allowed,
    pro: decision.pro && decision.allowed,
  };
}

function toolStatus(toolId: PracticeToolId, context: { isPremium: boolean; completedLessons: string[] }, t: TranslateFn) {
  const decision = canUsePracticeTool(toolId, context);
  if (!decision.allowed) return t("hub.blocked");
  return accessLabel(decision.pro, decision.limited, t);
}

function accessLabel(pro: boolean, limited: boolean | undefined, t: TranslateFn): string {
  if (pro) return t("common.pro");
  if (limited) return t("hub.charges");
  return t("hub.openAccess");
}
