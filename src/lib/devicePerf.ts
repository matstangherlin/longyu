/**
 * RC2.2.20 — tempos medidos NO APARELHO (sem SLA universal inventado).
 *
 * Cada marco guarda os ms desde o início da navegação (cold start = 0) ou a
 * abertura de uma área. /qa/device mostra os valores, grava a linha de base do
 * aparelho do owner e aponta regressão RELATIVA a essa base (não a um número
 * mágico). Sem PII: só nome do marco e ms.
 */
export const DEVICE_PERF_MARKS = [
  "first_interactive",
  "journey_open",
  "lesson_open",
  "review_open",
  "immersion_open",
  "atlas_open",
] as const;
export type DevicePerfMark = (typeof DEVICE_PERF_MARKS)[number];

/** Regressão grande = pior que a base por mais que este fator E por mais que o piso em ms. */
export const DEVICE_PERF_REGRESSION_FACTOR = 1.5;
export const DEVICE_PERF_REGRESSION_FLOOR_MS = 300;

export const DEVICE_PERF_BASELINE_KEY = "longyu:device-perf-baseline:v1";

const firstSeen = new Map<DevicePerfMark, number>();
const lastSeen = new Map<DevicePerfMark, number>();

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

/**
 * Marca a abertura de uma área. O 1º valor de cada marco é o "frio" (desde o
 * início do app); o último é o da abertura mais recente, medido a partir de
 * `startedAt` quando dado (ex.: toque que abriu a tela).
 */
export function markDevicePerf(mark: DevicePerfMark, startedAt?: number): void {
  const t = now();
  const value = Math.round(startedAt != null ? t - startedAt : t);
  if (!firstSeen.has(mark)) firstSeen.set(mark, Math.round(t));
  lastSeen.set(mark, value);
}

export function devicePerfSnapshot(): Record<DevicePerfMark, { cold: number | null; last: number | null }> {
  return Object.fromEntries(
    DEVICE_PERF_MARKS.map((mark) => [mark, { cold: firstSeen.get(mark) ?? null, last: lastSeen.get(mark) ?? null }])
  ) as Record<DevicePerfMark, { cold: number | null; last: number | null }>;
}

export type DevicePerfBaseline = Partial<Record<DevicePerfMark, number>>;

/** Só regressão grande e relativa à base do MESMO aparelho. */
export function devicePerfRegressions(current: DevicePerfBaseline, baseline: DevicePerfBaseline): DevicePerfMark[] {
  return DEVICE_PERF_MARKS.filter((mark) => {
    const base = baseline[mark];
    const value = current[mark];
    if (base == null || value == null) return false;
    return value > base * DEVICE_PERF_REGRESSION_FACTOR && value - base > DEVICE_PERF_REGRESSION_FLOOR_MS;
  });
}

export function loadDevicePerfBaseline(): DevicePerfBaseline | null {
  try {
    const raw = localStorage.getItem(DEVICE_PERF_BASELINE_KEY);
    return raw ? (JSON.parse(raw) as DevicePerfBaseline) : null;
  } catch {
    return null;
  }
}

export function saveDevicePerfBaseline(baseline: DevicePerfBaseline): void {
  try {
    localStorage.setItem(DEVICE_PERF_BASELINE_KEY, JSON.stringify(baseline));
  } catch {
    /* ignore */
  }
}

export function resetDevicePerfForTests(): void {
  firstSeen.clear();
  lastSeen.clear();
}
