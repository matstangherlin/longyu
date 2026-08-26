/**
 * Pedagogia V3.4 — Mastery Quality Score (hardened).
 *
 * Tri-state checks: pass | fail | not_evaluated | not_applicable.
 * - not_evaluated NEVER increases the score (excluded from numerator AND
 *   must not be counted as success).
 * - not_applicable is removed from the denominator.
 * - score = passed / (passed + failed) among evaluated applicable checks.
 *
 * Certified coverage requires real plansByPass (M1–M4). Calling without
 * plans leaves plan-dependent checks as not_evaluated — the lesson will
 * not count as certified.
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
import { isProductionStep } from "./exerciseFeasibility";

export type MasteryQualityCheckStatus = "pass" | "fail" | "not_evaluated" | "not_applicable";

export interface MasteryQualityCheck {
  id: string;
  /** @deprecated Prefer `status`. Kept for backward-compatible boolean reads. */
  ok: boolean;
  status: MasteryQualityCheckStatus;
  detail?: string;
}

export interface MasteryQualityResult {
  /** 0–100 among evaluated applicable checks. 0 if nothing was evaluated. */
  score: number;
  /** true if score meets threshold AND no evaluated check failed hard requirements. */
  passes: boolean;
  /** How many checks were actually evaluated (pass+fail). */
  evaluatedCount: number;
  /** How many evaluated checks passed. */
  passedCount: number;
  /** How many checks were not_evaluated (should be 0 for certification). */
  notEvaluatedCount: number;
  checks: MasteryQualityCheck[];
}

/** Depth ratios for PED-117 — recognition / production / transfer mix. */
export interface MasteryDepthMetrics {
  recognitionRatio: number;
  productionRatio: number;
  transferRatio: number;
  lexicalGrowth: number;
  structuralGrowth: number;
  gradedCount: number;
}

/** Planos já resolvidos (graded + bônus) por pass. */
export type MasteryPlansByPass = Partial<Record<MasteryPass, LessonStep[]>>;

const MASTERY_PASSES: readonly MasteryPass[] = [1, 2, 3, 4];

/** Fraction of evaluated applicable checks that must pass. */
const REQUIRED_PASS_RATIO = 6 / 7;

/** Hard: certification requires zero not_evaluated when plans are expected. */
export const MASTERY_QUALITY_CERTIFY_MIN_SCORE = Math.round(REQUIRED_PASS_RATIO * 100);

const RECOGNITION_KINDS = new Set([
  "intro",
  "flashcard",
  "listen",
  "listen_select",
  "match_pairs",
  "recognize",
  "image_choice",
  "microread",
  "comprehend",
  "place_label",
  "sign_reading",
  "menu_reading",
  "audio_to_action",
  "contextual_choice",
]);

const TRANSFER_KINDS = new Set([
  "conversation_scene",
  "city_context",
  "map_direction",
  "route_sequence",
  "schedule_reading",
  "price_task",
  "address_build",
]);

function lexicalTargetsFor(lessonId: string): UnitLexicalTargets | undefined {
  return (PILOT_LEXICAL_TARGETS as Record<string, UnitLexicalTargets | undefined>)[lessonId];
}

function check(
  id: string,
  status: MasteryQualityCheckStatus,
  detail?: string
): MasteryQualityCheck {
  return {
    id,
    status,
    ok: status === "pass" || status === "not_applicable",
    detail,
  };
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
  return MASTERY_PASSES.every((pass) => Array.isArray(plansByPass[pass]) && (plansByPass[pass]?.length ?? 0) > 0);
}

function countRoles(targets: UnitLexicalTargets | undefined): {
  core: number;
  support: number;
  productive: number;
  receptive: number;
} {
  const counts = { core: 0, support: 0, productive: 0, receptive: 0 };
  if (!targets) return counts;
  for (const item of targets.vocabulary) {
    if (item.role in counts) counts[item.role as keyof typeof counts] += 1;
  }
  return counts;
}

/**
 * Avalia a qualidade do conteúdo mastery de uma lição.
 *
 * Sem `plansByPass`, checks dependentes de plano ficam `not_evaluated`
 * (não inflacionam o score). Com planos, todos os checks aplicáveis são
 * avaliados de verdade.
 */
