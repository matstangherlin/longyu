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
}

export type Grade = "again" | "hard" | "good" | "easy";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

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
    intervalDays = 0;
    return { ...item, ease, intervalDays, reps, lapses, due: now + 10 * 60 * 1000, reviewedAt: now };
  }

  reps += 1;
  if (grade === "hard") ease = Math.max(1.3, ease - 0.18);
  if (grade === "good") ease = Math.max(1.3, ease + 0.02);
  if (grade === "easy") ease = ease + 0.18;

  if (grade === "hard") {
    const hardHours = domain ? DOMAIN_HARD_DELAY_HOURS[domain] : 12;
    intervalDays = reps <= 1 ? hardHours / 24 : Math.max(hardHours / 24, intervalDays * 0.65);
  } else if (reps === 1) intervalDays = grade === "easy" ? 3 : 1;
  else if (reps === 2) intervalDays = grade === "easy" ? 7 : 3;
  else intervalDays = intervalDays * ease;

  intervalDays = Math.max(grade === "hard" ? 0.25 : 1, Number((intervalDays * intervalWeight).toFixed(2)));
  return { ...item, ease, intervalDays, reps, lapses, due: now + intervalDays * DAY, reviewedAt: now };
}

export function isDue(item: SRSItem, now = Date.now()): boolean {
  return item.due <= now;
}

export function dueItems(items: Record<string, SRSItem>, now = Date.now()): SRSItem[] {
  const due = Object.values(items)
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

  return queue;
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
