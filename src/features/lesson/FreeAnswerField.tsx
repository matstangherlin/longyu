import { useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "../../components/ui/primitives";
import { IconMic } from "../../components/ui/Icon";
import { t } from "../../i18n/catalog";
import {
  ensureMicPermission,
  isRecognitionAvailable,
  isSecureMicContext,
  recognizeOnce,
  speechErrorMessage,
  type RecognizeHandle,
} from "../../lib/speech";

type SpeechUiState = "idle" | "listening" | "processing";

/**
 * V4.9.8B.2 — fala é ação primária quando o reconhecedor existe.
 * Peças / texto / fala continuam no mesmo avaliador de quem chama.
 */
export function FreeAnswerField({
  value,
  onChange,
  disabled,
  placeholder,
  onSubmit,
  speechAsAlternative = false,
  micOnly = false,
  rows = 2,
  inputRef,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  placeholder: string;
  onSubmit: () => void;
  /** Mantido por compatibilidade: o mic continua botão, não link. */
  speechAsAlternative?: boolean;
  micOnly?: boolean;
  rows?: number;
  inputRef?: RefObject<HTMLTextAreaElement>;
  ariaLabel?: string;
}) {
  const [speechState, setSpeechState] = useState<SpeechUiState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const handleRef = useRef<RecognizeHandle | null>(null);
  const speechSupported = isRecognitionAvailable() && isSecureMicContext();
  const listening = speechState === "listening";

  useEffect(() => () => handleRef.current?.stop(), []);

  function stopListening() {
    handleRef.current?.stop();
    handleRef.current = null;
    setSpeechState("idle");
  }

  async function startListening() {
    if (disabled) return;
    if (listening) {
      stopListening();
      return;
    }
    setMicError(null);
    const permission = await ensureMicPermission();
    if (permission !== "granted") {
      setMicError(speechErrorMessage(permission === "denied" ? "not-allowed" : "unsupported"));
      return;
    }
    setSpeechState("listening");
    handleRef.current = recognizeOnce(
      (transcript) => {
        handleRef.current = null;
        setSpeechState("processing");
        window.setTimeout(() => {
          setSpeechState("idle");
          if (!transcript) return;
          if (!value.trim()) onChange(transcript);
          else setPendingTranscript(transcript);
        }, 180);
      },
      (code) => {
        handleRef.current = null;
        setSpeechState("idle");
        setMicError(speechErrorMessage(code));
      },
      { lang: "zh-CN" }
    );
  }

  const speakLabel =
    speechState === "listening"
      ? t("player.listening")
      : speechState === "processing"
        ? t("player.processingSpeech")
        : value.trim() || pendingTranscript
          ? t("player.speakAgain")
          : t("player.speak");

  const speakButton = speechSupported ? (
    <Button
      variant={listening ? "soft" : "primary"}
      size="sm"
      disabled={disabled || speechState === "processing"}
      onClick={startListening}
      aria-pressed={listening}
      data-testid="free-answer-mic"
      data-speech-state={speechState}
      className={[
        "min-h-11 min-w-[7.5rem] shadow-lift",
        listening ? "ring-2 ring-accent/30" : "",
        speechAsAlternative ? "" : "",
      ].join(" ")}
    >
      <IconMic width={18} height={18} aria-hidden="true" />
      {speakLabel}
    </Button>
  ) : null;

  return (
    <div className={micOnly ? "mt-2" : "mt-3"} data-free-answer-field={micOnly ? "mic" : "full"}>
      {micOnly ? null : (
      <textarea
        ref={inputRef}
        value={value}
        lang="zh-CN"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onFocus={(event) => {
          const target = event.currentTarget;
          window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            if (composing || event.nativeEvent.isComposing) return;
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        aria-label={ariaLabel ?? t("player.yourAnswer")}
        className="w-full resize-none rounded-2xl border border-line bg-surface-2 p-3 text-lg text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
      />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {speakButton}
        <span className="text-xs text-ink-faint">{t("player.hanziOrPinyinOk")}</span>
      </div>
      {pendingTranscript && (
        <div
          className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2"
          data-testid="free-answer-transcript"
          role="status"
          aria-live="polite"
        >
          <span className="min-w-0 text-sm text-ink">
            {t("player.heardTranscript")}{" "}
            <span lang="zh-CN" className="font-semibold">
              {pendingTranscript}
            </span>
          </span>
          <Button
            size="sm"
            className="min-h-11"
            data-testid="free-answer-transcript-use"
            onClick={() => {
              onChange(pendingTranscript);
              setPendingTranscript(null);
            }}
          >
            {t("player.useAnswer")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="min-h-11"
            data-testid="free-answer-transcript-dismiss"
            onClick={() => setPendingTranscript(null)}
          >
            {t("player.keepTyping")}
          </Button>
        </div>
      )}
      {micError && <p className="mt-2 text-xs text-ink-soft">{micError}</p>}
    </div>
  );
}
