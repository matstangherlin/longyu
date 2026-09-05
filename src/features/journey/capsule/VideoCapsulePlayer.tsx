import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/primitives";
import { IconCheck, IconPlay, IconRefresh, IconSound } from "../../../components/ui/Icon";
import type { InstructionLocale } from "../../../i18n/config";
import {
  MEDIA_COMPLETION_THRESHOLD,
  isMediaWatched,
  mergeWatchedRanges,
  readMediaProgress,
  verifyMediaUrl,
  watchedCoverage,
  writeMediaProgress,
  type LessonMediaAsset,
  type WatchedRange,
} from "../../../data/lessonMediaAssets";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
/** `timeupdate` dispara ~4×/s; persistir a cada evento castigaria o storage. */
const PERSIST_INTERVAL_MS = 4000;

export type VideoCapsuleOutcome = "COMPLETED" | "FALLBACK_REQUESTED";

/**
 * V4.9.2B — Partes F, H, I, J, L, M, O e P.
 *
 * Um vídeo de aula não é um `<video controls>`. Precisa registrar o que foi
 * de fato reproduzido (senão arrastar a barra "conclui" a aula), retomar de
 * onde parou sem autoplay, oferecer legenda e transcrição para quem não ouve,
 * e — o ponto que mais importa — nunca virar beco sem saída: se o arquivo
 * falha, o aluno segue pela versão interativa em vez de encarar um spinner.
 */
