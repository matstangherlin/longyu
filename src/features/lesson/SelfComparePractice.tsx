import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/primitives";
import { IconChevron, IconSound } from "../../components/ui/Icon";
import { playMandarinAudio } from "../../lib/audioPlayback";
import { useStore } from "../../lib/store";
import { t } from "../../i18n/catalog";
import {
  nativeDeletePracticeRecording,
  nativePlayPracticeRecording,
  nativeStartPracticeRecording,
  nativeStopPracticeRecording,
  hasNativeSpeech,
} from "../../lib/platform/nativeSpeech";
import { GuidedDock, useGuidedPresentation } from "./GuidedLessonShell";
import { updateSpeechDiagnostics } from "../../lib/speechDiagnostics";
import { classifySpeechFailure, type SpeechFailureCategory } from "../../lib/speechFailure";

/**
 * RC2.2.17 · Y–AF — modo autoavaliação (self-compare) quando o aparelho não
 * reconhece mandarim.
 *
 *   modelo 🔊 → [Gravar minha voz] → [Ouvir modelo] [Ouvir minha voz]
 *   "Compare ritmo e clareza." → [Repetir] [Continuar]
 *
 * Verdade de produto:
 *   - não existe nota: nada de tom correto, acurácia ou "perfeito". Não há
 *     medição de pitch (ToneProductionEvidence = NO_PITCH_MEASUREMENT).
 *   - A gravação é TEMPORÁRIA e LOCAL: Android grava no cache do app pelo
 *     plugin (apagada ao sair, ao gravar de novo e no background); na Web fica
 *     num Blob em memória, revogado ao sair. Nunca vai para Supabase, nuvem
 *     ou analytics.
 *   - Tentativa de fala só conta com gravação REAL concluída. Tocar
 *     "Continuar" sozinho não é tentativa.
 */

