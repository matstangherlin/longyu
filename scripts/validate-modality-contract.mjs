#!/usr/bin/env node
/**
 * validate:modality-contract — V4.9.5A.1 (P2 e P4)
 *
 * Duas coisas que a remessa não quer perder de vista:
 *
 * P4 — a matriz de modalidade. Cada StepKind promete uma habilidade; a UI
 * precisa oferecer a affordance correspondente. O relatório em
 * reports/modality-contract.md é a foto dessa correspondência, para novas telas
 * não nascerem contraditórias.
 *
 * P2 — "Conversa inteira" funcionou no teste real: contexto, objetivo,
 * recall de várias estruturas e produção livre com modelo depois da resposta.
 * O gate protege exatamente isso: ninguém a transforma em múltipla escolha
 * "porque outras atividades estavam ruins".
 */
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const failures = [];
const fail = (ref, message) => failures.push(`[${ref}] ${message}`);

require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename
  );

const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));
const stepsSource = await readFile(path.join(root, "src/features/lesson/steps.tsx"), "utf8");
const freeAnswerSource = await readFile(path.join(root, "src/features/lesson/FreeAnswerField.tsx"), "utf8");

/** Habilidade que cada família de kind promete ao aluno. */
const SKILL_BY_PREFIX = [
  [/^listen|^audio_|^dictation/, "ouvir"],
  [/^image_|^compare_with_image/, "interpretar imagem"],
  [/^produce$|^free_production$|^transfer_task$|^reverse_recall$|^write$|^conversation_repair$/, "produzir"],
  [/^conversation_scene$/, "conversar"],
  [/^hanzi_builder$|^decompose$|^recognize$/, "construir/reconhecer forma"],
  [/^sentence_build$|^translation_build$|^address_build$/, "montar"],
];
const skillFor = (kind) => SKILL_BY_PREFIX.find(([re]) => re.test(kind))?.[1] ?? "escolher";

/** O campo de resposta aberta é um só; quem o usa entrega voz junto. */
const VOICE_CAPABLE = /data-testid="free-answer-mic"/.test(freeAnswerSource);
const rendererForKind = (kind) => {
  const at = stepsSource.indexOf(`case "${kind}":`);
  if (at < 0) return null;
  // Cases agrupados compartilham o mesmo return; o componente é o primeiro
  // elemento renderizado depois do case, seja ele Step* ou não.
  return stepsSource.slice(at, at + 1200).match(/<([A-Z][A-Za-z]+)\b/)?.[1] ?? null;
};
const rendererBody = (name) => {
  const at = stepsSource.indexOf(`function ${name}(`);
  if (at < 0) return "";
  const next = stepsSource.indexOf("\nfunction ", at + 1);
  return stepsSource.slice(at, next < 0 ? undefined : next);
};

// ————————————————————————————————————————————————————————————————
// Matriz (P4): o que cada kind usado no primeiro arco realmente oferece.
// ————————————————————————————————————————————————————————————————
const stats = new Map();
for (const lesson of ALL_LESSONS) {
  const plans = [lessonRoundStepsFor(lesson, { silent: true })];
  for (const pass of [1, 2, 3, 4]) {
    plans.push(lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true }));
  }
  for (const plan of plans) {
    for (const step of plan) {
      const entry = stats.get(step.kind) ?? { kind: step.kind, steps: 0, audio: 0, image: 0, options: 0, free: 0 };
      entry.steps += 1;
      if (step.audioText || step.slowAudioText) entry.audio += 1;
      if (step.imageId || step.imageOptions?.length || step.visualConceptId || step.correctImageId) entry.image += 1;
      if (step.options?.length || step.bank?.length || step.wordBank?.length) entry.options += 1;
      if (["write", "produce", "free_production", "transfer_task", "reverse_recall"].includes(step.kind)) entry.free += 1;
      stats.set(step.kind, entry);
    }
  }
}

