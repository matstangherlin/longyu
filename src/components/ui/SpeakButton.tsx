import { useState } from "react";
import { speak } from "../../lib/tts";
import { useStore } from "../../lib/store";
import { IconSound } from "./Icon";

// Botão de áudio reutilizável. Acessível e com feedback de "tocando".
export function SpeakButton({
  text,
  label = "Ouvir",
  size = "md",
  className,
}: {
  text: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const rate = useStore((s) => s.ttsRate);
  const slowAudio = useStore((s) => s.slowAudio);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const [playing, setPlaying] = useState(false);

  const dims =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "lg" ? 26 : size === "sm" ? 18 : 22;

  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      onClick={() => {
        setPlaying(true);
        recordDailyTask("audioHeard");
        speak(text, { rate: slowAudio ? Math.min(rate, 0.65) : rate, onend: () => setPlaying(false) });
      }}
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
