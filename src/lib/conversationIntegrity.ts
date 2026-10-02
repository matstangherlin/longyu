/**
 * RC2.2.32 — integridade de diálogos / conversas.
 *
 * Detecta falas vazias, cortadas, placeholders internos, scaffold vazando
 * para a fala do aluno, e nós sem continuação. A progressão da conversa
 * nunca depende de áudio (texto/estado primeiro).
 */
export type ConversationIntegrityIssueCode =
  | "EMPTY_SPEECH"
  | "TRUNCATED_SPEECH"
  | "UNDEFINED_LITERAL"
  | "UNDERSCORE_PLACEHOLDER"
  | "SCAFFOLD_LEAK"
  | "NO_CONTINUATION"
  | "NPC_NO_REPLY"
  | "AUDIO_TEXT_MISMATCH";

export interface ConversationIntegrityIssue {
  code: ConversationIntegrityIssueCode;
  where: string;
  detail: string;
  text?: string;
}

const SCAFFOLD_LEAK = /\b(TODO|FIXME|PLACEHOLDER|undefined|null)\b/i;
const TRUNCATED_END = /[….]{0,}\s*$/;
const OBVIOUS_CUT = /[a-zA-Z\u4e00-\u9fff]$/; // ends mid-word without punctuation — weak signal
const INTERNAL_UNDERSCORE = /_{2,}|\b_\b/;

export function inspectSpeechText(text: string | null | undefined, where: string): ConversationIntegrityIssue[] {
  const issues: ConversationIntegrityIssue[] = [];
  const raw = text == null ? "" : String(text);
  const trimmed = raw.trim();
  if (!trimmed) {
    issues.push({ code: "EMPTY_SPEECH", where, detail: "fala vazia", text: raw });
    return issues;
  }
  if (/\bundefined\b/i.test(trimmed)) {
    issues.push({ code: "UNDEFINED_LITERAL", where, detail: "literal undefined na fala", text: trimmed });
  }
  if (INTERNAL_UNDERSCORE.test(trimmed) && !/我叫…|我要…/.test(trimmed)) {
    // Ellipsis pedagogy (我叫…) is OK; bare underscores are not.
    if (/_/.test(trimmed) && !/[…]/.test(trimmed)) {
      issues.push({ code: "UNDERSCORE_PLACEHOLDER", where, detail: "placeholder _ na fala", text: trimmed });
    }
  }
  if (SCAFFOLD_LEAK.test(trimmed)) {
    issues.push({ code: "SCAFFOLD_LEAK", where, detail: "scaffold/TODO vazando na fala", text: trimmed });
  }
  // Frase claramente cortada: termina com hífen solto ou reticências + palavra incompleta latina.
  if (/[-–—]\s*$/.test(trimmed) || /\w{1,2}\.\.\.$/.test(trimmed)) {
    issues.push({ code: "TRUNCATED_SPEECH", where, detail: "frase parece cortada", text: trimmed });
  }
  void TRUNCATED_END;
  void OBVIOUS_CUT;
  return issues;
}

export interface ConversationNodeLike {
  id?: string;
  speaker?: string;
  text?: string;
  hanzi?: string;
  line?: string;
  prompt?: string;
  audioText?: string;
  replies?: Array<{ id?: string; text?: string; hanzi?: string; next?: string | null }>;
  next?: string | null;
  choices?: Array<{ text?: string; hanzi?: string; next?: string | null }>;
}

export function inspectConversationNode(node: ConversationNodeLike, where: string): ConversationIntegrityIssue[] {
  const issues: ConversationIntegrityIssue[] = [];
  const speech = node.text ?? node.hanzi ?? node.line ?? node.prompt ?? "";
  issues.push(...inspectSpeechText(speech, `${where}.speech`));
  if (node.audioText != null && speech && normalizeLoose(node.audioText) !== normalizeLoose(speech)) {
    // Áudio diferente do texto exibido — sinal fraco (pinyin vs hanzi ok).
    // Só falha se audioText tiver scaffold/vazio enquanto o texto não.
    if (!String(node.audioText).trim()) {
      issues.push({ code: "AUDIO_TEXT_MISMATCH", where: `${where}.audioText`, detail: "audioText vazio com fala presente", text: speech });
    }
  }
  const replies = node.replies ?? node.choices ?? [];
  for (let i = 0; i < replies.length; i += 1) {
    const reply = replies[i];
    const replyText = reply.text ?? reply.hanzi ?? "";
    issues.push(...inspectSpeechText(replyText, `${where}.reply[${i}]`));
  }
  const isTerminal = node.next == null && replies.length === 0;
  const speaker = String(node.speaker ?? "").toLowerCase();
  if (!isTerminal && speaker.includes("npc") && replies.length === 0 && node.next == null) {
    issues.push({ code: "NPC_NO_REPLY", where, detail: "NPC sem resposta/continuação" });
  }
  return issues;
}

function normalizeLoose(value: string): string {
  return String(value).replace(/\s+/g, "").replace(/[。！？!?.,，、]/g, "");
}

/**
 * Grafo: cada nó não-terminal deve ter next ou pelo menos uma escolha com next.
 */
export function inspectConversationGraph(
  nodes: readonly ConversationNodeLike[],
  where: string
): ConversationIntegrityIssue[] {
  const issues: ConversationIntegrityIssue[] = [];
  const ids = new Set(nodes.map((n, i) => n.id ?? `idx:${i}`));
  nodes.forEach((node, index) => {
    const id = node.id ?? `idx:${index}`;
    issues.push(...inspectConversationNode(node, `${where}.${id}`));
    const replies = node.replies ?? node.choices ?? [];
    const targets = [
      ...(node.next != null ? [node.next] : []),
      ...replies.map((r) => r.next).filter((n): n is string => typeof n === "string"),
    ];
    if (targets.length === 0 && replies.length === 0 && index < nodes.length - 1) {
      // Nós do meio sem continuação explícita — pode ser linear por índice; só alerta se tem id e next null explícito.
      if (node.next === null) {
        issues.push({ code: "NO_CONTINUATION", where: `${where}.${id}`, detail: "nó intermediário com next null" });
      }
    }
    for (const target of targets) {
      if (target && !ids.has(target)) {
        issues.push({ code: "NO_CONTINUATION", where: `${where}.${id}`, detail: `next desconhecido: ${target}` });
      }
    }
  });
  return issues;
}
