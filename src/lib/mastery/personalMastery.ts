/**
 * RC2.3.6 — Personal Mastery service.
 *
 * Read-only view over the Learner Evidence Record + Knowledge Graph:
 *   getTargetState · getDimensionState · getWeakTargets · getStrongTargets ·
 *   getReviewDueTargets · getRecentProgress · explainTargetState
 * plus the deterministic "Praticar o que preciso" session (V0).
 *
 * Deterministic: same record + same curriculum progress → same answer.
 * No model, no network. JEV is never consulted here (DEV_AUDIT only).
 * Personal Mastery decides PRIORITY among taught things — never eligibility,
 * never Journey order.
 */
import { deriveErrorSignals, deriveViewState, COMPETENCY_VIEWS, type CompetencyState, type CompetencyView, type ErrorSignal, type ViewState } from "./competency";
import type { EvidenceAggregate, LearnerEvidenceRecord, LearningEvidence } from "./evidence";
import { isTargetTaught, type KnowledgeGraph, type KnowledgeTarget } from "./knowledgeGraph";

export interface TargetState {
  targetId: string;
  target?: KnowledgeTarget;
  views: Record<CompetencyView, ViewState>;
  /** Most urgent view state (never an average). */
  headline: CompetencyState;
  headlineView: CompetencyView | null;
}

export interface PersonalMasteryInput {
  record: LearnerEvidenceRecord;
  graph: KnowledgeGraph;
  completedLessons: readonly string[];
  /** Target ids whose existing SRS item is due. */
  srsDueTargets?: ReadonlySet<string>;
  now?: number;
}

const HEADLINE_ORDER: CompetencyState[] = ["NEEDS_PRACTICE", "REVIEW_DUE", "DEVELOPING", "STRONG", "STABLE", "EXPOSED", "UNSEEN"];

export const STATE_LABEL_PT: Record<CompetencyState, string> = {
  UNSEEN: "Ainda não visto",
  EXPOSED: "Você já viu",
  DEVELOPING: "Em construção",
  NEEDS_PRACTICE: "Vale praticar",
  STRONG: "Firme",
  STABLE: "Consolidado",
  REVIEW_DUE: "Hora de revisar",
};

export const VIEW_LABEL_PT: Record<CompetencyView, string> = {
  meaning: "Entender",
  listening: "Ouvir",
  form: "Reconhecer a escrita",
  production: "Usar",
  handwriting: "Escrever à mão",
};

const RULE_PT: Record<string, string> = {
  NO_EVIDENCE: "Ainda não há atividades sobre isto.",
  ONLY_EXPOSURE: "Você viu isto, mas ainda não praticou.",
  BELOW_MIN_EVIDENCE: "Ainda há poucas tentativas para dizer mais.",
  REPEATED_DIFFICULTY: "Algumas tentativas recentes não saíram como esperado.",
  SPACED_INDEPENDENT_VARIED: "Você acertou sozinho, em dias diferentes e em atividades diferentes.",
  CONSISTENT_INDEPENDENT: "Você vem acertando sem ajuda.",
  STABLE_NEEDS_SPACING_OR_VARIETY: "Para consolidar, falta repetir em outros dias ou outras atividades.",
  NEEDS_MORE_INDEPENDENT_SUCCESS: "Os acertos até agora tiveram ajuda — tudo bem, é parte do caminho.",
  MIXED_RESULTS: "Às vezes sai, às vezes não: está se formando.",
  RECENT_FAILURES_OVERRIDE: "As duas últimas tentativas não saíram; vale relembrar.",
  CEILING_DEVELOPING: "Este tipo de atividade ainda não mostra uso livre.",
  CEILING_STRONG: "Para consolidar, falta usar em uma atividade mais livre.",
  SRS_DUE: "Já passou um tempo: hora de relembrar.",
  STALE: "Faz um tempo que você não pratica isto.",
};

