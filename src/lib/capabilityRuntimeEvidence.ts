/**
 * RC2.2.9 — evidência de runtime para as capacidades conversacionais.
 *
 * Antes, `scoreCapability` acreditava em metadados: `hasConversation: true`
 * valia conversa, `transferScenarios.length > 0` valia transferência e
 * `journeyLessons.length > 0` valia 0.8 de escuta. Um READY podia nascer só de
 * campos preenchidos.
 *
 * Este módulo não decide status — quem decide continua sendo
 * `scoreCapability`/`computeCapabilityStatus` em
 * `src/data/conversationCapabilities.ts`. Aqui só se responde, para cada
 * dimensão, "qual lição? qual tarefa? qual cena? é alcançável?", lendo o que o
 * planner real (`lessonRoundStepsFor`) entrega ao aluno na Jornada. Passo
 * autoral que o planner descarta não aparece aqui — conteúdo morto não conta.
 *
 * Para não carregar a Jornada inteira no bundle do app, o módulo recebe as
 * lições e o planner por parâmetro; quem chama (gates, relatórios) injeta.
 */

import type { ConversationCapability } from "../data/conversationCapabilities";

export type CapabilityEvidenceDimension =
  | "lexical"
  | "structural"
  | "productive"
  | "listening"
  | "conversation"
  | "transfer";

export const CAPABILITY_EVIDENCE_DIMENSIONS: readonly CapabilityEvidenceDimension[] = [
  "lexical",
  "structural",
  "productive",
  "listening",
  "conversation",
  "transfer",
];

/** Onde, na Jornada real, a evidência mora. */
export interface CapabilityEvidenceRef {
  lessonId: string;
  /** Posição da lição na ordem da Jornada (0-based). */
  lessonIndex: number;
  /** Passe de maestria em que o planner entrega o passo (1 = primeira vez). */
  pass: number;
  /** Posição do passo dentro do plano daquele passe. */
  stepIndex: number;
  kind: string;
  sceneId?: string;
  nodeId?: string;
  /** Texto que o aluno produz/ouve/escolhe — a prova concreta. */
  text: string;
}

export interface LexicalEvidence {
  ref: string;
  hanzi: string | null;
  inRegistry: boolean;
  firstTeach: CapabilityEvidenceRef | null;
  firstTest: CapabilityEvidenceRef | null;
  ok: boolean;
}

export interface VocabularyEvidence {
  word: string;
  inRegistry: boolean;
  firstTeach: CapabilityEvidenceRef | null;
  ok: boolean;
}

export interface StructuralEvidence {
  structure: string;
  fragments: string[];
  teach: CapabilityEvidenceRef | null;
  productive: CapabilityEvidenceRef | null;
  use: CapabilityEvidenceRef | null;
  ok: boolean;
}

export interface CapabilityRuntimeEvidence {
  capabilityId: string;
  lexical: LexicalEvidence[];
  vocabulary: VocabularyEvidence[];
  structural: StructuralEvidence[];
  productive: CapabilityEvidenceRef[];
  listening: CapabilityEvidenceRef[];
  conversation: CapabilityEvidenceRef[];
  transfer: CapabilityEvidenceRef[];
  /** Todas as provas vêm de passos que o planner entrega na Jornada normal. */
  reachable: boolean;
}

// ————————————————————————————————————————————————————————————————
// Entrada mínima: o formato de passo que o planner devolve.
// ————————————————————————————————————————————————————————————————

export interface EvidenceInteraction {
  type?: string;
  prompt?: string;
  options?: string[];
  correctAnswer?: string;
  validAnswers?: string[];
  accepts?: string[];
}

export interface EvidenceNode {
  id?: string;
  speakerId?: string;
  hanzi?: string;
  pt?: string;
  audioText?: string;
  interaction?: EvidenceInteraction;
}

