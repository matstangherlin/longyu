// ============================================================================
// Conversation Vocabulary Loop → SRS
//
// Ao concluir (ou abandonar) uma conversa, transforma o manifesto de vocabulário
// em ações de revisão espaçada com prioridade real — sem lotar a fila com cada
// hànzì solto quando o chunk é a unidade pedagógica, sem apagar SRS existente e
// alternando domínios (som / significado / forma / uso / fala / leitura).
// ============================================================================

import type { ItemType } from "../data/types";
import type { DomainTrack } from "../data/domains";
import type {
  ConversationResult,
  ConversationVariantLevel,
} from "../data/conversationScenes";
import type {
  ConversationVocabularyItem,
  ConversationVocabularyManifest,
} from "../data/conversationVocabulary";
import { makeKey, type Grade, type ReviewDomain, type SRSItem } from "./srs";
import { reviewDomainsForItem } from "./reviewPlan";

export type ConversationSrsPriority = "high" | "medium" | "low";

/** Domínios que o loop de conversa alterna nas revisões futuras. */
export const CONVERSATION_SRS_DOMAINS: readonly ReviewDomain[] = [
  "uso",
  "fala",
  "significado",
  "som",
  "forma",
  "leitura",
] as const;

export interface ConversationVocabularySrsContext {
  manifest: ConversationVocabularyManifest;
  result: ConversationResult;
  attempts: number;
  assistanceLevel: ConversationVariantLevel;
  /** Refs `chunk:`/`char:` em que o aluno errou nesta cena. */
  errorRefs?: readonly string[];
  /** Mapa SRS atual (preservado; nunca recriado do zero). */
  srs: Record<string, SRSItem>;
  learnedChunks?: readonly string[];
  learnedChars?: readonly string[];
  track?: DomainTrack;
  now?: number;
}

export interface ConversationSrsAction {
  type: ItemType;
  itemId: string;
  domain: ReviewDomain;
  grade: Grade;
  priority: ConversationSrsPriority;
  reason: string;
  /** Chave SRS já existia antes desta ação. */
  existed: boolean;
  ref: string;
}

export interface ConversationVocabularySrsPlan {
  actions: ConversationSrsAction[];
  /** Refs pedagógicas efetivamente enfileiradas (após dedupe). */
  registeredRefs: string[];
  /** Chars omitidos porque o chunk pai cobre melhor a unidade. */
  skippedCharRefs: string[];
  /** Intenção comunicativa da cena (para reaparecer noutro cenário). */
  intent: string;
  mainAnswer: string | null;
  assistanceLevel: ConversationVariantLevel;
}

interface RankedItem {
  item: ConversationVocabularyItem;
  priority: ConversationSrsPriority;
  reasons: string[];
  type: "chunk" | "char";
  itemId: string;
}

const ASSISTED_LEVELS = new Set<ConversationVariantLevel>(["guided", "assisted"]);

function parseRef(ref: string): { type: "chunk" | "char"; itemId: string } | null {
  const [kind, ...rest] = ref.split(":");
  const itemId = rest.join(":");
  if (!itemId) return null;
  if (kind === "chunk" || kind === "char") return { type: kind, itemId };
  return null;
}

function isConsolidated(
  type: "chunk" | "char",
  itemId: string,
  srs: Record<string, SRSItem>,
  learnedChunks: readonly string[],
  learnedChars: readonly string[]
): boolean {
  const learned = type === "chunk" ? learnedChunks.includes(itemId) : learnedChars.includes(itemId);
  if (!learned) return false;
  const domains = reviewDomainsForItem(type);
  let strong = 0;
  for (const domain of domains) {
    const item = srs[makeKey(type, itemId, domain)];
    if (item && item.reps >= 2 && item.lapses === 0 && item.intervalDays >= 3) strong += 1;
  }
  return strong >= 2;
}

function littlePracticed(type: "chunk" | "char", itemId: string, srs: Record<string, SRSItem>): boolean {
  const domains = reviewDomainsForItem(type);
  let any = false;
  let fragile = false;
  for (const domain of domains) {
    const item = srs[makeKey(type, itemId, domain)];
    if (!item) {
      fragile = true;
      continue;
    }
    any = true;
    if (item.reps <= 1 || item.intervalDays < 1) fragile = true;
  }
  return !any || fragile;
}

/**
 * Prioridade pedagógica do item a partir do desempenho na conversa.
 * Alta: erro, abandono, várias tentativas, novidade, resposta da intenção.
 * Média: acerto com assistência, palavra antiga pouco praticada.
 * Baixa: acerto imediato / palavra antiga consolidada.
 */
