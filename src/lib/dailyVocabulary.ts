/**
 * RC2.2.15 — Palavra do dia: candidatos e escolha.
 *
 * Não é uma base lexical nova. `DailyVocabularyCandidate` é DERIVADO das
 * fontes canônicas que já existem:
 *   VOCABULARY (palavra, pinyin, significado, nível, domínio)
 *   CHUNKS / CHARACTERS (o alvo que a Revisão já sabe mostrar — SRS existente)
 *   HANZI_ATLAS + common5000 (frequência real de caractere)
 *   ALL_LESSONS (onde a palavra aparece pela primeira vez na Jornada)
 *   overlays de instrução (significado no idioma do curso)
 *
 * Regras (RC2.2.15 · U–AH, CV–CZ):
 * - palavra de verdade: nada de nomes próprios, cidades, ruas, partículas,
 *   classificadores, sufixos, frases, prévias avançadas, itens sem pinyin com
 *   marca de tom ou sem significado no idioma do curso;
 * - só entra o que a Revisão consegue revisar (chunk ou char existente);
 * - teach-before-test: palavra que estreia na Jornada dentro de revisão ou
 *   transferência (prova) não é escolhida — ela seria resposta de algo que o
 *   aluno ainda não aprendeu;
 * - NOVA: nada que o aluno já aprendeu, já tem no SRS (reps > 0) ou já viu em
 *   lição concluída; nada que já foi palavra do dia (enquanto houver opção);
 * - teto de dificuldade pela posição na Jornada, pelos caracteres já
 *   conhecidos e pelo nível real do item;
 * - sem candidato seguro → null (nenhuma notificação; nunca "qualquer uma").
 */
import { VOCABULARY } from "../data/vocabulary";
import { CHUNKS } from "../data/chunks";
import { CHARACTERS } from "../data/characters";
import { ALL_LESSONS } from "../data/journey";
import { radicalById } from "../data/radicals";
import { getAtlasByHanzi } from "../data/hanziAtlas";
import { hanziOriginNote, type HanziOriginSource, type HanziStoryStatus } from "../data/hanziOrigins";
import type { VocabDomain, VocabEntry, VocabLevel } from "../data/types";
import { hasEnglishOverlay, resolveInstructionText } from "../i18n/overlays/instructionGloss";
import { instructionLocaleForDirection, type CourseDirectionId } from "../i18n/courseDirection";
import { VOCABULARY_MEANING_EN } from "../i18n/overlays/vocabularyMeanings.en";
import common5000 from "../data/corpus/common5000.json";

export type DailyVocabularyExclusion =
  | "PHRASE"
  | "PROPER_NOUN"
  | "GRAMMAR_ARTIFACT"
  | "ADVANCED"
  | "MISSING_PINYIN"
  | "MISSING_MEANING"
  | "DUPLICATE"
  | "NO_REVIEW_TARGET"
  | "FIRST_SEEN_IN_TEST";

export interface DailyVocabularyCandidate {
  /** id do VOCABULARY (o `lexicalId` de toda a feature). */
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  /** Só quando existe tradução revisada (overlay); nunca a frase PT repetida. */
  meaningEn: string | null;
  level: VocabLevel;
  domain: VocabDomain;
  chars: string[];
  /** Item que a Revisão já sabe revisar. */
  srsRef: { type: "chunk" | "char"; itemId: string };
  /** Palavra de um caractere: rank real do common5000. Multi: null (sem ranking falso). */
  frequencyRank: number | null;
  /** Proxy interno para ordenar (menor rank entre os caracteres). Nunca exibido. */
  charRankProxy: number;
  firstLessonIndex: number | null;
  firstLessonId: string | null;
  notePt?: string;
}

export interface DailyVocabularyPool {
  candidates: DailyVocabularyCandidate[];
  excluded: { id: string; hanzi: string; reason: DailyVocabularyExclusion }[];
}

export interface DailyVocabularyLearner {
  completedLessons: readonly string[];
  learnedChars: readonly string[];
  learnedChunks: readonly string[];
  srs: Readonly<Record<string, { reps?: number } | undefined>>;
}

