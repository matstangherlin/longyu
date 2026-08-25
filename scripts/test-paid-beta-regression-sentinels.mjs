#!/usr/bin/env node
/**
 * V4.6 — Sentinelas de regressão histórica (Paid Beta RC).
 *
 * Agregador de contrato: mapeia bugs A–H → scripts já existentes em validate:beta.
 * Não reexecuta suites pesadas (evita duplicar o portão). Com --execute, roda os scripts.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execute = process.argv.includes("--execute");

const SENTINELS = [
  {
    id: "A_mingtianjian",
    label: "明天见 — hanzi/pinyin corretos (nunca nǐ hǎo)",
    scripts: ["test:qa-regression-guard"],
    sourceChecks: [{ file: "src/data/chunks.ts", must: [/明天见/, /míngtiān/i] }],
  },
  {
    id: "B_review_queue",
    label: "Review queue não recria centenas de domínios nunca praticados",
    scripts: ["validate:review-content-integrity", "test:review-ux"],
  },
  {
    id: "C_hanzi_builder",
    label: "Hànzì Builder Verificar → sucesso → Continuar sem loop",
    scripts: ["test:hanzi-builder-integrity"],
  },
  {
    id: "D_journey_scroll",
    label: "Journey scroll após voltar do player",
    scripts: ["test:player-ux", "test:body-scroll-lock"],
  },
  {
    id: "E_sticky_cta",
    label: "Sticky CTA não cobre opções/input em mobile",
    scripts: ["test:qa-regression-guard", "test:player-ux"],
  },
  {
    id: "F_transfer_l15",
    label: "Transfer L15 não mostra alvo completo antes da tentativa",
    scripts: ["test:transfer-target-integrity", "validate:transfer-target-integrity"],
  },
  {
    id: "G_images",
    label: "Images resolvem conceito apresentável (não ID interno)",
    scripts: ["validate:image-exercises", "validate:visual-consistency"],
    sourceChecks: [{ file: "src/data/visualVocabulary.ts", must: [/resolveVisualConcept/] }],
  },
  {
    id: "H_session_plan",
    label: "Session plan não replana no meio após acerto",
    scripts: ["test:player-ux"],
    sourceChecks: [
      { file: "src/features/lesson/LessonPlayer.tsx", must: [/sessionPlanRef|planNonce/] },
    ],
  },
];

const pkg = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};
const failures = [];

for (const sentinel of SENTINELS) {
  for (const name of sentinel.scripts) {
    if (!scripts[name]) failures.push(`${sentinel.id}: script ausente ${name}`);
  }
  for (const check of sentinel.sourceChecks ?? []) {
    const src = await readFile(path.join(rootDir, check.file), "utf8");
    for (const re of check.must) {
      if (!re.test(src)) failures.push(`${sentinel.id}: ${check.file} falta ${re}`);
    }
  }
  if (execute) {
    for (const name of sentinel.scripts) {
      const run = spawnSync("npm", ["run", name], { cwd: rootDir, encoding: "utf8" });
      if (run.status !== 0) {
        failures.push(`${sentinel.id}: npm run ${name} falhou`);
        if (run.stderr) console.error(run.stderr.slice(-600));
      }
    }
  }
}

assert.ok(scripts["validate:beta"]?.includes("test:transfer-target-integrity") || !execute);
// Contrato mínimo: F está em validate:beta após integração V4.6
const beta = String(scripts["validate:beta"] ?? "");
if (!beta.includes("test:transfer-target-integrity")) {
  failures.push("validate:beta deve incluir test:transfer-target-integrity");
}
if (!beta.includes("validate:transfer-target-integrity")) {
  failures.push("validate:beta deve incluir validate:transfer-target-integrity");
}

if (failures.length) {
  console.error("FAIL test:paid-beta-regression-sentinels");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  `OK test:paid-beta-regression-sentinels — ${SENTINELS.length} sentinelas mapeadas${execute ? " (+execute)" : " (contrato)"}`
);
for (const s of SENTINELS) {
  console.log(`  · ${s.id}: ${s.scripts.join(", ")}`);
}
