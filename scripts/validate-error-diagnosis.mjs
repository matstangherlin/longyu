/**
 * validate:error-diagnosis — portão da onda pedagógica 4.
 *
 * As ondas 1–3 provaram VARIEDADE (o conteúdo volta por muitos caminhos) e
 * PRODUÇÃO (o aluno constrói sem apoio). Esta prova PONTARIA: que o app sabe
 * por que o aluno errou e usa isso para escolher o caminho de volta.
 *
 *  1. a taxonomia é total — toda causa tem rótulo, frase para o aluno,
 *     modalidade de remediação, eixo e variante. Causa sem uma dessas pontas
 *     é causa que o app diagnostica e não sabe usar;
 *  2. o diagnóstico ACERTA em casos curados: mesma resposta errada em
 *     exercícios diferentes, e respostas erradas diferentes no mesmo
 *     exercício, precisam separar-se em causas distintas. É o teste que
 *     falharia no estado anterior, em que o motivo saía do formato da tela;
 *  3. o diagnóstico DISCRIMINA de verdade — se quase tudo cair em uma causa
 *     só, ou se "não classificado" dominar, o motor não está diagnosticando,
 *     está rotulando;
 *  4. sem evidência não há rota dirigida: histórico curto, erros espalhados ou
 *     empate técnico mantêm o rodízio A/B/C. Fingir diagnóstico é pior que
 *     rodízio cego;
 *  5. com evidência, a rota MUDA o plano de verdade — perfil de tom e perfil
 *     de ordem não podem gerar a mesma lição;
 *  6. o rodízio original é preservado bit a bit quando não há perfil (a onda 1
 *     depende disso);
 *  7. a novidade entre tentativas não pode depender da variante: como a rota
 *     por fraqueza faz a variante repetir, refazer a lição precisa continuar
 *     trocando a frase de transferência;
 *  8. a remediação dirigida pela causa nunca produz correção quebrada — se o
 *     formato indicado não tiver dado para existir, cai no formato pelo tipo.
 *
 * Gera reports/error-diagnosis-report.md.
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
const reportPath = path.join(rootDir, "reports/error-diagnosis-report.md");
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

/** Nenhuma causa isolada pode concentrar mais que isto nos casos curados. */
const MAX_SINGLE_CAUSE_SHARE = 0.4;
/** "Não classificado" acima disto significa que o motor não está lendo o erro. */
const MAX_UNCLASSIFIED_SHARE = 0.1;
/** Fração mínima das lições cujo plano muda quando a fraqueza muda. */
const MIN_ROUTED_LESSON_SHARE = 0.6;

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-error-diagnosis-"));
try {
  const program = ts.createProgram(
    [
      "src/data/errorDiagnosis.ts",
      "src/lib/weaknessProfile.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/immediateRemediation.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
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
  if (emit.emitSkipped) throw new Error("falha ao compilar o grafo de diagnóstico TypeScript");

  const load = (relative) => require(path.join(outDir, relative));
  const {
    diagnoseError,
    ERROR_CAUSE_ORDER,
    ERROR_CAUSE_LABELS,
    ERROR_CAUSE_FEEDBACK,
    REMEDIATION_BY_CAUSE,
    PRACTICE_VARIANT_BY_CAUSE,
    AXIS_BY_CAUSE,
    isUnexplainedProduction,
    isWellFormedAttempt,
  } = load("src/data/errorDiagnosis.js");
  const {
    weaknessProfile,
    practiceVariantForAttempt,
    rotationVariantForAttempt,
    variantSeedOffsetForAttempt,
  } = load("src/lib/weaknessProfile.js");
  const { ALL_LESSONS, lessonRoundStepsFor } = (() => {
    const journey = load("src/data/journey.js");
    const tasks = load("src/features/lesson/lessonTasks.js");
    return { ALL_LESSONS: journey.ALL_LESSONS, lessonRoundStepsFor: tasks.lessonRoundStepsFor };
  })();
  const { buildImmediateRemediationExercise } = load("src/features/lesson/immediateRemediation.js");

  // ————————————————————————————————————————————————————————————
  // 1. A taxonomia é total
  // ————————————————————————————————————————————————————————————
  for (const cause of ERROR_CAUSE_ORDER) {
    assert(Boolean(ERROR_CAUSE_LABELS[cause]), `causa sem rótulo: ${cause}`);
    assert(Boolean(ERROR_CAUSE_FEEDBACK[cause]), `causa sem frase para o aluno: ${cause}`);
    assert(Boolean(REMEDIATION_BY_CAUSE[cause]), `causa sem modalidade de remediação: ${cause}`);
    assert(Boolean(PRACTICE_VARIANT_BY_CAUSE[cause]), `causa sem variante alvo: ${cause}`);
    assert(Boolean(AXIS_BY_CAUSE[cause]), `causa sem eixo: ${cause}`);
    assert(
      ERROR_CAUSE_FEEDBACK[cause].length >= 20,
      `frase para o aluno curta demais para explicar a causa: ${cause}`
    );
  }
  // A frase da causa vira o `mistakeReason` do erro, e a revisão roteia por
  // PALAVRA-CHAVE nesse texto (reviewExerciseBuilder.mistakeReviewFocus). Então
  // a frase não é só cópia: quem escrever "tom" numa causa que não é de tom
  // manda o aluno para o treino errado. Este bloco trava esse acoplamento.
  const FOCUS_KEYWORDS = {
    tom: ["tone"],
    pinyin: ["pinyin_spelling"],
    "áudio": ["listening"],
    "hànzì": ["homophone", "grapheme"],
  };
  for (const cause of ERROR_CAUSE_ORDER) {
    const text = ERROR_CAUSE_FEEDBACK[cause].toLocaleLowerCase("pt-BR");
    for (const [keyword, allowed] of Object.entries(FOCUS_KEYWORDS)) {
      if (!text.includes(keyword)) continue;
      assert(
        allowed.includes(cause),
        `${cause}: a frase para o aluno contém "${keyword}", que roteia a revisão para outro treino`
      );
    }
  }
  // E o caminho feliz: as causas que DEVEM roteirar precisam mesmo dizer a palavra.
  for (const [keyword, causes] of Object.entries(FOCUS_KEYWORDS)) {
    for (const cause of causes) {
      if (cause === "grapheme" || cause === "homophone") continue;
      assert(
        ERROR_CAUSE_FEEDBACK[cause].toLocaleLowerCase("pt-BR").includes(keyword),
        `${cause}: a frase para o aluno não diz "${keyword}", então a revisão não roteia para o treino certo`
      );
    }
  }

  // A variante "A" é o percurso autoral da 1ª vez — nunca pode ser alvo de rota.
  for (const cause of ERROR_CAUSE_ORDER) {
    assert(
      PRACTICE_VARIANT_BY_CAUSE[cause] === "B" || PRACTICE_VARIANT_BY_CAUSE[cause] === "C",
      `${cause}: rota aponta para "A", que é o percurso da primeira vez`
    );
  }

  // ————————————————————————————————————————————————————————————
  // 2. Casos curados: o diagnóstico acerta a causa
  //
  // Os dois primeiros pares são o teste central da onda: o MESMO exercício com
  // respostas erradas diferentes tem que dar causas diferentes. No estado
  // anterior os dois casos davam o mesmo motivo, porque o motivo vinha da tela.
  // ————————————————————————————————————————————————————————————
  const CASES = [
    // Mesmo exercício, causas diferentes — o coração da onda 4.
    {
      name: "produção livre com as peças certas fora de ordem",
      input: { kind: "free_production", expected: "我要茶", given: "我茶要", hasCommunicativeGoal: true },
      cause: "word_order",
    },
    {
      name: "produção livre com o item errado no buraco",
      input: { kind: "free_production", expected: "我要茶", given: "我要水", hasCommunicativeGoal: true },
      cause: "lexical_choice",
    },
    // Som: tom separável da sílaba.
    { name: "pinyin de mesma base, tom trocado", input: { kind: "produce", expected: "mǎi", given: "mài" }, cause: "tone" },
    {
      name: "pinyin de mesma base, 3º × 4º tom",
      input: { kind: "produce", expected: "shuǐ", given: "shuì" },
      cause: "tone",
    },
    {
      name: "grafia do pinyin fora de tarefa de áudio",
      input: { kind: "produce", expected: "péng", given: "pén" },
      cause: "pinyin_spelling",
    },
    {
      name: "ditado com desvio sem padrão de forma",
      input: { kind: "dictation", expected: "谢谢", given: "你好", audioOnly: true },
      cause: "listening",
    },
    { name: "pergunta de tom", input: { kind: "tone", expected: "3º tom", given: "2º tom" }, cause: "tone" },
    // Estrutura.
    {
      name: "montagem de frase com peças invertidas",
      input: { kind: "sentence_build", expected: "我是巴西人", given: "我巴西人是" },
      cause: "word_order",
    },
    {
      name: "tradução montada fora de ordem",
      input: { kind: "translation_build", expected: "eu quero chá", given: "chá quero eu" },
      cause: "word_order",
    },
    // Classes fechadas: partícula e classificador têm causa própria.
    {
      name: "partícula 了 omitida",
      input: { kind: "produce", expected: "我回家了", given: "我回家" },
      cause: "particle",
    },
    {
      name: "partícula 吗 sobrando",
      input: { kind: "produce", expected: "你好", given: "你好吗" },
      cause: "particle",
    },
    {
      name: "classificador 个 omitido",
      input: { kind: "produce", expected: "我有一个朋友", given: "我有一朋友" },
      cause: "classifier",
    },
    {
      name: "peça de conteúdo faltando",
      input: { kind: "produce", expected: "我今天去银行", given: "我去银行" },
      cause: "omission",
    },
    {
      name: "peça de conteúdo sobrando",
      input: { kind: "produce", expected: "我去银行", given: "我今天去银行" },
      cause: "intrusion",
    },
    // Forma escrita.
    {
      name: "hànzì que divide componente",
      input: { kind: "recognize", expected: "木", given: "林" },
      cause: "grapheme",
    },
    // Sentido e uso.
    {
      name: "significado trocado em resposta em português",
      input: { kind: "comprehend", expected: "obrigado", given: "de nada" },
      cause: "meaning",
    },
    {
      name: "frase válida do corpus que não cumpre o objetivo",
      input: { kind: "transfer_task", expected: "我要茶", given: "谢谢", hasCommunicativeGoal: true },
      cause: "communicative",
    },
    // Sem sinal.
    { name: "sem resposta", input: { kind: "produce", expected: "我要茶", given: "" }, cause: "no_answer" },
    {
      name: "placeholder de resposta ausente",
      input: { kind: "produce", expected: "我要茶", given: "Resposta incorreta" },
      cause: "no_answer",
    },
  ];

  const observed = new Map();
  const caseRows = [];
  for (const testCase of CASES) {
    const result = diagnoseError(testCase.input);
    assert(
      result.cause === testCase.cause,
      `${testCase.name}: esperava causa "${testCase.cause}", veio "${result.cause}"`
    );
    assert(
      result.axis === AXIS_BY_CAUSE[result.cause],
      `${testCase.name}: eixo incoerente com a causa`
    );
    assert(
      result.remediation === REMEDIATION_BY_CAUSE[result.cause],
      `${testCase.name}: modalidade incoerente com a causa`
    );
    observed.set(result.cause, (observed.get(result.cause) ?? 0) + 1);
    caseRows.push({
      name: testCase.name,
      expected: testCase.input.expected,
      given: testCase.input.given || "(vazio)",
      cause: result.cause,
      confidence: result.confidence,
    });
  }

  // O mesmo enunciado com erros diferentes precisa render causas diferentes.
  const sameExercise = new Set(
    ["我茶要", "我要水", "我要"].map(
      (given) => diagnoseError({ kind: "free_production", expected: "我要茶", given }).cause
    )
  );
  assert(
    sameExercise.size === 3,
    `o mesmo exercício deu ${sameExercise.size} causa(s) para 3 erros diferentes — o diagnóstico está lendo o formato, não a resposta`
  );

  // ————————————————————————————————————————————————————————————
  // 3. O diagnóstico discrimina
  // ————————————————————————————————————————————————————————————
  const biggestShare = Math.max(...observed.values()) / CASES.length;
  assert(
    biggestShare <= MAX_SINGLE_CAUSE_SHARE,
    `uma única causa concentrou ${(biggestShare * 100).toFixed(0)}% dos casos — o motor está rotulando, não diagnosticando`
  );
  const unclassifiedShare = (observed.get("unclassified") ?? 0) / CASES.length;
  assert(
    unclassifiedShare <= MAX_UNCLASSIFIED_SHARE,
    `"não classificado" ficou com ${(unclassifiedShare * 100).toFixed(0)}% dos casos`
  );

  // ————————————————————————————————————————————————————————————
  // 4. Sem evidência não há rota dirigida
  // ————————————————————————————————————————————————————————————
  const now = Date.now();
  const errorsOf = (cause, count, extra = {}) =>
    Array.from({ length: count }, (_, index) => ({
      diagnosis: cause,
      timestamp: now - index * 60_000,
      wrongCount: 1,
      ...extra,
    }));

  assert(weaknessProfile([], now).dominant === undefined, "perfil vazio não pode ter causa dominante");
  assert(
    weaknessProfile(errorsOf("tone", 2), now).dominant === undefined,
    "duas ocorrências não podem bastar para dirigir a rota do aluno"
  );
  assert(
    weaknessProfile(
      [...errorsOf("tone", 4), ...errorsOf("word_order", 4)],
      now
    ).dominant === undefined,
    "empate técnico entre duas causas não pode dirigir a rota"
  );
  // Registros anteriores à onda 4 não têm causa: não podem virar diagnóstico.
  assert(
    weaknessProfile([{ timestamp: now }, { timestamp: now }, { timestamp: now }, { timestamp: now }], now)
      .dominant === undefined,
    "erros sem diagnóstico não podem gerar causa dominante"
  );
  // Evidência velha decai: o perfil precisa esquecer.
  const staleProfile = weaknessProfile(
    errorsOf("tone", 6, { timestamp: now - 90 * 24 * 60 * 60 * 1000 }),
    now
  );
  const freshProfile = weaknessProfile(errorsOf("tone", 6), now);
  assert(
    staleProfile.totalWeight < freshProfile.totalWeight * 0.2,
    "evidência de três meses atrás pesa quase o mesmo que a de hoje — o perfil não esquece"
  );

  // ————————————————————————————————————————————————————————————
  // 5/6. A rota preserva o rodízio sem perfil e muda com perfil
  // ————————————————————————————————————————————————————————————
  for (const attempt of [0, 1, 2, 3, 4, 5]) {
    assert(
      practiceVariantForAttempt(attempt) === rotationVariantForAttempt(attempt),
      `tentativa ${attempt}: rodízio original não preservado sem perfil`
    );
  }
  const tonePr = weaknessProfile(errorsOf("tone", 8), now);
  const orderPr = weaknessProfile(errorsOf("word_order", 8), now);
  assert(Boolean(tonePr.dominant), "8 erros de tom deveriam dar causa dominante");
  assert(Boolean(orderPr.dominant), "8 erros de ordem deveriam dar causa dominante");
  assert(
    practiceVariantForAttempt(0, tonePr) === "A",
    "a primeira tentativa tem que continuar sendo o percurso autoral"
  );
  assert(practiceVariantForAttempt(1, tonePr) === "C", "fraqueza de tom deveria rotear para a variante de som");
  assert(
    practiceVariantForAttempt(1, orderPr) === "B",
    "fraqueza de ordem deveria rotear para a variante de estrutura"
  );

  // ————————————————————————————————————————————————————————————
  // 7. A rota muda o plano e a novidade não depende da variante
  // ————————————————————————————————————————————————————————————
  const signatureOf = (plan) =>
    plan.map((step) => `${step.pedagogyVariant ?? step.kind}:${step.correctAnswer ?? step.answer ?? ""}`).join("|");

  let routedLessons = 0;
  let noveltyLessons = 0;
  let comparableLessons = 0;
  for (const lesson of ALL_LESSONS) {
    const tonePlan = signatureOf(
      lessonRoundStepsFor(lesson, { attemptNumber: 1, weaknessProfile: tonePr, silent: true })
    );
    const orderPlan = signatureOf(
      lessonRoundStepsFor(lesson, { attemptNumber: 1, weaknessProfile: orderPr, silent: true })
    );
    if (tonePlan !== orderPlan) routedLessons += 1;

    // Mesma fraqueza, tentativas diferentes: a variante repete de propósito, e
    // é justamente aí que a novidade tem que vir de outro eixo (a semente).
    const first = signatureOf(
      lessonRoundStepsFor(lesson, { attemptNumber: 1, weaknessProfile: tonePr, silent: true })
    );
    const later = signatureOf(
      lessonRoundStepsFor(lesson, { attemptNumber: 4, weaknessProfile: tonePr, silent: true })
    );
    assert(
      practiceVariantForAttempt(1, tonePr) === practiceVariantForAttempt(4, tonePr),
      "o caso de novidade exige a mesma variante nas duas tentativas"
    );
    comparableLessons += 1;
    if (first !== later) noveltyLessons += 1;
  }
  assert(
    routedLessons >= Math.floor(ALL_LESSONS.length * MIN_ROUTED_LESSON_SHARE),
    `só ${routedLessons}/${ALL_LESSONS.length} lições mudaram de plano entre fraqueza de som e de estrutura — a rota é decorativa`
  );
  assert(
    noveltyLessons >= Math.floor(comparableLessons * MIN_ROUTED_LESSON_SHARE),
    `só ${noveltyLessons}/${comparableLessons} lições trocaram de conteúdo ao repetir a mesma variante — a novidade ainda depende da variante`
  );
  assert(
    variantSeedOffsetForAttempt(1) !== variantSeedOffsetForAttempt(4),
    "o deslocamento de novidade não distingue tentativas"
  );

  // ————————————————————————————————————————————————————————————
  // 8. Resposta bem formada que o motor não explica não é erro
  //
  // Produção livre e aberta cobram uma frase inteira, e o corpus nunca vai
  // enumerar todas as frases certas do mandarim. Punir o que ele não conhece
  // seria transformar o limite do curso em culpa do aluno — e, desde a onda 4,
  // ainda desviaria as próximas lições.
  // ————————————————————————————————————————————————————————————
  const UNRECOGNIZED_CASES = [
    {
      name: "frase válida fora do corpus",
      expected: "我要茶",
      given: "我想喝一点茶",
      unexplained: true,
    },
    {
      name: "outra construção válida fora do corpus",
      expected: "我去银行",
      given: "我明天想去一个银行",
      unexplained: true,
    },
    // Estes o motor EXPLICA, então continuam sendo erro de verdade.
    { name: "item trocado no buraco", expected: "我要茶", given: "我要水", unexplained: false },
    { name: "ordem trocada", expected: "我要茶", given: "我茶要", unexplained: false },
    { name: "partícula omitida", expected: "我回家了", given: "我回家", unexplained: false },
    { name: "frase do corpus fora do objetivo", expected: "我要茶", given: "谢谢", unexplained: false },
    { name: "sem resposta", expected: "我要茶", given: "", unexplained: false },
    { name: "rabisco em letras latinas", expected: "我要茶", given: "asdfgh", unexplained: false },
  ];
  const unrecognizedRows = [];
  for (const testCase of UNRECOGNIZED_CASES) {
    const diagnosis = diagnoseError({
      kind: "free_production",
      expected: testCase.expected,
      given: testCase.given,
      hasCommunicativeGoal: true,
    });
    const unexplained = isUnexplainedProduction(diagnosis, testCase.given);
    assert(
      unexplained === testCase.unexplained,
      `${testCase.name}: esperava ${testCase.unexplained ? "não reconhecida" : "erro"}, veio o contrário (causa ${diagnosis.cause}/${diagnosis.confidence})`
    );
    unrecognizedRows.push({
      name: testCase.name,
      given: testCase.given || "(vazio)",
      cause: diagnosis.cause,
      confidence: diagnosis.confidence,
      outcome: unexplained ? "não reconhecida" : "erro",
    });
  }
  // Uma tentativa bem formada é hànzì puro ou pinyin plausível — nada mais.
  assert(isWellFormedAttempt("我要茶"), "hànzì puro deveria ser tentativa bem formada");
  assert(isWellFormedAttempt("wǒ yào chá"), "pinyin plausível deveria ser tentativa bem formada");
  assert(!isWellFormedAttempt(""), "vazio não é tentativa");
  assert(!isWellFormedAttempt("asdfgh"), "rabisco latino não é tentativa bem formada");
  assert(!isWellFormedAttempt("我要tea"), "mistura de hànzì com latim não é tentativa bem formada");

  // ————————————————————————————————————————————————————————————
  // 9. Confiança pesa: palpite fraco não desvia o currículo
  // ————————————————————————————————————————————————————————————
  const lowConfidence = weaknessProfile(
    errorsOf("lexical_choice", 6, { diagnosisConfidence: "low" }),
    now
  );
  const highConfidence = weaknessProfile(
    errorsOf("lexical_choice", 6, { diagnosisConfidence: "high" }),
    now
  );
  assert(
    highConfidence.totalWeight > lowConfidence.totalWeight * 2,
    "confiança não está pesando: palpite fraco vale quase o mesmo que padrão inequívoco"
  );
  assert(
    Boolean(highConfidence.dominant),
    "seis erros de confiança alta deveriam dar causa dominante"
  );
  // O piso é de PESO, não de contagem: muitos palpites fracos continuam sendo
  // palpites, e não podem desviar o currículo só por serem muitos.
  assert(
    lowConfidence.dominant === undefined,
    "seis palpites de confiança baixa não deveriam bastar para dirigir a rota"
  );
  assert(
    Boolean(weaknessProfile(errorsOf("lexical_choice", 12, { diagnosisConfidence: "low" }), now).dominant),
    "evidência fraca mas muito repetida deveria acabar contando"
  );
  // O empate entre um padrão claro e um palpite não pode ser decidido pelo palpite.
  const mixed = weaknessProfile(
    [
      ...errorsOf("tone", 4, { diagnosisConfidence: "high" }),
      ...errorsOf("lexical_choice", 4, { diagnosisConfidence: "low" }),
    ],
    now
  );
  assert(
    mixed.dominant?.cause === "tone",
    `empate por contagem deveria ser resolvido pela confiança (veio ${mixed.dominant?.cause ?? "nenhuma"})`
  );

  // ————————————————————————————————————————————————————————————
  // 10. A remediação dirigida nunca produz correção quebrada
  // ————————————————————————————————————————————————————————————
  const remediationRows = [];
  const REMEDIATION_CASES = [
    {
      name: "tom errado dentro de montagem de frase",
      error: {
        id: "e1",
        type: "sentence_build",
        correctAnswer: "我要茶",
        selectedAnswer: "我要查",
        hanzi: "我要茶",
        pinyin: "wǒ yào chá",
        diagnosis: "tone",
        skill: "som",
        targets: [],
        timestamp: now,
      },
    },
    {
      name: "ordem trocada em produção livre",
      error: {
        id: "e2",
        type: "free_production",
        correctAnswer: "我要茶",
        selectedAnswer: "我茶要",
        diagnosis: "word_order",
        skill: "significado",
        targets: [],
        timestamp: now,
      },
    },
    {
      name: "causa de som sem material de áudio",
      error: {
        id: "e3",
        type: "comprehend",
        correctAnswer: "obrigado",
        selectedAnswer: "de nada",
        diagnosis: "tone",
        skill: "significado",
        targets: [],
        timestamp: now,
      },
    },
    {
      name: "erro sem diagnóstico (registro anterior à onda 4)",
      error: {
        id: "e4",
        type: "fill_blank",
        correctAnswer: "茶",
        selectedAnswer: "水",
        skill: "significado",
        targets: [],
        timestamp: now,
      },
    },
  ];
  for (const testCase of REMEDIATION_CASES) {
    const exercise = buildImmediateRemediationExercise(testCase.error);
    assert(Boolean(exercise.answer), `${testCase.name}: correção sem resposta`);
    assert(Boolean(exercise.prompt), `${testCase.name}: correção sem enunciado`);
    assert(
      exercise.sourceErrorId === testCase.error.id,
      `${testCase.name}: correção perdeu o vínculo com o erro de origem`
    );
    // Correção de múltipla escolha precisa conter a própria resposta.
    if (exercise.options) {
      assert(
        exercise.options.includes(exercise.answer),
        `${testCase.name}: resposta correta fora das opções`
      );
      assert(
        new Set(exercise.options).size === exercise.options.length,
        `${testCase.name}: opções duplicadas`
      );
    }
    // "Qual é o tom?" só pode ser feita quando a resposta É um tom.
    if (exercise.kind === "tone") {
      assert(
        /\d\s*º?\s*tom/i.test(exercise.answer),
        `${testCase.name}: correção de tom com resposta que não é tom ("${exercise.answer}")`
      );
    }
    remediationRows.push({ name: testCase.name, cause: testCase.error.diagnosis ?? "(sem)", kind: exercise.kind });
  }

  // ————————————————————————————————————————————————————————————
  // Relatório
  // ————————————————————————————————————————————————————————————
  const lines = ["# Relatório de diagnóstico de erro", ""];
  lines.push(...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }));
  lines.push("## Resumo", "");
  lines.push("| Indicador | Valor |", "|-----------|------:|");
  lines.push(`| Causas na taxonomia | ${ERROR_CAUSE_ORDER.length} |`);
  lines.push(`| Eixos pedagógicos | ${new Set(Object.values(AXIS_BY_CAUSE)).size} |`);
  lines.push(`| Modalidades de remediação | ${new Set(Object.values(REMEDIATION_BY_CAUSE)).size} |`);
  lines.push(`| Casos curados auditados | ${CASES.length} |`);
  lines.push(`| Causas distintas observadas | ${observed.size} |`);
  lines.push(`| Maior concentração numa causa | ${(biggestShare * 100).toFixed(0)}% |`);
  lines.push(`| Lições que mudam de plano com a fraqueza | ${routedLessons} / ${ALL_LESSONS.length} |`);
  lines.push(`| Lições que renovam o conteúdo na mesma variante | ${noveltyLessons} / ${comparableLessons} |`);
  lines.push(`| Casos de resposta não reconhecida auditados | ${UNRECOGNIZED_CASES.length} |`);
  lines.push(
    `| Peso de um palpite fraco vs. padrão claro | ${(lowConfidence.totalWeight / highConfidence.totalWeight).toFixed(2)}× |`
  );
  lines.push("");
  lines.push(
    "> Uma causa só é aceita quando a resposta DADA sustenta o padrão — o formato",
    "> do exercício não decide mais o motivo do erro. Por isso o mesmo exercício",
    "> com respostas erradas diferentes produz causas diferentes, e é isso que",
    "> permite devolver o item pelo motor que ataca o problema.",
    ""
  );

  lines.push("## Taxonomia", "");
  lines.push("| Causa | Eixo | Remediação | Variante | O que o aluno lê |");
  lines.push("|-------|------|------------|----------|------------------|");
  for (const cause of ERROR_CAUSE_ORDER) {
    lines.push(
      `| ${ERROR_CAUSE_LABELS[cause]} | ${AXIS_BY_CAUSE[cause]} | ${REMEDIATION_BY_CAUSE[cause]} | ${PRACTICE_VARIANT_BY_CAUSE[cause]} | ${ERROR_CAUSE_FEEDBACK[cause]} |`
    );
  }
  lines.push("");

  lines.push("## Casos curados", "");
  lines.push("| Caso | Esperado | Respondido | Causa | Confiança |");
  lines.push("|------|----------|------------|-------|-----------|");
  for (const row of caseRows) {
    lines.push(`| ${row.name} | ${row.expected} | ${row.given} | ${row.cause} | ${row.confidence} |`);
  }
  lines.push("");

  lines.push("## Resposta que o motor não explica", "");
  lines.push(
    "O corpus nunca vai enumerar todas as frases certas do mandarim. Quando a",
    "resposta é uma tentativa bem formada e o diagnóstico sai com confiança",
    "baixa, o aluno vê \"não reconheci essa forma\" e a tentativa **não** conta",
    "como erro: sem perda de estrela, sem SRS e sem entrar no perfil de fraqueza.",
    "Fica registrada para auditoria e para o corpus crescer.",
    ""
  );
  lines.push("| Caso | Respondido | Causa | Confiança | Resultado |");
  lines.push("|------|------------|-------|-----------|-----------|");
  for (const row of unrecognizedRows) {
    lines.push(`| ${row.name} | ${row.given} | ${row.cause} | ${row.confidence} | ${row.outcome} |`);
  }
  lines.push("");

  lines.push("## Formato da correção por causa", "");
  lines.push("| Caso | Causa | Formato escolhido |");
  lines.push("|------|-------|-------------------|");
  for (const row of remediationRows) {
    lines.push(`| ${row.name} | ${row.cause} | ${row.kind} |`);
  }
  lines.push("");

  lines.push("## Falhas", "");
  lines.push(failures.length === 0 ? "Nenhum." : failures.map((message) => `- ${message}`).join("\n"));
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  console.log(
    `Diagnóstico: ${ERROR_CAUSE_ORDER.length} causas · ${CASES.length} casos curados · ${observed.size} causas observadas.`
  );
  console.log(
    `Rota: ${routedLessons}/${ALL_LESSONS.length} lições mudam com a fraqueza; ${noveltyLessons}/${comparableLessons} renovam na mesma variante.`
  );

  if (failures.length > 0) {
    console.error("\nFalhas do diagnóstico de erro:");
    for (const message of failures) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: onda pedagógica 4 (diagnóstico) validada.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
