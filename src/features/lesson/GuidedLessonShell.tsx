import { createContext, useContext, type ReactNode, type Ref } from "react";
import { GuidedBottomAction, GuidedProgressHeader, GUIDED_CLASS } from "../../components/guided/GuidedPrimitives";
import { Mascot } from "../../components/brand/Mascot";
import { IconChat, IconFlame } from "../../components/ui/Icon";
import { t } from "../../i18n/catalog";
import { isProductionBetaEnv } from "../../lib/appEnvironment";
import { allowSeededLocalSession } from "../../lib/auth/localAuthPolicy";
import { LessonActionPortal } from "./LessonActionRegion";
import {
  GUIDED_DRAGON_SIZE,
  presentationContractFor,
  resolveLessonShellMode,
  showsBreathIndicator,
  type LessonShellMode,
  type VerticalAlignment,
} from "../../lib/guidedPresentation";

/**
 * RC2.2.17B · PART A — GuidedLessonShell: tela cheia, safe areas, cabeçalho
 * simples, viewport do passo, dock inferior e transição curta.
 *
 * Só apresentação. Não conhece SRS, XP, resposta certa nem domínio: recebe o
 * passo já renderizado pelo StepRenderer de sempre e os callbacks do
 * LessonPlayer. Todas as lições da Jornada passam por aqui — o nível de guia
 * muda a densidade de ajuda, nunca o shell (PART BH).
 */

// ── Contexto: o StepRenderer sabe que está no shell guiado ────────────────

const GuidedPresentationContext = createContext<boolean>(false);

export function GuidedPresentationProvider({ guided, children }: { guided: boolean; children: ReactNode }) {
  return <GuidedPresentationContext.Provider value={guided}>{children}</GuidedPresentationContext.Provider>;
}

/** true dentro do GuidedLessonShell; false em fixtures, revisão e laboratório. */
export function useGuidedPresentation(): boolean {
  return useContext(GuidedPresentationContext);
}

/**
 * PART J/K — dentro do shell guiado, a ação do passo vai para o dock. Fora
 * dele (fixtures, revisão, laboratório, rollback) o conteúdo fica onde estava.
 */
/** Já estou dentro do dock (evita portar duas vezes o mesmo botão). */
export const InGuidedDockContext = createContext<boolean>(false);

export function useInGuidedDock(): boolean {
  return useContext(InGuidedDockContext);
}

export function GuidedDock({ children, className = "" }: { children: ReactNode; className?: string }) {
  const guided = useGuidedPresentation();
  const inDock = useInGuidedDock();
  if (!guided || inDock) return <>{children}</>;
  return (
    <InGuidedDockContext.Provider value>
    <LessonActionPortal>
      <div
        data-lesson-sticky-actions
        data-lesson-bottom-action
        data-lesson-action-mode="docked"
        className={["grid gap-1 px-3 pb-[max(0.65rem,var(--app-safe-bottom))] pt-2.5 sm:px-4", className].join(" ")}
      >
        {children}
      </div>
    </LessonActionPortal>
    </InGuidedDockContext.Provider>
  );
}

// ── Modo do shell (PART BY/BZ) ────────────────────────────────────────────

const SHELL_OVERRIDE_KEY = "longyu:guided-shell";
const E2E_PREPARE_KEY = "longyu:e2e-prepare";