export function priorityForConversationItem(
  item: ConversationVocabularyItem,
  ctx: Pick<
    ConversationVocabularySrsContext,
    "result" | "attempts" | "assistanceLevel" | "errorRefs" | "srs" | "learnedChunks" | "learnedChars"
  >
): { priority: ConversationSrsPriority; reasons: string[] } {
  const reasons: string[] = [];
  const errorRefs = new Set(ctx.errorRefs ?? []);
  const parsed = parseRef(item.ref);
  const roles = new Set(item.roles);

  if (errorRefs.has(item.ref) || item.sources.includes("wrong_branch")) {
    reasons.push("erro");
  }
  if (ctx.result === "abandoned") {
    reasons.push("abandono");
  }
  if (ctx.attempts >= 2 && (roles.has("response") || roles.has("required") || roles.has("new"))) {
    reasons.push("varias_tentativas");
  }
  if (roles.has("new")) reasons.push("novidade");
  if (roles.has("response")) reasons.push("intencao");

  if (reasons.length > 0) {
    return { priority: "high", reasons };
  }

  const consolidated =
    parsed != null &&
    isConsolidated(
      parsed.type,
      parsed.itemId,
      ctx.srs,
      ctx.learnedChunks ?? [],
      ctx.learnedChars ?? []
    );
  const scarce = parsed != null && littlePracticed(parsed.type, parsed.itemId, ctx.srs);
  const assisted = ASSISTED_LEVELS.has(ctx.assistanceLevel) && ctx.result === "completed";

  // Consolidada tem precedência sobre "pouco praticada" (outros domínios vazios).
  if (ctx.result === "completed" && ctx.attempts <= 1 && consolidated) {
    reasons.push("consolidada");
    return { priority: "low", reasons };
  }
  if (assisted) {
    reasons.push("assistencia");
    return { priority: "medium", reasons };
  }
  if (roles.has("reused") && scarce) {
    reasons.push("pouco_praticada");
    return { priority: "medium", reasons };
  }
  if (ctx.result === "completed" && ctx.attempts <= 1) {
    reasons.push("acerto_imediato");
    return { priority: "low", reasons };
  }

  reasons.push("exposicao");
  return { priority: "medium", reasons };
}

function gradeForPriority(priority: ConversationSrsPriority, result: ConversationResult): Grade {
  if (priority === "high") {
    if (result === "abandoned" || result === "mistake") return "again";
    return "hard";
  }
  if (priority === "medium") return "hard";
  return "good";
}

/**
 * Escolhe o próximo domínio de revisão, alternando entre os da conversa e
 * evitando repetir o domínio mais recentemente revisado do mesmo item.
 */
export function pickConversationReviewDomain(
  type: ItemType,
  itemId: string,
  srs: Record<string, SRSItem>,
  preferred?: ReviewDomain,
  avoidDomains: ReadonlySet<ReviewDomain> = new Set()
): ReviewDomain {
  const allowed = CONVERSATION_SRS_DOMAINS.filter((domain) =>
    reviewDomainsForItem(type).includes(domain)
  );
  const pool = preferred && allowed.includes(preferred) ? [preferred, ...allowed.filter((d) => d !== preferred)] : [...allowed];

  let best: ReviewDomain = pool[0] ?? "uso";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const domain of pool) {
    if (avoidDomains.has(domain)) continue;
    const item = srs[makeKey(type, itemId, domain)];
    let score = 0;
    if (!item) score += 40;
    else {
      score += Math.max(0, (Date.now() - (item.reviewedAt ?? item.createdAt)) / (60 * 60 * 1000));
      if (item.due <= Date.now()) score += 20;
      if (item.reps === 0) score += 10;
      // Penaliza o domínio mais recentemente tocado para forçar alternância.
      score -= (item.reviewedAt ?? 0) / 1e12;
    }
    if (score > bestScore) {
      bestScore = score;
      best = domain;
    }
  }
  return best;
}

/**
 * Deduplicação pedagógica: preferir chunk ao caractere isolado quando o chunk
 * cobre o mesmo conteúdo — salvo se o char for erro, novidade ou resposta.
 */
