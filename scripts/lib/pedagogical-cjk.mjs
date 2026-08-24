/**
 * Extração de chinês pedagógico canónico vs. distrator.
 *
 * Juntar hanzi + prompt + options num blob único misturava resposta certa,
 * estímulo ensinado e lixo deliberado (我是好, 我会中文说). V4.1.1 separa.
 *
 * No Longyu, `produce` é “monte com o banco” — assembly, não produção
 * independente. Independente é `free_production`.
 */

export const CJK_RE = /[\u3400-\u9fff]/u;
export const CJK_RUN_RE = /[\u3400-\u9fff]+/gu;
export const KNOWN_PHRASES = new Set(["你好", "谢谢", "再见", "你好吗", "不客气", "我很好", "你呢"]);
export const USABLE_PHRASES = KNOWN_PHRASES;

export const ASSEMBLY_KINDS = new Set(["sentence_build", "hanzi_build", "translation_build", "produce"]);
export const RECALL_KINDS = new Set(["reverse_recall", "fill_blank", "dictation"]);
export const INDEPENDENT_KINDS = new Set(["free_production"]);
export const TRANSFER_KINDS = new Set(["transfer_task"]);
export const PERCEPTION_KINDS = new Set(["tone", "tone_pair", "audio_discrimination"]);

/** Frases erradas de propósito (SPOT_ERROR_DRILLS + reparo). Sem pontuação. */
export const INTENTIONAL_ERROR_PHRASES = new Set([
  "我是水",
  "我是好",
  "我有二十岁",
  "我不有钱",
  "我喝不茶",
  "我有一朋友",
  "这是我书",
  "我们去明天",
  "我想米饭吃",
  "他是吗学生",
  "他是在家",
  "几钱",
  "我是叫小明",
  "我去到学校",
  "我会中文说",
  "她很老师",
]);

const ODD_FRAGMENTS = new Set(["语吗", "西人"]);

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function collectRuns(value, into) {
  const text = String(value ?? "");
  if (!text) return;
  for (const run of text.match(CJK_RUN_RE) ?? []) into.add(run);
}

function compactCjk(text) {
  return String(text ?? "").replace(/[。！？、,.!?\s]/g, "");
}

function correctSet(step) {
  const values = [step.correctAnswer, step.answer, step.blankAnswer];
  if (Array.isArray(step.target) && step.target.length) values.push(step.target.join(""));
  if (Array.isArray(step.targetParts) && step.targetParts.length) values.push(step.targetParts.join(""));
  return new Set(
    values
      .filter((value) => value != null && String(value).trim() !== "")
      .map((value) => String(value).trim())
  );
}

export function canonicalCjkFields(step) {
  const fields = [
    step.hanzi,
    step.text,
    step.audioText,
    step.slowAudioText,
    step.correctAnswer,
    step.answer,
    step.blankAnswer,
    step.prompt,
    step.dialoguePrompt,
    step.sourceText,
    step.sentenceBefore,
    step.sentenceAfter,
    step.right?.hanzi,
    step.checkpoint?.correctAnswer,
  ];
  if (Array.isArray(step.target) && step.target.length) fields.push(step.target.join(""));
  else fields.push(...asList(step.target));
  if (Array.isArray(step.targetParts) && step.targetParts.length) fields.push(step.targetParts.join(""));
  else fields.push(...asList(step.targetParts));
  for (const pair of step.pairs ?? []) fields.push(pair.left, pair.right);
  for (const line of step.lines ?? []) fields.push(line.hanzi, line.text);
  for (const node of step.nodes ?? []) {
    fields.push(node.hanzi, node.interaction?.correctAnswer);
  }
  return fields.filter((value) => value != null && String(value).length > 0);
}

export function distractorCjkFields(step) {
  const correct = correctSet(step);
  const out = [];
  const pushIfWrong = (value) => {
    const text = String(value ?? "").trim();
    if (text && !correct.has(text)) out.push(text);
  };
  for (const option of step.options ?? []) pushIfWrong(option);
  for (const item of step.bank ?? []) {
    const text = String(item ?? "").trim();
    if (!text || correct.has(text)) continue;
    if (CJK_RE.test(text)) out.push(text);
  }
  if (step.wrong?.hanzi) out.push(String(step.wrong.hanzi));
  for (const option of step.checkpoint?.options ?? []) {
    if (String(option ?? "").trim() !== String(step.checkpoint?.correctAnswer ?? "").trim()) {
      pushIfWrong(option);
    }
  }
  for (const node of step.nodes ?? []) {
    const right = String(node.interaction?.correctAnswer ?? "").trim();
    for (const option of node.interaction?.options ?? []) {
      const text = String(option ?? "").trim();
      if (text && text !== right) out.push(text);
    }
  }
  return out;
}

