/**
 * RC2.3.3 — Culture visual registry.
 * Story beats resolve `CultureVisualId` through this registry (no external URLs).
 */

export const CULTURE_VISUAL_IDS = [
  "door-shoes",
  "shared-table",
  "chopsticks-table",
  "qr-till",
  "metro-door",
  "gift-hands",
  "hotel-desk",
  "bargain-stall",
  "festival-lantern",
  "history-timeline",
  "literature-scroll",
  "legend-mask",
  "symbol-mark",
  "scene-generic",
] as const;

export type CultureVisualId = (typeof CULTURE_VISUAL_IDS)[number];

export type CultureVisualKind = "scene" | "object" | "timeline" | "symbol" | "map" | "diagram";

export type CultureVisualDef = {
  id: CultureVisualId;
  kind: CultureVisualKind;
  labelPt: string;
  labelEn: string;
  /** Asset key when a dedicated SVG/PNG exists; null → ASSET_REQUIRED for flagships. */
  assetKey: string | null;
  /** Legacy emoji fallback — never counts as flagship visual coverage alone. */
  emojiFallback?: string;
};

export const CULTURE_VISUAL_REGISTRY: Record<CultureVisualId, CultureVisualDef> = {
  "door-shoes": {
    id: "door-shoes",
    kind: "scene",
    labelPt: "Entrada com sapatos",
    labelEn: "Entrance with shoes",
    assetKey: "culture/door-shoes",
    emojiFallback: "🚪",
  },
  "shared-table": {
    id: "shared-table",
    kind: "scene",
    labelPt: "Mesa compartilhada",
    labelEn: "Shared table",
    assetKey: "culture/shared-table",
    emojiFallback: "🍽️",
  },
  "chopsticks-table": {
    id: "chopsticks-table",
    kind: "object",
    labelPt: "Hashis na mesa",
    labelEn: "Chopsticks on the table",
    assetKey: "culture/chopsticks-table",
    emojiFallback: "🥢",
  },
  "qr-till": {
    id: "qr-till",
    kind: "object",
    labelPt: "QR no caixa",
    labelEn: "QR at the till",
    assetKey: "culture/qr-till",
    emojiFallback: "▦",
  },
  "metro-door": {
    id: "metro-door",
    kind: "scene",
    labelPt: "Porta do metrô",
    labelEn: "Metro door",
    assetKey: "culture/metro-door",
    emojiFallback: "🚇",
  },
  "gift-hands": {
    id: "gift-hands",
    kind: "object",
    labelPt: "Presente nas mãos",
    labelEn: "Gift in hands",
    assetKey: "culture/gift-hands",
    emojiFallback: "🎁",
  },
  "hotel-desk": {
    id: "hotel-desk",
    kind: "scene",
    labelPt: "Recepção do hotel",
    labelEn: "Hotel desk",
    assetKey: null,
    emojiFallback: "🏨",
  },
  "bargain-stall": {
    id: "bargain-stall",
    kind: "scene",
    labelPt: "Barraca de mercado",
    labelEn: "Market stall",
    assetKey: null,
    emojiFallback: "🛒",
  },
  "festival-lantern": {
    id: "festival-lantern",
    kind: "symbol",
    labelPt: "Lanterna de festival",
    labelEn: "Festival lantern",
    assetKey: null,
    emojiFallback: "🏮",
  },
  "history-timeline": {
    id: "history-timeline",
    kind: "timeline",
    labelPt: "Linha temporal",
    labelEn: "Timeline",
    assetKey: "culture/history-timeline",
  },
  "literature-scroll": {
    id: "literature-scroll",
    kind: "symbol",
    labelPt: "Rolo literário",
    labelEn: "Literature scroll",
    assetKey: null,
    emojiFallback: "📜",
  },
  "legend-mask": {
    id: "legend-mask",
    kind: "symbol",
    labelPt: "Máscara de lenda",
    labelEn: "Legend mask",
    assetKey: null,
    emojiFallback: "🐵",
  },
  "symbol-mark": {
    id: "symbol-mark",
    kind: "symbol",
    labelPt: "Símbolo",
    labelEn: "Symbol",
    assetKey: null,
    emojiFallback: "✦",
  },
  "scene-generic": {
    id: "scene-generic",
    kind: "scene",
    labelPt: "Cena",
    labelEn: "Scene",
    assetKey: null,
  },
};

export const LEGACY_VISUAL_IDS = [
  "door-shoes",
  "shared-table",
  "chopsticks-table",
  "qr-till",
  "metro-door",
  "gift-hands",
] as const;

export function resolveCultureVisual(id: string | undefined): CultureVisualDef | null {
  if (!id) return null;
  if (id in CULTURE_VISUAL_REGISTRY) {
    return CULTURE_VISUAL_REGISTRY[id as CultureVisualId];
  }
  return null;
}

export function isKnownCultureVisual(id: string | undefined): id is CultureVisualId {
  return Boolean(id && id in CULTURE_VISUAL_REGISTRY);
}

/** Flagship visuals need a registered assetKey (emoji-only = ASSET_REQUIRED). */
export function flagshipVisualCoverage(id: string | undefined): "ok" | "ASSET_REQUIRED" | "missing" {
  if (!id) return "missing";
  const def = resolveCultureVisual(id);
  if (!def) return "missing";
  if (!def.assetKey) return "ASSET_REQUIRED";
  return "ok";
}
