import type { ReactNode } from "react";
import { Button, cx } from "../../components/ui/primitives";
import { t } from "../../i18n/catalog";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import { ExerciseText, containsCjk } from "../../components/hanzi/ExerciseText";
import { assemblyTileClass } from "./buildAssemblyFeedback";

/**
 * Área compartilhada de montagem com peças (lição + revisão).
 * Hierarquia: rótulo → bandeja (sua frase) → banco (peças) → dica.
 */

export interface AssemblyPiece {
  id: string;
  value: string;
}

export function PieceAssemblyTray({
  pieces,
  emptySlots = 0,
  locked = false,
  wrongIndexes,
  matchPrefix = 0,
  showWrong = false,
  emptyHint,
  onRemove,
  className,
}: {
  pieces: AssemblyPiece[];
  /** Slots tracejados que ainda faltam. */
  emptySlots?: number;
  locked?: boolean;
  /** Índices errados (após verificar). */
  wrongIndexes?: Set<number> | number[];
  /** Prefixo correto — destaca em verde sem revelar o resto. */
  matchPrefix?: number;
  showWrong?: boolean;
  emptyHint?: string;
  onRemove?: (index: number) => void;
  className?: string;
}) {
  const hint = emptyHint ?? t("player.tapPiecesHint");
  const wrong = wrongIndexes instanceof Set ? wrongIndexes : new Set(wrongIndexes ?? []);

  return (
    <div
      data-assembly-tray
      className={cx(
        "flex min-h-[5.75rem] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-dashed border-accent-soft bg-surface-2/90 px-3 py-3.5 shadow-inner sm:min-h-[6.25rem] sm:px-4 sm:py-4",
        className
      )}
    >
      {pieces.length === 0 ? (
        <span className="w-full px-2 text-center text-sm font-medium leading-5 text-ink-faint">{hint}</span>
      ) : (
        pieces.map((piece, index) => {
          const isMatch = showWrong && index < matchPrefix;
          const isWrong = showWrong && wrong.has(index);
          const cjk = containsCjk(piece.value);
          return (
            <button
              key={`${piece.id}-${index}`}
              type="button"
              onClick={() => onRemove?.(index)}
              disabled={locked || !onRemove}
              className={assemblyTileClass({
                cjk,
                active: !showWrong,
                matched: isMatch,
                wrong: isWrong,
              })}
              aria-label={locked ? piece.value : t("player.removeAria", { value: piece.value })}
            >
              <ExerciseText value={piece.value} type={cjk ? "hanzi" : "pt"} speakOnClick helpMode="disabled" />
            </button>
          );
        })
      )}
      {pieces.length > 0 &&
        Array.from({ length: Math.max(0, emptySlots) }).map((_, index) => (
          <span
            key={`slot-${index}`}
            aria-hidden
            data-assembly-empty-slot
            className="flex h-12 min-w-[3.25rem] items-end justify-center rounded-2xl border border-dashed border-line/80 pb-2 sm:h-14 sm:min-w-[3.5rem]"
          >
            <span className="h-0.5 w-7 rounded-full bg-line" />
          </span>
        ))}
    </div>
  );
}

export function PieceAssemblyBank({
  pieces,
  usedIds,
  locked = false,
  onAdd,
  showShortcuts = false,
  shortcutLabel,
  className,
}: {
  pieces: AssemblyPiece[];
  usedIds: Set<string>;
  locked?: boolean;
  onAdd: (piece: AssemblyPiece) => void;
  showShortcuts?: boolean;
  shortcutLabel?: (index: number) => string;
  className?: string;
}) {
  return (
    <div
      data-assembly-bank
      className={cx("flex flex-wrap justify-center gap-2 sm:gap-2.5", className)}
    >
      {pieces.map((piece, index) => {
        const used = usedIds.has(piece.id);
        const cjk = containsCjk(piece.value);
        return (
          <button
            key={piece.id}
            type="button"
            onClick={() => onAdd(piece)}
            disabled={used || locked}
            className={cx(
              assemblyTileClass({ cjk, muted: used }),
              "group relative overflow-visible"
            )}
            aria-label={
              showShortcuts && shortcutLabel && index < 10
                ? t("player.pieceAria", { key: shortcutLabel(index), value: piece.value })
                : piece.value
            }
          >
            {showShortcuts && shortcutLabel && index < 10 ? (
              <span className="pointer-events-none absolute -right-1 -top-1 rounded-md bg-surface-2 px-1 text-[9px] font-bold text-ink-faint ring-1 ring-line">
                {shortcutLabel(index)}
              </span>
            ) : null}
            <ExerciseText value={piece.value} type={cjk ? "hanzi" : "pt"} speakOnClick helpMode="disabled" />
          </button>
        );
      })}
    </div>
  );
}

export function PieceAssemblyBoard({
  trayLabel = t("player.yourAnswer"),
  bankLabel = t("player.pieces"),
  tray,
  bank,
  hint,
  actions,
}: {
  trayLabel?: string;
  bankLabel?: string;
  tray: ReactNode;
  bank: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div data-assembly-board className="mt-4 grid gap-3 sm:mt-5 sm:gap-4">
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {trayLabel}
        </div>
        {tray}
      </section>
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {bankLabel}
        </div>
        {bank}
      </section>
      {hint}
      {actions}
    </div>
  );
}

export function AssemblyHintBanner({
  message,
  tone = "soft",
}: {
  message: string;
  tone?: "soft" | "accent" | "good";
}) {
  const tones = {
    soft: "border-line bg-surface-2 text-ink-soft",
    accent: "border-accent-soft bg-accent-soft/45 text-accent",
    good: "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
  };
  return (
    <p
      role="status"
      data-assembly-hint
      className={cx("animate-pop rounded-xl border px-3 py-2.5 text-center text-sm font-medium leading-5", tones[tone])}
    >
      {displayInstruction(message)}
    </p>
  );
}

/** CTA Limpar + Verificar alinhado ao Lesson Player. */
export function AssemblyCheckActions({
  canCheck,
  canClear,
  onCheck,
  onClear,
  checkLabel = t("player.check"),
  clearLabel = t("player.clear"),
}: {
  canCheck: boolean;
  canClear: boolean;
  onCheck: () => void;
  onClear: () => void;
  checkLabel?: string;
  clearLabel?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]" data-assembly-actions>
      <Button size="lg" variant="outline" className="w-full" disabled={!canClear} onClick={onClear}>
        {clearLabel}
      </Button>
      <Button
        size="lg"
        variant={canCheck ? "good" : "outline"}
        className="w-full shadow-lift"
        disabled={!canCheck}
        onClick={onCheck}
      >
        {checkLabel}
      </Button>
    </div>
  );
}
