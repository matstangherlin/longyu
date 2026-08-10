/**
 * Contadores leves da tentativa atual de lição.
 * Nomes deliberadamente específicos: a cobertura ainda não é total.
 */

let audioManualPlays = 0;
let toneHintUses = 0;

/** Clique manual no SpeakButton (não inclui autoplay). */
export function noteAudioManualPlay(): void {
  audioManualPlays += 1;
}

/** Hint explícito do exercício de tom (“Estou travado · mostrar pinyin e tom”). */
export function noteToneHintUse(): void {
  toneHintUses += 1;
}

export function resetLessonSessionMetrics(): void {
  audioManualPlays = 0;
  toneHintUses = 0;
}

export function peekLessonSessionMetrics(): {
  audioManualPlays: number;
  toneHintUses: number;
} {
  return { audioManualPlays, toneHintUses };
}

function normalizeAnswerForHash(answer: string): string {
  return answer
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("zh-CN");
}

function toHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i += 1) {
    out += view[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Hash SHA-256 da forma normalizada.
 *
 * Não grava o texto no evento de nuvem, mas **não é anonimização forte**:
 * frases curtas de mandarim ainda são vulneráveis a dicionário. HMAC com
 * segredo só no backend fica para um passo seguinte, se o produto precisar
 * impedir reconstrução.
 */
export async function hashAnswerNorm(answer: string): Promise<string> {
  const normalized = normalizeAnswerForHash(answer);
  if (!globalThis.crypto?.subtle) {
    throw new Error("SHA-256 indisponível neste ambiente (crypto.subtle ausente).");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized)
  );
  return toHex(digest);
}
