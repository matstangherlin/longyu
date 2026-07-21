import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ConversationCharacter,
  ConversationCheckpoint,
  ConversationInteraction,
  ConversationLine,
  ConversationNode,
  ConversationVariantLevel,
} from "../../data/conversationScenes";
import { AVATAR_TONES, SETTING_LABELS } from "../../data/conversationScenes";
import { ExerciseText, containsCjk } from "../../components/hanzi/ExerciseText";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { Button } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { IconCheck, IconChevron, IconX } from "../../components/ui/Icon";
import { isConversationV2Enabled } from "../../lib/featureFlags";
import { playSoundFx } from "../../lib/soundFx";
import { useStore } from "../../lib/store";
import { speak, noteUserGesture } from "../../lib/tts";
import { useAutoSpeak } from "../../lib/useAutoSpeak";
import {
  KeyboardShortcutHint,
  ShortcutBadge,
  shortcutKeyForIndex,
  useExerciseHotkeys,
} from "../../lib/useExerciseHotkeys";
import type { StepProps } from "./steps";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeAnswer(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[，。！？、,.!?\s]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function Eyebrow({ children }: { children: string }) {
  return (
    <div className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
      {children}
    </div>
  );
}

function CharacterAvatar({
  character,
  active,
  emotion,
}: {
  character: ConversationCharacter;
  active: boolean;
  emotion?: ConversationLine["emotion"];
}) {
  const tone = AVATAR_TONES[character.avatar] ?? AVATAR_TONES.default;
  const letter = character.name.trim().charAt(0).toUpperCase() || "?";
  const emotionMark =
    emotion === "happy" ? "´▽`" : emotion === "confused" ? "・_・" : emotion === "thinking" ? "…" : null;

  return (
    <div
      className={[
        "flex flex-col items-center gap-1.5 transition-all duration-300",
        active ? "scale-105 opacity-100" : "scale-95 opacity-45",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex h-14 w-14 items-center justify-center rounded-full border text-xl font-semibold shadow-card sm:h-16 sm:w-16",
          tone.bg,
          tone.fg,
          active ? "border-accent ring-2 ring-accent/20" : "border-line",
        ].join(" ")}
        aria-hidden
      >
        {letter}
        {emotionMark && active && (
          <span className="absolute -right-1 -top-1 rounded-full bg-surface px-1 text-[9px] text-ink-faint shadow-sm">
            {emotionMark}
          </span>
        )}
      </div>
      <span className={["text-xs font-semibold", active ? "text-ink" : "text-ink-faint"].join(" ")}>
        {character.name}
      </span>
    </div>
  );
}

/**
 * Visibilidade por nível de apresentação (não muda o conteúdo, só o apoio):
 * guided = pinyin + tradução; assisted = pinyin; independent = só hànzì + áudio;
 * audio_first = áudio primeiro, texto revelado ao tocar.
 */
function variantVisibility(level: ConversationVariantLevel | undefined) {
  switch (level) {
    case "assisted":
      return { showPinyin: true, showPt: false, audioFirst: false };
    case "independent":
      return { showPinyin: false, showPt: false, audioFirst: false };
    case "audio_first":
      return { showPinyin: false, showPt: false, audioFirst: true };
    case "guided":
    default:
      return { showPinyin: true, showPt: true, audioFirst: false };
  }
}

function conversationLineAudio(line: Pick<ConversationLine, "audioText" | "hanzi"> | undefined): string {
  return String(line?.audioText ?? line?.hanzi ?? "").trim();
}

function speakConversationLine(line: Pick<ConversationLine, "audioText" | "hanzi"> | undefined): void {
  const audio = conversationLineAudio(line);
  if (!audio) return;
  noteUserGesture();
  const { slowAudio, ttsRate } = useStore.getState();
  speak(audio, { rate: slowAudio ? Math.min(ttsRate, 0.65) : ttsRate });
}

function SpeechBubble({
  line,
  side,
  visible,
  variantLevel,
  autoSpeak = true,
}: {
  line: ConversationLine;
  side: "left" | "right";
  visible: boolean;
  variantLevel?: ConversationVariantLevel;
  /** false quando o pai já disparou o áudio no gesto do usuário (evita duplicar). */
  autoSpeak?: boolean;
}) {
  const audio = line.audioText ?? line.hanzi;
  const slowAudio = useStore((s) => s.slowAudio);
  const ttsRate = useStore((s) => s.ttsRate);
  const { showPinyin, showPt, audioFirst } = variantVisibility(variantLevel);
  useAutoSpeak(visible && autoSpeak ? audio : undefined, visible && autoSpeak, {
    rate: slowAudio ? Math.min(ttsRate, 0.65) : ttsRate,
    delayMs: 0,
  });
  // audio_first: o texto começa oculto atrás de um botão de revelar (o áudio
  // fica em destaque). Reseta quando a fala muda.
  const [revealed, setRevealed] = useState(!audioFirst);
  useEffect(() => {
    setRevealed(!audioFirst);
  }, [line.hanzi, audioFirst]);
  const textHidden = audioFirst && !revealed;
  return (
    <div
      className={[
        "flex w-full",
        side === "left" ? "justify-start" : "justify-end",
        visible ? "conversation-bubble-in" : "invisible",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[88%] rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card sm:max-w-[80%]",
          side === "left" ? "rounded-tl-md" : "rounded-tr-md",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {textHidden ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="hanzi rounded-xl border border-dashed border-accent-soft bg-accent-soft/40 px-4 py-2 text-lg font-semibold text-accent"
              >
                Ouça e toque para revelar
              </button>
            ) : (
              <>
                <div className="hanzi text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
                  <ExerciseText value={line.hanzi} type="hanzi" speakOnClick />
                </div>
                {showPinyin && (
                  <div className="mt-1">
                    <Pinyin text={line.pinyin} />
                  </div>
                )}
                {showPt && line.pt && <p className="mt-1.5 text-sm text-ink-soft">{line.pt}</p>}
              </>
            )}
          </div>
          <SpeakButton text={audio} label="Ouvir" size="sm" className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

function SettingBackdrop({ setting }: { setting?: string }) {
  const label = setting && setting in SETTING_LABELS ? SETTING_LABELS[setting as keyof typeof SETTING_LABELS] : "Cena";
  const washes: Record<string, string> = {
    classroom: "from-[rgb(185_65_46/0.10)] via-[rgb(var(--surface-2))] to-[rgb(47_133_90/0.08)]",
    street: "from-[rgb(90_96_100/0.10)] via-[rgb(var(--surface-2))] to-[rgb(185_65_46/0.08)]",
    shop: "from-[rgb(138_90_23/0.10)] via-[rgb(var(--surface-2))] to-[rgb(185_65_46/0.08)]",
    home: "from-[rgb(47_133_90/0.10)] via-[rgb(var(--surface-2))] to-[rgb(185_65_46/0.06)]",
    park: "from-[rgb(47_133_90/0.14)] via-[rgb(var(--surface-2))] to-[rgb(90_96_100/0.06)]",
    school: "from-[rgb(185_65_46/0.12)] via-[rgb(var(--surface-2))] to-[rgb(138_90_23/0.08)]",
  };
  const wash = washes[setting ?? ""] ?? washes.classroom;

  return (
    <div className={["relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br p-4 sm:p-5", wash].join(" ")}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.55),transparent_70%)]" />
      <div className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</div>
    </div>
  );
}

function CheckpointPanel({
  checkpoint,
  onMistake,
  onDone,
  onSkip,
}: {
  checkpoint: ConversationCheckpoint;
  onMistake?: StepProps["onMistake"];
  onDone: StepProps["onDone"];
  onSkip?: StepProps["onSkip"];
}) {
  const soundEffects = useStore((s) => s.soundEffects);
  const answer = checkpoint.correctAnswer;
  const isOrder = checkpoint.type === "order_reply";
  const options = useMemo(
    () => (isOrder ? [...(checkpoint.options ?? [])] : shuffle([...(checkpoint.options ?? [])])),
    [checkpoint.options, isOrder]
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [bank, setBank] = useState(() => shuffle(options));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [hadMistake, setHadMistake] = useState(false);

  useEffect(() => {
    setPicked(null);
    setOrdered([]);
    setBank(shuffle(options));
    setFeedback(null);
    setHadMistake(false);
  }, [checkpoint.prompt, checkpoint.correctAnswer]);

  function currentAttempt(): string {
    if (isOrder) return ordered.join("");
    return picked ?? "";
  }

  function check() {
    const attempt = currentAttempt();
    if (!attempt) return;
    if (normalizeAnswer(attempt) === normalizeAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
    } else {
      setHadMistake(true);
      setFeedback("wrong");
      onMistake?.(attempt);
      if (!onMistake) playSoundFx("error", soundEffects);
    }
  }

  function retry() {
    setPicked(null);
    setOrdered([]);
    setBank(shuffle(options));
    setFeedback(null);
  }

  useExerciseHotkeys({
    enabled: !isOrder,
    mode: "choice",
    optionCount: options.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      const option = options[index];
      if (option && feedback !== "correct") {
        playSoundFx("pieceSelect", soundEffects);
        setPicked(option);
        setFeedback(null);
      }
    },
    onSubmit: check,
    onContinue: () => onDone(!hadMistake),
  });

  return (
    <div className="mt-4 animate-pop rounded-2xl border border-accent-soft bg-surface p-3.5 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Sua vez</div>
      <p className="mt-2 text-base font-medium leading-7 text-ink">{checkpoint.prompt}</p>

      {isOrder ? (
        <>
          <div className="mt-3 flex min-h-12 flex-wrap gap-2 rounded-xl border border-dashed border-line bg-surface-2 p-2.5">
            {ordered.length === 0 && (
              <span className="self-center text-sm text-ink-faint">Toque nas peças para montar</span>
            )}
            {ordered.map((piece, index) => (
              <button
                key={`${piece}-${index}`}
                type="button"
                disabled={feedback === "correct"}
                onClick={() => {
                  if (feedback === "correct") return;
                  setOrdered((prev) => prev.filter((_, i) => i !== index));
                  setBank((prev) => [...prev, piece]);
                  setFeedback(null);
                }}
                className={[
                  "min-h-11 rounded-xl border border-accent bg-accent-soft px-3 py-1.5 font-semibold text-accent",
                  containsCjk(piece) ? "hanzi text-xl" : "text-sm",
                ].join(" ")}
              >
                {piece}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {bank.map((piece, index) => (
              <button
                key={`${piece}-bank-${index}`}
                type="button"
                disabled={feedback === "correct"}
                onClick={() => {
                  if (feedback === "correct") return;
                  playSoundFx("pieceSelect", soundEffects);
                  setBank((prev) => {
                    const next = [...prev];
                    next.splice(index, 1);
                    return next;
                  });
                  setOrdered((prev) => [...prev, piece]);
                  setFeedback(null);
                }}
                className={[
                  "min-h-11 rounded-xl border border-line bg-surface px-3 py-1.5 font-semibold text-ink shadow-card transition hover:border-accent-soft",
                  containsCjk(piece) ? "hanzi text-xl" : "text-sm",
                ].join(" ")}
              >
                {piece}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <KeyboardShortcutHint />
          <div className="mt-3 grid gap-2">
            {options.map((option, index) => {
              const active = picked === option;
              const correct = feedback && normalizeAnswer(option) === normalizeAnswer(answer);
              const wrong = feedback === "wrong" && active;
              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  disabled={feedback === "correct"}
                  onClick={() => {
                    if (feedback === "correct") return;
                    playSoundFx("pieceSelect", soundEffects);
                    setPicked(option);
                    setFeedback(null);
                  }}
                  className={[
                    "relative min-h-12 rounded-2xl border px-3.5 py-2.5 text-left font-semibold shadow-card transition",
                    containsCjk(option) ? "hanzi text-[22px] sm:text-[26px]" : "text-[15px]",
                    correct && "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]",
                    wrong && "longyu-error-shake border-transparent bg-wrong-soft text-wrong",
                    active && !correct && !wrong && "border-accent bg-accent-soft text-accent ring-2 ring-accent/15",
                    !active && !correct && !wrong && "border-line bg-surface text-ink hover:border-accent-soft",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
                >
                  <ShortcutBadge className="absolute left-1.5 top-1.5">{shortcutKeyForIndex(index)}</ShortcutBadge>
                  <ExerciseText value={option} type={containsCjk(option) ? "hanzi" : "pt"} speakOnClick />
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1 shadow-lift"
          disabled={
            feedback === "correct" || (isOrder ? ordered.length === 0 : !picked)
          }
          onClick={check}
        >
          Verificar
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip}>
            Pular
          </Button>
        )}
      </div>

      {feedback && !(feedback === "wrong" && onMistake) && (
        <div
          role="status"
          aria-live="polite"
          className={[
            "animate-pop mt-4 rounded-2xl border p-3.5",
            feedback === "correct"
              ? "border-transparent bg-[rgb(var(--good)/0.12)] longyu-success-bloom"
              : "border-accent-soft bg-accent-soft/45",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-2 text-sm font-semibold",
              feedback === "correct" ? "text-[rgb(var(--good))]" : "text-accent",
            ].join(" ")}
          >
            {feedback === "correct" ? <IconCheck width={18} height={18} /> : <IconX width={18} height={18} />}
            {feedback === "correct" ? "Boa! +Qi" : "Quase"}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {feedback === "correct"
              ? checkpoint.explanation ??
                (hadMistake
                  ? "Agora ficou certo. Como houve tentativa anterior, esta parte entra para revisão."
                  : "Você entendeu a conversa.")
              : `Resposta sugerida: ${answer}`}
          </p>
          {feedback === "correct" ? (
            <Button variant="good" className="mt-4 w-full shadow-lift" onClick={() => onDone(!hadMistake)}>
              Continuar <IconChevron width={18} height={18} />
            </Button>
          ) : (
            <Button variant="good" className="mt-4 w-full shadow-lift" onClick={retry}>
              Tentar de novo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// V2: painel de UMA interação (a conversa pode ter várias).
// Errar não encerra a cena: com ramo de erro, o personagem reage
// (repete, corrige, demonstra confusão) e a conversa continua; sem
// ramo, o aluno tenta de novo aqui mesmo com uma pista curta.
// ————————————————————————————————————————————————————————————————
function InteractionPanel({
  interaction,
  onCorrect,
  onWrongBranch,
  onLocalMistake,
  onSkip,
}: {
  interaction: ConversationInteraction;
  onCorrect: () => void;
  /** Presente quando a interação tem wrongNextNodeId: navega no erro. */
  onWrongBranch?: () => void;
  onLocalMistake: () => void;
  onSkip?: StepProps["onSkip"];
}) {
  const soundEffects = useStore((s) => s.soundEffects);
  const answer = interaction.correctAnswer;
  const isOrder = interaction.type === "order_reply";
  const isListen = interaction.type === "listen_reply";
  const options = useMemo(() => [...(interaction.options ?? [])], [interaction.prompt, interaction.correctAnswer]);
  const [picked, setPicked] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [bank, setBank] = useState(() => shuffle(options));
  const [shuffled, setShuffled] = useState(() => shuffle(options));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    setPicked(null);
    setOrdered([]);
    setBank(shuffle(options));
    setShuffled(shuffle(options));
    setFeedback(null);
  }, [interaction.prompt, interaction.correctAnswer]);

  const visibleOptions = isOrder ? bank : shuffled;

  function check() {
    const attempt = isOrder ? ordered.join("") : picked ?? "";
    if (!attempt) return;
    if (normalizeAnswer(attempt) === normalizeAnswer(answer)) {
      setFeedback("correct");
      playSoundFx("success", soundEffects);
      return;
    }
    onLocalMistake();
    playSoundFx("error", soundEffects);
    if (onWrongBranch) {
      onWrongBranch();
      return;
    }
    setFeedback("wrong");
  }

  function retry() {
    setPicked(null);
    setOrdered([]);
    setBank(shuffle(options));
    setFeedback(null);
  }

  useExerciseHotkeys({
    enabled: !isOrder,
    mode: "choice",
    optionCount: visibleOptions.length,
    isAnswered: feedback === "correct",
    hasSelection: Boolean(picked),
    onSelectOption: (index) => {
      const option = visibleOptions[index];
      if (option && feedback !== "correct") {
        playSoundFx("pieceSelect", soundEffects);
        setPicked(option);
        setFeedback(null);
      }
    },
    onSubmit: check,
    onContinue: () => {
      if (feedback === "correct") onCorrect();
    },
  });

  return (
    <div className="mt-4 animate-pop rounded-2xl border border-accent-soft bg-surface p-3.5 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Sua vez</div>
      <p className="mt-2 text-base font-medium leading-7 text-ink">{interaction.prompt}</p>

      {isListen && (
        <div className="mt-3 flex items-center gap-2">
          <SpeakButton text={answer} label="Ouvir" size="sm" autoPlay />
          <span className="text-xs text-ink-faint">Ouça e escolha a resposta.</span>
        </div>
      )}

      {isOrder ? (
        <>
          <div className="mt-3 flex min-h-12 flex-wrap gap-2 rounded-xl border border-dashed border-line bg-surface-2 p-2.5">
            {ordered.length === 0 && (
              <span className="self-center text-sm text-ink-faint">Toque nas peças para montar</span>
            )}
            {ordered.map((piece, index) => (
              <button
                key={`${piece}-${index}`}
                type="button"
                disabled={feedback === "correct"}
                onClick={() => {
                  if (feedback === "correct") return;
                  setOrdered((prev) => prev.filter((_, i) => i !== index));
                  setBank((prev) => [...prev, piece]);
                  setFeedback(null);
                }}
                className={[
                  "min-h-11 rounded-xl border border-accent bg-accent-soft px-3 py-1.5 font-semibold text-accent",
                  containsCjk(piece) ? "hanzi text-xl" : "text-sm",
                ].join(" ")}
              >
                {piece}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {bank.map((piece, index) => (
              <button
                key={`${piece}-bank-${index}`}
                type="button"
                disabled={feedback === "correct"}
                onClick={() => {
                  if (feedback === "correct") return;
                  playSoundFx("pieceSelect", soundEffects);
                  setBank((prev) => {
                    const next = [...prev];
                    next.splice(index, 1);
                    return next;
                  });
                  setOrdered((prev) => [...prev, piece]);
                  setFeedback(null);
                }}
                className={[
                  "min-h-11 rounded-xl border border-line bg-surface px-3 py-1.5 font-semibold text-ink shadow-card transition hover:border-accent-soft",
                  containsCjk(piece) ? "hanzi text-xl" : "text-sm",
                ].join(" ")}
              >
                {piece}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <KeyboardShortcutHint />
          <div className="mt-3 grid gap-2">
            {shuffled.map((option, index) => {
              const active = picked === option;
              const correct = feedback && normalizeAnswer(option) === normalizeAnswer(answer);
              const wrong = feedback === "wrong" && active;
              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  disabled={feedback === "correct"}
                  onClick={() => {
                    if (feedback === "correct") return;
                    playSoundFx("pieceSelect", soundEffects);
                    setPicked(option);
                    setFeedback(null);
                  }}
                  className={[
                    "relative min-h-12 rounded-2xl border px-3.5 py-2.5 text-left font-semibold shadow-card transition",
                    containsCjk(option) ? "hanzi text-[22px] sm:text-[26px]" : "text-[15px]",
                    correct && "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]",
                    wrong && "longyu-error-shake border-transparent bg-wrong-soft text-wrong",
                    active && !correct && !wrong && "border-accent bg-accent-soft text-accent ring-2 ring-accent/15",
                    !active && !correct && !wrong && "border-line bg-surface text-ink hover:border-accent-soft",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
                >
                  <ShortcutBadge className="absolute left-1.5 top-1.5">{shortcutKeyForIndex(index)}</ShortcutBadge>
                  <ExerciseText value={option} type={containsCjk(option) ? "hanzi" : "pt"} speakOnClick />
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1 shadow-lift"
          disabled={feedback === "correct" || (isOrder ? ordered.length === 0 : !picked)}
          onClick={check}
        >
          Verificar
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip}>
            Pular
          </Button>
        )}
      </div>

      {feedback === "correct" && (
        <div role="status" aria-live="polite" className="animate-pop mt-4 rounded-2xl border border-transparent bg-[rgb(var(--good)/0.12)] p-3.5 longyu-success-bloom">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--good))]">
            <IconCheck width={18} height={18} /> Boa!
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{interaction.explanation ?? "A conversa continua."}</p>
          <Button variant="good" className="mt-4 w-full shadow-lift" onClick={onCorrect}>
            Continuar <IconChevron width={18} height={18} />
          </Button>
        </div>
      )}

      {feedback === "wrong" && (
        <div role="status" aria-live="polite" className="animate-pop mt-4 rounded-2xl border border-accent-soft bg-accent-soft/45 p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <IconX width={18} height={18} /> Quase
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {interaction.explanation ?? `Resposta sugerida: ${answer}`}
          </p>
          <Button variant="good" className="mt-4 w-full shadow-lift" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}
    </div>
  );
}

// V2: caminha pelos nós da conversa. O erro leva ao ramo de reação do
// personagem (quando existe) e a cena segue até um nó terminal; o resultado
// final (onDone) considera se houve algum erro no caminho.
function ConversationSceneV2({ step, onDone, onSkip }: StepProps) {
  const characters = step.characters ?? [];
  const nodes = (step.nodes ?? []) as ConversationNode[];
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [step.sceneId]);
  const entryNodeId = step.entryNodeId ?? nodes[0]?.id ?? "";
  const [nodeId, setNodeId] = useState(entryNodeId);
  const [answering, setAnswering] = useState(false);
  const [spokenCount, setSpokenCount] = useState(1);
  const [hint, setHint] = useState<string | null>(null);
  const hadMistakeRef = useRef(false);
  const mistakeCountRef = useRef(0);
  const transitionsRef = useRef(0);
  const skipAutoSpeakRef = useRef(false);

  useEffect(() => {
    setNodeId(entryNodeId);
    setAnswering(false);
    setSpokenCount(1);
    setHint(null);
    hadMistakeRef.current = false;
    mistakeCountRef.current = 0;
    transitionsRef.current = 0;
    skipAutoSpeakRef.current = false;
  }, [step.sceneId, entryNodeId]);

  useEffect(() => {
    skipAutoSpeakRef.current = false;
  }, [nodeId, spokenCount]);

  const node = nodeById.get(nodeId) ?? nodes[0];
  const left = characters.find((c) => c.side === "left") ?? characters[0];
  const right = characters.find((c) => c.side === "right") ?? characters[1];

  function finish() {
    const attempts = Math.max(1, mistakeCountRef.current + 1);
    onDone(!hadMistakeRef.current, { attempts });
  }

  function goTo(targetId: string | undefined, speakTarget?: ConversationNode) {
    transitionsRef.current += 1;
    // Rede de segurança: nunca deixa um grafo mal formado prender o aluno.
    if (!targetId || !nodeById.has(targetId) || transitionsRef.current > 60) {
      finish();
      return;
    }
    if (speakTarget) {
      skipAutoSpeakRef.current = true;
      speakConversationLine(speakTarget);
    }
    setNodeId(targetId);
    setAnswering(false);
    setSpokenCount((count) => count + 1);
  }

  function advance() {
    noteUserGesture();
    if (node?.interaction) {
      setAnswering(true);
      return;
    }
    if (node?.nextNodeId) {
      setHint(null);
      goTo(node.nextNodeId, nodeById.get(node.nextNodeId));
      return;
    }
    finish();
  }

  if (!node) {
    return (
      <div>
        <Eyebrow>Cena</Eyebrow>
        <p className="mt-3 text-ink-soft">Esta cena ainda não tem falas.</p>
        <Button className="mt-4 w-full" onClick={() => onDone(true)}>
          Continuar
        </Button>
      </div>
    );
  }

  const isTerminal = !node.interaction && !node.nextNodeId;
  const line: ConversationLine = {
    speakerId: node.speakerId,
    hanzi: node.hanzi,
    pinyin: node.pinyin,
    pt: node.pt,
    emotion: node.emotion,
    audioText: node.audioText,
  };

  return (
    <div>
      <Eyebrow>Cena de conversa</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold text-ink sm:text-xl">{step.title}</h2>

      <div className="mt-3">
        <SettingBackdrop setting={step.setting} />
      </div>

      <div className="-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface px-3 pb-4 pt-5 sm:px-4">
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          {left && (
            <CharacterAvatar
              character={left}
              active={!answering && node.speakerId === left.id}
              emotion={node.speakerId === left.id ? node.emotion : undefined}
            />
          )}
          {right && (
            <CharacterAvatar
              character={right}
              active={!answering && node.speakerId === right.id}
              emotion={node.speakerId === right.id ? node.emotion : undefined}
            />
          )}
        </div>

        <SpeechBubble
          key={`${step.sceneId}-${node.id}-${spokenCount}`}
          line={line}
          side={characters.find((c) => c.id === node.speakerId)?.side ?? "left"}
          visible
          variantLevel={step.conversationVariantLevel}
          autoSpeak={!skipAutoSpeakRef.current}
        />

        {hint && !answering && (
          <div className="mt-3 rounded-xl border border-accent-soft bg-accent-soft/40 px-3 py-2 text-sm text-ink-soft">
            <span className="font-semibold text-accent">Pista:</span> {hint}
          </div>
        )}

        {!answering && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-ink-faint">Fala {spokenCount}</span>
            <Button className="min-w-[9.5rem] shadow-lift" onClick={advance}>
              {isTerminal ? "Concluir" : node.interaction ? "Responder" : "Continuar"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
        )}

        {answering && node.interaction && (
          <InteractionPanel
            interaction={node.interaction}
            onCorrect={() => {
              setHint(null);
              const nextId = node.interaction!.correctNextNodeId;
              goTo(nextId, nodeById.get(nextId));
            }}
            onWrongBranch={
              node.interaction.wrongNextNodeId
                ? () => {
                    setHint(node.interaction!.explanation ?? null);
                    const nextId = node.interaction!.wrongNextNodeId!;
                    goTo(nextId, nodeById.get(nextId));
                  }
                : undefined
            }
            onLocalMistake={() => {
              // Não chama onMistake do player: isso abriria o modal de retry e
              // quebraria o fluxo V2 (o erro já tem ramo próprio na cena).
              hadMistakeRef.current = true;
              mistakeCountRef.current += 1;
            }}
            onSkip={onSkip}
          />
        )}
      </div>
    </div>
  );
}

export function ConversationSceneStep({ step, onDone, onSkip, onMistake }: StepProps) {
  // Rollback: VITE_ENABLE_CONVERSATION_V2=false força o player V1 (lines/checkpoint).
  // Progresso do usuário permanece intacto — só muda o motor da cena.
  const hasNodes = isConversationV2Enabled() && (step.nodes?.length ?? 0) > 0;
  if (hasNodes) {
    return <ConversationSceneV2 step={step} onDone={onDone} onSkip={onSkip} onMistake={onMistake} />;
  }
  return <ConversationSceneV1 step={step} onDone={onDone} onSkip={onSkip} onMistake={onMistake} />;
}

function ConversationSceneV1({ step, onDone, onSkip, onMistake }: StepProps) {
  const characters = step.characters ?? [];
  const lines = (step.lines ?? []) as ConversationLine[];
  const checkpoint = step.checkpoint;
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState<"dialogue" | "checkpoint" | "done">("dialogue");
  const skipAutoSpeakRef = useRef(false);

  useEffect(() => {
    setLineIndex(0);
    setPhase("dialogue");
    skipAutoSpeakRef.current = false;
  }, [step.sceneId, step.title]);

  useEffect(() => {
    skipAutoSpeakRef.current = false;
  }, [lineIndex]);

  const currentLine = lines[Math.min(lineIndex, Math.max(lines.length - 1, 0))];
  const activeSpeakerId = currentLine?.speakerId;
  const left = characters.find((c) => c.side === "left") ?? characters[0];
  const right = characters.find((c) => c.side === "right") ?? characters[1];

  function advanceDialogue() {
    noteUserGesture();
    if (lineIndex < lines.length - 1) {
      const nextLine = lines[lineIndex + 1];
      skipAutoSpeakRef.current = true;
      speakConversationLine(nextLine);
      setLineIndex((index) => index + 1);
      return;
    }
    if (checkpoint) {
      setPhase("checkpoint");
      return;
    }
    setPhase("done");
    onDone(true);
  }

  if (lines.length === 0) {
    return (
      <div>
        <Eyebrow>Cena</Eyebrow>
        <p className="mt-3 text-ink-soft">Esta cena ainda não tem falas.</p>
        <Button className="mt-4 w-full" onClick={() => onDone(true)}>
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>Cena de conversa</Eyebrow>
      <h2 className="mt-2 font-serif text-lg font-semibold text-ink sm:text-xl">{step.title}</h2>

      <div className="mt-3">
        <SettingBackdrop setting={step.setting} />
      </div>

      <div className="-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface px-3 pb-4 pt-5 sm:px-4">
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          {left && (
            <CharacterAvatar
              character={left}
              active={phase === "dialogue" && activeSpeakerId === left.id}
              emotion={activeSpeakerId === left.id ? currentLine?.emotion : undefined}
            />
          )}
          {right && (
            <CharacterAvatar
              character={right}
              active={phase === "dialogue" && activeSpeakerId === right.id}
              emotion={activeSpeakerId === right.id ? currentLine?.emotion : undefined}
            />
          )}
        </div>

        {phase === "dialogue" && currentLine && (
          <SpeechBubble
            key={`${step.sceneId}-${lineIndex}`}
            line={currentLine}
            side={characters.find((c) => c.id === currentLine.speakerId)?.side ?? "left"}
            visible
            variantLevel={step.conversationVariantLevel}
            autoSpeak={!skipAutoSpeakRef.current}
          />
        )}

        {phase === "dialogue" && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-ink-faint">
              Fala {lineIndex + 1} de {lines.length}
            </span>
            <Button className="min-w-[9.5rem] shadow-lift" onClick={advanceDialogue}>
              Continuar <IconChevron width={18} height={18} />
            </Button>
          </div>
        )}

        {phase === "checkpoint" && checkpoint && (
          <CheckpointPanel
            checkpoint={checkpoint}
            onMistake={onMistake}
            onDone={onDone}
            onSkip={onSkip}
          />
        )}
      </div>
    </div>
  );
}
