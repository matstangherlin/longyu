/**
 * Pedagogia V3.7 — Lexical Unit Registry (LEX-032/033/035).
 * Não duplica CHUNKS/CHARACTERS: referencia e classifica.
 */

import { CHUNKS } from "./chunks";
import { CHARACTERS } from "./characters";
import { VOCABULARY } from "./vocabulary";
import type { LexicalTier } from "./lexicalGoals";
import { LEXICAL_TIER_LABELS } from "./lexicalGoals";
import { LEXICAL_LIFECYCLE_V37_EXTRA } from "./lexicalLifecycleEntries";
import { SLOT_PATTERNS } from "./slotPatterns";
import { WORD_FAMILIES } from "./wordLayer";
import common5000 from "./corpus/common5000.json";

export type LexicalUnitType = "character" | "word" | "chunk" | "pattern";

export interface LexicalUnit {
  ref: string;
  type: LexicalUnitType;
  hanzi: string;
  pinyin: string;
  meaning: string;
  domain: string;
  tier: LexicalTier;
  productivePriority: number;
  communicativeFunctions: string[];
  prerequisites: string[];
  relatedCharacters: string[];
  relatedWords: string[];
  frequencyRank?: number;
  wordFamily?: string[];
}

export interface LexicalMetricsBreakdown {
  uniqueCharacters: number;
  uniqueWords: number;
  uniqueChunks: number;
  productiveUnits: number;
  receptiveUnits: number;
  patterns: number;
}

type Common5000Row = { character: string; pinyin: string; meaningEn: string; rank: number };

const COMMON_5000 = common5000 as Common5000Row[];
const commonRankByChar = new Map(COMMON_5000.map((row) => [row.character, row.rank]));

const SEED_REFS = new Set([
  "chunk:nihao",
  "chunk:nihaoma",
  "chunk:wohenhao",
  "chunk:xiexie",
  "chunk:bukeqi",
  "chunk:zaijian",
  "chunk:nine",
  "chunk:women",
]);

const SURVIVAL_HINTS = /sobreviv|survival|reparo|pedir|ajuda|医院|病|听不懂|再说|多少钱|地铁|酒店|护照|买单|票/;
const FUNCTIONAL_HINTS = /transporte|lugar|direc|hotel|pagamento|aeroporto|cidade|china_real/;
const DAILY_HINTS = /familia|comida|bebida|rotina|estudo|trabalho|gostos|tempo|clima/;
const SOCIAL_HINTS = /frase_social|prefer|plan|convite|opini/;

function tierForChunk(domain: string, level: string, ref: string, hanzi: string): LexicalTier {
  if (SEED_REFS.has(ref) || level === "seed") return "T0_seed";
  const blob = `${domain} ${level} ${hanzi}`;
  if (SURVIVAL_HINTS.test(blob) || level === "survival") return "T1_survival";
  if (DAILY_HINTS.test(blob)) return "T2_daily";
  if (FUNCTIONAL_HINTS.test(blob)) return "T3_functional_china";
  if (SOCIAL_HINTS.test(blob)) return "T4_social";
  if (level === "elementary") return "T2_daily";
  return "T5_extended";
}

function charactersInHanzi(hanzi: string): string[] {
  return [...hanzi].filter((ch) => /[\u4e00-\u9fff]/.test(ch));
}

function usefulnessScore(opts: {
  frequencyRank?: number;
  wordCount: number;
  chunkCount: number;
  survival: boolean;
  productive: boolean;
}): number {
  const freq = opts.frequencyRank ? Math.max(0, 100 - Math.log10(opts.frequencyRank + 1) * 20) : 10;
  return (
    freq +
    opts.wordCount * 8 +
    opts.chunkCount * 12 +
    (opts.survival ? 25 : 0) +
    (opts.productive ? 15 : 0)
  );
}

function buildCharIndex() {
  const wordsByChar = new Map<string, string[]>();
  const chunksByChar = new Map<string, string[]>();
  for (const chunk of CHUNKS) {
    for (const ch of charactersInHanzi(chunk.hanzi)) {
      const list = chunksByChar.get(ch) ?? [];
      list.push(`chunk:${chunk.id}`);
      chunksByChar.set(ch, list);
    }
  }
  for (const character of CHARACTERS) {
    const examples = character.exampleWords ?? [];
    for (const example of examples) {
      for (const ch of charactersInHanzi(example.hanzi)) {
        const list = wordsByChar.get(ch) ?? [];
        list.push(example.hanzi);
        wordsByChar.set(ch, list);
      }
    }
  }
  for (const word of VOCABULARY.filter((v) => v.kind === "word")) {
    for (const ch of charactersInHanzi(word.hanzi)) {
      const list = wordsByChar.get(ch) ?? [];
      if (!list.includes(word.hanzi)) list.push(word.hanzi);
      wordsByChar.set(ch, list);
    }
  }
  for (const family of WORD_FAMILIES) {
    const list = wordsByChar.get(family.rootChar) ?? [];
    for (const w of family.words) {
      if (!list.includes(w)) list.push(w);
    }
    wordsByChar.set(family.rootChar, list);
  }
  return { wordsByChar, chunksByChar };
}

