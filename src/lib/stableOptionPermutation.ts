function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: number): number {
  let value = state || 0x9e3779b9;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

/**
 * Stable display-only permutation. Canonical option identity and scoring stay
 * untouched; only the visual order changes. Never call Math.random in render.
 */
export function stableOptionPermutation<T>(options: readonly T[], ...seedParts: Array<string | number>): T[] {
  const result = [...options];
  let state = hashSeed(seedParts.map(String).join("\u241f"));
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = nextRandom(state);
    const selected = state % (index + 1);
    [result[index], result[selected]] = [result[selected], result[index]];
  }
  return result;
}

export function stableCorrectOptionIndex(
  options: readonly string[],
  correctOptionId: string,
  ...seedParts: Array<string | number>
): number {
  return stableOptionPermutation(options, ...seedParts).indexOf(correctOptionId);
}
