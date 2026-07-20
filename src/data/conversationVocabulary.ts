// ============================================================================
// Conversation Vocabulary Loop — núcleo.
//
// O Longyu já garante o caminho DIRETO (uma conversa nunca mostra vocabulário
// ainda não ensinado — ver validate:conversation-scenes). Este módulo garante o
// caminho INVERSO: dado a variante realmente EXIBIDA de uma conversa, extrai
// exatamente quais chunks, hànzì, palavras, intenção, respostas esperadas e
// vocabulário (novo/antigo/exposto) apareceram — para que esse conteúdo possa
// ser reaproveitado nas atividades da mesma lição e nas revisões futuras.
//
// Não altera o comportamento das conversas: só produz um manifesto determinístico
// a partir do que o resolvedor de cena já decide mostrar.
// ============================================================================

import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import {
  conversationSceneMainPath,
  resolveConversationScene,
  type ConversationInteraction,
  type ConversationNode,
  type ConversationSceneResolveContext,
  type ConversationSceneStep,
  type ConversationSceneVariantStage,
} from "./conversationScenes";

// ── Tipos ───────────────────────────────────────────────────────────────────

/** De onde, dentro da conversa exibida, o vocabulário foi extraído. */
export type ConversationVocabularySource =
  | "main_line" // fala do caminho principal (ramo correto)
  | "wrong_branch" // fala de um ramo de erro
  | "interaction_prompt" // enunciado de uma intervenção
  | "interaction_option" // alternativa oferecida ao aluno
  | "expected_answer" // resposta esperada do aluno (exige resposta)
  | "explanation"; // explicação pedagógica

/** Papel pedagógico do item na variante exibida (pode acumular vários). */
export type ConversationVocabularyRole =
  | "required" // obrigatório (learnedRefs da variante)
  | "auxiliary" // auxiliar (optionalRefs da cena)
  | "new" // novo (newRefs da variante)
  | "reused" // antigo reutilizado (obrigatório e não novo)
  | "exposed" // apenas exposto (aparece, mas não declarado como req/aux/novo)
  | "response"; // exige resposta do aluno (aparece numa resposta esperada)

export type ConversationVocabularyRefType = "chunk" | "char" | "unresolved";

export interface ConversationVocabularyItem {
  /** Referência canônica: `chunk:<id>` | `char:<id>` | `unresolved:<texto>`. */
  ref: string;
  refType: ConversationVocabularyRefType;
  /** Hànzì exibido (limpo de pontuação). */
  text: string;
  pinyin?: string;
  meaningPt?: string;
  /** Papéis pedagógicos (ordenados, sem repetição). */
  roles: ConversationVocabularyRole[];
  /** Onde apareceu (ordenado, sem repetição). */
  sources: ConversationVocabularySource[];
  /** Quantas vezes o item apareceu no total (deduplicado num único item). */
  occurrences: number;
  /** Foi possível associar a uma referência do catálogo? */
  resolved: boolean;
  /** Para chunks: refs `char:<id>` dos hànzì que o compõem (quando catalogados). */
  charRefs?: string[];
}

export interface ConversationVocabularyCoverage {
  /** Refs que a variante DECLARA mostrar (learnedRefs ∪ newRefs). */
  requiredRefs: string[];
  /** Declarados que realmente apareceram (direto ou via chunk que os contém). */
  coveredRefs: string[];
  /** Declarados que não apareceram no texto exibido — gera aviso. */
  missingRefs: string[];
  /** Texto exibido (CJK) que não pôde ser associado ao catálogo — gera aviso. */
  unresolvedTexts: string[];
}

export interface ConversationVocabularyManifest {
  sceneId: string;
  intent: string;
  /** Estágio da variante EFETIVAMENTE exibida (não a canônica mais avançada). */
  stage: ConversationSceneVariantStage;
  /** Cena V1 (lines) ou V2 (nodes). */
  format: "v1" | "v2";
  items: ConversationVocabularyItem[];
  /** Respostas esperadas do aluno na variante exibida (texto cru, sem duplicar). */
  expectedAnswers: string[];
  coverage: ConversationVocabularyCoverage;
  warnings: string[];
}

