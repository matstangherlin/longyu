/**
 * RC2.2.8 · K — Phase Challenge ("Testar esta fase").
 *
 * Quem já sabe prova e avança. Três regras seguram isso de virar atalho pago:
 *
 * 1. Custa Fôlego — 3 para a PRÓXIMA fase, 4 para UMA fase além dela — e o
 *    débito acontece uma vez por `attemptId`, nunca duas.
 * 2. Reprovar abre um cooldown de 48h por fase-alvo. Nenhuma função deste
 *    módulo recebe Pro, Pérola ou Qi: não existe parâmetro por onde um
 *    pagamento pudesse encurtar a espera (K8).
 * 3. O teste reutiliza o motor do teste de módulo (`buildModuleSkipTest` +
 *    `gradeModuleSkipTest`). Não há segundo gerador de prova.
 *
 * Semântica: "Testar a fase P" é provar o conteúdo que falta para ENTRAR em P —
 * as unidades entre a fronteira atual do aluno e o início de P. Passar marca
 * só essas lições (1 estrela, via `completeLessonViaTest`) e nada além:
 * nenhum Selo Cultural, nenhuma medalha artificial, nenhuma 3ª estrela, nenhum
 * XP de lição pulada (K10). Fundamentos (`FOUNDATION_LESSON_IDS`) e lições
 * culturais nunca entram (K11, K10.1). Marco cultural trancado no caminho
 * bloqueia o alvo (K10.2) — senão o grandfather do marco o abriria sozinho.
 *
 * Este módulo não é o nivelamento do onboarding (K1): aquele mede o ponto de
 * partida antes da conta; este desafia uma fase futura de quem já estuda.
 */

import { JOURNEY, FOUNDATION_LESSON_IDS, type JourneyPhase, type Lesson, type Unit } from "../data/journey";
import { isCultureLessonId } from "../data/cultureNative";
import {
  buildModuleSkipTest,
  gradeModuleSkipTest,
  type ExamGradeResult,
  type ExamKind,
  type ExamQuestion,
} from "../features/challenge/examBuilder";
import { cultureGateForTopic, type CultureProgressionProgress } from "./cultureProgressionGate";

export type PhaseChallengeKind = "next" | "advanced";

/** K5.1 / K5.2 — custo em Fôlego. Fôlego, NÃO Carga diária. */
export const PHASE_CHALLENGE_FOLEGO_COST: Readonly<Record<PhaseChallengeKind, number>> = {
  next: 3,
  advanced: 4,
};

/** K7 — espera depois de reprovar, por fase-alvo. */
export const PHASE_CHALLENGE_COOLDOWN_HOURS = 48;
export const PHASE_CHALLENGE_COOLDOWN_MS = PHASE_CHALLENGE_COOLDOWN_HOURS * 60 * 60 * 1000;

/** K4.1 — sem banco suficiente não há teste. */
export const PHASE_CHALLENGE_MIN_QUESTIONS = 12;
export const PHASE_CHALLENGE_MAX_QUESTIONS = 24;
export const PHASE_CHALLENGE_MIN_PER_UNIT = 2;

export interface PhaseChallengeAttempt {
  id: string;
  targetPhaseId: string;
  kind: PhaseChallengeKind;
  cost: number;
  startedAt: number;
  finishedAt?: number;
  passed?: boolean;
}

export type PhaseChallengeBlockReason =
  | "unknown_phase"
  | "already_reached"
  | "too_far"
  | "culture_gate"
  | "pro_content"
  | "nothing_to_prove"
  | "insufficient_bank";

export interface PhaseChallengeTarget {
  phase: JourneyPhase;
  phaseIndex: number;
  kind: PhaseChallengeKind | null;
  cost: number;
  eligible: boolean;
  reason?: PhaseChallengeBlockReason;
  /** Unidades cujo conteúdo o teste precisa provar. */
  scopeUnits: Unit[];
  /** Lições que um PASS marca — nada fora daqui. */
  skippableLessonIds: string[];
  /** Id do CultureItem do marco que bloqueia, quando `culture_gate`. */
  cultureGateItemId?: string;
}

export interface PhaseChallengeContext extends CultureProgressionProgress {
  completedLessons: readonly string[];
  isPremium?: boolean;
}

