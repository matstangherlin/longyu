// validate:perception-drills
//
// Portão dos quatro motores de percepção e sentido (src/data/perceptionDrills.ts):
// audio_discrimination, dictation, odd_one_out e spot_error.
//
// Falha se:
//  - um par mínimo não contrasta o que diz contrastar (par de tom com bases
//    diferentes, par de inicial com finais diferentes, etc.);
//  - um par mínimo usa hànzì fora do corpus, ou os dois lados são o mesmo item;
//  - um grupo "qual não pertence" tem menos de 4 opções distintas, ou o
//    intruso aparece também entre os membros do grupo;
//  - uma frase de spot_error é igual à sua versão certa, ou não explica a regra;
//  - qualquer passo gerado pelos motores não passa em validateExercise;
//  - os motores somem do plano real (regressão silenciosa de cobertura).

import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const addError = (ref, message) => errors.push(`[${ref}] ${message}`);

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()？！。，、]/g;
const cleanHanzi = (value) => String(value ?? "").replace(PUNCT_RE, "").trim();

// Cobertura mínima esperada no plano real. Não é meta de produto — é uma trava
// contra regressão: se uma mudança de orçamento de estágio apagar um motor da
// jornada inteira, o portão avisa antes de o aluno perceber.
const MIN_LESSONS_WITH_ENGINE = {
  audio_discrimination: 10,
  dictation: 10,
  odd_one_out: 8,
  spot_error: 30,
};

const PINYIN_INITIALS = [
  "zh", "ch", "sh",
  "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w",
];

function splitSyllable(toneless) {
  for (const initial of PINYIN_INITIALS) {
    if (toneless.startsWith(initial)) return { initial, final: toneless.slice(initial.length) };
  }
  return { initial: "", final: toneless };
}

function stripTone(pinyin) {
  return String(pinyin ?? "")
    .normalize("NFD")
    .replace(/[̀-̏]/g, "")
    .replace(/ü/g, "ü")
    .toLowerCase()
    .trim();
}

function checkMinimalPairs(drills, charByHanzi) {
  const seen = new Set();
  for (const drill of drills) {
    const ref = drill.id;
    if (seen.has(ref)) addError(ref, "id de par mínimo duplicado");
    seen.add(ref);

    for (const side of [drill.a, drill.b]) {
      if (!side?.hanzi || !side?.pinyin || !side?.meaningPt) {
        addError(ref, "lado do par sem hànzì, pinyin ou significado");
        continue;
      }
      if (!charByHanzi.has(side.hanzi)) {
        addError(ref, `hànzì "${side.hanzi}" não está no corpus de caracteres`);
      }
    }
    if (drill.a?.hanzi === drill.b?.hanzi) {
      addError(ref, "os dois lados são o mesmo caractere — não há contraste");
    }
    if (!drill.contrastLabelPt?.trim()) addError(ref, "sem rótulo de contraste");
    if (!drill.notePt?.trim()) addError(ref, "sem nota explicando a armadilha");

    const a = stripTone(drill.a?.pinyin);
    const b = stripTone(drill.b?.pinyin);
    if (drill.contrast === "tone") {
      // Contraste de tom: a sílaba sem tom precisa ser exatamente a mesma.
      if (a !== b) addError(ref, `contraste "tone" mas as bases diferem (${a} × ${b})`);
      if (drill.a?.pinyin === drill.b?.pinyin) addError(ref, "contraste de tom com pinyin idêntico");
    } else if (drill.contrast === "initial") {
      const sa = splitSyllable(a);
      const sb = splitSyllable(b);
      if (sa.final !== sb.final) addError(ref, `contraste "initial" mas as finais diferem (${sa.final} × ${sb.final})`);
      if (sa.initial === sb.initial) addError(ref, `contraste "initial" mas a inicial é a mesma (${sa.initial})`);
    } else if (drill.contrast === "final") {
      const sa = splitSyllable(a);
      const sb = splitSyllable(b);
      if (sa.initial !== sb.initial) addError(ref, `contraste "final" mas as iniciais diferem (${sa.initial} × ${sb.initial})`);
      if (sa.final === sb.final) addError(ref, `contraste "final" mas a final é a mesma (${sa.final})`);
    } else {
      addError(ref, `contraste desconhecido "${drill.contrast}"`);
    }
  }
}

function checkOddOneOutSets(sets) {
  for (const set of sets) {
    const ref = set.id;
    if (set.members.length !== 3) addError(ref, `grupo com ${set.members.length} membros (esperado 3)`);
    const options = [...set.members.map((member) => member.hanzi), set.intruder.hanzi];
    if (new Set(options).size !== options.length) addError(ref, "opção repetida no grupo");
    if (set.members.some((member) => member.hanzi === set.intruder.hanzi)) {
      addError(ref, "o intruso também está entre os membros do grupo");
    }
    if (!set.groupLabelPt?.trim() || !set.intruderGroupLabelPt?.trim()) {
      addError(ref, "grupo sem rótulo em português");
    }
    if (set.groupLabelPt === set.intruderGroupLabelPt) {
      addError(ref, "intruso vem do mesmo grupo — a pergunta não tem resposta");
    }
  }
}

