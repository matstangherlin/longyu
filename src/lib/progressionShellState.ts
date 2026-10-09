/**
 * RC2.3.13E — independent Journey / Culture progression positions.
 * Prefer node anchors over a single shared scroll offset.
 *
 * SYSTEM: ProgressionShell navigation-state preservation
 * SCOPE: UX_NAVIGATION_ONLY
 * PEDAGOGICAL_AUTHORITY: NONE
 *
 * May remember route / anchor / scroll / last mode.
 * Must NOT unlock Mandarin lessons, Mastery, SRS, grading, XP, or economy.
 * Canonical freeze: RC2_3_13E_PROGRESSION_SHELL_EXCEPTION + BETA_PEDAGOGY_FREEZE.systemModules.
 */

export type ProgressionMode = "journey" | "culture";

const KEYS = {
  journeyAnchor: "longyu.progression.journeyAnchor",
  cultureAnchor: "longyu.progression.cultureAnchor",
  journeyScroll: "longyu.progression.journeyScroll",
  cultureScroll: "longyu.progression.cultureScroll",
  cultureFirstGuide: "longyu.progression.cultureFirstGuideSeen",
  openOrigin: "longyu.progression.openOrigin",
  /** Last progression mode before a segmented switch (RC2.3.13R enter direction). */
  lastMode: "longyu.progression.lastMode",
} as const;

export type ProgressionOpenOrigin =
  | "journey"
  | "culture"
  | "atlas"
  | "mastery"
  | "home"
  | "deep_link";

function storage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function readProgressionAnchor(mode: ProgressionMode): string | null {
  const s = storage();
  if (!s) return null;
  const key = mode === "journey" ? KEYS.journeyAnchor : KEYS.cultureAnchor;
  return s.getItem(key);
}

export function writeProgressionAnchor(mode: ProgressionMode, anchor: string | null): void {
  const s = storage();
  if (!s) return;
  const key = mode === "journey" ? KEYS.journeyAnchor : KEYS.cultureAnchor;
  if (!anchor) s.removeItem(key);
  else s.setItem(key, anchor);
}

export function readProgressionScroll(mode: ProgressionMode): number {
  const s = storage();
  if (!s) return 0;
  const key = mode === "journey" ? KEYS.journeyScroll : KEYS.cultureScroll;
  const n = Number(s.getItem(key) ?? "0");
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function writeProgressionScroll(mode: ProgressionMode, y: number): void {
  const s = storage();
  if (!s) return;
  const key = mode === "journey" ? KEYS.journeyScroll : KEYS.cultureScroll;
  s.setItem(key, String(Math.max(0, Math.round(y))));
}

export function readCultureFirstGuideSeen(): boolean {
  const s = storage();
  return s?.getItem(KEYS.cultureFirstGuide) === "1";
}

export function writeCultureFirstGuideSeen(): void {
  storage()?.setItem(KEYS.cultureFirstGuide, "1");
}

export function writeProgressionOpenOrigin(origin: ProgressionOpenOrigin): void {
  storage()?.setItem(KEYS.openOrigin, origin);
}

export function readProgressionOpenOrigin(): ProgressionOpenOrigin | null {
  const v = storage()?.getItem(KEYS.openOrigin);
  if (
    v === "journey" ||
    v === "culture" ||
    v === "atlas" ||
    v === "mastery" ||
    v === "home" ||
    v === "deep_link"
  ) {
    return v;
  }
  return null;
}

export function progressionModeFromPath(pathname: string): ProgressionMode | null {
  if (pathname === "/jornada" || pathname.startsWith("/jornada/")) return "journey";
  if (pathname === "/cultura" || pathname.startsWith("/cultura/")) return "culture";
  return null;
}

export function writeProgressionLastMode(mode: ProgressionMode): void {
  storage()?.setItem(KEYS.lastMode, mode);
}

export function readProgressionLastMode(): ProgressionMode | null {
  const v = storage()?.getItem(KEYS.lastMode);
  return v === "journey" || v === "culture" ? v : null;
}

/** Enter direction for Journey ↔ Culture panel motion (spatial: Jornada left, Cultura right). */
export function progressionEnterDirection(
  mode: ProgressionMode,
  from: ProgressionMode | null,
): "from-left" | "from-right" | "none" {
  if (!from || from === mode) return "none";
  if (from === "journey" && mode === "culture") return "from-right";
  if (from === "culture" && mode === "journey") return "from-left";
  return "none";
}
