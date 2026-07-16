/**
 * validate:lesson-novelty
 *
 * Audita a NOVIDADE COGNITIVA dos planos reais de lição. O motor já limita a
 * resposta exata (underAnswerRepeatCap ≤ 2); aqui verificamos as chaves
 * semânticas (semanticTargetKeys) e as transformações cognitivas
 * (cognitiveTransformation) entre exercícios que cobram o mesmo alvo.
 *
 * Falha se:
 * - três exercícios cobram o mesmo alvo cognitivo sem nenhuma transformação
 *   entre eles;
 * - a mesma intenção comunicativa aparece excessivamente;
 * - uma lição praticamente só muda o formato (uma chave domina o plano sem
 *   transformações reais);
 * - nenhuma aplicação real aparece (só reconhecimento, nada de produção/uso);
 * - conteúdo antigo aparece apenas como distractor, nunca como alvo;
 * - a consolidação não aumenta a dificuldade (nem produção/uso, nem mistura
 *   com conteúdo antigo).
 *
 * Gera reports/lesson-novelty-report.md.
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/lesson-novelty-report.md");
const errors = [];
const err = (area, ref, message) => errors.push({ area, ref, message });

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()？！。，、]/g;
const cleanHanzi = (value) => String(value ?? "").replace(PUNCT_RE, "").trim();

const GRADED_KINDS = new Set([
  "tone",
  "comprehend",
  "produce",
  "recognize",
  "write",
  "match_pairs",
  "listen_select",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "dialogue_choice",
  "conversation_scene",
  "hanzi_build",
  "tone_pair",
  "image_choice",
]);
const isGraded = (step) => GRADED_KINDS.has(step.kind) && !(step.kind === "write" && step.mode === "free_reflection");

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-novelty-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/lessonNovelty.ts",
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
    console.error("validate:lesson-novelty: falha ao compilar o grafo TypeScript.");
    process.exit(1);
  }

  const load = (rel) => require(path.join(outDir, rel));
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { semanticTargetKeys, cognitiveTransformation, cognitiveProfile } = load("src/features/lesson/lessonNovelty.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const { CHARACTERS } = load("src/data/characters.js");

  const chunkById = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));
  const charById = new Map(CHARACTERS.map((char) => [char.id, char]));

  function refHanzi(ref) {
    const [type, id] = String(ref).split(":");
    if (type === "chunk") return cleanHanzi(chunkById.get(id)?.hanzi);
    if (type === "char") return cleanHanzi(charById.get(id)?.hanzi);
    return "";
  }

  // Currículo acumulado (glifos) ANTES de cada lição — para detectar conteúdo
  // antigo usado apenas como distractor.
  const priorGlyphsByLesson = new Map();
  {
    const cumulative = new Set();
    for (const lesson of ALL_LESSONS) {
      priorGlyphsByLesson.set(lesson.id, new Set(cumulative));
      for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
        for (const glyph of refHanzi(ref)) cumulative.add(glyph);
      }
      for (const step of lesson.steps ?? []) {
        for (const blob of [step.text, step.hanzi, step.correctAnswer, step.answer, ...(step.target ?? []), ...(step.targetParts ?? [])]) {
          for (const glyph of cleanHanzi(blob)) {
            if (CJK_RE.test(glyph)) cumulative.add(glyph);
          }
        }
      }
    }
  }

  function ownGlyphs(lesson) {
    const set = new Set();
    // Revisão de módulo: todo o módulo é conteúdo "próprio" da revisão.
    const sources = lesson.isReview
      ? ALL_LESSONS.filter((candidate) => candidate.unitId === lesson.unitId)
      : [lesson];
    for (const source of sources) {
      for (const ref of [...(source.libraryItems ?? []), ...(source.reviewItems ?? [])]) {
        for (const glyph of refHanzi(ref)) set.add(glyph);
      }
    }
    return set;
  }

  function stepAnswerText(step) {
    return cleanHanzi(
      step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer ?? step.target?.join("") ?? step.targetParts?.join("")
    );
  }

  function stepOptionTexts(step) {
    return [...(step.options ?? []), ...(step.bank ?? []), ...(step.imageOptions ?? [])].map((option) => cleanHanzi(option));
  }

  const rows = [];
  for (const lesson of ALL_LESSONS) {
    const ref = lesson.id;
    const plan = lessonRoundStepsFor(lesson, { silent: true });
    const graded = plan.filter(isGraded);
    const issues = [];

    // Ocorrências por chave semântica.
    const keySteps = new Map();
    for (const step of graded) {
      for (const key of semanticTargetKeys(step)) {
        keySteps.set(key, [...(keySteps.get(key) ?? []), step]);
      }
    }

    // Estatística de transformação: pares consecutivos da mesma chave.
    let repeatPairs = 0;
    let transformedPairs = 0;

    for (const [key, steps] of keySteps) {
      for (let index = 1; index < steps.length; index += 1) {
        repeatPairs += 1;
        if (cognitiveTransformation(steps[index - 1], steps[index])) transformedPairs += 1;
      }

      // 1) Três exercícios cobrando o mesmo alvo sem NENHUMA transformação
      //    entre eles (trio mutuamente não-transformativo).
      if (steps.length >= 3 && !key.startsWith("action:")) {
        outer: for (let a = 0; a < steps.length - 2; a += 1) {
          for (let b = a + 1; b < steps.length - 1; b += 1) {
            if (cognitiveTransformation(steps[a], steps[b])) continue;
            for (let c = b + 1; c < steps.length; c += 1) {
              if (!cognitiveTransformation(steps[a], steps[c]) && !cognitiveTransformation(steps[b], steps[c])) {
                issues.push(`3 exercícios cobram o mesmo alvo sem transformação: ${key}`);
                break outer;
              }
            }
          }
        }
      }

      // 2) Intenção comunicativa excessiva.
      if (key.startsWith("intent:")) {
        const limit = lesson.isReview ? 6 : 4;
        if (steps.length > limit) {
          issues.push(`intenção repetida em excesso: ${key} × ${steps.length} (máx. ${limit})`);
        }
      }
    }

    // 3) Lição que só muda o formato: uma chave domina o plano sem
    //    transformações reais entre as ocorrências.
    if (graded.length >= 5) {
      const dominant = [...keySteps.entries()]
        .filter(([key]) => !key.startsWith("action:") && !key.startsWith("intent:"))
        .sort((a, b) => b[1].length - a[1].length)[0];
      if (dominant && dominant[1].length >= Math.ceil(graded.length * 0.6)) {
        const steps = dominant[1];
        let transforms = 0;
        for (let index = 1; index < steps.length; index += 1) {
          if (cognitiveTransformation(steps[index - 1], steps[index])) transforms += 1;
        }
        if (transforms < Math.max(1, steps.length - 2)) {
          issues.push(`só muda o formato: ${dominant[0]} domina ${steps.length}/${graded.length} exercícios com poucas transformações (${transforms})`);
        }
      }
    }

    // 4) Nenhuma aplicação real (produção/uso/conversa) num plano relevante.
    const applicationCount = graded.filter((step) => cognitiveProfile(step).familyRank >= 2).length;
    if (plan.length >= 6 && applicationCount === 0) {
      issues.push("nenhuma aplicação real: o plano só reconhece, nunca produz/usa");
    }

    // 5) Conteúdo antigo só como distractor. "Alvo" usa as chaves semânticas
    //    (o que o passo COBRA — estímulo ou resposta), não só a resposta.
    //    Lições abstratas de tom/pinyin repetem um único item por natureza e
    //    ficam isentas (mesma isenção dos exercícios visuais).
    const abstractLesson =
      lesson.skill === "som" || /tons-|pinyin|tom/.test(lesson.id.toLocaleLowerCase("pt-BR"));
    const prior = priorGlyphsByLesson.get(lesson.id) ?? new Set();
    const own = ownGlyphs(lesson);
    const oldGlyphs = new Set([...prior].filter((glyph) => !own.has(glyph)));
    if (!abstractLesson && oldGlyphs.size > 0 && graded.length >= 6) {
      let oldAsDistractor = 0;
      let oldAsTarget = 0;
      for (const step of graded) {
        const targetsOld = semanticTargetKeys(step).some((key) => {
          if (!/^(char|chunk|phrase):/.test(key)) return false;
          const text = key.slice(key.indexOf(":") + 1);
          return [...text].some((glyph) => oldGlyphs.has(glyph));
        });
        if (targetsOld) {
          oldAsTarget += 1;
          continue;
        }
        const answer = stepAnswerText(step);
        const optionsUseOld = stepOptionTexts(step).some(
          (option) => option && option !== answer && [...option].some((glyph) => oldGlyphs.has(glyph))
        );
        if (optionsUseOld) oldAsDistractor += 1;
      }
      if (oldAsDistractor >= 2 && oldAsTarget === 0) {
        issues.push("conteúdo antigo aparece só como distractor, nunca como alvo");
      }
    }

    // 6) Consolidação precisa aumentar a dificuldade: produção/uso ou mistura
    //    com conteúdo antigo.
    const consolidation = plan.filter((step) => step.lessonStageId === "consolidation" && isGraded(step));
    if (consolidation.length >= 2) {
      const raisesDifficulty = consolidation.some((step) => {
        const profile = cognitiveProfile(step);
        return profile.familyRank >= 2 || profile.mixesOld;
      });
      if (!raisesDifficulty) {
        issues.push("consolidação não aumenta a dificuldade (sem produção/uso nem mistura com conteúdo antigo)");
      }
    }

    for (const issue of issues) err("novelty", ref, issue);

    const repeatedKeys = [...keySteps.entries()]
      .filter(([, steps]) => steps.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);
    rows.push({
      lesson,
      planLength: plan.length,
      gradedCount: graded.length,
      distinctKeys: keySteps.size,
      repeatPairs,
      transformedPairs,
      applicationCount,
      topKey: repeatedKeys[0] ? `${repeatedKeys[0][0]} × ${repeatedKeys[0][1].length}` : "—",
      issues,
    });
  }

  // ————— Relatório —————
  const flagged = rows.filter((row) => row.issues.length > 0);
  const totalRepeats = rows.reduce((sum, row) => sum + row.repeatPairs, 0);
  const totalTransformed = rows.reduce((sum, row) => sum + row.transformedPairs, 0);
  const transformationRate = totalRepeats > 0 ? Math.round((totalTransformed / totalRepeats) * 100) : 100;

  const lines = [
    "# Relatório de novidade cognitiva das lições",
    "",
    `Gerado em: ${new Date().toISOString()}`,
    "",
    "## Resumo",
    "",
    "| Indicador | Valor |",
    "|-----------|------:|",
    `| Lições analisadas | ${rows.length} |`,
    `| Lições com problemas | ${flagged.length} |`,
    `| Pares de repetição semântica | ${totalRepeats} |`,
    `| Pares com transformação cognitiva | ${totalTransformed} (${transformationRate}%) |`,
    "",
    "_Limites por lição comum: resposta exata ≤2 (underAnswerRepeatCap) · hànzì central ≤3 · frase ≤2 · intenção ≤2 · imagem ≤1 · cena ≤1. Acima do limite, cada repetição precisa de transformação cognitiva (revisões têm folga extra)._",
    "",
    "## Lições com problemas",
    "",
  ];

  if (flagged.length === 0) {
    lines.push("Nenhuma — toda repetição semântica acima dos limites traz transformação cognitiva.");
  } else {
    lines.push("| Lição | Problemas |", "|-------|-----------|");
    for (const row of flagged) {
      lines.push(`| ${row.lesson.id} | ${row.issues.join("; ")} |`);
    }
  }

  lines.push(
    "",
    "## Métricas por lição",
    "",
    "| Lição | Passos | Avaliados | Chaves distintas | Repetições | Transformadas | Aplicação real | Chave mais repetida |",
    "|-------|-------:|----------:|-----------------:|-----------:|--------------:|---------------:|---------------------|"
  );
  for (const row of rows) {
    lines.push(
      `| ${row.lesson.id} | ${row.planLength} | ${row.gradedCount} | ${row.distinctKeys} | ${row.repeatPairs} | ${row.transformedPairs} | ${row.applicationCount} | ${row.topKey} |`
    );
  }

  lines.push(
    "",
    "---",
    "",
    "_Transformações válidas: reconhecimento→produção, imagem→hànzì, hànzì→áudio, palavra→frase, frase→conversa, guiada→sem ajuda, significado→aplicação, item isolado→combinação com conteúdo antigo. Mudar só a ordem das opções, o título ou a moldura da mesma pergunta não conta._",
    ""
  );

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, lines.join("\n"), "utf8");

  if (errors.length > 0) {
    console.error(`validate:lesson-novelty encontrou ${errors.length} problema(s):`);
    for (const item of errors.slice(0, 60)) {
      console.error(`- [${item.area}] ${item.ref}: ${item.message}`);
    }
    if (errors.length > 60) console.error(`...mais ${errors.length - 60}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:lesson-novelty passou (${rows.length} lições · ${totalRepeats} repetições · ${transformationRate}% com transformação).`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