function lessonIsSkippable(lesson: Lesson, isPremium: boolean): boolean {
  if (FOUNDATION_LESSON_IDS.includes(lesson.id)) return false;
  if (isCultureLessonId(lesson.id)) return false;
  if (lesson.premium && !isPremium) return false;
  return true;
}

/** Índice da fase onde está o primeiro tópico ainda não concluído. */
export function frontierPhaseIndex(completedLessons: readonly string[]): number {
  const done = new Set(completedLessons);
  const index = JOURNEY.findIndex((phase) =>
    phase.units.some((unit) => unit.lessons.some((lesson) => !done.has(lesson.id)))
  );
  return index < 0 ? JOURNEY.length : index;
}

/**
 * Avalia UMA fase como alvo. Pura: mesma entrada, mesma saída — a Jornada, a
 * rota do teste e os validadores leem esta mesma função.
 */
export function evaluatePhaseChallengeTarget(
  phaseId: string,
  context: PhaseChallengeContext
): PhaseChallengeTarget | null {
  const phaseIndex = JOURNEY.findIndex((phase) => phase.id === phaseId);
  if (phaseIndex < 0) return null;
  const phase = JOURNEY[phaseIndex];
  const frontier = frontierPhaseIndex(context.completedLessons);
  const distance = phaseIndex - frontier;
  const kind: PhaseChallengeKind | null = distance === 1 ? "next" : distance === 2 ? "advanced" : null;
  const base: PhaseChallengeTarget = {
    phase,
    phaseIndex,
    kind,
    cost: kind ? PHASE_CHALLENGE_FOLEGO_COST[kind] : 0,
    eligible: false,
    scopeUnits: [],
    skippableLessonIds: [],
  };
  if (distance <= 0) return { ...base, reason: "already_reached" };
  // K4.1 — nunca "saltar direto ao fim": no máximo uma fase além da próxima.
  if (!kind) return { ...base, reason: "too_far" };

  const isPremium = Boolean(context.isPremium);
  const done = new Set(context.completedLessons);
  const firstTargetLesson = phase.units[0]?.lessons[0];
  if (firstTargetLesson?.premium && !isPremium) return { ...base, reason: "pro_content" };

  // K10.2 — o caminho até o alvo inteiro, incluindo o próprio primeiro tópico
  // do alvo, não pode atravessar um marco cultural trancado.
  const pathLessons = JOURNEY.slice(frontier, phaseIndex + 1).flatMap((candidate, offset) =>
    candidate.units.flatMap((unit) =>
      frontier + offset === phaseIndex ? unit.lessons.slice(0, 1) : unit.lessons
    )
  );
  for (const lesson of pathLessons) {
    if (done.has(lesson.id)) continue;
    const gate = cultureGateForTopic(lesson.id, context);
    if (gate && !gate.ready) {
      return { ...base, reason: "culture_gate", cultureGateItemId: gate.nextItemId };
    }
  }

  const scopeUnits: Unit[] = [];
  const skippableLessonIds: string[] = [];
  for (const scopePhase of JOURNEY.slice(frontier, phaseIndex)) {
    for (const unit of scopePhase.units) {
      const pending = unit.lessons.filter((lesson) => !done.has(lesson.id) && lessonIsSkippable(lesson, isPremium));
      if (pending.length === 0) continue;
      scopeUnits.push(unit);
      skippableLessonIds.push(...pending.map((lesson) => lesson.id));
    }
  }
  if (skippableLessonIds.length === 0) {
    return { ...base, scopeUnits, skippableLessonIds, reason: "nothing_to_prove" };
  }
  return { ...base, scopeUnits, skippableLessonIds, eligible: true };
}

/** Alvos mostrados na Jornada: a próxima fase e a seguinte, quando existem. */
export function listPhaseChallengeTargets(context: PhaseChallengeContext): PhaseChallengeTarget[] {
  const frontier = frontierPhaseIndex(context.completedLessons);
  return JOURNEY.slice(frontier + 1, frontier + 3)
    .map((phase) => evaluatePhaseChallengeTarget(phase.id, context))
    .filter((target): target is PhaseChallengeTarget => Boolean(target));
}

export type PhaseChallengeExam =
  | { status: "ok"; questions: ExamQuestion[] }
  | { status: "insufficient"; validCount: number };