const { wordsByChar, chunksByChar } = buildCharIndex();

export function buildLexicalRegistry(): LexicalUnit[] {
  const units: LexicalUnit[] = [];

  for (const character of CHARACTERS) {
    const ref = `char:${character.id}`;
    const relatedChunks = chunksByChar.get(character.hanzi) ?? [];
    const relatedWords = wordsByChar.get(character.hanzi) ?? [];
    const rank = character.freqRank ?? commonRankByChar.get(character.hanzi);
    const survival = relatedChunks.some((id) => /ditie|yiyuan|duoshao|huzhao|tingbudong|maidan/.test(id));
    units.push({
      ref,
      type: "character",
      hanzi: character.hanzi,
      pinyin: character.pinyin,
      meaning: character.meaningPt,
      domain: "character",
      tier: rank && rank <= 100 ? "T1_survival" : rank && rank <= 500 ? "T2_daily" : "T6_atlas_reference",
      productivePriority: usefulnessScore({
        frequencyRank: rank,
        wordCount: relatedWords.length,
        chunkCount: relatedChunks.length,
        survival,
        productive: relatedChunks.length > 0,
      }),
      communicativeFunctions: relatedChunks.length ? ["supports-words"] : ["reference"],
      prerequisites: [],
      relatedCharacters: [],
      relatedWords: relatedWords.slice(0, 8),
      frequencyRank: rank,
      wordFamily: WORD_FAMILIES.find((item) => item.rootChar === character.hanzi)?.words,
    });
  }

  const seenWordHanzi = new Set<string>();
  for (const word of VOCABULARY.filter((v) => v.kind === "word")) {
    const hanzi = word.hanzi.replace(/[？?！!。]/g, "");
    if (!hanzi || seenWordHanzi.has(hanzi)) continue;
    seenWordHanzi.add(hanzi);
    const chars = charactersInHanzi(hanzi);
    const relatedChunks = chars.flatMap((ch) => chunksByChar.get(ch) ?? []).slice(0, 6);
    units.push({
      ref: `word:${word.id}`,
      type: "word",
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      meaning: word.meaningPt,
      domain: word.domain,
      tier:
        word.level === "seed"
          ? "T0_seed"
          : word.level === "survival"
            ? "T1_survival"
            : word.level === "beginner" || word.level === "elementary"
              ? "T2_daily"
              : "T5_extended",
      productivePriority: usefulnessScore({
        frequencyRank: Math.min(...chars.map((ch) => commonRankByChar.get(ch) ?? 4000)),
        wordCount: 1,
        chunkCount: relatedChunks.length,
        survival: word.level === "survival",
        productive: relatedChunks.length > 0 || hanzi.length >= 2,
      }),
      communicativeFunctions: [word.domain],
      prerequisites: chars.map((ch) => {
        const found = CHARACTERS.find((c) => c.hanzi === ch);
        return found ? `char:${found.id}` : `char:?${ch}`;
      }),
      relatedCharacters: chars,
      relatedWords: (wordsByChar.get(chars[0] ?? "") ?? []).slice(0, 6),
      frequencyRank: Math.min(...chars.map((ch) => commonRankByChar.get(ch) ?? 9999)),
    });
  }

  for (const chunk of CHUNKS) {
    const ref = `chunk:${chunk.id}`;
    const chars = charactersInHanzi(chunk.hanzi);
    const isMulti = chars.length > 1;
    const domain = chunk.domain ?? "geral";
    const level = chunk.level ?? "elementary";
    const tags = chunk.tags ?? [];
    units.push({
      ref,
      type: isMulti ? "chunk" : "word",
      hanzi: chunk.hanzi,
      pinyin: chunk.pinyin,
      meaning: chunk.meaningPt,
      domain,
      tier: tierForChunk(domain, level, ref, chunk.hanzi),
      productivePriority: usefulnessScore({
        frequencyRank: Math.min(...chars.map((ch) => commonRankByChar.get(ch) ?? 5000)),
        wordCount: chars.length,
        chunkCount: 1,
        survival: level === "survival" || /survival|sobreviv/.test(tags.join(" ")),
        productive: true,
      }),
      communicativeFunctions: tags,
      prerequisites: chars.map((ch) => {
        const found = CHARACTERS.find((c) => c.hanzi === ch);
        return found ? `char:${found.id}` : `char:?${ch}`;
      }),
      relatedCharacters: chars,
      relatedWords: [],
      frequencyRank: Math.min(...chars.map((ch) => commonRankByChar.get(ch) ?? 9999)),
    });
  }

  for (const pattern of SLOT_PATTERNS) {
    units.push({
      ref: `pattern:${pattern.id}`,
      type: "pattern",
      hanzi: pattern.pattern,
      pinyin: "",
      meaning: pattern.glossPt,
      domain: pattern.packet ?? "pattern",
      tier: "T2_daily",
      productivePriority: 40 + pattern.exampleFills.length * 5,
      communicativeFunctions: [pattern.communicativeFunction],
      prerequisites: [],
      relatedCharacters: [],
      relatedWords: pattern.exampleFills,
    });
  }

  // LEX-054 — classificar o corpus amplo no Atlas (T6 reference), sem jogar na Jornada.
  const knownChars = new Set(units.filter((u) => u.type === "character").map((u) => u.hanzi));
  for (const row of COMMON_5000) {
    if (knownChars.has(row.character)) continue;
    const chunkHits = chunksByChar.get(row.character) ?? [];
    const wordHits = wordsByChar.get(row.character) ?? [];
    const tier: LexicalTier =
      row.rank <= 200
        ? "T5_extended"
        : "T6_atlas_reference";
    units.push({
      ref: `corpus:${row.rank}:${row.character}`,
      type: "character",
      hanzi: row.character,
      pinyin: row.pinyin,
      meaning: row.meaningEn,
      domain: "corpus5000",
      tier,
      productivePriority: usefulnessScore({
        frequencyRank: row.rank,
        wordCount: wordHits.length,
        chunkCount: chunkHits.length,
        survival: false,
        productive: chunkHits.length > 0,
      }),
      communicativeFunctions: chunkHits.length ? ["supports-chunks"] : ["atlas-reference"],
      prerequisites: [],
      relatedCharacters: [],
      relatedWords: wordHits.slice(0, 6),
      frequencyRank: row.rank,
    });
    knownChars.add(row.character);
  }

  return units;
}

