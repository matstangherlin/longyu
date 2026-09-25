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

type Phase = "idle" | "recording" | "recorded" | "failed";

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
  const native = hasNativeSpeech();
  const [phase, setPhase] = useState<Phase>("idle");
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

  async function startRecording() {
    if (webUrl) {
      URL.revokeObjectURL(webUrl);
      setWebUrl(null);
    }
    if (native) {
      const result = await nativeStartPracticeRecording();
      if (!result.ok) {
        setPhase("failed");
        return;
      }
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
        if (blob.size > 0 && Date.now() - startedAtRef.current >= MIN_RECORDING_MS) {
          setWebUrl(URL.createObjectURL(blob));
          setPhase("recorded");
          countAttempt();
        } else {
          setPhase("idle");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setPhase("recording");
    } catch {
      setPhase("failed");
    }
  }

  async function stopRecording() {
    if (native) {
      const result = await nativeStopPracticeRecording();
      if (result.ok && (result.durationMs ?? 0) >= MIN_RECORDING_MS) {
        setPhase("recorded");
        countAttempt();
      } else {
        setPhase(result.ok ? "idle" : "failed");
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
    if (native) {
      void nativePlayPracticeRecording();
      return;
    }
    if (!webUrl) return;
    audioRef.current?.pause();
    const audio = new Audio(webUrl);
    audioRef.current = audio;
    void audio.play().catch(() => undefined);
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-4" data-testid="self-compare" data-self-compare-phase={phase}>
      <p className="text-sm font-semibold text-ink">{t("player.selfCompareTitle")}</p>
      {reason && <p className="mt-1 text-xs leading-5 text-ink-soft" data-testid="self-compare-reason">{reason}</p>}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="hanzi text-3xl text-ink">{target}</span>
        <Button size="icon" variant="soft" onClick={playModel} aria-label={t("player.selfCompareListenModel")}>
          <IconSound width={20} height={20} />
        </Button>
      </div>

      {phase === "idle" && (
        <Button className="mt-4 w-full" size="lg" onClick={() => void startRecording()} data-testid="self-compare-record">
          {t("player.selfCompareRecord")}
        </Button>
      )}
      {phase === "recording" && (
        <Button className="mt-4 w-full animate-pulse" size="lg" variant="danger" onClick={() => void stopRecording()} data-testid="self-compare-stop">
          {t("player.selfCompareStop")}
        </Button>
      )}
      {phase === "recorded" && (
        <div className="mt-4 grid gap-2" data-testid="self-compare-recorded">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={playModel}>{t("player.selfCompareListenModel")}</Button>
            <Button variant="outline" onClick={playMine} data-testid="self-compare-play-mine">{t("player.selfCompareListenMine")}</Button>
          </div>
          <p className="text-center text-sm text-ink-soft">{t("player.selfCompareHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void startRecording()}>{t("player.selfCompareRepeat")}</Button>
            <Button onClick={onContinue} data-testid="self-compare-continue">
              {t("player.continue")} <IconChevron width={18} height={18} />
            </Button>
          </div>
        </div>
      )}
      {phase === "failed" && (
        <p className="mt-3 text-sm text-ink-soft" role="status" data-testid="self-compare-failed">
          {t("player.selfCompareFailed")}
        </p>
      )}

      <p className="mt-3 text-center text-[11px] leading-4 text-ink-faint" data-testid="self-compare-privacy">
        {t("player.selfComparePrivacy")}
      </p>
      {phase !== "recorded" && (
        <button type="button" onClick={onCannotSpeak} className="mt-2 w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink">
          {t("player.cannotSpeakNow")}
        </button>
      )}
    </div>
  );
}