export interface DailyVocabularyHistoryEntry {
  dateKey: string;
  lexicalId: string;
}

export type LearnerStage = "new" | "early" | "mid" | "advanced";

// ── Tabelas ───────────────────────────────────────────────────────────────

const LEVEL_RANK: Record<VocabLevel, number> = { seed: 0, beginner: 1, review: 1, elementary: 2, survival: 2, advancedPreview: 4 };
const STAGE_MAX_LEVEL: Record<LearnerStage, number> = { new: 1, early: 2, mid: 2, advanced: 2 };
const STAGE_MAX_CHARS: Record<LearnerStage, number> = { new: 2, early: 3, mid: 4, advanced: 5 };
const STAGE_MAX_UNKNOWN_CHARS: Record<LearnerStage, number> = { new: 2, early: 2, mid: 3, advanced: 4 };
/** Quantas lições à frente uma palavra da Jornada pode estar. */
const STAGE_MAX_AHEAD: Record<LearnerStage, number> = { new: 10, early: 15, mid: 25, advanced: Number.POSITIVE_INFINITY };
const COMMUNICATIVE_DOMAINS = new Set<VocabDomain>([
  "saudacao",
  "cortesia",
  "pessoa",
  "familia",
  "comida",
  "bebida",
  "compras",
  "transporte",
  "sobrevivencia",
  "tempo",
  "lugar",
  "estudo",
  "trabalho",
]);
const GRAMMAR_MEANING = /part[íi]cula|classificador|sufixo|prefixo|marcador|\(adv[ée]rbio\)/i;
const NUMERAL_PHRASE = /^[一二两三四五六七八九十][\u4e00-\u9fff]{1,}$/u;
const TONE_MARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const HANZI = /[一-鿿]/;
/** Rótulos de lição que são prova/consolidação: estreia ali = resposta de desafio. */
const TEST_ROLES = new Set(["review", "transfer"]);

type Common5000Row = { character: string; rank: number };
const RANK_BY_CHAR = new Map((common5000 as Common5000Row[]).map((row) => [row.character, row.rank]));

// ── Pool ──────────────────────────────────────────────────────────────────

function charsOf(hanzi: string): string[] {
  return [...hanzi].filter((ch) => HANZI.test(ch));
}

function lessonTexts(): string[] {
  return ALL_LESSONS.map((lesson) =>
    [JSON.stringify(lesson.steps ?? []), (lesson.newHanzi ?? []).join(" "), (lesson.libraryItems ?? []).join(" ")].join("\n")
  );
}

function isTestLesson(index: number): boolean {
  const lesson = ALL_LESSONS[index];
  if (!lesson) return false;
  return lesson.isReview === true || (lesson.curriculumRole != null && TEST_ROLES.has(lesson.curriculumRole));
}

/** Tradução do significado para um curso. null quando não há tradução revisada. */
export function meaningForDirection(entry: { meaningPt: string; meaningEn?: string | null }, direction: CourseDirectionId): string | null {
  const locale = instructionLocaleForDirection(direction);
  if (!locale) return null;
  if (locale === "pt-BR") return entry.meaningPt.trim() || null;
  if (entry.meaningEn) return entry.meaningEn;
  return null;
}

function englishMeaning(meaningPt: string): string | null {
  if (!hasEnglishOverlay(meaningPt)) return null;
  const en = resolveInstructionText(meaningPt, "en").trim();
  // Overlay que devolve o próprio texto PT não é tradução.
  if (!en || en === meaningPt.trim()) return null;
  return en;
}

export function exclusionFor(entry: VocabEntry): DailyVocabularyExclusion | null {
  if (entry.kind !== "word") return "PHRASE";
  // Número + medida (一杯茶, 两晚, 八点半): combinação, não palavra.
  if (NUMERAL_PHRASE.test(entry.hanzi)) return "PHRASE";
  if (!entry.meaningPt?.trim()) return "MISSING_MEANING";
  if (!entry.pinyin?.trim() || !TONE_MARK.test(entry.pinyin)) return "MISSING_PINYIN";
  // Nome próprio: pinyin com maiúscula (Zhōngguó, Běijīng lù) ou significado com maiúscula (Pequim, Brasil).
  if (/^\p{Lu}/u.test(entry.pinyin.trim()) || /^\p{Lu}/u.test(entry.meaningPt.trim())) return "PROPER_NOUN";
  if (entry.domain === "particula" || GRAMMAR_MEANING.test(entry.meaningPt)) return "GRAMMAR_ARTIFACT";
  if (entry.level === "advancedPreview") return "ADVANCED";
  return null;
}

