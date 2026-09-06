#!/usr/bin/env node
/**
 * V4.9.4 — o arco "Primeiros contatos", medido.
 *
 * A V4.9.0 instrumentou a fundação: os cinco tópicos iniciais têm
 * `pedagogicalEvidence` em cada passo, e por isso é possível afirmar que
 * ninguém é cobrado antes de ser ensinado ali. Da lição `l1` em diante essa
 * anotação simplesmente não existe — a Fase 0 desta remessa confirmou zero
 * passos com evidência em todo o arco.
 *
 * Isso significa que a região comunicativa do curso nunca foi medida. Não
 * "estava boa" nem "estava ruim": ninguém sabia. O baseline honesto desta
 * remessa é NÃO MEDIDO, e o trabalho é medir.
 *
 * A medição não inventa uma segunda noção de "cobrado". Ela usa os mesmos
 * predicados que o app usa para decidir se um passo vale nota
 * (`isEvaluableQuestionStep`) e se ele exige produção (`isProductionStep`),
 * e o mesmo mapeamento de superfície para alvo do spine
 * (`knowledgeTargetIdsForSurface`). Uma régua paralela mediria outra coisa e
 * um dia discordaria da que o aluno realmente encontra.
 *
 * Quatro suítes, quatro entradas de `package.json`, cada uma falhando com o
 * próprio nome.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v494-"));
const reportPath = path.join(rootDir, "docs/reports/v494-first-contacts-experience.md");

const SUITES = ["theme", "teach", "conversation", "checkpoint", "locale"];
const requested = (process.argv.find((arg) => arg.startsWith("--suite=")) ?? "").slice(8);
if (requested && !SUITES.includes(requested)) {
  console.error(`--suite desconhecida: "${requested}" (use ${SUITES.join(", ")})`);
  process.exit(1);
}
const active = requested ? [requested] : SUITES;
const runs = (suite) => active.includes(suite);

try {
  const program = ts.createProgram(
    [
      "src/data/communicativeArcs.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/pedagogicalSpine.ts",
      "src/data/exerciseFeasibility.ts",
      "src/data/foundationTopicPlans.ts",
      "src/data/coreInstructionSlots.ts",
      "src/data/journeyOrchestrator.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const arcs = require(path.join(outDir, "src/data/communicativeArcs.js"));
  const journey = require(path.join(outDir, "src/data/journey.js"));
  const chunksModule = require(path.join(outDir, "src/data/chunks.js"));
  const charactersModule = require(path.join(outDir, "src/data/characters.js"));
  const spine = require(path.join(outDir, "src/data/pedagogicalSpine.js"));
  const feasibility = require(path.join(outDir, "src/data/exerciseFeasibility.js"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const slots = require(path.join(outDir, "src/data/coreInstructionSlots.js"));

  const failures = [];
  let assertions = 0;
  const check = (condition, message) => {
    assertions += 1;
    if (!condition) failures.push(message);
  };

  const arc = arcs.FIRST_CONTACTS_ARC;
  const allLessons = journey.ALL_LESSONS;
  const lessonById = new Map(allLessons.map((lesson) => [lesson.id, lesson]));
  const orderIndex = new Map(allLessons.map((lesson, index) => [lesson.id, index]));
  const chunkIds = new Set((chunksModule.CHUNKS ?? []).map((entry) => `chunk:${entry.id}`));
  const charIds = new Set((charactersModule.CHARACTERS ?? []).map((entry) => `char:${entry.id}`));
  const knownRef = (ref) => chunkIds.has(ref) || charIds.has(ref);

  // ── validate:first-contacts-theme ───────────────────────────────────────
  if (runs("theme")) {
    check(arc.topicIds.length > 0, "arco sem tópicos");
    check(arc.capabilities.length >= 6, "arco com poucas capabilities para o resultado prometido");

    // Os tópicos existem e estão na ordem real da Jornada — o arco descreve o
    // currículo, não o reorganiza.
    let previous = -1;
    for (const topicId of arc.topicIds) {
      const index = orderIndex.get(topicId);
      check(index !== undefined, `tópico "${topicId}" não existe na Jornada`);
      if (index === undefined) continue;
      check(index > previous, `tópico "${topicId}" está fora da ordem real da Jornada`);
      previous = Math.max(previous, index);
    }

    const seen = new Set();
    for (const capability of arc.capabilities) {
      check(!seen.has(capability.id), `capability duplicada: ${capability.id}`);
      seen.add(capability.id);
      check(Boolean(capability.labelPt?.trim()), `${capability.id}: sem rótulo PT`);
      check(Boolean(capability.labelEn?.trim()), `${capability.id}: sem rótulo EN`);
      check(
        arc.topicIds.includes(capability.evidenceTopicId),
        `${capability.id}: aponta para "${capability.evidenceTopicId}", que não pertence ao arco`
      );
      check(capability.evidenceRefs.length > 0, `${capability.id}: sem evidência`);

      // A checagem que dá sentido ao resto: a evidência precisa EXISTIR e o
      // tópico precisa realmente contê-la. Uma capability sem isso é uma
      // promessa ao aluno que ninguém conferiu.
      const lesson = lessonById.get(capability.evidenceTopicId);
      const library = new Set(lesson?.libraryItems ?? []);
      for (const ref of capability.evidenceRefs) {
        check(knownRef(ref), `${capability.id}: ref "${ref}" não existe no repertório`);
        check(
          library.has(ref),
          `${capability.id}: "${capability.evidenceTopicId}" não contém "${ref}"`
        );
      }
    }

    // Parte S — booster nunca é CORE.
    check(
      arc.capabilities.some((capability) => capability.level === "CORE_REQUIRED"),
      "arco sem nenhuma capability obrigatória não pode ser concluído"
    );
    check(
      arcs.coreRequiredCapabilities(arc).length >= 5,
      "o resultado prometido exige mais capabilities obrigatórias do que o arco declara"
    );
  }

  // ── validate:first-contacts-teach-before-test ───────────────────────────
  //
  // A linha do tempo do aluno dentro do arco, passo a passo, usando os mesmos
  // predicados do app. Um passo passivo (`listen`, `intro`) ensina; um passo
  // avaliável cobra; um passo de produção exige que ele fabrique a resposta.
  const sessions = [];
  let gradedBeforeTeaching = 0;
  let productionBeforeGuidance = 0;
  let unknownDistractors = 0;
  let notYetTaughtDistractors = 0;

  if (runs("teach") || runs("conversation") || runs("checkpoint")) {
    const firstExposure = new Map();
    const firstGraded = new Map();
    const firstProduction = new Map();

    const surfacesOf = (step) =>
      [step.hanzi, step.prompt, step.answer, step.correctAnswer, step.text, step.chunkId]
        .filter((value) => typeof value === "string" && value.length > 0)
        .concat(Array.isArray(step.options) ? step.options.filter((o) => typeof o === "string") : []);

    // A linha do tempo começa na PRIMEIRA lição do curso, não na primeira do
    // arco. O aluno chega em `l2` tendo feito a fundação inteira e o
    // laboratório de exercícios; medir só o arco faria o gate acusar 你好 de
    // ser cobrado sem ensino, quando ele é ensinado cinco lições antes.
    //
    // Este foi o primeiro resultado da medição, e era erro da régua. Uma régua
    // que reporta falha falsa é pior do que régua nenhuma: alguém "conserta"
    // conteúdo correto para satisfazê-la.
    const lastArcIndex = Math.max(...arc.topicIds.map((id) => orderIndex.get(id) ?? -1));
    const arcTopics = new Set(arc.topicIds);

    // A fundação não ensina por `lesson.steps`: ela ensina pelos planos
    // autorados da V4.9.0 e pelas cápsulas de instrução da V4.9.3. Ignorá-los
    // faria o gate afirmar que 你好 chega sem ensino em `l2` — quando o aluno
    // acabou de passar por uma aula inteira sobre ele. Semear a exposição a
    // partir das fontes reais é o que torna a medição fiel ao que ele viu.
    for (const slot of slots.FOUNDATION_INSTRUCTION_SLOTS) {
      for (const target of slot.knowledgeTargets) {
        if (!firstExposure.has(target)) {
          firstExposure.set(target, { topicId: slot.topicId, step: 0, order: -1 });
        }
      }
    }
    for (const lesson of allLessons.slice(0, lastArcIndex + 1)) {
      for (const pass of [1, 2, 3, 4]) {
        const authored = plans.foundationAuthoredPlanFor(lesson.id, pass);
        if (!authored?.length) continue;
        authored.forEach((step, stepIndex) => {
          const evidence = step.pedagogicalEvidence;
          if (!evidence || evidence.graded) return;
          for (const target of evidence.knowledgeTargetIds ?? []) {
            if (!firstExposure.has(target)) {
              firstExposure.set(target, { topicId: lesson.id, step: stepIndex + 1, order: -1 });
            }
          }
        });
      }
    }

    for (const lesson of allLessons.slice(0, lastArcIndex + 1)) {
      const topicId = lesson.id;
      const insideArc = arcTopics.has(topicId);
      const steps = lesson.steps ?? [];

      const taught = new Set();
      const asked = new Set();
      const produced = new Set();
      const surprises = [];

      steps.forEach((step, stepIndex) => {
        const at = { topicId, step: stepIndex + 1, order: orderIndex.get(topicId) ?? 0 };
        const graded = feasibility.isEvaluableQuestionStep(step);
        const production = feasibility.isProductionStep(step);

        // Alvos que o passo toca, pela mesma função que o spine usa.
        //
        // `text` entra porque é ali que um passo `listen` guarda o mandarim —
        // e `listen` é exatamente o passo que ENSINA. Sem este campo o gate
        // acusava 早上好 e 我很好 de chegarem sem ensino, quando a lição os
        // apresenta na tela imediatamente anterior. Foi o terceiro erro da
        // régua nesta remessa; nenhum deles era erro do currículo.
        const answerSurfaces = [
          step.answer,
          step.correctAnswer,
          step.hanzi,
          step.chunkId,
          step.text,
        ].filter((value) => typeof value === "string" && value.length > 0);
        const targets = new Set(
          answerSurfaces.flatMap((surface) => spine.knowledgeTargetIdsForSurface(surface))
        );

        for (const target of targets) {
          if (graded) {
            asked.add(target);
            const exposure = firstExposure.get(target);
            // Já cobrado antes do arco é conhecimento prévio: se aquela
            // cobrança foi justa é pergunta do gate da fundação, não desta.
            if (!exposure && !firstGraded.has(target) && insideArc) {
              // Cobrado sem NENHUMA exposição anterior em todo o curso.
              gradedBeforeTeaching += 1;
              surprises.push({ target, step: stepIndex + 1, kind: step.kind });
            }
            if (!firstGraded.has(target)) firstGraded.set(target, at);
          } else {
            taught.add(target);
            if (!firstExposure.has(target)) firstExposure.set(target, at);
          }
          if (production) {
            produced.add(target);
            if (!firstProduction.has(target)) firstProduction.set(target, at);
            // Produzir antes de qualquer reconhecimento guiado é pedir que o
            // aluno fabrique o que nunca reconheceu.
            const recognised = firstGraded.get(target);
            const exposure = firstExposure.get(target);
            if (!exposure && insideArc) productionBeforeGuidance += 1;
            void recognised;
          }
        }

        // Distrator desconhecido: opção que exige um alvo nunca exposto.
        if (graded && Array.isArray(step.options)) {
          const answer = String(step.answer ?? step.correctAnswer ?? "");
          for (const option of step.options) {
            if (typeof option !== "string" || option === answer) continue;
            for (const target of spine.knowledgeTargetIdsForSurface(option)) {
              if (firstExposure.has(target) || firstGraded.has(target) || !insideArc) continue;
              // Duas coisas muito diferentes moram aqui, e misturá-las
              // esconderia a que importa.
              //
              // Um distrator que o currículo ensina MAIS TARDE é uma prévia: o
              // aluno já reconhece a resposta certa e não precisa saber o que
              // a opção errada quer dizer para rejeitá-la. Conto e reporto,
              // mas não reprovo — reprovar exigiria reescrever as opções de
              // nove lições para melhorar um número, sem melhorar o aluno.
              //
              // Um distrator que o curso NUNCA ensina é outra coisa: uma opção
              // que o aluno não tem como avaliar em ponto nenhum da vida dele
              // dentro do app. Esse é defeito, e reprova.
              const taughtSomewhere = allLessons.some((entry) =>
                (entry.libraryItems ?? []).includes(target)
              );
              if (taughtSomewhere) notYetTaughtDistractors += 1;
              else {
                unknownDistractors += 1;
                surprises.push({ target, step: stepIndex + 1, kind: `${step.kind}:distrator` });
              }
            }
          }
        }

        void surfacesOf;
      });

      if (!insideArc) continue;
      sessions.push({
        topicId,
        title: lesson.title,
        steps: steps.length,
        taught: [...taught],
        asked: [...asked],
        produced: [...produced],
        surprises,
      });
    }

    if (runs("teach")) {
      for (const session of sessions) {
        for (const surprise of session.surprises) {
          check(
            false,
            `${session.topicId}/passo ${surprise.step} (${surprise.kind}): "${surprise.target}" é cobrado sem exposição anterior`
          );
        }
      }
      check(productionBeforeGuidance === 0, `${productionBeforeGuidance} produção(ões) antes de qualquer reconhecimento`);
    }
  }

  // ── validate:first-contacts-checkpoint ──────────────────────────────────
  //
  // O checkpoint não ensina: ele confirma. Toda capability obrigatória do
  // arco precisa ser exercida por um tópico que já a ensinou antes.
  if (runs("checkpoint")) {
    const core = arcs.coreRequiredCapabilities(arc);
    for (const capability of core) {
      const index = orderIndex.get(capability.evidenceTopicId);
      const last = Math.max(...arc.topicIds.map((id) => orderIndex.get(id) ?? -1));
      check(
        index !== undefined && index <= last,
        `${capability.id}: ensinada fora do arco, então o checkpoint cobraria algo não ensinado`
      );
    }
    check(
      core.length === new Set(core.map((capability) => capability.id)).size,
      "capabilities obrigatórias duplicadas no checkpoint"
    );
  }

  // ── validate:first-contacts-conversation-readiness ──────────────────────
  //
  // A conversa é o teto do arco. Ela só pode usar o que o arco já ensinou —
  // e o motor da V4.8 já resolve variantes por refs conhecidos, então aqui a
  // checagem é sobre a POSIÇÃO: a lição da conversa precisa vir depois das
  // lições que ensinam o que ela usa.
  if (runs("conversation")) {
    const conversationCapability = arc.capabilities.find(
      (capability) => capability.id === "FC08_FIRST_CONTACT_CONVERSATION"
    );
    check(Boolean(conversationCapability), "o arco precisa declarar a conversa de primeiro contato");
    if (conversationCapability) {
      const conversationIndex = orderIndex.get(conversationCapability.evidenceTopicId) ?? -1;
      for (const ref of conversationCapability.evidenceRefs) {
        // Onde este ref é ensinado pela primeira vez no curso inteiro.
        const teachingIndex = allLessons.findIndex((lesson) =>
          (lesson.libraryItems ?? []).includes(ref)
        );
        check(
          teachingIndex >= 0,
          `conversa usa "${ref}", que nenhuma lição ensina`
        );
        check(
          teachingIndex >= 0 && teachingIndex <= conversationIndex,
          `conversa usa "${ref}" antes de ele ser ensinado (${allLessons[teachingIndex]?.id ?? "?"})`
        );
      }
    }
  }

  // ── validate:first-contacts-locale-parity ───────────────────────────────
  if (runs("locale")) {
    check(Boolean(arc.titlePt?.trim()) && Boolean(arc.titleEn?.trim()), "arco sem título nos dois idiomas");
    check(
      Boolean(arc.outcomePt?.trim()) && Boolean(arc.outcomeEn?.trim()),
      "arco sem resultado prometido nos dois idiomas"
    );
    check(arc.outcomePt !== arc.outcomeEn, "o resultado EN não pode ser o texto PT copiado");
    for (const capability of arc.capabilities) {
      check(
        capability.labelPt !== capability.labelEn,
        `${capability.id}: rótulo EN idêntico ao PT sugere tradução esquecida`
      );
    }
    // O chinês é o mesmo nos dois cursos: a evidência é a mesma lista de refs,
    // porque ela É o conteúdo chinês. Se um dia houver refs por idioma, isto
    // quebra e alguém precisa justificar.
    for (const capability of arc.capabilities) {
      for (const ref of capability.evidenceRefs) {
        check(
          ref.startsWith("chunk:") || ref.startsWith("char:"),
          `${capability.id}: ref "${ref}" não é identidade chinesa canônica`
        );
      }
    }
  }

  // ── Relatório da experiência (Parte Y) ──────────────────────────────────
  if (!requested) {
    const lines = [
      "# V4.9.4 — Primeiros contatos, sessão a sessão",
      "",
      "Gerado por `npm run validate:first-contacts`. A pergunta de cada linha é",
      "a da Parte Y: um iniciante absoluto saberia por que está respondendo isso?",
      "",
      "## Métricas",
      "",
      `- themeTopics: ${arc.topicIds.length}`,
      `- communicativeCapabilities: ${arc.capabilities.length}`,
      `- coreRequiredCapabilities: ${arcs.coreRequiredCapabilities(arc).length}`,
      `- gradedBeforeTeaching: ${gradedBeforeTeaching}`,
      `- productionBeforeGuidance: ${productionBeforeGuidance}`,
      `- unknownDistractors: ${unknownDistractors}`,
      `- notYetTaughtDistractors: ${notYetTaughtDistractors}`,
      "",
      "## Sessões",
      "",
      "| tópico | título | passos | ensina | cobra | produz | surpresas |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      ...sessions.map(
        (session) =>
          `| \`${session.topicId}\` | ${session.title} | ${session.steps} | ${session.taught.length} | ${session.asked.length} | ${session.produced.length} | ${session.surprises.length} |`
      ),
      "",
      "## Capabilities e sua evidência",
      "",
      "| capability | nível | ensinada em | evidência |",
      "| --- | --- | --- | --- |",
      ...arc.capabilities.map(
        (capability) =>
          `| ${capability.id} | ${capability.level} | \`${capability.evidenceTopicId}\` | ${capability.evidenceRefs.map((ref) => `\`${ref}\``).join(", ")} |`
      ),
      "",
    ];
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  }

  const label = requested ? `validate:first-contacts --suite=${requested}` : "validate:first-contacts";
  if (failures.length) {
    console.error(`FAIL ${label}`);
    for (const failure of failures.slice(0, 30)) console.error(` - ${failure}`);
    if (failures.length > 30) console.error(` … e mais ${failures.length - 30}`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS ${label} — ${assertions} asserções em: ${active.join(", ")}` +
        (runs("teach")
          ? ` · cobrado sem ensino ${gradedBeforeTeaching}, produção sem guia ${productionBeforeGuidance}, distrator desconhecido ${unknownDistractors}, prévia ${notYetTaughtDistractors}`
          : "") +
        "."
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

function sameStep(a, b) {
  return a.topicId === b.topicId && a.step === b.step;
}