// ── Catálogos e utilidades de referência ────────────────────────────────────

const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()？！。，、]/g;
const CJK_RE = /[㐀-鿿豈-﫿]/u;

function cleanHanzi(value: string | undefined | null): string {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
}

interface RefInfo {
  ref: string;
  refType: ConversationVocabularyRefType;
  text: string;
  pinyin?: string;
  meaningPt?: string;
}

const CHUNK_BY_ID = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));
const CHAR_BY_ID = new Map(CHARACTERS.map((char) => [char.id, char]));
const CHAR_BY_HANZI = new Map(CHARACTERS.map((char) => [cleanHanzi(char.hanzi), char]));
// Um hànzì pode aparecer em vários chunks; guardamos o primeiro determinístico.
const CHUNK_BY_HANZI = new Map<string, (typeof CHUNKS)[number]>();
for (const chunk of CHUNKS) {
  const key = cleanHanzi(chunk.hanzi);
  if (!CHUNK_BY_HANZI.has(key)) CHUNK_BY_HANZI.set(key, chunk);
}

/** Resolve uma referência canônica (`chunk:x`/`char:x`) → dados do catálogo. */
export function resolveVocabularyRef(ref: string): RefInfo | null {
  const [type, ...rest] = ref.split(":");
  const id = rest.join(":");
  if (type === "chunk") {
    const chunk = CHUNK_BY_ID.get(id);
    if (!chunk) return null;
    return { ref, refType: "chunk", text: cleanHanzi(chunk.hanzi), pinyin: chunk.pinyin, meaningPt: chunk.meaningPt };
  }
  if (type === "char") {
    const char = CHAR_BY_ID.get(id);
    if (!char) return null;
    return { ref, refType: "char", text: cleanHanzi(char.hanzi), pinyin: char.pinyin, meaningPt: char.meaningPt };
  }
  return null;
}

/** Refs `char:<id>` dos hànzì que compõem um texto (quando catalogados). */
function charRefsForText(text: string): string[] {
  const refs: string[] = [];
  for (const ch of cleanHanzi(text)) {
    if (!CJK_RE.test(ch)) continue;
    const char = CHAR_BY_HANZI.get(ch);
    if (char) {
      const ref = `char:${char.id}`;
      if (!refs.includes(ref)) refs.push(ref);
    }
  }
  return refs;
}

// ── Dicionário de segmentação (longest-match) ───────────────────────────────

interface DictEntry {
  ref: string;
  refType: ConversationVocabularyRefType;
}

/**
 * Constrói o dicionário hànzì→ref para segmentar o texto. Prioridade:
 * catálogo global (chunks e chars) e, POR CIMA, as refs DECLARADAS pela variante
 * (para que um chunk cadastrado ganhe de um caractere isolado — req. de não
 * extrair partículas soltas quando fazem parte de um chunk).
 */
function buildSegmentationDict(declaredRefs: readonly string[]): Map<string, DictEntry> {
  const dict = new Map<string, DictEntry>();
  // Catálogo global primeiro.
  for (const char of CHARACTERS) {
    const key = cleanHanzi(char.hanzi);
    if (key && !dict.has(key)) dict.set(key, { ref: `char:${char.id}`, refType: "char" });
  }
  for (const chunk of CHUNKS) {
    const key = cleanHanzi(chunk.hanzi);
    if (key) dict.set(key, { ref: `chunk:${chunk.id}`, refType: "chunk" });
  }
  // Declaradas por cima (canônicas da cena).
  for (const ref of declaredRefs) {
    const info = resolveVocabularyRef(ref);
    if (info && info.text) dict.set(info.text, { ref: info.ref, refType: info.refType });
  }
  return dict;
}

