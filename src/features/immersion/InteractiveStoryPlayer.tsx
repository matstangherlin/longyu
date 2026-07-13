import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlossText } from "../../components/hanzi/GlossText";
import { ImageChoiceGrid } from "../../components/hanzi/ImageChoiceGrid";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { Mascot } from "../../components/brand/Mascot";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { Button, Card, ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconChevron, IconHeadphones, IconPath, IconRefresh, IconTarget } from "../../components/ui/Icon";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { useProOffer } from "../../hooks/useProOffer";
import type { InteractiveStory, StoryCharacter, StoryStep } from "../../data/interactiveStories";
import { storyStepCountsAsPhrasePractice } from "../../lib/missionHelpers";
import { playSoundFx } from "../../lib/soundFx";
import { useStore, type ActivityErrorRecord, type StoryEnergyResult } from "../../lib/store";
import { stopSpeaking } from "../../lib/tts";
import { KeyboardShortcutHint, ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import {
  flattenStorySteps,
  storyAnswerMatches,
  storyAnswerText,
  storySkill,
  storyStepIsInteractive,
  updateStoredStoryProgress,
  type StoredStoryProgress,
} from "./interactiveStoryHelpers";

const SETTING_BACKDROP: Record<string, string> = {
  street: "from-sky-100 via-surface to-amber-50",
  classroom: "from-indigo-50 via-surface to-surface-2",
  cafe: "from-amber-50 via-orange-50/60 to-surface",
  forest: "from-emerald-100 via-green-50/80 to-surface",
  park: "from-lime-50 via-emerald-50/70 to-sky-50",
  home: "from-rose-50 via-surface to-amber-50/50",
};

function backdropClass(setting: string, backdrop?: string): string {
  const key = backdrop ?? setting.toLowerCase();
  for (const [token, classes] of Object.entries(SETTING_BACKDROP)) {
    if (key.includes(token)) return classes;
  }
  return "from-surface-2 via-surface to-surface";
}

function characterForStep(characters: StoryCharacter[], speaker?: string): StoryCharacter | undefined {
  if (!speaker) return undefined;
  const normalized = speaker.toLocaleLowerCase("pt-BR");
  return (
    characters.find((entry) => entry.name.toLocaleLowerCase("pt-BR") === normalized) ??
    characters.find((entry) => entry.id === normalized) ??
    characters.find((entry) => normalized.includes(entry.name.toLocaleLowerCase("pt-BR")))
  );
}

function StoryStat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "gold" }) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface px-3 py-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div
        className={[
          "mt-1 text-lg font-semibold",
          tone === "accent" ? "text-accent" : tone === "gold" ? "text-gold" : "text-ink",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export function InteractiveStoryPlayer({
  story,
  progress,
  onClose,
  onProgressChange,
}: {
  story: InteractiveStory;
  progress?: StoredStoryProgress;
  onClose: () => void;
  onProgressChange: () => void;
}) {
  const navigate = useNavigate();
  const steps = useMemo(() => flattenStorySteps(story), [story]);
  const soundEffects = useStore((state) => state.soundEffects);
  const gradeSrs = useStore((state) => state.gradeSrs);
  const recordActivityError = useStore((state) => state.recordActivityError);
  const completeImmersionSession = useStore((state) => state.completeImmersionSession);
  const grantStoryEnergy = useStore((state) => state.grantStoryEnergy);
  const recordDailyTask = useStore((state) => state.recordDailyTask);
  const contextualOffer = useProOffer();
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!progress || progress.completed) return 0;
    const completedIds = new Set(progress.completedStepIds);
    const next = steps.findIndex((entry) => !completedIds.has(entry.id));
    return next >= 0 ? next : 0;
  });
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [answerResults, setAnswerResults] = useState<Record<string, boolean>>({});
  const [victory, setVictory] = useState<{
    score: number;
    total: number;
    awarded: boolean;
    xp: number;
    qi: number;
    energy: StoryEnergyResult | null;
  } | null>(null);

  const step = steps[currentIndex];
  const interactiveTotal = steps.filter((entry) => storyStepIsInteractive(entry)).length;

  useEffect(() => () => stopSpeaking(), []);

  if (!step) return null;

  const interactive = storyStepIsInteractive(step);
  const completedValue = victory ? steps.length : Math.min(steps.length, currentIndex + (revealed || !interactive ? 1 : 0));
  const supportVisible = !step.noHint || revealed || !interactive;
  const showHanzi =
    Boolean(step.hanzi) &&
    (step.kind !== "listen_choice" || revealed) &&
    !(step.kind === "fill_hanzi" && step.noHint && !revealed);
  const activeCharacter = characterForStep(step.characters, step.speaker);
  const isPlayerTurn = step.speaker?.toLocaleLowerCase("pt-BR").includes("você") ?? false;

  function markStepComplete(stepId: string) {
    updateStoredStoryProgress(story.id, (previous) => ({
      completedStepIds: Array.from(new Set([...(previous?.completedStepIds ?? []), stepId])),
      completed: previous?.completed ?? false,
      bestScore: previous?.bestScore ?? 0,
      attempts: previous?.attempts ?? 0,
      updatedAt: Date.now(),
    }));
    onProgressChange();
  }

  function recordStoryError(currentStep: StoryStep, userAnswer: string) {
    if (!currentStep.reviewTarget) return;
    const error: ActivityErrorRecord = {
      id: `story:${story.id}:${currentStep.id}:${Date.now()}`,
      lessonId: `story:${story.id}`,
      moduleId: story.moduleId ?? "immersion-stories",
      phaseId: "interactive-story",
      taskId: currentStep.id,
      questionId: currentStep.id,
      exerciseId: currentStep.id,
      type: currentStep.kind,
      prompt: currentStep.promptPt ?? currentStep.hanzi ?? story.title,
      correctAnswer: storyAnswerText(currentStep),
      selectedAnswer: userAnswer,
      topic: story.title,
      tokens: [currentStep.hanzi, currentStep.pinyin].filter((token): token is string => Boolean(token)),
      hanzi: currentStep.hanzi,
      pinyin: currentStep.pinyin,
      meaningPt: currentStep.translationPt,
      explanation: currentStep.explanationPt,
      timestamp: Date.now(),
      skill: storySkill(currentStep),
      targets: [currentStep.reviewTarget],
    };
    recordActivityError(error);
  }

  function gradeStoryTarget(currentStep: StoryStep, correct: boolean) {
    const target = currentStep.reviewTarget;
    if (!target) return;
    gradeSrs(target.type, target.itemId, correct ? "good" : "again", target.track, target.domain);
  }

  function submitAnswer(answer: string) {
    if (!interactive || revealed) return;
    const cleanAnswer = answer.trim();
    if (!cleanAnswer) return;
    const correct = storyAnswerMatches(step, cleanAnswer);
    setSelectedAnswer(cleanAnswer);
    setLastCorrect(correct);
    setRevealed(true);
    setAnswerResults((current) => ({ ...current, [step.id]: correct }));
    markStepComplete(step.id);
    gradeStoryTarget(step, correct);
    if (!correct) recordStoryError(step, cleanAnswer);
    if (storyStepCountsAsPhrasePractice(step.kind)) recordDailyTask("phrasesSpoken");
    playSoundFx(correct ? "success" : "error", soundEffects);
  }

  function resetStepState(nextIndex: number) {
    setCurrentIndex(nextIndex);
    setSelectedAnswer("");
    setRevealed(false);
    setLastCorrect(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishStory() {
    const score = Object.values(answerResults).filter(Boolean).length;
    updateStoredStoryProgress(story.id, (previous) => ({
      completedStepIds: steps.map((entry) => entry.id),
      completed: true,
      bestScore: Math.max(previous?.bestScore ?? 0, score),
      attempts: (previous?.attempts ?? 0) + 1,
      updatedAt: Date.now(),
    }));
    const listenSteps = steps.filter((entry) => entry.kind === "listen_choice").length;
    const awarded = completeImmersionSession(`story:${story.id}`, {
      audioHeard: Math.max(1, listenSteps),
      microtextsRead: 1,
      leituraMinutes: story.estimatedMinutes ?? 4,
      rewardXp: story.rewardXp,
      rewardQi: story.rewardQi,
      source: `História: ${story.title}`,
      isPremiumStory: Boolean(story.premium),
    });
    const energy = awarded ? grantStoryEnergy(story.id) : null;
    playSoundFx(awarded ? "lessonComplete" : "success", soundEffects);
    onProgressChange();
    setVictory({ score, total: interactiveTotal, awarded, xp: story.rewardXp, qi: story.rewardQi, energy });
    if (awarded) {
      contextualOffer.consider({ storyCompleted: true, storyPremium: Boolean(story.premium) });
    }
  }

  function continueStory() {
    if (interactive && !revealed) return;
    markStepComplete(step.id);
    if (currentIndex >= steps.length - 1) {
      finishStory();
      return;
    }
    resetStepState(currentIndex + 1);
  }

  function repeatStory() {
    setVictory(null);
    setAnswerResults({});
    resetStepState(0);
  }

  function optionClass(option: string): string {
    if (!revealed) {
      return selectedAnswer === option
        ? "border-accent bg-accent-soft text-accent"
        : "border-line bg-surface text-ink hover:border-accent/50 hover:bg-surface-2";
    }
    if (storyAnswerMatches(step, option)) return "border-[rgb(var(--good)/0.45)] bg-[rgb(var(--good)/0.10)] text-[rgb(var(--good))]";
    if (selectedAnswer === option && !lastCorrect) return "border-[#B42318]/45 bg-[#B42318]/10 text-[#B42318]";
    return "border-line bg-surface-2 text-ink-soft";
  }

  const storyOptions = step.options ?? [];
  const imageOptions = step.kind === "image_choice" ? step.imageOptions ?? [] : [];

  useExerciseHotkeys({
    enabled: Boolean(victory) || (interactive && step.kind !== "fill_pinyin" && (storyOptions.length > 0 || imageOptions.length > 0)),
    mode: "story",
    optionCount: storyOptions.length || imageOptions.length,
    isAnswered: Boolean(victory) || revealed,
    hasSelection: Boolean(victory) || Boolean(selectedAnswer),
    allowNumberKeys: !victory,
    onSelectOption: (index) => {
      const option = storyOptions[index] ?? imageOptions[index];
      if (option) submitAnswer(option);
    },
    onContinue: victory ? onClose : continueStory,
  });

  if (victory) {
    const energyGranted = Boolean(victory.energy?.granted);
    return (
      <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
        <Mascot size={126} variant="celebrate" className="mx-auto" />
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-accent">História concluída</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{story.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">Você praticou em contexto e mandou os pontos fracos para revisão.</p>
        <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
          <StoryStat label="Acertos" value={`${victory.score}/${victory.total}`} />
          <StoryStat label="XP" value={victory.awarded ? `+${victory.xp}` : "—"} tone="accent" />
          <StoryStat label="Qi" value={victory.awarded ? `+${victory.qi}` : "—"} tone="gold" />
        </div>
        {energyGranted ? (
          <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--good)/0.3)] bg-[rgb(var(--good)/0.08)] px-4 py-3 text-sm font-semibold text-[rgb(var(--good))]">
            <IconHeadphones width={16} height={16} /> +1 carga extra hoje
          </div>
        ) : victory.awarded && victory.energy?.reason === "limit" ? (
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-faint">
            Você já ganhou o máximo de {victory.energy.cap} cargas por histórias hoje.
          </p>
        ) : victory.awarded && victory.energy?.reason === "pro" ? (
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-faint">No Pro suas cargas já são ilimitadas.</p>
        ) : !victory.awarded ? (
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-faint">
            Você já concluiu esta história hoje — a recompensa é uma vez por dia.
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onClose}>
            Continuar Imersão <IconChevron width={18} height={18} />
          </Button>
          <Button variant="outline" onClick={() => navigate("/jornada")}>
            <IconPath width={18} height={18} /> Voltar à Jornada
          </Button>
        </div>
        <button
          type="button"
          onClick={repeatStory}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint transition hover:text-ink-soft"
        >
          <IconRefresh width={14} height={14} /> Repetir história
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          onClose();
        }}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <IconChevron className="rotate-180" width={18} height={18} /> Histórias de Imersão
      </button>

      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            Nível {story.level} · {step.setting} · {story.estimatedMinutes ?? 4} min
          </div>
          <h1 className="mt-1 font-serif text-[1.5rem] font-semibold leading-tight text-ink">{story.title}</h1>
        </div>
        <div className="text-xs font-medium text-ink-faint">
          {currentIndex + 1}/{steps.length}
        </div>
      </header>

      <div>
        <div className="mb-2 flex justify-between text-xs text-ink-faint">
          <span>{interactive ? "Responda em contexto" : "Leia e ouça"}</span>
          <span>Cena {step.sceneId}</span>
        </div>
        <ProgressBar value={completedValue} max={steps.length} />
      </div>

      <Card className="overflow-hidden rounded-xl border-line/70 p-0 shadow-none">
        <div className={["bg-gradient-to-b px-3.5 py-4 sm:px-5 sm:py-5", backdropClass(step.setting, step.characters[0]?.id)].join(" ")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            {step.characters
              .filter((entry) => entry.side !== "right")
              .slice(0, 2)
              .map((character) => (
                <div key={character.id} className="flex flex-col items-center gap-1">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: character.color ?? "#0d9488" }}
                  >
                    {character.name.slice(0, 1)}
                  </span>
                  <span className="text-[10px] font-semibold text-ink-soft">{character.name}</span>
                </div>
              ))}
            <div className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{step.setting}</div>
            {step.characters
              .filter((entry) => entry.side === "right")
              .slice(0, 1)
              .map((character) => (
                <div key={character.id} className="flex flex-col items-center gap-1">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: character.color ?? "#2563eb" }}
                  >
                    {character.name.slice(0, 1)}
                  </span>
                  <span className="text-[10px] font-semibold text-ink-soft">{character.name}</span>
                </div>
              ))}
          </div>

          <div className="space-y-3">
            <div className={`conversation-bubble-in flex ${isPlayerTurn ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[92%] rounded-[22px] px-4 py-3 sm:max-w-[85%]",
                  isPlayerTurn ? "rounded-tr-md bg-accent text-white" : "rounded-tl-md border border-line/60 bg-surface/95",
                ].join(" ")}
              >
                <div className={`text-xs font-semibold ${isPlayerTurn ? "text-white/80" : "text-ink-soft"}`}>
                  {step.speaker ?? (interactive ? "Sua vez" : "Narrador")}
                </div>
                {step.promptPt && (
                  <p className={`mt-1 text-sm leading-6 ${isPlayerTurn ? "text-white" : "text-ink"}`}>{step.promptPt}</p>
                )}
              </div>
            </div>

            {step.kind === "listen_choice" && (
              <div className="conversation-bubble-in ml-0 flex items-center gap-3 rounded-[22px] rounded-tl-md border border-line/60 bg-surface/95 px-4 py-3 sm:ml-6">
                <div>
                  <div className="text-sm font-semibold text-ink">Ouça a frase</div>
                  <p className="mt-1 text-xs text-ink-soft">Depois escolha a opção certa.</p>
                </div>
                {step.hanzi && <SpeakButton text={step.hanzi} label="Ouvir frase" size="lg" />}
              </div>
            )}

            {showHanzi && step.hanzi && step.kind !== "image_choice" && (
              <div className="conversation-bubble-in mx-auto max-w-md rounded-[26px] border border-line/70 bg-surface px-4 py-5 text-center shadow-sm">
                <div className="flex justify-center">
                  <GlossText
                    text={step.hanzi}
                    pinyin={supportVisible ? step.pinyin : undefined}
                    meaning={supportVisible ? step.translationPt : undefined}
                    className="hanzi text-4xl leading-tight text-ink sm:text-5xl"
                    speakOnClick={!step.noHint || revealed}
                    examMode={step.noHint && !revealed}
                    disabled={step.noHint && !revealed}
                  />
                </div>
                {supportVisible && step.pinyin && (
                  <Pinyin text={step.pinyin} className="mt-4 block font-serif text-xl leading-relaxed text-ink-soft" />
                )}
                {supportVisible && step.translationPt && (
                  <div className="mt-3 text-sm text-ink-soft">{step.translationPt}</div>
                )}
                {step.hanzi && step.kind !== "listen_choice" && (
                  <div className="mt-3">
                    <SpeakButton text={step.hanzi} label="Ouvir frase" />
                  </div>
                )}
              </div>
            )}

            {step.kind === "image_choice" && imageOptions.length > 0 && (
              <div className="conversation-bubble-in rounded-[22px] border border-line/60 bg-surface/95 p-4">
                <div className="text-sm font-semibold text-ink">{step.promptPt}</div>
                {step.targetMeaningPt && <p className="mt-1 text-xs text-ink-soft">{step.targetMeaningPt}</p>}
                <div className="mt-4">
                  <ImageChoiceGrid
                    mode="images"
                    options={imageOptions}
                    imageOptionIds={imageOptions}
                    answered={revealed ? selectedAnswer : null}
                    selected={selectedAnswer || null}
                    correctAnswer={storyAnswerText(step)}
                    onSelect={(value) => {
                      if (!revealed) submitAnswer(value);
                    }}
                  />
                </div>
              </div>
            )}

            {interactive && step.kind !== "image_choice" && storyOptions.length > 0 && (
              <div>
                <KeyboardShortcutHint />
                <div className="mt-3 grid gap-2">
                  {storyOptions.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      disabled={revealed}
                      onClick={() => submitAnswer(option)}
                      aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
                      className={[
                        "relative min-h-11 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                        optionClass(option),
                      ].join(" ")}
                    >
                      <ShortcutBadge className="absolute left-2 top-2">{shortcutKeyForIndex(index)}</ShortcutBadge>
                      <span className="block pl-0 sm:pl-5">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {revealed && (
              <div
                className={[
                  "rounded-xl border px-4 py-3 text-sm leading-6",
                  lastCorrect
                    ? "border-[rgb(var(--good)/0.35)] bg-[rgb(var(--good)/0.08)] text-ink"
                    : "border-[#B42318]/35 bg-[#B42318]/10 text-ink",
                ].join(" ")}
                role="status"
              >
                <div className="flex items-center gap-2 font-semibold">
                  {lastCorrect ? <IconCheck width={18} height={18} /> : <IconTarget width={18} height={18} />}
                  {lastCorrect ? "Certo" : "Quase"}
                </div>
                {!lastCorrect && (
                  <div className="mt-2">
                    Resposta esperada: <span className="font-semibold">{storyAnswerText(step)}</span>
                  </div>
                )}
                {step.explanationPt && <div className="mt-2 text-ink-soft">{step.explanationPt}</div>}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={currentIndex === 0} onClick={() => resetStepState(Math.max(0, currentIndex - 1))}>
          <IconChevron className="rotate-180" width={18} height={18} /> Voltar
        </Button>
        <Button disabled={interactive && !revealed} onClick={continueStory}>
          {currentIndex >= steps.length - 1 ? "Concluir" : "Continuar"}
          <IconChevron width={18} height={18} />
        </Button>
      </div>

      {activeCharacter && (
        <p className="text-center text-xs text-ink-faint">
          Personagens nesta cena: {step.characters.map((entry) => entry.name).join(" · ")}
        </p>
      )}

      <ProPaywall
        open={contextualOffer.open}
        kind={contextualOffer.offer?.paywallKind ?? "story"}
        offer={contextualOffer.offer}
        onClose={contextualOffer.dismiss}
      />
    </div>
  );
}