// RC2.2.20 — estados que o aluno entende: Preparando… → Gravando… → Ouvir minha
// voz / Gravar novamente. "preparing" cobre o tempo entre o toque e o
// microfone abrir de verdade (no Android pode levar um instante).
type Phase = "idle" | "preparing" | "recording" | "recorded" | "failed";

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
  const [playingMine, setPlayingMine] = useState(false);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webUrlRef = useRef<string | null>(null);
  webUrlRef.current = webUrl;

  // AB — sair da atividade apaga a gravação.
  useEffect(
    () => () => {
      if (native) void nativeDeletePracticeRecording();
      try {
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (webUrlRef.current) URL.revokeObjectURL(webUrlRef.current);
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
    setPhase("preparing");
    updateSpeechDiagnostics({
      recordingEngine: native ? "native" : "web",
      recordingStarted: "unknown",
      recordingDuration: null,
      temporaryFileCreated: "unknown",
      fileBytes: null,
      playbackReady: "unknown",
      playbackStarted: "unknown",
      playbackPlayed: "unknown",
      failureCategory: null,
    });
    if (native) {
      const result = await nativeStartPracticeRecording();
      if (!result.ok) {
        updateSpeechDiagnostics({ recordingStarted: "no" });
        fail(result.code);
        return;
      }
      updateSpeechDiagnostics({ recordingStarted: "yes" });
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const duration = Date.now() - startedAtRef.current;
        updateSpeechDiagnostics({
          recordingDuration: duration,
          temporaryFileCreated: blob.size > 0 ? "yes" : "no",
          fileBytes: blob.size,
          playbackReady: blob.size > 0 && duration >= MIN_RECORDING_MS ? "yes" : "no",
        });
        if (blob.size > 0 && duration >= MIN_RECORDING_MS) {
          setWebUrl(URL.createObjectURL(blob));
          setPhase("recorded");
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
      setPhase("recording");
    } catch (error) {
      updateSpeechDiagnostics({ recordingStarted: "no" });
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      fail(denied ? "PERMISSION_DENIED" : "WEB_RECORDING_FAILED");
    }
  }

  async function stopRecording() {
    if (native) {
      const result = await nativeStopPracticeRecording();
      updateSpeechDiagnostics(
        result.ok
          ? {
              recordingDuration: result.durationMs ?? 0,
              temporaryFileCreated: result.fileExists && (result.fileBytes ?? 0) > 0 ? "yes" : result.fileExists === false ? "no" : "unknown",
              fileBytes: typeof result.fileBytes === "number" ? result.fileBytes : null,
              playbackReady: result.fileExists && (result.durationMs ?? 0) >= MIN_RECORDING_MS ? "yes" : "no",
            }
          : { playbackReady: "no" }
      );
      if (!result.ok) {
        fail(result.code);
      } else if (result.fileExists === false || result.fileBytes === 0) {
        fail("EMPTY_RECORDING");
      } else if ((result.durationMs ?? 0) >= MIN_RECORDING_MS) {
        setPhase("recorded");
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
      setPhase("failed");
    }
  }

  function playModel() {
    void playMandarinAudio(target);
  }

  function playMine() {
    if (playingMine) return;
    setPlayingMine(true);
    if (native) {
      // O plugin só resolve DEPOIS de tocar até o fim: é a prova de reprodução
      // (começou E terminou). Falha = nem começou.
      void nativePlayPracticeRecording().then((result) => {
        setPlayingMine(false);
        updateSpeechDiagnostics(
          result.ok ? { playbackStarted: "yes", playbackPlayed: "yes" } : { playbackStarted: "no", playbackPlayed: "no", lastErrorCode: result.code }
        );
      });
      return;
    }
    if (!webUrl) {
      setPlayingMine(false);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(webUrl);
    audioRef.current = audio;
    audio.onplaying = () => updateSpeechDiagnostics({ playbackStarted: "yes" });
    audio.onended = () => {
      setPlayingMine(false);
      updateSpeechDiagnostics({ playbackPlayed: "yes" });
    };
    audio.onerror = () => {
      setPlayingMine(false);
      updateSpeechDiagnostics({ playbackStarted: "no", playbackPlayed: "no", lastErrorCode: "WEB_PLAYBACK_FAILED" });
    };
    void audio.play().catch(() => {
      setPlayingMine(false);
      updateSpeechDiagnostics({ playbackStarted: "no", playbackPlayed: "no", lastErrorCode: "WEB_PLAYBACK_BLOCKED" });
    });
  }

  return (
    <div
      className={guided ? "mt-5" : "mt-5 rounded-2xl border border-line bg-surface p-4"}
      data-testid="self-compare"
      data-self-compare-phase={phase}
    >
      <p className="text-sm font-semibold text-ink">{t("player.selfCompareTitle")}</p>
      {reason && <p className="mt-1 text-xs leading-5 text-ink-soft" data-testid="self-compare-reason">{reason}</p>}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="hanzi text-3xl text-ink">{target}</span>
        <Button size="icon" variant="soft" onClick={playModel} aria-label={t("player.selfCompareListenModel")}>
          <IconSound width={20} height={20} />
        </Button>
      </div>

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
            <button type="button" onClick={onCannotSpeak} className="w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink">
              {t("player.cannotSpeakNow")}
            </button>
          )}
        </GuidedDock>
      )}
      {phase === "recorded" && (
        <div className="mt-4 grid gap-2" data-testid="self-compare-recorded">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={playModel}>{t("player.selfCompareListenModel")}</Button>
            <Button variant="outline" onClick={playMine} disabled={playingMine} data-testid="self-compare-play-mine">
              {playingMine ? t("player.selfComparePlayingMine") : t("player.selfCompareListenMine")}
            </Button>
          </div>
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
        <button type="button" onClick={onCannotSpeak} className="mt-2 w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink">
          {t("player.cannotSpeakNow")}
        </button>
      )}
    </div>
  );
}
