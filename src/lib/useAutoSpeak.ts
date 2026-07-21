import { useEffect } from "react";
import { scheduleAutoSpeak, type SpeakOptions } from "./tts";
import { useStore } from "./store";

/** Toca o áudio automaticamente quando `text` muda (diálogos, cenas, histórias). */
export function useAutoSpeak(
  text: string | undefined,
  enabled = true,
  opts: SpeakOptions & { delayMs?: number } = {}
): void {
  const slowAudio = useStore((s) => s.slowAudio);
  const ttsRate = useStore((s) => s.ttsRate);

  useEffect(() => {
    if (!enabled) return;
    const clean = String(text ?? "").trim();
    if (!clean) return;
    const rate = opts.rate ?? (slowAudio ? Math.min(ttsRate, 0.65) : ttsRate);
    return scheduleAutoSpeak(clean, { ...opts, rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, slowAudio, ttsRate, opts.rate, opts.delayMs]);
}