export function VideoCapsulePlayer({
  asset,
  capsuleId,
  locale,
  onOutcome,
}: {
  asset: LessonMediaAsset;
  capsuleId: string;
  locale: InstructionLocale;
  onOutcome: (outcome: VideoCapsuleOutcome) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const en = locale === "en";

  const stored = useMemo(
    () => readMediaProgress(capsuleId, asset.id, asset.version, locale),
    [capsuleId, asset.id, asset.version, locale]
  );

  const rangesRef = useRef<WatchedRange[]>(stored?.watchedRanges ?? []);
  const segmentStartRef = useRef<number | null>(null);
  const lastPersistRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(asset.durationSeconds);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [coverage, setCoverage] = useState(() =>
    watchedCoverage(stored?.watchedRanges ?? [], asset.durationSeconds)
  );
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  // A retomada é oferta, nunca automática: reabrir uma aula e ouvir voz de
  // repente é intrusivo, e o aluno pode querer justamente rever do começo.
  const [resumeOffer, setResumeOffer] = useState(
    stored && stored.maxPositionSeconds > 3 && !stored.completed ? stored.maxPositionSeconds : null
  );

  // Uma URL insegura nunca chega ao `src`: recusada antes de montar o elemento.
  const urlVerdict = useMemo(() => verifyMediaUrl(asset.url), [asset.url]);
  const unusable = !urlVerdict.safe || asset.delivery === "HLS";

  const persist = useCallback(
    (time: number, force = false) => {
      const now = Date.now();
      if (!force && now - lastPersistRef.current < PERSIST_INTERVAL_MS) return;
      lastPersistRef.current = now;
      const ranges = mergeWatchedRanges(rangesRef.current);
      rangesRef.current = ranges;
      writeMediaProgress({
        capsuleId,
        mediaAssetId: asset.id,
        mediaVersion: asset.version,
        instructionLocale: locale,
        currentTimeSeconds: time,
        durationSeconds: duration || asset.durationSeconds,
        watchedRanges: ranges,
        maxPositionSeconds: Math.max(...ranges.map((range) => range.end), 0),
        completed: isMediaWatched(ranges, duration || asset.durationSeconds),
        updatedAt: now,
      });
      setCoverage(watchedCoverage(ranges, duration || asset.durationSeconds));
    },
    [asset.id, asset.version, asset.durationSeconds, capsuleId, duration, locale]
  );

  /** Fecha o trecho em curso. O que não passou pelo `timeupdate` não conta. */
  const closeSegment = useCallback(
    (end: number) => {
      const start = segmentStartRef.current;
      segmentStartRef.current = null;
      if (start == null || end <= start) return;
      rangesRef.current = mergeWatchedRanges([...rangesRef.current, { start, end }]);
    },
    []
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Legendas viram uma faixa WebVTT construída em memória. Nada de HTML: o
  // texto do cue é escapado pelo próprio formato, e `dangerouslySetInnerHTML`
  // não aparece em lugar nenhum deste componente.
  const captionUrl = useMemo(() => {
    if (!asset.captions?.length || typeof URL === "undefined" || typeof Blob === "undefined") return null;
    const stamp = (seconds: number) => {
      const whole = Math.max(0, Math.floor(seconds));
      const ms = Math.floor((Math.max(0, seconds) - whole) * 1000);
      const hh = String(Math.floor(whole / 3600)).padStart(2, "0");
      const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
      const ss = String(whole % 60).padStart(2, "0");
      return `${hh}:${mm}:${ss}.${String(ms).padStart(3, "0")}`;
    };
    const body = asset.captions
      .map((cue, index) => `${index + 1}\n${stamp(cue.startSeconds)} --> ${stamp(cue.endSeconds)}\n${cue.text}`)
      .join("\n\n");
    return URL.createObjectURL(new Blob([`WEBVTT\n\n${body}\n`], { type: "text/vtt" }));
  }, [asset.captions]);

  useEffect(() => () => {
    if (captionUrl) URL.revokeObjectURL(captionUrl);
  }, [captionUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    for (const track of Array.from(video.textTracks)) {
      track.mode = captionsOn ? "showing" : "disabled";
    }
  }, [captionsOn, captionUrl]);

  const completed = coverage >= MEDIA_COMPLETION_THRESHOLD;

  // ── Estados terminais que não podem virar spinner ───────────────────────
  if (unusable || failed || offline) {
    const reason = offline
      ? en
        ? "You are offline, so the video cannot load."
        : "Você está sem conexão, então o vídeo não carrega."
      : en
        ? "We could not load this lesson."
        : "Não foi possível carregar esta aula.";
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-6 text-center" data-testid="capsule-media-error">
        <p className="text-sm font-semibold text-ink">{reason}</p>
        <p className="mt-2 text-xs leading-5 text-ink-soft">
          {en
            ? "The interactive version teaches the same content — nothing is lost by continuing there."
            : "A versão interativa ensina o mesmo conteúdo — nada se perde seguindo por ela."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!offline && !unusable && (
            <Button
              variant="outline"
              onClick={() => {
                setFailed(false);
                videoRef.current?.load();
              }}
              data-testid="capsule-media-retry"
            >
              <IconRefresh width={17} height={17} />
              {en ? "Reload" : "Recarregar"}
            </Button>
          )}
          <Button onClick={() => onOutcome("FALLBACK_REQUESTED")} data-testid="capsule-media-fallback">
            {en ? "Use the interactive version" : "Usar versão interativa"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="capsule-video-player" data-coverage={coverage.toFixed(3)} data-completed={String(completed)}>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <video
          ref={videoRef}
          className="block w-full"
          src={asset.url}
          poster={asset.poster}
          preload="metadata"
          playsInline
          controls={false}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || asset.durationSeconds)}
          onPlay={(event) => {
            segmentStartRef.current = event.currentTarget.currentTime;
            setPlaying(true);
          }}
          onPause={(event) => {
            closeSegment(event.currentTarget.currentTime);
            persist(event.currentTarget.currentTime, true);
            setPlaying(false);
          }}
          onTimeUpdate={(event) => {
            const time = event.currentTarget.currentTime;
            setCurrentTime(time);
            if (segmentStartRef.current == null) segmentStartRef.current = time;
            persist(time);
          }}
          onSeeking={(event) => {
            // O trecho anterior é fechado antes do salto. O intervalo pulado
            // nunca entra em `watchedRanges`, então arrastar a barra não
            // fabrica cobertura — é a regra central da Parte M.
            closeSegment(Math.min(event.currentTarget.currentTime, currentTime));
            segmentStartRef.current = event.currentTarget.currentTime;
          }}
          onEnded={(event) => {
            closeSegment(event.currentTarget.currentTime);
            persist(event.currentTarget.currentTime, true);
            setPlaying(false);
          }}
          onError={() => setFailed(true)}
        >
          {captionUrl && (
            <track
              kind="captions"
              src={captionUrl}
              srcLang={locale === "pt-BR" ? "pt" : "en"}
              label={en ? "Captions" : "Legendas"}
              default
            />
          )}
        </video>

        {resumeOffer != null && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center"
            data-testid="capsule-media-resume"
          >
            <p className="text-sm font-semibold text-white">
              {en ? "You stopped at" : "Você parou em"} {formatTime(resumeOffer)}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  const video = videoRef.current;
                  if (video) video.currentTime = resumeOffer;
                  setResumeOffer(null);
                }}
                data-testid="capsule-media-resume-continue"
              >
                {en ? `Continue from ${formatTime(resumeOffer)}` : `Continuar de ${formatTime(resumeOffer)}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const video = videoRef.current;
                  if (video) video.currentTime = 0;
                  setResumeOffer(null);
                }}
                data-testid="capsule-media-resume-restart"
              >
                {en ? "Start from the beginning" : "Começar do início"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Controles ─────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) void video.play().catch(() => setFailed(true));
            else video.pause();
          }}
          data-testid="capsule-media-toggle"
        >
          {playing ? (en ? "Pause" : "Pausar") : <><IconPlay width={16} height={16} /> {en ? "Play" : "Reproduzir"}</>}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.currentTime = 0;
            closeSegment(currentTime);
          }}
          data-testid="capsule-media-restart"
        >
          <IconRefresh width={15} height={15} />
          {en ? "Restart" : "Recomeçar"}
        </Button>

        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={0.1}
          value={currentTime}
          aria-label={en ? "Seek" : "Avançar"}
          data-testid="capsule-media-seek"
          onChange={(event) => {
            const video = videoRef.current;
            if (video) video.currentTime = Number(event.target.value);
          }}
          className="h-1.5 min-w-[8rem] flex-1 cursor-pointer accent-accent"
        />
        <span className="text-xs font-semibold tabular-nums text-ink-soft">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
            setMuted(video.muted);
          }}
          data-testid="capsule-media-mute"
          aria-pressed={muted}
        >
          <IconSound width={15} height={15} />
          {muted ? (en ? "Unmute" : "Ativar som") : en ? "Mute" : "Silenciar"}
        </Button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-label={en ? "Volume" : "Volume"}
          data-testid="capsule-media-volume"
          onChange={(event) => {
            const next = Number(event.target.value);
            setVolume(next);
            const video = videoRef.current;
            if (video) video.volume = next;
          }}
          className="h-1.5 w-24 cursor-pointer accent-accent"
        />

        <div className="flex items-center gap-1" role="group" aria-label={en ? "Playback speed" : "Velocidade"}>
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              data-testid={`capsule-media-speed-${value}`}
              aria-pressed={speed === value}
              onClick={() => {
                setSpeed(value);
                const video = videoRef.current;
                if (video) video.playbackRate = value;
              }}
              className={[
                "min-h-9 rounded-lg border px-2 text-xs font-semibold transition",
                speed === value ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink-soft",
              ].join(" ")}
            >
              {value}×
            </button>
          ))}
        </div>

        {captionUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCaptionsOn((value) => !value)}
            aria-pressed={captionsOn}
            data-testid="capsule-media-captions"
          >
            {en ? (captionsOn ? "Captions on" : "Captions off") : captionsOn ? "Legendas on" : "Legendas off"}
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
            else void video.requestFullscreen?.().catch(() => undefined);
          }}
          data-testid="capsule-media-fullscreen"
        >
          {en ? "Fullscreen" : "Tela cheia"}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
        <span data-testid="capsule-media-coverage" className="tabular-nums">
          {en ? "Watched" : "Assistido"}: {Math.round(coverage * 100)}%
        </span>
        {completed && (
          <span className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--good))]">
            <IconCheck width={14} height={14} />
            {en ? "Lesson watched" : "Aula assistida"}
          </span>
        )}
      </div>

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!completed}
        onClick={() => {
          persist(currentTime, true);
          onOutcome("COMPLETED");
        }}
        data-testid="capsule-media-finish"
      >
        {completed
          ? en
            ? "Start the exercises"
            : "Iniciar exercícios"
          : en
            ? `Watch ${Math.round(MEDIA_COMPLETION_THRESHOLD * 100)}% to continue`
            : `Assista ${Math.round(MEDIA_COMPLETION_THRESHOLD * 100)}% para continuar`}
      </Button>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
