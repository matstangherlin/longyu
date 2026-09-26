import { useEffect, useRef, useState } from "react";
import {
  getNativeTtsUnavailableReason,
  isTTSAvailable,
  mandarinSpeechText,
  refreshNativeTtsStatus,
  scheduleAutoSpeak,
  usesNativeVoice,
} from "../../lib/tts";
import { canOfferVoiceInstall, playMandarinAudio } from "../../lib/audioPlayback";
import { installNativeTtsData } from "../../lib/platform/nativeSpeech";
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
  /** RC2.2.17 · J — motivo da última falha de um toque MANUAL (null = ok). */
  const [failReason, setFailReason] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const dims =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "lg" ? 26 : size === "sm" ? 18 : 22;

  function play() {
    const clean = String(text ?? "").trim();
    if (!clean) return;
    // Android: o botão nunca morre por falta de speechSynthesis; um toque
    // pergunta de novo ao TTS nativo (a voz chinesa pode ter sido instalada).
    if (!isTTSAvailable() && !usesNativeVoice()) {
      setUnavailable(true);
      return;
    }
    setPlaying(true);
    setUnavailable(false);
    setFailed(false);
    setFailReason(null);
    noteAudioManualPlay();
    // RC2.2.17 · B — "ouviu áudio" (tarefa diária) só quando o motor confirma
    // que a fala COMEÇOU. O toque sozinho não conta.
    void playMandarinAudio(clean, {
      rate: slowAudio ? Math.min(rate, 0.65) : rate,
      onState: (state) => {
        if (state === "PLAYING") recordDailyTask("audioHeard");
      },
    }).then((outcome) => {
      if (outcome.superseded) return;
      setPlaying(false);
      if (outcome.started) return;
      // Part J — nunca "animou e não tocou" calado.
      setFailed(true);
      setFailReason(outcome.reason);
      if (outcome.unavailable && usesNativeVoice() && /^TTS_(LANGUAGE|UNAVAILABLE)/.test(getNativeTtsUnavailableReason() ?? "")) setUnavailable(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (!showStatus) hideTimer.current = setTimeout(() => setFailReason(null), 6000);
    });
  }

  async function installVoice() {
    await installNativeTtsData();
    // Part I — ao voltar do instalador, perguntar de novo ao SO.
    const refresh = () => {
      document.removeEventListener("visibilitychange", refresh);
      void refreshNativeTtsStatus().then((status) => {
        if (status?.available) {
          setUnavailable(false);
          setFailed(false);
          setFailReason(null);
        }
      });
    };
    document.addEventListener("visibilitychange", refresh);
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
    const playRate = slowAudio ? Math.min(rate, 0.65) : rate;
    return scheduleAutoSpeak(clean, {
      rate: playRate,
      delayMs: 140,
      // RC2.2.17 · B — autoplay só conta como ouvido quando começa de verdade.
      onstart: () => recordDailyTask("audioHeard"),
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
      disabled={unavailable && !usesNativeVoice()}
      data-audio-failed={failed ? "true" : undefined}
      /*
       * RC1.1 P31 — o payload REAL que iria para o TTS, observável.
       *
       * É o mesmo `mandarinSpeechText` que `speak()` aplica, então o que este
       * atributo mostra é exatamente o que a voz diria. Sem isto, "copy de
       * interface não pode ser falada" só dava para testar na função pura, e
       * um call site passando o enunciado inteiro para o botão passaria batido.
       */
      data-audio-text={mandarinSpeechText(String(text ?? "").trim())}
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

  const offerInstall = canOfferVoiceInstall(failReason ?? getNativeTtsUnavailableReason());
  const installButton = offerInstall ? (
    <button
      type="button"
      data-testid="speak-install-voice"
      onClick={() => void installVoice()}
      className="mt-1 text-xs font-semibold text-accent underline-offset-2 hover:underline"
    >
      {t("common.installVoice")}
    </button>
  ) : null;

  if (!showStatus) {
    if (!failReason) return button;
    // Toque manual que não tocou: frase curta ao lado do botão, sem mudar o
    // layout de quem usa o botão (bolha flutuante, some sozinha).
    return (
      <span className="relative inline-flex">
        {button}
        <span
          role="status"
          data-testid="speak-status"
          data-audio-fail-reason={failReason}
          className="absolute left-1/2 top-full z-20 mt-1 w-max max-w-[14rem] -translate-x-1/2 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-center text-xs leading-4 text-ink-soft shadow-card"
        >
          {offerInstall ? t("common.mandarinVoiceMissing") : t("common.audioFailed")}
          {installButton && <span className="block">{installButton}</span>}
        </span>
      </span>
    );
  }

  // Um toque que não produz som precisa produzir uma frase. O botão continua
  // ativo: "tentar de novo" é o conselho e também a ação.
  const nativeVoiceMissing = usesNativeVoice() && /^TTS_(LANGUAGE|UNAVAILABLE)/.test(getNativeTtsUnavailableReason() ?? "");
  const note = nativeVoiceMissing
    ? t("common.mandarinVoiceMissing")
    : failed
      ? t("common.audioFailed")
      : unavailable
        ? unavailableLabel
        : null;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {button}
      {note && (
        <span role="status" data-testid="speak-status" data-audio-fail-reason={failReason ?? undefined} className="text-xs leading-4 text-ink-soft">
          {note}
        </span>
      )}
      {note && installButton}
    </span>
  );
}
