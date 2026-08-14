/**
 * Pedagogia V3.3 — Mastery Quality Score.
 *
 * masteryCoverage.ts classifica QUAIS lições entram na remessa (a Jornada
 * inteira, sem dependência de piloto/planos). Este arquivo complementa com
 * uma nota de QUALIDADE por lição: confirma que `masteryLoop: true` não é só
 * uma flag — vem acompanhado de alvos lexicais reais (masteryPilot.ts) e de
 * planos M1–M4 que realmente progridem (produção/transferência, scaffold
 * decrescente, sem "profundidade falsa" — repetir o mesmo formato com
 * fachada de avanço).
 *
 * Arquivo isolado (não importa journey.ts nem lessonTasks.ts) para poder ser
 * carregado com segurança por scripts defensivos mesmo se outro arquivo do
 * piloto estiver em edição em paralelo.
 */
import {
  isProductionOrTransferKind,
  masteryPassProfile,
  scaffoldForMasteryPass,
  MASTERY_PASS_GRADED_BUDGET,
  type MasteryPass,
} from "./masteryLoop";
import { isMasteryPilotLesson, PILOT_LEXICAL_TARGETS, type UnitLexicalTargets } from "./masteryPilot";
import type { LessonStep } from "./journey";

export interface MasteryQualityCheck {
  id: string;
  ok: boolean;
  detail?: string;
}

export interface MasteryQualityResult {
  /** 0–100. */
  score: number;
  /** true se a lição atinge o limiar mínimo de qualidade. */
  passes: boolean;
  checks: MasteryQualityCheck[];
}

/** Planos já resolvidos (graded + bônus) por pass — o chamador monta isso via lessonRoundStepsFor + masteryBonusStepsFor. */
export type MasteryPlansByPass = Partial<Record<MasteryPass, LessonStep[]>>;

const MASTERY_PASSES: readonly MasteryPass[] = [1, 2, 3, 4];

/** Precisa de pelo menos 6 dos 7 checks ok para contar como "quality migrated". */
const REQUIRED_OK_CHECKS = 6;

function lexicalTargetsFor(lessonId: string): UnitLexicalTargets | undefined {
  return (PILOT_LEXICAL_TARGETS as Record<string, UnitLexicalTargets | undefined>)[lessonId];
}

function stepSignature(step: LessonStep): string {
  return [step.kind, step.title, step.correctAnswer, step.answer, step.audioText, step.prompt, step.hanzi, step.text]
    .filter((part): part is string => Boolean(part))
    .join("|");
}

function planSignature(plan: LessonStep[] | undefined): string {
  if (!plan || plan.length === 0) return "";
  return plan.map(stepSignature).join("~");
}

function hasAllPassPlans(plansByPass: MasteryPlansByPass | undefined): plansByPass is Record<MasteryPass, LessonStep[]> {
  if (!plansByPass) return false;
  return MASTERY_PASSES.every((pass) => Array.isArray(plansByPass[pass]));
}

/**
 * Avalia a qualidade do conteúdo mastery de uma lição.
 *
 * `plansByPass` é opcional: quando omitido (ex.: chamador só tem acesso ao
 * nível "core", sem lessonTasks.ts), os checks que dependem de planos
 * resolvidos ficam marcados como "ok" com uma nota de checagem pulada — o
 * score não pune o que não pôde ser medido. Os checks lexicais/scaffold
 * (que não dependem de plano) sempre são avaliados de verdade.
 */
