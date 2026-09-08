#!/usr/bin/env node
/**
 * validate:listening-affordance — V4.9.5A.1
 *
 * A regra desta remessa: a modalidade prometida na tela precisa ser a
 * modalidade real da tarefa. Este gate cuida do lado auditivo dela.
 *
 * O bug que o originou: `audio_to_action` declarava `audioText`, dizia "Ouça e
 * escolha a ação/imagem correspondente" e caía no renderer de diálogo, que
 * nunca toca áudio. Eram 35 exercícios pedindo para ouvir algo que a tela não
 * tocava, com uma copy prometendo imagens que não existiam.
 *
 * O contrato é estrutural, não textual — a lista de kinds auditivos vem do
 * StepKind, e não de procurar a palavra "Ouça":
 *
 *  1. todo passo de um kind auditivo carrega o estímulo (audioText/áudio);
 *  2. todo kind auditivo é renderizado por um componente com replay manual;
 *  3. a copy não promete imagem/ação quando a resposta é texto;
 *  4. o alvo do áudio não aparece escrito na pergunta (isso mataria a escuta).
 */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
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

/** Kinds cujo estímulo É o áudio: sem som, a tarefa não existe. */
const AUDIO_STIMULUS_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);

/** Renderers que expõem repetição manual do áudio (o aluno controla). */
const AUDIO_RENDERERS = new Set(["StepListenSelect", "StepAudioDiscrimination", "StepDictation", "StepDragonDictation"]);

/**
 * Só conta como promessa de modalidade a copy que MANDA o aluno olhar/escolher
 * uma imagem ou uma ação. Uma foto dentro da ficção da tarefa ("Alguém aponta
 * para seu pai na foto") não promete interface nenhuma.
 */
const PROMISES_IMAGE = /(?:escolha|toque|selecione|clique|qual|choose|tap|select|pick)[^.?!]{0,24}\b(?:a\s+)?(?:imagem|image|foto)\b|áudio\/imagem|audio\/image|ação\/imagem|acao\/imagem/i;
const PROMISES_ACTION = /(?:escolha|toque|selecione|qual|choose|tap|select)[^.?!]{0,24}\b(?:a\s+)?(?:ação|acao|action)\b|ação\/imagem|acao\/imagem/i;

/**
 * Passos em que o alvo aparece escrito de propósito: a cápsula fundacional
 * emparelha forma e som ("a escrita e o som andam juntos") em vez de testar
 * discriminação auditiva. Cada entrada precisa continuar violando — se parar,
 * o gate falha, para a lista não apodrecer.
 */
const ALLOWED_TARGET_ECHO = new Map([
  ["p1-o-que-e-hanzi/listen_select/Veja e ouça 你好", "cápsula de hànzì: mostrar a escrita ao lado do som é o conteúdo da aula"],
]);
const usedEchoAllowances = new Set();

const stepsSource = await readFile(path.join(root, "src/features/lesson/steps.tsx"), "utf8");

// ————————————————————————————————————————————————————————————————
// 1) Roteamento: cada kind auditivo cai num renderer que toca e repete.
// ————————————————————————————————————————————————————————————————
function rendererForKind(kind) {
  // O switch agrupa cases; o renderer é o primeiro `<StepX` depois do case.
  const at = stepsSource.indexOf(`case "${kind}":`);
  if (at < 0) return null;
  const tail = stepsSource.slice(at, at + 1200);
  const match = tail.match(/<(Step[A-Za-z]+)\b/);
  return match ? match[1] : null;
}

for (const kind of AUDIO_STIMULUS_KINDS) {
  const renderer = rendererForKind(kind);
  if (!renderer) {
    fail(kind, "kind auditivo sem case no StepRenderer");
    continue;
  }
  if (!AUDIO_RENDERERS.has(renderer)) {
    fail(kind, `renderizado por ${renderer}, que não oferece áudio nem repetição — "Ouça" sem som`);
  }
}