interface SegmentMatch {
  ref: string;
  refType: ConversationVocabularyRefType;
  text: string;
  resolved: boolean;
}

/** Segmenta um texto em refs por correspondência mais longa; sobras viram unresolved. */
function segment(text: string, dict: Map<string, DictEntry>): SegmentMatch[] {
  const clean = cleanHanzi(text);
  const matches: SegmentMatch[] = [];
  let cursor = 0;
  while (cursor < clean.length) {
    let matched = false;
    for (let len = clean.length - cursor; len >= 1; len -= 1) {
      const slice = clean.slice(cursor, cursor + len);
      const entry = dict.get(slice);
      if (entry) {
        matches.push({ ref: entry.ref, refType: entry.refType, text: slice, resolved: true });
        cursor += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = clean[cursor];
      // Ignora não-CJK residual (letras/números); só CJK vira "não resolvido".
      if (CJK_RE.test(ch)) {
        matches.push({ ref: `unresolved:${ch}`, refType: "unresolved", text: ch, resolved: false });
      }
      cursor += 1;
    }
  }
  return matches;
}

// ── Coleta de textos exibidos, por fonte ────────────────────────────────────

interface SourcedText {
  text: string;
  source: ConversationVocabularySource;
}

function interactionTexts(
  interaction: ConversationInteraction,
  collected: SourcedText[]
): void {
  if (interaction.prompt) collected.push({ text: interaction.prompt, source: "interaction_prompt" });
  for (const option of interaction.options ?? []) collected.push({ text: option, source: "interaction_option" });
  if (interaction.correctAnswer) collected.push({ text: interaction.correctAnswer, source: "expected_answer" });
  if (interaction.explanation) collected.push({ text: interaction.explanation, source: "explanation" });
}

/** Classe de alcance de cada nó V2: caminho principal (correto) vs ramo de erro. */
function classifyNodes(nodes: readonly ConversationNode[], entryNodeId?: string): Map<string, "main" | "wrong"> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const main = new Set(conversationSceneMainPath(nodes, entryNodeId).map((node) => node.id));

  // Alcançáveis a partir de qualquer wrongNextNodeId (subárvore de erro).
  const wrong = new Set<string>();
  const queue: string[] = [];
  for (const node of nodes) {
    const wrongId = node.interaction?.wrongNextNodeId;
    if (wrongId && byId.has(wrongId)) queue.push(wrongId);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (wrong.has(id)) continue;
    wrong.add(id);
    const node = byId.get(id);
    if (!node) continue;
    for (const next of [node.nextNodeId, node.interaction?.correctNextNodeId, node.interaction?.wrongNextNodeId]) {
      if (next && byId.has(next) && !wrong.has(next)) queue.push(next);
    }
  }

  const classes = new Map<string, "main" | "wrong">();
  for (const node of nodes) {
    if (main.has(node.id)) classes.set(node.id, "main");
    else if (wrong.has(node.id)) classes.set(node.id, "wrong");
    // Nós inalcançáveis são deixados de fora (o validador de cenas já os pega).
  }
  return classes;
}

function collectSourcedTexts(
  resolved: ReturnType<typeof resolveConversationScene>,
  scene: ConversationSceneStep
): SourcedText[] {
  const collected: SourcedText[] = [];
  if (resolved.nodes?.length) {
    const classes = classifyNodes(resolved.nodes, resolved.entryNodeId);
    // Ordem determinística: ordem do array de nós.
    for (const node of resolved.nodes) {
      const cls = classes.get(node.id);
      if (!cls) continue;
      collected.push({ text: node.hanzi, source: cls === "wrong" ? "wrong_branch" : "main_line" });
      if (node.interaction) interactionTexts(node.interaction, collected);
    }
  } else {
    for (const line of resolved.lines) collected.push({ text: line.hanzi, source: "main_line" });
    if (scene.checkpoint) {
      const cp = scene.checkpoint;
      if (cp.prompt) collected.push({ text: cp.prompt, source: "interaction_prompt" });
      for (const option of cp.options ?? []) collected.push({ text: option, source: "interaction_option" });
      if (cp.correctAnswer) collected.push({ text: cp.correctAnswer, source: "expected_answer" });
      if (cp.explanation) collected.push({ text: cp.explanation, source: "explanation" });
    }
  }
  return collected;
}

