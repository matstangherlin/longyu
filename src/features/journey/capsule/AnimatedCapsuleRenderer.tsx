import { useEffect, useMemo, useState } from "react";
import { Mascot } from "../../../components/brand/Mascot";
import { ToneContour } from "../../../components/tone/ToneContour";
import { IconCheck, IconChevron, IconSound } from "../../../components/ui/Icon";
import { Button, ProgressBar } from "../../../components/ui/primitives";
import type { LessonCapsuleLocalizedContent } from "../../../data/lessonCapsules";
import type { InstructionLocale } from "../../../i18n/config";
import { speak } from "../../../lib/tts";
import { trackMediaEvent } from "../../../services/mediaEvents";
import { CapsuleMicroCheck } from "./CapsuleMicroCheck";

/**
 * V4.9.2B — Parte Q: a cápsula animada é primeira classe, não o degrau
 * provisório antes do vídeo. É ela que roda hoje nas cinco aulas da fundação,
 * e é o formato das aulas do dragão que vêm depois.
 *
 * V4.9.3 — o renderer aprendeu a ensinar. Além de título e corpo, ele agora
 * desenha o contorno do tom, decompõe um hànzì em partes e conduz o microcheck
 * de compreensão. São as três coisas que uma explicação escrita não consegue
 * fazer sozinha: mostrar o movimento do som, mostrar que um caractere é feito
 * de peças, e verificar que a explicação pegou antes de cobrar.
 *
 * Nenhuma delas exige animação para funcionar (Parte U): o contorno é um SVG
 * com rótulo textual, as peças são texto, e o microcheck são botões. Quem
 * desligou animação no sistema recebe a mesma aula, parada.
 */
export function AnimatedCapsuleRenderer({
  content,
  locale,
  capsuleId,
  onComplete,
}: {
  content: LessonCapsuleLocalizedContent;
  locale: InstructionLocale;
  capsuleId?: string;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [checkAnswered, setCheckAnswered] = useState(false);
  const segment = content.segments[index];
  const last = index === content.segments.length - 1;
  const en = locale === "en";

  useEffect(() => {
    trackMediaEvent("instruction_started", { capsule_id: capsuleId ?? null });
  }, [capsuleId]);

  // O microcheck segura o avanço até ser respondido — mas só ele, e só uma
  // vez. Bloquear qualquer outro segmento transformaria a aula em corredor.
  const blocked = segment?.kind === "MICRO_CHECK" && Boolean(segment.check) && !checkAnswered;

  const kindLabel = useMemo(() => KIND_LABELS[segment?.kind ?? "EXPLAIN"], [segment?.kind]);

  if (!segment) return null;

  const advance = () => {
    if (last) {
      trackMediaEvent("instruction_completed", { capsule_id: capsuleId ?? null });
      onComplete();
      return;
    }
    setCheckAnswered(false);
    setIndex((value) => value + 1);
  };

  return (
    <div data-testid="capsule-animated" data-segment-index={index} data-segment-kind={segment.kind}>
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
            {en ? kindLabel.en : kindLabel.pt}
          </div>
          <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">
            {segment.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{segment.body}</p>
        </div>
      </div>

      {(segment.hanzi || segment.pinyin || segment.meaning || segment.toneContour) && (
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
              <IconSound width={20} height={20} aria-hidden="true" />
              {en ? "Play Mandarin" : "Ouvir mandarim"}
            </button>
          )}

          {segment.components?.length ? (
            // A decomposição é a aula inteira da F5: o aluno precisa VER as
            // peças separadas e depois juntas, não ler que elas existem.
            <div className="mb-4 flex items-center justify-center gap-2" data-testid="capsule-components">
              {segment.components.map((part, partIndex) => (
                <span key={`${part.glyph}-${partIndex}`} className="contents">
                  {partIndex > 0 && (
                    <span className="text-2xl font-semibold text-ink-faint" aria-hidden="true">
                      +
                    </span>
                  )}
                  <span className="flex flex-col items-center gap-1 rounded-xl border border-line/70 bg-surface-2 px-3 py-2">
                    <span className="font-serif text-3xl leading-none text-ink" lang="zh-CN">
                      {part.glyph}
                    </span>
                    <span className="text-[10px] font-medium text-ink-faint">{part.label}</span>
                  </span>
                </span>
              ))}
              <span className="text-2xl font-semibold text-ink-faint" aria-hidden="true">
                =
              </span>
            </div>
          ) : null}

          {segment.hanzi && (
            <div className="font-serif text-5xl font-semibold leading-none text-ink" lang="zh-CN">
              {segment.hanzi}
            </div>
          )}
          {segment.pinyin && <div className="mt-3 text-xl font-semibold text-accent">{segment.pinyin}</div>}
          {segment.toneContour && (
            <div className="mt-3 flex justify-center">
              <ToneContour tone={segment.toneContour} locale={locale} />
            </div>
          )}
          {segment.meaning && <div className="mt-2 text-sm text-ink-soft">{segment.meaning}</div>}
        </div>
      )}

      {segment.kind === "MICRO_CHECK" && segment.check && (
        <CapsuleMicroCheck
          check={segment.check}
          locale={locale}
          capsuleId={capsuleId ?? ""}
          segmentId={segment.id}
          onAnswered={() => setCheckAnswered(true)}
        />
      )}

      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={advance}
        disabled={blocked}
        data-testid="capsule-continue"
      >
        {last ? (
          <>
            <IconCheck width={20} height={20} aria-hidden="true" />{" "}
            {en ? "Start the exercises" : "Iniciar exercícios"}
          </>
        ) : (
          <>
            {en ? "Continue" : "Continuar"} <IconChevron width={18} height={18} aria-hidden="true" />
          </>
        )}
      </Button>

      {blocked && (
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          {en ? "Choose an answer to continue." : "Escolha uma resposta para continuar."}
        </p>
      )}
    </div>
  );
}

/**
 * O rótulo do degrau, para o aluno saber o que está acontecendo.
 *
 * "Só para confirmar" em vez de "verificação": o aluno precisa entender pelo
 * rótulo que ali não está sendo avaliado.
 */
const KIND_LABELS: Record<string, { pt: string; en: string }> = {
  ORIENT: { pt: "Para começar", en: "To begin" },
  EXPLAIN: { pt: "Explicação", en: "Explanation" },
  DEMONSTRATE: { pt: "Demonstração", en: "Demonstration" },
  NOTICE: { pt: "Repare", en: "Notice" },
  REPLAY: { pt: "De novo", en: "Again" },
  COMPARE: { pt: "Compare", en: "Compare" },
  CONTEXT: { pt: "Contexto", en: "Context" },
  MICRO_CHECK: { pt: "Só para confirmar", en: "Just to be sure" },
  CHECK: { pt: "Confira", en: "Check" },
  TRANSITION_TO_PRACTICE: { pt: "A seguir", en: "Up next" },
};
