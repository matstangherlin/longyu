Exit code: 0
Wall time: 1 seconds
Total output lines: 1394
Output:
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
    .replace(/[ï¼Œã€‚ï¼ï¼Ÿã€,.!?\s]/g, "")
    .toLocaleLowerCase("pt-BR");
}

const CONVERSATION_RESUME_PREFIX = "longyu:conversation-resume:v2";
const CONVERSATION_RESUME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type ConversationHistoryKind = "character" | "student" | "hint" | "correction" | "narration";

interface ConversationHistoryItem {
  id: string;
  kind: ConversationHistoryKind;
  speaker: string;
  hanzi?: string;
  pinyin?: string;
  pt?: string;
  text?: string;
  status?: "correct" | "wrong";
}

interface ConversationResumeSnapshot {
  version: 2;
  sceneId: string;
  nodeId?: string;
  lineIndex?: number;
  phase?: "dialogue" | "checkpoint" | "done";
  answering?: boolean;
  spokenCount: number;
  hint?: string | null;
  hadMistake: boolean;
  mistakeCount: number;
  transitions: number;
  history: ConversationHistoryItem[];
  updatedAt: number;
}

function conversationResumeKey(sceneId: string | undefined): string {
  return `${CONVERSATION_RESUME_PREFIX}:${sceneId ?? "unknown"}`;
}

