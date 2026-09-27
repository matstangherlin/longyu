import type { ReactNode, Ref } from "react";
import { ProgressBar } from "../ui/primitives";
import { IconSound, IconX } from "../ui/Icon";

/**
 * RC2.2.17B · PART B — linguagem visual ÚNICA do Teste guiado e da Jornada.
 *
 * Extraído do GuidedTryPage: cabeçalho (× + barra + n/N), viewport central,
 * dock inferior com UMA ação principal, lista de opções grandes, feedback
 * curto na mesma tela e o botão grande de áudio. As classes vivem aqui — nada
 * de copiar CSS duas vezes.
 */
export const GUIDED_CLASS = {
  header:
    "sticky top-0 z-30 flex shrink-0 items-center gap-3 bg-bg/95 px-3 pb-2 pt-[max(0.5rem,var(--app-safe-top))] backdrop-blur",
  exit: "grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink",
  progress: "h-2.5 min-w-0 flex-1",
  progressLabel: "shrink-0 text-xs font-semibold tabular-nums text-ink-faint",
  /** Largura limitada no desktop/tablet (PART BJ/BK): não é celular esticado. */
  column: "mx-auto w-full max-w-[680px]",
  dock: "shrink-0 bg-bg/95 px-4 pb-[calc(var(--app-safe-bottom)+1rem)] pt-2 backdrop-blur",
  option:
    "min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold transition",
  audio: "grid h-24 w-24 place-items-center rounded-full text-white shadow-lift transition active:scale-95",
} as const;

export function GuidedProgressHeader({
  onExit,
  exitLabel,
  value,
  max,
  exitTestId,
  trailing,
  progressLabelProps,
  className = "",
}: {
  onExit: () => void;
  exitLabel: string;
  value: number;
  max: number;
  exitTestId?: string;
  /** Indicador compacto opcional (ex.: Fôlego depois de um erro). */
  trailing?: ReactNode;
  progressLabelProps?: Record<string, string | boolean | undefined>;
  className?: string;
}) {
  return (
    <header className={[GUIDED_CLASS.header, className].join(" ")} data-guided-header>
      <button type="button" onClick={onExit} aria-label={exitLabel} className={GUIDED_CLASS.exit} data-testid={exitTestId}>
        <IconX width={18} height={18} />
      </button>
      <ProgressBar value={value} max={max} className={GUIDED_CLASS.progress} />
      {trailing}
      <span className={GUIDED_CLASS.progressLabel} data-guided-progress {...progressLabelProps}>
        {value}/{max}
      </span>
    </header>
  );
}

/**
 * Dock inferior (PART I): fixo dentro do shell, respeita a safe-area de baixo.
 * `dockRef` recebe o nó para o portal das ações do passo (LessonActionPortal).
 */
export function GuidedBottomAction({
  children,
  dockRef,
  className = "",
  ...rest
}: {
  children?: ReactNode;
  dockRef?: Ref<HTMLDivElement>;
  className?: string;
} & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <div ref={dockRef} className={[GUIDED_CLASS.dock, className].join(" ")} data-guided-action-dock {...rest}>
      {children}
    </div>
  );
}

export type GuidedChoice = { id: string; label: string; correct: boolean };

export function GuidedChoiceList({
  step,
  choices,
  picked,
  onChoose,
  label,
  hanzi = false,
  render,
}: {
  step: string;
  choices: GuidedChoice[];
  picked: string | null;
  onChoose: (choice: GuidedChoice) => void;
  label: string;
  hanzi?: boolean;
  render?: (choice: GuidedChoice) => ReactNode;
}) {
  return (
    <div className="mt-5 grid gap-2" role="group" aria-label={label} data-choice-step={step}>
      {choices.map((choice) => {
        const state = picked === choice.id ? (choice.correct ? "right" : "wrong") : "idle";
        return (
          <button
            key={choice.id}
            type="button"
            data-guided-option={choice.id}
            data-state={state}
            onClick={() => onChoose(choice)}
            className={[
              GUIDED_CLASS.option,
              state === "right" && "longyu-correct-pop border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]",
              state === "wrong" && "longyu-error-shake border-transparent bg-wrong-soft text-wrong",
              state === "idle" && "border-line bg-surface text-ink hover:bg-surface-2",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {render ? render(choice) : <span className={hanzi ? "hanzi text-xl" : undefined}>{choice.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** PART X/Y — feedback curto, na MESMA tela (sem modal, sem card novo). */
export function GuidedFeedback({ picked, right, tryAgain }: { picked: GuidedChoice | undefined; right: string; tryAgain: string }) {
  return (
    <p className="mt-3 min-h-5 text-sm text-ink-soft" role="status" aria-live="polite" data-guided-feedback={picked ? (picked.correct ? "right" : "wrong") : undefined}>
      {picked ? (picked.correct ? right : tryAgain) : ""}
    </p>
  );
}

/** PART T/U — botão grande de áudio; o estado vem do contrato de reprodução. */
export function GuidedAudioButton({
  onPress,
  label,
  state,
  failed = false,
  className = "",
  ...rest
}: {
  onPress: () => void;
  label: string;
  state: string;
  failed?: boolean;
  className?: string;
} & Record<`data-${string}`, string | boolean | undefined>) {
  const busy = state === "STARTING" || state === "PLAYING";
  return (
    <button
      type="button"
      onClick={onPress}
      data-listen-state={state}
      className={[GUIDED_CLASS.audio, failed ? "bg-ink-faint" : "bg-accent", busy ? "ring-8 ring-accent-soft" : "", className].join(" ")}
      aria-label={label}
      {...rest}
    >
      <IconSound width={34} height={34} />
    </button>
  );
}