// ── Montagem do manifesto ────────────────────────────────────────────────────

const ROLE_ORDER: ConversationVocabularyRole[] = ["required", "new", "reused", "auxiliary", "exposed", "response"];
const SOURCE_ORDER: ConversationVocabularySource[] = [
  "main_line",
  "wrong_branch",
  "interaction_prompt",
  "interaction_option",
  "expected_answer",
  "explanation",
];

function sortRoles(roles: Set<ConversationVocabularyRole>): ConversationVocabularyRole[] {
  return ROLE_ORDER.filter((role) => roles.has(role));
}
function sortSources(sources: Set<ConversationVocabularySource>): ConversationVocabularySource[] {
  return SOURCE_ORDER.filter((source) => sources.has(source));
}

interface Accumulator {
  ref: string;
  refType: ConversationVocabularyRefType;
  text: string;
  roles: Set<ConversationVocabularyRole>;
  sources: Set<ConversationVocabularySource>;
  occurrences: number;
}

/**
 * Constrói o manifesto a partir do CONTEXTO: resolve a variante efetivamente
 * exibida (refs disponíveis / fase) e delega para a função central. Atalho
 * conveniente para quem ainda não resolveu a cena.
 */
export function buildConversationVocabularyManifest(
  scene: ConversationSceneStep,
  context: ConversationSceneResolveContext = {}
): ConversationVocabularyManifest {
  return buildManifestForResolvedVariant(scene, resolveConversationScene(scene, context));
}

/**
 * Função CENTRAL: recebe a VARIANTE JÁ RESOLVIDA de uma conversa (a mesma que o
 * player exibe) e extrai o manifesto determinístico. Use esta quando a cena já
 * foi resolvida, para garantir que o manifesto represente exatamente o que foi
 * mostrado ao aluno (e não uma re-resolução possivelmente divergente).
 */
