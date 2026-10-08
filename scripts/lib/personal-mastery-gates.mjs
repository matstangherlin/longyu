/**
 * RC2.3.6 — gate:rc2-3-6-personal-mastery (pure checks over an injectable runtime).
 *
 * PM1  ASR_NOT_TONE            ASR success never reaches TONE nor proves more than DEVELOPING
 * PM2  TECHNICAL_NOT_LEARNING  mic / service failure is SKIPPED_TECHNICAL, never a weakness
 * PM3  RECOGNITION_NOT_WRITING Hànzì recognition never feeds handwriting
 * PM4  TRACE_NOT_MEMORY        guided tracing never counts as writing from memory
 * PM5  UNKNOWN_NOT_WEAK        no evidence → UNSEEN, never "needs practice"
 * PM6  ONE_ANSWER_NOT_STABLE   minimum evidence + spacing before strong/stable
 * PM7  HELP_LOWERS_INDEPENDENCE help/answer reveal caps independence
 * PM8  IDEMPOTENT              the same attempt is recorded once
 * PM9  CURRICULUM_LEAK         Personal Mastery never recommends an untaught target
 * PM10 GRAPH_INTEGRITY         no prerequisite cycles, dangling relations, order violations
 * PM11 JEV_ISOLATION           no Jev client / key in the learner app; runtime flag off
 * PM12 PRIVACY                 the record has no place for raw speech/handwriting/transcripts
 * PM13 LEGACY_NO_FABRICATION   legacy progress is a weak prior, never per-skill evidence
 * PM14 CHOICE_NOT_FREE_PRODUCTION contextual choice cannot prove free production
 * PM15 REVIEW_TAUGHT_ONLY      practice queue only uses items the learner already has
 * PM16 STORAGE_BOUNDED         recent window + aggregates stay bounded at 50k events
 * PM17 DETERMINISTIC           same input → same state & same session
 * PM18 PROFILES                learner profiles A–F behave as specified
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./v495a-runtime.mjs";

const DAY = 86_400_000;
export const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);

const LEARNER_SRC_DIRS = ["src"];
const JEV_CLIENT_RE = /api\.typesafe\.ai|TYPESAFE_API_KEY|systemone|\baskJev\b/;
const RAW_FIELD_RE = /audio|transcript|blob|recording|image|stroke|voice|pitch|biometric/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

export function loadMasteryRuntime(root) {
  const ev = tsRequire("../../src/lib/mastery/evidence.ts");
  const ad = tsRequire("../../src/lib/mastery/adapters.ts");
  const comp = tsRequire("../../src/lib/mastery/competency.ts");
  const kg = tsRequire("../../src/lib/mastery/knowledgeGraph.ts");
  const pm = tsRequire("../../src/lib/mastery/personalMastery.ts");
  const pq = tsRequire("../../src/lib/mastery/practiceQueue.ts");
  const { ALL_LESSONS } = tsRequire("../../src/data/journey.ts");
  const graph = kg.buildKnowledgeGraph();
  const learnerSrc = {};
  for (const dir of LEARNER_SRC_DIRS) for (const f of walk(path.join(root, dir))) learnerSrc[path.relative(root, f)] = fs.readFileSync(f, "utf8");
  const budgetPolicy = fs.readFileSync(path.join(root, "supabase/functions/_shared/budgetPolicy.ts"), "utf8");
  return {
    makeEvidence: ev.makeEvidence,
    sanitizeEvidence: ev.sanitizeEvidence,
    appendEvidence: ev.appendEvidence,
    emptyRecord: ev.emptyRecord,
    evidenceFields: [...ev.LEARNING_EVIDENCE_FIELDS],
    recentWindow: ev.LER_RECENT_WINDOW,
    seenWindow: ev.LER_SEEN_ID_WINDOW,
    speechToEvidence: ad.speechToEvidence,
    hanziFormToEvidence: ad.hanziFormToEvidence,
    stepToEvidence: ad.stepToEvidence,
    legacyPriorToEvidence: ad.legacyPriorToEvidence,
    cultureToEvidence: ad.cultureToEvidence,
    deriveViewState: comp.deriveViewState,
    deriveErrorSignals: comp.deriveErrorSignals,
    rules: undefined,
    createPersonalMastery: pm.createPersonalMastery,
    buildPracticeSession: pm.buildPracticeSession,
    practiceTasksToReviewRefs: pq.practiceTasksToReviewRefs,
    srsRefForTarget: pq.srsRefForTarget,
    graph,
    auditGraph: kg.auditKnowledgeGraph,
    findCycles: kg.findPrerequisiteCycles,
    isTargetTaught: kg.isTargetTaught,
    lessons: ALL_LESSONS.map((l) => l.id),
    learnerSrc,
    budgetPolicy,
  };
}

// ---------------------------------------------------------------------------
// scenario helpers
// ---------------------------------------------------------------------------

let seq = 0;
export function ev(rt, { target = "hanzi:水", type = "HANZI", skill, result = "SUCCESS", support = [], day = 0, activity, lessonId }) {
  seq += 1;
  return rt.makeEvidence({
    targetId: target,
    targetType: type,
    skill,
    result,
    supportUsed: support,
    source: { activityId: activity ?? `test:${skill.toLowerCase()}`, ...(lessonId ? { lessonId } : {}) },
    attemptKey: `t${seq}`,
    timestamp: NOW - day * DAY,
  });
}

const state = (rt, view, events, extra = {}) => rt.deriveViewState({ view, events, now: NOW, rules: rt.rules, ...extra });
const RANK = { UNSEEN: 0, EXPOSED: 1, NEEDS_PRACTICE: 2, DEVELOPING: 2, REVIEW_DUE: 3, STRONG: 4, STABLE: 5 };
const atMost = (s, max) => RANK[s] <= RANK[max];

/** Many independent successes, spaced over days and activities (best case for a skill). */
function grind(rt, skill, target = "hanzi:水", n = 10) {
  return Array.from({ length: n }, (_, i) => ev(rt, { target, skill, day: i * 2, activity: `act${i % 3}:${skill}` }));
}

