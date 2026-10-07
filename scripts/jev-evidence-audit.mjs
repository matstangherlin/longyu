#!/usr/bin/env node
/**
 * RC2.3.6 — Jev evidence semantic audit (DEV_AUDIT, never learner runtime).
 *
 *   node scripts/jev-evidence-audit.mjs            # live: needs TYPESAFE_API_KEY in env; fail-open
 *   node scripts/jev-evidence-audit.mjs --plan     # writes the items/questions only (no calls)
 *   node scripts/jev-evidence-audit.mjs --ingest <responses.json>
 *
 * The key is read from the environment only and never written anywhere.
 * Cache: docs/reports/rc2-3-6-jev-evidence-audit.cache.json keyed by inputHash
 * (the hash already includes the model and questions).
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";
import { AUDIT_QUESTIONS, JEV_MODEL, auditItems, calibrate } from "./lib/jev-evidence-audit.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "docs/reports/rc2-3-6-jev-evidence-audit.json");
const CACHE = path.join(ROOT, "docs/reports/rc2-3-6-jev-evidence-audit.cache.json");
const PLAN = path.join(ROOT, "docs/reports/rc2-3-6-jev-evidence-audit.plan.json");

const { EVIDENCE_SKILLS } = tsRequire(path.join(ROOT, "src/lib/mastery/evidence.ts"));
const readJson = (p, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
};
const cache = readJson(CACHE, { model: JEV_MODEL, answers: {} });
const items = auditItems(EVIDENCE_SKILLS, { previousHashes: new Set(Object.keys(cache.answers)) });
const args = process.argv.slice(2);

if (args.includes("--plan")) {
  fs.writeFileSync(PLAN, JSON.stringify({ model: JEV_MODEL, questions: AUDIT_QUESTIONS, items: items.map(({ skill, state, hash }) => ({ skill, state, hash })) }, null, 2) + "\n");
  console.log(`plan: ${items.length} items → ${path.relative(ROOT, PLAN)}`);
  process.exit(0);
}

let runStatus = "NOT_RUN";
let servedModel = cache.servedModel ?? null;
const ingestIdx = args.indexOf("--ingest");
if (ingestIdx >= 0) {
  const responses = readJson(path.resolve(args[ingestIdx + 1]), {});
  for (const [hash, body] of Object.entries(responses)) {
    if (body?.answers) {
      cache.answers[hash] = body.answers;
      servedModel = body.model ?? servedModel;
    }
  }
  runStatus = "INGESTED";
} else {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key) runStatus = "NOT_RUN";
  else {
    runStatus = "LIVE";
    for (const item of items.filter((i) => !cache.answers[i.hash])) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://api.typesafe.ai/v1/systemone", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ state: item.state, model: JEV_MODEL, questions: AUDIT_QUESTIONS }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`http_${res.status}`);
        const body = await res.json();
        cache.answers[item.hash] = body.answers;
        servedModel = body.model ?? servedModel;
      } catch {
        runStatus = "UNAVAILABLE"; // fail open: the product never depends on this
        break;
      }
    }
  }
}
cache.servedModel = servedModel;
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2) + "\n");

const cal = calibrate(items, cache.answers);
const report = {
  generatedBy: "scripts/jev-evidence-audit.mjs",
  purpose: "DEV_AUDIT",
  learnerRuntime: "DISABLED",
  model: JEV_MODEL,
  servedModel,
  runStatus,
  items: items.length,
  answered: cal.n,
  calibration: { status: cal.status, competencyAgreement: Number(cal.competencyAgreement.toFixed(3)), strengthAgreementWithinOneBand: Number(cal.strengthAgreement.toFixed(3)), strengthRankCorrelation: Number(cal.strengthRankCorrelation.toFixed(3)) },
  disagreements: cal.disagreements,
  rows: cal.rows,
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`jev evidence audit: ${runStatus} · answered ${cal.n}/${items.length} · ${cal.status} · competency ${report.calibration.competencyAgreement} · strength rank ρ ${report.calibration.strengthRankCorrelation}`);