export function extractCanonicalCjk(step) {
  const runs = new Set();
  for (const field of canonicalCjkFields(step)) collectRuns(field, runs);
  return [...runs];
}

export function extractDistractorCjk(step) {
  const runs = new Set();
  for (const field of distractorCjkFields(step)) collectRuns(field, runs);
  return [...runs];
}

export function hasCanonicalCjk(step) {
  return extractCanonicalCjk(step).length > 0;
}

export function isUsablePhrase(text) {
  const runs = String(text ?? "").match(CJK_RUN_RE) ?? [];
  return runs.some((run) => run.length >= 2 || KNOWN_PHRASES.has(run));
}

export function looksLikeOddChinese(run) {
  if (!run || run.length < 2) return false;
  if (KNOWN_PHRASES.has(run)) return false;
  const compact = compactCjk(run);
  if (INTENTIONAL_ERROR_PHRASES.has(run) || INTENTIONAL_ERROR_PHRASES.has(compact)) return true;
  // Fragmentos soltos — NÃO usar includes: 巴西人 contém 西人.
  if (ODD_FRAGMENTS.has(run) || ODD_FRAGMENTS.has(compact)) return true;
  return false;
}

export function classifyDistractor(run) {
  const compact = compactCjk(run);
  if (INTENTIONAL_ERROR_PHRASES.has(compact) || INTENTIONAL_ERROR_PHRASES.has(run)) return "erro_proposital";
  if (looksLikeOddChinese(run) || looksLikeOddChinese(compact)) return "fragmento_suspeito";
  return "distrator";
}

export function isAssistedAssembly(step) {
  return ASSEMBLY_KINDS.has(step.kind) && (hasCanonicalCjk(step) || Boolean(step.bank?.length) || Boolean(step.target?.length));
}

export function isGuidedRecall(step) {
  return RECALL_KINDS.has(step.kind) && hasCanonicalCjk(step);
}

export function isIndependentProduction(step) {
  return INDEPENDENT_KINDS.has(step.kind) && hasCanonicalCjk(step);
}

export function isTransferProduction(step) {
  return TRANSFER_KINDS.has(step.kind) && hasCanonicalCjk(step);
}

export function isPerceptionDominant(plan) {
  const perception = plan.filter((step) => PERCEPTION_KINDS.has(step.kind)).length;
  const communicative = plan.filter(
    (step) =>
      step.kind === "conversation_scene" ||
      INDEPENDENT_KINDS.has(step.kind) ||
      TRANSFER_KINDS.has(step.kind)
  ).length;
  return perception >= 3 && perception > communicative;
}

export function productionLevel(step) {
  if (isTransferProduction(step)) return "transfer";
  if (isIndependentProduction(step)) return "independent";
  if (isGuidedRecall(step)) return "recall";
  if (isAssistedAssembly(step)) return "assembly";
  return "recognition";
}

export function assertPedagogicalCjkContract() {
  const spot = {
    kind: "spot_error",
    prompt: "Qual frase pede água?",
    options: ["我要水", "我是水"],
    correctAnswer: "我要水",
    wrong: { hanzi: "我是水" },
    right: { hanzi: "我要水" },
  };
  const canonical = extractCanonicalCjk(spot);
  const distractors = extractDistractorCjk(spot);
  if (canonical.includes("我是水")) throw new Error("contrato CJK: 我是水 não é canónico");
  if (!canonical.includes("我要水")) throw new Error("contrato CJK: 我要水 deveria ser canónico");
  if (!distractors.includes("我是水")) throw new Error("contrato CJK: 我是水 deveria ser distrator");
  if (classifyDistractor("我是水") !== "erro_proposital") {
    throw new Error("contrato CJK: 我是水 é erro proposital");
  }

  const assembly = { kind: "sentence_build", targetParts: ["你", "好"], correctAnswer: "你好", bank: ["你", "好", "谢"] };
  if (productionLevel(assembly) !== "assembly") throw new Error("contrato CJK: sentence_build é assembly");

  const produce = { kind: "produce", target: ["你", "好"], bank: ["你", "好", "谢"], pt: "Olá" };
  if (productionLevel(produce) !== "assembly") {
    throw new Error("contrato CJK: produce com banco é assembly, não produção independente");
  }
  if (!extractCanonicalCjk(produce).includes("你好")) {
    throw new Error("contrato CJK: produce deve expor 你好 (target juntado), não só as peças");
  }

  const independent = { kind: "free_production", hanzi: "你好" };
  if (productionLevel(independent) !== "independent") {
    throw new Error("contrato CJK: free_production é independente");
  }

  if (looksLikeOddChinese("巴西人")) throw new Error("contrato CJK: 巴西人 não é fragmento");
  if (!looksLikeOddChinese("西人")) throw new Error("contrato CJK: 西人 é fragmento");
  if (looksLikeOddChinese("你好")) throw new Error("contrato CJK: 你好 não é estranho");
}
