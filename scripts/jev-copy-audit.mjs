#!/usr/bin/env node
/**
 * RC2.3.7 — Jev COPY audit (DEV_AUDIT only; never learner runtime, never rewrites).
 * Flags learner-facing copy that may be ambiguous or leave the next action unclear.
 *
 *   node scripts/jev-copy-audit.mjs --plan
 *   node scripts/jev-copy-audit.mjs --ingest <responses.json>
 *   node scripts/jev-copy-audit.mjs            # live with TYPESAFE_API_KEY (fail-open)
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";
import { JEV_MODEL, inputHash } from "./lib/jev-evidence-audit.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "docs/reports/rc2-3-7-jev-copy-audit.json");
const CACHE = path.join(ROOT, "docs/reports/rc2-3-7-jev-copy-audit.cache.json");
const PLAN = path.join(ROOT, "docs/reports/rc2-3-7-jev-copy-audit.plan.json");

export const COPY_QUESTIONS = {
  ambiguous: { type: "noul", instructions: "A learner of a language app could understand this message in a confusing or ambiguous way" },
  clarity: { type: "score", instructions: "How clear is what the learner should do next after reading this message", criteria: ["Unclear", "Somewhat unclear", "Clear", "Very clear"] },
  intent: {
    type: "choice",
    instructions: "Main intent of this message shown to a learner",
    criteria: { instruction: "Tells the learner what to do", feedback: "Reacts to an answer", error: "Reports a problem", celebration: "Celebrates progress", explanation: "Explains why something is shown" },
  },
};

const { ptBR } = tsRequire(path.join(ROOT, "src/locales/pt-BR.ts"));
const pm = tsRequire(path.join(ROOT, "src/lib/mastery/personalMastery.ts"));
const get = (obj, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** Selected copy: guidance, feedback, errors, completion, Personal Mastery explanations. */
export const COPY_KEYS = [
  ["guidance", "guidance.welcome.body"],
  ["guidance", "guidance.practiceFirstUse.body"],
  ["guidance", "guidance.reviewFirstUse.body"],
  ["guidance", "guidance.masteryFirstUse.body"],
  ["guidance", "guidance.practiceNeedFirstUse.body"],
  ["guidance", "guidance.cultureFirstUse.body"],
  ["feedback", "review.feedbackWrong"],
  ["feedback", "review.feedbackRight"],
  ["feedback", "player.correctShort"],
  ["feedback", "player.almost"],
  ["feedback", "review.feedbackRetry"],
  ["error", "auth.errors.supabaseUnavailable"],
  ["error", "auth.errors.offline"],
  ["error", "player.micHttpsOnly"],
  ["error", "player.stepStalled"],
  ["error", "player.voiceUnavailable"],
  ["error", "player.speechPermissionNeeded"],
  ["completion", "player.lessonComplete"],
  ["completion", "player.youAdvanced"],
  ["completion", "player.youLearned"],
];

function items() {
  const out = [];
  for (const [group, key] of COPY_KEYS) {
    const text = get(ptBR, key);
    if (typeof text === "string" && text.trim()) out.push({ group, key, text });
  }
  for (const rule of ["REPEATED_DIFFICULTY", "BELOW_MIN_EVIDENCE", "CEILING_DEVELOPING", "SRS_DUE", "NEEDS_MORE_INDEPENDENT_SUCCESS"]) {
    out.push({ group: "mastery_why", key: `why.${rule}.listening`, text: pm.whyLinePt(rule, "listening") });
  }
  out.push({ group: "mastery_label", key: "STATE_LABEL_PT", text: Object.values(pm.STATE_LABEL_PT).join(" · ") });
  return out.map((i) => {
    const state = `Message shown to a Brazilian learner of Mandarin in a learning app (${i.group}):\n"${i.text}"`;
    return { ...i, state, hash: inputHash(state, COPY_QUESTIONS) };
  });
}

const readJson = (p, d) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return d;
  }
};
const list = items();
const args = process.argv.slice(2);
if (args.includes("--plan")) {
  fs.writeFileSync(PLAN, JSON.stringify({ model: JEV_MODEL, questions: COPY_QUESTIONS, items: list.map(({ key, state, hash }) => ({ key, state, hash })) }, null, 2) + "\n");
  console.log(`plan: ${list.length} items`);
  process.exit(0);
}
const cache = readJson(CACHE, { answers: {} });
let runStatus = "NOT_RUN";
const ingestIdx = args.indexOf("--ingest");
if (ingestIdx >= 0) {
  const responses = readJson(path.resolve(args[ingestIdx + 1]), {});
  for (const [hash, body] of Object.entries(responses)) if (body?.answers) {
    cache.answers[hash] = body.answers;
    cache.servedModel = body.model ?? cache.servedModel;
  }
  runStatus = "INGESTED";
} else if (process.env.TYPESAFE_API_KEY) {
  runStatus = "LIVE";
  for (const item of list.filter((i) => !cache.answers[i.hash])) {
    try {
      const res = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ state: item.state, model: JEV_MODEL, questions: COPY_QUESTIONS }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      cache.answers[item.hash] = body.answers;
      cache.servedModel = body.model;
    } catch {
      runStatus = "UNAVAILABLE";
      break;
    }
  }
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2) + "\n");
const rows = list.map((i) => {
  const a = cache.answers[i.hash];
  if (!a) return { group: i.group, key: i.key, text: i.text, status: "NOT_RUN" };
  const ambiguous = a.ambiguous?.noul ?? null;
  const clarity = a.clarity?.score ?? null;
  const intent = a.intent?.choice ?? null;
  // "Clear next action" is only meaningful for instructions and errors (a "Certo!" has no next action).
  const actionable = intent === "instruction" || intent === "error";
  const review = (ambiguous ?? 0) >= 0.6 || (actionable && clarity !== null && clarity < 1.5);
  return { group: i.group, key: i.key, text: i.text, ambiguous, clarity, intent, status: review ? "REVIEW" : "OK" };
});
const report = { generatedBy: "scripts/jev-copy-audit.mjs", purpose: "DEV_AUDIT", learnerRuntime: "DISABLED", rewrites: "NEVER", model: JEV_MODEL, servedModel: cache.servedModel ?? null, runStatus, items: rows.length, review: rows.filter((r) => r.status === "REVIEW").length, rows };
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`jev copy audit: ${runStatus} · ${report.items} items · REVIEW ${report.review}`);