let poolCache: DailyVocabularyPool | null = null;

export function buildDailyVocabularyPool(): DailyVocabularyPool {
  if (poolCache) return poolCache;
  const chunkByHanzi = new Map(CHUNKS.map((chunk) => [chunk.hanzi, chunk]));
  const charByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
  const texts = lessonTexts();
  const seen = new Set<string>();
  const candidates: DailyVocabularyCandidate[] = [];
  const excluded: DailyVocabularyPool["excluded"] = [];
  for (const entry of VOCABULARY) {
    const fail = (reason: DailyVocabularyExclusion) => excluded.push({ id: entry.id, hanzi: entry.hanzi, reason });
    if (seen.has(entry.hanzi)) {
      fail("DUPLICATE");
      continue;
    }
    seen.add(entry.hanzi);
    const reason = exclusionFor(entry);
    if (reason) {
      fail(reason);
      continue;
    }
    const chars = charsOf(entry.hanzi);
    const char = chars.length === 1 ? charByHanzi.get(entry.hanzi) : undefined;
    const chunk = chunkByHanzi.get(entry.hanzi);
    const srsRef = char ? { type: "char" as const, itemId: char.id } : chunk ? { type: "chunk" as const, itemId: chunk.id } : null;
    if (!srsRef) {
      fail("NO_REVIEW_TARGET");
      continue;
    }
    const firstLessonIndex = texts.findIndex((text) => text.includes(entry.hanzi));
    if (firstLessonIndex >= 0 && isTestLesson(firstLessonIndex)) {
      fail("FIRST_SEEN_IN_TEST");
      continue;
    }
    const ranks = chars.map((ch) => RANK_BY_CHAR.get(ch) ?? 9999);
    candidates.push({
      id: entry.id,
      hanzi: entry.hanzi,
      pinyin: entry.pinyin,
      meaningPt: entry.meaningPt,
      meaningEn: VOCABULARY_MEANING_EN[entry.id] ?? englishMeaning(entry.meaningPt),
      level: entry.level,
      domain: entry.domain,
      chars,
      srsRef,
      frequencyRank: chars.length === 1 ? RANK_BY_CHAR.get(chars[0]) ?? null : null,
      charRankProxy: Math.min(...ranks),
      firstLessonIndex: firstLessonIndex >= 0 ? firstLessonIndex : null,
      firstLessonId: firstLessonIndex >= 0 ? ALL_LESSONS[firstLessonIndex]?.id ?? null : null,
      ...(entry.notePt ? { notePt: entry.notePt } : {}),
    });
  }
  poolCache = { candidates, excluded };
  return poolCache;
}

export function dailyVocabularyCandidate(id: string | null | undefined): DailyVocabularyCandidate | null {
  if (typeof id !== "string" || !/^v_[a-z0-9_]{1,40}$/.test(id)) return null;
  return buildDailyVocabularyPool().candidates.find((candidate) => candidate.id === id) ?? null;
}

/** Deep link seguro: só ids que existem no pool. */
export function isDailyVocabularyId(id: unknown): id is string {
  return typeof id === "string" && dailyVocabularyCandidate(id) != null;
}

// ── Aluno ─────────────────────────────────────────────────────────────────

export function learnerPosition(completedLessons: readonly string[]): number {
  const done = new Set(completedLessons);
  let position = 0;
  ALL_LESSONS.forEach((lesson, index) => {
    if (done.has(lesson.id)) position = Math.max(position, index + 1);
  });
  return position;
}

export function learnerStage(position: number): LearnerStage {
  if (position <= 0) return "new";
  if (position < 15) return "early";
  if (position < 60) return "mid";
  return "advanced";
}