function indexEvents(record: LearnerEvidenceRecord) {
  const raw = new Map<string, LearningEvidence[]>();
  for (const e of record.recent) (raw.get(e.targetId) ?? raw.set(e.targetId, []).get(e.targetId)!).push(e);
  const aggs = new Map<string, EvidenceAggregate[]>();
  const pushAgg = (a: EvidenceAggregate) => (aggs.get(a.targetId) ?? aggs.set(a.targetId, []).get(a.targetId)!).push(a);
  for (const a of Object.values(record.aggregates)) pushAgg(a);
  for (const snap of Object.values(record.aggregatesByDevice ?? {})) for (const a of Object.values(snap.aggregates)) pushAgg(a);
  return { raw, aggs };
}

export function createPersonalMastery(input: PersonalMasteryInput) {
  const now = input.now ?? Date.now();
  const { raw, aggs } = indexEvents(input.record);
  const completed = new Set(input.completedLessons);
  const labMet = new Set([...raw.keys()].filter((id) => input.graph.targets.get(id)?.availability === "PINYIN_LAB"));
  const cache = new Map<string, TargetState>();

  function getTargetState(targetId: string): TargetState {
    const hit = cache.get(targetId);
    if (hit) return hit;
    const events = raw.get(targetId) ?? [];
    const agg = aggs.get(targetId) ?? [];
    const srsDue = input.srsDueTargets?.has(targetId) ?? false;
    const views = {} as Record<CompetencyView, ViewState>;
    for (const view of COMPETENCY_VIEWS) views[view] = deriveViewState({ view, events, aggregates: agg, srsDue, now });
    let headline: CompetencyState = "UNSEEN";
    let headlineView: CompetencyView | null = null;
    for (const s of HEADLINE_ORDER) {
      const v = COMPETENCY_VIEWS.find((view) => views[view].state === s);
      if (v) {
        headline = s;
        headlineView = v;
        break;
      }
    }
    const state: TargetState = { targetId, target: input.graph.targets.get(targetId), views, headline, headlineView };
    cache.set(targetId, state);
    return state;
  }

  const getDimensionState = (targetId: string, view: CompetencyView) => getTargetState(targetId).views[view];
  const touched = () => [...new Set([...raw.keys(), ...aggs.keys()])].sort();
  const taught = (id: string) => isTargetTaught(input.graph.targets.get(id), completed, { labTargetsMet: labMet });

  function listByState(states: CompetencyState[]): { targetId: string; view: CompetencyView; state: ViewState }[] {
    const out: { targetId: string; view: CompetencyView; state: ViewState }[] = [];
    for (const id of touched()) {
      if (!taught(id)) continue;
      const t = getTargetState(id);
      for (const view of COMPETENCY_VIEWS) if (states.includes(t.views[view].state)) out.push({ targetId: id, view, state: t.views[view] });
    }
    return out;
  }

  const getWeakTargets = () => listByState(["NEEDS_PRACTICE"]).sort((a, b) => a.state.estimate - b.state.estimate || a.targetId.localeCompare(b.targetId));
  const getStrongTargets = () => listByState(["STRONG", "STABLE"]).sort((a, b) => b.state.estimate - a.state.estimate || a.targetId.localeCompare(b.targetId));
  const getReviewDueTargets = () => listByState(["REVIEW_DUE"]).sort((a, b) => (a.state.lastAt ?? 0) - (b.state.lastAt ?? 0) || a.targetId.localeCompare(b.targetId));
  const getDevelopingTargets = () => listByState(["DEVELOPING"]).filter((r) => r.state.graded > 0);

  function getRecentProgress(days = 7): { targetId: string; view: CompetencyView; state: CompetencyState }[] {
    const since = now - days * 86_400_000;
    const ids = new Set(input.record.recent.filter((e) => e.timestamp >= since && e.result === "SUCCESS").map((e) => e.targetId));
    const out: { targetId: string; view: CompetencyView; state: CompetencyState }[] = [];
    for (const id of [...ids].sort()) {
      if (!taught(id)) continue;
      const t = getTargetState(id);
      for (const view of COMPETENCY_VIEWS) {
        const s = t.views[view].state;
        if (s === "STRONG" || s === "STABLE") out.push({ targetId: id, view, state: s });
      }
    }
    return out;
  }

  function explainTargetState(targetId: string) {
    const t = getTargetState(targetId);
    const evidenceById = new Map((raw.get(targetId) ?? []).map((e) => [e.id, e]));
    return {
      targetId,
      label: t.target?.label ?? targetId,
      headline: t.headline,
      headlinePt: STATE_LABEL_PT[t.headline],
      views: COMPETENCY_VIEWS.map((view) => {
        const v = t.views[view];
        return {
          view,
          viewPt: VIEW_LABEL_PT[view],
          state: v.state,
          statePt: STATE_LABEL_PT[v.state],
          confidence: v.confidence,
          rules: v.rules,
          whyPt: v.rules.map((r) => RULE_PT[r] ?? r),
          evidence: v.evidenceIds.map((id) => evidenceById.get(id)).filter((e): e is LearningEvidence => !!e),
        };
      }),
    };
  }

  return {
    getTargetState,
    getDimensionState,
    getWeakTargets,
    getStrongTargets,
    getReviewDueTargets,
    getDevelopingTargets,
    getRecentProgress,
    explainTargetState,
    errorSignals: (): ErrorSignal[] => deriveErrorSignals(input.record.recent, now),
    isTaught: taught,
  };
}

