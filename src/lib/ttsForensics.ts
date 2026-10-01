/**
 * RC2.2.27 — ANDROID TTS FORENSICS (lógica pura, sem React; o gate executa).
 *
 * Duas perguntas antes de qualquer conclusão no aparelho:
 *   1. O build instalado é o código testado? PR HEAD · workflow HEAD · SHA
 *      embutido no APK · SHA instalado precisam bater. Divergiu → TEST_INVALID
 *      (nem PASS nem FAIL contra código que não estava instalado).
 *   2. A fala N tocou depois da fala N−1? Testes sequenciais, interrupção,
 *      toque duplo e diálogo simulado — cada linha com o ciclo de vida da
 *      request (sem texto). O owner confirma se OUVIU; código não é ouvido.
 */
import type { PlaybackOutcome } from "./audioPlayback";

export type BuildIdentityVerdict = "MATCH" | "TEST_INVALID" | "UNKNOWN";

export interface BuildIdentityInput {
  prHead?: string | null;
  workflowHead?: string | null;
  embeddedSha?: string | null;
  installedSha?: string | null;
}

const MIN_SHA = 7;

function norm(sha?: string | null): string | null {
  const value = String(sha ?? "").trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(value) ? value : null;
}

/** Dois SHAs batem se um é prefixo do outro (≥ 7 caracteres). */
export function shaMatches(a?: string | null, b?: string | null): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length);
  return n >= MIN_SHA && x.slice(0, n) === y.slice(0, n);
}

/**
 * Os quatro precisam bater. Faltando PR HEAD ou SHA instalado → UNKNOWN
 * (não dá para aceitar o teste). Qualquer divergência → TEST_INVALID.
 */
export function buildIdentityVerdict(input: BuildIdentityInput): BuildIdentityVerdict {
  const known = [input.prHead, input.workflowHead, input.embeddedSha, input.installedSha].map(norm);
  if (!known[0] || !known[3]) return "UNKNOWN";
  const present = known.filter((value): value is string => Boolean(value));
  for (const value of present) if (!shaMatches(value, known[0])) return "TEST_INVALID";
  return "MATCH";
}

/** Um teste físico só é aceito (PASS ou FAIL) com o build confirmado. */
export function physicalResultAcceptable(verdict: BuildIdentityVerdict): boolean {
  return verdict === "MATCH";
}

// ── Testes sequenciais ─────────────────────────────────────────────────────

export interface SequentialProbeRow {
  index: number;
  requestId: string;
  started: boolean;
  ended: boolean;
  superseded: boolean;
  reason: string | null;
  /** O motor confirmou E terminou: PASS de código (o owner confirma se ouviu). */
  result: "PASS" | "FAIL";
}

export function probeRow(index: number, requestId: string, outcome: Pick<PlaybackOutcome, "started" | "ended" | "superseded" | "reason">): SequentialProbeRow {
  const pass = outcome.started && outcome.ended && !outcome.superseded;
  return { index, requestId, started: outcome.started, ended: outcome.ended, superseded: outcome.superseded, reason: outcome.reason, result: pass ? "PASS" : "FAIL" };
}

export type SpeakForProbe = (index: number) => { requestId: string; done: Promise<Pick<PlaybackOutcome, "started" | "ended" | "superseded" | "reason">> };

/** A → DONE → B → DONE → … : a próxima fala só começa depois do fim da anterior. */
export async function runSequentialProbe(count: number, speakOne: SpeakForProbe, onRow?: (row: SequentialProbeRow) => void): Promise<SequentialProbeRow[]> {
  const rows: SequentialProbeRow[] = [];
  for (let index = 1; index <= count; index += 1) {
    const handle = speakOne(index);
    const row = probeRow(index, handle.requestId, await handle.done);
    rows.push(row);
    onRow?.(row);
  }
  return rows;
}

/**
 * A → (interrompe) → B: A precisa terminar SUPERSEDED/sem fim natural e B
 * precisa tocar inteira. É a sequência de "Continuar rápido" na conversa.
 */
export async function runInterruptionProbe(speakOne: SpeakForProbe, gapMs: number, wait: (ms: number) => Promise<void>): Promise<{ first: SequentialProbeRow; second: SequentialProbeRow; result: "PASS" | "FAIL" }> {
  const a = speakOne(1);
  await wait(gapMs);
  const b = speakOne(2);
  const [outA, outB] = await Promise.all([a.done, b.done]);
  const first = probeRow(1, a.requestId, outA);
  const second = probeRow(2, b.requestId, outB);
  const aInterrupted = outA.superseded || !outA.ended;
  return { first, second, result: aInterrupted && second.result === "PASS" ? "PASS" : "FAIL" };
}

export function sequentialVerdict(rows: readonly SequentialProbeRow[], expected: number): { passed: number; total: number; result: "PASS" | "FAIL" } {
  const passed = rows.filter((row) => row.result === "PASS").length;
  return { passed, total: expected, result: rows.length === expected && passed === expected ? "PASS" : "FAIL" };
}

/** Frases neutras do teste (números): o diagnóstico nunca registra o texto. */
export const PROBE_PHRASES = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

export function probePhrase(index: number): string {
  return PROBE_PHRASES[(index - 1) % PROBE_PHRASES.length];
}
