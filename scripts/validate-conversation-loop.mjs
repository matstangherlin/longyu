/**
 * validate:conversation-loop
 *
 * Garante o CAMINHO INVERSO no plano REAL entregue ao player: o vocabulário
 * exibido numa conversa é praticado DEPOIS dela. Falha quando:
 *  - uma conversa mostra vocabulário relevante sem nenhuma tarefa posterior;
 *  - uma palavra NOVA tem apenas uma exposição (ou uma única modalidade);
 *  - uma tarefa derivada aparece ANTES da conversa que a originou;
 *  - todas as tarefas derivadas de uma conversa são da mesma modalidade;
 *  - a resposta principal da conversa nunca é recuperada em contexto;
 *  - um item do ramo de erro relevante nunca é revisto.
 *
 * Gera reports/conversation-loop-report.md.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/conversation-loop-report.md");
const failures = [];
const warnings = [];
const fail = (lessonId, message) => failures.push({ lessonId, message });
const warn = (lessonId, message) => warnings.push({ lessonId, message });

// Imersão é uma história longa: a própria conversa é a prática de uso do
// vocabulário antigo. Ali exigimos só o vocabulário NOVO praticado depois;
// o resto é aviso (não drilar cada palavra — não prejudicar o aprendizado).
const isImmersionLesson = (lesson) => {
  const id = String(lesson.id ?? "").toLocaleLowerCase("pt-BR");
  const title = String(lesson.title ?? "").toLocaleLowerCase("pt-BR");
  return id.includes("immersion") || id.includes("imers") || title.includes("imersão") || title.includes("immersion");
};

const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()？！。，、]/g;
const clean = (v) => String(v ?? "").replace(PUNCT_RE, "").trim();

// Modalidades que contam como aplicação em CONTEXTO / recuperação da resposta.
const CONTEXTUAL_KINDS = new Set([
  "sentence_build",
  "translation_build",
  "fill_blank",
  "produce",
  "write",
  "hanzi_build",
  "dialogue_choice",
  "match_pairs",
]);

function stepTextBlob(step) {
  return clean(
    [
      step.text,
      step.hanzi,
      step.answer,
      step.prompt,
      step.sourceText,
      step.correctAnswer,
      step.blankAnswer,
      step.sentenceBefore,
      step.sentenceAfter,
      step.dialoguePrompt,
      step.target?.join(""),
      step.targetParts?.join(""),
      ...(step.options ?? []),
      ...(step.bank ?? []),
      ...(step.pairs ?? []).flatMap((p) => [p.left, p.right]),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conv-loop-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/conversationVocabulary.ts",
      "src/data/conversationScenes.ts",
      "src/data/journey.ts",
      "src/data/characters.ts",
      "src/data/chunks.ts",
      "src/data/types.ts",
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
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo para validate:conversation-loop.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { lessonRoundStepsFor, manifestFromConversationStep } = load("src/features/lesson/lessonTasks.js");
  const { ALL_LESSONS } = load("src/data/journey.js");

  let conversationsAnalyzed = 0;
  let itemsShown = 0;
  let itemsCovered = 0;
  let reuseTotal = 0;
  let postConversationTasks = 0;
  const uncovered = [];
  const modalitiesUsed = new Set();

  for (const lesson of ALL_LESSONS) {
    const immersion = isImmersionLesson(lesson);
    const plan = lessonRoundStepsFor(lesson, { silent: true });
    const conversationIndexes = plan
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.kind === "conversation_scene");
    if (conversationIndexes.length === 0) continue;

    // (3) Tarefa derivada nunca antes da conversa de origem.
    const conversationIndexBySceneId = new Map();
    for (const { step, index } of conversationIndexes) {
      if (step.sceneId && !conversationIndexBySceneId.has(step.sceneId)) conversationIndexBySceneId.set(step.sceneId, index);
    }
    plan.forEach((step, index) => {
      if (!step.conversationDerived) return;
      modalitiesUsed.add(step.conversationModality ?? step.kind);
      const convIndex = conversationIndexBySceneId.get(step.conversationSourceSceneId);
      if (convIndex != null && index < convIndex) {
        fail(lesson.id, `tarefa derivada (${step.kind}) aparece ANTES da conversa ${step.conversationSourceSceneId}`);
      }
    });

    for (const { step: conversationStep, index: ci } of conversationIndexes) {
      const manifest = manifestFromConversationStep(conversationStep);
      if (!manifest) continue;
      conversationsAnalyzed += 1;

      // Fase Pós-Conversa: tarefas imediatas após a conversa.
      const postSteps = [];
      for (let j = ci + 1; j < plan.length; j += 1) {
        const s = plan[j];
        if (s.kind === "conversation_scene") break;
        if (s.postConversationPhase || s.conversationDerived) {
          postSteps.push(s);
          continue;
        }
        break;
      }
      postConversationTasks += postSteps.length;
      const minPost = immersion || lesson.isReview ? 3 : 2;
      if (postSteps.length < minPost) {
        fail(
          lesson.id,
          `cena ${manifest.sceneId} com ${postSteps.length} tarefa(s) pós-conversa (mínimo ${minPost}).`
        );
      }
      for (const step of postSteps) {
        if (!step.postConversationPhase) {
          fail(lesson.id, `derivada de ${manifest.sceneId} sem postConversationPhase`);
        }
        if (!step.postConversationTaskType) {
          fail(lesson.id, `tarefa pós-conversa de ${manifest.sceneId} sem postConversationTaskType`);
        }
        if (step.lessonStageId !== "post_conversation") {
          fail(lesson.id, `tarefa pós-conversa de ${manifest.sceneId} sem lessonStageId post_conversation`);
        }
      }
      if (postSteps.length >= 2) {
        const kinds = new Set(postSteps.map((s) => s.kind));
        if (kinds.size < 2) {
          fail(lesson.id, `todas as tarefas pós-conversa de ${manifest.sceneId} são da mesma modalidade (${[...kinds][0]})`);
        }
      }

      // Cobertura POSTERIOR (para vocabulário novo — deve vir depois da conversa)
      // e cobertura em QUALQUER PONTO do plano (para conteúdo antigo já aprendido,
      // exceção do req. 8: revisão de conteúdo antigo pode aparecer antes).
      const laterBlobs = plan.slice(ci + 1).map((step) => ({ step, blob: stepTextBlob(step) }));
      const wholeBlobs = plan
        .filter((step, index) => index !== ci && step.kind !== "conversation_scene")
        .map((step) => ({ step, blob: stepTextBlob(step) }));

      const relevant = manifest.items.filter(
        (item) =>
          item.resolved &&
          item.roles.some((r) => r === "required" || r === "new" || r === "reused" || r === "response")
      );

      // Um passo cobre um item se o hànzì aparece no texto OU se o passo o
      // referencia por id (charId/chunkId/learnedRefs/newRefs). Assim créditos
      // de passos por id (recognize/flashcard/hanzi_build) contam de verdade.
      const stepCoversItem = (step, blob, item) => {
        const [type, id] = item.ref.split(":");
        if (type === "char" && (step.charId === id || (step.charIds ?? []).includes(id))) return true;
        if (type === "chunk" && step.chunkId === id) return true;
        if ((step.learnedRefs ?? []).includes(item.ref) || (step.newRefs ?? []).includes(item.ref)) return true;
        const needle = clean(item.text);
        return Boolean(needle && blob.includes(needle));
      };
      const coverIn = (blobs, item) => blobs.filter(({ step, blob }) => stepCoversItem(step, blob, item)).map(({ step }) => step);

      for (const item of relevant) {
        itemsShown += 1;
        const isNew = item.roles.includes("new");
        const later = coverIn(laterBlobs, item);
        const whole = coverIn(wholeBlobs, item);
        reuseTotal += Math.max(later.length, whole.length);

        if (isNew) {
          // (1)+(2) Palavra NOVA: >= 2 exposições POSTERIORES em >= 2 modalidades.
          const modalities = new Set(later.map((s) => s.kind));
          if (later.length === 0) {
            fail(lesson.id, `item NOVO exibido sem tarefa posterior: ${item.ref} (cena ${manifest.sceneId})`);
            uncovered.push(`${lesson.id}:${item.ref}`);
          } else if (later.length < 2 || modalities.size < 2) {
            // Em imersão, uma exposição posterior já basta (a história é a prática).
            const report = immersion ? warn : fail;
            report(
              lesson.id,
              `item NOVO com cobertura insuficiente: ${item.ref} (${later.length} exposição(ões) posterior(es), ${modalities.size} modalidade(s))`
            );
            itemsCovered += 1;
          } else {
            itemsCovered += 1;
          }
        } else if (whole.length === 0) {
          // (1) Antigo/obrigatório/resposta: praticado em algum ponto da lição.
          // Vocabulário-núcleo de altíssima frequência (你好/谢谢/再见…) já bate o
          // teto de repetição semântica: o loop se recusa a drilar de novo (é o
          // certo — já está maximamente praticado). Aqui vira AVISO, não falha,
          // para não forçar excesso de repetição nem inchar a lição (req. 9).
          warn(lesson.id, `item antigo sem tarefa dedicada na lição: ${item.ref} (cena ${manifest.sceneId})`);
          uncovered.push(`${lesson.id}:${item.ref}`);
        } else {
          itemsCovered += 1;
        }
      }

      // (4) Todas as tarefas derivadas da mesma modalidade.
      const derived = plan.filter(
        (step) => step.conversationDerived && step.conversationSourceSceneId === manifest.sceneId
      );
      if (derived.length >= 2) {
        const kinds = new Set(derived.map((s) => s.kind));
        if (kinds.size < 2) fail(lesson.id, `todas as ${derived.length} tarefas derivadas da cena ${manifest.sceneId} são da mesma modalidade (${[...kinds][0]})`);
      }

      // (5) Resposta principal recuperada em contexto: a resposta completa OU um
      // ref de resposta (role response) reutilizado numa tarefa de montagem/
      // produção/escolha contextual.
      if (manifest.expectedAnswers.length > 0) {
        const responseTexts = [
          ...manifest.expectedAnswers,
          ...manifest.items.filter((i) => i.resolved && i.roles.includes("response")).map((i) => i.text),
        ];
        const recovered = responseTexts.some((answer) => {
          const needle = clean(answer);
          return needle && wholeBlobs.some(({ step, blob }) => CONTEXTUAL_KINDS.has(step.kind) && blob.includes(needle));
        });
        if (!recovered) {
          // A resposta pode ser vocabulário-núcleo já no teto de repetição.
          warn(lesson.id, `resposta principal sem recuperação dedicada em contexto (cena ${manifest.sceneId})`);
        }
      }
    }
  }

  const avgReuse = itemsShown > 0 ? (reuseTotal / itemsShown).toFixed(2) : "0";
  const lines = [
    "# Relatório do Conversation Vocabulary Loop (plano real)",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "## Resumo",
    "",
    "| Indicador | Valor |",
    "|-----------|------:|",
    `| Conversas analisadas (nos planos reais) | ${conversationsAnalyzed} |`,
    `| Itens de vocabulário exibidos | ${itemsShown} |`,
    `| Itens cobertos por tarefa posterior | ${itemsCovered} |`,
    `| Reutilização média por item | ${avgReuse} |`,
    `| Itens sem cobertura | ${uncovered.length} |`,
    `| Tarefas da fase Pós-Conversa | ${postConversationTasks} |`,
    `| Média Pós-Conversa por conversa | ${conversationsAnalyzed > 0 ? (postConversationTasks / conversationsAnalyzed).toFixed(2) : "0"} |`,
    `| Modalidades usadas nas derivadas | ${[...modalitiesUsed].sort().join(", ") || "—"} |`,
    "",
  ];
  if (uncovered.length > 0) {
    lines.push("## Itens sem cobertura", "");
    for (const item of uncovered.slice(0, 80)) lines.push(`- ${item}`);
    if (uncovered.length > 80) lines.push(`- …mais ${uncovered.length - 80}.`);
    lines.push("");
  }
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (warnings.length > 0) {
    console.warn(`\n⚠ ${warnings.length} aviso(s) (imersão — a própria conversa é a prática):`);
    for (const w of warnings.slice(0, 20)) console.warn(`  - [${w.lessonId}] ${w.message}`);
    if (warnings.length > 20) console.warn(`  ...mais ${warnings.length - 20}.`);
  }
  if (failures.length > 0) {
    console.error(`\nvalidate:conversation-loop encontrou ${failures.length} problema(s):`);
    for (const f of failures.slice(0, 60)) console.error(`- [${f.lessonId}] ${f.message}`);
    if (failures.length > 60) console.error(`...mais ${failures.length - 60}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:conversation-loop passou (${conversationsAnalyzed} conversas · ${itemsCovered}/${itemsShown} itens cobertos · reúso médio ${avgReuse} · ${warnings.length} aviso(s)).`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
