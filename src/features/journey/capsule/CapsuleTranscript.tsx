import { useState } from "react";
import { Button } from "../../../components/ui/primitives";
import type { InstructionLocale } from "../../../i18n/config";
import type { MediaCaptionCue } from "../../../data/lessonMediaAssets";

/**
 * V4.9.2B — Parte J.
 *
 * A transcrição não é um extra para quem já ouviu: é a mesma aula para quem
 * não pode ouvir, está no transporte, ou lê melhor do que escuta. Por isso é
 * selecionável, rolável e navegável por teclado.
 *
 * Nada aqui usa `dangerouslySetInnerHTML`. O texto vem de arquivo de autoria,
 * e renderizá-lo como HTML transformaria o cadastro de uma aula num vetor de
 * injeção — exatamente o que a Parte Y proíbe.
 */
export function CapsuleTranscript({
  transcript,
  cues,
  locale,
  onSeek,
}: {
  transcript: string;
  cues?: MediaCaptionCue[];
  locale: InstructionLocale;
  /** Quando presente, cada marca de tempo vira um atalho para o ponto do vídeo. */
  onSeek?: (seconds: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const en = locale === "en";
  if (!transcript?.trim() && !cues?.length) return null;

  return (
    <div className="mt-4">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        data-testid="capsule-transcript-toggle"
      >
        {open
          ? en
            ? "Hide transcript"
            : "Ocultar transcrição"
          : en
            ? "View transcript"
            : "Ver transcrição"}
      </Button>

      {open && (
        <div
          data-testid="capsule-transcript"
          className="mt-3 max-h-64 select-text overflow-y-auto rounded-2xl border border-line bg-surface-2 p-4 text-sm leading-6 text-ink"
          tabIndex={0}
          role="region"
          aria-label={en ? "Lesson transcript" : "Transcrição da aula"}
        >
          {cues?.length ? (
            <ol className="flex flex-col gap-2">
              {cues.map((cue, index) => (
                <li key={`${cue.startSeconds}-${index}`} className="flex gap-3">
                  {onSeek ? (
                    <button
                      type="button"
                      onClick={() => onSeek(cue.startSeconds)}
                      data-testid="capsule-transcript-timestamp"
                      className="shrink-0 font-mono text-xs font-semibold tabular-nums text-accent underline decoration-accent/40 underline-offset-2"
                    >
                      {formatStamp(cue.startSeconds)}
                    </button>
                  ) : (
                    <span className="shrink-0 font-mono text-xs tabular-nums text-ink-faint">
                      {formatStamp(cue.startSeconds)}
                    </span>
                  )}
                  <span className="min-w-0">{cue.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="whitespace-pre-wrap">{transcript}</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatStamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
