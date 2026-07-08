import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { JOURNEY, currentLessonId } from "../../data/journey";
import { ProgressBar } from "../../components/ui/primitives";
import {
  IconChat,
  IconRefresh,
  IconShield,
  IconSound,
  IconTarget,
} from "../../components/ui/Icon";
import { canAccessDetailedErrors, canUsePracticeTool, useIsPro, type PracticeToolId } from "../../lib/proAccess";
import { dueItems } from "../../lib/srs";
import { DAILY_GOAL_PER_TRACK, useStore } from "../../lib/store";
import { buildMissionViews, type MissionView } from "../../data/missions";
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

const RECENT_ERROR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function TreinoPage() {
  const today = useStore((s) => s.today);
  const srs = useStore((s) => s.srs);
  const completed = useStore((s) => s.completedLessons);
  const isPremium = useIsPro();
  const toneTrainer = useStore((s) => s.toneTrainer);
  const learnedChunks = useStore((s) => s.learnedChunks);
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
  const currentLesson = currentLessonId(completed);
  const quickTestUnit = JOURNEY.flatMap((phase) => phase.units).find((unit) =>
    unit.lessons.some((lesson) => lesson.id === currentLesson || !completed.includes(lesson.id))
  );
  const recommendation = buildPracticeRecommendation({
    recentErrors: detailedErrorsAccess.allowed ? recentErrors : 0,
    reviewMission,
    weakTone,
    weakCount: detailedErrorsAccess.allowed ? weakCount : 0,
    learnedChunksCount: learnedChunks.length,
  });

  const practiceItems: HubNavItem[] = [
    {
      title: "Revisão básica",
      desc: "Reforce o que você aprendeu.",
      icon: IconRefresh,
      to: "/revisao",
      status: due > 0 ? `${due} prontos` : "Em dia",
      featured: due > 0,
    },
    {
      title: "Pinyin Lab",
      desc: "Sílabas, acentos e tons.",
      icon: IconSound,
      to: "/pinyin",
      status: toolStatus("pinyin_lab", accessContext),
      featured: true,
      disabled: !canUsePracticeTool("pinyin_lab", accessContext).allowed,
    },
    toolNavItem("Som", "Escuta guiada e tons.", IconSound, "/som", "som", accessContext),
    toolNavItem("Fala", "Chunks em voz alta.", IconChat, "/fala", "fala", accessContext),
    {
      title: "Erros detalhados",
      desc: detailedErrorsAccess.allowed
        ? "Corrija erros recentes com foco."
        : "Histórico e padrões de erro no Pro.",
      icon: IconTarget,
      to: detailedErrorsAccess.allowed ? "/revisao?modo=erros" : undefined,
      onClick: detailedErrorsAccess.allowed ? undefined : () => setPaywallKind("errors"),
      status: detailedErrorsAccess.allowed && recentErrors > 0 ? `${recentErrors} erros` : "Pro",
      statusTone: "gold",
      pro: !detailedErrorsAccess.allowed,
      featured: detailedErrorsAccess.allowed && recentErrors > 0,
    },
    {
      title: "Prática rápida",
      desc: "Teste se pode avançar.",
      icon: IconTarget,
      to: quickTestUnit ? `/teste/${quickTestUnit.id}` : "/revisao",
      status: quickTestUnit ? "Teste" : "Livre",
    },
    {
      title: "Frases aprendidas",
      desc: "Repita chunks em voz alta.",
      icon: IconChat,
      to: "/fala",
      status: learnedChunks.length > 0 ? `${learnedChunks.length} frases` : "Começar",
      featured: learnedChunks.length > 0,
    },
  ];

  // Treino completo: visível para todos; no grátis abre o paywall honesto em
  // vez de sumir da tela (a revisão essencial continua sempre livre).
  const extraReview: HubNavItem[] = detailedErrorsAccess.allowed
    ? [
        {
          title: "Itens fracos",
          desc: "Priorize lapsos da fila.",
          icon: IconShield,
          to: "/revisao?modo=fracos",
          status: weakCount > 0 ? `${weakCount} itens` : "Estável",
          featured: weakCount > 0,
        },
      ]
    : [
        {
          title: "Itens fracos",
          desc: "Fila priorizada por lapsos, sem limite.",
          icon: IconShield,
          onClick: () => setPaywallKind("training"),
          status: "Pro",
          statusTone: "gold",
          pro: true,
        },
      ];

  return (
    <HubPage>
      <HubHeader
        eyebrow="Hub"
        title="Praticar"
        desc="Revisão, som, fala e pinyin em treinos curtos."
      />

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
              <span>Hoje</span>
              <span>{totalMin}/{goalMin} min</span>
            </div>
            <ProgressBar value={totalMin} max={goalMin} className="h-1" />
          </div>
        }
      />

      <HubSection title="Treinos" desc="Escolha um foco para hoje.">
        <HubNavGrid items={practiceItems} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
      </HubSection>

      {extraReview.length > 0 && (
        <HubSection
          title="Revisão avançada"
          desc={detailedErrorsAccess.allowed ? "Disponível no seu plano." : "Treino completo faz parte do Pro."}
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
}: {
  recentErrors: number;
  reviewMission?: MissionView;
  weakTone?: MandarinTone | null;
  weakCount: number;
  learnedChunksCount: number;
}): PracticeRecommendation {
  if (recentErrors > 0) {
    return {
      title: "Corrija seus erros recentes",
      desc: `${recentErrors} ${recentErrors === 1 ? "erro na última semana" : "erros na última semana"}.`,
      to: "/revisao?modo=erros",
      icon: IconTarget,
      cta: "Corrigir",
      status: "Prioridade",
    };
  }
  if (reviewMission && !reviewMission.complete) {
    return {
      title: "Revise 10 itens",
      desc: "Complete a missão de revisão de hoje.",
      to: "/revisao",
      icon: IconRefresh,
      cta: "Revisar",
      status: `${reviewMission.progress}/${reviewMission.goal}`,
    };
  }
  if (weakTone) {
    return {
      title: "Treine tons por 5 minutos",
      desc: `Reforce o ${TONE_SHORT_LABEL[weakTone]} no treino auditivo.`,
      to: "/som",
      icon: IconSound,
      cta: "Treinar tons",
      status: "Tom fraco",
    };
  }
  if (weakCount > 0) {
    return {
      title: "Revise itens fracos",
      desc: "Recupere cartões que quebraram a sequência.",
      to: "/revisao?modo=fracos",
      icon: IconShield,
      cta: "Revisar",
      status: `${weakCount} itens`,
    };
  }
  return {
    title: "Pratique frases aprendidas",
    desc: learnedChunksCount > 0 ? `${learnedChunksCount} chunks para falar.` : "Comece com frases curtas em voz alta.",
    to: "/fala",
    icon: IconChat,
    cta: "Falar agora",
    status: "Leve",
  };
}

function toolNavItem(
  title: string,
  desc: string,
  icon: ComponentType<SVGProps<SVGSVGElement>>,
  to: string,
  toolId: PracticeToolId,
  context: { isPremium: boolean; completedLessons: string[] }
): HubNavItem {
  const decision = canUsePracticeTool(toolId, context);
  return {
    title,
    desc,
    icon,
    to,
    status: decision.allowed ? accessLabel(decision.pro, decision.limited) : "Bloqueado",
    disabled: !decision.allowed,
    pro: decision.pro && decision.allowed,
  };
}

function toolStatus(toolId: PracticeToolId, context: { isPremium: boolean; completedLessons: string[] }) {
  const decision = canUsePracticeTool(toolId, context);
  if (!decision.allowed) return "Bloqueado";
  return accessLabel(decision.pro, decision.limited);
}

function accessLabel(pro: boolean, limited?: boolean): string {
  if (pro) return "Pro";
  if (limited) return "Cargas";
  return "Livre";
}
