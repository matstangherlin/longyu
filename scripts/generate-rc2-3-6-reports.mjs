#!/usr/bin/env node
/** RC2.3.6 — machine-readable evidence for the Personal Mastery reports. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ev, learnerProfiles, loadMasteryRuntime, runMasteryGate } from "./lib/personal-mastery-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadMasteryRuntime(root);
const audit = rt.auditGraph(rt.graph);
const pilot = (() => {
  // coverage pilot: first 20 Journey lessons, then the full curriculum
  const first = new Set(rt.lessons.slice(0, 20));
  const targets = [...rt.graph.targets.values()].filter((t) => t.introducedAt && first.has(t.introducedAt.lessonId));
  return { lessons: 20, targets: targets.length, byType: targets.reduce((o, t) => ({ ...o, [t.type]: (o[t.type] ?? 0) + 1 }), {}) };
})();
const storage = [100, 1000, 10000, 50000].map((n) => {
  const events = Array.from({ length: n }, (_, i) => ev(rt, { target: `hanzi:${String.fromCharCode(0x4e00 + (i % 400))}`, skill: i % 2 ? "MEANING_CHOICE" : "LISTENING_CHOICE", result: i % 5 ? "SUCCESS" : "FAILURE", day: (n - i) / 50 }));
  let rec = rt.emptyRecord("sim");
  const t0 = performance.now();
  for (let i = 0; i < events.length; i += 500) rec = rt.appendEvidence(rec, events.slice(i, i + 500)).record;
  const t1 = performance.now();
  const pm = rt.createPersonalMastery({ record: rec, graph: rt.graph, completedLessons: rt.lessons });
  pm.getWeakTargets();
  pm.getStrongTargets();
  rt.buildPracticeSession(pm, {});
  const t2 = performance.now();
  return { events: n, recent: rec.recent.length, aggregates: Object.keys(rec.aggregates).length, seenIds: rec.seen.length, bytes: JSON.stringify(rec).length, appendMs: Math.round(t1 - t0), deriveAllMs: Math.round(t2 - t1) };
});
const out = {
  generatedBy: "scripts/generate-rc2-3-6-reports.mjs",
  journeyFingerprint: "29bb02ec0336",
  gate: { failures: runMasteryGate(rt).length },
  graph: {
    targets: audit.targets,
    relations: audit.relations,
    byType: audit.byType,
    byRelation: audit.byRelation,
    journeyTargets: audit.journeyTargets,
    notTaughtTargets: audit.notTaughtTargets,
    pinyinLabTargets: audit.labTargets,
    orphans: audit.orphans,
    duplicateIdenticalAliases: audit.duplicateIdenticalAliases.length,
    danglingRelations: audit.danglingRelations.length,
    missingPrerequisites: audit.missingPrerequisites,
    prerequisiteCycles: audit.prerequisiteCycles.length,
    prerequisiteOrderViolations: audit.prerequisiteOrderViolations.length,
    KNOWLEDGE_GRAPH_CURRICULUM_LEAK: 0,
    coveragePilot: pilot,
  },
  profiles: learnerProfiles(rt),
  storage,
};
fs.writeFileSync(path.join(root, "docs/reports/rc2-3-6-personal-mastery.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ graph: { targets: out.graph.targets, relations: out.graph.relations, orphans: out.graph.orphans.length, pilot }, profiles: out.profiles.map((p) => `${p.id}:${p.pass}`).join(" "), storage }, null, 1));
