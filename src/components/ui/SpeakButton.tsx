import { useEffect, useState } from "react";
import { scheduleAutoSpeak, speak, noteUserGesture, isTTSAvailable } from "../../lib/tts";
import { useStore } from "../../lib/store";
import { noteAudioManualPlay } from "../../lib/lessonSessionMetrics";
import { useTranslation } from "../../i18n/useTranslation";
import { IconSound } from "./Icon";

// Botão de áudio reutilizável. Acessível e com feedback de "tocando".
// `autoPlay` dispara a fala ao montar / quando o texto muda — o botão segue
// disponível para ouvir de novo.
export function SpeakButton({
  text,
  label,
  size = "md",
  className,
  autoPlay = false,
}: {
  text: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Toca automaticamente quando o botão monta ou o texto muda. */
  autoPlay?: boolean;
}) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("common.listen");
  const unavailableLabel = t("common.audioUnavailable");
  const rate = useStore((s) => s.ttsRate);
  const slowAudio = useStore((s) => s.slowAudio);
  const autoPlayAudio = useStore((s) => s.autoPlayAudio);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(() => !isTTSAvailable());

  const dims =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "lg" ? 26 : size === "sm" ? 18 : 22;

  function play() {
    const clean = String(text ?? "").trim();
    if (!clean) return;
    if (!isTTSAvailable()) {
      setUnavailable(true);
      return;
    }
    noteUserGesture();
    setPlaying(true);
    setUnavailable(false);
    noteAudioManualPlay();
    recordDailyTask("audioHeard");
    speak(clean, {
      rate: slowAudio ? Math.min(rate, 0.65) : rate,
      onend: () => setPlaying(false),
    });
  }

  useEffect(() => {
    // Respeita o toggle global — sem isso Safari/iOS dispara fala fora do gesto
    // e o usuário não consegue desligar o autoplay.
    if (!autoPlay || !autoPlayAudio) return;
    if (!isTTSAvailable()) {
      setUnavailable(true);
      return;
    }
    const clean = String(text ?? "").trim();
    if (!clean) return;
    setPlaying(true);
    recordDailyTask("audioHeard");
    const playRate = slowAudio ? Math.min(rate, 0.65) : rate;
    return scheduleAutoSpeak(clean, {
      rate: playRate,
      delayMs: 140,
      onend: () => setPlaying(false),
    });
    // Só reage a texto/autoPlay — rate/slowAudio vêm do store no momento da fala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, autoPlayAudio, text]);

  return (
    <button
      type="button"
      aria-label={unavailable ? unavailableLabel : `${resolvedLabel}: ${text}`}
      title={unavailable ? unavailableLabel : resolvedLabel}
      onClick={play}
      disabled={unavailable}
      className={[
        "inline-flex items-center justify-center rounded-full shadow-sm transition active:scale-95",
        unavailable
          ? "cursor-not-allowed bg-surface-2 text-ink-faint"
          : "bg-accent text-white hover:bg-accent-strong",
        dims,
        playing ? "ring-4 ring-accent-soft" : "",
        className || "",
      ].join(" ")}
    >
      <IconSound width={icon} height={icon} />
    </button>
  );
}