function knownGlyphs(learner: DailyVocabularyLearner): Set<string> {
  const glyphs = new Set<string>();
  const charIds = new Set(learner.learnedChars);
  for (const char of CHARACTERS) if (charIds.has(char.id)) glyphs.add(char.hanzi);
  const chunkIds = new Set(learner.learnedChunks);
  for (const chunk of CHUNKS) if (chunkIds.has(chunk.id)) for (const ch of charsOf(chunk.hanzi)) glyphs.add(ch);
  return glyphs;
}

/**
 * RC2.2.15 · CV–CX — o aluno já tem esta palavra? Usa evidência real: itens
 * aprendidos, SRS com repetição feita e lições concluídas — não só "concluiu a lição".
 */
export function isKnownToLearner(candidate: DailyVocabularyCandidate, learner: DailyVocabularyLearner, position = learnerPosition(learner.completedLessons)): boolean {
  const { type, itemId } = candidate.srsRef;
  if (type === "chunk" ? learner.learnedChunks.includes(itemId) : learner.learnedChars.includes(itemId)) return true;
  const prefix = `${type}:${itemId}`;
  for (const [key, item] of Object.entries(learner.srs)) {
    if ((key === prefix || key.startsWith(`${prefix}:`)) && (item?.reps ?? 0) > 0) return true;
  }
  return candidate.firstLessonIndex != null && candidate.firstLessonIndex < position;
}

// ── Escolha ───────────────────────────────────────────────────────────────

export type DailyVocabularyReason =
  | "curriculum-nearby"
  | "high-frequency"
  | "frequent"
  | "communicative"
  | "level-fit"
  | "characters-partly-known"
  | "short"
  | "not-exposed";

export interface RankedDailyVocabulary {
  candidate: DailyVocabularyCandidate;
  score: number;
  reasons: DailyVocabularyReason[];
}

export interface DailyVocabularyEligibility {
  eligible: boolean;
  why?: "KNOWN" | "NO_COURSE_MEANING" | "ABOVE_LEVEL" | "TOO_LONG" | "TOO_MANY_UNKNOWN_CHARS" | "TOO_FAR_AHEAD";
}

export function eligibility(
  candidate: DailyVocabularyCandidate,
  learner: DailyVocabularyLearner,
  direction: CourseDirectionId,
  context: { position: number; stage: LearnerStage; known: Set<string> }
): DailyVocabularyEligibility {
  if (!meaningForDirection(candidate, direction)) return { eligible: false, why: "NO_COURSE_MEANING" };
  if (isKnownToLearner(candidate, learner, context.position)) return { eligible: false, why: "KNOWN" };
  if (LEVEL_RANK[candidate.level] > STAGE_MAX_LEVEL[context.stage]) return { eligible: false, why: "ABOVE_LEVEL" };
  if (candidate.chars.length > STAGE_MAX_CHARS[context.stage]) return { eligible: false, why: "TOO_LONG" };
  const unknown = candidate.chars.filter((ch) => !context.known.has(ch)).length;
  if (unknown > STAGE_MAX_UNKNOWN_CHARS[context.stage]) return { eligible: false, why: "TOO_MANY_UNKNOWN_CHARS" };
  if (candidate.firstLessonIndex != null && candidate.firstLessonIndex - context.position > STAGE_MAX_AHEAD[context.stage]) {
    return { eligible: false, why: "TOO_FAR_AHEAD" };
  }
  return { eligible: true };
}