export function masteryQualityScore(lessonId: string, plansByPass?: MasteryPlansByPass): MasteryQualityResult {
  const checks: MasteryQualityCheck[] = [];
  const targets = lexicalTargetsFor(lessonId);
  const plansReady = hasAllPassPlans(plansByPass);

  // 1) Planos para as 4 passes existem e diferem entre si (M1≠M2≠M3≠M4).
  if (!plansByPass) {
    checks.push({ id: "plans_differ", ok: true, detail: "planos não fornecidos — checagem pulada" });
  } else {
    const sigs = MASTERY_PASSES.map((pass) => planSignature(plansByPass[pass]));
    const allExist = sigs.every((sig) => sig.length > 0);
    const consecutiveDiffer = allExist && sigs[0] !== sigs[1] && sigs[1] !== sigs[2] && sigs[2] !== sigs[3];
    checks.push({
      id: "plans_differ",
      ok: allExist && consecutiveDiffer,
      detail: !allExist
        ? "algum pass está sem plano"
        : consecutiveDiffer
          ? undefined
          : "passes consecutivos não diferem o suficiente",
    });
  }

  // 2) M3 contém um kind de produção/transferência.
  if (!plansReady) {
    checks.push({ id: "m3_production", ok: true, detail: "plano de M3 não fornecido — checagem pulada" });
  } else {
    const plan3 = plansByPass[3];
    const ok = plan3.some((step) => isProductionOrTransferKind(step.kind));
    checks.push({ id: "m3_production", ok, detail: ok ? undefined : "M3 sem passo de produção/transferência" });
  }

  // 3) M4 contém transferência/produção quando a lição tem função comunicativa.
  const hasCommunicativeContent = Boolean(targets && targets.communicativeFunctions.length > 0);
  if (!hasCommunicativeContent) {
    checks.push({ id: "m4_transfer", ok: true, detail: "sem função comunicativa classificada — não aplicável" });
  } else if (!plansReady) {
    checks.push({ id: "m4_transfer", ok: true, detail: "plano de M4 não fornecido — checagem pulada" });
  } else {
    const plan4 = plansByPass[4];
    const ok = plan4.some((step) => isProductionOrTransferKind(step.kind));
    checks.push({ id: "m4_transfer", ok, detail: ok ? undefined : "M4 sem transferência/produção" });
  }

  // 4) Scaffold showPortuguese não aumenta de M1 para M4 (uma vez desligado, some).
  const showPortugueseByPass = MASTERY_PASSES.map((pass) => scaffoldForMasteryPass(pass).showPortuguese);
  const scaffoldNeverReappears = showPortugueseByPass.every(
    (value, index) => index === 0 || !(value && !showPortugueseByPass[index - 1])
  );
  checks.push({
    id: "scaffold_decreases",
    ok: scaffoldNeverReappears,
    detail: scaffoldNeverReappears ? undefined : "showPortuguese reaparece depois de desligar numa pass anterior",
  });

  // 5) Alvos lexicais existem (e estão completos) para lições do piloto.
  if (!isMasteryPilotLesson(lessonId)) {
    checks.push({ id: "lexical_targets", ok: true, detail: "lição fora do piloto — lexical targets não aplicável" });
  } else {
    const ok = Boolean(
      targets &&
        targets.vocabulary.length > 0 &&
        targets.structuresTarget.length > 0 &&
        targets.communicativeFunctions.length > 0 &&
        targets.networkChunks.length >= 1
    );
    checks.push({
      id: "lexical_targets",
      ok,
      detail: ok ? undefined : "PILOT_LEXICAL_TARGETS ausente ou incompleto para esta lição do piloto",
    });
  }

  // 6) Sem "profundidade falsa": pass 2+ não deveria usar kinds desencorajados
  //    daquela própria pass (ex.: ainda usar "intro"/"flashcard" em M3/M4).
  if (!plansReady) {
    checks.push({ id: "no_false_depth", ok: true, detail: "planos não fornecidos — checagem pulada" });
  } else {
    const offenders: string[] = [];
    for (const pass of [2, 3, 4] as MasteryPass[]) {
      const profile = masteryPassProfile(pass);
      const discouraged = plansByPass[pass].filter((step) => profile.discouragedKinds.includes(step.kind));
      if (discouraged.length > 0) {
        offenders.push(`M${pass}: ${discouraged.map((step) => step.kind).join(", ")}`);
      }
    }
    checks.push({
      id: "no_false_depth",
      ok: offenders.length === 0,
      detail: offenders.length === 0 ? undefined : `kind(s) desencorajado(s) presentes — ${offenders.join("; ")}`,
    });
  }

  // 7) Tamanho do plano graduado respeita MASTERY_PASS_GRADED_BUDGET (+6 de bônus).
  if (!plansReady) {
    checks.push({ id: "graded_budget", ok: true, detail: "planos não fornecidos — checagem pulada" });
  } else {
    const offenders: string[] = [];
    for (const pass of MASTERY_PASSES) {
      const plan = plansByPass[pass];
      const budget = MASTERY_PASS_GRADED_BUDGET[pass];
      if (plan.length > budget.max + 6) {
        offenders.push(`M${pass}: ${plan.length} > ${budget.max + 6}`);
      }
    }
    checks.push({
      id: "graded_budget",
      ok: offenders.length === 0,
      detail: offenders.length === 0 ? undefined : offenders.join("; "),
    });
  }

  const okCount = checks.filter((check) => check.ok).length;
  const score = Math.round((okCount / checks.length) * 100);
  const passes = okCount >= REQUIRED_OK_CHECKS;

  return { score, passes, checks };
}