export function buildManifestForResolvedVariant(
  scene: ConversationSceneStep,
  resolved: ReturnType<typeof resolveConversationScene>
): ConversationVocabularyManifest {
  const requiredSet = new Set(resolved.learnedRefs);
  const newSet = new Set(resolved.newRefs ?? []);
  const auxSet = new Set(scene.optionalRefs ?? []);
  const declaredRefs = [...requiredSet, ...newSet, ...auxSet];

  const dict = buildSegmentationDict(declaredRefs);
  const sourced = collectSourcedTexts(resolved, scene);

  // Respostas esperadas do aluno (texto cru), na ordem de exibição, sem duplicar.
  const expectedAnswers: string[] = [];
  for (const { text, source } of sourced) {
    const value = String(text ?? "").trim();
    if (source === "expected_answer" && value && !expectedAnswers.includes(value)) {
      expectedAnswers.push(value);
    }
  }

  const byRef = new Map<string, Accumulator>();
  const unresolvedTexts = new Set<string>();

  for (const { text, source } of sourced) {
    for (const match of segment(text, dict)) {
      if (!match.resolved) unresolvedTexts.add(match.text);
      let acc = byRef.get(match.ref);
      if (!acc) {
        acc = {
          ref: match.ref,
          refType: match.refType,
          text: match.text,
          roles: new Set(),
          sources: new Set(),
          occurrences: 0,
        };
        byRef.set(match.ref, acc);
      }
      acc.occurrences += 1;
      acc.sources.add(source);
      if (source === "expected_answer") acc.roles.add("response");
    }
  }

  // Papéis pedagógicos por item (a partir dos conjuntos declarados da variante).
  for (const acc of byRef.values()) {
    if (!acc.roles.size || acc.refType !== "unresolved") {
      const required = requiredSet.has(acc.ref);
      const isNew = newSet.has(acc.ref);
      const auxiliary = auxSet.has(acc.ref);
      if (required) acc.roles.add("required");
      if (isNew) acc.roles.add("new");
      if (auxiliary) acc.roles.add("auxiliary");
      if (required && !isNew) acc.roles.add("reused");
      if (!required && !isNew && !auxiliary) acc.roles.add("exposed");
    }
  }

  // Refs cobertos: os itens casados + os char:<id> contidos nos chunks casados.
  const covered = new Set<string>();
  const items: ConversationVocabularyItem[] = [];
  for (const acc of byRef.values()) {
    covered.add(acc.ref);
    const info = acc.refType !== "unresolved" ? resolveVocabularyRef(acc.ref) : null;
    const charRefs = acc.refType === "chunk" ? charRefsForText(acc.text) : undefined;
    if (charRefs) for (const ref of charRefs) covered.add(ref);
    items.push({
      ref: acc.ref,
      refType: acc.refType,
      text: acc.text,
      pinyin: info?.pinyin,
      meaningPt: info?.meaningPt,
      roles: sortRoles(acc.roles),
      sources: sortSources(acc.sources),
      occurrences: acc.occurrences,
      resolved: acc.refType !== "unresolved",
      charRefs,
    });
  }
  items.sort((a, b) => a.ref.localeCompare(b.ref));

  const requiredRefs = [...new Set([...requiredSet, ...newSet])].sort((a, b) => a.localeCompare(b));
  const coveredRefs = requiredRefs.filter((ref) => covered.has(ref));
  const missingRefs = requiredRefs.filter((ref) => !covered.has(ref));
  const unresolvedList = [...unresolvedTexts].sort((a, b) => a.localeCompare(b));

  const warnings: string[] = [];
  for (const ref of missingRefs) {
    warnings.push(`Ref declarado nunca exibido na variante "${resolved.stage}": ${ref} (cena ${scene.sceneId})`);
  }
  for (const text of unresolvedList) {
    warnings.push(`Texto exibido sem referência no catálogo: "${text}" (cena ${scene.sceneId})`);
  }

  return {
    sceneId: scene.sceneId,
    intent: scene.intent,
    stage: resolved.stage,
    format: resolved.nodes?.length ? "v2" : "v1",
    items,
    expectedAnswers,
    coverage: {
      requiredRefs,
      coveredRefs,
      missingRefs,
      unresolvedTexts: unresolvedList,
    },
    warnings,
  };
}

/** Aviso de desenvolvimento (usado por validadores e pelo app em dev). */
export function warnUnresolvedConversationVocabulary(
  manifest: ConversationVocabularyManifest,
  log: (message: string) => void = console.warn
): void {
  for (const warning of manifest.warnings) log(`[conversation-vocabulary] ${warning}`);
}

/** Itens de um papel pedagógico (obrigatório, novo, antigo, exposto, etc.). */
export function itemsByRole(
  manifest: ConversationVocabularyManifest,
  role: ConversationVocabularyRole
): ConversationVocabularyItem[] {
  return manifest.items.filter((item) => item.roles.includes(role));
}

/** Itens que apareceram numa fonte específica (ramo de erro, explicação, etc.). */
export function itemsBySource(
  manifest: ConversationVocabularyManifest,
  source: ConversationVocabularySource
): ConversationVocabularyItem[] {
  return manifest.items.filter((item) => item.sources.includes(source));
}

/** Refs prontos para reúso em atividades/SRS: tudo que foi realmente exibido. */
export function reusableRefsFromManifest(manifest: ConversationVocabularyManifest): string[] {
  const refs = new Set<string>();
  for (const item of manifest.items) {
    if (!item.resolved) continue;
    refs.add(item.ref);
    for (const ref of item.charRefs ?? []) refs.add(ref);
  }
  return [...refs].sort((a, b) => a.localeCompare(b));
}