const rows = [...stats.values()].sort((a, b) => b.steps - a.steps);
const lines = [
  "# Matriz de modalidade × interface (V4.9.5A.1)",
  "",
  "Gerado por `validate:modality-contract`. Cada linha responde: o que este tipo",
  "de passo promete, e o que a tela oferece de fato.",
  "",
  "| StepKind | habilidade | passos | com áudio | com imagem | com alternativas | resposta livre | renderer | voz |",
  "|---|---|---:|---:|---:|---:|---:|---|---|",
];
for (const row of rows) {
  const renderer = rendererForKind(row.kind) ?? "—";
  const body = rendererBody(renderer);
  const voice = VOICE_CAPABLE && /FreeAnswerField/.test(body) ? "sim" : "—";
  lines.push(
    `| ${row.kind} | ${skillFor(row.kind)} | ${row.steps} | ${row.audio} | ${row.image} | ${row.options} | ${row.free} | ${renderer} | ${voice} |`
  );
}
await mkdir(path.join(root, "reports"), { recursive: true });
await writeFile(path.join(root, "reports/modality-contract.md"), `${lines.join("\n")}\n`, "utf8");

// Produção aberta entrega voz em todo lugar — a affordance não pode variar
// entre telas do mesmo tipo pedagógico.
for (const kind of ["write", "free_production", "transfer_task", "reverse_recall"]) {
  const renderer = rendererForKind(kind);
  if (!renderer) continue;
  if (!/FreeAnswerField/.test(rendererBody(renderer))) {
    fail(kind, `produção aberta renderizada por ${renderer} sem o campo compartilhado (sem voz)`);
  }
}

// ————————————————————————————————————————————————————————————————
// P2 — "Conversa inteira" continua sendo produção contextual.
// ————————————————————————————————————————————————————————————————
let wholeConversation = null;
for (const lesson of ALL_LESSONS) {
  for (const pass of [1, 2, 3, 4]) {
    for (const step of lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true })) {
      if (step.title === "Conversa inteira") wholeConversation = { lesson: lesson.id, pass, step };
    }
  }
}
if (!wholeConversation) {
  fail("conversa-inteira", "a atividade sumiu da Jornada — ela era o padrão que funcionou no teste real");
} else {
  const { step, lesson } = wholeConversation;
  const ref = `${lesson}/Conversa inteira`;
  // As propriedades que fizeram a atividade funcionar no uso real, uma a uma.
  // O banco de peças continua existindo como AJUDA opcional
  // (productionHelpBuildBank) — o caminho primário é escrever ou falar.
  if (!["reverse_recall", "free_production", "transfer_task", "produce"].includes(step.kind)) {
    fail(ref, `virou ${step.kind}: era produção livre`);
  }
  if (step.options?.length) fail(ref, "virou múltipla escolha: produção contextual não tem alternativas");
  if (!step.isNoHint) fail(ref, "deixou de ser sem dica: a resposta não pode chegar pronta");
  const answers = [step.answer ?? step.correctAnswer, ...(step.accepts ?? [])].filter(Boolean);
  if (new Set(answers).size < 2) fail(ref, "perdeu as formas equivalentes aceitas");
  const target = String(step.answer ?? step.correctAnswer ?? "");
  const parts = target.split(/[，,、]/).filter((piece) => piece.trim().length > 0);
  if (parts.length < 2) fail(ref, "deixou de juntar mais de uma estrutura (multiItemRecall)");
  const goal = String(step.situationPt ?? step.body ?? step.prompt ?? step.promptPt ?? "");
  if (!goal.trim()) fail(ref, "perdeu o objetivo contextual (a situação some e vira tradução)");
  const renderer = rendererForKind(step.kind);
  if (!renderer || !/FreeAnswerField/.test(rendererBody(renderer))) {
    fail(ref, `renderizada por ${renderer ?? "nenhum renderer"}: sem o campo aberto, some a produção (e a voz)`);
  }
}

if (failures.length) {
  console.error(`validate:modality-contract FALHOU com ${failures.length} problema(s):`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log(
  `OK validate:modality-contract — ${rows.length} kinds na matriz (reports/modality-contract.md); "Conversa inteira" segue produção contextual.`
);
