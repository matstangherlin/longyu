// SRS por domínio. O mesmo item tem agendas independentes para som, fala,
// significado, forma, uso, pinyin e leitura.
import type { ItemType } from "../data/types";
import type { DomainTrack } from "../data/domains";

export type ReviewDomain = "som" | "fala" | "significado" | "forma" | "uso" | "pinyin" | "leitura";

export interface SRSItem {
  id: string; // chave única: `${type}:${itemId}`
  type: ItemType;
  itemId: string;
  /** Competência que alimentou este item. Itens antigos podem não ter. */
  track?: DomainTrack;
  /** Habilidade revisada separadamente dentro do item. */
  reviewDomain?: ReviewDomain;
  ease: number; // fator de facilidade (>= 1.3)
  intervalDays: number; // intervalo atual
  due: number; // timestamp (ms) do próximo vencimento
  reps: number; // revisões corretas seguidas
  lapses: number;
  createdAt: number;
  reviewedAt?: number;
  /** QA 2026-10 · R3 — intervalo que o item tinha antes do último lapso (dias). */
  lapseIntervalDays?: number;
  /** QA 2026-10 · R3 — "sanguessuga": errou LEECH_LAPSES vezes; sai da fila normal. */
  leech?: boolean;
  /** QA 2026-10 · R1 — dia local (YYYY-MM-DD) da última promoção. */
  lastPromotedDay?: string;
}

export type Grade = "again" | "hard" | "good" | "easy";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** QA 2026-10 · R3 — nenhum item some por mais de um ano. */
export const MAX_INTERVAL_DAYS = 365;
/** QA 2026-10 · R3 — teto do fator de facilidade (o piso continua 1,25 / 1,3). */
export const MAX_EASE = 2.8;
/**
 * QA 2026-10 · R3 — lapso não zera o histórico: depois do `again` o item
 * reaprende com os passos curtos e, ao graduar de novo, volta com
 * `max(1, intervaloAnterior × LAPSE_INTERVAL_FACTOR)` dias.
 */
export const LAPSE_INTERVAL_FACTOR = 0.5;
/** QA 2026-10 · R3 — lapsos até marcar o item como sanguessuga (leech). */
export const LEECH_LAPSES = 8;
/** QA 2026-10 · R3 — acertos seguidos na remediação para sair do leech. */
export const LEECH_RELEASE_REPS = 2;

/** Dia local do calendário (YYYY-MM-DD), a mesma regra de `todayKey`. */
function localDayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * QA 2026-10 · R1 (LGY-015) — o item já foi promovido hoje? A lição usa isso
 * para que 4 passes no mesmo dia rendam no máximo uma promoção.
 */
export function promotedToday(item: SRSItem | undefined, now = Date.now()): boolean {
  return Boolean(item?.lastPromotedDay) && item?.lastPromotedDay === localDayKey(now);
}

/** Resultado de uma etapa da lição, do ponto de vista da evidência. */
export interface LessonStepEvidence {
  /** A etapa avaliou resposta (não é só apresentação). */
  graded: boolean;
  correct?: boolean;
  /** Pediu ajuda ou usou tentativa protegida (retry). */
  assisted?: boolean;
}

/**
 * QA 2026-10 · R1 (LGY-015) — nota que a lição dá ao item. `null` = só
 * exposição: o item nasce/fica em aprendizado, sem promoção. Erro também é
 * `null` aqui: o `again` vem dos alvos de revisão do erro.
 */
export function lessonEvidenceGrade(evidence: LessonStepEvidence | undefined): Grade | null {
  if (!evidence?.graded || evidence.correct !== true) return null;
  return evidence.assisted ? "hard" : "good";
}

function capEase(ease: number): number {
  return Math.min(MAX_EASE, ease);
}

function capInterval(days: number): number {
  return Math.min(MAX_INTERVAL_DAYS, days);
}

/** Sai do leech depois de LEECH_RELEASE_REPS acertos seguidos. */
function leechAfter(item: SRSItem, reps: number): boolean | undefined {
  if (!item.leech) return item.leech;
  return reps < LEECH_RELEASE_REPS;
}

const INITIAL_DOMAIN_DELAY_MIN: Record<ReviewDomain, number> = {
  som: 0,
  significado: 0,
  fala: 30,
  pinyin: 45,
  forma: 60,
  uso: 120,
  leitura: 240,
};

const DOMAIN_PRIORITY: Record<ReviewDomain, number> = {
  fala: 6,
  som: 5,
  pinyin: 4.5,
  uso: 4,
  leitura: 3,
  forma: 2,
  significado: 1,
};

const DOMAIN_HARD_DELAY_HOURS: Record<ReviewDomain, number> = {
  som: 6,
  fala: 6,
  pinyin: 8,
  significado: 12,
  forma: 12,
  uso: 8,
  leitura: 18,
};

const DOMAIN_INTERVAL_WEIGHT: Record<ReviewDomain, number> = {
  som: 0.85,
  fala: 0.8,
  pinyin: 0.9,
  significado: 1,
  forma: 1,
  uso: 0.9,
  leitura: 1.15,
};

