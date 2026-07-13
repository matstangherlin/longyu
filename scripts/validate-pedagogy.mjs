import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

// Auditoria pedagógica do Longyu (QA):
// 1. nenhuma pergunta sem resposta correta;
// 2. 谢谢 sempre tem "Obrigado(a)" como resposta correta (quando a resposta é em pt);
// 3. pinyin não vazio; 4. hànzì não vazio;
// 5. opções sem duplicatas;
// 6. microtextos referenciam itens existentes;
// 7. teste de módulo com no mínimo 10 questões válidas;
// 8. errar item essencial bloqueia o pulo de módulo.
//
// Mesmo padrão dos validadores existentes: compila o grafo TS para um diretório
// temporário e executa via require.

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-pedagogy-"));

const errors = [];
const warnings = [];
const err = (area, ref, message) => errors.push({ area, ref, message });
const warn = (area, ref, message) => warnings.push({ area, ref, message });

const CJK_RE = /[㐀-鿿豈-﫿]/;
const isCjk = (value) => CJK_RE.test(String(value ?? ""));
const norm = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\s。，．.!！?？·]/g, "");
const empty = (value) => String(value ?? "").trim().length === 0;

try {
  const program = ts.createProgram(
    [
      "src/features/challenge/examBuilder.ts",
      "src/data/journey.ts",
      "src/data/microtexts.ts",
      "src/data/characters.ts",
      "src/data/chunks.ts",
      "src/data/vocabulary.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo de dados para a auditoria.");
    process.exitCode = 1;
    throw new Error("emitSkipped");
  }

  const load = (rel) => require(path.join(outDir, rel));
  const { JOURNEY } = load("src/data/journey.js");
  const { MICROTEXTS } = load("src/data/microtexts.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const { VOCABULARY } = load("src/data/vocabulary.js");
  const { buildModuleSkipTest, gradeModuleSkipTest, EXAM_MIN_QUESTIONS, MODULE_ESSENTIAL_ITEM_REFS } = load(
    "src/features/challenge/examBuilder.js"
  );

  const charIds = new Set(CHARACTERS.map((c) => c.id));
  const chunkIds = new Set(CHUNKS.map((c) => c.id));
  const vocabIds = new Set(VOCABULARY.map((v) => v.id));
  const unitIds = new Set(JOURNEY.flatMap((phase) => phase.units.map((unit) => unit.id)));

  for (const [unitId, refs] of Object.entries(MODULE_ESSENTIAL_ITEM_REFS ?? {})) {
    if (!unitIds.has(unitId)) err("exame", unitId, "lista essencial aponta para módulo inexistente");
    if (!Array.isArray(refs) || refs.length === 0) err("exame", unitId, "lista essencial vazia");
    for (const ref of refs ?? []) {
      const [kind, id] = String(ref).split(":");
      const ok = (kind === "char" && charIds.has(id)) || (kind === "chunk" && chunkIds.has(id));
      if (!ok) err("exame", unitId, `item essencial inexistente: ${ref}`);
    }
  }

  // --------------------------------------------------------------------------
  // Corpus: hànzì e pinyin não vazios
  // --------------------------------------------------------------------------
  for (const c of CHARACTERS) {
    if (empty(c.hanzi)) err("corpus", `char:${c.id}`, "hànzì vazio");
    if (empty(c.pinyin)) err("corpus", `char:${c.id}`, "pinyin vazio");
  }
  for (const c of CHUNKS) {
    if (empty(c.hanzi)) err("corpus", `chunk:${c.id}`, "hànzì vazio");
    if (empty(c.pinyin)) err("corpus", `chunk:${c.id}`, "pinyin vazio");
    if (empty(c.meaningPt)) err("corpus", `chunk:${c.id}`, "meaningPt vazio");
    if (c.hanzi === "谢谢" && !/obrigad/i.test(c.meaningPt)) {
      err("xiexie", `chunk:${c.id}`, `谢谢 sem "Obrigado(a)" no significado: "${c.meaningPt}"`);
    }
  }
  for (const v of VOCABULARY) {
    if (empty(v.hanzi)) err("corpus", `vocab:${v.id}`, "hànzì vazio");
    if (empty(v.pinyin)) err("corpus", `vocab:${v.id}`, "pinyin vazio");
    if (empty(v.meaningPt)) err("corpus", `vocab:${v.id}`, "meaningPt vazio");
    if (v.hanzi === "谢谢" && !/obrigad/i.test(v.meaningPt)) {
      err("xiexie", `vocab:${v.id}`, `谢谢 sem "Obrigado(a)": "${v.meaningPt}"`);
    }
  }

  // --------------------------------------------------------------------------
  // Microtextos: linhas íntegras + itens exigidos existem
  // --------------------------------------------------------------------------
  for (const text of MICROTEXTS) {
    if (!Array.isArray(text.lines) || text.lines.length === 0) {
      err("microtext", text.id, "sem linhas");
      continue;
    }
    text.lines.forEach((line, i) => {
      if (empty(line.hanzi)) err("microtext", `${text.id}#${i}`, "linha com hànzì vazio");
      if (empty(line.pinyin)) err("microtext", `${text.id}#${i}`, "linha com pinyin vazio");
      if (empty(line.pt)) err("microtext", `${text.id}#${i}`, "linha com pt vazio");
    });
    for (const ref of text.requiredItems ?? []) {
      const [kind, id] = String(ref).split(":");
      const ok =
        (kind === "char" && charIds.has(id)) ||
        (kind === "chunk" && chunkIds.has(id)) ||
        (kind === "vocab" && vocabIds.has(id));
      if (!ok) err("microtext", text.id, `requiredItem inexistente: ${ref}`);
    }
  }

  // --------------------------------------------------------------------------
  // Lições: toda pergunta tem resposta correta, sem opções duplicadas
  // --------------------------------------------------------------------------
  const checkOptions = (ref, options, answer, { requireAnswer = true } = {}) => {
    const list = (options ?? []).map(norm);
    if (list.length < 2) err("licao", ref, `menos de 2 opções (${list.length})`);
    const seen = new Set();
    for (const option of list) {
      if (seen.has(option)) err("licao", ref, `opção duplicada: "${option}"`);
      seen.add(option);
    }
    if (requireAnswer) {
      if (empty(answer)) err("licao", ref, "sem resposta correta definida");
      else if (!list.includes(norm(answer))) {
        err("licao", ref, `resposta correta "${answer}" fora das opções`);
      }
    }
  };

  const checkXiexie = (ref, stimulus, answer) => {
    if (norm(stimulus) !== norm("谢谢")) return;
    if (isCjk(answer)) return; // resposta em hànzì (ex.: "ouça e selecione 谢谢") não se aplica
    if (!/obrigad/i.test(String(answer))) {
      err("xiexie", ref, `pergunta sobre 谢谢 com resposta "${answer}" (esperado "Obrigado(a)")`);
    }
  };

  let gradedSteps = 0;
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      for (const lesson of unit.lessons) {
        lesson.steps.forEach((step, index) => {
          const ref = `${lesson.id}#${index}(${step.kind})`;
          const checkText = (field) => {
            if (step[field] !== undefined && empty(step[field])) err("licao", ref, `${field} vazio`);
          };
          checkText("pinyin");
          checkText("hanzi");
          checkText("text");
          checkText("audioText");

          switch (step.kind) {
            case "comprehend": {
              gradedSteps += 1;
              checkOptions(ref, step.options, step.answer);
              checkXiexie(ref, step.hanzi, step.answer);
              if (empty(step.hanzi)) err("licao", ref, "comprehend sem hànzì");
              break;
            }
            case "listen_select": {
              gradedSteps += 1;
              const answer = step.correctAnswer ?? step.answer ?? step.audioText ?? "";
              const options = [...(step.options ?? []), ...(step.distractors ?? [])];
              checkOptions(ref, options, answer);
              checkXiexie(ref, step.audioText ?? "", answer);
              break;
            }
            case "dialogue_choice": {
              gradedSteps += 1;
              checkOptions(ref, step.options, step.correctAnswer ?? step.answer);
              break;
            }
            case "conversation_scene": {
              gradedSteps += 1;
              const checkpoint = step.checkpoint ?? {};
              const answer = checkpoint.correctAnswer ?? step.correctAnswer;
              const options = checkpoint.options ?? step.options;
              if (!answer) err("licao", ref, "conversation_scene sem resposta correta");
              if (checkpoint.type === "order_reply") {
                if (!options || options.length < 2) err("licao", ref, "conversation_scene order_reply sem peças");
              } else {
                checkOptions(ref, options, answer);
              }
              if (!step.sceneId) err("licao", ref, "conversation_scene sem sceneId");
              if (!step.lines?.length) err("licao", ref, "conversation_scene sem falas");
              break;
            }
            case "image_choice": {
              gradedSteps += 1;
              const imagePick =
                step.imageChoiceMode === "choose_image" || step.imageChoiceMode === "listen_and_choose_image";
              if (imagePick) {
                checkOptions(ref, step.imageOptions, step.correctImageId);
              } else {
                checkOptions(ref, step.options, step.correctAnswer);
              }
              if (!step.imageId && !step.iconId) err("licao", ref, "image_choice sem imageId");
              if (!step.imageChoiceMode) err("licao", ref, "image_choice sem modo");
              break;
            }
            case "fill_blank": {
              gradedSteps += 1;
              // A UI (StepFillBlank) usa step.bank como alternativas da lacuna.
              checkOptions(ref, step.bank ?? step.options, step.blankAnswer ?? step.correctAnswer);
              break;
            }
            case "produce": {
              gradedSteps += 1;
              const target = step.target ?? [];
              const bank = [...(step.bank ?? [])];
              if (target.length === 0) err("licao", ref, "produce sem target");
              for (const piece of target) {
                const at = bank.findIndex((b) => norm(b) === norm(piece));
                if (at < 0) err("licao", ref, `peça do alvo fora do banco: "${piece}"`);
                else bank.splice(at, 1);
              }
              break;
            }
            case "sentence_build":
            case "translation_build":
            case "hanzi_build": {
              gradedSteps += 1;
              const parts = step.targetParts ?? [];
              if (parts.length === 0) err("licao", ref, `${step.kind} sem targetParts`);
              if (parts.some((p) => empty(p))) err("licao", ref, "peça vazia em targetParts");
              break;
            }
            case "match_pairs":
            case "tone_pair": {
              gradedSteps += 1;
              const pairs = step.pairs ?? [];
              if (pairs.length < 2) err("licao", ref, `${step.kind} com menos de 2 pares`);
              const lefts = new Set();
              const rights = new Set();
              pairs.forEach((pair, i) => {
                if (empty(pair.left) || empty(pair.right)) err("licao", `${ref}#par${i}`, "par com lado vazio");
                const l = norm(pair.left);
                const r = norm(pair.right);
                if (lefts.has(l)) err("licao", ref, `lado esquerdo duplicado: "${pair.left}"`);
                if (rights.has(r)) err("licao", ref, `lado direito duplicado: "${pair.right}"`);
                lefts.add(l);
                rights.add(r);
                if (norm(pair.left) === norm("谢谢") && !isCjk(pair.right) && !/obrigad|valeu/i.test(pair.right)) {
                  err("xiexie", ref, `par 谢谢 → "${pair.right}" (esperado "Obrigado(a)")`);
                }
              });
              break;
            }
            case "write": {
              if (empty(step.answer)) err("licao", ref, "write sem answer de referência");
              break;
            }
            case "recognize":
            case "decompose": {
              if (!step.charId || !charIds.has(step.charId)) {
                err("licao", ref, `charId inexistente: ${step.charId}`);
              }
              break;
            }
            case "flashcard": {
              if (!step.chunkId || !chunkIds.has(step.chunkId)) {
                err("licao", ref, `chunkId inexistente: ${step.chunkId}`);
              }
              break;
            }
            case "tone": {
              if (empty(step.hanzi) || empty(step.pinyin)) err("licao", ref, "tone sem hànzì/pinyin");
              if (![1, 2, 3, 4].includes(step.tone)) err("licao", ref, `tom inválido: ${step.tone}`);
              break;
            }
            case "microread": {
              const lines = step.lines ?? [];
              if (lines.length === 0) err("licao", ref, "microread sem linhas");
              lines.forEach((line, i) => {
                if (empty(line.hanzi) || empty(line.pinyin)) {
                  err("licao", `${ref}#linha${i}`, "linha com hànzì/pinyin vazio");
                }
              });
              break;
            }
            case "hanzi_evolution": {
              for (const id of step.charIds ?? []) {
                if (!charIds.has(id)) err("licao", ref, `charId inexistente: ${id}`);
              }
              break;
            }
            default:
              break; // intro, listen etc.: só os campos genéricos acima
          }
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Testes de módulo: ≥10 questões válidas + essencial errado bloqueia o pulo
  // --------------------------------------------------------------------------
  const validateExamQuestionShape = (unitId, q) => {
    const ref = `${unitId}/${q.id}`;
    if (q.format === "choice" || q.format === "cloze") {
      const list = (q.options ?? []).map(norm);
      if (list.length < 2) err("exame", ref, "menos de 2 opções");
      if (new Set(list).size !== list.length) err("exame", ref, "opções duplicadas");
      if (empty(q.answer)) err("exame", ref, "sem resposta");
      else if (!list.includes(norm(q.answer))) err("exame", ref, `resposta "${q.answer}" fora das opções`);
      if (q.kind === "significado" && norm(q.display?.hanzi) === norm("谢谢") && !isCjk(q.answer) && !/obrigad/i.test(q.answer)) {
        err("xiexie", ref, `exame 谢谢 com resposta "${q.answer}"`);
      }
    } else if (q.format === "match") {
      const pairs = q.pairs ?? [];
      if (pairs.length < 2) err("exame", ref, "match com menos de 2 pares");
      const lefts = pairs.map((p) => norm(p.left));
      const rights = pairs.map((p) => norm(p.right));
      if (new Set(lefts).size !== lefts.length) err("exame", ref, "lados esquerdos duplicados");
      if (new Set(rights).size !== rights.length) err("exame", ref, "lados direitos duplicados");
    } else if (q.format === "order") {
      if (!Array.isArray(q.pieces) || q.pieces.length < 2) err("exame", ref, "order com menos de 2 peças");
      if (empty(q.answer)) err("exame", ref, "order sem resposta");
      else if (norm(q.pieces.join("")) !== norm(q.answer)) {
        err("exame", ref, `peças não formam a resposta: [${q.pieces.join("|")}] ≠ "${q.answer}"`);
      }
    }
  };

  let unitsAudited = 0;
  let examsOk = 0;
  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      unitsAudited += 1;
      // 3 execuções por módulo: o gerador embaralha, a garantia precisa valer sempre.
      for (let run = 0; run < 3; run += 1) {
        const exam = buildModuleSkipTest(unit);
        if (exam.status !== "ok") {
          err("exame", unit.id, `teste indisponível (válidas: ${exam.validCount}) — mínimo ${EXAM_MIN_QUESTIONS}`);
          break;
        }
        if (exam.questions.length < EXAM_MIN_QUESTIONS) {
          err("exame", unit.id, `apenas ${exam.questions.length} questões (mínimo ${EXAM_MIN_QUESTIONS})`);
        }
        for (const q of exam.questions) validateExamQuestionShape(unit.id, q);

        const essentials = exam.questions.filter((q) => q.isEssential);
        if (essentials.length === 0) {
          err("exame", unit.id, "nenhuma questão essencial no teste");
          continue;
        }
        const allIds = new Set(exam.questions.map((q) => q.id));
        const perfect = gradeModuleSkipTest(exam.questions, allIds);
        if (!perfect.passed) err("exame", unit.id, "gabarito perfeito não passa no teste");
        const missingEssential = new Set(allIds);
        missingEssential.delete(essentials[0].id);
        const blocked = gradeModuleSkipTest(exam.questions, missingEssential);
        if (blocked.passed) {
          err("exame", unit.id, "errar item essencial NÃO bloqueou o pulo de módulo");
        }
        if (run === 0) examsOk += 1;
      }
    }
  }

  console.log(
    `Pedagogia: ${gradedSteps} passos avaliáveis auditados, ${unitsAudited} módulos, ` +
      `${examsOk} testes de pulo gerados (3 execuções cada), ${MICROTEXTS.length} microtextos.`
  );
  for (const w of warnings) console.warn(`AVISO [${w.area}] ${w.ref}: ${w.message}`);
  if (errors.length > 0) {
    console.error(`\nPedagogia inválida: ${errors.length} erro(s).`);
    for (const e of errors.slice(0, 80)) console.error(`- [${e.area}] ${e.ref}: ${e.message}`);
    if (errors.length > 80) console.error(`...mais ${errors.length - 80} erro(s).`);
    process.exitCode = 1;
  } else {
    console.log(`\nOK: pedagogia validada sem erros (${warnings.length} aviso(s)).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