export function selectPedagogicalUnits(
  items: readonly ConversationVocabularyItem[],
  ctx: Pick<
    ConversationVocabularySrsContext,
    "result" | "attempts" | "assistanceLevel" | "errorRefs" | "srs" | "learnedChunks" | "learnedChars"
  >
): { ranked: RankedItem[]; skippedCharRefs: string[] } {
  const errorRefs = new Set(ctx.errorRefs ?? []);
  const candidates: RankedItem[] = [];

  for (const item of items) {
    if (!item.resolved) continue;
    const parsed = parseRef(item.ref);
    if (!parsed) continue;
    // Expostos sem papel pedagógico forte só entram se forem erro/abandono.
    const roles = new Set(item.roles);
    const pedagogicallyRelevant =
      roles.has("required") ||
      roles.has("new") ||
      roles.has("reused") ||
      roles.has("response") ||
      errorRefs.has(item.ref) ||
      item.sources.includes("wrong_branch") ||
      ctx.result === "abandoned";
    if (!pedagogicallyRelevant) continue;

    const { priority, reasons } = priorityForConversationItem(item, ctx);
    candidates.push({ item, priority, reasons, type: parsed.type, itemId: parsed.itemId });
  }

  const priorityRank: Record<ConversationSrsPriority, number> = { high: 3, medium: 2, low: 1 };
  candidates.sort((a, b) => {
    const pr = priorityRank[b.priority] - priorityRank[a.priority];
    if (pr !== 0) return pr;
    // Chunks antes de chars no mesmo nível (unidade pedagógica maior).
    if (a.type !== b.type) return a.type === "chunk" ? -1 : 1;
    if (a.item.roles.includes("response") !== b.item.roles.includes("response")) {
      return a.item.roles.includes("response") ? -1 : 1;
    }
    return a.item.ref.localeCompare(b.item.ref);
  });

  const selectedChunks = new Map<string, RankedItem>();
  const selectedChars = new Map<string, RankedItem>();
  const coveredByChunk = new Set<string>();
  const skippedCharRefs: string[] = [];

  for (const candidate of candidates) {
    if (candidate.type === "chunk") {
      selectedChunks.set(candidate.item.ref, candidate);
      for (const charRef of candidate.item.charRefs ?? []) coveredByChunk.add(charRef);
      continue;
    }

    const mustKeepStandalone =
      errorRefs.has(candidate.item.ref) ||
      candidate.item.roles.includes("new") ||
      candidate.item.roles.includes("response") ||
      candidate.priority === "high";

    if (coveredByChunk.has(candidate.item.ref) && !mustKeepStandalone) {
      skippedCharRefs.push(candidate.item.ref);
      continue;
    }
    selectedChars.set(candidate.item.ref, candidate);
  }

  return {
    ranked: [...selectedChunks.values(), ...selectedChars.values()],
    skippedCharRefs: [...new Set(skippedCharRefs)].sort((a, b) => a.localeCompare(b)),
  };
}

function preferredDomainForItem(item: ConversationVocabularyItem): ReviewDomain {
  if (item.roles.includes("response") || item.sources.includes("expected_answer")) return "uso";
  if (item.sources.includes("wrong_branch")) return "significado";
  if (item.roles.includes("new")) return "significado";
  return "uso";
}

/**
 * Planeja o registro no SRS a partir do manifesto + desempenho da conversa.
 * Não muta o mapa — devolve ações idempotentes por (type, itemId, domain).
 */
export function planConversationVocabularySrs(ctx: ConversationVocabularySrsContext): ConversationVocabularySrsPlan {
  const { ranked, skippedCharRefs } = selectPedagogicalUnits(ctx.manifest.items, ctx);
  const actions: ConversationSrsAction[] = [];
  const seenKeys = new Set<string>();
  const registeredRefs: string[] = [];
  const domainsUsedByItem = new Map<string, Set<ReviewDomain>>();

  for (const entry of ranked) {
    const itemKey = `${entry.type}:${entry.itemId}`;
    const avoid = domainsUsedByItem.get(itemKey) ?? new Set<ReviewDomain>();
    const primary = pickConversationReviewDomain(
      entry.type,
      entry.itemId,
      ctx.srs,
      preferredDomainForItem(entry.item),
      avoid
    );
    const domains: ReviewDomain[] = [primary];
    // Alta prioridade: agenda também um segundo domínio diferente (modalidade).
    if (entry.priority === "high") {
      const secondary = pickConversationReviewDomain(entry.type, entry.itemId, ctx.srs, undefined, new Set([primary]));
      if (secondary !== primary) domains.push(secondary);
    }

    for (const domain of domains) {
      const srsKey = makeKey(entry.type, entry.itemId, domain);
      if (seenKeys.has(srsKey)) continue;
      seenKeys.add(srsKey);
      avoid.add(domain);
      const existed = Boolean(ctx.srs[srsKey] ?? ctx.srs[makeKey(entry.type, entry.itemId)]);
      actions.push({
        type: entry.type,
        itemId: entry.itemId,
        domain,
        grade: gradeForPriority(entry.priority, ctx.result),
        priority: entry.priority,
        reason: entry.reasons.join("+") || "conversa",
        existed,
        ref: entry.item.ref,
      });
    }
    domainsUsedByItem.set(itemKey, avoid);
    registeredRefs.push(entry.item.ref);
  }

  const mainAnswer =
    ctx.manifest.expectedAnswers.find((answer) => Boolean(answer?.trim()))?.trim() ?? null;

  return {
    actions,
    registeredRefs: [...new Set(registeredRefs)].sort((a, b) => a.localeCompare(b)),
    skippedCharRefs,
    intent: ctx.manifest.intent,
    mainAnswer,
    assistanceLevel: ctx.assistanceLevel,
  };
}