export function masteryQualityScore(lessonId: string, plansByPass?: MasteryPlansByPass): MasteryQualityResult {
  const checks: MasteryQualityCheck[] = [];
  const targets = lexicalTargetsFor(lessonId);
  const plansReady = hasAllPassPlans(plansByPass);

  // 1) Planos para as 4 passes existem e diferem entre si (M1≠M2≠M3≠M4).
  if (!plansByPass) {
    checks.push(check("plans_differ", "not_evaluated", "planos não fornecidos"));
  } else {
    const sigs = MASTERY_PASSES.map((pass) => planSignature(plansByPass[pass]));
    const allExist = sigs.every((sig) => sig.length > 0);
    const consecutiveDiffer = allExist && sigs[0] !== sigs[1] && sigs[1] !== sigs[2] && sigs[2] !== sigs[3];
    checks.push(
      check(
        "plans_differ",
        allExist && consecutiveDiffer ? "pass" : "fail",
        !allExist
          ? "algum pass está sem plano"
          : consecutiveDiffer
            ? undefined
            : "passes consecutivos não diferem o suficiente"
      )
    );
  }

  // 2) M3 contém um kind de produção/transferência.
  if (!plansReady) {
    checks.push(check("m3_production", "not_evaluated", "plano de M3 não fornecido"));
  } else {
    const plan3 = plansByPass[3];
    const ok = plan3.some((step) => isProductionStep(step));
    checks.push(check("m3_production", ok ? "pass" : "fail", ok ? undefined : "M3 sem passo de produção/transferência"));
  }

  // 3) M4 contém transferência/produção quando a lição tem função comunicativa.
  const hasCommunicativeContent = Boolean(targets && targets.communicativeFunctions.length > 0);
  if (!hasCommunicativeContent && !isMasteryPilotLesson(lessonId)) {
    checks.push(check("m4_transfer", "not_applicable", "sem função comunicativa classificada"));
  } else if (!plansReady) {
    checks.push(check("m4_transfer", "not_evaluated", "plano de M4 não fornecido"));
  } else {
    const plan4 = plansByPass[4];
    const ok = plan4.some((step) => isProductionOrTransferKind(step.kind));
    checks.push(check("m4_transfer", ok ? "pass" : "fail", ok ? undefined : "M4 sem transferência/produção"));
  }

  // 4) Scaffold showPortuguese não aumenta de M1 para M4.
  const showPortugueseByPass = MASTERY_PASSES.map((pass) => scaffoldForMasteryPass(pass).showPortuguese);
  const scaffoldNeverReappears = showPortugueseByPass.every(
    (value, index) => index === 0 || !(value && !showPortugueseByPass[index - 1])
  );
  checks.push(
    check(
      "scaffold_decreases",
      scaffoldNeverReappears ? "pass" : "fail",
      scaffoldNeverReappears ? undefined : "showPortuguese reaparece depois de desligar numa pass anterior"
    )
  );

  // 5) Alvos lexicais — obrigatórios para qualquer lição no currículo mastery
  //    (piloto/completion). Fora do currículo: not_applicable.
  if (!isMasteryPilotLesson(lessonId)) {
    checks.push(check("lexical_targets", "not_applicable", "lição fora do currículo mastery lexical"));
  } else {
    const roles = countRoles(targets);
    const ok = Boolean(
      targets &&
        targets.vocabulary.length > 0 &&
        targets.structuresTarget.length > 0 &&
        targets.communicativeFunctions.length > 0 &&
        targets.networkChunks.length >= 1 &&
        roles.core >= 1 &&
        roles.productive >= 1
    );
    checks.push(
      check(
        "lexical_targets",
        ok ? "pass" : "fail",
        ok
          ? undefined
          : `PILOT_LEXICAL_TARGETS ausente/incompleto (core=${roles.core}, productive=${roles.productive})`
      )
    );
  }

  // 5b) Léxico por papel — PED-115 (support when there is more than 1 item).
  if (!isMasteryPilotLesson(lessonId)) {
    checks.push(check("lexical_roles", "not_applicable", "fora do currículo mastery lexical"));
  } else if (!targets) {
    checks.push(check("lexical_roles", "fail", "sem alvos lexicais"));
  } else {
    const roles = countRoles(targets);
    const ok = roles.core >= 1 && roles.productive >= 1 && (targets.vocabulary.length < 3 || roles.support >= 1);
    checks.push(
      check(
        "lexical_roles",
        ok ? "pass" : "fail",
        ok ? undefined : `papéis insuficientes core=${roles.core} support=${roles.support} productive=${roles.productive}`
      )
    );
  }

  // 6) Sem profundidade falsa: pass 2+ sem kinds desencorajados.
  if (!plansReady) {
    checks.push(check("no_false_depth", "not_evaluated", "planos não fornecidos"));
  } else {
    const offenders: string[] = [];
    for (const pass of [2, 3, 4] as MasteryPass[]) {
      const profile = masteryPassProfile(pass);
      const discouraged = plansByPass[pass].filter((step) => profile.discouragedKinds.includes(step.kind));
      if (discouraged.length > 0) {
        offenders.push(`M${pass}: ${discouraged.map((step) => step.kind).join(", ")}`);
      }
    }
    checks.push(
      check(
        "no_false_depth",
        offenders.length === 0 ? "pass" : "fail",
        offenders.length === 0 ? undefined : `kind(s) desencorajado(s) — ${offenders.join("; ")}`
      )
    );
  }

  // 7) Tamanho do plano respeita MASTERY_PASS_GRADED_BUDGET (+6 bônus).
  if (!plansReady) {
    checks.push(check("graded_budget", "not_evaluated", "planos não fornecidos"));
  } else {
    const offenders: string[] = [];
    for (const pass of MASTERY_PASSES) {
      const plan = plansByPass[pass];
      const budget = MASTERY_PASS_GRADED_BUDGET[pass];
      if (plan.length > budget.max + 6) {
        offenders.push(`M${pass}: ${plan.length} > ${budget.max + 6}`);
      }
    }
    checks.push(
      check(
        "graded_budget",
        offenders.length === 0 ? "pass" : "fail",
        offenders.length === 0 ? undefined : offenders.join("; ")
      )
    );
  }

  // 8) M4 não introduz núcleo lexical novo (quando há alvos com introduceAtPass).
  if (!targets || !isMasteryPilotLesson(lessonId)) {
    checks.push(check("m4_no_new_core", "not_applicable", "sem alvos lexicais aplicáveis"));
  } else {
    const coreAtM4 = targets.vocabulary.filter((item) => item.role === "core" && item.introduceAtPass === 4);
    checks.push(
      check(
        "m4_no_new_core",
        coreAtM4.length === 0 ? "pass" : "fail",
        coreAtM4.length === 0 ? undefined : `core só em M4: ${coreAtM4.map((i) => i.hanzi).join(", ")}`
      )
    );
  }

  const applicable = checks.filter((c) => c.status !== "not_applicable");
  const evaluated = applicable.filter((c) => c.status === "pass" || c.status === "fail");
  const passedCount = evaluated.filter((c) => c.status === "pass").length;
  const notEvaluatedCount = applicable.filter((c) => c.status === "not_evaluated").length;
  const failedCount = evaluated.filter((c) => c.status === "fail").length;

  const score = evaluated.length === 0 ? 0 : Math.round((passedCount / evaluated.length) * 100);
  // Certification: enough pass ratio among evaluated, and if plans were
  // omitted we refuse to claim a pass (not_evaluated must not greenwash).
  const ratioOk = evaluated.length > 0 && passedCount / evaluated.length >= REQUIRED_PASS_RATIO;
  const noFails = failedCount === 0;
  const plansWereEvaluated = notEvaluatedCount === 0 || Boolean(plansReady);
  const passes = ratioOk && noFails && plansWereEvaluated && notEvaluatedCount === 0;

  return {
    score,
    passes,
    evaluatedCount: evaluated.length,
    passedCount,
    notEvaluatedCount,
    checks,
  };
}

