import type { VocabDomain, VocabEntry, VocabLevel } from "./types";

export interface ExternalVocabularySeedEntry {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  domain?: VocabDomain;
  level?: VocabLevel;
  kind?: VocabEntry["kind"];
  freqRank?: number;
}

export interface VocabularyImportOptions {
  idPrefix?: string;
  defaultDomain?: VocabDomain;
  defaultLevel?: VocabLevel;
  defaultKind?: VocabEntry["kind"];
  limit?: number;
}

const DEFAULT_IMPORT_OPTIONS: Required<Omit<VocabularyImportOptions, "limit">> = {
  idPrefix: "f5k_vocab",
  defaultDomain: "sobrevivencia",
  defaultLevel: "advancedPreview",
  defaultKind: "word",
};

export function importVocabularySeed(
  seed: ExternalVocabularySeedEntry[],
  options: VocabularyImportOptions = {}
): VocabEntry[] {
  const config = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const rows = options.limit ? seed.slice(0, options.limit) : seed;

  return rows.map((entry, index) => ({
    id: `${config.idPrefix}_${entry.freqRank ?? index + 1}_${slug(entry.pinyin || entry.hanzi)}`,
    hanzi: entry.hanzi,
    pinyin: entry.pinyin,
    meaningPt: entry.meaningPt,
    domain: entry.domain ?? config.defaultDomain,
    level: entry.level ?? config.defaultLevel,
    kind: entry.kind ?? config.defaultKind,
    source: "first5000",
  }));
}

export function mergeVocabulary(curated: VocabEntry[], imported: VocabEntry[]): VocabEntry[] {
  const seen = new Set(curated.map((entry) => duplicateKey(entry)));
  const safeImported = imported.filter((entry) => {
    const key = duplicateKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...curated, ...safeImported];
}

function duplicateKey(entry: Pick<VocabEntry, "hanzi" | "meaningPt">): string {
  return `${entry.hanzi.trim()}::${entry.meaningPt.trim().toLocaleLowerCase("pt-BR")}`;
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "item";
}