/**
 * Monta a prova da fase a partir dos testes de módulo existentes. Toda unidade
 * do escopo precisa ter banco próprio (K4.1): uma unidade sem perguntas
 * válidas tornaria "passar" uma afirmação sobre conteúdo nunca medido.
 */
export function buildPhaseChallengeExam(scopeUnits: readonly Unit[]): PhaseChallengeExam {
  if (scopeUnits.length === 0) return { status: "insufficient", validCount: 0 };
  const perUnitBanks: ExamQuestion[][] = [];
  for (const unit of scopeUnits) {
    const exam = buildModuleSkipTest(unit);
    if (exam.status !== "ok") return { status: "insufficient", validCount: exam.validCount };
    // Essenciais primeiro: o corte por unidade nunca descarta o núcleo.
    perUnitBanks.push([...exam.questions].sort((a, b) => Number(b.isEssential) - Number(a.isEssential)));
  }
  const perUnit = Math.max(
    PHASE_CHALLENGE_MIN_PER_UNIT,
    Math.min(
      Math.ceil(PHASE_CHALLENGE_MIN_QUESTIONS / scopeUnits.length),
      Math.floor(PHASE_CHALLENGE_MAX_QUESTIONS / scopeUnits.length)
    )
  );
  const questions = perUnitBanks.flatMap((bank) => bank.slice(0, perUnit)).slice(0, PHASE_CHALLENGE_MAX_QUESTIONS);
  if (questions.length < PHASE_CHALLENGE_MIN_QUESTIONS) {
    return { status: "insufficient", validCount: questions.length };
  }
  return { status: "ok", questions };
}

export interface PhaseChallengeGrade extends ExamGradeResult {
  strongAreas: ExamKind[];
  weakAreas: ExamKind[];
}

/** K13 — nota + áreas fortes/fracas. Não expõe gabarito (K13.1). */
export function gradePhaseChallenge(
  questions: readonly ExamQuestion[],
  correctIds: ReadonlySet<string>
): PhaseChallengeGrade {
  const grade = gradeModuleSkipTest([...questions], correctIds);
  const byKind = new Map<ExamKind, { total: number; correct: number }>();
  for (const question of questions) {
    const row = byKind.get(question.kind) ?? { total: 0, correct: 0 };
    row.total += 1;
    if (correctIds.has(question.id)) row.correct += 1;
    byKind.set(question.kind, row);
  }
  const strongAreas: ExamKind[] = [];
  const weakAreas: ExamKind[] = [];
  for (const [kind, row] of byKind) {
    if (row.total === 0) continue;
    if (row.correct / row.total >= 0.9) strongAreas.push(kind);
    else if (row.correct / row.total < 0.75) weakAreas.push(kind);
  }
  return { ...grade, strongAreas, weakAreas };
}

export interface PhaseChallengeCooldownState {
  blocked: boolean;
  retryAt: number | null;
  remainingMs: number;
}

/**
 * K7 / K8 — o cooldown lê só o relógio e o registro. Não há argumento de
 * plano, moeda ou inventário: Pro, Pérola e Qi não têm como encurtá-lo.
 */
export function phaseChallengeCooldown(
  cooldowns: Readonly<Record<string, number>> | undefined,
  targetPhaseId: string,
  now: number
): PhaseChallengeCooldownState {
  const retryAt = cooldowns?.[targetPhaseId];
  if (!retryAt || !Number.isFinite(retryAt) || now >= retryAt) {
    return { blocked: false, retryAt: retryAt ?? null, remainingMs: 0 };
  }
  return { blocked: true, retryAt, remainingMs: retryAt - now };
}

export type PhaseChallengeStartBlock = "not_eligible" | "cooldown" | "folego";

export function canStartPhaseChallenge(input: {
  target: PhaseChallengeTarget;
  folego: number;
  cooldowns: Readonly<Record<string, number>> | undefined;
  now: number;
}): { ok: true } | { ok: false; reason: PhaseChallengeStartBlock } {
  if (!input.target.eligible || !input.target.kind) return { ok: false, reason: "not_eligible" };
  if (phaseChallengeCooldown(input.cooldowns, input.target.phase.id, input.now).blocked) {
    return { ok: false, reason: "cooldown" };
  }
  if (input.folego < input.target.cost) return { ok: false, reason: "folego" };
  return { ok: true };
}

