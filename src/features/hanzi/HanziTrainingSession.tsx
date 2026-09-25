import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CHARACTERS } from "../../data/characters";
import { builderPrerequisitesMet, type HanziBuilder } from "../../data/hanziBuilder";
import { PEARL_HANZI_MILESTONES } from "../../data/economy";
import { buildMissionViews, type MissionView } from "../../data/missions";
import { todayKey } from "../../lib/storage";
import { useStore } from "../../lib/store";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { playSoundFx } from "../../lib/soundFx";
import { haptic } from "../../lib/haptics";
import { useTapThroughGuard } from "../../lib/useTapThroughGuard";
import {
  HANZI_PRACTICE_ROUND,
  hanziPracticeRoundKey,
  paidRoundsToday,
  practiceRoundSlice,
  practiceRoundXp,
  type HanziPracticeMode,
} from "../../lib/hanziPracticeRounds";
import { HanziBuilderExercise } from "../../components/hanzi/HanziBuilderExercise";
import { PracticeCompletion, type PracticeMissionProgress } from "../../components/hanzi/PracticeCompletion";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconX } from "../../components/ui/Icon";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { LessonActionRegionProvider } from "../lesson/LessonActionRegion";
import { useTranslation } from "../../i18n/useTranslation";
import {
  BUILDERS_BY_MODE,
  charIdByHanzi,
  hanziModeMeta,
  makeMeaningQuestion,
  makePiecesQuestion,
  type HanziQuizQuestion,
} from "./hanziTrainingModes";

type Completion = {
  roundKey: string;
  correct: number;
  total: number;
  xp: number;
  xpCapped: boolean;
  pearls: number;
  missions: PracticeMissionProgress[];
  formsReviewed: number;
};

function missionSnapshot(): MissionView[] {
  const state = useStore.getState();
  return buildMissionViews("daily", state.getMissionAggregates(), state.dailyTasks?.claimedMissions ?? {});
}

function hanziMilestonesClaimed(): Set<string> {
  const claimed = useStore.getState().pearlMilestonesClaimed ?? {};
  return new Set(PEARL_HANZI_MILESTONES.map((m) => m.id).filter((id) => Boolean((claimed as Record<string, unknown>)[id])));
}

/**
 * RC2.2.14 · AD–AV — treino de hànzì em modo foco: rodadas de até 8 itens,
 * progresso "1/8", sem TopBar/TabBar (AppShell entra em foco com ?mode=),
 * Verificar fixo acima da área segura e fim de rodada com recompensas reais.
 */