export type PersonalMastery = ReturnType<typeof createPersonalMastery>;

// ---------------------------------------------------------------------------
// "Praticar o que preciso" — adaptive session V0 (existing activities only)
// ---------------------------------------------------------------------------

/** Existing activity a task runs in. */
export type PracticeActivity = "REVIEW_MEANING" | "REVIEW_LISTENING" | "REVIEW_FORM" | "REVIEW_SPEAKING" | "REVIEW_USE";

export const VIEW_ACTIVITY: Record<CompetencyView, PracticeActivity> = {
  meaning: "REVIEW_MEANING",
  listening: "REVIEW_LISTENING",
  form: "REVIEW_FORM",
  production: "REVIEW_USE",
  handwriting: "REVIEW_FORM",
};

/** Recovery ladder: after repeated misses, step down to an easier competency. */
export const RECOVERY_LADDER: Record<CompetencyView, CompetencyView | null> = {
  production: "form",
  handwriting: "form",
  form: "meaning",
  listening: "meaning",
  meaning: null,
};

export interface PracticeTask {
  targetId: string;
  view: CompetencyView;
  activity: PracticeActivity;
  kind: "NEED" | "CONFIRM";
  /** Learner-facing reason ("Por que estou vendo isto?"), non-judgmental. */
  reasonPt: string;
}

export const SESSION_POLICY = {
  minTasks: 5,
  maxTasks: 8,
  /** Share of tasks that address a need (rest confirm strong items). */
  needShare: 0.75,
  maxTasksPerTarget: 2,
  maxSameViewInARow: 2,
  /** Targets practiced in the last N minutes are cooled down. */
  cooldownMinutes: 10,
  /** In-session misses before stepping down the recovery ladder. */
  attemptCap: 2,
} as const;

const REASON_PT: Record<string, string> = {
  NEEDS_PRACTICE: "Isto apareceu algumas vezes com dificuldade. Uma prática curta ajuda.",
  REVIEW_DUE: "Já faz um tempo — relembrar agora ajuda a memória a durar.",
  DEVELOPING: "Está se formando. Mais uma prática ajuda a firmar.",
  CONFIRM: "Você vai bem aqui. Uma confirmação rápida mantém firme.",
};

