import type { EconomyIntent } from "./economyTypes";

const QUEUE_KEY = "longyu:economy-intents";
const MAX_INTENTS = 40;

function readQueue(): EconomyIntent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EconomyIntent[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_INTENTS) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: EconomyIntent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_INTENTS)));
  } catch {
    /* quota */
  }
}

export function enqueueEconomyIntent(intent: Omit<EconomyIntent, "createdAt" | "attempts">): void {
  const queue = readQueue();
  if (queue.some((item) => item.idempotencyKey === intent.idempotencyKey)) return;
  queue.push({ ...intent, createdAt: Date.now(), attempts: 0 });
  writeQueue(queue);
}

export function listEconomyIntents(): EconomyIntent[] {
  return readQueue();
}

export function removeEconomyIntent(idempotencyKey: string): void {
  writeQueue(readQueue().filter((item) => item.idempotencyKey !== idempotencyKey));
}

export function bumpEconomyIntentAttempt(idempotencyKey: string): void {
  writeQueue(
    readQueue().map((item) =>
      item.idempotencyKey === idempotencyKey ? { ...item, attempts: item.attempts + 1 } : item
    )
  );
}

export function clearEconomyIntents(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}
