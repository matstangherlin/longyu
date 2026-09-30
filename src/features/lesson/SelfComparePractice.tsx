import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/primitives";
import { IconChevron, IconSound } from "../../components/ui/Icon";
import { playMandarinAudio } from "../../lib/audioPlayback";
import { useStore } from "../../lib/store";
import { t } from "../../i18n/catalog";
import {
  nativeDeletePracticeRecording,
  nativePlayPracticeRecording,
  nativeRecognitionStatus,
  nativeStartPracticeRecording,
  nativeStopPracticePlayback,
  nativeStopPracticeRecording,
  hasNativeSpeech,
  onPracticeRecordingState,
} from "../../lib/platform/nativeSpeech";
import { ensureMicPermission } from "../../lib/speech";
import { GuidedDock, useGuidedPresentation } from "./GuidedLessonShell";
import { updateSpeechDiagnostics } from "../../lib/speechDiagnostics";
import { classifySpeechFailure, type SpeechFailureCategory } from "../../lib/speechFailure";
import { claimAudio, releaseAudio } from "../../lib/audioArbiter";
import { recordTechEvent } from "../../lib/techEvents";
import { selfPlaybackMessageKey, type SelfPlaybackErrorCode } from "../../lib/selfPlayback";

/**
 * RC2.2.17 · Y–AF — modo autoavaliação (self-compare) quando o aparelho não
 * reconhece mandarim.
 *
 *   modelo 🔊 → [Gravar minha voz] → [Ouvir modelo] [Ouvir minha voz]
 *   "Compare ritmo e clareza." → [Gravar novamente] [Continuar]
 *
 * Verdade de produto:
 *   - não existe nota: nada de tom correto, acurácia ou "perfeito". Não há
 *     medição de pitch (ToneProductionEvidence = NO_PITCH_MEASUREMENT).
 *   - A gravação é TEMPORÁRIA e LOCAL: Android grava no cache do app pelo
 *     plugin (apagada ao sair, ao gravar de novo e no background real); na Web
 *     fica num Blob em memória, revogado ao sair. Nunca vai para Supabase,
 *     nuvem ou coleta de dados.
 *   - Tentativa de fala só conta com gravação REAL concluída. Tocar
 *     "Continuar" sozinho não é tentativa.
 *
 * RC2.2.21 (P1 SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID):
 *   - o microfone é pedido AQUI, com a explicação antes do prompt do sistema
 *     (antes, o caminho de gravação nunca pedia a permissão);
 *   - "Ouvir minha voz" → "Reproduzindo… ■" (toque para parar) → "Ouvir
 *     novamente". "Reproduzindo" só aparece quando o player CONFIRMA que está
 *     tocando (evento PLAYING do Android / `onplaying` na Web), nunca no toque;
 *   - cada falha tem mensagem própria (volume de mídia zerado ≠ falha de
 *     gravação); o código estável fica no diagnóstico de QA.
 */

// RC2.2.20 — estados que o aluno entende: Preparando… → Gravando… → Ouvir minha
// voz / Gravar novamente. "preparing" cobre o tempo entre o toque e o
// microfone abrir de verdade (no Android pode levar um instante).
type Phase = "idle" | "preparing" | "recording" | "recorded" | "failed";
/** RC2.2.21 — reprodução da própria voz, separada da gravação. */
type PlayState = "idle" | "preparing" | "playing" | "played" | "failed";

const MIN_RECORDING_MS = 400;

