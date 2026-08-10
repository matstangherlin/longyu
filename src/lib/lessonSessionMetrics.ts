/**
 * Contadores leves da tentativa atual de lição.
 * Alimentam telemetria de beta (hints / replays) sem acoplar cada step ao player.
 */

let audioReplays = 0;
let hintUses = 0;

export function noteAudioReplay(): void {
  audioReplays += 1;
}

export function noteHintUse(): void {
  hintUses += 1;
}

export function resetLessonSessionMetrics(): void {
  audioReplays = 0;
  hintUses = 0;
}

export function peekLessonSessionMetrics(): { audioReplays: number; hintUses: number } {
  return { audioReplays, hintUses };
}

/** Hash estável e sem PII para agregar formas não reconhecidas entre usuários. */
export function hashAnswerNorm(answer: string): string {
  const normalized = answer
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("zh-CN");
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
