import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import { JOURNEY, type Lesson, type Skill, type Unit } from "../../data/journey";
import type { ItemType } from "../../data/types";
import { useStore, type Track } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { playSoundFx } from "../../lib/soundFx";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import { canStartModule } from "../../lib/proAccess";
import type { ReviewDomain } from "../../lib/srs";
import { MODULE_PASS_QI, MODULE_RETRY_QI } from "../../data/economy";
import { Card, Button, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { GlossText } from "../../components/hanzi/GlossText";
import { formatPinyinForDisplay } from "../../lib/pinyin";
import {
  KeyboardShortcutHint,
  ShortcutBadge,
  leftPairShortcut,
  rightPairShortcut,
  shortcutKeyForIndex,
  useExerciseHotkeys,
} from "../../lib/useExerciseHotkeys";
import { IconCheck, IconLibrary, IconStar, IconTarget, IconX } from "../../components/ui/Icon";
import { ProPaywall, type ProPaywallKind } from "../../components/pro/ProPaywall";
import {
  buildModuleSkipTest,
  gradeModuleSkipTest,
  EXAM_MIN_QUESTIONS,
  EXAM_PASS_RATIO,
  examKindLabel,
  examFormatLabel,
  examDifficultyLabel,
  type ChoiceExamQuestion,
  type ClozeExamQuestion,
  type ExamQuestion,
  type MatchExamQuestion,
  type OrderExamQuestion,
} from "./examBuilder";

interface ChallengeMistake {
  prompt: string;
  correction: string;
  detail?: string;
  lessonId: string;
  lessonTitle: string;
  essential: boolean;
  kind: ExamQuestion["kind"];
}

interface AnsweredState {
  correct: boolean;
  chosen?: string;
}

interface ModuleReviewEntry {
  type: ItemType;
  itemId: string;
  domain: ReviewDomain;
  track: Track;
}

const SKILL_TRACK: Record<Skill, Track> = {
  som: "som",
  fala: "fala",
  hanzi: "hanzi",
  leitura: "leitura",
  sistema: "hanzi",
};

const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));

function shuffleValues<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function questionAnswerLabel(question: ExamQuestion): string {
  if (question.format === "match") {
    return question.pairs.map((pair) => `${formatPinyinForDisplay(pair.left)} = ${formatPinyinForDisplay(pair.right)}`).join(" · ");
  }
  return formatPinyinForDisplay(question.answer);
}

function challengeFailureMessage(
  grade: ReturnType<typeof gradeModuleSkipTest>,
  mistakes: ChallengeMistake[],
  recommendedLessons: { lessonId: string; lessonTitle: string }[]
): string {
  const targetLesson = recommendedLessons[0]?.lessonTitle;
  const close = grade.scoredCorrectCount >= Math.max(0, grade.requiredCorrect - 1);
  const missedEssentialHanzi = grade.essentialMissed.some((question) => question.kind === "forma" || question.feedback.hanzi);
  const missedTone = mistakes.some((mistake) => mistake.kind === "som" && /tom/i.test(`${mistake.prompt} ${mistake.correction} ${mistake.detail ?? ""}`));

  if (missedEssentialHanzi) {
    return `Você errou itens essenciais de hànzì.${targetLesson ? ` Volte para a lição ${targetLesson}.` : ""}`;
  }
  if (missedTone) {
    return `Você quase passou, mas precisa revisar tons.${targetLesson ? ` Volte para a lição ${targetLesson}.` : ""}`;
  }
  if (close) {
    return `Você quase passou, mas ainda falta consistência em itens essenciais.${targetLesson ? ` Volte para a lição ${targetLesson}.` : ""}`;
  }
  return targetLesson
    ? `Volte para a lição ${targetLesson} e refaça o teste quando estiver mais firme.`
    : "Volte para a trilha do módulo e refaça o teste quando estiver mais firme.";
}

