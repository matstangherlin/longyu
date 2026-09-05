import { useState } from "react";
import { Mascot } from "../../../components/brand/Mascot";
import { IconCheck, IconChevron, IconSound } from "../../../components/ui/Icon";
import { Button, ProgressBar } from "../../../components/ui/primitives";
import type { LessonCapsuleLocalizedContent } from "../../../data/lessonCapsules";
import type { InstructionLocale } from "../../../i18n/config";
import { speak } from "../../../lib/tts";

/**
 * V4.9.2B — Parte Q: a cápsula animada é primeira classe, não o degrau
 * provisório antes do vídeo. É ela que roda hoje na cápsula oficial de Pinyin,
 * e é o formato das aulas do dragão que vêm depois.
 *
 * Extraída da página para que o player unificado possa despachar entre
 * animação e vídeo sem duplicar título, progresso, transcrição e conclusão —
 * e para que a Parte R (aula híbrida) possa intercalar os dois no futuro sem
 * reescrever nenhum dos dois.
 */
export function AnimatedCapsuleRenderer({
  content,
  locale,
  onComplete,
}: {
  content: LessonCapsuleLocalizedContent;
  locale: InstructionLocale;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const segment = content.segments[index];
  const last = index === content.segments.length - 1;
  const en = locale === "en";

  return (
    <div data-testid="capsule-animated" data-segment-index={index}>
      <div className="mb-3 flex items-center justify-end px-1">
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint">
          {index + 1}/{content.segments.length}
        </span>
      </div>
      <ProgressBar value={index + 1} max={content.segments.length} label={content.title} />

      <div className="mt-4 flex items-start gap-3">
        <Mascot size={72} variant={last ? "celebrate" : "wave"} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            {segment.kind.replace("_", " ")}
          </div>
          <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">{segment.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{segment.body}</p>
        </div>
      </div>

      {(segment.hanzi || segment.pinyin || segment.meaning) && (
        <div
          className="mt-5 rounded-2xl border border-line/70 bg-surface px-4 py-6 text-center shadow-card"
          data-testid="capsule-language-card"
        >
          {segment.audioText && (
            <button
              type="button"
              onClick={() => speak(segment.audioText!, { rate: 0.82 })}
              className="mx-auto mb-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <IconSound width={20} height={20} />
              {en ? "Play Mandarin" : "Ouvir mandarim"}
            </button>
          )}
          {segment.hanzi && (
            <div className="font-serif text-5xl font-semibold leading-none text-ink" lang="zh-CN">
              {segment.hanzi}
            </div>
          )}
          {segment.pinyin && <div className="mt-3 text-xl font-semibold text-accent">{segment.pinyin}</div>}
          {segment.meaning && <div className="mt-2 text-sm text-ink-soft">{segment.meaning}</div>}
        </div>
      )}

      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={() => (last ? onComplete() : setIndex((value) => value + 1))}
        data-testid="capsule-continue"
      >
        {last ? (
          <>
            <IconCheck width={20} height={20} /> {en ? "Start the exercises" : "Iniciar exercícios"}
          </>
        ) : (
          <>
            {en ? "Continue" : "Continuar"} <IconChevron width={18} height={18} />
          </>
        )}
      </Button>
    </div>
  );
}