function checkSpotErrorDrills(drills, corpusGlyphs) {
  const seen = new Set();
  for (const drill of drills) {
    const ref = drill.id;
    if (seen.has(ref)) addError(ref, "id de spot_error duplicado");
    seen.add(ref);
    if (!drill.intentPt?.trim()) addError(ref, "sem intenção em português");
    if (!drill.whyPt?.trim()) addError(ref, "sem a regra explicada");
    if (!drill.right?.hanzi?.trim() || !drill.wrong?.hanzi?.trim()) {
      addError(ref, "frase certa ou errada vazia");
      continue;
    }
    if (cleanHanzi(drill.right.hanzi) === cleanHanzi(drill.wrong.hanzi)) {
      addError(ref, "frase certa e errada são iguais");
    }
    if (!drill.right.pinyin?.trim() || !drill.wrong.pinyin?.trim()) {
      addError(ref, "frase sem pinyin");
    }
    // Toda a frase precisa vir do corpus: spot_error cobra estrutura, nunca
    // vocabulário que o aluno nunca viu.
    for (const text of [drill.right.hanzi, drill.wrong.hanzi]) {
      for (const glyph of cleanHanzi(text)) {
        if (!CJK_RE.test(glyph)) continue;
        if (!corpusGlyphs.has(glyph)) addError(ref, `hànzì "${glyph}" fora do corpus`);
      }
    }
  }
}

async function main() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-perception-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/perceptionDrills.ts",
        "src/features/lesson/lessonTasks.ts",
        "src/features/lesson/exerciseValidation.ts",
        "src/data/journey.ts",
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
      console.error("validate:perception-drills: falha ao compilar o grafo TypeScript.");
      process.exit(1);
    }

    const load = (rel) => require(path.join(outDir, rel));
    const drills = load("src/data/perceptionDrills.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { VOCABULARY } = load("src/data/vocabulary.js");
    const { CHUNKS } = load("src/data/chunks.js");

    const charByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
    const corpusGlyphs = new Set();
    for (const char of CHARACTERS) corpusGlyphs.add(char.hanzi);
    for (const source of [...VOCABULARY, ...CHUNKS]) {
      for (const glyph of cleanHanzi(source.hanzi)) corpusGlyphs.add(glyph);
    }

    checkMinimalPairs(drills.MINIMAL_PAIRS, charByHanzi);
    checkSpotErrorDrills(drills.SPOT_ERROR_DRILLS, corpusGlyphs);
    // Grupos são derivados: audita o conjunto máximo (todo o corpus visível).
    checkOddOneOutSets(drills.oddOneOutSetsFor(corpusGlyphs));

    // Passo a passo do plano real: nenhum exercício destes motores pode chegar
    // à tela reprovado pelo validador de renderização.
    const engineKinds = Object.keys(MIN_LESSONS_WITH_ENGINE);
    const lessonsWithEngine = Object.fromEntries(engineKinds.map((kind) => [kind, 0]));
    let auditedSteps = 0;
    for (const lesson of ALL_LESSONS) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      const kindsHere = new Set();
      for (const step of plan) {
        if (!engineKinds.includes(step.kind)) continue;
        kindsHere.add(step.kind);
        auditedSteps += 1;
        const validation = validateExercise(step);
        if (!validation.valid) {
          addError(lesson.id, `${step.kind}: ${validation.errors.join("; ")}`);
        }
      }
      for (const kind of kindsHere) lessonsWithEngine[kind] += 1;
    }

    for (const [kind, minimum] of Object.entries(MIN_LESSONS_WITH_ENGINE)) {
      if (lessonsWithEngine[kind] < minimum) {
        addError(
          "cobertura",
          `${kind} aparece em só ${lessonsWithEngine[kind]} lição(ões) — mínimo ${minimum}`
        );
      }
    }

    if (errors.length > 0) {
      console.error(`\nvalidate:perception-drills encontrou ${errors.length} problema(s):`);
      for (const error of errors.slice(0, 60)) console.error(`- ${error}`);
      if (errors.length > 60) console.error(`...mais ${errors.length - 60}.`);
      process.exit(1);
    }

    const coverage = engineKinds.map((kind) => `${kind} ${lessonsWithEngine[kind]}`).join(" · ");
    console.log(
      `OK: validate:perception-drills passou (${drills.MINIMAL_PAIRS.length} pares mínimos · ` +
        `${drills.SPOT_ERROR_DRILLS.length} frases de estrutura · ${auditedSteps} passos auditados no plano real).`
    );
    console.log(`     cobertura por lição: ${coverage}`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

await main();
