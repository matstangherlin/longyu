import { useEffect, useState } from "react";
import { scheduleAutoSpeak, speak } from "../../lib/tts";
import { useStore } from "../../lib/store";
import { IconSound } from "./Icon";

// Botão de áudio reutilizável. Acessível e com feedback de "tocando".
// `autoPlay` dispara a fala ao montar / quando o texto muda — o botão segue
// disponível para ouvir de novo.
export function SpeakButton({
  text,
  label = "Ouvir",
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
  const rate = useStore((s) => s.ttsRate);
  const slowAudio = useStore((s) => s.slowAudio);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const [playing, setPlaying] = useState(false);

  const dims =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "lg" ? 26 : size === "sm" ? 18 : 22;

  function play() {
    const clean = String(text ?? "").trim();
    if (!clean) return;
    setPlaying(true);
    recordDailyTask("audioHeard");
    speak(clean, {
      rate: slowAudio ? Math.min(rate, 0.65) : rate,
      onend: () => setPlaying(false),
    });
  }

  useEffect(() => {
    if (!autoPlay) return;
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
  }, [autoPlay, text]);

  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      onClick={play}
      className={[
        "inline-flex items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:bg-accent-strong active:scale-95",
        dims,
        playing ? "ring-4 ring-accent-soft" : "",
        className || "",
      ].join(" ")}
    >
      <IconSound width={icon} height={icon} />
    </button>
  );
}