export function HanziTrainingSession({ mode }: { mode: HanziPracticeMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const meta = hanziModeMeta(mode);
  const accountId = useStore((s) => s.currentAccountId);
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const addMinutes = useStore((s) => s.addMinutes);
  const soundEffects = useStore((s) => s.soundEffects);
  const recordDailyTask = useStore((s) => s.recordDailyTask);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const recordActivityError = useStore((s) => s.recordActivityError);
  const grantPracticeRoundXp = useStore((s) => s.grantPracticeRoundXp);
  const maybeClaimPearls = useStore((s) => s.maybeClaimPearlMilestonesFromProgress);
  const learnedCharIds = useStore((s) => s.learnedChars);
  const builderProgress = useStore((s) => s.hanziBuilderProgressByChar);

  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [region, setRegion] = useState<HTMLDivElement | null>(null);
  const formsRef = useRef(0);
  const roundStartRef = useRef<{ round: number; missions: MissionView[]; pearls: Set<string>; charged: boolean } | null>(null);
  const [sessionId] = useState(() => Date.now().toString(36));
  const finishingRef = useRef(false);

  // Mesmo corte do treino livre: composição só depois das bases vistas.
  const seenGlyphs = useMemo(() => {
    const learned = new Set(learnedCharIds);
    const set = new Set(CHARACTERS.filter((char) => learned.has(char.id)).map((char) => char.hanzi));
    for (const [char, progress] of Object.entries(builderProgress)) {
      if (progress.correct > 0) set.add(char);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o corte é fixado por rodada
  }, [round]);

  const builders: HanziBuilder[] = useMemo(() => {
    if (meta.kind !== "builder") return [];
    const all = BUILDERS_BY_MODE[mode as keyof typeof BUILDERS_BY_MODE] ?? [];
    const gated = all.filter((builder) => builderPrerequisitesMet(builder, seenGlyphs));
    return practiceRoundSlice(gated.length > 0 ? gated : all, round);
  }, [meta.kind, mode, round, seenGlyphs]);

  const questions: HanziQuizQuestion[] = useMemo(() => {
    if (meta.kind !== "quiz") return [];
    return Array.from({ length: HANZI_PRACTICE_ROUND }, () => (mode === "meaning" ? makeMeaningQuestion() : makePiecesQuestion()));
  }, [meta.kind, mode, round]);

  const total = meta.kind === "builder" ? builders.length : questions.length;

  // Uma carga por rodada. A chave é da sessão + rodada: um re-render ou o
  // efeito duplo do StrictMode não cobra de novo (consumeCharge é idempotente).
  useEffect(() => {
    if (roundStartRef.current?.round === round) return;
    const charged = consumeCharge("extra_training", `hanzi-practice-start:${accountId}:${mode}:${sessionId}:${round}`);
    roundStartRef.current = { round, missions: missionSnapshot(), pearls: hanziMilestonesClaimed(), charged };
    formsRef.current = 0;
    if (!charged) setBlocked(true);
  }, [accountId, consumeCharge, mode, round, sessionId]);

  function gradeForm(itemId: string | undefined, domain: "forma" | "significado", ok: boolean) {
    if (!itemId) return;
    gradeReviewDomain({ ensureSrs, gradeSrs, type: "char", itemId, track: "hanzi", domain, grade: ok ? "good" : "again" });
    formsRef.current += 1;
  }

  function finishRound(finalCorrect: number) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const date = todayKey();
    const keys = useStore.getState().dailyTasks?.practiceRewardKeys ?? [];
    const paid = paidRoundsToday(keys, accountId, mode, date);
    const xpAmount = practiceRoundXp(finalCorrect, paid);
    const roundKey = hanziPracticeRoundKey(accountId, mode, date, paid + 1);
    const granted = xpAmount > 0 ? grantPracticeRoundXp(roundKey, xpAmount) : false;
    addMinutes("hanzi", 4);
    maybeClaimPearls();
    const before = roundStartRef.current;
    const after = missionSnapshot();
    const missions: PracticeMissionProgress[] = after
      .filter((mission) => {
        const prev = before?.missions.find((item) => item.id === mission.id);
        return prev != null && mission.progress > prev.progress && !mission.claimed;
      })
      .map((mission) => ({ id: mission.id, title: mission.title, progress: mission.progress, goal: mission.goal, complete: mission.complete }));
    const newPearlMilestones = [...hanziMilestonesClaimed()].filter((id) => !before?.pearls.has(id));
    const pearls = PEARL_HANZI_MILESTONES.filter((m) => newPearlMilestones.includes(m.id)).reduce((sum, m) => sum + m.pearls, 0);
    playSoundFx(finalCorrect >= Math.ceil(total * 0.8) ? "streak" : "success", soundEffects);
    setCompletion({
      roundKey: `${roundKey}:${granted ? "paid" : "free"}:${round}`,
      correct: finalCorrect,
      total,
      xp: granted ? xpAmount : 0,
      xpCapped: !granted && finalCorrect > 0,
      pearls,
      missions,
      formsReviewed: formsRef.current,
    });
  }

  function next(ok: boolean) {
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    if (index + 1 >= total) {
      finishRound(nextCorrect);
      return;
    }
    setIndex((value) => value + 1);
  }

  function nextRound() {
    finishingRef.current = false;
    setCompletion(null);
    setIndex(0);
    setCorrect(0);
    setBlocked(false);
    setRound((value) => value + 1);
  }

  // Toque duplo em "Continuar treinando"/"Próximo" não responde o item novo.
  useTapThroughGuard(`${round}:${index}:${completion ? "done" : "play"}`, "[data-hanzi-content], [data-hanzi-action-region]");

  const exit = () => navigate("/ideogramas");

  if (blocked) {
    return (
      <FocusFrame title={t(meta.titleKey)} onExit={exit}>
        <p className="mt-10 text-center text-sm text-ink-soft">{t("hanziHub.noCharges")}</p>
        <ProPaywall open kind="energy" onClose={exit} />
      </FocusFrame>
    );
  }

  if (completion) {
    return (
      <FocusFrame title={t(meta.titleKey)} onExit={exit}>
        <PracticeCompletion {...completion} onContinue={nextRound} />
      </FocusFrame>
    );
  }

  return (
    <LessonActionRegionProvider target={region}>
      <FocusFrame
        title={t(meta.titleKey)}
        onExit={exit}
        progress={{ value: index + 1, max: Math.max(1, total) }}
        footer={<div ref={setRegion} data-lesson-action-region data-hanzi-action-region className="empty:hidden" />}
      >
        {meta.kind === "builder" && builders[index] && (
          <HanziBuilderExercise
            key={`${round}:${builders[index]!.id}`}
            builder={builders[index]!}
            density="compact"
            onWrong={() => {
              const builder = builders[index]!;
              gradeForm(charIdByHanzi.get(builder.character), "forma", false);
              recordBuilderError(builder, recordActivityError);
            }}
            onCorrect={(firstTry) => {
              const builder = builders[index]!;
              gradeForm(charIdByHanzi.get(builder.character), "forma", true);
              recordDailyTask("hanziDecomposed");
              next(firstTry !== false);
            }}
            continueLabel={index + 1 >= total ? t("hanziHub.finishRound") : t("hanziHub.next")}
          />
        )}
        {meta.kind === "quiz" && questions[index] && (
          <QuizItem
            key={`${round}:${index}`}
            question={questions[index]!}
            onAnswer={(ok) => {
              const question = questions[index]!;
              gradeForm(question.char.id, question.kind === "meaning" ? "significado" : "forma", ok);
              if (question.kind === "pieces") recordDailyTask("hanziDecomposed");
              playSoundFx(ok ? "success" : "task", soundEffects);
              haptic(ok ? "answerCorrect" : "answerWrong");
              window.setTimeout(() => next(ok), 850);
            }}
          />
        )}
      </FocusFrame>
    </LessonActionRegionProvider>
  );
}

function FocusFrame({
  title,
  onExit,
  progress,
  footer,
  children,
}: {
  title: string;
  onExit: () => void;
  progress?: { value: number; max: number };
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="hanzi-training" data-hanzi-focus>
      <header className="shrink-0 bg-bg/95 px-3 pb-2 pt-[max(0.25rem,var(--app-safe-top))] backdrop-blur" data-testid="hanzi-training-header">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            aria-label={t("hanziHub.exitTraining")}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
          >
            <IconX width={18} height={18} />
          </button>
          {progress ? (
            <>
              <ProgressBar value={progress.value} max={progress.max} className="h-2.5 min-w-0 flex-1" />
              <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint" data-hanzi-progress>
                {progress.value}/{progress.max}
              </span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title}</span>
          )}
        </div>
        {progress && <div className="mt-0.5 truncate pl-14 text-[11px] font-medium text-ink-faint">{title}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-5" data-hanzi-content>
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-line/70 bg-[rgb(var(--bg)/0.98)] pb-[var(--app-safe-bottom)]">{footer}</div>
      )}
    </div>
  );
}

