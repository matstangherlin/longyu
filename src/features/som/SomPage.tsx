import { useEffect, useMemo, useState } from "react";
import { JourneyHandoffBanner } from "../../components/journey/JourneyHandoffBanner";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  packAnswerOptions,
  type MandarinTone,
  type ToneTrainerPack,
  type ToneTrainerRound,
} from "../../data/toneTrainer";
import { useStore, type ActivityReviewTarget } from "../../lib/store";
import { hasChineseVoice, stopSpeaking, warmUpVoices } from "../../lib/tts";
import { playMandarinAudio } from "../../lib/audioPlayback";

function speak(text: string, options: { rate?: number } = {}) {
  void playMandarinAudio(String(text ?? ""), { rate: options.rate, source: "TONE" });
}
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { playSoundFx } from "../../lib/soundFx";
import { stripPinyinTone } from "../../lib/pinyin";
import { ShortcutBadge, isTypingTarget, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { Card, Button, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { GlossText } from "../../components/hanzi/GlossText";
import { Pinyin } from "../../components/hanzi/Pinyin";
import {
  IconCheck,
  IconChevron,
  IconFlame,
  IconRefresh,
  IconSound,
  IconTarget,
  IconX,
} from "../../components/ui/Icon";
import { PinyinReference } from "./PinyinReference";
import { EngineGate } from "../../components/layout/EngineGate";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { ToneContour } from "../../components/tone/ToneContour";
import { ToneMicrolesson } from "../../components/tone/ToneMicrolesson";
import { useFocusActivity, useIsFocusActivity } from "../../lib/focusActivity";
import { toneKnowledge, type MandarinToneNumber } from "../../data/toneKnowledge";
import { tonesNeedingMicrolesson } from "../../lib/toneMicrolesson";
import { getJourneyNode, type JourneyNode } from "../../data/journeyOrchestrator";
import { completeJourneyNode } from "../../lib/journeyNodeProgress";
import { useTranslation } from "../../i18n/useTranslation";

type ToneN = MandarinTone;

const TONES = MANDARIN_TONES;

interface ToneTrainerAnswer {
  roundId: string;
  tone: MandarinTone;
  selected: MandarinTone | string;
  correct: boolean;
}

export function SomPage() {
  const { instructionLocale } = useTranslation();
  const focus = useIsFocusActivity();
  const [searchParams] = useSearchParams();
  const journeyNode = getJourneyNode(searchParams.get("journeyNode"));
  const [syllableIdx, setSyllableIdx] = useState(0);
  const syllable = TONE_SYLLABLES[syllableIdx];

  return (
    <EngineGate track="som">
      <div className="space-y-8">
        <JourneyHandoffBanner source="TONE_TRAINER" />
        {!focus && <SectionTitle
          eyebrow={instructionLocale === "en" ? "Skill · Sound" : "Competência · Som"}
          title={journeyNode ? (instructionLocale === "en" ? "Journey Tone Trainer" : "Tone Trainer da Jornada") : instructionLocale === "en" ? "Tone training" : "Treino de tons"}
          desc={journeyNode
            ? instructionLocale === "en" ? "Only contours already taught in the Journey appear here." : "Aqui aparecem somente contornos já ensinados na Jornada."
            : instructionLocale === "en" ? "Listen, compare, retry, and consolidate each contour." : "Ouça, compare, erre, repita e consolide cada contorno."}
        />}

        {!journeyNode && !focus && <section>
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
                <ToneContour tone={f.tone as ToneN} mode="MID" locale={instructionLocale} />
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
        </section>}

        <ToneTrainer journeyNode={journeyNode?.type === "TONE_TRAINER" ? journeyNode : undefined} />

        {!focus && <PinyinReference />}
      </div>
    </EngineGate>
  );
}

export function ToneTrainer({ journeyNode }: { journeyNode?: JourneyNode } = {}) {
  const navigate = useNavigate();
  const { instructionLocale } = useTranslation();
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

  const [selectedPackId, setSelectedPackId] = useState(journeyNode?.sourceId ?? TONE_TRAINER_PACKS[0].id);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState<MandarinTone | string | null>(null);
  const [results, setResults] = useState<ToneTrainerAnswer[]>([]);
  const [errorsByTone, setErrorsByTone] = useState(emptyToneErrors);
  const [errorsByInitial, setErrorsByInitial] = useState<Record<string, number>>({});
  const [confusions, setConfusions] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [passed, setPassed] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [sessionCharged, setSessionCharged] = useState(false);
  const [energyPaywallOpen, setEnergyPaywallOpen] = useState(false);
  const [hasVoice, setHasVoice] = useState(true);
  // RC2.2.24 — hub (escolher) ≠ atividade (focus). Vindo da Jornada, já começa.
  const [started, setStarted] = useState(Boolean(journeyNode));
  // A rodada (e a microaula) é FOCUS MODE: sem TopBar/TabBar/hub em volta.
  useFocusActivity(started && !done);
  // RC2.2.23 — tom novo: microaula (um conceito por tela) antes da 1ª rodada.
  const [microlessonsSeen, setMicrolessonsSeen] = useState<Set<string>>(() => new Set());

  const sourcePack = TONE_TRAINER_PACKS.find((item) => item.id === selectedPackId) ?? TONE_TRAINER_PACKS[0];
  const pack = useMemo(() => {
    if (!journeyNode?.allowedTones?.length) return sourcePack;
    const allowed = new Set(journeyNode.allowedTones);
    const filtered = sourcePack.rounds.filter((round) => allowed.has(round.answerTone));
    const requiredRounds = Math.max(1, Math.min(journeyNode.maxQuestions ?? filtered.length, filtered.length));
    return {
      ...sourcePack,
      id: journeyNode.id,
      title: instructionLocale === "en" ? "Journey Tone Trainer" : "Tone Trainer da Jornada",
      shortTitle: journeyNode.mode === "CONTOUR_INTRO" ? "1 × 3" : "1–4",
      focus: instructionLocale === "en"
        ? journeyNode.mode === "CONTOUR_INTRO"
          ? "Distinguish the level contour from the dip using only taught tones."
          : "Recall tone numbers after all four contours have been taught."
        : journeyNode.mode === "CONTOUR_INTRO"
          ? "Diferencie a curva reta do vale usando apenas tons ensinados."
          : "Recupere os números depois de aprender as quatro curvas.",
      options: journeyNode.allowedTones,
      rounds: filtered.slice(0, requiredRounds),
      requiredRounds,
      minimumCorrect: Math.max(1, Math.ceil(requiredRounds * 0.75)),
      rewardQi: 0,
    };
  }, [instructionLocale, journeyNode, sourcePack]);
  const currentRound = pack.rounds[Math.min(roundIndex, pack.rounds.length - 1)];
  const stats = toneTrainer[pack.id];
  const score = results.filter((item) => item.correct).length;
  const nextPack = TONE_TRAINER_PACKS.find((item) => item.order === pack.order + 1);
  const suggestedPack = useMemo(() => suggestedPackForErrors(errorsByTone), [errorsByTone]);
  const answered = picked !== null;
  const consonantPack = pack.kind === "consonant";
  const answerOptions = packAnswerOptions(pack);
  const pickedCorrect = consonantPack ? picked === currentRound.answerInitial : picked === currentRound.answerTone;
  const weakInitial = consonantPack
    ? (Object.entries(errorsByInitial).sort((a, b) => b[1] - a[1])[0] ?? null)
    : null;
  const topConfusion = consonantPack
    ? (Object.entries(confusions).sort((a, b) => b[1] - a[1])[0] ?? null)
    : null;
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
    optionCount: answerOptions.length,
    isAnswered: answered,
    hasSelection: answered,
    onSelectOption: (index) => {
      const value = answerOptions[index];
      if (value != null) answer(value);
    },
    onContinue: nextRound,
  });

  function resetSession(packId = selectedPackId, startNow = false) {
    stopSpeaking();
    setStarted(startNow || Boolean(journeyNode));
    setSelectedPackId(packId);
    setRoundIndex(0);
    setPicked(null);
    setResults([]);
    setErrorsByTone(emptyToneErrors());
    setErrorsByInitial({});
    setConfusions({});
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

  function answer(value: MandarinTone | string) {
    if (answered || done) return;
    if (!ensureTrainingCharge()) return;

    const correct = consonantPack ? value === currentRound.answerInitial : value === currentRound.answerTone;
    const nextResult = {
      roundId: currentRound.id,
      tone: currentRound.answerTone,
      selected: value,
      correct,
    };
    setPicked(value);
    setResults((current) => [...current, nextResult]);
    if (!correct) {
      if (consonantPack) {
        const correctInitial = currentRound.answerInitial ?? "";
        const selectedInitial = String(value);
        // Conta o som que o aluno falhou em reconhecer (não a opção errada).
        if (correctInitial) {
          setErrorsByInitial((current) => ({
            ...current,
            [correctInitial]: (current[correctInitial] ?? 0) + 1,
          }));
          const confusionKey = `${correctInitial}->${selectedInitial}`;
          setConfusions((current) => ({
            ...current,
            [confusionKey]: (current[confusionKey] ?? 0) + 1,
          }));
        }
        recordConsonantMistake(currentRound, selectedInitial, recordActivityError);
      } else {
        setErrorsByTone((current) => ({
          ...current,
          [currentRound.answerTone]: current[currentRound.answerTone] + 1,
        }));
        recordToneTrainerMistake(currentRound, value as MandarinTone, recordActivityError);
      }
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
    const grantsReward = firstCompletion && pack.rewardQi > 0;
    recordToneTrainerAttempt({
      packId: pack.id,
      totalRounds: pack.requiredRounds,
      correct: finalScore,
      passed: passedNow,
      errorsByTone: consonantPack ? emptyToneErrors() : errorsByTone,
    });
    addMinutes("som", passedNow ? 7 : 5);
    if (grantsReward) {
      addQi(pack.rewardQi, "tone_trainer");
      playSoundFx("qiGain", soundEffects);
    } else {
      playSoundFx(passedNow ? "success" : "blocked", soundEffects);
    }
    stopSpeaking();
    setPassed(passedNow);
    setRewarded(grantsReward);
    setDone(true);
    if (passedNow && journeyNode) completeJourneyNode(journeyNode.id);
  }

  const microlessonTone =
    started && !journeyNode && !done && !consonantPack && roundIndex === 0 && results.length === 0
      ? tonesNeedingMicrolesson(pack.options, toneTrainer).find((tone) => !microlessonsSeen.has(`${pack.id}:${tone}`)) ?? null
      : null;
  if (microlessonTone !== null) {
    const markSeen = (all: boolean) =>
      setMicrolessonsSeen((current) => {
        const nextSeen = new Set(current);
        for (const tone of all ? pack.options : [microlessonTone]) nextSeen.add(`${pack.id}:${tone}`);
        return nextSeen;
      });
    return (
      <section className="py-2">
        <ToneMicrolesson key={`${pack.id}:${microlessonTone}`} tone={microlessonTone} onDone={() => markSeen(false)} onSkip={() => markSeen(true)} />
      </section>
    );
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
            {consonantPack
              ? (pack.consonantOptions ?? []).map((initial) => (
                  <ToneMiniStat
                    key={initial}
                    label={initial}
                    value={`${errorsByInitial[initial] ?? 0} erro(s)`}
                    active={(errorsByInitial[initial] ?? 0) > 0}
                  />
                ))
              : TONES.map((tone) => (
                  <ToneMiniStat
                    key={tone}
                    label={TONE_SHORT_LABEL[tone]}
                    value={`${errorsByTone[tone]} erro(s)`}
                    active={errorsByTone[tone] > 0}
                  />
                ))}
          </div>

          {!passed && (consonantPack ? weakInitial || topConfusion : suggestedPack) && (
            <div className="mx-auto mt-5 max-w-md rounded-2xl border border-accent-soft bg-accent-soft/45 px-4 py-3 text-left">
              <div className="text-sm font-semibold text-ink">Sugestão</div>
              <p className="mt-1 text-sm leading-5 text-ink-soft">
                {consonantPack
                  ? topConfusion
                    ? `Você está confundindo ${topConfusion[0].replace("->", " com ")}. O som inicial mais instável foi "${weakInitial?.[0] ?? topConfusion[0].split("->")[0]}".`
                    : `O som inicial mais instável foi "${weakInitial?.[0] ?? "—"}". Refaça o pack prestando atenção nele.`
                  : `Refazer ${suggestedPack?.shortTitle} ajuda a atacar o tom mais instável desta tentativa.`}
              </p>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => resetSession(pack.id, true)}>
              Refazer pack
              <IconRefresh width={18} height={18} />
            </Button>
            {!journeyNode && passed && nextPack && (
              <Button size="lg" variant="soft" onClick={() => resetSession(nextPack.id)}>
                Próximo pack
                <IconChevron width={18} height={18} />
              </Button>
            )}
            {journeyNode?.returnToJourney && (
              <Button size="lg" variant="outline" onClick={() => navigate("/jornada") }>
                {instructionLocale === "en" ? "Back to Journey" : "Voltar à Jornada"}
              </Button>
            )}
          </div>
        </Card>
        {!journeyNode && <TonePackList selectedPackId={pack.id} onSelect={resetSession} />}
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </section>
    );
  }

  // RC2.2.24 — HUB: escolher o treino e COMEÇAR. Nada de rodada aqui.
  if (!started) {
    return (
      <section className="space-y-4" data-tone-trainer-hub>
        <Card className="p-5 text-center" data-testid="tone-trainer-selected">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{pack.shortTitle}</div>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">{pack.title}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">{pack.focus}</p>
          <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={() => setStarted(true)} data-testid="tone-trainer-start">
            Começar
          </Button>
        </Card>
        <TonePackList selectedPackId={pack.id} onSelect={resetSession} />
        <ProPaywall open={energyPaywallOpen} kind="energy" onClose={() => setEnergyPaywallOpen(false)} />
      </section>
    );
  }

  // RC2.2.24 — FOCUS MODE da rodada: X · progresso · som · [Ouvir][Repetir] ·
  // opções grandes · feedback curto · [Próxima]. Nota/Melhor/Fraco, pack,
  // mínimo, descrição longa, lista de packs e atalhos ficam fora da resposta.
  const contour = !consonantPack ? (currentRound.answerTone as MandarinToneNumber) : null;
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col px-1 py-2" data-tone-trainer-focus data-tone-round={roundIndex + 1}>
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Sair do treino"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2"
          onClick={() => (journeyNode ? navigate("/jornada") : resetSession(pack.id))}
          data-testid="tone-trainer-exit"
        >
          <IconX width={22} height={22} />
        </button>
        <ProgressBar value={roundIndex + (answered ? 1 : 0)} max={pack.requiredRounds} className="flex-1" />
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint" data-testid="tone-round-counter">
          {roundIndex + 1}/{pack.requiredRounds}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-ink-soft">{consonantPack ? "Ouça o som inicial" : "Ouça o som"}</p>
        <div className="mt-3 font-serif text-5xl font-semibold text-ink" data-testid="tone-round-syllable">
          {answered ? <Pinyin text={currentRound.pinyin} className="text-accent" /> : visibleFocusSyllable}
        </div>
        <div className="mt-5 flex gap-3">
          <Button size="lg" onClick={playRoundAudio} data-testid="tone-round-listen">
            <IconSound width={19} height={19} />
            Ouvir
          </Button>
          <Button size="lg" variant="soft" onClick={playRoundAudio}>
            <IconRefresh width={18} height={18} />
            Repetir
          </Button>
        </div>
        {!hasVoice && <p className="mt-3 text-xs leading-5 text-ink-faint">Sem voz chinesa: ative uma nas configurações.</p>}

        <div className={["mt-6 grid w-full gap-3", answerOptions.length <= 2 ? "grid-cols-2" : "grid-cols-2"].join(" ")} data-testid="tone-round-options">
          {consonantPack
            ? (pack.consonantOptions ?? []).map((initial) => (
                <ConsonantOptionButton
                  key={initial}
                  initial={initial}
                  disabled={answered}
                  state={!answered ? "idle" : initial === currentRound.answerInitial ? "right" : initial === picked ? "wrong" : "idle"}
                  onClick={() => answer(initial)}
                />
              ))
            : pack.options.map((tone) => (
                <ToneOptionButton
                  key={tone}
                  tone={tone}
                  disabled={answered}
                  state={!answered ? "idle" : tone === currentRound.answerTone ? "right" : tone === picked ? "wrong" : "idle"}
                  assessmentMode={journeyNode?.mode === "TONE_NUMBER" && !answered}
                  locale={instructionLocale}
                  onClick={() => answer(tone)}
                />
              ))}
        </div>

        {answered && (
          <div className="mt-5 w-full text-center" role="status" data-testid="tone-round-feedback" data-correct={pickedCorrect ? "yes" : "no"}>
            <p className={["text-base font-semibold", pickedCorrect ? "text-[rgb(var(--good))]" : "text-wrong"].join(" ")}>
              {pickedCorrect ? "✓ " : ""}
              {consonantPack ? currentRound.answerInitial : TONE_SHORT_LABEL[currentRound.answerTone]}
              {!consonantPack && contour ? ` — ${toneKnowledge(contour).learnerDescriptionPt}` : ""}
            </p>
            {contour && contour !== 5 && <ToneContour tone={contour} guided className="mx-auto mt-2 max-w-[220px]" />}
          </div>
        )}
      </div>

      <Button size="lg" className="sticky bottom-3 mt-4 w-full shadow-lift" disabled={!answered} onClick={nextRound} data-testid="tone-round-next">
        {roundIndex + 1 >= pack.requiredRounds ? "Ver resultado" : "Próxima"}
        <IconChevron width={18} height={18} />
      </Button>
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
        <span>
          {pack.kind === "consonant"
            ? (pack.consonantOptions ?? []).join(" · ")
            : pack.options.map((tone) => toneMarkLabel(tone)).join(" ")}
        </span>
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
  assessmentMode = false,
  locale = "pt-BR",
  onClick,
}: {
  tone: MandarinTone;
  state: "idle" | "right" | "wrong";
  disabled?: boolean;
  shortcut?: string;
  assessmentMode?: boolean;
  locale?: "pt-BR" | "en";
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
      {shortcut && <ShortcutBadge className="shrink-0">{shortcut}</ShortcutBadge>}
      <span
        className={tone === 5 ? "text-base font-semibold leading-none" : "font-serif text-4xl font-semibold leading-none"}
        style={{ color: TONE_COLOR[tone] }}
      >
        {toneMarkLabel(tone)}
      </span>
      <ToneContour tone={tone} mode={assessmentMode ? "ASSESSMENT" : "MID"} locale={locale} />
      <span className="text-sm font-semibold text-ink">{TONE_SHORT_LABEL[tone]}</span>
    </button>
  );
}

function ConsonantOptionButton({
  initial,
  state,
  disabled = false,
  shortcut,
  onClick,
}: {
  initial: string;
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
      aria-label={shortcut ? `Opção ${shortcut}: ${initial}` : initial}
      className={[
        "relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-4 text-center transition active:scale-[.98] sm:min-h-28",
        state === "idle" && "border-line bg-surface hover:border-accent-soft hover:bg-surface-2",
        state === "right" && "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.12)]",
        state === "wrong" && "border-wrong/30 bg-wrong-soft",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {shortcut && <ShortcutBadge className="shrink-0">{shortcut}</ShortcutBadge>}
      <span className="font-serif text-4xl font-semibold leading-none text-accent">{initial}</span>
      <span className="text-sm font-semibold text-ink">{initial === "ü" ? "ü (arredondado)" : initial}</span>
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

function recordConsonantMistake(
  round: ToneTrainerRound,
  selectedInitial: string,
  recordActivityError: ReturnType<typeof useStore.getState>["recordActivityError"]
) {
  const target = targetFromToneRound(round);
  if (!target) return;
  const now = Date.now();
  const hanzi = cleanMandarinText(round.displayText) || cleanMandarinText(round.audioText);
  recordActivityError({
    id: `consonant-review:${round.id}:${now}`,
    lessonId: "pinyin-lab",
    moduleId: "pinyin-lab",
    phaseId: "lab",
    taskId: "tone-trainer",
    questionId: round.id,
    exerciseId: `consonant-trainer:${round.id}`,
    type: "tone-review",
    prompt: `Ouça ${round.displayText} e escolha o som inicial.`,
    correctAnswer: round.answerInitial ?? "?",
    selectedAnswer: selectedInitial,
    topic: "consoantes",
    tokens: [hanzi, round.pinyin, round.answerInitial ?? ""],
    hanzi,
    pinyin: round.pinyin,
    meaningPt: round.meaningPt,
    explanation: round.explanation,
    mistakeReason: "consonant-review",
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