export function selfCompareRecordingAvailable(): boolean {
  if (hasNativeSpeech()) return true;
  if (typeof window === "undefined") return false;
  return Boolean(window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined");
}

export function SelfComparePractice({
  target,
  onContinue,
  onCannotSpeak,
  reason,
}: {
  /** Frase-modelo em hànzì (o que o aluno deve dizer). */
  target: string;
  onContinue: () => void;
  onCannotSpeak: () => void;
  /** Por que estamos aqui (texto curto e honesto, já traduzido). */
  reason?: string | null;
}) {
  const recordSpeechAttempt = useStore((s) => s.recordSpeechAttempt);
  const guided = useGuidedPresentation();
  const native = hasNativeSpeech();
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState<SpeechFailureCategory | null>(null);
  /** Gravação curta demais: volta ao início COM aviso (nunca em silêncio). */
  const [tooShort, setTooShort] = useState(false);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [playError, setPlayError] = useState<SelfPlaybackErrorCode | null>(null);
  /** Android: microfone ainda não autorizado → explicação antes do prompt. */
  const [micKnownGranted, setMicKnownGranted] = useState<boolean | null>(native ? null : true);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webUrlRef = useRef<string | null>(null);
  const playTokenRef = useRef<number | null>(null);
  webUrlRef.current = webUrl;

  useEffect(() => {
    if (!native) return;
    let alive = true;
    void nativeRecognitionStatus().then((status) => {
      if (alive) setMicKnownGranted(status.microphone === "granted");
    });
    return () => {
      alive = false;
    };
  }, [native]);

  // O Android conta o estado real da reprodução (PLAYING depois de isPlaying).
  useEffect(() => {
    if (!native) return undefined;
    return onPracticeRecordingState((event) => {
      if (event.state === "PLAY_PREPARING" && event.playbackPrepared) {
        updateSpeechDiagnostics({ playbackReady: "yes" });
        recordTechEvent("playback_prepared");
      }
      if (event.state === "PLAYING") {
        setPlayState("playing");
        updateSpeechDiagnostics({
          playbackStarted: "yes",
          outputRoute: event.outputRoute ?? "UNKNOWN",
          mediaVolume: event.mediaVolumeCurrent != null && event.mediaVolumeMax != null ? `${event.mediaVolumeCurrent}/${event.mediaVolumeMax}` : null,
        });
        recordTechEvent("playback_started", { route: event.outputRoute ?? "UNKNOWN" });
      }
      if (event.state === "FAILED" && event.code === "RECORDING_INTERRUPTED") {
        // Pausa no meio da captura (painel/sobreposição): recomeçar é seguro.
        setPhase("idle");
        recordTechEvent("recording_failed", { code: event.code });
      }
    });
  }, [native]);

  // AB — sair da atividade apaga a gravação (e para qualquer reprodução).
  useEffect(
    () => () => {
      if (native) void nativeDeletePracticeRecording();
      try {
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
      if (webUrlRef.current) URL.revokeObjectURL(webUrlRef.current);
      if (playTokenRef.current != null) releaseAudio("SELF_PLAYBACK", playTokenRef.current);
    },
    [native]
  );

  function countAttempt() {
    // AF — só depois de gravação real concluída.
    recordSpeechAttempt({ id: `self-compare:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`, captured: true });
  }

  function fail(code: string) {
    const category = classifySpeechFailure(code);
    updateSpeechDiagnostics({ lastErrorCode: code, failureCategory: category });
    recordTechEvent("recording_failed", { code, category });
    setFailure(category);
    setPhase("failed");
  }

  async function startRecording() {
    if (webUrl) {
      URL.revokeObjectURL(webUrl);
      setWebUrl(null);
    }
    setTooShort(false);
    setFailure(null);
    setPlayState("idle");
    setPlayError(null);
    setPhase("preparing");
    updateSpeechDiagnostics({
      recordingEngine: native ? "native" : "web",
      recordingStarted: "unknown",
      recordingDuration: null,
      temporaryFileCreated: "unknown",
      fileBytes: null,
      captureSignal: "unknown",
      playbackReady: "unknown",
      playbackStarted: "unknown",
      playbackPlayed: "unknown",
      failureCategory: null,
    });
    // Microfone, voz modelo e reprodução nunca juntos: gravar vence.
    claimAudio("RECORDING", () => void stopRecording());
    if (native) {
      // RC2.2.21 — o caminho de gravação passa a pedir o microfone (em contexto).
      const permission = await ensureMicPermission();
      setMicKnownGranted(permission === "granted");
      updateSpeechDiagnostics({ microphonePermission: permission });
      if (permission !== "granted") {
        releaseAudio("RECORDING");
        updateSpeechDiagnostics({ recordingStarted: "no" });
        fail("PERMISSION_DENIED");
        return;
      }
      const result = await nativeStartPracticeRecording();
      if (!result.ok) {
        releaseAudio("RECORDING");
        updateSpeechDiagnostics({ recordingStarted: "no" });
        fail(result.code);
        return;
      }
      updateSpeechDiagnostics({ recordingStarted: "yes" });
      recordTechEvent("recording_started", { engine: "native" });
      startedAtRef.current = Date.now();
      setPhase("recording");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        releaseAudio("RECORDING");
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const duration = Date.now() - startedAtRef.current;
        updateSpeechDiagnostics({
          recordingDuration: duration,
          temporaryFileCreated: blob.size > 0 ? "yes" : "no",
          fileBytes: blob.size,
          playbackReady: blob.size > 0 && duration >= MIN_RECORDING_MS ? "yes" : "no",
        });
        recordTechEvent("recording_stopped", { engine: "web", durationMs: duration, bytes: blob.size });
        if (blob.size > 0 && duration >= MIN_RECORDING_MS) {
          setWebUrl(URL.createObjectURL(blob));
          setPhase("recorded");
          recordTechEvent("recording_file_ready", { engine: "web" });
          countAttempt();
        } else if (blob.size === 0) {
          fail("EMPTY_RECORDING");
        } else {
          setTooShort(true);
          setPhase("idle");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      updateSpeechDiagnostics({ recordingStarted: "yes" });
      recordTechEvent("recording_started", { engine: "web" });
      setPhase("recording");
    } catch (error) {
      releaseAudio("RECORDING");
      updateSpeechDiagnostics({ recordingStarted: "no" });
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      fail(denied ? "PERMISSION_DENIED" : "WEB_RECORDING_FAILED");
    }
  }

  async function stopRecording() {
    if (native) {
      const result = await nativeStopPracticeRecording();
      releaseAudio("RECORDING");
      if (result.ok) {
        updateSpeechDiagnostics({
          recordingDuration: result.durationMs ?? 0,
          temporaryFileCreated: result.fileExists && (result.fileBytes ?? 0) > 0 ? "yes" : result.fileExists === false ? "no" : "unknown",
          fileBytes: typeof result.fileBytes === "number" ? result.fileBytes : null,
          metadataDuration: typeof result.metadataDurationMs === "number" ? result.metadataDurationMs : null,
          captureSignal: result.signalDetected == null ? "unknown" : result.signalDetected ? "yes" : "no",
          playbackReady: result.fileExists && (result.durationMs ?? 0) >= MIN_RECORDING_MS ? "yes" : "no",
        });
        recordTechEvent("recording_stopped", {
          engine: "native",
          durationMs: result.durationMs ?? 0,
          bytes: result.fileBytes ?? 0,
          signal: result.signalDetected ?? null,
        });
      } else {
        updateSpeechDiagnostics({ playbackReady: "no" });
      }
      if (!result.ok) {
        if (result.code === "RECORDING_TOO_SHORT") {
          setTooShort(true);
          setPhase("idle");
          recordTechEvent("recording_failed", { code: result.code });
        } else {
          fail(result.code);
        }
      } else if (result.fileExists === false || result.fileBytes === 0) {
        fail("EMPTY_RECORDING");
      } else if ((result.durationMs ?? 0) >= MIN_RECORDING_MS) {
        setPhase("recorded");
        recordTechEvent("recording_file_ready", { engine: "native" });
        countAttempt();
      } else {
        setTooShort(true);
        setPhase("idle");
      }
      return;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      releaseAudio("RECORDING");
      setPhase("failed");
    }
  }

  function playModel() {
    // A voz modelo interrompe a própria gravação tocando (último pedido vence).
    if (playState === "playing" || playState === "preparing") stopMine();
    void playMandarinAudio(target);
  }

  function stopMine() {
    if (native) void nativeStopPracticePlayback();
    else {
      audioRef.current?.pause();
      audioRef.current = null;
    }
    if (playTokenRef.current != null) releaseAudio("SELF_PLAYBACK", playTokenRef.current);
    playTokenRef.current = null;
    setPlayState((state) => (state === "played" ? state : "idle"));
  }

  function playMine() {
    if (playState === "preparing" || playState === "playing") {
      stopMine();
      return;
    }
    setPlayError(null);
    setPlayState("preparing");
    recordTechEvent("playback_requested", { engine: native ? "native" : "web" });
    playTokenRef.current = claimAudio("SELF_PLAYBACK", () => stopMine());
    if (native) {
      // O plugin só resolve DEPOIS de tocar até o fim (ou de "Parar"): a prova
      // de reprodução é PLAYING (evento) + fim depois de PLAYING.
      void nativePlayPracticeRecording().then((result) => {
        if (playTokenRef.current != null) releaseAudio("SELF_PLAYBACK", playTokenRef.current);
        playTokenRef.current = null;
        if (result.ok && result.stopped) {
          setPlayState("idle");
          return;
        }
        if (result.ok && result.played && result.playbackStarted) {
          setPlayState("played");
          updateSpeechDiagnostics({ playbackStarted: "yes", playbackPlayed: "yes" });
          recordTechEvent("playback_completed");
          return;
        }
        const code = (result.ok ? "PLAYBACK_START_FAILED" : result.code) as SelfPlaybackErrorCode;
        setPlayState("failed");
        setPlayError(code);
        updateSpeechDiagnostics({ playbackStarted: code === "MEDIA_VOLUME_ZERO" ? "unknown" : "no", playbackPlayed: "no", lastErrorCode: code, outputRoute: result.ok ? undefined : result.outputRoute ?? undefined });
        recordTechEvent("playback_failed", { code });
      });
      return;
    }
    if (!webUrl) {
      setPlayState("failed");
      setPlayError("NO_RECORDING");
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(webUrl);
    audioRef.current = audio;
    audio.onplaying = () => {
      setPlayState("playing");
      updateSpeechDiagnostics({ playbackStarted: "yes" });
      recordTechEvent("playback_started", { engine: "web" });
    };
    audio.onended = () => {
      if (playTokenRef.current != null) releaseAudio("SELF_PLAYBACK", playTokenRef.current);
      playTokenRef.current = null;
      setPlayState("played");
      updateSpeechDiagnostics({ playbackPlayed: "yes" });
      recordTechEvent("playback_completed", { engine: "web" });
    };
    audio.onerror = () => {
      setPlayState("failed");
      setPlayError("PLAYBACK_ERROR");
      updateSpeechDiagnostics({ playbackStarted: "no", playbackPlayed: "no", lastErrorCode: "WEB_PLAYBACK_FAILED" });
    };
    void audio.play().catch(() => {
      setPlayState("failed");
      setPlayError("PLAYBACK_START_FAILED");
      updateSpeechDiagnostics({ playbackStarted: "no", playbackPlayed: "no", lastErrorCode: "WEB_PLAYBACK_BLOCKED" });
    });
  }

  const busyRecording = phase === "preparing" || phase === "recording";
  const mineLabel =
    playState === "preparing"
      ? t("player.selfComparePreparingPlayback")
      : playState === "playing"
        ? t("player.selfComparePlayingMine")
        : playState === "played"
          ? t("player.selfCompareListenAgain")
          : t("player.selfCompareListenMine");

  return (
    <div
      className={guided ? "mt-5" : "mt-5 rounded-2xl border border-line bg-surface p-4"}
      data-testid="self-compare"
      data-self-compare-phase={phase}
      data-self-playback={playState}
    >
      <p className="text-sm font-semibold text-ink">{t("player.selfCompareTitle")}</p>
      {reason && <p className="mt-1 text-xs leading-5 text-ink-soft" data-testid="self-compare-reason">{reason}</p>}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="hanzi text-3xl text-ink">{target}</span>
        <Button size="icon" variant="soft" onClick={playModel} disabled={busyRecording} aria-label={t("player.selfCompareListenModel")} className="min-h-11 min-w-11">
          <IconSound width={20} height={20} />
        </Button>
      </div>

      {phase === "idle" && micKnownGranted === false && (
        <p className="mt-3 text-center text-sm text-ink-soft" data-testid="self-compare-mic-explain">
          {t("player.micPrePermission")}
        </p>
      )}
      {phase === "recording" && (
        <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-wrong" role="status" data-testid="self-compare-recording-label">
          <span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-wrong" />
          {t("player.selfCompareRecording")}
        </p>
      )}
      {tooShort && phase === "idle" && (
        <p className="mt-3 text-center text-sm text-ink-soft" role="status" data-testid="self-compare-too-short">
          {t("player.selfCompareTooShort")}
        </p>
      )}
      {(phase === "idle" || phase === "preparing" || phase === "recording") && (
        <GuidedDock>
          {phase === "idle" ? (
            <Button className={guided ? "w-full" : "mt-4 w-full"} size="lg" onClick={() => void startRecording()} data-testid="self-compare-record">
              {t("player.selfCompareRecord")}
            </Button>
          ) : phase === "preparing" ? (
            <Button className={guided ? "w-full" : "mt-4 w-full"} size="lg" disabled data-testid="self-compare-preparing">
              {t("player.selfComparePreparing")}
            </Button>
          ) : (
            <Button className={guided ? "w-full animate-pulse" : "mt-4 w-full animate-pulse"} size="lg" variant="danger" onClick={() => void stopRecording()} data-testid="self-compare-stop">
              {t("player.selfCompareStop")}
            </Button>
          )}
          {guided && phase === "idle" && (
            <button type="button" onClick={onCannotSpeak} className="min-h-11 w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink">
              {t("player.cannotSpeakNow")}
            </button>
          )}
        </GuidedDock>
      )}
      {phase === "recorded" && (
        <div className="mt-4 grid gap-2" data-testid="self-compare-recorded">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={playModel} className="min-h-11">{t("player.selfCompareListenModel")}</Button>
            <Button
              variant={playState === "playing" ? "soft" : "outline"}
              onClick={playMine}
              className="min-h-11"
              aria-pressed={playState === "playing"}
              data-testid="self-compare-play-mine"
            >
              {mineLabel}
              {playState === "playing" ? <span aria-hidden className="ml-1.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-current" /> : null}
            </Button>
          </div>
          {playError && (
            <p className="text-center text-sm font-medium text-ink" role="status" data-testid="self-compare-playback-error" data-playback-code={playError}>
              {t(selfPlaybackMessageKey(playError))}
            </p>
          )}
          <p className="text-center text-sm text-ink-soft">{t("player.selfCompareHint")}</p>
          <GuidedDock>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void startRecording()}>{t("player.selfCompareRepeat")}</Button>
              <Button onClick={onContinue} data-testid="self-compare-continue">
                {t("player.continue")} <IconChevron width={18} height={18} />
              </Button>
            </div>
          </GuidedDock>
        </div>
      )}
      {phase === "failed" && (
        <div className="mt-3 space-y-2" data-testid="self-compare-failed" data-failure-category={failure ?? "UNKNOWN"}>
          <p className="text-sm text-ink-soft" role="status">
            {failure === "PERMISSION_DENIED" ? t("player.selfComparePermissionDenied") : t("player.selfCompareFailed")}
          </p>
          {failure !== "PERMISSION_DENIED" && (
            <Button variant="outline" className="w-full" onClick={() => void startRecording()} data-testid="self-compare-retry">
              {t("player.selfCompareRepeat")}
            </Button>
          )}
        </div>
      )}

      <p className="mt-3 text-center text-[11px] leading-4 text-ink-faint" data-testid="self-compare-privacy">
        {t("player.selfComparePrivacy")}
      </p>
      {phase !== "recorded" && !(guided && phase === "idle") && (
        <button type="button" onClick={onCannotSpeak} className="mt-2 min-h-11 w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink">
          {t("player.cannotSpeakNow")}
        </button>
      )}
    </div>
  );
}
