#!/usr/bin/env node
/**
 * RC2.2.22 — auditoria das primeiras 20 sessões (5 tópicos de fundação × 4
 * passes), direto do plano autoral real.
 *
 * Para cada sessão: objetivo, material novo, material de revisão, número de
 * passos, famílias de interação, repetição de alvo (e repetição RUIM), apoio
 * visual, transferência para a vida real e a complexidade de tela (lint de
 * produto). A duração observada fica `null` até existir teste com humanos:
 * a estimativa "5 min" não vale como dado.
 *
 *   node scripts/audit-rc2-2-22-first-20.mjs          → escreve o relatório
 *   node scripts/audit-rc2-2-22-first-20.mjs --check  → falha se estiver velho
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/reports/rc2-2-22-first-20-lesson-audit.json");
const TOPICS = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi"];
const PASSES = [1, 2, 3, 4];

async function load() {
  const result = await build({
    stdin: { contents: 'export * as plans from "./src/data/foundationTopicPlans.ts";\nexport * as lint from "./src/lib/screenComplexity.ts";', resolveDir: ROOT, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": "{}" },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2222-first20-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const TRANSFER_KINDS = new Set(["dialogue_choice", "contextual_choice", "conversation_scene", "free_production", "sentence_build"]);
// Apoio visual = imagem no dado OU passo cujo componente desenha o visual
// (contorno de tom, montagem do hànzì, personagens da cena).
const VISUAL_KINDS = new Set(["tone", "hanzi_build", "conversation_scene", "image_choice"]);
const hasImage = (step) =>
  VISUAL_KINDS.has(step.kind) ||
  Boolean(step.image || step.imageId || step.imageSrc || step.visual || (Array.isArray(step.options) && step.options.some((o) => o && typeof o === "object" && (o.image || o.imageId))));

export async function buildAudit() {
  const { plans, lint } = await load();
  const seen = new Set();
  const sessions = [];
  let number = 0;
  for (const topicId of TOPICS) {
    for (const pass of PASSES) {
      number += 1;
      const steps = plans.foundationAuthoredPlanFor(topicId, pass) ?? [];
      const targets = new Set(steps.flatMap((step) => step.pedagogicalEvidence?.knowledgeTargetIds ?? []));
      const newTargets = [...targets].filter((id) => !seen.has(id));
      const reviewTargets = [...targets].filter((id) => seen.has(id));
      for (const id of targets) seen.add(id);
      const perTarget = new Map();
      for (const step of steps) for (const id of step.pedagogicalEvidence?.knowledgeTargetIds ?? []) perTarget.set(id, (perTarget.get(id) ?? 0) + 1);
      const complexity = { LOW: 0, GOOD: 0, HIGH: 0, OVERLOADED: 0 };
      const overloaded = [];
      steps.forEach((step, index) => {
        const level = lint.complexityLevel(lint.stepComplexityInputs(step));
        complexity[level] += 1;
        if (level === "OVERLOADED" || level === "HIGH") overloaded.push({ step: index, kind: step.kind, level });
      });
      const intro = steps.find((step) => step.kind === "intro");
      sessions.push({
        session: number,
        topicId,
        pass,
        objective: intro?.title ?? steps.find((step) => step.title)?.title ?? null,
        stepCount: steps.length,
        interactionFamilies: [...new Set(steps.map((step) => lint.taskFamily(step.kind)))],
        stepKinds: [...new Set(steps.map((step) => step.kind))],
        newMaterial: newTargets.length,
        reviewMaterial: reviewTargets.length,
        targetRepetition: { maxSameTargetInSession: Math.max(0, ...perTarget.values()), badRepetitions: lint.badRepetitions(steps).length },
        visualSupportSteps: steps.filter(hasImage).length,
        realLifeTransfer: steps.some((step) => TRANSFER_KINDS.has(step.kind)),
        complexity,
        complexityFlags: overloaded,
        observedDurationMedianMin: null,
      });
    }
  }
  const totals = {
    sessions: sessions.length,
    steps: sessions.reduce((sum, s) => sum + s.stepCount, 0),
    badRepetitions: sessions.reduce((sum, s) => sum + s.targetRepetition.badRepetitions, 0),
    overloadedSteps: sessions.reduce((sum, s) => sum + s.complexity.OVERLOADED, 0),
    highSteps: sessions.reduce((sum, s) => sum + s.complexity.HIGH, 0),
    sessionsWithoutTransfer: sessions.filter((s) => !s.realLifeTransfer).map((s) => s.session),
    sessionsWithoutVisual: sessions.filter((s) => s.visualSupportSteps === 0).map((s) => s.session),
  };
  return {
    schema: "longyu-rc2-2-22-first-20-audit/1",
    note: "Lint de produto sobre o plano autoral. Não é resultado com humanos: duração observada = null até existir sessão real (docs/reports/rc2-2-22-human-learning-validation.md).",
    heuristic: "complexityLevel(ctas, paragraphs, chips, interactiveControls, instructionChars) — src/lib/screenComplexity.ts",
    totals,
    sessions,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = await buildAudit();
  const text = `${JSON.stringify(audit, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (current !== text) {
      console.error("FAIL audit:rc2-2-22-first-20 — relatório desatualizado; rode node scripts/audit-rc2-2-22-first-20.mjs");
      process.exit(1);
    }
    console.log(`PASS audit:rc2-2-22-first-20 (${audit.totals.sessions} sessões, ${audit.totals.badRepetitions} repetições ruins, ${audit.totals.overloadedSteps} passos OVERLOADED)`);
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(ROOT, OUT)}`, JSON.stringify(audit.totals));
  }
}