export function ModuleChallengePage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const isPremium = useStore((s) => s.isPremium);
  const completeLesson = useStore((s) => s.completeLesson);
  const validateModule = useStore((s) => s.validateModule);
  const completedLessons = useStore((s) => s.completedLessons);
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const claimReward = useStore((s) => s.claimReward);
  const spendQi = useStore((s) => s.spendQi);
  const consumeCharge = useStore((s) => s.consumeCharge);
  const inventory = useStore((s) => s.inventory);
  const useInventoryItem = useStore((s) => s.useInventoryItem);
  const points = useStore((s) => s.points);
  const soundEffects = useStore((s) => s.soundEffects);

  const found = useMemo(() => findUnit(unitId), [unitId]);
  const exam = useMemo(() => (found ? buildModuleSkipTest(found.unit) : null), [found]);
  const questions = useMemo(
    () => (exam?.status === "ok" ? exam.questions : []),
    [exam]
  );
  const hasPremium = found ? found.unit.lessons.some((lesson) => lesson.premium) : false;
  const moduleAccess = found
    ? canStartModule(found.unit.id, { isPremium, completedLessons })
    : null;

  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<AnsweredState | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [answerStreak, setAnswerStreak] = useState(0);
  const [streakBurst, setStreakBurst] = useState(0);
  const [correctBurst, setCorrectBurst] = useState<string | null>(null);
  const [proPaywallKind, setProPaywallKind] = useState<ProPaywallKind | null>(null);
  const [mistakes, setMistakes] = useState<ChallengeMistake[]>([]);
  const [activityReady, setActivityReady] = useState(false);
  const [energyBlocked, setEnergyBlocked] = useState(false);

  useEffect(() => {
    if (!found || questions.length === 0 || (moduleAccess && !moduleAccess.allowed) || (hasPremium && !isPremium) || activityReady || energyBlocked) return;
    const sessionKey = `longyu-energy:challenge:${found.unit.id}:${todayKey()}`;
    if (window.sessionStorage.getItem(sessionKey) === "1") {
      setActivityReady(true);
      return;
    }
    if (!consumeCharge("module_challenge")) {
      setEnergyBlocked(true);
      setProPaywallKind("energy");
      playSoundFx("blocked", soundEffects);
      return;
    }
    window.sessionStorage.setItem(sessionKey, "1");
    setActivityReady(true);
  }, [activityReady, consumeCharge, energyBlocked, found, hasPremium, isPremium, moduleAccess, questions.length, soundEffects]);

  if (!found) return <Navigate to="/" replace />;

  const { unit, phaseTitle } = found;
  const reviewEntries = reviewEntriesForUnit(unit);
  const uniqueReviewItems = uniqueModuleItems(reviewEntries).length;

  if (moduleAccess && !moduleAccess.allowed) {
    const premiumBlocked = moduleAccess.reasonCode === "premium_required";
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <Pill tone="accent">{premiumBlocked ? "Longyu Pro" : "Jornada"}</Pill>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
          Teste bloqueado
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{moduleAccess.reason}</p>
        <Button className="mt-6 w-full" onClick={() => (premiumBlocked ? setProPaywallKind("content") : navigate("/"))}>
          {premiumBlocked ? "Ver Pro" : "Continuar na jornada"}
        </Button>
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  if (hasPremium && !isPremium) {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <Pill tone="accent">Longyu Pro</Pill>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
          Teste premium
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Este módulo tem conteúdo Pro. Ative o Longyu Pro para fazer o teste de nivelamento.
        </p>
        <Button className="mt-6 w-full" onClick={() => setProPaywallKind("content")}>Ver Pro</Button>
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  // Falha segura: sem 10 perguntas válidas não existe teste — nem fraco, nem
  // completado com placeholder. O pulo do módulo fica bloqueado.
  if (!exam || exam.status === "insufficient") {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Teste indisponível
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Este módulo ainda não tem perguntas suficientes para teste.
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          O pulo de módulo só é liberado com pelo menos {EXAM_MIN_QUESTIONS} perguntas válidas
          {exam?.status === "insufficient" ? `; este módulo gerou ${exam.validCount}.` : "."}
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  if (energyBlocked || !activityReady) {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <Pill tone={energyBlocked ? "accent" : "muted"}>Cargas do Dragão</Pill>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
          {energyBlocked ? "Teste bloqueado por hoje" : "Preparando teste"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {energyBlocked
            ? "Você precisa de uma carga para iniciar um teste de pular módulo."
            : "O Longyu está verificando suas cargas antes de começar."}
        </p>
        {energyBlocked && (
          <Button className="mt-6 w-full" onClick={() => setProPaywallKind("energy")}>Ver opções</Button>
        )}
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "energy"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  const q = questions[pos];
  const correctIds = new Set(Object.keys(results).filter((id) => results[id]));
  const grade = gradeModuleSkipTest(questions, correctIds);
  const requiredPercent = Math.round(EXAM_PASS_RATIO * 100);
  const retryCost = MODULE_RETRY_QI;
  const moduleRetryItems = inventory["shop-module-retry"] ?? 0;
  const canRetry = isPremium || moduleRetryItems > 0 || points >= retryCost;
  const severeMiss = finished && grade.scoredTotal > 0 && grade.scoredCorrectCount / grade.scoredTotal < 0.5;

  function handleAnswered(result: AnsweredState) {
    if (answered) return;
    setAnswered(result);
    setResults((current) => ({ ...current, [q.id]: result.correct }));
    if (result.correct) {
      const nextStreak = answerStreak + 1;
      setAnswerStreak(nextStreak);
      setCorrectBurst(nextStreak % 2 === 0 ? "Boa!" : "Certo");
      window.setTimeout(() => setCorrectBurst(null), 820);
      if (nextStreak >= 3 && nextStreak % 3 === 0) {
        playSoundFx("streak", soundEffects);
        setStreakBurst(nextStreak);
        window.setTimeout(() => setStreakBurst(0), 1200);
      } else {
        playSoundFx("success", soundEffects);
      }
    } else {
      setAnswerStreak(0);
      setMistakes((items) => [
        ...items,
        {
          prompt: q.prompt,
          correction: questionAnswerLabel(q),
          detail: q.feedback.pinyin ?? q.feedback.meaning,
          lessonId: q.lessonId,
          lessonTitle: q.lessonTitle,
          essential: q.isEssential,
          kind: q.kind,
        },
      ].slice(-8));
      playSoundFx("error", soundEffects);
    }
  }

  function next() {
    if (!answered) return;
    setAnswered(null);
    if (pos + 1 >= questions.length) {
      finish();
    } else {
      setPos((n) => n + 1);
    }
  }

  function finish() {
    const finalCorrectIds = new Set(Object.keys(results).filter((id) => results[id]));
    const finalGrade = gradeModuleSkipTest(questions, finalCorrectIds);

    // Erros entram na revisão mesmo quando o teste é aprovado.
    for (const question of questions) {
      if (question.diagnosticOnly || finalCorrectIds.has(question.id) || !question.reviewRef) continue;
      gradeReviewDomain({
        ensureSrs,
        gradeSrs,
        type: question.reviewRef.type,
        itemId: question.reviewRef.itemId,
        track: question.reviewRef.track,
        domain: question.reviewRef.domain,
        grade: "again",
      });
    }

    if (finalGrade.passed) {
      validateModule(unit.id);
      for (const lesson of unit.lessons) completeLesson(lesson.id);
      for (const entry of reviewEntries) {
        gradeReviewDomain({
          ensureSrs,
          gradeSrs,
          type: entry.type,
          itemId: entry.itemId,
          track: entry.track,
          domain: entry.domain,
          grade: "good",
        });
      }
      claimReward({
        id: `challenge:${unit.id}:skip:qi`,
        type: "qi",
        amount: MODULE_PASS_QI,
        source: "Teste de módulo",
      });
      if (finalGrade.correctCount === finalGrade.total) {
        claimReward({
          id: `challenge:${unit.id}:skip:pearl`,
          type: "dragonPearl",
          amount: 1,
          source: "Domínio perfeito no teste",
        });
      }
      playSoundFx("moduleComplete", soundEffects);
    } else {
      playSoundFx("error", soundEffects);
    }
    setFinished(true);
  }

  if (finished) {
    const passed = grade.passed;
    const blockedByEssential = !passed && grade.scoredCorrectCount >= grade.requiredCorrect && grade.essentialMissed.length > 0;
    const recommendedLessons = recommendedLessonsFromMistakes(mistakes, unit);
    const failureMessage = challengeFailureMessage(grade, mistakes, recommendedLessons);
    const firstIncompleteLesson = unit.lessons.find((lesson) => !completedLessons.includes(lesson.id));
    const studyTarget = recommendedLessons[0]?.lessonId ?? firstIncompleteLesson?.id ?? unit.lessons[0]?.id;

    function retryChallenge() {
      let usedRetryItem = false;
      if (!isPremium) {
        if (moduleRetryItems > 0) {
          if (!useInventoryItem("shop-module-retry")) return;
          usedRetryItem = true;
        } else if (!spendQi(retryCost, "challenge_retry")) {
          return;
        }
      }
      playSoundFx(isPremium || usedRetryItem ? "success" : "qiSpend", soundEffects);
      setPos(0);
      setAnswered(null);
      setResults({});
      setAnswerStreak(0);
      setStreakBurst(0);
      setCorrectBurst(null);
      setMistakes([]);
      setFinished(false);
    }

    return (
      <div className="mx-auto max-w-xl space-y-6 pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Card className="p-6 text-center sm:p-8">
          <div className={passed ? "text-[rgb(var(--good))]" : "text-accent"}>
            {passed ? <IconCheck width={42} height={42} className="mx-auto" /> : <IconX width={42} height={42} className="mx-auto" />}
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
            {passed ? "Módulo pulado com segurança." : "Melhor seguir pela trilha"}
          </h1>
          <p className="mt-2 text-ink-soft">
            {passed
              ? "Você demonstrou domínio suficiente deste conteúdo. O Longyu liberou a próxima etapa."
              : blockedByEssential
              ? `Você acertou ${grade.scoredCorrectCount}/${grade.scoredTotal} no bloco pontuado, mas errou um item essencial do módulo. Para pular, precisa bater ${requiredPercent}% e não falhar no núcleo. ${failureMessage}`
              : failureMessage}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            <div className="rounded-2xl bg-surface-2 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Acertos</div>
              <div className="mt-1 text-sm font-semibold text-ink">{grade.correctCount}/{grade.total}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Nota</div>
              <div className="mt-1 text-sm font-semibold text-ink">{grade.percent}%</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Mínimo</div>
              <div className="mt-1 text-sm font-semibold text-ink">{grade.requiredCorrect}/{grade.scoredTotal}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Revisão</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {passed ? `${uniqueReviewItems} itens` : `${mistakes.length} erros`}
              </div>
            </div>
          </div>

          {grade.diagnosticTotal > 0 && (
            <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-left text-xs leading-5 text-ink-soft">
              {grade.diagnosticCorrectCount}/{grade.diagnosticTotal} sondagens avançadas acertadas. Elas ajudam no posicionamento, mas não derrubam a nota do módulo.
            </p>
          )}

          {passed && (
            <>
              <div className="longyu-phase-pass mt-5 rounded-2xl border border-accent-soft bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
                Módulo pulado com segurança. {unit.lessons.length} lições entraram no seu histórico.
              </div>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <IconTarget width={17} height={17} /> +{MODULE_PASS_QI} Qi
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">Recompensa moderada</p>
                </div>
                <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <IconStar width={17} height={17} fill={grade.correctCount === grade.total ? "currentColor" : "none"} /> {grade.correctCount === grade.total ? "+1 Pérola" : "Pérola só no 100%"}
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{grade.correctCount === grade.total ? "Teste perfeito" : "Sem erro nenhum"}</p>
                </div>
                <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <IconLibrary width={17} height={17} /> {uniqueReviewItems} itens
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">Adicionados à revisão</p>
                </div>
              </div>
            </>
          )}

          {!passed && grade.essentialMissed.length > 0 && (
            <div className="mt-5 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4 text-left">
              <div className="text-sm font-semibold text-ink">Itens essenciais para revisar</div>
              <div className="mt-2 space-y-2">
                {grade.essentialMissed.map((question) => (
                  <div key={question.id} className="rounded-xl bg-surface px-3 py-2 text-sm">
                    <div className="font-medium text-ink">
                      {question.feedback.hanzi ?? question.prompt}
                      {question.feedback.meaning ? ` — ${question.feedback.meaning}` : ""}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-soft">Lição: {question.lessonTitle}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!passed && mistakes.length > 0 && (
            <div className="mt-5 rounded-2xl border border-line bg-surface p-4 text-left">
              <div className="text-sm font-semibold text-ink">Erros do teste</div>
              <div className="mt-3 space-y-2">
                {mistakes.slice(0, 5).map((mistake, index) => (
                  <div key={`${mistake.prompt}-${index}`} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <div className="font-medium text-ink">
                      {mistake.prompt}
                      {mistake.essential && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">essencial</span>}
                    </div>
                    <div className="mt-0.5 text-ink-soft">
                      Correto: <span className="font-medium text-ink">{mistake.correction}</span>
                      {mistake.detail ? <span className="text-ink-faint"> - {formatPinyinForDisplay(mistake.detail)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!passed && recommendedLessons.length > 0 && (
            <div className="mt-5 rounded-2xl border border-accent-soft bg-accent-soft/45 p-4 text-left">
              <div className="text-sm font-semibold text-ink">Lições recomendadas</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recommendedLessons.map((lesson) => (
                  <span key={lesson.lessonId} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-accent">
                    {lesson.lessonTitle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!passed && severeMiss && (
            <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-left text-sm text-ink-soft">
              Como faltou bastante domínio, nova tentativa fica reservada para depois de estudar uma lição do módulo ou usar Qi agora.
            </p>
          )}

          {!passed && (
            <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-left">
              <div className="text-sm font-semibold text-ink">Crédito de refazer</div>
              <p className="mt-1 text-sm text-ink-soft">
                Use um Retry de teste ou Qi para refazer. No Pro, a nova tentativa é inclusa.
              </p>
              <Button
                className="mt-4 w-full"
                variant={canRetry ? "primary" : "outline"}
                onClick={canRetry ? retryChallenge : () => {
                  playSoundFx("blocked", soundEffects);
                  setProPaywallKind("qi");
                }}
              >
                {isPremium
                  ? "Refazer incluso no Pro"
                  : moduleRetryItems > 0
                  ? `Usar Retry de teste (${moduleRetryItems})`
                  : canRetry
                  ? `Refazer por ${retryCost} Qi`
                  : `Juntar ${retryCost - points} Qi ou ver Pro`}
              </Button>
            </div>
          )}
          {passed ? (
            <Button className="mt-6 w-full" onClick={() => navigate("/")}>
              Continuar jornada
            </Button>
          ) : (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button className="w-full" onClick={() => navigate(studyTarget ? `/licao/${studyTarget}` : "/")}>
                Estudar módulo
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                Voltar à jornada
              </Button>
            </div>
          )}
        </Card>
        <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "qi"} onClose={() => setProPaywallKind(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {correctBurst && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="longyu-correct-pop rounded-full bg-[rgb(var(--good)/0.14)] px-4 py-2 text-sm font-semibold text-[rgb(var(--good))] shadow-card">
            {correctBurst}
          </div>
        </div>
      )}
      {streakBurst > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="longyu-streak-burst rounded-full border border-accent-soft bg-surface px-4 py-2 text-sm font-semibold text-accent shadow-card">
            Sequência x{streakBurst} 🔥
          </div>
        </div>
      )}
      <SectionTitle
        eyebrow={`${phaseTitle} · Teste de módulo`}
        title={unit.title}
        desc={`Um desafio direto para quem já sabe o conteúdo. Para pular com segurança, acerte pelo menos ${requiredPercent}% do bloco pontuado e não erre itens essenciais. A explicação completa aparece só depois de cada resposta.`}
      />

      <div className="flex items-center gap-3 text-sm text-ink-faint">
        <ProgressBar value={pos + 1} max={questions.length} className="flex-1" />
        <span className="tabular-nums">{pos + 1}/{questions.length}</span>
      </div>

      <Card className="p-5 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Pill tone="accent">{examKindLabel(q.kind)}</Pill>
            <Pill tone={q.diagnosticOnly ? "gold" : "muted"}>{examDifficultyLabel(q.difficulty)}</Pill>
            {examFormatLabel(q.format) && <Pill tone="muted">{examFormatLabel(q.format)}</Pill>}
            {q.isEssential && <Pill tone="good">Essencial</Pill>}
          </div>
          <span className="text-xs text-ink-faint">mínimo {grade.requiredCorrect}/{grade.scoredTotal} ({requiredPercent}%)</span>
        </div>

        <QuestionStimulus question={q} />

        {q.format === "choice" && (
          <ChoiceQuestionView key={q.id} question={q} answered={answered} onAnswer={handleAnswered} />
        )}
        {q.format === "cloze" && (
          <ClozeQuestionView key={q.id} question={q} answered={answered} onAnswer={handleAnswered} />
        )}
        {q.format === "order" && (
          <OrderQuestionView key={q.id} question={q} answered={answered} onAnswer={handleAnswered} />
        )}
        {q.format === "match" && (
          <MatchQuestionView key={q.id} question={q} answered={answered} onAnswer={handleAnswered} />
        )}

        {answered && <QuestionFeedback question={q} answered={answered} />}

        {answered && (
          <>
            <ChallengeContinueHotkeys onContinue={next} />
            <Button className="mt-5 w-full" onClick={next}>
              {pos + 1 >= questions.length ? "Finalizar teste" : "Próxima"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

function ChallengeContinueHotkeys({ onContinue }: { onContinue: () => void }) {
  useExerciseHotkeys({
    enabled: true,
    mode: "choice",
    isAnswered: true,
    hasSelection: true,
    allowNumberKeys: false,
    onContinue,
  });

  return null;
}

// ---------------------------------------------------------------------------
// Estímulo (antes da resposta): apenas conteúdo neutro, sem tooltip com dica.
// ---------------------------------------------------------------------------

function QuestionStimulus({ question }: { question: ExamQuestion }) {
  const { display } = question;
  const hasStimulus = display.hanzi || display.pt || display.pinyin || display.audioText;
  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-center">
      <div className="text-sm font-medium text-ink-soft">{question.prompt}</div>
      {hasStimulus && (
        <>
          {display.audioText && (
            <div className="mt-4 flex justify-center">
              <SpeakButton text={display.audioText} size="lg" />
            </div>
          )}
          {display.hanzi && (
            // examMode: hover/toque não revela pinyin nem significado.
            <GlossText examMode text={display.hanzi} className="mt-4 block text-5xl text-ink" />
          )}
          {display.pinyin && (
            <Pinyin text={display.pinyin} className="mt-3 block font-serif text-lg" />
          )}
          {display.pt && (
            <div className="mt-4 text-2xl font-semibold text-ink">{display.pt}</div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback pedagógico (depois da resposta): aqui sim entra tudo.
// ---------------------------------------------------------------------------

function QuestionFeedback({ question, answered }: { question: ExamQuestion; answered: AnsweredState }) {
  const { feedback } = question;
  return (
    <div
      className={[
        "animate-pop mt-5 rounded-2xl border p-4 text-left",
        answered.correct
          ? "border-transparent bg-[rgb(var(--good)/0.1)]"
          : "border-transparent bg-wrong-soft",
      ].join(" ")}
    >
      <div className={["flex items-center gap-2 text-sm font-semibold", answered.correct ? "text-[rgb(var(--good))]" : "text-wrong"].join(" ")}>
        {answered.correct ? <IconCheck width={17} height={17} /> : <IconX width={17} height={17} />}
        {answered.correct ? "Certo!" : "Ainda não."}
      </div>

      {!answered.correct && answered.chosen && (
        <p className="mt-2 text-sm text-ink-soft">
          Você escolheu <span className="font-medium text-ink">“{formatPinyinForDisplay(answered.chosen)}”</span>, mas o correto é{" "}
          <span className="font-medium text-ink">“{questionAnswerLabel(question)}”</span>.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {feedback.hanzi && (
          <span className="hanzi text-2xl text-ink">{feedback.hanzi}</span>
        )}
        {feedback.hanzi && <SpeakButton text={feedback.hanzi} size="sm" />}
        {feedback.pinyin && <Pinyin text={feedback.pinyin} className="font-serif text-base" />}
        {feedback.meaning && <span className="text-sm font-medium text-ink">{feedback.meaning}</span>}
      </div>
      {feedback.example && (
        <p className="mt-2 text-sm text-ink-soft">Exemplo: {feedback.example}</p>
      )}
      {feedback.note && <p className="mt-2 text-sm leading-6 text-ink-soft">{feedback.note}</p>}
      {!answered.correct && (
        <p className="mt-2 text-xs text-ink-faint">
          Recomendação: revise a lição “{question.lessonTitle}”. Este item entrou na sua revisão.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatos de questão
// ---------------------------------------------------------------------------

interface QuestionViewProps<T extends ExamQuestion> {
  question: T;
  answered: AnsweredState | null;
  onAnswer: (result: AnsweredState) => void;
}

function optionButtonClass(state: "idle" | "right" | "wrong", disabled: boolean): string {
  return [
    "flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left transition",
    state === "idle" && "border-line bg-surface hover:bg-surface-2",
    state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
    state === "wrong" && "border-transparent bg-wrong-soft",
    disabled && state === "idle" ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function ChoiceQuestionView({ question, answered, onAnswer }: QuestionViewProps<ChoiceExamQuestion>) {
  const chosen = answered?.chosen ?? null;

  useExerciseHotkeys({
    enabled: answered == null,
    mode: "choice",
    optionCount: question.options.length,
    onSelectOption: (index) => {
      const option = question.options[index];
      if (option) onAnswer({ correct: option === question.answer, chosen: option });
    },
  });

  return (
    <div className="mt-5 grid gap-2.5">
      <KeyboardShortcutHint />
      {question.options.map((option, index) => {
        const state: "idle" | "right" | "wrong" =
          answered == null ? "idle" : option === question.answer ? "right" : option === chosen ? "wrong" : "idle";
        return (
          <button
            key={option}
            disabled={answered != null}
            onClick={() => onAnswer({ correct: option === question.answer, chosen: option })}
            aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
            className={["relative", optionButtonClass(state, answered != null)].join(" ")}
          >
            <ShortcutBadge className="absolute left-2 top-2">{shortcutKeyForIndex(index)}</ShortcutBadge>
            <span className={/[㐀-鿿]/.test(option) ? "hanzi text-xl" : ""}>{formatPinyinForDisplay(option)}</span>
            {state === "right" && <IconCheck className="text-[rgb(var(--good))]" />}
            {state === "wrong" && <IconX className="text-wrong" />}
          </button>
        );
      })}
    </div>
  );
}

function ClozeQuestionView({ question, answered, onAnswer }: QuestionViewProps<ClozeExamQuestion>) {
  const chosen = answered?.chosen ?? null;

  useExerciseHotkeys({
    enabled: answered == null,
    mode: "choice",
    optionCount: question.options.length,
    onSelectOption: (index) => {
      const option = question.options[index];
      if (option) onAnswer({ correct: option === question.answer, chosen: option });
    },
  });

  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-dashed border-accent-soft bg-surface-2/70 px-4 py-5 text-center">
        <span className="hanzi text-3xl leading-relaxed text-ink">
          {question.sentenceBefore}
          <span
            className={[
              "mx-1 inline-block min-w-14 rounded-lg border-b-2 px-2 text-center align-baseline",
              chosen
                ? answered?.correct
                  ? "border-[rgb(var(--good))] text-[rgb(var(--good))]"
                  : "border-wrong text-wrong"
                : "border-ink-faint text-ink-faint",
            ].join(" ")}
          >
            {chosen ?? "＿＿"}
          </span>
          {question.sentenceAfter}
        </span>
      </div>
      <KeyboardShortcutHint />
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        {question.options.map((option, index) => {
          const state: "idle" | "right" | "wrong" =
            answered == null ? "idle" : option === question.answer ? "right" : option === chosen ? "wrong" : "idle";
          return (
            <button
              key={option}
              disabled={answered != null}
              onClick={() => onAnswer({ correct: option === question.answer, chosen: option })}
              aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
              className={[
                "hanzi relative min-h-12 rounded-xl border px-4 py-2.5 text-xl transition",
                state === "idle" && "border-line bg-surface hover:bg-surface-2",
                state === "right" && "border-transparent bg-[rgb(var(--good)/0.15)]",
                state === "wrong" && "border-transparent bg-wrong-soft",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ShortcutBadge className="absolute left-1.5 top-1.5">{shortcutKeyForIndex(index)}</ShortcutBadge>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderQuestionView({ question, answered, onAnswer }: QuestionViewProps<OrderExamQuestion>) {
  const [placed, setPlaced] = useState<string[]>([]);
  const bank = useMemo(() => shuffleValues(question.pieces), [question]);
  const remaining = bank.filter((piece) => !placed.includes(piece));
  const full = placed.length === question.pieces.length;

  useExerciseHotkeys({
    enabled: answered == null,
    mode: "builder",
    optionCount: remaining.length,
    hasSelection: placed.length > 0,
    onSelectOption: (index) => {
      const piece = remaining[index];
      if (piece) setPlaced((current) => [...current, piece]);
    },
    onSubmit: () => {
      if (full) onAnswer({ correct: placed.join("") === question.answer, chosen: placed.join("") });
    },
  });

  return (
    <div className="mt-5">
      <div className="flex min-h-[68px] flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-accent-soft bg-surface-2/70 p-4">
        {placed.length === 0 && <span className="text-sm font-medium text-ink-faint">toque nas peças na ordem certa</span>}
        {placed.map((piece, index) => (
          <button
            key={`${piece}-${index}`}
            disabled={answered != null}
            onClick={() => setPlaced((current) => current.filter((_, i) => i !== index))}
            className="hanzi min-h-11 rounded-xl border border-accent-soft bg-accent-soft/60 px-3.5 py-2 text-xl text-ink transition active:scale-95"
          >
            {piece}
          </button>
        ))}
      </div>
      <KeyboardShortcutHint />
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        {remaining.map((piece, index) => (
          <button
            key={piece}
            disabled={answered != null}
            onClick={() => setPlaced((current) => [...current, piece])}
            aria-label={`Peça ${shortcutKeyForIndex(index)}: ${piece}`}
            className="hanzi relative min-h-12 rounded-xl border border-line bg-surface px-4 py-2.5 text-xl transition hover:bg-surface-2 active:scale-95"
          >
            <ShortcutBadge className="absolute left-1.5 top-1.5">{shortcutKeyForIndex(index)}</ShortcutBadge>
            {piece}
          </button>
        ))}
      </div>
      {full && !answered && (
        <Button
          className="mt-4 w-full"
          onClick={() => onAnswer({ correct: placed.join("") === question.answer, chosen: placed.join("") })}
        >
          Verificar
        </Button>
      )}
    </div>
  );
}

function MatchQuestionView({ question, answered, onAnswer }: QuestionViewProps<MatchExamQuestion>) {
  const lefts = useMemo(() => shuffleValues(question.pairs.map((pair) => pair.left)), [question]);
  const rights = useMemo(() => shuffleValues(question.pairs.map((pair) => pair.right)), [question]);
  const rightByLeft = useMemo(
    () => new Map(question.pairs.map((pair) => [pair.left, pair.right])),
    [question]
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  function pickLeft(left: string) {
    if (matched.has(left) || answered) return;
    setSelectedLeft((current) => (current === left ? null : left));
  }

  function pickRight(right: string) {
    if (!selectedLeft || answered) return;
    if (rightByLeft.get(selectedLeft) === right) {
      const nextMatched = new Set(matched);
      nextMatched.add(selectedLeft);
      setMatched(nextMatched);
      setSelectedLeft(null);
      if (nextMatched.size === question.pairs.length) {
        onAnswer({
          correct: errors === 0,
          chosen: errors > 0 ? `${errors} ${errors === 1 ? "ligação errada" : "ligações erradas"}` : undefined,
        });
      }
    } else {
      setErrors((count) => count + 1);
      setFlash(right);
      window.setTimeout(() => setFlash(null), 450);
    }
  }

  const matchedRights = new Set([...matched].map((left) => rightByLeft.get(left)));

  useExerciseHotkeys({
    enabled: answered == null,
    mode: "pairs",
    leftCount: lefts.length,
    rightCount: rights.length,
    onSelectLeft: (index) => {
      const left = lefts[index];
      if (left) pickLeft(left);
    },
    onSelectRight: (index) => {
      const right = rights[index];
      if (right) pickRight(right);
    },
  });

  return (
    <div className="mt-5">
      <KeyboardShortcutHint pairs />
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      <div className="grid content-start gap-2.5">
        {lefts.map((left, index) => {
          const done = matched.has(left);
          const active = selectedLeft === left;
          return (
            <button
              key={left}
              disabled={done || answered != null}
              onClick={() => pickLeft(left)}
              className={[
                "relative min-h-12 rounded-xl border px-3 py-2.5 text-center transition",
                /[㐀-鿿]/.test(left) ? "hanzi text-xl" : "text-sm font-medium",
                done
                  ? "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
                  : active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface hover:bg-surface-2",
              ].join(" ")}
            >
              <ShortcutBadge className="absolute left-1.5 top-1.5">{leftPairShortcut(index)}</ShortcutBadge>
              {left}
            </button>
          );
        })}
      </div>
      <div className="grid content-start gap-2.5">
        {rights.map((right, index) => {
          const done = matchedRights.has(right);
          return (
            <button
              key={right}
              disabled={done || answered != null}
              onClick={() => pickRight(right)}
              className={[
                "relative min-h-12 rounded-xl border px-3 py-2.5 text-center transition",
                /[㐀-鿿]/.test(right) ? "hanzi text-xl" : "text-sm font-medium",
                done
                  ? "border-transparent bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
                  : flash === right
                  ? "border-transparent bg-wrong-soft text-wrong"
                  : "border-line bg-surface hover:bg-surface-2",
              ].join(" ")}
            >
              <ShortcutBadge className="absolute left-1.5 top-1.5">{rightPairShortcut(index)}</ShortcutBadge>
              {right}
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers do módulo (revisão e recomendações)
// ---------------------------------------------------------------------------

function findUnit(unitId: string | undefined): { unit: Unit; phaseTitle: string } | undefined {
  for (const phase of JOURNEY) {
    const unit = phase.units.find((candidate) => candidate.id === unitId);
    if (unit) return { unit, phaseTitle: phase.title };
  }
  return undefined;
}

function normalizeHanzi(text: string): string {
  return text.replace(/[，。！？、,.!?？\s]/g, "");
}

function findChunkByText(text: string | undefined) {
  if (!text) return undefined;
  const normalized = normalizeHanzi(text);
  return CHUNKS.find((chunk) => normalizeHanzi(chunk.hanzi) === normalized);
}

function charsInText(text: string | undefined) {
  if (!text) return [];
  return [...normalizeHanzi(text)]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is (typeof CHARACTERS)[number] => Boolean(char));
}

function reviewEntriesForUnit(unit: Unit): ModuleReviewEntry[] {
  const entries: ModuleReviewEntry[] = [];
  const seen = new Set<string>();

  function add(type: ItemType, itemId: string | undefined, domain: ReviewDomain, track: Track) {
    if (!itemId) return;
    const key = `${type}:${itemId}:${domain}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ type, itemId, domain, track });
  }

  function addRef(ref: string, lesson: Lesson) {
    const [rawType, itemId] = ref.split(":");
    if (!isItemType(rawType) || !itemId) return;
    const track = SKILL_TRACK[lesson.skill];
    if (rawType === "chunk") {
      add("chunk", itemId, "significado", track);
      add("chunk", itemId, "uso", track);
      return;
    }
    add(rawType, itemId, rawType === "radical" ? "forma" : "significado", track);
  }

  for (const lesson of unit.lessons) {
    const track = SKILL_TRACK[lesson.skill];
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) addRef(ref, lesson);

    for (const step of lesson.steps) {
      if ((step.kind === "decompose" || step.kind === "recognize") && step.charId) {
        add("char", step.charId, step.kind === "decompose" ? "forma" : "significado", track);
      }
      if (step.kind === "flashcard" && step.chunkId) {
        add("chunk", step.chunkId, "significado", track);
        if (track === "fala") add("chunk", step.chunkId, "fala", track);
      }
      if (step.kind === "listen") {
        const chunk = findChunkByText(step.text);
        if (chunk) {
          add("chunk", chunk.id, "som", track);
          if (track === "fala") add("chunk", chunk.id, "fala", track);
        }
        const chars = charsInText(step.text);
        if (chars.length === 1) add("char", chars[0].id, "som", "som");
      }
      if (step.kind === "tone") {
        const chars = charsInText(step.hanzi);
        if (chars[0]) add("char", chars[0].id, "som", "som");
      }
      if (step.kind === "comprehend") {
        const chunk = findChunkByText(step.hanzi);
        if (chunk) add("chunk", chunk.id, "significado", track);
        const chars = charsInText(step.hanzi);
        if (chars.length === 1) add("char", chars[0].id, "significado", track);
      }
      if (step.kind === "produce") {
        const chunk = findChunkByText(step.target?.join(""));
        if (chunk) {
          add("chunk", chunk.id, "fala", track);
          add("chunk", chunk.id, "uso", track);
        }
      }
      if (step.kind === "write" && step.chunkId) {
        add("chunk", step.chunkId, "uso", track);
        add("chunk", step.chunkId, "significado", track);
      }
      if (step.kind === "microread") {
        for (const line of step.lines ?? []) {
          for (const chunk of CHUNKS) {
            if (normalizeHanzi(line.hanzi).includes(normalizeHanzi(chunk.hanzi))) {
              add("chunk", chunk.id, "leitura", "leitura");
            }
          }
          for (const char of charsInText(line.hanzi)) add("char", char.id, "leitura", "leitura");
        }
      }
    }
  }

  return entries;
}

function uniqueModuleItems(entries: ModuleReviewEntry[]): ModuleReviewEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.type}:${entry.itemId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isItemType(value: string): value is ItemType {
  return value === "char" || value === "chunk" || value === "radical";
}

function recommendedLessonsFromMistakes(mistakes: ChallengeMistake[], unit: Unit): { lessonId: string; lessonTitle: string }[] {
  const byLesson = new Map<string, { lessonId: string; lessonTitle: string; count: number; order: number }>();
  for (const mistake of mistakes) {
    const order = unit.lessons.findIndex((lesson) => lesson.id === mistake.lessonId);
    const current = byLesson.get(mistake.lessonId);
    byLesson.set(mistake.lessonId, {
      lessonId: mistake.lessonId,
      lessonTitle: mistake.lessonTitle,
      count: (current?.count ?? 0) + 1,
      order: order < 0 ? Number.MAX_SAFE_INTEGER : order,
    });
  }
  return [...byLesson.values()]
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, 3)
    .map(({ lessonId, lessonTitle }) => ({ lessonId, lessonTitle }));
}