function readConversationResume(sceneId: string | undefined): ConversationResumeSnapshot | null {
  if (!sceneId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(conversationResumeKey(sceneId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConversationResumeSnapshot;
    if (
      parsed.version !== 2 ||
      parsed.sceneId !== sceneId ||
      !Number.isFinite(parsed.updatedAt) ||
      Date.now() - parsed.updatedAt > CONVERSATION_RESUME_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(conversationResumeKey(sceneId));
      return null;
    }
    return { ...parsed, history: Array.isArray(parsed.history) ? parsed.history.slice(-30) : [] };
  } catch {
    return null;
  }
}

function writeConversationResume(snapshot: ConversationResumeSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(conversationResumeKey(snapshot.sceneId), JSON.stringify(snapshot));
  } catch {
    // A cena continua utilizÃ¡vel quando o navegador bloqueia ou esgota storage.
  }
}

function clearConversationResume(sceneId: string | undefined): void {
  if (!sceneId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(conversationResumeKey(sceneId));
  } catch {
    // Sem aÃ§Ã£o: a prÃ³xima leitura valida idade e sceneId antes de restaurar.
  }
}

function ConversationProgress({ current, total, label }: { current: number; total: number; label: string }) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const percent = Math.round((safeCurrent / safeTotal) * 100);
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-3 py-2.5" aria-label={`${label}: ${safeCurrent} de ${safeTotal}`}>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-ink">{label}</span>
        <span className="tabular-nums text-ink-faint">{safeCurrent}/{safeTotal}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const HISTORY_KIND_LABEL: Record<ConversationHistoryKind, string> = {
  character: "Personagem",
  student: "Sua resposta",
  hint: "Pista",
  correction: "CorreÃ§Ã£o",
  narration: "NarraÃ§Ã£o",
};

function ConversationHistory({ items }: { items: ConversationHistoryItem[] }) {
  if (items.length === 0) return null;
  return (
    <details className="group mt-3 rounded-2xl border border-line bg-surface-2/80" data-testid="conversation-history">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <span>Rever falas anteriores</span>
        <span className="text-xs font-medium text-ink-faint">{items.length} {items.length === 1 ? "item" : "itens"}</span>
      </summary>
      <ol className="max-h-52 space-y-2 overflow-y-auto overscroll-contain border-t border-line p-2.5" aria-label="HistÃ³rico recente da conversa">
        {items.slice(-12).map((item) => (
          <li
            key={item.id}
            data-conversation-kind={item.kind}
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              item.kind === "student" ? "ml-5 border-accent-soft bg-accent-soft/35" : "mr-5 border-line bg-surface",
              item.kind === "hint" || item.kind === "correction" ? "border-accent-soft bg-accent-soft/30" : "",
              item.kind === "narration" ? "italic text-ink-soft" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              <span>{item.speaker || HISTORY_KIND_LABEL[item.kind]}</span>
              <span>{HISTORY_KIND_LABEL[item.kind]}</span>
            </div>
            {item.hanzi && <div className="hanzi mt-1 text-lg font-semibold text-ink">{item.hanzi}</div>}
            {item.text && <div className="mt-1 font-medium text-ink">{item.text}</div>}
            {item.status === "wrong" && <div className="mt-1 text-xs font-semibold text-wrong">Tentativa incorreta</div>}
          </li>
        ))}
      </ol>
    </details>
  );
}

function ConversationStageNotice({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      className="mt-3 flex items-center gap-2 rounded-xl border border-accent-soft bg-accent-soft/35 px-3 py-2 text-sm"
      role="status"
      aria-live="polite"
      data-testid="conversation-stage"
    >
      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">{label}</span>
      <span className="min-w-0 text-ink-soft">{detail}</span>
    </div>
  );
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
    emotion === "happy" ? "Â´â–½`" : emotion === "confused" ? "ãƒ»_ãƒ»" : emotion === "thinking" ? "â€¦" : null;

  return (
    <div
      className={[
        "flex flex-col items-center gap-1.5 transition-all duration-300",
        active ? "scale-105 opacity-100" : "scale-95 opacity-45",
      ].join(" ")}
      aria-label={`${character.name}${active ? ", personagem falando agora" : ""}`}
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
 * Visibilidade por nÃ­vel de apresentaÃ§Ã£o (nÃ£o muda o conteÃºdo, sÃ³ o apoio):
 * guided = pinyin + traduÃ§Ã£o; assisted = pinyin; independent = sÃ³ hÃ nzÃ¬ + Ã¡udio;
 * audio_first = Ã¡udio primeiro, texto revelado ao tocar.
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
  speakerName,
  narration = false,
  autoSpeak = true,
}: {
  line: ConversationLine;
  side: "left" | "right";
  visible: boolean;
  variantLevel?: ConversationVariantLevel;
  speakerName?: string;
  narration?: boolean;
  /** false quando o pai jÃ¡ disparou o Ã¡udio no gesto do usuÃ¡rio (evita duplicar). */
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
  // audio_first: o texto comeÃ§a oculto atrÃ¡s de um botÃ£o de revelar (o Ã¡udio
  // fica em destaque). Reseta quando a fala muda.
  const [revealed, setRevealed] = useState(!audioFirst);
  const [translationRevealed, setTranslationRevealed] = useState(false);
  useEffect(() => {
    setRevealed(!audioFirst);
    setTranslationRevealed(false);
  }, [line.hanzi, audioFirst]);
  const textHidden = audioFirst && !revealed;
  const canRevealTranslation = variantLevel === "assisted" && Boolean(line.pt);
  return (
    <div
      className={[
        "flex w-full",
        side === "left" ? "justify-start" : "justify-end",
        visible ? "conversation-bubble-in" : "invisible",
      ].join(" ")}
      data-conversation-kind={narration ? "narration" : "character"}
    >
      <div
        className={[
          "max-w-[88%] rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card sm:max-w-[80%]",
          side === "left" ? "rounded-tl-md" : "rounded-tr-md",
          narration ? "max-w-full border-dashed bg-surface-2 italic sm:max-w-full" : "",
        ].join(" ")}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
          {narration ? "NarraÃ§Ã£o" : `Fala de ${speakerName ?? "personagem"}`}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {textHidden ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="hanzi min-h-11 rounded-xl border border-dashed border-accent-soft bg-accent-soft/40 px-4 py-2 text-lg font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Revelar texto da fala depois de ouvir"
                aria-pressed={revealed}
              >
                OuÃ§a e toque para revelar
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
                {canRevealTranslation && !translationRevealed && (
                  <button
                    type="button"
                    className="mt-2 min-h-9 rounded-lg px-2 text-xs font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={() => setTranslationRevealed(true)}
                    aria-expanded={translationRevealed}
                  >
                    Ver traduÃ§Ã£o
                  </button>
                )}
                {canRevealTranslation && translationRevealed && (
                  <p className="mt-1.5 text-sm text-ink-soft" data-conversation-kind="translation">{line.pt}</p>
                )}
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
              <span className="self-center text-sm text-ink-faint">Toque nas peÃ§as para montar</span>
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
                d…4085 tokens truncated…  const nextId = current.interaction?.correctNextNodeId ?? current.nextNodeId;
      current = nextId ? nodeById.get(nextId) : undefined;
    }
    return ids;
  }, [entryNodeId, nodeById]);
  const [nodeId, setNodeId] = useState(entryNodeId);
  const [answering, setAnswering] = useState(false);
  const [spokenCount, setSpokenCount] = useState(1);
  const [hint, setHint] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<ConversationHistoryItem[]>([]);
  const [resumeReady, setResumeReady] = useState(false);
  const hadMistakeRef = useRef(false);
  const mistakeCountRef = useRef(0);
  const transitionsRef = useRef(0);
  const skipAutoSpeakRef = useRef(false);
  const sceneHeadingRef = useRef<HTMLHeadingElement>(null);
  const latestSnapshotRef = useRef<ConversationResumeSnapshot | null>(null);

  useEffect(() => {
    setResumeReady(false);
    const saved = readConversationResume(step.sceneId);
    const savedNodeIsValid = Boolean(saved?.nodeId && nodeById.has(saved.nodeId));
    setNodeId(savedNodeIsValid ? saved!.nodeId! : entryNodeId);
    setAnswering(savedNodeIsValid ? Boolean(saved?.answering) : false);
    setSpokenCount(savedNodeIsValid ? Math.max(1, saved?.spokenCount ?? 1) : 1);
    setHint(savedNodeIsValid ? saved?.hint ?? null : null);
    setHistoryItems(savedNodeIsValid ? saved?.history ?? [] : []);
    hadMistakeRef.current = savedNodeIsValid ? Boolean(saved?.hadMistake) : false;
    mistakeCountRef.current = savedNodeIsValid ? Math.max(0, saved?.mistakeCount ?? 0) : 0;
    transitionsRef.current = savedNodeIsValid ? Math.max(0, saved?.transitions ?? 0) : 0;
    skipAutoSpeakRef.current = false;
    setResumeReady(true);
  }, [entryNodeId, nodeById, step.sceneId]);

  useEffect(() => {
    skipAutoSpeakRef.current = false;
    if (!resumeReady) return;
    window.requestAnimationFrame(() => sceneHeadingRef.current?.focus({ preventScroll: true }));
  }, [nodeId, spokenCount, resumeReady]);

  const node = nodeById.get(nodeId) ?? nodes[0];
  const left = characters.find((c) => c.side === "left") ?? characters[0];
  const right = characters.find((c) => c.side === "right") ?? characters[1];
  const currentSpeaker = characters.find((character) => character.id === node?.speakerId);
  const currentHistoryId = node ? `node:${node.id}:${spokenCount}` : "";

  useEffect(() => {
    if (!resumeReady || !node) return;
    const speaker = characters.find((character) => character.id === node.speakerId);
    setHistoryItems((previous) => {
      if (previous.some((item) => item.id === currentHistoryId)) return previous;
      return [
        ...previous,
        {
          id: currentHistoryId,
          kind: speaker ? "character" : "narration",
          speaker: speaker?.name ?? "NarraÃ§Ã£o",
          hanzi: node.hanzi,
          pinyin: node.pinyin,
          pt: node.pt,
        } satisfies ConversationHistoryItem,
      ].slice(-30);
    });
  }, [characters, currentHistoryId, node, resumeReady]);

  useEffect(() => {
    if (!resumeReady || !step.sceneId) return;
    const snapshot: ConversationResumeSnapshot = {
      version: 2,
      sceneId: step.sceneId,
      nodeId,
      answering,
      spokenCount,
      hint,
      hadMistake: hadMistakeRef.current,
      mistakeCount: mistakeCountRef.current,
      transitions: transitionsRef.current,
      history: historyItems.slice(-30),
      updatedAt: Date.now(),
    };
    latestSnapshotRef.current = snapshot;
    writeConversationResume(snapshot);
  }, [answering, hint, historyItems, nodeId, resumeReady, spokenCount, step.sceneId]);

  useEffect(() => {
    const flush = () => {
      if (latestSnapshotRef.current) writeConversationResume({ ...latestSnapshotRef.current, updatedAt: Date.now() });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  function appendStudentAnswer(answer: string, status: "correct" | "wrong") {
    const attemptNumber = mistakeCountRef.current + (status === "correct" ? 1 : 0);
    setHistoryItems((previous) => [
      ...previous,
      {
        id: `answer:${nodeId}:${attemptNumber}:${status}`,
        kind: "student",
        speaker: "VocÃª",
        text: answer,
        status,
      } satisfies ConversationHistoryItem,
    ].slice(-30));
  }

  function finish() {
    const attempts = Math.max(1, mistakeCountRef.current + 1);
    clearConversationResume(step.sceneId);
    latestSnapshotRef.current = null;
    onDone(!hadMistakeRef.current, { attempts });
  }

  function goTo(targetId: string | undefined, speakTarget?: ConversationNode) {
    transitionsRef.current += 1;
    // Rede de seguranÃ§a: nunca deixa um grafo mal formado prender o aluno.
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
        <p className="mt-3 text-ink-soft">Esta cena ainda nÃ£o tem falas.</p>
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
  const total = Math.max(1, plannedNodeIds.length);
  const current = isTerminal ? total : Math.min(total, Math.max(1, spokenCount));
  const previousHistory = historyItems.filter((item) => item.id !== currentHistoryId);
  const stageLabel = answering ? "Sua vez" : hint ? "CorreÃ§Ã£o" : current === 1 ? "Nova cena" : isTerminal ? "Encerramento" : "Conversa";
  const stageDetail = answering
    ? "Escolha ou monte a resposta para continuar."
    : hint
      ? "A fala anterior trouxe uma pista; observe e tente de novo."
      : current === 1
        ? `${SETTING_LABELS[step.setting as keyof typeof SETTING_LABELS] ?? "CenÃ¡rio"} Â· ${currentSpeaker?.name ?? "NarraÃ§Ã£o"} comeÃ§a.`
        : isTerminal
          ? "Ãšltima fala antes do PÃ³s-Conversa."
          : `${currentSpeaker?.name ?? "NarraÃ§Ã£o"} estÃ¡ falando.`;

  return (
    <div className="conversation-stage min-w-0 pb-[env(safe-area-inset-bottom)]" data-testid="conversation-player">
      <Eyebrow>Cena de conversa</Eyebrow>
      <h2 ref={sceneHeadingRef} tabIndex={-1} className="mt-2 font-serif text-lg font-semibold text-ink outline-none sm:text-xl">{step.title}</h2>
      <div className="mt-3">
        <ConversationProgress current={current} total={total} label="Progresso da conversa" />
      </div>
      <ConversationStageNotice label={stageLabel} detail={stageDetail} />

      <div className="mt-3">
        <SettingBackdrop setting={step.setting} />
      </div>

      <div className="-mt-2 min-w-0 rounded-b-2xl border border-t-0 border-line bg-surface px-3 pb-4 pt-5 sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">Agora: {answering ? "vocÃª responde" : currentSpeaker?.name ?? "narraÃ§Ã£o"}</span>
          <span className="text-ink-faint">Fala atual {current}/{total}</span>
        </div>

        <ConversationHistory items={previousHistory} />

        <div className="mb-4 mt-4 flex items-end justify-between gap-4 px-1" aria-label="Personagens da cena">
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

        <div aria-live="polite" aria-atomic="true">
          <SpeechBubble
            key={`${step.sceneId}-${node.id}-${spokenCount}`}
            line={line}
            side={currentSpeaker?.side ?? "left"}
            visible
            variantLevel={step.conversationVariantLevel}
            speakerName={currentSpeaker?.name}
            narration={!currentSpeaker}
            autoSpeak={!skipAutoSpeakRef.current}
          />
        </div>

        {hint && !answering && (
          <div data-conversation-kind="hint" role="note" className="mt-3 rounded-xl border border-accent-soft bg-accent-soft/40 px-3 py-2 text-sm text-ink-soft">
            <span className="font-semibold text-accent">Pista:</span> {hint}
          </div>
        )}

        {!answering && (
          <div className="conversation-cta sticky bottom-0 z-10 -mx-1 mt-4 flex items-center justify-between gap-3 bg-gradient-to-t from-surface via-surface to-transparent px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-4">
            <span className="text-xs font-medium text-ink-faint">{isTerminal ? "Cena concluÃ­da" : node.interaction ? "Resposta necessÃ¡ria" : "PrÃ³xima fala"}</span>
            <Button className="min-h-12 min-w-[9.5rem] shadow-lift" onClick={advance}>
              {isTerminal ? "Ir ao PÃ³s-Conversa" : node.interaction ? "Responder" : "Continuar"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
        )}

        {answering && node.interaction && (
          <InteractionPanel
            interaction={node.interaction}
            onCorrect={(answer) => {
              appendStudentAnswer(answer, "correct");
              setHint(null);
              const nextId = node.interaction!.correctNextNodeId;
              goTo(nextId, nodeById.get(nextId));
            }}
            onWrongBranch={
              node.interaction.wrongNextNodeId
                ? () => {
                    const explanation = node.interaction!.explanation ?? null;
                    setHint(explanation);
                    if (explanation) {
                      setHistoryItems((previous) => [
                        ...previous,
                        {
                          id: `hint:${node.id}:${mistakeCountRef.current}`,
                          kind: "hint",
                          speaker: "Pista",
                          text: explanation,
                        } satisfies ConversationHistoryItem,
                      ].slice(-30));
                    }
                    const nextId = node.interaction!.wrongNextNodeId!;
                    goTo(nextId, nodeById.get(nextId));
                  }
                : undefined
            }
            onLocalMistake={(answer) => {
              // NÃ£o abre o modal de retry: a prÃ³pria cena corrige e continua.
              hadMistakeRef.current = true;
              mistakeCountRef.current += 1;
              appendStudentAnswer(answer, "wrong");
            }}
            onSkip={
              onSkip
                ? () => {
                    clearConversationResume(step.sceneId);
                    onSkip();
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

export function ConversationSceneStep({ step, onDone, onSkip, onMistake }: StepProps) {
  // Rollback: VITE_ENABLE_CONVERSATION_V2=false forÃ§a o player V1 (lines/checkpoint).
  // Progresso do usuÃ¡rio permanece intacto â€” sÃ³ muda o motor da cena.
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
  const [resumeReady, setResumeReady] = useState(false);
  const skipAutoSpeakRef = useRef(false);
  const sceneHeadingRef = useRef<HTMLHeadingElement>(null);
  const latestSnapshotRef = useRef<ConversationResumeSnapshot | null>(null);

  useEffect(() => {
    setResumeReady(false);
    const saved = readConversationResume(step.sceneId);
    const restoredIndex = Math.min(Math.max(0, saved?.lineIndex ?? 0), Math.max(0, lines.length - 1));
    setLineIndex(restoredIndex);
    setPhase(saved?.phase === "checkpoint" && checkpoint ? "checkpoint" : "dialogue");
    skipAutoSpeakRef.current = false;
    setResumeReady(true);
  }, [checkpoint, lines.length, step.sceneId, step.title]);

  useEffect(() => {
    skipAutoSpeakRef.current = false;
    if (!resumeReady) return;
    window.requestAnimationFrame(() => sceneHeadingRef.current?.focus({ preventScroll: true }));
  }, [lineIndex, phase, resumeReady]);

  const currentLine = lines[Math.min(lineIndex, Math.max(lines.length - 1, 0))];
  const activeSpeakerId = currentLine?.speakerId;
  const left = characters.find((c) => c.side === "left") ?? characters[0];
  const right = characters.find((c) => c.side === "right") ?? characters[1];
  const currentSpeaker = characters.find((character) => character.id === currentLine?.speakerId);
  const historyItems = lines.slice(0, lineIndex).map((line, index) => {
    const speaker = characters.find((character) => character.id === line.speakerId);
    return {
      id: `v1:${index}:${line.speakerId}`,
      kind: speaker ? "character" : "narration",
      speaker: speaker?.name ?? "NarraÃ§Ã£o",
      hanzi: line.hanzi,
      pinyin: line.pinyin,
      pt: line.pt,
    } satisfies ConversationHistoryItem;
  });

  useEffect(() => {
    if (!resumeReady || !step.sceneId) return;
    const snapshot: ConversationResumeSnapshot = {
      version: 2,
      sceneId: step.sceneId,
      lineIndex,
      phase,
      spokenCount: lineIndex + 1,
      hadMistake: false,
      mistakeCount: 0,
      transitions: lineIndex,
      history: historyItems.slice(-30),
      updatedAt: Date.now(),
    };
    latestSnapshotRef.current = snapshot;
    writeConversationResume(snapshot);
  }, [historyItems, lineIndex, phase, resumeReady, step.sceneId]);

  useEffect(() => {
    const flush = () => {
      if (latestSnapshotRef.current) writeConversationResume({ ...latestSnapshotRef.current, updatedAt: Date.now() });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  function complete(correct = true) {
    clearConversationResume(step.sceneId);
    latestSnapshotRef.current = null;
    onDone(correct);
  }

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
    complete(true);
  }

  if (lines.length === 0) {
    return (
      <div>
        <Eyebrow>Cena</Eyebrow>
        <p className="mt-3 text-ink-soft">Esta cena ainda nÃ£o tem falas.</p>
        <Button className="mt-4 w-full" onClick={() => complete(true)}>
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="conversation-stage min-w-0 pb-[env(safe-area-inset-bottom)]" data-testid="conversation-player">
      <Eyebrow>Cena de conversa</Eyebrow>
      <h2 ref={sceneHeadingRef} tabIndex={-1} className="mt-2 font-serif text-lg font-semibold text-ink outline-none sm:text-xl">{step.title}</h2>

      <div className="mt-3">
        <ConversationProgress current={phase === "checkpoint" ? lines.length : lineIndex + 1} total={lines.length} label="Progresso da conversa" />
      </div>
      <ConversationStageNotice
        label={phase === "checkpoint" ? "Sua vez" : lineIndex === 0 ? "Nova cena" : "Conversa"}
        detail={phase === "checkpoint" ? "Responda para seguir ao PÃ³s-Conversa." : `${currentSpeaker?.name ?? "NarraÃ§Ã£o"} estÃ¡ falando.`}
      />

      <div className="mt-3">
        <SettingBackdrop setting={step.setting} />
      </div>

      <div className="-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface px-3 pb-4 pt-5 sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">Agora: {phase === "checkpoint" ? "vocÃª responde" : currentSpeaker?.name ?? "narraÃ§Ã£o"}</span>
          <span className="text-ink-faint">Fala atual {Math.min(lineIndex + 1, lines.length)}/{lines.length}</span>
        </div>

        <ConversationHistory items={historyItems} />

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
            speakerName={currentSpeaker?.name}
            narration={!currentSpeaker}
            autoSpeak={!skipAutoSpeakRef.current}
          />
        )}

        {phase === "dialogue" && (
          <div className="conversation-cta sticky bottom-0 z-10 -mx-1 mt-4 flex items-center justify-between gap-3 bg-gradient-to-t from-surface via-surface to-transparent px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-4">
            <span className="text-xs font-medium text-ink-faint">
              Fala {lineIndex + 1} de {lines.length}
            </span>
            <Button className="min-h-12 min-w-[9.5rem] shadow-lift" onClick={advanceDialogue}>
              {lineIndex === lines.length - 1 && !checkpoint ? "Ir ao PÃ³s-Conversa" : "Continuar"} <IconChevron width={18} height={18} />
            </Button>
          </div>
        )}

        {phase === "checkpoint" && checkpoint && (
          <CheckpointPanel
            checkpoint={checkpoint}
            onMistake={onMistake}
            onDone={(correct) => complete(correct)}
            onSkip={onSkip ? () => { clearConversationResume(step.sceneId); onSkip(); } : undefined}
          />
        )}
      </div>
    </div>
  );
}

