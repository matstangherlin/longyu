import { useEffect, useRef, useState } from "react";
import { usesNativeVoice } from "../../lib/tts";
import { nativeTriggerModelDownload, onNativeModelDownload, openNativeAppSettings } from "../../lib/platform/nativeSpeech";
import {
  canOfferModelDownload,
  recognitionErrorForcesFallback,
  speakingModeFor,
  type RecognitionCapability,
} from "../../lib/recognitionCapability";
import { SelfComparePractice, selfCompareRecordingAvailable } from "./SelfComparePractice";
import { GuidedDock } from "./GuidedLessonShell";
import {
  analyzePronunciation,
  cancelRecognition,
  ensureMicPermission,
  isRecognitionAvailable,
  nativeMicPermissionState,
  refreshNativeSpeechStatus,
  isSecureMicContext,
  checkMandarinRecognitionSupport,
  currentRecognitionCapability,
  mandarinRecognitionSupport,
  recognitionDiagnosticsSnapshot,
  recognizeOnce,
  speechErrorMessage,
  type PronunciationAnalysis,
  type RecognizeErrorCode,
  type RecognizeHandle,
} from "../../lib/speech";
import { Button } from "../../components/ui/primitives";
import { IconCheck, IconX, IconChevron } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { t } from "../../i18n/catalog";
import { updateSpeechDiagnostics } from "../../lib/speechDiagnostics";
import { SpeechDiagnosticsPanel } from "./SpeechDiagnosticsPanel";

type Phase = "idle" | "listening" | "result";

function isTouchUi(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 0 || (typeof window !== "undefined" && "ontouchstart" in window);
}

/** Veredito textual — usado no resultado da prática de fala. */
function verdictCopy(heard: string, analysis: PronunciationAnalysis | null, correct: boolean): string {
  if (!heard || !analysis || !analysis.ratio) {
    return t("player.pronUnrecognized");
  }
  if (correct) {
    return analysis.hasExtra ? t("player.pronOkExtra") : t("player.pronOkTone");
  }
  const total = analysis.matchedMask.length;
  return t("player.pronAlmostCount", { matched: analysis.matched.length, total });
}

