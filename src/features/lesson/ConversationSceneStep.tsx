import { useEffect, useMemo, useState } from "react";
import type { ConversationCharacter, ConversationCheckpoint, ConversationLine } from "../../data/conversationScenes";
import { AVATAR_TONES, SETTING_LABELS } from "../../data/conversationScenes";
import { ExerciseText, containsCjk } from "../../components/hanzi/ExerciseText";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { Button } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { IconCheck, IconChevron, IconX } from "../../components/ui/Icon";
import { playSoundFx } from "../../lib/soundFx";
import { useStore } from "../../lib/store";
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

function SpeechBubble({
  line,
  side,
  visible,
}: {
  line: ConversationLine;
  side: "left" | "right";
  visible: boolean;
}) {
  const audio = line.audioText ?? line.hanzi;
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
            <div className="hanzi text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
              <ExerciseText value={line.hanzi} type="hanzi" speakOnClick />
            </div>
            <div className="mt-1">
              <Pinyin text={line.pinyin} />
            </div>
            {line.pt && <p className="mt-1.5 text-sm text-ink-soft">{line.pt}</p>}
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

export function ConversationSceneStep({ step, onDone, onSkip, onMistake }: StepProps) {
  const characters = step.characters ?? [];
  const lines = (step.lines ?? []) as ConversationLine[];
  const checkpoint = step.checkpoint;
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState<"dialogue" | "checkpoint" | "done">("dialogue");

  useEffect(() => {
    setLineIndex(0);
    setPhase("dialogue");
  }, [step.sceneId, step.title]);

  const currentLine = lines[Math.min(lineIndex, Math.max(lines.length - 1, 0))];
  const activeSpeakerId = currentLine?.speakerId;
  const left = characters.find((c) => c.side === "left") ?? characters[0];
  const right = characters.find((c) => c.side === "right") ?? characters[1];

  function advanceDialogue() {
    if (lineIndex < lines.length - 1) {
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