// O renderer precisa mesmo tocar o estímulo a pedido do aluno, não só no
// autoplay: autoplay é bloqueado por browser e não se repete.
for (const renderer of AUDIO_RENDERERS) {
  const at = stepsSource.indexOf(`function ${renderer}(`);
  if (at < 0) continue;
  const nextFunction = stepsSource.indexOf("\nfunction ", at + 1);
  const body = stepsSource.slice(at, nextFunction < 0 ? undefined : nextFunction);
  const playsOnDemand = /onClick=\{[^}]*play|onClick=\{\(\) => speak\(/.test(body);
  if (!playsOnDemand) fail(renderer, "renderer auditivo sem botão de repetir o áudio (replay manual)");
}

// ————————————————————————————————————————————————————————————————
// 2) Conteúdo: estímulo presente, copy fiel, alvo não vazado.
// ————————————————————————————————————————————————————————————————
const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));

let audited = 0;
const seen = new Set();
for (const lesson of ALL_LESSONS) {
  const plans = [lessonRoundStepsFor(lesson, { silent: true })];
  for (const pass of [1, 2, 3, 4]) {
    plans.push(lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true }));
  }
  for (const plan of plans) {
    for (const step of plan) {
      const copy = [step.prompt, step.promptPt, step.title, step.dialoguePrompt].filter(Boolean).join(" | ");
      const key = `${lesson.id}|${step.kind}|${copy}|${step.audioText ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ref = `${lesson.id}/${step.kind}`;
      const hasImages = Boolean(step.imageOptions?.length || step.imageId || step.visualConceptId || step.correctImageId);
      const textOptions = (step.options ?? []).filter((option) => typeof option === "string");

      if (AUDIO_STIMULUS_KINDS.has(step.kind)) {
        audited += 1;
        const stimulus = step.audioText ?? step.correctAnswer ?? step.answer;
        if (!stimulus) fail(ref, "kind auditivo sem audioText: não há o que ouvir");
        // Vazar o alvo por escrito na própria pergunta transforma escuta em
        // leitura. As alternativas podem (e devem) mostrar o texto.
        for (const field of [step.prompt, step.promptPt, step.title, step.dialoguePrompt]) {
          if (typeof field !== "string" || !stimulus || !field.includes(stimulus)) continue;
          const allowance = `${lesson.id}/${step.kind}/${field}`;
          if (ALLOWED_TARGET_ECHO.has(allowance)) {
            usedEchoAllowances.add(allowance);
            continue;
          }
          fail(ref, `alvo "${stimulus}" escrito na pergunta antes da resposta`);
        }
      }

      if (PROMISES_IMAGE.test(copy) && !hasImages) {
        fail(ref, `copy promete imagem e a resposta é texto: "${copy.slice(0, 70)}"`);
      }
      if (PROMISES_ACTION.test(copy) && textOptions.every((option) => /[㐀-鿿]/u.test(option)) && textOptions.length > 0) {
        fail(ref, `copy promete ação e as alternativas são frases em hànzì: "${copy.slice(0, 70)}"`);
      }
    }
  }
}

for (const [allowance, reason] of ALLOWED_TARGET_ECHO) {
  if (!usedEchoAllowances.has(allowance)) {
    fail(allowance, `exceção obsoleta na lista (${reason}) — o passo não viola mais, tire a entrada`);
  }
}

if (failures.length) {
  console.error(`validate:listening-affordance FALHOU com ${failures.length} problema(s):`);
  for (const item of failures.slice(0, 40)) console.error(` - ${item}`);
  if (failures.length > 40) console.error(` ...mais ${failures.length - 40}.`);
  process.exit(1);
}
console.log(
  `OK validate:listening-affordance — ${AUDIO_STIMULUS_KINDS.size} kinds auditivos com replay, ${audited} passos auditados, nenhuma copy prometendo modalidade ausente.`
);