export interface EvidenceStep {
  kind: string;
  chunkId?: string;
  charId?: string;
  sceneId?: string;
  prompt?: string;
  promptPt?: string;
  title?: string;
  body?: string;
  situationPt?: string;
  hanzi?: string;
  text?: string;
  pt?: string;
  answer?: string;
  correctAnswer?: string;
  blankAnswer?: string;
  sentenceBefore?: string;
  sentenceAfter?: string;
  target?: string[];
  targetParts?: string[];
  accepts?: string[];
  options?: string[];
  audioText?: string;
  audioTextB?: string;
  audioSequence?: string[];
  sourceText?: string;
  dialoguePrompt?: string;
  lines?: Array<{ hanzi?: string; pt?: string; speakerId?: string }>;
  pairs?: Array<{ left?: string; right?: string }>;
  nodes?: EvidenceNode[];
  checkpoint?: { prompt?: string; options?: string[]; correctAnswer?: string };
  isNovelCombination?: boolean;
  productionOpen?: boolean;
}

export interface EvidenceLesson {
  id: string;
}

export interface EvidencePlan {
  lesson: EvidenceLesson;
  lessonIndex: number;
  pass: number;
  steps: readonly EvidenceStep[];
}

export interface RegistryInput {
  /** `chunk:<id>` → hànzì do registry canônico de chunks. */
  chunkHanziByRef: ReadonlyMap<string, string>;
  /** `char:<id>` → hànzì do registry canônico de caracteres. */
  charHanziByRef?: ReadonlyMap<string, string>;
  /** Hànzì de palavras do registry canônico (vocabulário + chunks). */
  knownWords: ReadonlySet<string>;
}

// ————————————————————————————————————————————————————————————————
// Classificação dos kinds — contratos, não heurística de copy.
// ————————————————————————————————————————————————————————————————

/** Kinds que apresentam material com sentido (ensino/reconhecimento). */
export const TEACH_KINDS: ReadonlySet<string> = new Set([
  "intro",
  "listen",
  "flashcard",
  "comprehend",
  "microread",
  "match_pairs",
  "dialogue_choice",
  "image_choice",
  "compare_with_image",
  "conversation_scene",
]);

/**
 * Kinds em que o aluno MONTA, DIGITA ou FALA a resposta. Múltipla escolha
 * pura, pareamento e exposição passiva ficam de fora de propósito.
 */
export const PRODUCTIVE_KINDS: ReadonlySet<string> = new Set([
  "sentence_build",
  "produce",
  "write",
  "free_production",
  "transfer_task",
  "reverse_recall",
  "sentence_transform",
  "conversation_repair",
]);

/** Kinds cujo estímulo É o áudio (mesma lista de validate:listening-affordance). */
export const LISTENING_KINDS: ReadonlySet<string> = new Set([
  "listen_select",
  "audio_to_action",
  "audio_discrimination",
  "dictation",
]);

/** Interações de conversa em que o aluno responde (não só assiste). */
export const CONVERSATION_RESPONSE_TYPES: ReadonlySet<string> = new Set([
  "choose_reply",
  "order_reply",
  "fill_reply",
  "listen_reply",
  "produce_reply",
  "choose_meaning",
]);

/** Interações de conversa em que o aluno monta/escreve a própria fala. */
const CONVERSATION_PRODUCTIVE_TYPES: ReadonlySet<string> = new Set(["order_reply", "fill_reply", "produce_reply"]);

/**
 * Kinds que colocam a competência numa situação: o aluno decide ou constrói a
 * fala a partir de um contexto, não copia um modelo.
 */
export const TRANSFER_KINDS: ReadonlySet<string> = new Set([
  "transfer_task",
  "free_production",
  "reverse_recall",
  "sentence_transform",
  "conversation_repair",
  "contextual_choice",
  "dialogue_completion",
  "conversation_scene",
]);

// ————————————————————————————————————————————————————————————————
// Normalização e fragmentos.
// ————————————————————————————————————————————————————————————————