function readLocal(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * `VITE_GUIDED_JOURNEY_SHELL=off` volta ao quadro antigo (rollback visual de
 * DEV/QA). Sessão de teste semeada pode forçar `legacy` para o ANTES/DEPOIS.
 * Produção pública: sempre GUIDED.
 */
export function lessonShellMode(): LessonShellMode {
  const seeded = allowSeededLocalSession();
  return resolveLessonShellMode({
    flag: import.meta.env.VITE_GUIDED_JOURNEY_SHELL,
    productionBeta: isProductionBetaEnv(),
    runtimeOverride: seeded ? readLocal(SHELL_OVERRIDE_KEY) : null,
  });
}

/**
 * E2E semeado: o PREPARE (tela de abertura) só aparece quando o teste pede
 * (`longyu:e2e-prepare=on`), para as suítes antigas abrirem direto no passo.
 * Fora de sessão semeada de teste, sempre vale.
 */
export function prepareStageAllowed(): boolean {
  if (!allowSeededLocalSession()) return true;
  return readLocal(E2E_PREPARE_KEY) === "on";
}

// ── Cabeçalho (PART C/D) ──────────────────────────────────────────────────

export function GuidedLessonHeader({
  onExit,
  exitTestId,
  onReport,
  progressValue,
  progressMax,
  lives,
  maxLives,
  unlimitedLives,
  stageLabel,
}: {
  onExit: () => void;
  exitTestId?: string;
  onReport?: () => void;
  progressValue: number;
  progressMax: number;
  lives: number;
  maxLives: number;
  unlimitedLives: boolean;
  /** Etapa curricular: só para leitor de tela/QA — não é pílula visível. */
  stageLabel?: string;
}) {
  const breath = showsBreathIndicator({ lives, maxLives, unlimited: unlimitedLives });
  return (
    <div className="relative" data-lesson-stage={stageLabel}>
      <GuidedProgressHeader
        onExit={onExit}
        exitLabel={t("player.exit")}
        exitTestId={exitTestId}
        value={progressValue}
        max={progressMax}
        progressLabelProps={{ "data-lesson-progress-label": true }}
        trailing={
          <>
            {breath && (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-accent"
                aria-label={t("player.livesCountAria", { lives, max: maxLives })}
                data-guided-breath
              >
                <IconFlame width={14} height={14} fill="currentColor" />
                {lives}
              </span>
            )}
            {onReport && (
              // Desktop/tablet: reportar fica no cabeçalho. No celular o
              // atalho mora no painel de erro (onde a dúvida nasce).
              <button
                type="button"
                onClick={onReport}
                className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink sm:grid"
                aria-label={t("player.reportQuestion")}
                title={t("common.reportProblem")}
              >
                <IconChat width={15} height={15} />
              </button>
            )}
          </>
        }
      />
      {stageLabel ? <span className="sr-only">{stageLabel}</span> : null}
    </div>
  );
}

// ── Viewport do passo (PART G/H/BL) ───────────────────────────────────────

const ALIGN_CLASS: Record<VerticalAlignment, string> = {
  CENTER: "justify-center",
  TOP_CENTER: "justify-start pt-2 sm:pt-6",
  CONTENT_SCROLL: "justify-start",
  CONVERSATION: "justify-start",
};

export function guidedAlignmentFor(kind: string): VerticalAlignment {
  return presentationContractFor(kind).verticalAlignment;
}

/**
 * O passo vive DIRETO no viewport — sem o <Card> antigo (PART E/F). O
 * `data-lesson-task-body` continua existindo para QA, agora sem superfície.
 */
export function GuidedStepSurface({
  stepKind,
  stepIndex,
  children,
  ...rest
}: {
  stepKind: string;
  stepIndex: number;
  children: ReactNode;
} & Record<string, unknown>) {
  const contract = presentationContractFor(stepKind);
  return (
    <div
      {...rest}
      data-guided-step
      data-guided-layout={contract.layout}
      data-guided-action-placement={contract.actionPlacement}
      data-guided-alignment={contract.verticalAlignment}
      className={[
        "longyu-step-in flex min-h-full w-full flex-col px-3 pb-4 sm:px-4",
        GUIDED_CLASS.column,
        ALIGN_CLASS[contract.verticalAlignment],
      ].join(" ")}
      key={`${stepIndex}:${stepKind}`}
    >
      <div className="w-full">{children}</div>
    </div>
  );
}

// ── Dock (PART I/J) ───────────────────────────────────────────────────────

export function GuidedLessonActionDock({ dockRef }: { dockRef: Ref<HTMLDivElement> }) {
  // Os passos portam a ação principal para cá (LessonActionPortal). Vazio,
  // o dock some — nada de faixa branca sem botão.
  return (
    <GuidedBottomAction
      dockRef={dockRef}
      data-lesson-action-region
      className={`empty:hidden ${GUIDED_CLASS.column} !px-0 !pb-0 !pt-0`}
    />
  );
}

// ── PREPARE (PART N–Q) ────────────────────────────────────────────────────

/**
 * Micro-passo visual de abertura: Dragão + balão curto + título da lição.
 * Não é passo do currículo — não conta como idx, XP, domínio, tarefa nem SRS.
 */
export function GuidedPrepareStage({ title, line }: { title: string; line: string }) {
  return (
    <div
      className={["longyu-step-in flex min-h-full w-full flex-col justify-center gap-6 px-4", GUIDED_CLASS.column].join(" ")}
      data-guided-prepare
      data-guided-phase="PREPARE"
    >
      <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-accent" data-guided-lesson-title>
        {title}
      </p>
      <div className="flex items-end gap-3" data-testid="lesson-prepare-line">
        <Mascot size={GUIDED_DRAGON_SIZE.default} className="shrink-0" />
        <p className="relative min-w-0 rounded-2xl border border-line bg-surface px-4 py-3 text-base font-medium leading-6 text-ink shadow-card">
          <span className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-line bg-surface" aria-hidden="true" />
          {line}
        </p>
      </div>
    </div>
  );
}