// Prática de fala: autoriza o mic, reconhece o que foi dito e compara com o alvo.
// Playback (MediaRecorder) só no desktop — no mobile gravar AO MESMO TEMPO
// disputa o mic com o SpeechRecognition e o quebra.
export function PronunciationPractice({
  target,
  onContinue,
}: {
  target: string;
  onContinue: () => void;
}) {
  const secure = isSecureMicContext();
  const supported = isRecognitionAvailable();
  const touchUi = isTouchUi();
  const recordSpeechAttempt = useStore((s) => s.recordSpeechAttempt);

  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [correct, setCorrect] = useState(false);
  const [analysis, setAnalysis] = useState<PronunciationAnalysis | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const handleRef = useRef<RecognizeHandle | null>(null);
  /**
   * Chave DA TENTATIVA em curso (RC1.5, P5).
   *
   * Nasce quando o aluno toca em "Falar" e morre no resultado. É por ela que
   * um re-render, um `onend` duplicado do reconhecedor ou um duplo clique não
   * viram duas frases faladas: a mesma tentativa só conta uma vez.
   */
  const attemptKeyRef = useRef<string | null>(null);

  // RC2.2.13 — Android: estado real do microfone no SO ("Permitir" / "Ajustes").
  const nativeVoice = usesNativeVoice();
  const [micState, setMicState] = useState(() => nativeMicPermissionState());
  /**
   * RC2.2.17 · U–AE — capacidade de reconhecer MANDARIM (≠ permissão). Checada
   * antes da primeira fala (API 33+). Sem mandarim: autoavaliação gravando;
   * a lição nunca fica impossível.
   */
  const [capability, setCapability] = useState<RecognitionCapability>(() => currentRecognitionCapability());
  const [forcedFallback, setForcedFallback] = useState(false);
  const [download, setDownload] = useState<"idle" | "preparing" | "downloading" | "scheduled" | "ready" | "failed">("idle");
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void checkMandarinRecognitionSupport().then(() => {
      if (alive) setCapability(currentRecognitionCapability());
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!nativeVoice) return undefined;
    return onNativeModelDownload((event) => {
      if (event.status === "DOWNLOADING") {
        setDownload("downloading");
        setDownloadProgress(typeof event.progress === "number" ? event.progress : null);
      } else if (event.status === "SCHEDULED") setDownload("scheduled");
      else if (event.status === "SUCCESS") {
        setDownload("ready");
        void checkMandarinRecognitionSupport(true).then(() => {
          setCapability(currentRecognitionCapability());
          setForcedFallback(false);
        });
      } else if (event.status === "ERROR") setDownload("failed");
    });
  }, [nativeVoice]);

  // RC2.2.19 — cada elo do reconhecimento no diagnóstico (DEV/QA).
  useEffect(() => {
    updateSpeechDiagnostics({ ...recognitionDiagnosticsSnapshot(), modelDownloadState: download === "idle" ? "not_requested" : download });
  }, [capability, micState, download, phase]);

  async function startModelDownload() {
    setDownload("preparing");
    const result = await nativeTriggerModelDownload();
    if (result.status === "UNSUPPORTED_API" || result.status === "ERROR") setDownload("failed");
    else setDownload((current) => (current === "preparing" ? "scheduled" : current));
  }
  useEffect(() => {
    if (!nativeVoice) return;
    let alive = true;
    const refresh = () => void refreshNativeSpeechStatus().then((status) => alive && status && setMicState(status.microphone));
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [nativeVoice]);

  useEffect(() => {
    return () => {
      // Sair da tela nunca deixa o microfone aberto.
      cancelRecognition();
      handleRef.current?.stop();
      if (recorderRef.current?.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined;
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
    } catch {
      /* sem playback — segue só com o reconhecimento */
    }
  }

  function stopRecorder() {
    const mr = recorderRef.current;
    if (mr && mr.state === "recording") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
  }

  function finishResult(transcript: string) {
    // Só aqui existe fala comprovada: o microfone abriu e o reconhecedor
    // devolveu texto. Transcrição vazia é sessão sem captura — o aluno segue,
    // mas nada é registrado como fala. O ACERTO não importa: tentar é falar.
    const attemptKey = attemptKeyRef.current;
    if (attemptKey && transcript.trim()) {
      recordSpeechAttempt({ id: attemptKey, captured: true });
    }
    attemptKeyRef.current = null;

    const r = analyzePronunciation(transcript, target);
    setHeard(transcript);
    setCorrect(r.correct);
    setAnalysis(r);
    setErrorHint(transcript ? null : speechErrorMessage("no-speech"));
    stopRecorder();
    handleRef.current = null;
    setBusy(false);
    setPhase("result");
  }

  function finishError(code: RecognizeErrorCode) {
    // Permissão negada, navegador sem suporte, no-speech: nada foi capturado,
    // logo nada é contado (P5.2). O aluno continua a lição do mesmo jeito.
    attemptKeyRef.current = null;
    // RC2.2.17 · Y — idioma/serviço indisponível: não insistir 10 vezes.
    // Troca para a autoavaliação gravando (quando der para gravar).
    if (recognitionErrorForcesFallback(code)) {
      setCapability(currentRecognitionCapability());
      setForcedFallback(true);
    }
    setHeard("");
    setCorrect(false);
    setErrorHint(speechErrorMessage(code));
    stopRecorder();
    handleRef.current = null;
    setBusy(false);
    setPhase("result");
  }

  async function start() {
    if (busy) return;
    // Chave opaca de propósito: `dailyTasks` é sincronizado, e não há motivo
    // para mandar o texto praticado junto só para desduplicar uma tentativa.
    attemptKeyRef.current = `speech:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    setBusy(true);
    setPhase("listening");
    setHeard("");
    setAnalysis(null);
    setErrorHint(null);
    setAudioUrl(null);
    stopRecorder();

    // 1) Prime da permissão + libera o stream (obrigatório no Chrome Android).
    const permission = await ensureMicPermission();
    if (nativeVoice) setMicState(nativeMicPermissionState());
    if (permission === "denied") {
      finishError("not-allowed");
      return;
    }
    if (permission === "unavailable") {
      finishError(secure ? "unsupported" : "insecure");
      return;
    }

    // 2) Playback só no desktop, e só DEPOIS do prime (stream do prime já foi parado).
    if (!touchUi && !nativeVoice) {
      await startRecording();
    }

    // 3) Reconhecimento com continuous/interim — aguenta a fala no mobile.
    handleRef.current = recognizeOnce(
      (transcript) => finishResult(transcript),
      (code) => finishError(code),
      { lang: "zh-CN", timeoutMs: touchUi ? 15000 : 10000 }
    );
  }

  function stopListening() {
    handleRef.current?.stop();
  }

  const recordingAvailable = selfCompareRecordingAvailable();
  const mode = forcedFallback
    ? recordingAvailable
      ? "self_compare"
      : "model_only"
    : !supported
      ? recordingAvailable
        ? "self_compare"
        : "model_only"
      : speakingModeFor(capability, recordingAvailable);
  const fallbackReason =
    capability === "MODEL_DOWNLOAD_REQUIRED"
      ? t("player.speechModelMissing")
      : capability === "LANGUAGE_UNSUPPORTED" || capability === "LANGUAGE_TEMP_UNAVAILABLE"
        ? t("player.speechLanguageUnavailable")
        : t("player.speechServiceUnavailable");
  const downloadOffer = canOfferModelDownload(capability, mandarinRecognitionSupport()) ? (
    <div className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft/35 p-3" data-testid="speech-model-download" data-download-state={download}>
      <p className="text-sm font-semibold text-ink">{t("player.speechPrepareTitle")}</p>
      {download === "idle" && (
        <Button size="sm" className="mt-2" onClick={() => void startModelDownload()} data-testid="speech-model-download-start">
          {t("player.speechDownload")}
        </Button>
      )}
      {download !== "idle" && (
        <p className="mt-1 text-xs text-ink-soft" role="status">
          {download === "preparing"
            ? t("player.speechPreparing")
            : download === "downloading"
              ? `${t("player.speechDownloading")}${downloadProgress != null ? ` ${downloadProgress}%` : ""}`
              : download === "ready"
                ? t("player.speechReady")
                : download === "scheduled"
                  ? t("player.speechScheduled")
                  : t("player.speechDownloadFailed")}
        </p>
      )}
    </div>
  ) : null;

  if (secure && mode === "self_compare" && phase !== "listening") {
    return (
      <div data-speech-capability={capability} data-speaking-mode="self_compare">
        {downloadOffer}
        <SelfComparePractice target={target} onContinue={onContinue} onCannotSpeak={onContinue} reason={fallbackReason} />
        <SpeechDiagnosticsPanel />
      </div>
    );
  }

  if (!secure || !supported || mode === "model_only") {
    return (
      <div className="mt-6">
        <GuidedDock>
          <Button className="w-full" onClick={onContinue}>
            {t("player.continue")} <IconChevron width={18} height={18} />
          </Button>
        </GuidedDock>
        <p className="mt-2 text-center text-xs text-ink-faint">
          {!secure ? t("player.micHttpsOnly") : capability === "PERMISSION_REQUIRED" ? t("player.speechPermissionNeeded") : t("player.voiceUnavailable")}
        </p>
      </div>
    );
  }

  if (phase === "listening") {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-2">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-accent text-2xl text-white ring-4 ring-accent-soft">
          ···
        </div>
        {/* RC2.2.13 — estado explícito de escuta (mesmo texto na Web e no Android). */}
        <p className="text-sm font-semibold text-accent" role="status" data-testid="speech-listening">
          {t("player.listening")}
        </p>
        <p className="text-sm font-medium text-accent">{t("player.speakNow")}</p>
        <p className="max-w-xs text-center text-xs text-ink-faint">
          {t("player.stopWhenDone")}
        </p>
        <GuidedDock>
          <Button variant="outline" onClick={stopListening}>
            {t("player.stopListening")}
          </Button>
        </GuidedDock>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="mt-5">
        <div
          className={[
            "rounded-xl p-3 text-center",
            correct ? "bg-[rgb(var(--good)/0.12)]" : "bg-accent-soft",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-center gap-1.5 text-sm font-semibold",
              correct ? "text-[rgb(var(--good))]" : "text-accent",
            ].join(" ")}
          >
            {correct ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
            {verdictCopy(heard, analysis, correct)}
          </div>
          {heard && analysis && (
            <div className="mt-2 space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">{t("player.youLabel")}</span>
                <span className="hanzi text-lg text-ink">{heard}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">{t("player.targetLabel")}</span>
                <span className="flex flex-wrap gap-1">
                  {(() => {
                    let hanziIdx = 0;
                    return [...target].map((ch, i) => {
                      const cjk = /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);
                      const ok = cjk ? Boolean(analysis.matchedMask[hanziIdx++]) : false;
                      return (
                        <span
                          key={i}
                          className={[
                            "hanzi rounded px-1 text-lg",
                            ok ? "text-[rgb(var(--good))]" : cjk ? "text-accent" : "text-ink-faint",
                          ].join(" ")}
                        >
                          {ch}
                        </span>
                      );
                    });
                  })()}
                </span>
              </div>
            </div>
          )}
          {!heard && errorHint && (
            <p className="mt-2 text-xs leading-5 text-ink-soft">{errorHint}</p>
          )}
          {audioUrl && (
            <div className="mt-2">
              <div className="mb-1 text-[11px] text-ink-faint">{t("player.yourRecording")}</div>
              <audio controls src={audioUrl} className="mx-auto w-full max-w-xs" />
            </div>
          )}
        </div>
        {heard ? (
          <GuidedDock>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={start} disabled={busy}>
                {t("player.speakAgain")}
              </Button>
              <Button onClick={onContinue}>
                {t("player.continue")} <IconChevron width={18} height={18} />
              </Button>
            </div>
          </GuidedDock>
        ) : (
          // RC2.2.19 — nada foi reconhecido: as quatro saídas, nunca um beco.
          <div className="mt-3" data-testid="speech-fallback-options">
            <p className="mb-2 text-center text-sm text-ink-soft">{t("player.speechFallbackTitle")}</p>
            <GuidedDock>
              <div className="flex flex-col gap-2">
                <Button onClick={start} disabled={busy} data-testid="speech-fallback-retry" data-guided-primary>
                  {t("player.speechRetry")}
                </Button>
                {canOfferModelDownload(capability, mandarinRecognitionSupport()) && (
                  <Button variant="outline" onClick={() => void startModelDownload()} data-testid="speech-fallback-download">
                    {t("player.speechGetSupport")}
                  </Button>
                )}
                {recordingAvailable && (
                  <Button variant="outline" onClick={() => { setForcedFallback(true); setPhase("idle"); }} data-testid="speech-fallback-record">
                    {t("player.speechRecordCompare")}
                  </Button>
                )}
                <Button variant="ghost" onClick={onContinue} data-testid="speech-fallback-continue">
                  {t("player.speechContinueWithout")}
                </Button>
              </div>
            </GuidedDock>
          </div>
        )}
        <SpeechDiagnosticsPanel />
      </div>
    );
  }

  // idle
  const micBlocked = nativeVoice && micState === "denied";
  const micNeedsAsk = nativeVoice && micState != null && micState !== "granted" && !micBlocked;
  return (
    <div className="mt-6 space-y-2">
      {/* RC2.2.18 · BN — pré-permissão: o porquê vem antes do diálogo do sistema. */}
      {micNeedsAsk && (
        <p className="text-center text-sm text-ink-soft" data-testid="speech-mic-pre-permission">
          {t("player.micPrePermission")}
        </p>
      )}
      <GuidedDock>
        {micBlocked ? (
          <Button className="w-full" size="lg" data-testid="speech-open-settings" onClick={() => void openNativeAppSettings()}>
            {t("player.micOpenSettings")}
          </Button>
        ) : (
          <Button className="w-full" size="lg" data-testid="speech-start" onClick={start} disabled={busy}>
            {micNeedsAsk ? t("player.micAllow") : t("player.speak")}
          </Button>
        )}
        <button
          onClick={onContinue}
          className="w-full py-1 text-sm font-medium text-ink-faint transition hover:text-ink"
        >
          {t("player.cannotSpeakNow")}
        </button>
      </GuidedDock>
      <SpeechDiagnosticsPanel />
    </div>
  );
}