function scoreCandidate(
  candidate: DailyVocabularyCandidate,
  context: { position: number; stage: LearnerStage; known: Set<string> }
): RankedDailyVocabulary {
  const reasons: DailyVocabularyReason[] = ["not-exposed"];
  let score = 0;
  if (candidate.firstLessonIndex != null && candidate.firstLessonIndex >= context.position) {
    const distance = candidate.firstLessonIndex - context.position;
    score += Math.max(10, 40 - distance * 2);
    reasons.push("curriculum-nearby");
  }
  if (candidate.charRankProxy <= 300) {
    score += 25;
    reasons.push("high-frequency");
  } else if (candidate.charRankProxy <= 1000) {
    score += 15;
    reasons.push("frequent");
  } else if (candidate.charRankProxy <= 3000) {
    score += 5;
  }
  if (COMMUNICATIVE_DOMAINS.has(candidate.domain)) {
    score += 12;
    reasons.push("communicative");
  }
  const ideal = context.stage === "new" ? 0 : context.stage === "early" ? 1 : 2;
  if (LEVEL_RANK[candidate.level] === ideal || (context.stage === "new" && LEVEL_RANK[candidate.level] <= 1)) {
    score += 10;
    reasons.push("level-fit");
  }
  const knownChars = candidate.chars.filter((ch) => context.known.has(ch)).length;
  if (knownChars > 0 && knownChars < candidate.chars.length) {
    score += 6 * knownChars;
    reasons.push("characters-partly-known");
  }
  if (candidate.chars.length <= 2) {
    score += 4;
    reasons.push("short");
  }
  return { candidate, score, reasons };
}

/**
 * Candidatos seguros para ESTE aluno e ESTE curso, na ordem de preferência.
 * Determinístico: mesma entrada → mesma ordem (empate pelo id).
 */
export function rankDailyVocabulary(input: {
  learner: DailyVocabularyLearner;
  direction: CourseDirectionId;
  history: readonly DailyVocabularyHistoryEntry[];
  todayKey: string;
  pool?: DailyVocabularyPool;
}): RankedDailyVocabulary[] {
  const pool = input.pool ?? buildDailyVocabularyPool();
  const position = learnerPosition(input.learner.completedLessons);
  const context = { position, stage: learnerStage(position), known: knownGlyphs(input.learner) };
  const eligible = pool.candidates.filter((candidate) => eligibility(candidate, input.learner, input.direction, context).eligible);
  // Já foi palavra do dia (dia anterior a hoje) → não é mais "nova".
  const past = input.history.filter((entry) => entry.dateKey < input.todayKey);
  const everExposed = new Set(past.map((entry) => entry.lexicalId));
  let fresh = eligible.filter((candidate) => !everExposed.has(candidate.id));
  if (fresh.length === 0) {
    // Pool esgotado: só volta o que não aparece há 90+ dias.
    const cutoff = shiftDayKey(input.todayKey, -DAILY_VOCABULARY_REPEAT_DAYS);
    const recent = new Set(past.filter((entry) => entry.dateKey > cutoff).map((entry) => entry.lexicalId));
    fresh = eligible.filter((candidate) => !recent.has(candidate.id));
  }
  return fresh
    .map((candidate) => scoreCandidate(candidate, context))
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
}

export const DAILY_VOCABULARY_REPEAT_DAYS = 90;