export interface NewSrsItemOptions {
  track?: DomainTrack;
  reviewDomain?: ReviewDomain;
  now?: number;
}

export function makeKey(type: ItemType, itemId: string, reviewDomain?: ReviewDomain): string {
  return reviewDomain ? `${type}:${itemId}:${reviewDomain}` : `${type}:${itemId}`;
}

export function newItem(
  type: ItemType,
  itemId: string,
  trackOrNow?: DomainTrack | number | NewSrsItemOptions,
  nowArg?: number
): SRSItem {
  const options = typeof trackOrNow === "object" ? trackOrNow : undefined;
  const track = typeof trackOrNow === "string" ? trackOrNow : options?.track;
  const reviewDomain = options?.reviewDomain;
  const now = typeof trackOrNow === "number" ? trackOrNow : options?.now ?? nowArg ?? Date.now();

  return {
    id: makeKey(type, itemId, reviewDomain),
    type,
    itemId,
    track,
    reviewDomain,
    ease: 2.5,
    intervalDays: 0,
    due: now + (reviewDomain ? INITIAL_DOMAIN_DELAY_MIN[reviewDomain] : 0) * 60 * 1000,
    reps: 0,
    lapses: 0,
    createdAt: now,
  };
}

/** Aplica uma nota e devolve o item atualizado (imutável). */
export function review(item: SRSItem, grade: Grade, now = Date.now()): SRSItem {
  let { ease, intervalDays, reps, lapses } = item;
  const domain = item.reviewDomain;
  const intervalWeight = domain ? DOMAIN_INTERVAL_WEIGHT[domain] : 1;

  if (grade === "again") {
    reps = 0;
    lapses += 1;
    ease = Math.max(1.25, ease - 0.3);
    // Guarda o intervalo de antes do lapso (um item que já estava reaprendendo
    // mantém o que tinha) para graduar de volta numa fração dele.
    const lapseIntervalDays = intervalDays > 0 ? intervalDays : item.lapseIntervalDays;
    intervalDays = 0;
    const leech = item.leech || lapses >= LEECH_LAPSES;
    return { ...item, ease, intervalDays, reps, lapses, lapseIntervalDays, leech, due: now + 10 * 60 * 1000, reviewedAt: now };
  }
  const promotedDay = localDayKey(now);

  // Fase de aprendizado: item que ainda não graduou para um intervalo de dia
  // (novo ou que voltou a zero após "again"). Passos intra-dia em vez de pular
  // direto para 1 dia: hard repete o passo em 10 min sem avançar a graduação;
  // somente "good" conta — o 1º agenda 1 h, o 2º (ou "easy") gradua para um
  // intervalo de dia.
  const inLearning = intervalDays === 0;

  if (inLearning) {
    if (grade === "hard") {
      // Hard não incrementa reps: só good avança os passos de aprendizado.
      ease = Math.max(1.3, ease - 0.18);
      return { ...item, ease, intervalDays: 0, reps, lapses, due: now + 10 * 60 * 1000, reviewedAt: now };
    }
    reps += 1;
    const leech = leechAfter(item, reps);
    if (grade === "easy") {
      ease = capEase(ease + 0.18);
      intervalDays = Math.max(1, Number((3 * intervalWeight).toFixed(2)));
    } else {
      ease = capEase(Math.max(1.3, ease + 0.02));
      if (reps === 1) {
        return { ...item, ease, intervalDays: 0, reps, lapses, leech, due: now + 60 * 60 * 1000, reviewedAt: now, lastPromotedDay: promotedDay };
      }
      intervalDays = Math.max(1, Number((1 * intervalWeight).toFixed(2)));
    }
    // Reaprendendo depois de um lapso: volta numa fração do intervalo anterior.
    if (item.lapseIntervalDays && item.lapseIntervalDays > 0) {
      intervalDays = Math.max(intervalDays, Math.round(item.lapseIntervalDays * LAPSE_INTERVAL_FACTOR));
    }
    intervalDays = capInterval(intervalDays);
    return {
      ...item,
      ease,
      intervalDays,
      reps,
      lapses,
      leech,
      lapseIntervalDays: undefined,
      due: now + intervalDays * DAY,
      reviewedAt: now,
      lastPromotedDay: promotedDay,
    };
  }

  reps += 1;
  if (grade === "hard") ease = Math.max(1.3, ease - 0.18);
  if (grade === "good") ease = capEase(Math.max(1.3, ease + 0.02));
  if (grade === "easy") ease = capEase(ease + 0.18);

  if (grade === "hard") {
    const hardHours = domain ? DOMAIN_HARD_DELAY_HOURS[domain] : 12;
    intervalDays = reps <= 1 ? hardHours / 24 : Math.max(hardHours / 24, intervalDays * 0.65);
  } else if (reps === 1) intervalDays = grade === "easy" ? 3 : 1;
  else if (reps === 2) intervalDays = grade === "easy" ? 7 : 3;
  else intervalDays = intervalDays * ease;

  intervalDays = capInterval(Math.max(grade === "hard" ? 0.25 : 1, Number((intervalDays * intervalWeight).toFixed(2))));
  const leech = leechAfter(item, reps);
  const lastPromotedDay = grade === "hard" ? item.lastPromotedDay : promotedDay;
  return { ...item, ease, intervalDays, reps, lapses, leech, due: now + intervalDays * DAY, reviewedAt: now, lastPromotedDay };
}

