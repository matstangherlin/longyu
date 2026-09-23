import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useIsPro } from "../../lib/proAccess";
import { playSoundFx } from "../../lib/soundFx";
import { gradeReviewDomain } from "../../lib/reviewPlan";
import {
  buildPhaseChallengeExam,
  canStartPhaseChallenge,
  evaluatePhaseChallengeTarget,
  formatCooldownRemaining,
  gradePhaseChallenge,
  phaseChallengeCooldown,
  type PhaseChallengeGrade,
} from "../../lib/phaseChallenge";
import { MandarinHelpProvider } from "../../components/hanzi/helpMode";
import { Button, Card, Pill, ProgressBar } from "../../components/ui/primitives";
import { IconCheck, IconX } from "../../components/ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import { EXAM_PASS_RATIO, examKindLabel, type ExamQuestion } from "./examBuilder";
import {
  ChoiceQuestionView,
  ClozeQuestionView,
  MatchQuestionView,
  OrderQuestionView,
  QuestionStimulus,
  type AnsweredState,
} from "./ModuleChallengePage";

/**
 * RC2.2.8 · K — "Testar esta fase".
 *
 * Prévia honesta antes de cobrar (K6): custo em Fôlego, saldo, regras e a
 * espera de 48h. O débito é único por attemptId (K5.3). A prova é prova:
 * a consulta de Hànzì fica DESATIVADA (K12) e o gabarito não é exibido (K13.1).
 * Sair no meio conta como tentativa reprovada — sem isso, recarregar a página
 * seria um jeito de ver perguntas novas sem pagar nem esperar.
 */
