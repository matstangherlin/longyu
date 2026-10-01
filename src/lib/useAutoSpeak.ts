import { useEffect } from "react";
import { scheduleAutoSpeak, type AutoSpeakOptions } from "./mandarinSpeech";
import { useStore } from "./store";

/**
 * Toca o áudio automaticamente quando a FALA muda (diálogos, cenas, histórias).
 *
 * RC2.2.27 — a identidade é `speechKey` (ex.: `sceneId:nodeId`), não só o
 * texto: o mesmo texto em dois nós diferentes toca de novo. Passa pelo mesmo
 * runtime da fala manual (requestMandarinSpeech) e, ao desmontar/trocar,
 * cancela SÓ a própria request.
 */
export function useAutoSpeak(
  text: string | undefined,
  enabled = true,
  opts: AutoSpeakOptions & { speechKey?: string } = {}
): void {
  const slowAudio = useStore((s) => s.slowAudio);
  const ttsRate = useStore((s) => s.ttsRate);
  const autoPlayAudio = useStore((s) => s.autoPlayAudio);

  useEffect(() => {
    if (!enabled || !autoPlayAudio) return;
    const clean = String(text ?? "").trim();
    if (!clean) return;
    const rate = opts.rate ?? (slowAudio ? Math.min(ttsRate, 0.65) : ttsRate);
    return scheduleAutoSpeak(clean, { rate, delayMs: opts.delayMs, source: opts.source });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.speechKey, text, enabled, autoPlayAudio, slowAudio, ttsRate, opts.rate, opts.delayMs]);
}
