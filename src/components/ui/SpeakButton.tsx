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
  revealText = true,
  showStatus = false,
}: {
  text: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Toca automaticamente quando o botão monta ou o texto muda. */
  autoPlay?: boolean;
  /**
   * O texto falado pode aparecer no rótulo acessível?
   *
   * Em quase todo lugar sim — o hànzì está na tela e repeti-lo ajuda. No Hanzi
   * Builder, não: lá o exercício é justamente descobrir o caractere, e um
   * `aria-label` com a resposta entregaria de graça a quem usa leitor de tela
   * o que o aluno que enxerga precisa montar.
   */
  revealText?: boolean;
  /** Mostra em texto quando o áudio não pôde tocar (em vez de falhar calado). */
  showStatus?: boolean;
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
  const [failed, setFailed] = useState(false);

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
    setFailed(false);
    noteAudioManualPlay();
    recordDailyTask("audioHeard");
    speak(clean, {
      rate: slowAudio ? Math.min(rate, 0.65) : rate,
      onend: () => setPlaying(false),
      onerror: () => setFailed(true),
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

  const button = (
    <button
      type="button"
      aria-label={
        unavailable ? unavailableLabel : revealText ? `${resolvedLabel}: ${text}` : resolvedLabel
      }
      title={unavailable ? unavailableLabel : resolvedLabel}
      onClick={play}
      disabled={unavailable}
      data-audio-failed={failed ? "true" : undefined}
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

  if (!showStatus) return button;

  // Um toque que não produz som precisa produzir uma frase. O botão continua
  // ativo: "tentar de novo" é o conselho e também a ação.
  const note = failed ? t("common.audioFailed") : unavailable ? unavailableLabel : null;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {button}
      {note && (
        <span role="status" data-testid="speak-status" className="text-xs leading-4 text-ink-soft">
          {note}
        </span>
      )}
    </span>
  );
}