export function buildPracticeSession(
  pm: PersonalMastery,
  opts: { now?: number; recentlyPracticed?: ReadonlySet<string>; size?: number; supportedViews?: readonly CompetencyView[] } = {}
): PracticeTask[] {
  const P = SESSION_POLICY;
  const size = Math.max(P.minTasks, Math.min(P.maxTasks, opts.size ?? 6));
  const allowedView = (v: CompetencyView) => !opts.supportedViews || opts.supportedViews.includes(v);
  const cooled = (id: string) => opts.recentlyPracticed?.has(id) ?? false;
  const needs: PracticeTask[] = [];
  const push = (list: PracticeTask[], rows: { targetId: string; view: CompetencyView }[], kind: "NEED" | "CONFIRM", reason: string) => {
    for (const r of rows) {
      if (!allowedView(r.view) || cooled(r.targetId) || !pm.isTaught(r.targetId)) continue;
      list.push({ targetId: r.targetId, view: r.view, activity: VIEW_ACTIVITY[r.view], kind, reasonPt: REASON_PT[reason] });
    }
  };
  push(needs, pm.getWeakTargets(), "NEED", "NEEDS_PRACTICE");
  push(needs, pm.getReviewDueTargets(), "NEED", "REVIEW_DUE");
  push(needs, pm.getDevelopingTargets(), "NEED", "DEVELOPING");
  const confirms: PracticeTask[] = [];
  push(confirms, pm.getStrongTargets(), "CONFIRM", "CONFIRM");

  const needSlots = Math.min(needs.length, Math.round(size * P.needShare));
  const confirmSlots = Math.min(confirms.length, size - needSlots);
  const picked: PracticeTask[] = [];
  const perTarget = new Map<string, number>();
  const take = (pool: PracticeTask[], n: number) => {
    let got = 0;
    for (const t of pool) {
      if (got >= n) break;
      if ((perTarget.get(t.targetId) ?? 0) >= P.maxTasksPerTarget) continue;
      if (picked.some((p) => p.targetId === t.targetId && p.view === t.view)) continue;
      picked.push(t);
      perTarget.set(t.targetId, (perTarget.get(t.targetId) ?? 0) + 1);
      got += 1;
    }
  };
  take(needs, needSlots);
  take(confirms, confirmSlots);
  // Fill with more needs if confirmations ran short.
  if (picked.length < size) take(needs, size - picked.length);
  return interleave(picked, P.maxSameViewInARow);
}

/** Variety: never more than `maxRun` tasks of the same view in a row; never the same target twice in a row. */
export function interleave(tasks: PracticeTask[], maxRun: number): PracticeTask[] {
  const pool = [...tasks];
  const out: PracticeTask[] = [];
  while (pool.length) {
    const last = out[out.length - 1];
    const run = last ? out.slice(-maxRun).filter((t) => t.view === last.view).length : 0;
    const idx = pool.findIndex((t) => (!last || t.targetId !== last.targetId) && (!last || run < maxRun || t.view !== last.view));
    out.push(pool.splice(idx >= 0 ? idx : 0, 1)[0]);
  }
  return out;
}

/** Next step after in-session misses (attempt cap + recovery ladder). */
export function nextRecoveryStep(task: PracticeTask, missesInSession: number): PracticeTask | null {
  if (missesInSession < SESSION_POLICY.attemptCap) return task;
  const down = RECOVERY_LADDER[task.view];
  if (!down) return null; // stop: no more retries on this target this session
  return { ...task, view: down, activity: VIEW_ACTIVITY[down], kind: "NEED", reasonPt: "Vamos por um caminho mais leve antes de voltar a isto." };
}

/** Review priority (only ordering, never eligibility): lower = earlier. */
export function masteryReviewPriority(pm: PersonalMastery, targetId: string): number {
  const h = pm.getTargetState(targetId).headline;
  return h === "NEEDS_PRACTICE" ? 0 : h === "REVIEW_DUE" ? 1 : h === "DEVELOPING" ? 2 : h === "STRONG" ? 3 : h === "STABLE" ? 4 : 2;
}