function record(rt, events) {
  return rt.appendEvidence(rt.emptyRecord("gate"), events).record;
}

function lessonsUpTo(rt, n) {
  return rt.lessons.slice(0, n);
}

/** Learner who has evidence on EVERY graph target (taught or not) — leak probe. */
function leakProbe(rt, completedCount) {
  const events = [];
  for (const t of rt.graph.targets.values()) {
    if (t.type !== "HANZI" && t.type !== "WORD" && t.type !== "CHUNK") continue;
    for (let i = 0; i < 3; i += 1) events.push(ev(rt, { target: t.id, type: t.type, skill: "MEANING_CHOICE", result: "FAILURE", day: i }));
  }
  return { record: record(rt, events), completed: lessonsUpTo(rt, completedCount) };
}

// ---------------------------------------------------------------------------
// gate
// ---------------------------------------------------------------------------

export function runMasteryGate(rt) {
  const failures = [];
  const fail = (code, subject, message) => failures.push({ code, subject, message });

  // PM1 — ASR
  {
    const events = rt.speechToEvidence({ conceptId: "phrase:你好", activityId: "pronunciation:你好", mode: "ASR", modelHeard: false, recordingCaptured: false, selfPlaybackHeard: false, recognitionAttempted: true, recognitionSucceeded: true, perceptionTrials: 0, perceptionCorrect: 0, retryCount: 0, completed: true, at: NOW });
    if (events.some((e) => e.targetType === "TONE" || e.targetType === "SYLLABLE")) fail("ASR_NOT_TONE", "speechToEvidence", "ASR success produced a tone/syllable target");
    const many = [];
    for (let i = 0; i < 10; i += 1) many.push(...rt.speechToEvidence({ conceptId: "phrase:你好", activityId: `pronunciation:${i % 3}`, mode: "ASR", modelHeard: false, recordingCaptured: false, selfPlaybackHeard: false, recognitionAttempted: true, recognitionSucceeded: true, perceptionTrials: 0, perceptionCorrect: 0, retryCount: 0, completed: true, at: NOW - i * 2 * DAY }));
    const s = state(rt, "production", many).state;
    if (!atMost(s, "DEVELOPING")) fail("ASR_NOT_TONE", "production", `ASR-only evidence reached ${s}`);
    const miss = rt.speechToEvidence({ conceptId: "phrase:你好", activityId: "pronunciation:x", mode: "ASR", modelHeard: false, recordingCaptured: false, selfPlaybackHeard: false, recognitionAttempted: true, recognitionSucceeded: false, perceptionTrials: 0, perceptionCorrect: 0, retryCount: 0, completed: true, at: NOW });
    if (miss.some((e) => e.result === "FAILURE")) fail("ASR_NOT_TONE", "asr-miss", "ASR miss recorded as learner failure");
  }

  // PM2 — technical failure
  {
    const tech = [];
    for (let i = 0; i < 6; i += 1) tech.push(...rt.speechToEvidence({ conceptId: "phrase:谢谢", activityId: "self-compare:谢谢", mode: "SELF_COMPARE", modelHeard: true, recordingCaptured: false, selfPlaybackHeard: false, recognitionAttempted: false, perceptionTrials: 0, perceptionCorrect: 0, retryCount: 0, completed: false, at: NOW - i * DAY }, { technicalFailure: true }));
    if (tech.some((e) => e.result !== "SKIPPED_TECHNICAL")) fail("TECHNICAL_NOT_LEARNING", "speech", "technical failure recorded as a learning result");
    const s = state(rt, "production", tech).state;
    if (s !== "UNSEEN") fail("TECHNICAL_NOT_LEARNING", "production", `mic failures produced ${s}`);
    const step = rt.stepToEvidence({ step: { kind: "listen_select", hanzi: "水" }, wasCorrect: false, technicalFailure: true, attemptKey: "tf", activityId: "journey:listen_select" });
    if (step.some((e) => e.result !== "SKIPPED_TECHNICAL")) fail("TECHNICAL_NOT_LEARNING", "step", "audio failure on a step counted as an error");
  }

  // PM3 — recognition ≠ handwriting
  {
    const s = state(rt, "handwriting", grind(rt, "HANZI_RECOGNITION")).state;
    if (s !== "UNSEEN") fail("RECOGNITION_NOT_WRITING", "handwriting", `recognition-only reached handwriting ${s}`);
  }

  // PM4 — trace ≠ memory write
  {
    const traced = Array.from({ length: 10 }, (_, i) => rt.hanziFormToEvidence({ character: "水", channel: "tracing", correct: true, attemptKey: `tr${i}`, timestamp: NOW - i * 2 * DAY }));
    if (traced.some((e) => e.skill !== "HANZI_TRACE" || !e.supportUsed.includes("GUIDED_TRACE"))) fail("TRACE_NOT_MEMORY", "adapter", "tracing not recorded as guided trace");
    const s = state(rt, "handwriting", traced).state;
    if (!atMost(s, "DEVELOPING")) fail("TRACE_NOT_MEMORY", "handwriting", `guided tracing reached ${s}`);
  }

  // PM5 — unknown ≠ weak
  {
    const s = state(rt, "meaning", []).state;
    if (s !== "UNSEEN") fail("UNKNOWN_NOT_WEAK", "empty", `no evidence → ${s}`);
    const one = state(rt, "meaning", [ev(rt, { skill: "MEANING_CHOICE", result: "FAILURE" })]).state;
    if (one === "NEEDS_PRACTICE") fail("UNKNOWN_NOT_WEAK", "single-miss", "one miss labelled as needs practice");
    const pmEmpty = rt.createPersonalMastery({ record: rt.emptyRecord("g"), graph: rt.graph, completedLessons: rt.lessons, now: NOW });
    if (pmEmpty.getWeakTargets().length) fail("UNKNOWN_NOT_WEAK", "pm", "weak targets without evidence");
  }

  // PM6 — one answer ≠ stable
  {
    const s = state(rt, "meaning", [ev(rt, { skill: "MEANING_CHOICE" })]).state;
    if (s === "STRONG" || s === "STABLE") fail("ONE_ANSWER_NOT_STABLE", "single", `one success → ${s}`);
    const sameDay = Array.from({ length: 8 }, () => ev(rt, { skill: "MEANING_CHOICE", day: 0, activity: "same:act" }));
    const s2 = state(rt, "meaning", sameDay).state;
    if (s2 === "STABLE") fail("ONE_ANSWER_NOT_STABLE", "massed", "8 answers in one sitting → STABLE (no spacing)");
  }

  // PM7 — help lowers independence
  {
    const helped = Array.from({ length: 10 }, (_, i) => ev(rt, { skill: "MEANING_CHOICE", support: ["ANSWER_REVEAL"], day: i * 2, activity: `a${i % 3}` }));
    if (helped.some((e) => e.independence > 0.5)) fail("HELP_LOWERS_INDEPENDENCE", "independence", "answer reveal did not lower independence");
    const s = state(rt, "meaning", helped).state;
    if (s === "STRONG" || s === "STABLE") fail("HELP_LOWERS_INDEPENDENCE", "state", `helped-only successes → ${s}`);
  }

  // PM8 — idempotency
  {
    const a = ev(rt, { skill: "MEANING_CHOICE" });
    const r1 = rt.appendEvidence(rt.emptyRecord("g"), [a]);
    const r2 = rt.appendEvidence(r1.record, [a, { ...a }]);
    if (r2.added !== 0 || r2.record.recent.length !== 1) fail("IDEMPOTENT", "append", "duplicate attempt counted twice");
    const k1 = rt.stepToEvidence({ step: { kind: "comprehend", hanzi: "水" }, wasCorrect: true, attemptKey: "same", activityId: "journey:comprehend" });
    const k2 = rt.stepToEvidence({ step: { kind: "comprehend", hanzi: "水" }, wasCorrect: true, attemptKey: "same", activityId: "journey:comprehend" });
    if (k1[0]?.id !== k2[0]?.id) fail("IDEMPOTENT", "ids", "same attempt produced different ids");
  }

  // PM9 — curriculum leak (several progress points)
  {
    let leaks = 0;
    const leakSamples = [];
    for (const n of [1, 5, 20, 60]) {
      const probe = leakProbe(rt, n);
      const pm = rt.createPersonalMastery({ record: probe.record, graph: rt.graph, completedLessons: probe.completed, now: NOW });
      const done = new Set(probe.completed);
      const session = rt.buildPracticeSession(pm, { now: NOW, size: 8 });
      const listed = [...pm.getWeakTargets(), ...pm.getDevelopingTargets(), ...pm.getReviewDueTargets(), ...pm.getStrongTargets()];
      for (const row of [...session, ...listed]) {
        if (!rt.isTargetTaught(rt.graph.targets.get(row.targetId), done)) {
          leaks += 1;
          if (leakSamples.length < 3) leakSamples.push(`${row.targetId}@${n}`);
        }
      }
    }
    if (leaks) fail("CURRICULUM_LEAK", "KNOWLEDGE_GRAPH_CURRICULUM_LEAK", `${leaks} untaught recommendations (${leakSamples.join(", ")})`);
  }

  // PM10 — graph integrity
  {
    const audit = rt.auditGraph(rt.graph);
    const cycles = rt.findCycles(rt.graph.relations);
    if (cycles.length) fail("GRAPH_INTEGRITY", "cycles", `${cycles.length} prerequisite cycles (${cycles[0].join(" → ")})`);
    if (audit.danglingRelations.length) fail("GRAPH_INTEGRITY", "dangling", `${audit.danglingRelations.length} relations to unknown targets`);
    if (audit.prerequisiteOrderViolations.length) fail("GRAPH_INTEGRITY", "order", `${audit.prerequisiteOrderViolations.length} prerequisites introduced after their dependant`);
    if (audit.duplicateIdenticalAliases.length) fail("GRAPH_INTEGRITY", "aliases", `${audit.duplicateIdenticalAliases.length} aliases identical to two targets of the same kind`);
    const water = rt.graph.aliases.get("水") ?? [];
    const shui = rt.graph.aliases.get("shui3") ?? [];
    if (water.some((a) => shui.some((b) => b.id === a.id))) fail("GRAPH_INTEGRITY", "canonical", "水 and shui3 collapsed into one target");
  }

  // PM11 — Jev isolation
  {
    if (!/JEV_RUNTIME_ENABLED:\s*false/.test(rt.budgetPolicy)) fail("JEV_ISOLATION", "budgetPolicy", "JEV_RUNTIME_ENABLED is not false");
    for (const [file, text] of Object.entries(rt.learnerSrc)) {
      if (JEV_CLIENT_RE.test(text)) fail("JEV_ISOLATION", file, "Jev client / TypeSafe key in learner source");
    }
  }

  // PM12 — privacy
  {
    const bad = rt.evidenceFields.filter((f) => RAW_FIELD_RE.test(f));
    if (bad.length) fail("PRIVACY", "LEARNING_EVIDENCE_FIELDS", `raw field(s) allowed: ${bad.join(", ")}`);
    const clean = rt.sanitizeEvidence({ ...ev(rt, { skill: "ASR_TEXT" }), transcript: "ni hao", audioUrl: "blob:x", strokes: [[1, 2]] });
    if (clean && Object.keys(clean).some((k) => RAW_FIELD_RE.test(k))) fail("PRIVACY", "sanitize", "raw field survived sanitisation");
  }

  // PM13 — legacy
  {
    const prior = rt.legacyPriorToEvidence([{ text: "水", reps: 9, lastAt: NOW - 3 * DAY }, { text: "你好", reps: 4, lastAt: NOW }]);
    if (prior.some((e) => e.skill !== "LEGACY_PRIOR" || e.result !== "OBSERVED")) fail("LEGACY_NO_FABRICATION", "adapter", "legacy prior emitted graded per-skill evidence");
    for (const view of ["handwriting", "listening", "production"]) {
      const s = state(rt, view, prior).state;
      if (s !== "UNSEEN") fail("LEGACY_NO_FABRICATION", view, `legacy progress produced ${view} ${s}`);
    }
  }

  // PM14 — contextual choice ≠ free production
  {
    const s = state(rt, "production", grind(rt, "CONTEXTUAL_CHOICE", "word:你好")).state;
    if (!atMost(s, "DEVELOPING")) fail("CHOICE_NOT_FREE_PRODUCTION", "production", `contextual choice reached ${s}`);
  }

  // PM15 — review taught only
  {
    const tasks = [
      { targetId: "hanzi:水", view: "meaning", activity: "REVIEW_MEANING", kind: "NEED", reasonPt: "" },
      { targetId: "hanzi:龙", view: "meaning", activity: "REVIEW_MEANING", kind: "NEED", reasonPt: "" },
    ];
    const ref = rt.srsRefForTarget("hanzi:水");
    const srs = ref ? { [`${ref.type}:${ref.itemId}:significado`]: { id: `${ref.type}:${ref.itemId}:significado`, type: ref.type, itemId: ref.itemId } } : {};
    const refs = rt.practiceTasksToReviewRefs(tasks, srs);
    if (refs.some((r) => r.task.targetId !== "hanzi:水")) fail("REVIEW_TAUGHT_ONLY", "practiceQueue", "review queue pulled an item the learner does not have");
  }

  // PM16 — storage bounds
  {
    for (const n of [100, 1000, 10000, 50000]) {
      const events = Array.from({ length: n }, (_, i) => ev(rt, { target: `hanzi:${String.fromCharCode(0x4e00 + (i % 400))}`, skill: i % 2 ? "MEANING_CHOICE" : "LISTENING_CHOICE", result: i % 5 ? "SUCCESS" : "FAILURE", day: (n - i) / 50 }));
      let rec = rt.emptyRecord("sim");
      for (let i = 0; i < events.length; i += 500) rec = rt.appendEvidence(rec, events.slice(i, i + 500)).record;
      const bytes = JSON.stringify(rec).length;
      if (rec.recent.length > rt.recentWindow || rec.seen.length > rt.seenWindow || bytes > 3_000_000) {
        fail("STORAGE_BOUNDED", `${n}`, `recent=${rec.recent.length} seen=${rec.seen.length} bytes=${bytes}`);
      }
    }
  }

  // PM17 — determinism
  {
    const evs = grind(rt, "MEANING_CHOICE");
    const a = JSON.stringify(state(rt, "meaning", evs));
    const b = JSON.stringify(state(rt, "meaning", [...evs].reverse()));
    if (a !== b) fail("DETERMINISTIC", "derive", "event order changed the state");
  }

  // PM18 — profiles
  for (const p of learnerProfiles(rt)) {
    if (!p.pass) fail("PROFILES", p.id, p.message);
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Learner profiles A–F (simulation)
// ---------------------------------------------------------------------------

export function learnerProfiles(rt) {
  const all = rt.lessons;
  const make = (events, completed = all) => rt.createPersonalMastery({ record: record(rt, events), graph: rt.graph, completedLessons: completed, now: NOW });
  const out = [];
  const check = (id, title, pass, message, extra = {}) => out.push({ id, title, pass, message: pass ? "ok" : message, ...extra });

  // A — new learner
  {
    const pm = make([], []);
    const session = rt.buildPracticeSession(pm, { now: NOW });
    check("A", "Novo aluno, sem evidência", session.length === 0 && pm.getWeakTargets().length === 0 && pm.getStrongTargets().length === 0, "new learner got labels or tasks", { session: session.length });
  }
  // B — steady learner
  {
    const ids = ["hanzi:水", "hanzi:人", "hanzi:你", "hanzi:好", "hanzi:我"];
    const evs = ids.flatMap((t) => [...grind(rt, "MEANING_CHOICE", t, 6), ...grind(rt, "LISTENING_CHOICE", t, 6)]);
    const pm = make(evs);
    const strong = pm.getStrongTargets().length;
    const session = rt.buildPracticeSession(pm, { now: NOW });
    check("B", "Aluno constante, acertos sozinho e espaçados", strong >= 5 && session.every((t) => t.kind === "CONFIRM"), `strong=${strong} session=${session.map((t) => t.kind).join(",")}`, { strong, session: session.length });
  }
  // C — struggling listener
  {
    const evs = ["hanzi:水", "hanzi:人", "hanzi:你"].flatMap((t) => Array.from({ length: 4 }, (_, i) => ev(rt, { target: t, skill: "LISTENING_CHOICE", result: "FAILURE", day: i, activity: `l${i}` })));
    evs.push(...["hanzi:水", "hanzi:人"].flatMap((t) => grind(rt, "MEANING_CHOICE", t, 6)));
    const pm = make(evs);
    const weak = pm.getWeakTargets();
    const session = rt.buildPracticeSession(pm, { now: NOW });
    const needs = session.filter((t) => t.kind === "NEED");
    const ok = weak.length >= 3 && weak.every((w) => w.view === "listening") && needs.length >= 3 && needs.slice(0, 3).every((t) => t.view === "listening") && pm.errorSignals().length >= 1;
    check("C", "Dificuldade de escuta repetida", ok, `weak=${weak.map((w) => w.view).join(",")} needs=${needs.map((t) => t.view).join(",")}`, { weak: weak.length, session: session.length });
  }
  // D — dependent on help
  {
    const evs = ["hanzi:水", "hanzi:人"].flatMap((t) => Array.from({ length: 8 }, (_, i) => ev(rt, { target: t, skill: "MEANING_CHOICE", support: ["PROGRESSIVE_HELP"], day: i * 2, activity: `h${i % 3}` })));
    const pm = make(evs);
    const strong = pm.getStrongTargets().length;
    const dev = pm.getDevelopingTargets().length;
    check("D", "Acerta só com ajuda", strong === 0 && dev >= 2, `strong=${strong} developing=${dev}`, { strong, developing: dev });
  }
  // E — microphone blocked
  {
    const evs = [];
    for (let i = 0; i < 10; i += 1) evs.push(...rt.speechToEvidence({ conceptId: "phrase:谢谢", activityId: "self-compare:谢谢", mode: "SELF_COMPARE", modelHeard: true, recordingCaptured: false, selfPlaybackHeard: false, recognitionAttempted: false, perceptionTrials: 0, perceptionCorrect: 0, retryCount: 0, completed: false, at: NOW - i * DAY }, { technicalFailure: true }));
    const pm = make(evs);
    check("E", "Microfone bloqueado", pm.getWeakTargets().length === 0 && pm.errorSignals().length === 0, "technical failures became weakness", {});
  }
  // F — returning after 90 days
  {
    const evs = ["hanzi:水", "hanzi:人", "hanzi:你"].flatMap((t) => grind(rt, "MEANING_CHOICE", t, 6).map((e) => ({ ...e, id: `${e.id}f`, timestamp: e.timestamp - 90 * DAY })));
    const pm = make(evs);
    const due = pm.getReviewDueTargets().length;
    check("F", "Volta depois de 90 dias", due >= 3 && pm.getWeakTargets().length === 0, `reviewDue=${due} weak=${pm.getWeakTargets().length}`, { reviewDue: due });
  }
  return out;
}