export function isDue(item: SRSItem, now = Date.now()): boolean {
  return item.due <= now;
}

export function isSrsItem(value: unknown): value is SRSItem {
  return Boolean(value) && typeof value === "object" && typeof (value as SRSItem).due === "number";
}

/** QA 2026-10 · R3 — itens sanguessuga, para "Palavras difíceis" (mais lapsos primeiro). */
export function leechItems(items: Record<string, SRSItem> | null | undefined): SRSItem[] {
  return Object.values(items ?? {})
    .filter(isSrsItem)
    .filter((it) => it.leech === true)
    .sort((a, b) => b.lapses - a.lapses || (b.reviewedAt ?? b.createdAt) - (a.reviewedAt ?? a.createdAt));
}

export function dueItems(items: Record<string, SRSItem> | null | undefined, now = Date.now()): SRSItem[] {
  const due = Object.values(items ?? {})
    .filter(isSrsItem)
    // Leech sai da fila normal: volta pela remediação de "Palavras difíceis".
    .filter((it) => it.leech !== true)
    .filter((it) => isDue(it, now))
    .sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now));

  const groups = new Map<string, SRSItem[]>();
  for (const item of due) {
    const key = `${item.type}:${item.itemId}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const queue: SRSItem[] = [];
  while (groups.size > 0) {
    const keys = [...groups.keys()].sort((a, b) => {
      const left = groups.get(a)?.[0];
      const right = groups.get(b)?.[0];
      if (!left || !right) return 0;
      return reviewPriority(right, now) - reviewPriority(left, now);
    });

    for (const key of keys) {
      const group = groups.get(key);
      if (!group?.length) {
        groups.delete(key);
        continue;
      }
      queue.push(group.shift()!);
      if (group.length === 0) groups.delete(key);
    }
  }

  return spaceReviewFamilies(queue);
}

/**
 * V3.9 · VAR-016 — espaça famílias iguais na fila de revisão.
 *
 * O intercalamento acima só evita o mesmo ITEM em sequência; a família passava
 * batida. Depois de uma lição de Hànzì todos os caracteres vencem juntos e a
 * revisão virava um bloco de Hànzì — a repetição percebida que o QA relatou,
 * atravessando lição → revisão → lição.
 *
 * A reordenação é conservadora: mantém a prioridade e só adia um item quando
 * existe alternativa de outra família logo à frente. Nada é removido.
 */
const FAMILY_COOLDOWN = 2;

function reviewFamilyOf(item: SRSItem): string {
  if (item.type === "radical") return "hanzi";
  if (item.type === "char") return item.reviewDomain === "forma" ? "hanzi" : "char";
  return item.reviewDomain ?? "chunk";
}

export function spaceReviewFamilies(queue: readonly SRSItem[]): SRSItem[] {
  if (queue.length <= FAMILY_COOLDOWN) return [...queue];
  const remaining = [...queue];
  const spaced: SRSItem[] = [];
  const recent: string[] = [];

  while (remaining.length > 0) {
    let pick = remaining.findIndex((item) => !recent.includes(reviewFamilyOf(item)));
    // Nenhuma alternativa: mantém a ordem de prioridade em vez de forçar.
    if (pick < 0) pick = 0;
    const [chosen] = remaining.splice(pick, 1);
    spaced.push(chosen);
    recent.unshift(reviewFamilyOf(chosen));
    recent.length = Math.min(recent.length, FAMILY_COOLDOWN);
  }

  return spaced;
}

export function reviewPriority(item: SRSItem, now = Date.now()): number {
  const overdueHours = Math.max(0, (now - item.due) / (60 * 60 * 1000));
  const domain = item.reviewDomain ? DOMAIN_PRIORITY[item.reviewDomain] : 1;
  const lapseWeight = item.lapses * 10;
  const newWeight = item.reps === 0 ? 3 : 0;
  const fragileWeight = Math.max(0, 3 - item.reps);
  const shortIntervalWeight = item.intervalDays > 0 && item.intervalDays < 1 ? 2 : 0;
  return overdueHours * 0.25 + domain + lapseWeight + newWeight + fragileWeight + shortIntervalWeight;
}

export function describeNextDue(item: SRSItem, now = Date.now()): string {
  const diff = item.due - now;
  if (diff <= 0) return "agora";
  const minutes = Math.round(diff / (60 * 1000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(diff / HOUR);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(diff / DAY);
  return `${days} d`;
}
