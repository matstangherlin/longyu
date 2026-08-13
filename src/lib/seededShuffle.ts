/**
 * Shuffle determinístico por seed (PED-015).
 * Mesma seed → mesma ordem; nova tentativa → nova seed.
 */

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 — PRNG simples e estável. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const arr = [...items];
  if (arr.length <= 1) return arr;
  const rand = mulberry32(typeof seed === "number" ? seed >>> 0 : hashSeed(seed));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Embaralha evitando coincidir exatamente com a ordem-alvo.
 * Até `maxAttempts` reshuffles determinísticos com saltos na seed.
 */
export function seededShuffleAvoidingOrder<T>(
  items: readonly T[],
  seed: string | number,
  targetOrder: readonly T[],
  getValue: (item: T) => string = (item) => String(item),
  maxAttempts = 5
): T[] {
  if (items.length <= 1) return [...items];
  const targetKey = targetOrder.map(getValue).join("\0");
  let next = seededShuffle(items, seed);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const key = next.map(getValue).join("\0");
    if (key !== targetKey) return next;
    next = seededShuffle(items, `${typeof seed === "string" ? seed : seed}:reshuffle:${attempt + 1}`);
  }
  // Último recurso: rotação fixa se ainda coincidir.
  if (next.map(getValue).join("\0") === targetKey && next.length > 1) {
    return [...next.slice(1), next[0]];
  }
  return next;
}