export function metricsFromRegistry(units: LexicalUnit[]): LexicalMetricsBreakdown {
  return {
    uniqueCharacters: units.filter((u) => u.type === "character").length,
    uniqueWords: units.filter((u) => u.type === "word").length,
    uniqueChunks: units.filter((u) => u.type === "chunk").length,
    productiveUnits: units.filter((u) => u.tier === "T0_seed" || u.tier === "T1_survival" || u.tier === "T2_daily").length,
    receptiveUnits: units.filter((u) => u.tier !== "T6_atlas_reference").length,
    patterns: units.filter((u) => u.type === "pattern").length,
  };
}

export function mapCommon5000ToAtlas(units: LexicalUnit[]) {
  const atlasChars = new Map(
    units.filter((u) => u.type === "character").map((u) => [u.hanzi, u])
  );
  const taughtLifecycle = new Set<string>(LEXICAL_LIFECYCLE_V37_EXTRA.map((e) => e.ref));
  return COMMON_5000.map((row) => {
    const unit = atlasChars.get(row.character);
    const chunkHits = chunksByChar.get(row.character) ?? [];
    const wordHits = wordsByChar.get(row.character) ?? [];
    const existsInAtlas = Boolean(unit);
    const usedInJourney =
      chunkHits.some((ref) => taughtLifecycle.has(ref)) || (unit ? taughtLifecycle.has(unit.ref) : false);
    return {
      character: row.character,
      frequencyRank: row.rank,
      pinyin: row.pinyin,
      meaningEn: row.meaningEn,
      existsInAtlas,
      usedInJourney,
      productive: existsInAtlas && (unit?.tier === "T0_seed" || unit?.tier === "T1_survival" || unit?.tier === "T2_daily"),
      receptive: existsInAtlas && unit?.tier !== "T6_atlas_reference",
      future: !existsInAtlas || unit?.tier === "T6_atlas_reference",
      wordsUsingCharacter: wordHits.slice(0, 6),
      chunksUsingCharacter: chunkHits.slice(0, 6),
      usefulness: usefulnessScore({
        frequencyRank: row.rank,
        wordCount: wordHits.length,
        chunkCount: chunkHits.length,
        survival: chunkHits.some((id) => /ditie|yiyuan|duoshao|tingbudong|maidan|huzhao/.test(id)),
        productive: chunkHits.length > 0,
      }),
    };
  });
}

export function tierHistogram(units: LexicalUnit[]): Record<string, number> {
  const hist: Record<string, number> = {};
  for (const label of Object.values(LEXICAL_TIER_LABELS)) hist[label] = 0;
  for (const unit of units) {
    const label = LEXICAL_TIER_LABELS[unit.tier];
    hist[label] = (hist[label] ?? 0) + 1;
  }
  return hist;
}

export { COMMON_5000, commonRankByChar };