export interface ConversationSrsApplyTools {
  ensureSrs: (type: ItemType, itemId: string, track?: DomainTrack, domain?: ReviewDomain) => void;
  gradeSrs: (
    type: ItemType,
    itemId: string,
    grade: Grade,
    track?: DomainTrack,
    domain?: ReviewDomain
  ) => void;
}

/**
 * Aplica o plano ao store. Garante todos os domínios do item (como o restante
 * do app) e nota só o domínio escolhido — preservando entradas já existentes.
 */
export function applyConversationVocabularySrsPlan(
  plan: ConversationVocabularySrsPlan,
  tools: ConversationSrsApplyTools,
  track: DomainTrack = "fala"
): { applied: number; high: number; medium: number; low: number } {
  let applied = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  const graded = new Set<string>();

  for (const action of plan.actions) {
    const key = `${action.type}:${action.itemId}:${action.domain}`;
    if (graded.has(key)) continue;
    graded.add(key);

    for (const domain of reviewDomainsForItem(action.type)) {
      tools.ensureSrs(action.type, action.itemId, track, domain);
    }
    tools.gradeSrs(action.type, action.itemId, action.grade, track, action.domain);
    applied += 1;
    if (action.priority === "high") high += 1;
    else if (action.priority === "medium") medium += 1;
    else low += 1;
  }

  return { applied, high, medium, low };
}

/** Atalho: planeja e aplica numa chamada. */
export function registerConversationVocabularyInSrs(
  ctx: ConversationVocabularySrsContext,
  tools: ConversationSrsApplyTools
): ConversationVocabularySrsPlan & { stats: ReturnType<typeof applyConversationVocabularySrsPlan> } {
  const plan = planConversationVocabularySrs(ctx);
  const stats = applyConversationVocabularySrsPlan(plan, tools, ctx.track ?? "fala");
  return { ...plan, stats };
}

/** Extrai refs de erro a partir de alvos de revisão / respostas erradas. */
export function conversationErrorRefsFromTargets(
  targets: readonly { type: ItemType; itemId: string }[],
  manifest?: ConversationVocabularyManifest | null
): string[] {
  const refs = new Set<string>();
  for (const target of targets) {
    if (target.type === "chunk" || target.type === "char") {
      refs.add(`${target.type}:${target.itemId}`);
    }
  }
  if (manifest) {
    for (const item of manifest.items) {
      if (item.sources.includes("wrong_branch") || item.roles.includes("response")) {
        // Resposta principal entra como candidato a erro só se já houver alvo;
        // o caller decide se a conversa teve mistake.
      }
    }
  }
  return [...refs].sort((a, b) => a.localeCompare(b));
}

/**
 * Quando a conversa terminou com erro/abandono, marca a resposta principal e
 * itens de ramo de erro como refs problemáticos (além dos alvos explícitos).
 */
export function resolveConversationErrorRefs(
  manifest: ConversationVocabularyManifest,
  result: ConversationResult,
  explicitRefs: readonly string[] = []
): string[] {
  const refs = new Set(explicitRefs);
  if (result === "mistake" || result === "abandoned") {
    for (const item of manifest.items) {
      if (item.roles.includes("response") || item.sources.includes("wrong_branch")) {
        if (item.resolved) refs.add(item.ref);
      }
      if (result === "abandoned" && (item.roles.includes("required") || item.roles.includes("new"))) {
        if (item.resolved) refs.add(item.ref);
      }
    }
  }
  return [...refs].sort((a, b) => a.localeCompare(b));
}
