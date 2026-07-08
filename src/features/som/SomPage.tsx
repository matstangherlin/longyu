import { useEffect, useMemo, useState } from "react";
import { TONE_SYLLABLES, TONE_COLOR, TONE_NAMES } from "../../data/tones";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import type { ItemType } from "../../data/types";
import {
  TONE_EXPLANATION,
  TONE_MARK,
  TONE_SHORT_LABEL,
  TONE_TRAINER_PACKS,
  MANDARIN_TONES,
  weakestToneFromProgress,
  type MandarinTone,
  type ToneTrainerPack,
  type ToneTrainerRound,
} from "../../data/toneTrainer";
import { useStore, type ActivityReviewTarget } from "../../lib/store";
import { hasChineseVoice, speak, stopSpeaking, warmUpVoices } from "../../lib/tts";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { playSoundFx } from "../../lib/soundFx";
import { stripPinyinTone } from "../../lib/pinyin";
import { ShortcutBadge, isTypingTarget, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { Card, Button, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { GlossText } from "../../components/hanzi/GlossText";
import { Pinyin } from "../../components/hanzi/Pinyin";
import {
  IconCheck,
  IconChevron,
  IconFlame,
  IconHeadphones,
  IconRefresh,
  IconSound,
  IconTarget,
  IconX,
} from "../../components/ui/Icon";
import { PinyinReference } from "./PinyinReference";
import { EngineGate } from "../../components/layout/EngineGate";
import { ProPaywall } from "../../components/pro/ProPaywall";

type ToneN = MandarinTone;

const TONES = MANDARIN_TONES;

interface ToneTrainerAnswer {
  roundId: string;
  tone: MandarinTone;
  selected: MandarinTone;
  correct: boolean;
}

export function SomPage() {
  const [syllableIdx, setSyllableIdx] = useState(0);
  const syllable = TONE_SYLLABLES[syllableIdx];

  return (
    <EngineGate track="som">
      <div className="space-y-8">
        <SectionTitle
          eyebrow="Competencia - Som"
          title="Treino de tons"
          desc="Ouça, compare, erre, repita e só marque domínio quando a nota mínima aparecer."
        />

        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink-soft">Sílaba:</span>
            {TONE_SYLLABLES.map((s, i) => (
              <button
                key={s.base}
                onClick={() => setSyllableIdx(i)}
                className={[
                  "rounded-full px-3 py-1 text-sm font-medium transition",
                  i === syllableIdx
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {s.base}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {syllable.forms.map((f) => (
              <Card key={f.tone} className="p-4 text-center">
                <ToneCurve tone={f.tone as ToneN} />
                <GlossText text={f.hanzi} className="mt-2 text-4xl text-ink" />
                <div
                  className="mt-1 font-serif text-xl"
                  style={{ color: TONE_COLOR[f.tone] }}
                >
                  <Pinyin text={f.pinyin} />
                </div>
                <div className="text-sm text-ink-soft">{f.meaningPt}</div>
                <div className="mt-1 text-[11px] text-ink-faint">
                  {TONE_NAMES[f.tone]}
                </div>
                <div className="mt-3 flex justify-center">
                  <SpeakButton text={f.hanzi} size="sm" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        <ToneTrainer />

        <PinyinReference />
      </div>
    </EngineGate>
  );
}

function ToneCurve({ tone }: { tone: ToneN }) {
  if (tone === 5) {
    return (
      <div className="mx-auto h-7 w-16 rounded-full border border-line bg-surface-2 text-[10px] font-semibold leading-7 text-ink-faint">
        leve
      </div>
    );
  }
  const paths: Record<ToneN, string> = {
    1: "M4 8 H44",
    2: "M4 20 L44 6",
    3: "M4 10 C14 26, 26 26, 44 8",
    4: "M4 6 L44 22",
    5: "",
  };
  return (
    <svg viewBox="0 0 48 28" className="mx-auto h-7 w-16" aria-hidden="true">
      <path
        d={paths[tone]}
        fill="none"
        stroke={TONE_COLOR[tone]}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ToneTrainer() {
  const toneTrainer = useStore((s) => s.toneTrainer);
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const recordToneTrainerAttempt = useStore((s) => s.recordToneTrainerAttempt);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const addMinutes = useStore((s) => s.addMinutes);
  const addQi = useStore((s) => s.addQi);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const soundEffects = useStore((s) => s.soundEffects);

  const [selectedPackId, setSelectedPackId] = useState(TONE_TRAINER_PACKS[0].id);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState<MandarinTone | null>(null);
  const [results, setResults] = useState<ToneTrainerAnswer[]>([]);
  const [errorsByTone, setErrorsByTone] = useState(emptyToneErrors);
  const [done, setDone] = useState(false);
  const [passed, setPassed] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [sessionCharged, setSessionCharged] = useState(false);
  const [energyPaywallOpen, setEnergyPaywallOpen] = useState(false);
  const [hasVoice, setHasVoice] = useState(true);

  const pack = TONE_TRAINER_PACKS.find((item) => item.id === selectedPackId) ?? TONE_TRAINER_PACKS[0];
  const currentRound = pack.rounds[Math.min(roundIndex, pack.rounds.length - 1)];
  const stats = toneTrainer[pack.id];
  const score = results.filter((item) => item.correct).length;
  const weakTone = weakestToneFromProgress(toneTrainer);
  const nextPack = TONE_TRAINER_PACKS.find((item) => item.order === pack.order + 1);
  const suggestedPack = useMemo(() => suggestedPackForErrors(errorsByTone), [errorsByTone]);
  const answered = picked !== null;
  const pickedCorrect = picked === currentRound.answerTone;
  const hadPriorToneError = (stats?.errorsByTone?.[currentRound.answerTone] ?? 0) > 0;
  const visibleFocusSyllable = answered ? currentRound.focusSyllable : stripPinyinTone(currentRound.focusSyllable);

  useEffect(() => {
    void warmUpVoices().then(() => setHasVoice(hasChineseVoice()));
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        playRoundAudio();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useExerciseHotkeys({
    enabled: !done,
    mode: "choice",
    optionCount: pack.options.length,
    isAnswered: answered,
    hasSelection: answered,
    onSelectOption: (index) => {
      const tone = pack.options[index];
      if (tone) answer(tone);
    },
    onContinue: nextRound,
  });

  function resetSession(packId = selectedPackId) {
    stopSpeaking();
    setSelectedPackId(packId);
    setRoundIndex(0);
    setPicked(null);
    setResults([]);
    setErrorsByTone(emptyToneErrors());
    setDone(false);
    setPassed(false);
    setRewarded(false);
    setSessionCharged(false);
  }

  function ensureTrainingCharge(): boolean {
    if (sessionCharged) return true;
    if (!consumeCharge("extra_training")) {
      setEnergyPaywallOpen(true);
      return false;
    }
    setSessionCharged(true);
    return true;
  }

  function playRoundAudio() {
    stopSpeaking();
    speak(currentRound.audioText, { rate: currentRound.kind === "phrase" ? 0.72 : 0.78 });
    recordDailyTask("audioHeard");
  }

  function gradeRound(round: ToneTrainerRound, correct: boolean) {
    const target = targetFromToneRound(round);
    if (!target) return;
    gradeReviewDomain({
      ensureSrs,
      gradeSrs,
      type: target.type,
      itemId: target.itemId,
      track: "som",
      domain: "som",
      grade: correct ? "good" : "again",
    });
  }

  function answer(tone: MandarinTone) {
    if (answered || done) return;
    if (!ensureTrainingCharge()) return;

    const correct = tone === currentRound.answerTone;
    const nextResult = {
      roundId: currentRound.id,
      tone: currentRound.answerTone,
      selected: tone,
      correct,
    };
    setPicked(tone);
    setResults((current) => [...current, nextResult]);
    if (!correct) {
      setErrorsByTone((current) => ({
        ...current,
        [currentRound.answerTone]: current[currentRound.answerTone] + 1,
      }));
      recordToneTrainerMistake(currentRound, tone, recordActivityError);
    }
    gradeRound(currentRound, correct);
    playSoundFx(correct ? "success" : "error", soundEffects);
    if (!correct) {
      window.setTimeout(() => speak(currentRound.audioText, { rate: 0.72 }), 220);
    }
  }

  function nextRound() {
    if (!answered) return;
    if (roundIndex + 1 >= pack.requiredRounds) {
      finishSession();
      return;
    }
    stopSpeaking();
    setRoundIndex((current) => current + 1);
    setPicked(null);
  }

  function finishSession() {
    const finalScore = results.filter((item) => item.correct).length;
    const passedNow = finalScore >= pack.minimumCorrect;
    const firstCompletion = passedNow && !stats?.completed;
    recordToneTrainerAttempt({
      packId: pack.id,
      totalRounds: pack.requiredRounds,
      correct: finalScore,
      passed: passedNow,
      errorsByTone,
    });
    addMinutes("som", passedNow ? 7 : 5);
    if (firstCompletion) {
      addQi(pack.rewardQi, "tone_trainer");
      playSoundFx("qiGain", soundEffects);
    } else {
      playSoundFx(passedNow ? "success" : "blocked", soundEffects);
    }
    stopSpeaking();
    setPassed(passedNow);
    setRewarded(firstCompletion);
    setDone(true);
  }

  if (done) {
    return (
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex min-h-[520px] flex-col p-5 text-center sm:p-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            {passed ? <IconCheck width={30} height={30} /> : <IconRefresh width={30} height={30} />}
          </div>
          <Pill tone={passed ? "good" : "accent"} className="mx-auto mt-4">
            {passed ? "Pack concluído" : "Nota insuficiente"}
          </Pill>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-ink">
            {score}/{pack.requiredRounds}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            {passed
              ? `Você bateu a nota mínima de ${pack.minimumCorrect}/${pack.requiredRounds}.`
              : `Meta: ${pack.minimumCorrect}/${pack.requiredRounds}. Refaça para consolidar antes de avançar.`}
          </p>
          {rewarded && (
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
              <IconFlame width={17} height={17} />
              +{pack.rewardQi} Qi
            </div>
          )}

          <div className="mx-auto mt-6 grid w-full max-w-md grid-cols-4 gap-2">
            {TONES.map((tone) => (
              <ToneMiniStat
                key={tone}
                label={TONE_SHORT_LABEL[tone]}
                value={`${errorsByTone[tone]} erro(s)`}
                active={errorsByTone[tone] > 0}
              />
            ))}
          </div>

          {!passed && suggestedPack && (
            <div className="mx-auto mt-5 max-w-md rounded-2xl border border-accent-soft bg-accent-soft/45 px-4 py-3 text-left">
              <div className="text-sm font-semibold text-ink">Sugestão</div>
              <p className="mt-1 text-sm leading-5 text-ink-soft">
                Refazer {suggestedPack.shortTitle} ajuda a atacar o tom mais instável desta tentativa.
              </p>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => resetSession(pack.id)}>
              Refazer pack
              <IconRefresh width={18} height={18} />
            </Button>
            {passed && nextPack && (
              <Button size="lg" variant="soft" onClick={() => resetSession(nextPack.id)}>
                Próximo pack
                <IconChevron width={18} height={18} />
              </Button>
            )}
          </div>
        </Card>
        <TonePackList selectedPackId={pack.id} onSelect={resetSession} />
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex min-h-[560px] flex-col overflow-hidden p-0">
        <div className="border-b border-line bg-surface-2/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="accent">Pack {pack.order}</Pill>
                <Pill>{pack.shortTitle}</Pill>
                <Pill tone={stats?.completed ? "good" : "muted"}>
                  {stats?.completed ? "concluído" : `${pack.minimumCorrect}/${pack.requiredRounds} mínimo`}
                </Pill>
              </div>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-ink">
                {pack.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{pack.focus}</p>
            </div>
            <div className="min-w-28 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Rodada
              </div>
              <div className="font-serif text-2xl font-semibold text-ink">
                {roundIndex + 1}/{pack.requiredRounds}
              </div>
            </div>
          </div>
          <ProgressBar value={roundIndex + (answered ? 1 : 0)} max={pack.requiredRounds} className="mt-4" />
        </div>

        <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-start">
            <div className="rounded-2xl border border-line bg-surface-2/70 px-4 py-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-accent-soft text-accent shadow-card">
                <IconHeadphones width={38} height={38} />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Ouça e escolha o tom
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <GlossText text={currentRound.displayText} className="hanzi text-3xl font-semibold text-ink" />
                {answered ? (
                  <Pinyin text={currentRound.pinyin} className="font-serif text-2xl text-accent" />
                ) : (
                  <span className="font-serif text-2xl font-semibold text-ink-soft">{visibleFocusSyllable}</span>
                )}
              </div>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
                Foco em "{visibleFocusSyllable}"{answered ? ` - ${currentRound.meaningPt}` : ""}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={playRoundAudio}>
                  <IconSound width={19} height={19} />
                  Ouvir
                </Button>
                <Button size="lg" variant="soft" onClick={playRoundAudio}>
                  <IconRefresh width={18} height={18} />
                  Repetir
                </Button>
              </div>
              {!hasVoice && (
                <p className="mt-3 text-xs leading-5 text-ink-faint">
                  Se o áudio não tocar, ative uma voz chinesa nas configurações do navegador.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1">
              <ToneMiniStat label="Nota" value={`${score}/${pack.requiredRounds}`} active={score >= pack.minimumCorrect} />
              <ToneMiniStat label="Melhor" value={stats ? `${stats.bestScore}/${stats.bestTotal}` : "-"} />
              <ToneMiniStat label="Fraco" value={weakTone ? TONE_SHORT_LABEL[weakTone] : "estável"} active={Boolean(weakTone)} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pack.options.map((tone, index) => (
              <ToneOptionButton
                key={tone}
                tone={tone}
                shortcut={shortcutKeyForIndex(index)}
                disabled={answered}
                state={
                  !answered
                    ? "idle"
                    : tone === currentRound.answerTone
                    ? "right"
                    : tone === picked
                    ? "wrong"
                    : "idle"
                }
                onClick={() => answer(tone)}
              />
            ))}
          </div>

          {answered && (
            <div
              className={[
                "mt-5 rounded-2xl border px-4 py-4",
                pickedCorrect
                  ? "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.1)]"
                  : "border-wrong/25 bg-wrong-soft/70",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    pickedCorrect ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" : "bg-wrong text-white",
                  ].join(" ")}
                >
                  {pickedCorrect ? <IconCheck width={20} height={20} /> : <IconX width={20} height={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {pickedCorrect ? (hadPriorToneError ? "Corrigido!" : "Certo!") : `Resposta correta: ${TONE_SHORT_LABEL[currentRound.answerTone]}`}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {pickedCorrect ? currentRound.explanation : `${TONE_EXPLANATION[currentRound.answerTone]} ${currentRound.explanation}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <Pinyin text={currentRound.pinyin} className="font-serif text-lg text-accent" />
                    <span className="text-ink-soft">{currentRound.meaningPt}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="hidden text-xs font-medium text-ink-faint sm:inline">
              Atalhos: 1-9 para responder, Enter para avançar e espaço para repetir.
            </span>
            <Button size="lg" className="w-full sm:w-auto" disabled={!answered} onClick={nextRound}>
              {roundIndex + 1 >= pack.requiredRounds ? "Ver nota" : "Próxima"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
        </div>
      </Card>

      <TonePackList selectedPackId={pack.id} onSelect={resetSession} />
      <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
    </section>
  );
}

function TonePackList({
  selectedPackId,
  onSelect,
}: {
  selectedPackId: string;
  onSelect: (packId: string) => void;
}) {
  const toneTrainer = useStore((s) => s.toneTrainer);
  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold text-ink">Packs progressivos</h3>
          <p className="text-sm leading-5 text-ink-soft">Prática livre; a jornada usa a nota mínima.</p>
        </div>
        <IconTarget width={22} height={22} className="text-accent" />
      </div>
      <div className="grid gap-2">
        {TONE_TRAINER_PACKS.map((pack) => (
          <TonePackButton
            key={pack.id}
            pack={pack}
            active={pack.id === selectedPackId}
            stats={toneTrainer[pack.id]}
            onSelect={() => onSelect(pack.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function TonePackButton({
  pack,
  active,
  stats,
  onSelect,
}: {
  pack: ToneTrainerPack;
  active: boolean;
  stats?: { bestScore: number; bestTotal: number; completed: boolean; attempts: number };
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left shadow-card transition hover:-translate-y-0.5",
        active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Pack {pack.order}
            </span>
            {stats?.completed && <IconCheck width={15} height={15} className="text-[rgb(var(--good))]" />}
          </div>
          <div className="mt-1 font-semibold leading-tight text-ink">{pack.shortTitle}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{pack.focus}</div>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-xs font-semibold text-ink-soft">
          {stats ? `${stats.bestScore}/${stats.bestTotal}` : `${pack.minimumCorrect}/${pack.requiredRounds}`}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-ink-faint">
        <span>{pack.options.map((tone) => toneMarkLabel(tone)).join(" ")}</span>
        <span>{stats?.attempts ? `${stats.attempts} tentativa(s)` : "novo"}</span>
      </div>
    </button>
  );
}

function ToneOptionButton({
  tone,
  state,
  disabled = false,
  shortcut,
  onClick,
}: {
  tone: MandarinTone;
  state: "idle" | "right" | "wrong";
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state !== "idle"}
      aria-label={shortcut ? `Opção ${shortcut}: ${TONE_SHORT_LABEL[tone]}` : TONE_SHORT_LABEL[tone]}
      className={[
        "relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-4 text-center transition active:scale-[.98] sm:min-h-28",
        state === "idle" && "border-line bg-surface hover:border-accent-soft hover:bg-surface-2",
        state === "right" && "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.12)]",
        state === "wrong" && "border-wrong/30 bg-wrong-soft",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {shortcut && <ShortcutBadge className="absolute left-2 top-2">{shortcut}</ShortcutBadge>}
      <span
        className={tone === 5 ? "text-base font-semibold leading-none" : "font-serif text-4xl font-semibold leading-none"}
        style={{ color: TONE_COLOR[tone] }}
      >
        {toneMarkLabel(tone)}
      </span>
      <ToneCurve tone={tone} />
      <span className="text-sm font-semibold text-ink">{TONE_SHORT_LABEL[tone]}</span>
    </button>
  );
}

function ToneMiniStat({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className={[
      "rounded-2xl border px-3 py-3",
      active ? "border-accent-soft bg-accent-soft/45" : "border-line bg-surface",
    ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function emptyToneErrors(): Record<MandarinTone, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function targetFromItemRef(ref: ToneTrainerRound["itemRef"]): { type: ItemType; itemId: string } | null {
  if (!ref) return null;
  const [type, itemId] = ref.split(":");
  if (!itemId || (type !== "char" && type !== "chunk")) return null;
  return { type, itemId };
}

const HANZI_PUNCTUATION_RE = /[，。！？、,.!?\s：；;“”"（）()]/g;

function cleanMandarinText(value: string | undefined): string {
  return (value ?? "").replace(HANZI_PUNCTUATION_RE, "");
}

function targetFromToneRound(round: ToneTrainerRound): { type: ItemType; itemId: string } | null {
  const explicit = targetFromItemRef(round.itemRef);
  if (explicit) return explicit;

  const clean = cleanMandarinText(round.audioText || round.displayText);
  const chunk = CHUNKS.find((item) => cleanMandarinText(item.hanzi) === clean);
  if (chunk) return { type: "chunk", itemId: chunk.id };

  const char = CHARACTERS.find((item) => item.hanzi === clean || item.hanzi === cleanMandarinText(round.displayText));
  return char ? { type: "char", itemId: char.id } : null;
}

function toneReviewTargets(target: { type: ItemType; itemId: string }): ActivityReviewTarget[] {
  return [
    { type: target.type, itemId: target.itemId, domain: "som", track: "som" },
    { type: target.type, itemId: target.itemId, domain: "pinyin", track: "som" },
  ];
}

function recordToneTrainerMistake(
  round: ToneTrainerRound,
  selectedTone: MandarinTone,
  recordActivityError: ReturnType<typeof useStore.getState>["recordActivityError"]
) {
  const target = targetFromToneRound(round);
  if (!target) return;
  const now = Date.now();
  const hanzi = cleanMandarinText(round.displayText) || cleanMandarinText(round.audioText);
  recordActivityError({
    id: `tone-review:${round.id}:${now}`,
    lessonId: "pinyin-lab",
    moduleId: "pinyin-lab",
    phaseId: "lab",
    taskId: "tone-trainer",
    questionId: round.id,
    exerciseId: `tone-trainer:${round.id}`,
    type: "tone-review",
    prompt: `Ouça ${round.displayText} e escolha o tom de ${round.focusSyllable}.`,
    correctAnswer: TONE_SHORT_LABEL[round.answerTone],
    selectedAnswer: TONE_SHORT_LABEL[selectedTone],
    topic: "tons",
    tokens: [hanzi, round.pinyin, round.focusSyllable, TONE_SHORT_LABEL[round.answerTone]],
    hanzi,
    pinyin: round.pinyin,
    meaningPt: round.meaningPt,
    explanation: `${TONE_EXPLANATION[round.answerTone]} ${round.explanation}`,
    mistakeReason: "tone-review",
    timestamp: now,
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: "som",
    targets: toneReviewTargets(target),
  });
}

function suggestedPackForErrors(errors: Record<MandarinTone, number>): ToneTrainerPack | null {
  const weakest = TONES.reduce<MandarinTone | null>((best, tone) => {
    if (!best) return errors[tone] > 0 ? tone : null;
    return errors[tone] > errors[best] ? tone : best;
  }, null);
  if (!weakest) return null;
  if (weakest === 1 || weakest === 4) return TONE_TRAINER_PACKS.find((pack) => pack.id === "tone-1-vs-4") ?? null;
  if (weakest === 2 || weakest === 3) return TONE_TRAINER_PACKS.find((pack) => pack.id === "tone-2-vs-3") ?? null;
  if (weakest === 5) return TONE_TRAINER_PACKS.find((pack) => pack.id === "tone-neutral") ?? null;
  return TONE_TRAINER_PACKS.find((pack) => pack.id === "tone-all-isolated") ?? null;
}

function toneMarkLabel(tone: MandarinTone): string {
  return TONE_MARK[tone] || "sem marca";
}