export function shiftDayKey(dayKey: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ── História / forma (modelo de verdade) ──────────────────────────────────

export interface CharacterStory {
  hanzi: string;
  status: HanziStoryStatus;
  /** Texto no idioma do curso; null quando não há o que dizer nesse idioma. */
  text: string | null;
  sources: HanziOriginSource[];
  /** Peças registradas no dataset (radicais), sem narrativa. */
  components: { glyph: string; meaning: string | null }[];
  evolutionId?: string;
}

/**
 * RC2.2.15 · R–T — o que dizer sobre um caractere, sem inventar:
 * origem verificada (com fonte) > dica para lembrar (mnemônico) > peças > nada.
 */
export function characterStory(hanzi: string, direction: CourseDirectionId): CharacterStory {
  const en = instructionLocaleForDirection(direction) === "en";
  const origin = hanziOriginNote(hanzi);
  const char = CHARACTERS.find((item) => item.hanzi === hanzi);
  const components = (char?.components ?? [])
    .map((id) => radicalById[id])
    .filter((radical): radical is NonNullable<typeof radical> => Boolean(radical) && radical.glyph !== hanzi)
    .map((radical) => ({ glyph: radical.glyph, meaning: en ? englishMeaning(radical.meaningPt) : radical.meaningPt }));
  if (origin) {
    return {
      hanzi,
      status: "VERIFIED_HISTORICAL",
      text: en ? origin.noteEn : origin.notePt,
      sources: origin.sources,
      components,
      evolutionId: origin.evolutionId,
    };
  }
  const mnemonic = char?.mnemonicPt?.trim();
  if (mnemonic) {
    const text = en ? englishMeaning(mnemonic) : mnemonic;
    if (text) return { hanzi, status: "PEDAGOGICAL_MNEMONIC", text, sources: [], components };
  }
  if (components.length > 0) return { hanzi, status: "COMPONENT_EXPLANATION", text: null, sources: [], components };
  return { hanzi, status: "NONE", text: null, sources: [], components: [] };
}

/** Micro-pista da notificação: só origem verificada (curta). Mnemônico não vira "história". */
export function notificationHint(candidate: DailyVocabularyCandidate, direction: CourseDirectionId): string | null {
  if (candidate.chars.length !== 1) return null;
  const origin = hanziOriginNote(candidate.hanzi);
  if (!origin) return null;
  return instructionLocaleForDirection(direction) === "en" ? origin.hintEn : origin.hintPt;
}

/** Caracteres da palavra com significado PRÓPRIO (não é tradução literal da palavra). */
export function wordComponents(candidate: DailyVocabularyCandidate, direction: CourseDirectionId) {
  const en = instructionLocaleForDirection(direction) === "en";
  return candidate.chars.map((ch) => {
    const atlas = getAtlasByHanzi(ch);
    const pt = atlas?.meaningPt ?? null;
    return {
      hanzi: ch,
      pinyin: atlas?.pinyin ?? null,
      meaning: pt ? (en ? englishMeaning(pt) : pt) : null,
      atlasId: atlas?.id ?? null,
    };
  });
}

/** Faixa de frequência só para palavra de um caractere com rank real. */
export function frequencyBand(candidate: DailyVocabularyCandidate): "top300" | "top1000" | null {
  if (candidate.frequencyRank == null) return null;
  if (candidate.frequencyRank <= 300) return "top300";
  if (candidate.frequencyRank <= 1000) return "top1000";
  return null;
}

/** Exemplo seguro: só frases já cadastradas que contêm a palavra. Nunca gerado. */
export function safeExample(candidate: DailyVocabularyCandidate, direction: CourseDirectionId): { hanzi: string; pinyin: string; meaning: string } | null {
  const en = instructionLocaleForDirection(direction) === "en";
  const pick = (hanzi: string, pinyin: string, pt: string) => {
    if (hanzi === candidate.hanzi || !hanzi.includes(candidate.hanzi) || charsOf(hanzi).length > 8) return null;
    const meaning = en ? englishMeaning(pt) : pt;
    return meaning ? { hanzi, pinyin, meaning } : null;
  };
  for (const char of CHARACTERS) {
    for (const example of char.exampleWords ?? []) {
      const found = pick(example.hanzi, example.pinyin, example.pt);
      if (found) return found;
    }
  }
  for (const chunk of CHUNKS) {
    const found = pick(chunk.hanzi, chunk.pinyin, chunk.meaningPt);
    if (found) return found;
  }
  return null;
}

function orderHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Distratores da micro-prática: outras palavras do pool (mesmo curso), com
 * significado diferente, preferindo o mesmo número de caracteres. Determinístico.
 */
export function practiceDistractors(
  candidate: DailyVocabularyCandidate,
  direction: CourseDirectionId,
  seed: string,
  count = 2
): DailyVocabularyCandidate[] {
  const meaning = meaningForDirection(candidate, direction);
  const others = buildDailyVocabularyPool().candidates.filter((other) => {
    if (other.id === candidate.id || other.hanzi === candidate.hanzi) return false;
    const otherMeaning = meaningForDirection(other, direction);
    return Boolean(otherMeaning) && otherMeaning !== meaning;
  });
  const sameLength = others.filter((other) => other.chars.length === candidate.chars.length);
  const source = sameLength.length >= count ? sameLength : others;
  return [...source].sort((a, b) => orderHash(`${seed}|${a.id}`) - orderHash(`${seed}|${b.id}`)).slice(0, count);
}