export function PhaseChallengePage() {
  const { phaseId } = useParams();
  const navigate = useNavigate();
  const { t, instructionLocale } = useTranslation();
  const isPremium = useIsPro();
  const completedLessons = useStore((s) => s.completedLessons);
  const cultureCompletedIds = useStore((s) => s.cultureCompletedIds);
  const cultureMasteryById = useStore((s) => s.cultureMasteryById);
  const cultureSeals = useStore((s) => s.cultureSeals);
  const folego = useStore((s) => s.folego);
  const cooldowns = useStore((s) => s.phaseChallengeCooldowns);
  const startAttempt = useStore((s) => s.startPhaseChallengeAttempt);
  const finishAttempt = useStore((s) => s.finishPhaseChallengeAttempt);
  const ensureSrs = useStore((s) => s.ensureSrs);
  const gradeSrs = useStore((s) => s.gradeSrs);
  const soundEffects = useStore((s) => s.soundEffects);

  // O alvo é avaliado UMA vez por visita: passar no teste muda
  // `completedLessons`, e o resultado precisa continuar falando da fase testada.
  const [target] = useState(() =>
    phaseId
      ? evaluatePhaseChallengeTarget(phaseId, {
          completedLessons,
          cultureCompletedIds,
          cultureMasteryById,
          cultureSeals,
          isPremium,
        })
      : null
  );
  const exam = useMemo(
    () => (target?.eligible ? buildPhaseChallengeExam(target.scopeUnits) : null),
    [target]
  );
  const questions: ExamQuestion[] = exam?.status === "ok" ? exam.questions : [];

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const startingRef = useRef<string | null>(null);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<AnsweredState | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [grade, setGrade] = useState<PhaseChallengeGrade | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tentativa aberta desta fase ao abrir a tela = saída no meio: reprova.
  useEffect(() => {
    if (!target) return;
    for (const attempt of useStore.getState().phaseChallengeAttempts ?? []) {
      if (attempt.targetPhaseId === target.phase.id && !attempt.finishedAt) {
        finishAttempt(attempt.id, false, []);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!target) return <Navigate to="/jornada" replace />;

  const phaseTitle = displayInstruction(target.phase.title, instructionLocale);
  const cooldown = phaseChallengeCooldown(cooldowns, target.phase.id, now);
  const requiredPercent = Math.round(EXAM_PASS_RATIO * 100);

  function begin() {
    if (!target || attemptId) return;
    // Duplo toque em "Começar" reaproveita o mesmo id: nunca dois débitos.
    const id = startingRef.current ?? `phase:${target.phase.id}:${Date.now()}`;
    startingRef.current = id;
    const outcome = startAttempt(id, target);
    if (!outcome.ok) {
      startingRef.current = null;
      playSoundFx("blocked", soundEffects);
      return;
    }
    playSoundFx("spend", soundEffects);
    setAttemptId(id);
  }

  function answer(result: AnsweredState) {
    if (answered) return;
    const question = questions[pos];
    setAnswered(result);
    setResults((current) => ({ ...current, [question.id]: result.correct }));
    playSoundFx(result.correct ? "success" : "error", soundEffects);
  }

  function next() {
    if (!answered) return;
    setAnswered(null);
    if (pos + 1 < questions.length) {
      setPos((value) => value + 1);
      return;
    }
    if (!attemptId || !target) return;
    const correctIds = new Set(Object.keys(results).filter((id) => results[id]));
    const final = gradePhaseChallenge(questions, correctIds);
    // Erros entram na revisão (mesmo SRS). Acertos não viram "dominado": a
    // prova não concede domínio que não mediu.
    for (const question of questions) {
      if (question.diagnosticOnly || correctIds.has(question.id) || !question.reviewRef) continue;
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
    finishAttempt(attemptId, final.passed, final.passed ? target.skippableLessonIds : []);
    playSoundFx(final.passed ? "phaseSkip" : "phaseExit", soundEffects);
    setGrade(final);
  }

  // ——— Resultado ————————————————————————————————————————————————
  if (grade) {
    return (
      <div className="mx-auto max-w-xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4" data-testid="phase-challenge-result" data-passed={grade.passed ? "true" : "false"}>
        <Card className="p-6 text-center sm:p-8">
          <div className={grade.passed ? "text-good" : "text-accent"}>
            {grade.passed ? <IconCheck width={42} height={42} className="mx-auto" /> : <IconX width={42} height={42} className="mx-auto" />}
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-ink sm:text-3xl">
            {grade.passed ? t("phaseChallenge.passedTitle", { phase: phaseTitle }) : t("phaseChallenge.failedTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {grade.passed
              ? t("phaseChallenge.passedBody", { n: target.skippableLessonIds.length })
              : t("phaseChallenge.failedBody", { correct: grade.scoredCorrectCount, total: grade.scoredTotal })}
          </p>
          <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 px-4 py-3" data-testid="phase-challenge-strong">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("phaseChallenge.strong")}</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {grade.strongAreas.length ? grade.strongAreas.map(examKindLabel).join(" · ") : t("phaseChallenge.none")}
              </div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-3" data-testid="phase-challenge-weak">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("phaseChallenge.weak")}</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {grade.weakAreas.length ? grade.weakAreas.map(examKindLabel).join(" · ") : t("phaseChallenge.none")}
              </div>
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={() => navigate("/jornada")}>
            {t("phaseChallenge.continueJourney")}
          </Button>
        </Card>
      </div>
    );
  }

  // ——— Prova ————————————————————————————————————————————————————
  if (attemptId && questions.length > 0) {
    const question = questions[pos];
    return (
      // K12 — prova: nenhum termo abre glossário, nem por hover nem por toque.
      <MandarinHelpProvider disabled>
        <div className="mx-auto max-w-xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2" data-testid="phase-challenge-exam" data-gloss-lookup="disabled">
          <div className="flex items-center gap-3 text-sm text-ink-faint">
            <ProgressBar value={pos + 1} max={questions.length} className="flex-1" />
            <span className="tabular-nums">{t("phaseChallenge.progress", { n: pos + 1, total: questions.length })}</span>
          </div>
          <Card className="p-5 sm:p-8">
            <QuestionStimulus question={question} />
            {question.format === "choice" && (
              <ChoiceQuestionView key={question.id} question={question} answered={answered} onAnswer={answer} revealAnswer={false} />
            )}
            {question.format === "cloze" && (
              <ClozeQuestionView key={question.id} question={question} answered={answered} onAnswer={answer} revealAnswer={false} />
            )}
            {question.format === "order" && (
              <OrderQuestionView key={question.id} question={question} answered={answered} onAnswer={answer} />
            )}
            {question.format === "match" && (
              <MatchQuestionView key={question.id} question={question} answered={answered} onAnswer={answer} />
            )}
            {answered && (
              <Button className="mt-5 w-full" onClick={next} data-testid="phase-challenge-next">
                {pos + 1 >= questions.length ? t("phaseChallenge.finish") : t("phaseChallenge.next")}
              </Button>
            )}
          </Card>
        </div>
      </MandarinHelpProvider>
    );
  }

  // ——— Prévia (K6) ——————————————————————————————————————————————
  const startGate = canStartPhaseChallenge({ target, folego, cooldowns, now });
  const remaining = formatCooldownRemaining(cooldown.remainingMs);
  const bankMissing = target.eligible && exam?.status !== "ok";
  const reasonText =
    target.reason === "already_reached"
      ? t("phaseChallenge.reasonAlready")
      : target.reason === "too_far"
        ? t("phaseChallenge.reasonTooFar")
        : target.reason === "culture_gate"
          ? t("phaseChallenge.reasonCulture")
          : target.reason === "pro_content"
            ? t("phaseChallenge.reasonPro")
            : target.reason === "nothing_to_prove"
              ? t("phaseChallenge.reasonNothing")
              : bankMissing
                ? t("phaseChallenge.reasonBank")
                : null;
  const canStart = startGate.ok && !bankMissing;

  return (
    <div
      className="mx-auto max-w-xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4"
      data-testid="phase-challenge-preview"
      data-phase-id={target.phase.id}
      data-challenge-kind={target.kind ?? "none"}
      data-challenge-cost={target.cost}
    >
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">{t("phaseChallenge.eyebrow")}</Pill>
          {target.kind && (
            <Pill tone="muted">{target.kind === "next" ? t("phaseChallenge.kindNext") : t("phaseChallenge.kindAdvanced")}</Pill>
          )}
        </div>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-ink sm:text-3xl">
          {t("phaseChallenge.title", { phase: phaseTitle })}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("phaseChallenge.lead")}</p>

        {target.kind && (
          <div className="mt-4 rounded-2xl border border-accent/25 bg-accent-soft/50 px-4 py-3">
            <p className="text-base font-semibold text-ink" data-testid="phase-challenge-cost">
              {target.kind === "next" ? t("phaseChallenge.costNext") : t("phaseChallenge.costAdvanced")}
            </p>
            <p className="mt-0.5 text-sm text-ink-soft" data-testid="phase-challenge-balance">
              {t("phaseChallenge.balance", { n: folego })}
            </p>
          </div>
        )}

        {target.eligible && exam?.status === "ok" && (
          <p className="mt-3 text-xs text-ink-faint">
            {t("phaseChallenge.scope", {
              units: target.scopeUnits.length,
              lessons: target.skippableLessonIds.length,
              questions: questions.length,
            })}
          </p>
        )}

        <ul className="mt-4 space-y-1.5 text-sm leading-6 text-ink-soft">
          <li>• {t("phaseChallenge.rulePass", { percent: requiredPercent })}</li>
          <li>• {t("phaseChallenge.ruleCooldown")}</li>
          <li>• {t("phaseChallenge.ruleExam")}</li>
          <li>• {t("phaseChallenge.ruleLeave")}</li>
          <li>• {t("phaseChallenge.ruleProves")}</li>
        </ul>

        {reasonText && (
          <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink" data-testid="phase-challenge-blocked" data-reason={target.reason ?? "bank"}>
            {reasonText}
            {target.reason === "culture_gate" && target.cultureGateItemId && (
              <>
                {" "}
                <Link to={`/cultura/${target.cultureGateItemId}`} className="font-semibold text-accent underline-offset-2 hover:underline">
                  {t("phaseChallenge.reasonCultureCta")}
                </Link>
              </>
            )}
          </p>
        )}
        {cooldown.blocked && (
          <p className="mt-4 rounded-xl bg-wrong-soft px-3 py-2.5 text-sm font-medium text-ink" data-testid="phase-challenge-cooldown" data-retry-at={cooldown.retryAt ?? ""}>
            {t("phaseChallenge.cooldown", { h: remaining.hours, m: remaining.minutes })}
          </p>
        )}
        {!startGate.ok && startGate.reason === "folego" && (
          <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink" data-testid="phase-challenge-no-folego">
            {t("phaseChallenge.notEnoughFolego", { n: folego, cost: target.cost })}
          </p>
        )}

        <div className="mt-5 grid gap-2">
          <Button onClick={begin} disabled={!canStart} data-testid="phase-challenge-start">
            {t("phaseChallenge.start", { cost: target.cost })}
          </Button>
          <Button variant="outline" onClick={() => navigate("/jornada")}>
            {t("phaseChallenge.back")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
