import { ProgressBar } from "../../components/ui/primitives";
import { IconChat, IconFlame, IconX } from "../../components/ui/Icon";

// Barra superior do modo foco: fina como em apps de idioma.
// [X] [progresso] [fôlego] [6/10] [report] e, abaixo, uma linha discreta com a etapa.
// O report reutiliza o mesmo modal de Feedback (não é um segundo FAB).
export function LessonFocusHeader({
  onExit,
  onReport,
  progressValue,
  progressMax,
  lives,
  maxLives,
  unlimitedLives,
  stageLabel,
}: {
  onExit: () => void;
  /** Abre o FeedbackModal existente com contexto da pergunta atual. */
  onReport?: () => void;
  progressValue: number;
  progressMax: number;
  lives: number;
  maxLives: number;
  unlimitedLives: boolean;
  stageLabel?: string;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-2 mb-3 bg-bg/95 px-2 pb-1.5 pt-1 backdrop-blur sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 text-sm sm:gap-2.5">
        <button
          onClick={onExit}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
          aria-label="Sair"
        >
          <IconX width={16} height={16} />
        </button>
        <div className="min-w-0 flex-1">
          <ProgressBar value={progressValue} max={progressMax} className="h-2.5 min-w-0 shadow-inner" />
        </div>
        <DragonBreathMeter lives={lives} maxLives={maxLives} unlimited={unlimitedLives} />
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-faint">
          {progressValue}/{progressMax}
        </span>
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Reportar problema nesta pergunta"
            title="Reportar problema"
          >
            <IconChat width={15} height={15} />
          </button>
        )}
      </div>
      {stageLabel && (
        <div className="mt-1 truncate pl-10 pr-1 text-[11px] font-medium text-ink-faint" title={stageLabel}>
          {stageLabel}
        </div>
      )}
    </div>
  );
}

export function DragonBreathMeter({
  lives,
  maxLives,
  unlimited,
}: {
  lives: number;
  maxLives: number;
  unlimited: boolean;
}) {
  if (unlimited) {
    return (
      <div
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent-soft bg-accent-soft/70 px-2.5 py-1 text-xs font-semibold text-accent shadow-card"
        aria-label="Fôlego do Dragão ilimitado"
      >
        <IconFlame width={13} height={13} />
        <span>∞</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface/95 px-2 py-1 shadow-card"
      aria-label={`Fôlego do Dragão: ${lives} de ${maxLives}`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxLives }, (_, index) => {
          const active = index < lives;
          return (
            <span
              key={index}
              className={[
                "grid h-4 w-4 place-items-center rounded-full transition",
                active ? "text-accent" : "text-line",
              ].join(" ")}
            >
              <IconFlame width={12} height={12} fill={active ? "currentColor" : "none"} />
            </span>
          );
        })}
      </div>
      <span className="tabular-nums text-[11px] font-semibold text-ink-soft sm:hidden">{lives}</span>
    </div>
  );
}
