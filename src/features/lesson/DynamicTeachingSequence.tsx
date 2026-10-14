import { useEffect, useMemo, useState } from "react";
import { Button, ProgressBar } from "../../components/ui/primitives";
import { GuidedDock } from "./GuidedLessonShell";
import { TeacherSpeechBubble } from "./TeacherSpeechBubble";
import {
  presentationForCapsule,
  type TeachingBeat,
} from "../../data/lessonPresentations";
import { getLessonVisualAsset } from "../../data/lessonVisualAssets";
import type { InstructionLocale } from "../../i18n/config";
import { playMandarinAudio } from "../../lib/audioPlayback";
import { recordTechEvent } from "../../lib/techEvents";

const SESSION_KEY = "longyu:dynamic-aula-beat";

function readResume(capsuleId: string): number {
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY}:${capsuleId}`);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeResume(capsuleId: string, index: number) {
  try {
    sessionStorage.setItem(`${SESSION_KEY}:${capsuleId}`, String(index));
  } catch {
    /* ignore */
  }
}

function VisualBeat({
  beat,
  locale,
}: {
  beat: TeachingBeat;
  locale: InstructionLocale;
}) {
  const asset = beat.visualAssetId ? getLessonVisualAsset(beat.visualAssetId) : undefined;
  const [failed, setFailed] = useState(false);
  const alt = asset ? (locale === "en" ? asset.altEn : asset.altPt) : "";
  const caption = locale === "en" ? beat.captionEn : beat.captionPt;

  if (!asset || failed) {
    return (
      <div
        data-testid="visual-fallback"
        className="mx-auto flex aspect-video w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2 px-4 text-center text-sm text-ink-soft"
        role="img"
        aria-label={alt || (locale === "en" ? "Visual example" : "Exemplo visual")}
      >
        {beat.hanzi ? (
          <span className="font-serif text-5xl text-ink">{beat.hanzi}</span>
        ) : (
          <span>{locale === "en" ? "Diagram unavailable — lesson continues." : "Diagrama indisponível — a aula continua."}</span>
        )}
      </div>
    );
  }

  return (
    <figure className="mx-auto w-full max-w-sm" data-testid="visual-example" data-asset-id={asset.assetId}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2" style={{ aspectRatio: asset.aspect.replace("/", " / ") }}>
        <img
          src={asset.src}
          alt={alt}
          loading="lazy"
          width={640}
          height={360}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
          onLoad={() => recordTechEvent("visual_example_viewed", { assetId: asset.assetId })}
        />
      </div>
      {caption ? <figcaption className="mt-2 text-center text-xs text-ink-soft">{caption}</figcaption> : null}
    </figure>
  );
}

/**
 * Presentation-only dynamic AULA sequence inside GuidedLessonShell primitives.
 * Does not grant XP, Mastery, SRS, or unlock curriculum.
 */
export function DynamicTeachingSequence({
  capsuleId,
  locale,
  onComplete,
  title,
}: {
  capsuleId: string;
  locale: InstructionLocale;
  onComplete: () => void;
  title: string;
}) {
  const presentation = useMemo(() => presentationForCapsule(capsuleId), [capsuleId]);
  const beats = presentation?.beats ?? [];
  const [index, setIndex] = useState(() => Math.min(readResume(capsuleId), Math.max(0, beats.length - 1)));
  const [bubbleReady, setBubbleReady] = useState(false);
  const en = locale === "en";
  const beat = beats[index];

  useEffect(() => {
    recordTechEvent("dynamic_aula_started", { capsuleId });
  }, [capsuleId]);

  useEffect(() => {
    writeResume(capsuleId, index);
    setBubbleReady(false);
  }, [capsuleId, index]);

  if (!presentation || !beat) {
    return null;
  }

  const teacherLine = en ? beat.teacherLineEn : beat.teacherLinePt;
  const last = index >= beats.length - 1;
  const primaryLabel =
    beat.type === "AUDIO_EXAMPLE" && !bubbleReady
      ? en
        ? "Listen"
        : "Ouvir"
      : last
        ? en
          ? "Finish lesson"
          : "Concluir aula"
        : en
          ? "Continue"
          : "Continuar";

  const advance = () => {
    if (!bubbleReady) {
      setBubbleReady(true);
      return;
    }
    if (last) {
      recordTechEvent("dynamic_aula_completed", { capsuleId });
      try {
        sessionStorage.removeItem(`${SESSION_KEY}:${capsuleId}`);
      } catch {
        /* ignore */
      }
      onComplete();
      return;
    }
    setIndex((v) => v + 1);
  };

  const playAudio = () => {
    if (beat.audioText) void playMandarinAudio(beat.audioText, { source: "LESSON" });
  };

  return (
    <div
      className="flex min-h-full w-full flex-col gap-4 px-3 pb-4 sm:px-4"
      data-testid="dynamic-teaching-sequence"
      data-capsule-id={capsuleId}
      data-beat-index={index}
      data-beat-type={beat.type}
      data-guided-phase="PREPARE"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent" data-guided-lesson-title>
          {title}
        </p>
        <span className="text-xs tabular-nums text-ink-faint">
          {index + 1}/{beats.length}
        </span>
      </div>
      <ProgressBar value={index + 1} max={beats.length} label={title} />

      <TeacherSpeechBubble text={teacherLine} onReady={() => setBubbleReady(true)} />

      {(beat.type === "VISUAL_EXAMPLE" ||
        beat.type === "IMAGE_EXAMPLE" ||
        beat.type === "DIAGRAM" ||
        beat.type === "CONTRAST") && <VisualBeat beat={beat} locale={locale} />}

      {(beat.type === "MANDARIN_EXAMPLE" || beat.type === "REVEAL" || beat.type === "AUDIO_EXAMPLE") && (
        <div
          className="mx-auto flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-5 text-center"
          data-testid="mandarin-example"
        >
          {beat.hanzi ? <p className="font-serif text-5xl text-ink">{beat.hanzi}</p> : null}
          {beat.pinyin ? <p className="text-xl text-accent">{beat.pinyin}</p> : null}
          {(beat.meaningPt || beat.meaningEn) && (
            <p className="text-sm text-ink-soft">{en ? beat.meaningEn : beat.meaningPt}</p>
          )}
          {beat.audioText ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-1 min-h-12"
              data-testid="dynamic-aula-listen"
              data-cta-hierarchy="secondary"
              onClick={playAudio}
            >
              {en ? "Listen" : "Ouvir"}
            </Button>
          ) : null}
        </div>
      )}

      {beat.type === "HANDOFF" ? (
        <p className="text-center text-sm font-semibold text-accent" data-testid="dynamic-handoff">
          {en ? "Now let's practice this." : "Agora vamos testar isso."}
        </p>
      ) : null}

      <GuidedDock>
        <Button
          type="button"
          className="min-h-12 w-full"
          data-testid="dynamic-aula-continue"
          data-cta-hierarchy="primary"
          onClick={() => {
            if (beat.type === "AUDIO_EXAMPLE" && beat.audioText) playAudio();
            advance();
          }}
        >
          {primaryLabel}
        </Button>
      </GuidedDock>
    </div>
  );
}

/** True when a capsule has a DYNAMIC_PASS presentation. */
export function hasDynamicPresentation(capsuleId: string): boolean {
  return Boolean(presentationForCapsule(capsuleId));
}