export interface PhaseChallengeLedger {
  folego: number;
  phaseChallengeAttempts: PhaseChallengeAttempt[];
  phaseChallengeCooldowns: Record<string, number>;
}

/**
 * K5.3 — débito idempotente. O mesmo `attemptId` nunca cobra duas vezes:
 * reentrar na tela, recarregar ou tocar duas vezes em "Começar" devolve a
 * tentativa já paga sem mexer no saldo.
 */
export function applyPhaseChallengeDebit(
  state: PhaseChallengeLedger,
  input: { attemptId: string; target: PhaseChallengeTarget; now: number }
):
  | { ok: true; charged: boolean; patch: Partial<PhaseChallengeLedger> }
  | { ok: false; reason: PhaseChallengeStartBlock } {
  const existing = (state.phaseChallengeAttempts ?? []).find((attempt) => attempt.id === input.attemptId);
  if (existing) return { ok: true, charged: false, patch: {} };
  const gate = canStartPhaseChallenge({
    target: input.target,
    folego: state.folego,
    cooldowns: state.phaseChallengeCooldowns,
    now: input.now,
  });
  if (!gate.ok) return gate;
  const attempt: PhaseChallengeAttempt = {
    id: input.attemptId,
    targetPhaseId: input.target.phase.id,
    kind: input.target.kind as PhaseChallengeKind,
    cost: input.target.cost,
    startedAt: input.now,
  };
  return {
    ok: true,
    charged: true,
    patch: {
      folego: Math.max(0, state.folego - input.target.cost),
      phaseChallengeAttempts: [...(state.phaseChallengeAttempts ?? []), attempt].slice(-50),
    },
  };
}

/**
 * Fecha a tentativa. Reprovar grava `nextPhaseChallengeAt[targetPhaseId]` =
 * agora + 48h. Fechar de novo a mesma tentativa não estende nem encurta nada.
 */
export function applyPhaseChallengeResult(
  state: PhaseChallengeLedger,
  input: { attemptId: string; passed: boolean; now: number }
): Partial<PhaseChallengeLedger> | null {
  const attempts = state.phaseChallengeAttempts ?? [];
  const attempt = attempts.find((candidate) => candidate.id === input.attemptId);
  if (!attempt || attempt.finishedAt) return null;
  const finished: PhaseChallengeAttempt = { ...attempt, finishedAt: input.now, passed: input.passed };
  const phaseChallengeAttempts = attempts.map((candidate) => (candidate.id === attempt.id ? finished : candidate));
  if (input.passed) return { phaseChallengeAttempts };
  return {
    phaseChallengeAttempts,
    phaseChallengeCooldowns: {
      ...(state.phaseChallengeCooldowns ?? {}),
      [attempt.targetPhaseId]: input.now + PHASE_CHALLENGE_COOLDOWN_MS,
    },
  };
}

/** Sync entre aparelhos: cooldown mais longo vence; tentativas se somam. */
export function mergePhaseChallengeState(
  local: Partial<PhaseChallengeLedger>,
  remote: Partial<PhaseChallengeLedger>
): Pick<PhaseChallengeLedger, "phaseChallengeAttempts" | "phaseChallengeCooldowns"> {
  const cooldowns: Record<string, number> = { ...(remote.phaseChallengeCooldowns ?? {}) };
  for (const [phaseId, at] of Object.entries(local.phaseChallengeCooldowns ?? {})) {
    cooldowns[phaseId] = Math.max(cooldowns[phaseId] ?? 0, at);
  }
  const byId = new Map<string, PhaseChallengeAttempt>();
  for (const attempt of [...(remote.phaseChallengeAttempts ?? []), ...(local.phaseChallengeAttempts ?? [])]) {
    const previous = byId.get(attempt.id);
    // Uma tentativa finalizada vence a mesma tentativa ainda aberta.
    if (!previous || (!previous.finishedAt && attempt.finishedAt)) byId.set(attempt.id, attempt);
  }
  return {
    phaseChallengeCooldowns: cooldowns,
    phaseChallengeAttempts: [...byId.values()].sort((a, b) => a.startedAt - b.startedAt).slice(-50),
  };
}

export function formatCooldownRemaining(remainingMs: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