/** Só em build de QA/E2E: marca a opção certa para o teste de recompensas. */
const QA_FIXTURES = (import.meta as { env?: Record<string, unknown> }).env?.VITE_USE_TEST_FIXTURES === "true";

function QuizItem({ question, onAnswer }: { question: HanziQuizQuestion; onAnswer: (ok: boolean) => void }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-4 pt-4 text-center" data-hanzi-quiz={question.kind}>
      <h2 className="font-serif text-xl font-semibold text-ink">
        {question.kind === "meaning" ? t("hanziHub.quizMeaning") : question.prompt}
      </h2>
      <div>
        <div className="hanzi text-7xl text-ink">{question.char.hanzi}</div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <Pinyin text={question.char.pinyin} className="font-serif text-lg" />
          <SpeakButton text={question.char.hanzi} size="sm" />
        </div>
      </div>
      <div className="grid w-full max-w-md gap-2">
        {question.options.map((option) => {
          const state = picked == null ? "idle" : option === question.answer ? "right" : option === picked ? "wrong" : "idle";
          return (
            <button
              key={option}
              type="button"
              data-hanzi-option
              data-state={state}
              data-qa-correct={QA_FIXTURES ? String(option === question.answer) : undefined}
              disabled={picked != null}
              onClick={() => {
                if (picked) return;
                setPicked(option);
                onAnswer(option === question.answer);
              }}
              className={[
                "flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                state === "idle" && "border-line bg-surface hover:bg-surface-2",
                state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)] text-ink",
                state === "wrong" && "border-transparent bg-accent-soft text-ink",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{option}</span>
              {state === "right" && <IconCheck width={18} height={18} className="text-[rgb(var(--good))]" />}
              {state === "wrong" && <IconX width={18} height={18} className="text-accent" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function recordBuilderError(
  builder: HanziBuilder,
  recordActivityError: ReturnType<typeof useStore.getState>["recordActivityError"]
) {
  const itemId = charIdByHanzi.get(builder.character);
  if (!itemId) return;
  const now = Date.now();
  recordActivityError({
    id: `hanzi-build:${builder.id}:${now}`,
    lessonId: "hanzi-lab",
    moduleId: "hanzi-lab",
    phaseId: "hanzi",
    taskId: "hanzi-builder",
    questionId: builder.id,
    exerciseId: `hanzi-builder:${builder.id}`,
    type: "hanzi_build",
    prompt: builder.promptPt,
    correctAnswer: builder.character,
    selectedAnswer: "Montagem incorreta",
    topic: "forma visual",
    tokens: [builder.character, builder.pinyin, builder.meaningPt],
    hanzi: builder.character,
    pinyin: builder.pinyin,
    meaningPt: builder.meaningPt,
    explanation: builder.explanationPt,
    mistakeReason: "hanzi_visual_builder",
    timestamp: now,
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: "forma",
    targets: [{ type: "char", itemId, domain: "forma", track: "hanzi" }],
  });
}
