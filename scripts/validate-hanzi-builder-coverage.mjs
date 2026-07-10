// validate:hanzi-builder-coverage
//
// Verifica a presença e a progressão dos HanziBuilders nos planos REAIS de cada
// lição (lessonRoundStepsFor). Falha se:
//  - lição de hànzì (não conceito) com 2+ caracteres montáveis tem < 2 builders;
//  - revisão de módulo com 2+ montáveis não tem builder de caractere antigo;
//  - uma composição aparece antes das suas bases terem sido introduzidas;
//  - o mesmo hànzì é montado mais de 2× na mesma lição (fora aula dedicada);
//  - uma explicação longa entra como lado de par;
//  - um builder sem guia aparece para um caractere ainda não visto.

import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const addError = (lessonId, message) => errors.push(`[${lessonId}] ${message}`);

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/;
const hasCjk = (s) => CJK_RE.test(String(s ?? ""));
const hasLatin = (s) => LATIN_RE.test(String(s ?? ""));
const glyphsOf = (s) => [...String(s ?? "")].filter((ch) => CJK_RE.test(ch));

async function main() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-hbc-"));
  try {
    const program = ts.createProgram(
      [
        "src/features/lesson/lessonTasks.ts",
        "src/data/journey.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/hanziBuilder.ts",
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
    if (program.emit().emitSkipped) {
      console.error("validate:hanzi-builder-coverage: falha ao compilar.");
      process.exit(1);
    }

    const tasks = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
    const journey = require(path.join(outDir, "src/data/journey.js"));
    const hb = require(path.join(outDir, "src/data/hanziBuilder.js"));
    const characters = require(path.join(outDir, "src/data/characters.js"));
    const { lessonRoundStepsFor } = tasks;
    const lessons = journey.ALL_LESSONS;
    const charById = characters.charById;

    // Glifo introduzido pela primeira vez em qual índice de lição.
    const introducedAt = new Map();
    lessons.forEach((lesson, index) => {
      const glyphs = new Set();
      for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
        const [type, id] = ref.split(":");
        if (type === "char" && charById[id]?.hanzi) glyphs.add(charById[id].hanzi);
        if (type === "chunk") for (const g of glyphsOf(id)) glyphs.add(g);
      }
      for (const step of lesson.steps) {
        for (const g of glyphsOf([step.hanzi, step.text, step.correctAnswer].join(""))) glyphs.add(g);
      }
      for (const g of glyphs) if (!introducedAt.has(g)) introducedAt.set(g, index);
    });

    const FOUNDATION = new Set(journey.FOUNDATION_LESSON_IDS ?? []);
    // Montável de fato NESTE ponto: tem algum builder cujas bases já foram
    // introduzidas até este índice (uma composição sem bases não conta).
    const buildableAt = (g, index) =>
      hb.buildersForCharacter(g).some((b) =>
        (b.prerequisites ?? []).every((base) => introducedAt.has(base) && introducedAt.get(base) <= index)
      );

    // Simula um aluno que fez as lições anteriores: os caracteres já vistos
    // entram como learnedChars, alinhando o gate de bases do runtime com a ordem
    // real da jornada.
    const priorCharIds = [];
    lessons.forEach((lesson, index) => {
      const plan = lessonRoundStepsFor(lesson, { silent: true, learnedChars: [...priorCharIds] });
      for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
        const [type, id] = ref.split(":");
        if (type === "char" && !priorCharIds.includes(id)) priorCharIds.push(id);
      }
      const builds = plan.filter((s) => s.kind === "hanzi_build");
      const buildChars = builds.map((s) => s.correctAnswer);
      const dedicated = lesson.steps.filter((s) => s.kind === "hanzi_build").length >= 4;

      // Caracteres montáveis que a lição toca.
      const focusGlyphs = new Set();
      for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
        const [type, id] = ref.split(":");
        if (type === "char" && charById[id]?.hanzi) focusGlyphs.add(charById[id].hanzi);
      }
      const buildableFocus = [...focusGlyphs].filter((g) => buildableAt(g, index));

      // 1. Lição de hànzì (não conceito/foundation) com 2+ montáveis → 2+ builders.
      const isConcept = FOUNDATION.has(lesson.id);
      if (lesson.skill === "hanzi" && !lesson.isReview && !isConcept && buildableFocus.length >= 2 && builds.length < 2) {
        addError(lesson.id, `lição de hànzì com ${buildableFocus.length} montáveis mas só ${builds.length} builder(s)`);
      }

      // 2. Revisão de módulo: 2+ builders quando há material simples de montagem
      //    (fragmentos/complete) ou é revisão de hànzì — e pelo menos 1 antigo.
      //    Revisões de saudação com só composição não são forçadas a 2.
      const simplyBuildable = (g) =>
        hb.buildersForCharacter(g).some((b) => (b.mode === "fragments" || b.mode === "complete") && !(b.prerequisites?.length));
      if (lesson.isReview && buildableFocus.length >= 2) {
        const simpleCount = buildableFocus.filter(simplyBuildable).length;
        const requireTwo = lesson.skill === "hanzi" || simpleCount >= 2;
        if (requireTwo && builds.length < 2) {
          addError(lesson.id, `revisão de montagem com ${buildableFocus.length} montáveis mas só ${builds.length} builder(s)`);
        }
        const hasOld = buildChars.some((c) => {
          const g = glyphsOf(c)[0];
          return g && introducedAt.has(g) && introducedAt.get(g) < index;
        });
        if (builds.length >= 1 && !hasOld) addError(lesson.id, `revisão sem builder de caractere aprendido antes`);
      }

      // 3. Composição antes das bases + 4. builder sem guia antes de ver o hànzì.
      for (const step of builds) {
        const builder = hb.getHanziBuilder(step.builderId);
        if (!builder) continue;
        for (const base of builder.prerequisites ?? []) {
          const at = introducedAt.get(base);
          if (at === undefined || at > index) {
            addError(lesson.id, `${step.builderId} (${builder.character}) usa base "${base}" ainda não introduzida`);
          }
        }
        const noGuide = builder.showGuide === false || (!builder.showGuide && builder.mode === "fragments");
        const g = glyphsOf(builder.character)[0];
        const seenBefore = g && introducedAt.has(g) && introducedAt.get(g) <= index;
        if (noGuide && !seenBefore) {
          addError(lesson.id, `${step.builderId} sem guia para "${builder.character}" nunca visto antes`);
        }
      }

      // 5. Mesmo hànzì montado > 2× (fora aula dedicada).
      if (!dedicated) {
        const counts = {};
        for (const c of buildChars) counts[c] = (counts[c] ?? 0) + 1;
        for (const [c, n] of Object.entries(counts)) {
          if (n > 2) addError(lesson.id, `hànzì "${c}" montado ${n}× na mesma lição`);
        }
      }

      // 6. Explicação longa / texto misto como lado de par.
      for (const step of plan) {
        if (step.kind !== "match_pairs" && step.kind !== "tone_pair") continue;
        for (const pair of step.pairs ?? []) {
          for (const [side, type] of [[pair.left, pair.leftType], [pair.right, pair.rightType]]) {
            const v = String(side ?? "");
            if (v.length > 40 || (type === "pt" && hasCjk(v)) || (hasCjk(v) && hasLatin(v) && v.length > 24)) {
              addError(lesson.id, `par com lado longo/explicação: "${v}"`);
            }
          }
        }
      }
    });

    if (errors.length > 0) {
      console.error(`\nvalidate:hanzi-builder-coverage encontrou ${errors.length} problema(s):`);
      for (const e of errors.slice(0, 80)) console.error(`- ${e}`);
      if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
      process.exit(1);
    }
    console.log(`OK: validate:hanzi-builder-coverage passou (${lessons.length} lições verificadas).`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

await main();