const PUNCTUATION = /[\s，。！？、,.!?：:；;“”"'（）()·~～《》<>「」]/g;
const CJK = /[㐀-鿿]/;

export function normalizeHanzi(text: string | undefined | null): string {
  return (text ?? "").replace(PUNCTUATION, "");
}

/**
 * Parte fixa, em hànzì, de uma estrutura ("我要…" → ["我要"],
 * "X 在哪里？" → ["在哪里"], "上班 / 下班" → ["上班", "下班"]).
 * Cada alternativa separada por "/" vira um fragmento; qualquer um basta.
 */
export function structureFragments(structure: string): string[] {
  const out = new Set<string>();
  for (const alternative of structure.split("/")) {
    const runs = alternative
      .split(/…|\.\.\.|\+|[A-Za-z]+|\s+/)
      .map((part) => normalizeHanzi(part))
      .filter((part) => CJK.test(part));
    const longest = runs.sort((a, b) => b.length - a.length)[0];
    if (longest) out.add(longest);
  }
  return [...out];
}

/** Frases que expressam a capacidade: chunks exigidos + perguntas/respostas. */
export function capabilityAnchors(cap: ConversationCapability, registry: RegistryInput): string[] {
  const anchors = new Set<string>();
  for (const ref of cap.requiredChunks) {
    const hanzi = registry.chunkHanziByRef.get(ref);
    if (hanzi) anchors.add(normalizeHanzi(hanzi));
  }
  for (const phrase of [...cap.requiredAnswers, ...cap.requiredQuestions]) {
    const fixed = normalizeHanzi(phrase.split(/…|\.\.\./)[0]);
    if (CJK.test(fixed)) anchors.add(fixed);
  }
  return [...anchors].filter((anchor) => anchor.length >= 2);
}

// ————————————————————————————————————————————————————————————————
// Leitura de passos.
// ————————————————————————————————————————————————————————————————

/** O que o aluno precisa dizer/montar/escrever para acertar o passo. */
export function learnerOutputTexts(step: EvidenceStep): string[] {
  const out: string[] = [];
  const push = (value: string | undefined) => {
    const norm = normalizeHanzi(value);
    if (norm && CJK.test(norm)) out.push(norm);
  };
  push(step.answer);
  push(step.correctAnswer);
  if (step.blankAnswer) push(`${step.sentenceBefore ?? ""}${step.blankAnswer}${step.sentenceAfter ?? ""}`);
  if (step.target?.length) push(step.target.join(""));
  if (step.targetParts?.length) push(step.targetParts.join(""));
  for (const accepted of step.accepts ?? []) push(accepted);
  if (step.kind === "write" || step.kind === "produce") push(step.hanzi ?? step.text);
  return out;
}

/** Texto em hànzì que o passo mostra com sentido (ensino/reconhecimento). */
export function exposureTexts(step: EvidenceStep, registry?: RegistryInput): string[] {
  const out: string[] = [];
  const push = (value: string | undefined) => {
    const norm = normalizeHanzi(value);
    if (norm && CJK.test(norm)) out.push(norm);
  };
  // Cartões e escrita apontam para o registry pelo id; o aluno vê o hànzì.
  if (step.chunkId) push(registry?.chunkHanziByRef.get(`chunk:${step.chunkId}`));
  if (step.charId) push(registry?.charHanziByRef?.get(`char:${step.charId}`));
  push(step.hanzi);
  push(step.text);
  push(step.sourceText);
  push(step.dialoguePrompt);
  for (const line of step.lines ?? []) push(line.hanzi);
  for (const pair of step.pairs ?? []) {
    push(pair.left);
    push(pair.right);
  }
  for (const node of step.nodes ?? []) push(node.hanzi);
  if (step.kind === "dialogue_choice" || step.kind === "image_choice" || step.kind === "compare_with_image") {
    push(step.correctAnswer);
    push(step.answer);
  }
  return out;
}

/** Tudo o que o passo carrega em hànzì — o "contexto" da tarefa. */
function contextText(step: EvidenceStep, registry: RegistryInput): string {
  const parts: string[] = [
    ...exposureTexts(step, registry),
    ...learnerOutputTexts(step),
    normalizeHanzi(step.audioText),
    normalizeHanzi(step.prompt),
  ];
  for (const node of step.nodes ?? []) {
    parts.push(normalizeHanzi(node.audioText));
    const interaction = node.interaction;
    if (!interaction) continue;
    parts.push(normalizeHanzi(interaction.correctAnswer));
    for (const valid of interaction.validAnswers ?? []) parts.push(normalizeHanzi(valid));
  }
  if (step.checkpoint) parts.push(normalizeHanzi(step.checkpoint.correctAnswer));
  return parts.join("|");
}

/**
 * Texto que o aluno lê antes de ouvir — os mesmos campos que
 * validate:listening-affordance audita. As alternativas podem mostrar o texto
 * (ouvir → escolher); a pergunta não pode.
 */
function visiblePromptText(step: EvidenceStep): string {
  return [step.prompt, step.promptPt, step.title, step.dialoguePrompt, step.situationPt]
    .map(normalizeHanzi)
    .join("|");
}

function audioTexts(step: EvidenceStep): string[] {
  return [step.audioText, step.audioTextB, ...(step.audioSequence ?? [])]
    .map(normalizeHanzi)
    .filter((text) => CJK.test(text));
}

interface SceneResponse {
  nodeId?: string;
  type: string;
  texts: string[];
  /** Áudio da fala do personagem que o aluno precisa entender para responder. */
  cueAudio: string;
}

function sceneResponses(step: EvidenceStep): SceneResponse[] {
  const out: SceneResponse[] = [];
  for (const node of step.nodes ?? []) {
    const interaction = node.interaction;
    if (!interaction || !interaction.type || !CONVERSATION_RESPONSE_TYPES.has(interaction.type)) continue;
    const texts = [interaction.correctAnswer, ...(interaction.validAnswers ?? []), ...(interaction.accepts ?? [])]
      .map(normalizeHanzi)
      .filter((text) => CJK.test(text));
    out.push({
      nodeId: node.id,
      type: interaction.type,
      texts,
      cueAudio: normalizeHanzi(node.audioText ?? node.hanzi),
    });
  }
  if (!out.length && step.checkpoint?.correctAnswer) {
    const text = normalizeHanzi(step.checkpoint.correctAnswer);
    if (CJK.test(text)) out.push({ type: "checkpoint", texts: [text], cueAudio: "" });
  }
  return out;
}

// ————————————————————————————————————————————————————————————————
// Posições.
// ————————————————————————————————————————————————————————————————

export function compareEvidenceRefs(a: CapabilityEvidenceRef, b: CapabilityEvidenceRef): number {
  return a.lessonIndex - b.lessonIndex || a.pass - b.pass || a.stepIndex - b.stepIndex;
}

function earliest(current: CapabilityEvidenceRef | null, next: CapabilityEvidenceRef): CapabilityEvidenceRef {
  return !current || compareEvidenceRefs(next, current) < 0 ? next : current;
}

function refFor(plan: EvidencePlan, stepIndex: number, step: EvidenceStep, text: string, nodeId?: string): CapabilityEvidenceRef {
  return {
    lessonId: plan.lesson.id,
    lessonIndex: plan.lessonIndex,
    pass: plan.pass,
    stepIndex,
    kind: step.kind,
    ...(step.sceneId ? { sceneId: step.sceneId } : {}),
    ...(nodeId ? { nodeId } : {}),
    text,
  };
}

// ————————————————————————————————————————————————————————————————
// Derivação.
// ————————————————————————————————————————————————————————————————

interface Matcher {
  /** Frases exclusivas desta capacidade. */
  exclusive: string[];
  /** Frases que outra capacidade também usa: só valem com contexto exclusivo. */
  shared: string[];
  /** Estrutura + vocabulário do domínio ("我想吃" + "鱼" → 我想吃鱼). */
  frames: string[];
  vocabulary: string[];
}

function buildMatchers(
  capabilities: readonly ConversationCapability[],
  registry: RegistryInput
): Map<string, Matcher> {
  const anchorsById = new Map(capabilities.map((cap) => [cap.id, capabilityAnchors(cap, registry)]));
  const owners = new Map<string, number>();
  for (const anchors of anchorsById.values()) {
    for (const anchor of new Set(anchors)) owners.set(anchor, (owners.get(anchor) ?? 0) + 1);
  }
  const out = new Map<string, Matcher>();
  for (const cap of capabilities) {
    const anchors = anchorsById.get(cap.id) ?? [];
    // Uma frase compartilhada ainda é "desta" capacidade quando ela a declara
    // como estrutura própria: 太贵了 define negotiate_basic, mesmo que
    // buy_item também a liste entre os chunks de apoio.
    const ownStructures = new Set(cap.requiredStructures.map((structure) => normalizeHanzi(structure)));
    const defines = (anchor: string) => ownStructures.has(anchor);
    out.set(cap.id, {
      exclusive: anchors.filter((anchor) => owners.get(anchor) === 1 || defines(anchor)),
      shared: anchors.filter((anchor) => (owners.get(anchor) ?? 0) > 1 && !defines(anchor)),
      frames: [...new Set(cap.requiredStructures.flatMap(structureFragments))],
      vocabulary: cap.requiredVocabulary.map(normalizeHanzi).filter((word) => CJK.test(word)),
    });
  }
  return out;
}

const planContextCache = new WeakMap<EvidencePlan, string>();

/** Texto em hànzì de toda a rodada — o assunto da lição naquele passe. */
function planContext(plan: EvidencePlan, registry: RegistryInput): string {
  const cached = planContextCache.get(plan);
  if (cached != null) return cached;
  const text = plan.steps.map((step) => contextText(step, registry)).join("|");
  planContextCache.set(plan, text);
  return text;
}

/**
 * O texto expressa a capacidade? Frase exclusiva basta; frase compartilhada
 * só conta se o contexto do passo tiver algo exclusivo desta capacidade; a
 * combinação estrutura + vocabulário do domínio conta como uso transformado.
 */
function hasExclusiveContext(matcher: Matcher, context: string): boolean {
  return (
    matcher.exclusive.some((anchor) => context.includes(anchor)) ||
    matcher.vocabulary.some((word) => word.length >= 2 && context.includes(word) && !matcher.shared.includes(word))
  );
}

function expresses(matcher: Matcher, text: string, context: string, lessonContext = ""): boolean {
  if (matcher.exclusive.some((anchor) => text.includes(anchor))) return true;
  // Frase compartilhada ("我要票" serve a metrô e a trem) só conta quando o
  // passo — ou, na falta dele, a rodada da lição — é sobre esta capacidade.
  const exclusiveContext = hasExclusiveContext(matcher, context) || hasExclusiveContext(matcher, lessonContext);
  if (exclusiveContext && matcher.shared.some((anchor) => text.includes(anchor))) return true;
  // Estrutura longa (≥4 hànzì, ex.: 我不喜欢) já é a capacidade; estrutura
  // curta (这是我, 我想吃) só conta com uma palavra do domínio junto — senão
  // 这是我的护照 viraria "falar da família".
  return matcher.frames.some(
    (frame) =>
      text.includes(frame) &&
      (frame.length >= 4 ||
        matcher.vocabulary.some((word) => word !== frame && !frame.includes(word) && text.includes(word)))
  );
}

/**
 * Deriva, a partir dos planos reais, a evidência de cada capacidade.
 * `plans` precisa vir na ordem da Jornada (lição, passe, passo).
 */
export function deriveCapabilityRuntimeEvidence(input: {
  capabilities: readonly ConversationCapability[];
  plans: readonly EvidencePlan[];
  registry: RegistryInput;
}): Map<string, CapabilityRuntimeEvidence> {
  const { capabilities, plans, registry } = input;
  const matchers = buildMatchers(capabilities, registry);
  const result = new Map<string, CapabilityRuntimeEvidence>();

  for (const cap of capabilities) {
    const matcher = matchers.get(cap.id)!;
    const productive: CapabilityEvidenceRef[] = [];
    const listening: CapabilityEvidenceRef[] = [];
    const conversation: CapabilityEvidenceRef[] = [];
    const transferCandidates: Array<{ ref: CapabilityEvidenceRef; contextKey: string }> = [];

    const chunkTargets = cap.requiredChunks.map((ref) => {
      const hanzi = registry.chunkHanziByRef.get(ref) ?? null;
      return { ref, hanzi, norm: hanzi ? normalizeHanzi(hanzi) : "" };
    });
    const firstTeachByChunk = new Map<string, CapabilityEvidenceRef>();
    const firstTestByChunk = new Map<string, CapabilityEvidenceRef>();
    const vocabTargets = cap.requiredVocabulary.map((word) => ({ word, norm: normalizeHanzi(word) }));
    const firstTeachByWord = new Map<string, CapabilityEvidenceRef>();
    const structures = cap.requiredStructures.map((structure) => ({
      structure,
      fragments: structureFragments(structure),
      teach: null as CapabilityEvidenceRef | null,
      productive: null as CapabilityEvidenceRef | null,
      use: null as CapabilityEvidenceRef | null,
    }));

    for (const plan of plans) {
      const lessonContext = planContext(plan, registry);
      const says = (text: string, context: string) => expresses(matcher, text, context, lessonContext);
      plan.steps.forEach((step, stepIndex) => {
        const context = contextText(step, registry);
        const outputs = learnerOutputTexts(step);
        const exposures = TEACH_KINDS.has(step.kind) ? exposureTexts(step, registry) : [];
        const responses = step.kind === "conversation_scene" ? sceneResponses(step) : [];
        const isProductive = PRODUCTIVE_KINDS.has(step.kind);
        const isListening = LISTENING_KINDS.has(step.kind);

        // Léxico: primeira exposição com sentido e primeira cobrança.
        for (const target of chunkTargets) {
          if (!target.norm) continue;
          if (exposures.some((text) => text.includes(target.norm))) {
            firstTeachByChunk.set(target.ref, earliest(firstTeachByChunk.get(target.ref) ?? null, refFor(plan, stepIndex, step, target.norm)));
          }
          const tested =
            ((isProductive || isListening) && outputs.some((text) => text.includes(target.norm))) ||
            (isListening && audioTexts(step).some((text) => text.includes(target.norm)));
          if (tested) {
            firstTestByChunk.set(target.ref, earliest(firstTestByChunk.get(target.ref) ?? null, refFor(plan, stepIndex, step, target.norm)));
          }
        }
        for (const target of vocabTargets) {
          if (!target.norm) continue;
          if (exposures.some((text) => text.includes(target.norm))) {
            firstTeachByWord.set(target.word, earliest(firstTeachByWord.get(target.word) ?? null, refFor(plan, stepIndex, step, target.norm)));
          }
        }

        // Estrutura: ensino, produção e uso (conversa/transferência).
        for (const row of structures) {
          const hit = (texts: string[]) => texts.find((text) => row.fragments.some((fragment) => text.includes(fragment)));
          const taught = hit(exposures);
          if (taught) row.teach = earliest(row.teach, refFor(plan, stepIndex, step, taught));
          if (isProductive) {
            const produced = hit(outputs);
            if (produced) row.productive = earliest(row.productive, refFor(plan, stepIndex, step, produced));
          }
          const used = responses.length ? hit(responses.flatMap((response) => response.texts)) : TRANSFER_KINDS.has(step.kind) ? hit(outputs) : undefined;
          if (used) row.use = earliest(row.use, refFor(plan, stepIndex, step, used));
        }

        // Produção: o aluno monta/escreve/fala a frase da capacidade.
        if (isProductive) {
          const produced = outputs.find((text) => says(text, context));
          if (produced) productive.push(refFor(plan, stepIndex, step, produced));
        }
        for (const response of responses) {
          if (!CONVERSATION_PRODUCTIVE_TYPES.has(response.type)) continue;
          const produced = response.texts.find((text) => says(text, context));
          if (produced) productive.push(refFor(plan, stepIndex, step, produced, response.nodeId));
        }

        // Escuta: a informação vem do áudio, e o áudio não está escrito antes.
        if (isListening) {
          const prompt = visiblePromptText(step);
          const heard = audioTexts(step).find(
            (text) => says(text, context) && !prompt.includes(text)
          );
          if (heard) listening.push(refFor(plan, stepIndex, step, heard));
        }
        for (const response of responses) {
          if (response.type !== "listen_reply" || !response.cueAudio) continue;
          if (says(response.cueAudio, context) || response.texts.some((text) => says(text, context))) {
            listening.push(refFor(plan, stepIndex, step, response.cueAudio, response.nodeId));
          }
        }

        // Conversa: cena real com turno em que o aluno responde.
        for (const response of responses) {
          const said = response.texts.find((text) => says(text, context));
          if (said) conversation.push(refFor(plan, stepIndex, step, said, response.nodeId));
        }

        // Candidatos a transferência: competência posta numa situação.
        if (TRANSFER_KINDS.has(step.kind)) {
          const texts = responses.length ? responses.flatMap((response) => response.texts) : outputs;
          const used = texts.find((text) => says(text, context));
          if (used) {
            transferCandidates.push({
              ref: refFor(plan, stepIndex, step, used),
              contextKey: step.sceneId ?? step.situationPt ?? step.prompt ?? used,
            });
          }
        }
      });
    }

    // Transferência = mesma competência, OUTRO contexto: a situação precisa
    // ser posterior e diferente da primeira produção (não é repetição da
    // mesma pergunta).
    const firstProductive = productive.reduce<CapabilityEvidenceRef | null>((acc, ref) => earliest(acc, ref), null);
    const firstContextKey = firstProductive
      ? transferCandidates.find((candidate) => compareEvidenceRefs(candidate.ref, firstProductive) === 0)?.contextKey
      : undefined;
    const transfer = firstProductive
      ? transferCandidates
          .filter(
            (candidate) =>
              candidate.ref.lessonIndex > firstProductive.lessonIndex &&
              candidate.contextKey !== firstContextKey
          )
          .map((candidate) => candidate.ref)
      : [];

    const lexical: LexicalEvidence[] = chunkTargets.map((target) => {
      const firstTeach = firstTeachByChunk.get(target.ref) ?? null;
      const firstTest = firstTestByChunk.get(target.ref) ?? null;
      const inRegistry = target.hanzi != null;
      return {
        ref: target.ref,
        hanzi: target.hanzi,
        inRegistry,
        firstTeach,
        firstTest,
        ok: inRegistry && firstTeach != null && (firstTest == null || compareEvidenceRefs(firstTeach, firstTest) <= 0),
      };
    });
    const vocabulary: VocabularyEvidence[] = vocabTargets.map((target) => {
      const inRegistry = registry.knownWords.has(target.norm) || [...registry.chunkHanziByRef.values()].some((hanzi) => normalizeHanzi(hanzi).includes(target.norm));
      const firstTeach = firstTeachByWord.get(target.word) ?? null;
      return { word: target.word, inRegistry, firstTeach, ok: inRegistry && firstTeach != null };
    });
    const structural: StructuralEvidence[] = structures.map((row) => ({
      structure: row.structure,
      fragments: row.fragments,
      teach: row.teach,
      productive: row.productive,
      use: row.use,
      ok: row.fragments.length > 0 && row.teach != null && row.productive != null && row.use != null,
    }));

    const sortRefs = (refs: CapabilityEvidenceRef[]) => [...refs].sort(compareEvidenceRefs);
    result.set(cap.id, {
      capabilityId: cap.id,
      lexical,
      vocabulary,
      structural,
      productive: sortRefs(productive),
      listening: sortRefs(listening),
      conversation: sortRefs(conversation),
      transfer: sortRefs(transfer),
      // Só entra aqui o que o planner entregou; o índice de lição prova que o
      // passo mora numa lição da Jornada normal.
      reachable: plans.length > 0,
    });
  }
  return result;
}
