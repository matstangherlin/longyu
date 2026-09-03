import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { IconCheck, IconChevron, IconSound } from "../../components/ui/Icon";
import { Button, ButtonLink, Card, ProgressBar } from "../../components/ui/primitives";
import { getLessonCapsule } from "../../data/lessonCapsules";
import { JOURNEY_NODES } from "../../data/journeyOrchestrator";
import { useTranslation } from "../../i18n/useTranslation";
import { completeJourneyNode } from "../../lib/journeyNodeProgress";
import { speak } from "../../lib/tts";

export function LessonCapsulePage() {
  const { capsuleId = "" } = useParams();
  const navigate = useNavigate();
  const { instructionLocale } = useTranslation();
  const capsule = useMemo(() => getLessonCapsule(decodeURIComponent(capsuleId)), [capsuleId]);
  const [index, setIndex] = useState(0);

  if (!capsule) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Card className="p-6 text-center">
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {instructionLocale === "en" ? "Lesson capsule unavailable" : "Cápsula indisponível"}
          </h1>
          <ButtonLink className="mt-5 w-full" to="/jornada">
            {instructionLocale === "en" ? "Back to Journey" : "Voltar à Jornada"}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const content = capsule.localized[instructionLocale];
  const segment = content.segments[index];
  const last = index === content.segments.length - 1;
  const finish = () => {
    const node = JOURNEY_NODES.find((candidate) => candidate.type === "LESSON_CAPSULE" && candidate.sourceId === capsule.id);
    if (node) completeJourneyNode(node.id);
    navigate(`/licao/${capsule.topicId}`);
  };

  return (
    <main className="mx-auto max-w-xl px-1 py-4 sm:py-7" data-testid="lesson-capsule" data-capsule-id={capsule.id}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            {instructionLocale === "en" ? "Interactive lesson" : "Aula interativa"} · ~{Math.ceil(capsule.durationSeconds / 60)} min
          </div>
          <h1 className="mt-1 font-serif text-xl font-semibold text-ink">{content.title}</h1>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint">{index + 1}/{content.segments.length}</span>
      </div>
      <ProgressBar value={index + 1} max={content.segments.length} label={content.title} />

      <Card className="mt-4 overflow-hidden p-5 sm:p-7" variant="progress">
        <div className="flex items-start gap-3">
          <Mascot size={72} variant={last ? "celebrate" : "wave"} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{segment.kind.replace("_", " ")}</div>
            <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">{segment.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{segment.body}</p>
          </div>
        </div>

        {(segment.hanzi || segment.pinyin || segment.meaning) && (
          <div className="mt-5 rounded-2xl border border-line/70 bg-surface px-4 py-6 text-center shadow-card" data-testid="capsule-language-card">
            {segment.audioText && (
              <button
                type="button"
                onClick={() => speak(segment.audioText!, { rate: 0.82 })}
                className="mx-auto mb-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <IconSound width={20} height={20} />
                {instructionLocale === "en" ? "Play Mandarin" : "Ouvir mandarim"}
              </button>
            )}
            {segment.hanzi && <div className="font-serif text-5xl font-semibold leading-none text-ink" lang="zh-CN">{segment.hanzi}</div>}
            {segment.pinyin && <div className="mt-3 text-xl font-semibold text-accent">{segment.pinyin}</div>}
            {segment.meaning && <div className="mt-2 text-sm text-ink-soft">{segment.meaning}</div>}
          </div>
        )}

        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => (last ? finish() : setIndex((value) => value + 1))}
          data-testid="capsule-continue"
        >
          {last ? (
            <><IconCheck width={20} height={20} /> {instructionLocale === "en" ? "Start the exercises" : "Iniciar exercícios"}</>
          ) : (
            <>{instructionLocale === "en" ? "Continue" : "Continuar"} <IconChevron width={18} height={18} /></>
          )}
        </Button>
      </Card>
      <p className="mt-3 px-2 text-center text-xs text-ink-faint">{content.objective}</p>
    </main>
  );
}