/** True when the lesson is officially certified (enabled + quality with real plans). */
export function isMasteryCertified(result: MasteryQualityResult): boolean {
  return result.passes && result.notEvaluatedCount === 0 && result.evaluatedCount > 0;
}

export function masteryDepthMetrics(plansByPass: MasteryPlansByPass | undefined): MasteryDepthMetrics {
  const empty = {
    recognitionRatio: 0,
    productionRatio: 0,
    transferRatio: 0,
    lexicalGrowth: 0,
    structuralGrowth: 0,
    gradedCount: 0,
  };
  if (!hasAllPassPlans(plansByPass)) return empty;

  const all = MASTERY_PASSES.flatMap((pass) => plansByPass[pass]);
  const gradedCount = all.length;
  if (gradedCount === 0) return empty;

  let recognition = 0;
  let production = 0;
  let transfer = 0;
  for (const step of all) {
    if (TRANSFER_KINDS.has(step.kind) || (isProductionOrTransferKind(step.kind) && step.kind.includes("transfer"))) {
      transfer += 1;
    } else if (isProductionStep(step)) {
      production += 1;
    } else if (RECOGNITION_KINDS.has(step.kind)) {
      recognition += 1;
    }
  }

  const signatures = new Set(all.map(stepSignature));
  const structuralKinds = new Set(all.map((s) => s.kind));

  return {
    recognitionRatio: Math.round((recognition / gradedCount) * 1000) / 1000,
    productionRatio: Math.round((production / gradedCount) * 1000) / 1000,
    transferRatio: Math.round((transfer / gradedCount) * 1000) / 1000,
    lexicalGrowth: Math.round((signatures.size / gradedCount) * 1000) / 1000,
    structuralGrowth: structuralKinds.size,
    gradedCount,
  };
}

/** Per-pass production share for PED-118 reporting (soft guidance). */
export function productionShareByPass(plansByPass: MasteryPlansByPass | undefined): Record<MasteryPass, number> {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<MasteryPass, number>;
  if (!hasAllPassPlans(plansByPass)) return out;
  for (const pass of MASTERY_PASSES) {
    const plan = plansByPass[pass];
    if (plan.length === 0) continue;
    const prod = plan.filter((s) => isProductionStep(s)).length;
    out[pass] = Math.round((prod / plan.length) * 1000) / 1000;
  }
  return out;
}
