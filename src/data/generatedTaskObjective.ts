/**
 * RC1.4 — Generated Learning Integrity
 *
 * Structural target + surface resolution for mastery bonus steps.
 * No lessonId switch/case for the known frozen mismatches — IDs may appear
 * only in comments/tests. Imported BY topicMasteryBonus (not the reverse).
 */

import type { Lesson, LessonStep, Skill } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import type { TopicMasterySpec } from "./topicMastery";
import { CHARACTERS, charById } from "./characters";
import { chunkById } from "./chunks";
import { radicalById } from "./radicals";
import { buildersForCharacter } from "./hanziBuilder";
import { makeReverseRecall } from "./exerciseFeasibility";

const CJK_RUN = /[\u3400-\u9fff]+/g;
const CJK_CHAR = /[\u3400-\u9fff]/g;
const NUMERALS = new Set(["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]);
const MA_TONE_FAMILY = new Set(["妈", "麻", "马", "骂"]);
const GREETING_CHUNK = "你好";

const PHONETIC_CLUE_RE =
  /pista sonora|dá som|da som|sound clue|componente fonét|peça (?:que )?dá (?:o )?som|fonétic/i;
const TONE_CONTRAST_RE =
  /contraste|comparar|discriminar|[1-4]º\s*tom|tom\s*[1-4]|sobe|vale|reta|queda|mā|má|mǎ|mà/i;
const NUMERIC_TOPIC_RE = /n[uú]mero|contagem|contar|quantidade|dezena|numeral/i;
const VIZINHOS_RE = /\bvizinhos?\b/i;

export type GeneratedRelationType =
  | "phonetic_component"
  | "tone_contrast"
  | "numeric_value"
  | "hanzi_form"
  | "lexical_core";

export type GeneratedTaskModality =
  | "listening"
  | "recognition"
  | "form"
  | "production"
  | "transfer";

export interface GeneratedTaskObjective {
  id: string;
  sourceLessonId: string;
  sourceStepId?: string;
  masteryPass: MasteryPass;
  skill: Skill;
  modality: GeneratedTaskModality;
  targetRef: string;
  anchorRefs?: string[];
  relationType?: GeneratedRelationType;
  seed?: string;
}

export interface GeneratedTaskSurfaces {
  prompt: string;
  explanation: string;
  hint: string;
  audioTarget: string;
  distractors: string[];
}

/** Contiguous CJK runs — same contract as features/lesson/canonicalAnswer.hanziTokens. */
export function hanziTokens(text: string | undefined): string[] {
  if (!text) return [];
  return [...text.matchAll(CJK_RUN)].map((match) => match[0]);
}

function uniquePreserve(items: readonly string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}

function flattenHanziChars(tokens: readonly string[]): string[] {
  const chars: string[] = [];
  for (const token of tokens) {
    const matches = token.match(CJK_CHAR);
    if (matches) chars.push(...matches);
  }
  return uniquePreserve(chars);
}

function modalityForPass(pass: MasteryPass, relation?: GeneratedRelationType): GeneratedTaskModality {
  if (pass === 1) return "listening";
  if (pass === 2) return relation === "hanzi_form" || relation === "phonetic_component" ? "form" : "recognition";
  if (pass === 3) return "production";
  return "transfer";
}

function passPedagogyBlob(spec: TopicMasterySpec | null | undefined, pass: MasteryPass): string {
  if (!spec) return "";
  const mustByPass: Record<MasteryPass, string[]> = {
    1: spec.mustUnderstand,
    2: spec.mustRecognize,
    3: spec.mustProduce,
    4: spec.mustTransfer,
  };
  return [
    spec.promise,
    spec.passObjectives[pass],
    ...(mustByPass[pass] ?? []),
    ...spec.mustUnderstand,
    ...spec.mustRecognize,
    ...spec.mustProduce,
    ...spec.mustTransfer,
  ]
    .filter(Boolean)
    .join("\n");
}

function relevantMustBlob(spec: TopicMasterySpec | null | undefined, pass: MasteryPass): string {
  if (!spec) return "";
  const primary: Record<MasteryPass, string[]> = {
    1: spec.mustUnderstand,
    2: spec.mustRecognize,
    3: spec.mustProduce,
    4: spec.mustTransfer,
  };
  return [spec.passObjectives[pass], ...(primary[pass] ?? [])].filter(Boolean).join("\n");
}

function glyphFromItemRef(ref: string): string | null {
  if (ref.startsWith("char:")) {
    const id = ref.slice("char:".length);
    return charById[id]?.hanzi ?? null;
  }
  if (ref.startsWith("chunk:")) {
    const id = ref.slice("chunk:".length);
    return chunkById[id]?.hanzi ?? null;
  }
  return null;
}

function libraryGlyphs(lesson: Lesson): string[] {
  const glyphs: string[] = [];
  for (const ref of lesson.libraryItems ?? []) {
    const glyph = glyphFromItemRef(ref);
    if (glyph) glyphs.push(...hanziTokens(glyph));
  }
  for (const hanzi of lesson.newHanzi ?? []) {
    glyphs.push(...hanziTokens(hanzi));
  }
  return uniquePreserve(glyphs);
}

function reviewOnlyGlyphs(lesson: Lesson): Set<string> {
  const library = new Set(libraryGlyphs(lesson));
  const review: string[] = [];
  for (const ref of lesson.reviewItems ?? []) {
    const glyph = glyphFromItemRef(ref);
    if (!glyph) continue;
    for (const token of hanziTokens(glyph)) {
      if (!library.has(token)) review.push(token);
    }
  }
  return new Set(review);
}

/** First-step review distractors: CJK in early steps that are not title/library core. */
function earlyStepDistractors(lesson: Lesson, core: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  const steps = lesson.steps.slice(0, 3);
  for (const step of steps) {
    const blob = [
      step.hanzi,
      step.audioText,
      step.text,
      step.correctAnswer,
      step.answer,
      ...(step.options ?? []),
      ...(step.target ?? []),
    ]
      .filter(Boolean)
      .join("");
    for (const token of flattenHanziChars(hanziTokens(blob))) {
      if (!core.has(token)) out.add(token);
    }
  }
  return out;
}

function contrastMembersFromLesson(lesson: Lesson): string[] {
  const members: string[] = [];
  for (const step of lesson.steps) {
    if (
      step.kind !== "listen" &&
      step.kind !== "listen_select" &&
      step.kind !== "tone" &&
      step.kind !== "audio_discrimination"
    ) {
      continue;
    }
    const blob = [step.hanzi, step.audioText, step.text, step.correctAnswer, ...(step.options ?? [])]
      .filter(Boolean)
      .join("");
    for (const token of flattenHanziChars(hanziTokens(blob))) {
      members.push(token);
    }
    for (const side of step.pairReveal ?? []) {
      members.push(...flattenHanziChars(hanziTokens(side.hanzi)));
    }
  }
  return uniquePreserve(members);
}

function detectPhoneticAnchor(text: string): string | null {
  if (!PHONETIC_CLUE_RE.test(text)) return null;
  // "Quando 马 dá som" / "马 dá a pista sonora" — prefer the glyph tied to the clue phrase.
  const clueNear =
    text.match(/([\u3400-\u9fff])\s*(?:dá|da)\s*(?:a\s+)?(?:pista\s+sonora|som)/i) ??
    text.match(/(?:pista\s+sonora|componente\s+fonét\w*|sound\s+clue)[^\n\u3400-\u9fff]{0,12}([\u3400-\u9fff])/i) ??
    text.match(/([\u3400-\u9fff])[^\n]{0,8}(?:pista\s+sonora|dá\s+som|da\s+som)/i);
  if (clueNear?.[1]) return clueNear[1];
  const tokens = flattenHanziChars(hanziTokens(text));
  // Prefer known phonetic radicals that appear in the text.
  for (const token of tokens) {
    const asRadical = Object.values(radicalById).find((radical) => radical.glyph === token);
    if (asRadical) return token;
  }
  return tokens[0] ?? null;
}

function compoundsWithPhonetic(anchor: string, pool: readonly string[]): string[] {
  const radical = Object.values(radicalById).find((item) => item.glyph === anchor);
  const compounds: string[] = [];
  for (const char of CHARACTERS) {
    if (char.hanzi === anchor) continue;
    const usesPhonetic =
      (radical && char.phonetic === radical.id) ||
      (char.components ?? []).includes(radical?.id ?? "") ||
      char.hanzi.includes(anchor);
    if (!usesPhonetic) continue;
    if (pool.some((item) => item.includes(char.hanzi) || char.hanzi.includes(item))) {
      compounds.push(char.hanzi);
    }
  }
  // Also accept pool tokens that contain the anchor glyph but are not the anchor.
  for (const token of pool) {
    if (token !== anchor && token.includes(anchor) && token.length >= 1) {
      // Single-char compounds already handled; multi-char words that embed the compound.
      const chars = flattenHanziChars([token]);
      for (const ch of chars) {
        if (ch !== anchor && (ch.includes(anchor) || CHARACTERS.some((c) => c.hanzi === ch && c.phonetic))) {
          compounds.push(ch);
        }
      }
    }
  }
  return uniquePreserve(compounds);
}

function detectRelationType(
  lesson: Lesson,
  spec: TopicMasterySpec | null | undefined,
  _pass: MasteryPass,
  pedagogyText: string
): GeneratedRelationType {
  const titlePromise = `${lesson.title}\n${spec?.promise ?? ""}\n${pedagogyText}`;
  if (PHONETIC_CLUE_RE.test(titlePromise)) return "phonetic_component";

  const isPerception =
    lesson.curriculumRole === "perception_lab" || lesson.skill === "som";
  if (isPerception && TONE_CONTRAST_RE.test(titlePromise)) return "tone_contrast";

  const numeralMentions = flattenHanziChars(hanziTokens(pedagogyText)).filter((ch) => NUMERALS.has(ch));
  const exampleNumerals = flattenHanziChars(hanziTokens((spec?.canonicalExamples ?? []).join(""))).filter((ch) =>
    NUMERALS.has(ch)
  );
  if (
    numeralMentions.length > 0 &&
    exampleNumerals.length > 0 &&
    (NUMERIC_TOPIC_RE.test(titlePromise) || exampleNumerals.length >= 1)
  ) {
    return "numeric_value";
  }

  if (lesson.skill === "hanzi") return "hanzi_form";
  return "lexical_core";
}

function titleHanzi(lesson: Lesson): string | null {
  const tokens = hanziTokens(lesson.title);
  if (tokens.length === 1 && tokens[0].length === 1) return tokens[0];
  // Title like "Quando 马 dá som" — not a single-hanzi title.
  return null;
}

function scoreTarget(
  candidate: string,
  ctx: {
    pedagogyChars: ReadonlySet<string>;
    exampleChars: ReadonlySet<string>;
    libraryChars: ReadonlySet<string>;
    reviewOnly: ReadonlySet<string>;
    earlyDistractors: ReadonlySet<string>;
    titleChar: string | null;
    skill: Skill;
    relation: GeneratedRelationType;
    passTextChars: ReadonlySet<string>;
    contrastMembers: ReadonlySet<string>;
  }
): number {
  let score = 0;
  if (ctx.pedagogyChars.has(candidate)) score += 50;
  if (ctx.exampleChars.has(candidate)) score += 40;
  if (ctx.pedagogyChars.has(candidate) && ctx.exampleChars.has(candidate)) score += 35;
  if (ctx.passTextChars.has(candidate)) score += 25;
  if (ctx.libraryChars.has(candidate)) score += 55;
  if (ctx.titleChar === candidate && ctx.skill === "hanzi") score += 100;
  if (ctx.reviewOnly.has(candidate) && !ctx.libraryChars.has(candidate)) score -= 70;
  if (ctx.earlyDistractors.has(candidate) && !ctx.libraryChars.has(candidate) && ctx.titleChar !== candidate) {
    score -= 90;
  }
  if (ctx.relation === "tone_contrast") {
    if (ctx.contrastMembers.has(candidate)) score += 45;
    if (MA_TONE_FAMILY.has(candidate)) score += 20;
    if (candidate === GREETING_CHUNK || candidate === "你" || candidate === "好") {
      // Prefer ma-family / contrast members over greeting transfer material.
      if ([...ctx.contrastMembers].some((m) => MA_TONE_FAMILY.has(m)) || [...ctx.exampleChars].some((m) => MA_TONE_FAMILY.has(m))) {
        score -= 120;
      }
    }
  }
  if (ctx.relation === "numeric_value" && NUMERALS.has(candidate) && ctx.passTextChars.has(candidate)) {
    score += 80;
  }
  return score;
}

/**
 * Structurally picks a coherent targetRef — no lessonId hardcoding.
 */
export function resolveGeneratedTaskObjective(
  lesson: Lesson,
  pass: MasteryPass,
  spec: TopicMasterySpec | null | undefined
): GeneratedTaskObjective {
  const pedagogyBlob = passPedagogyBlob(spec, pass);
  const passBlob = relevantMustBlob(spec, pass);
  const titlePromise = `${lesson.title}\n${spec?.promise ?? ""}`;
  const relationType = detectRelationType(lesson, spec, pass, `${titlePromise}\n${pedagogyBlob}`);

  const exampleTokens = uniquePreserve(
    (spec?.canonicalExamples ?? []).flatMap((item) => hanziTokens(item))
  );
  const exampleChars = new Set(flattenHanziChars(exampleTokens));
  const pedagogyChars = new Set(flattenHanziChars(hanziTokens(`${titlePromise}\n${pedagogyBlob}`)));
  const passTextChars = new Set(flattenHanziChars(hanziTokens(passBlob)));
  const libraryChars = new Set(libraryGlyphs(lesson));
  const reviewOnly = reviewOnlyGlyphs(lesson);
  const titleChar = titleHanzi(lesson);
  const core = new Set<string>([
    ...libraryChars,
    ...(titleChar ? [titleChar] : []),
    ...exampleChars,
    ...passTextChars,
  ]);
  const earlyDistractors = earlyStepDistractors(lesson, core);
  const contrastMembers = new Set(contrastMembersFromLesson(lesson));

  let targetRef = "";
  let anchorRefs: string[] | undefined;

  if (relationType === "phonetic_component") {
    const anchor =
      detectPhoneticAnchor(`${titlePromise}\n${pedagogyBlob}`) ??
      [...pedagogyChars].find((ch) => Object.values(radicalById).some((r) => r.glyph === ch)) ??
      null;
    if (anchor) {
      anchorRefs = [anchor];
      const pool = uniquePreserve([
        ...exampleTokens,
        ...libraryGlyphs(lesson),
        ...flattenHanziChars([...pedagogyChars]),
        ...lesson.steps.flatMap((step) =>
          hanziTokens([step.hanzi, step.audioText, step.text, step.correctAnswer].filter(Boolean).join(""))
        ),
      ]);
      const compounds = compoundsWithPhonetic(anchor, pool);
      // Prefer compounds that appear in examples / library / pedagogy (妈 over random).
      const ranked = compounds
        .map((compound) => ({
          compound,
          score:
            (exampleChars.has(compound) ? 50 : 0) +
            (libraryChars.has(compound) ? 40 : 0) +
            (pedagogyChars.has(compound) ? 30 : 0) +
            (passTextChars.has(compound) ? 20 : 0),
        }))
        .sort((a, b) => b.score - a.score);
      targetRef = ranked[0]?.compound ?? "";
    }
  }

  if (relationType === "tone_contrast" && !targetRef) {
    const maFromExamples = [...exampleChars].filter((ch) => MA_TONE_FAMILY.has(ch));
    const maFromContrast = [...contrastMembers].filter((ch) => MA_TONE_FAMILY.has(ch));
    const pool = uniquePreserve([...maFromExamples, ...maFromContrast, ...contrastMembers, ...exampleChars]);
    const ranked = pool
      .filter((ch) => ch !== GREETING_CHUNK)
      .map((candidate) => ({
        candidate,
        score: scoreTarget(candidate, {
          pedagogyChars,
          exampleChars,
          libraryChars,
          reviewOnly,
          earlyDistractors,
          titleChar,
          skill: lesson.skill,
          relation: relationType,
          passTextChars,
          contrastMembers,
        }),
      }))
      .sort((a, b) => b.score - a.score);
    targetRef = ranked[0]?.candidate ?? "";
    const others = ranked
      .slice(1)
      .map((row) => row.candidate)
      .filter((ch) => ch !== targetRef)
      .slice(0, 3);
    if (others.length) anchorRefs = others;
  }

  if (relationType === "numeric_value" && !targetRef) {
    const mentioned = [...passTextChars].filter((ch) => NUMERALS.has(ch) && exampleChars.has(ch));
    if (mentioned.length === 1) {
      targetRef = mentioned[0];
    } else if (mentioned.length > 1) {
      // Prefer the numeral named in the pass objective / mustTransfer specifically.
      const passOnly = flattenHanziChars(hanziTokens(spec?.passObjectives[pass] ?? "")).filter((ch) =>
        mentioned.includes(ch)
      );
      targetRef = passOnly[0] ?? mentioned[mentioned.length - 1];
    } else {
      const fromExamples = [...exampleChars].filter((ch) => NUMERALS.has(ch));
      targetRef = fromExamples[fromExamples.length - 1] ?? fromExamples[0] ?? "";
    }
  }

  if (!targetRef && titleChar && lesson.skill === "hanzi") {
    targetRef = titleChar;
  }

  if (!targetRef) {
    const candidates = uniquePreserve([
      ...[...pedagogyChars].filter((ch) => exampleChars.has(ch)),
      ...exampleChars,
      ...libraryChars,
      ...passTextChars,
      ...pedagogyChars,
    ]);
    const ranked = candidates
      .map((candidate) => ({
        candidate,
        score: scoreTarget(candidate, {
          pedagogyChars,
          exampleChars,
          libraryChars,
          reviewOnly,
          earlyDistractors,
          titleChar,
          skill: lesson.skill,
          relation: relationType,
          passTextChars,
          contrastMembers,
        }),
      }))
      .sort((a, b) => b.score - a.score);
    targetRef = ranked[0]?.candidate ?? exampleTokens[0] ?? titleChar ?? libraryGlyphs(lesson)[0] ?? "";
  }

  // Final guard: never keep an early-step distractor when title/pass text name something else.
  if (
    targetRef &&
    earlyDistractors.has(targetRef) &&
    titleChar &&
    titleChar !== targetRef &&
    lesson.skill === "hanzi"
  ) {
    targetRef = titleChar;
  }
  if (
    targetRef &&
    earlyDistractors.has(targetRef) &&
    passTextChars.size > 0 &&
    !passTextChars.has(targetRef) &&
    [...passTextChars].some((ch) => exampleChars.has(ch) || libraryChars.has(ch))
  ) {
    targetRef =
      [...passTextChars].find((ch) => exampleChars.has(ch) || libraryChars.has(ch)) ?? targetRef;
  }

  const modality = modalityForPass(pass, relationType);
  const seed = `${lesson.id}:${pass}:${targetRef}:${relationType}`;
  return {
    id: `gen-obj:${seed}`,
    sourceLessonId: lesson.id,
    masteryPass: pass,
    skill: lesson.skill,
    modality,
    targetRef,
    anchorRefs,
    relationType,
    seed,
  };
}

function toneOperationPrompt(objective: GeneratedTaskObjective, lesson: Lesson): string {
  const target = objective.targetRef;
  const title = lesson.title;
  if (/2º|segundo/i.test(title) || target === "麻") {
    return "Qual sílaba sobe (2º tom)?";
  }
  if (/1º|primeiro/i.test(title) || target === "妈") {
    return "Qual sílaba fica alta e reta (1º tom)?";
  }
  if (/3º|terceiro/i.test(title) || target === "马") {
    return "Qual sílaba faz o vale (3º tom)?";
  }
  if (/4º|quarto/i.test(title) || target === "骂") {
    return "Qual sílaba cai (4º tom)?";
  }
  if (/2.*3|3.*2|comparar/i.test(title)) {
    return target === "麻" || target === "má"
      ? "Qual sílaba sobe (2º tom)?"
      : "Qual sílaba faz o vale (3º tom)?";
  }
  return `Qual sílaba tem o contorno-alvo (${target})?`;
}

function passObjectiveUsable(spec: TopicMasterySpec | null | undefined, pass: MasteryPass, targetRef: string): string | null {
  const raw = spec?.passObjectives[pass];
  if (!raw) return null;
  const named = flattenHanziChars(hanziTokens(raw));
  if (named.length > 0 && !named.includes(targetRef) && !named.some((ch) => targetRef.includes(ch))) {
    return null;
  }
  if (VIZINHOS_RE.test(raw)) return null;
  return raw;
}

function defaultDistractors(targetRef: string, objective: GeneratedTaskObjective, lesson: Lesson): string[] {
  const pool: string[] = [];
  if (objective.relationType === "tone_contrast") {
    pool.push(...[...MA_TONE_FAMILY], ...(objective.anchorRefs ?? []));
  } else if (objective.relationType === "numeric_value") {
    pool.push(...NUMERALS);
  } else if (objective.relationType === "phonetic_component") {
    pool.push(...(objective.anchorRefs ?? []), "女", "口", "人", "木");
  } else {
    pool.push(...libraryGlyphs(lesson), "一", "人", "木", "谢谢");
  }
  return uniquePreserve([targetRef, ...pool.filter((item) => item !== targetRef)]).slice(0, 4);
}

/**
 * Student-facing surfaces aligned to the resolved objective.
 */
export function surfacesForObjective(
  objective: GeneratedTaskObjective,
  spec: TopicMasterySpec | null | undefined,
  pass: MasteryPass,
  lesson?: Lesson
): GeneratedTaskSurfaces {
  const target = objective.targetRef;
  const anchors = objective.anchorRefs ?? [];
  const relation = objective.relationType;
  const singleTitle = lesson ? titleHanzi(lesson) : null;

  let prompt: string;
  let explanation: string;
  let hint: string;

  if (relation === "phonetic_component" && anchors[0]) {
    const anchor = anchors[0];
    prompt = `Qual caractere usa ${anchor} como pista sonora?`;
    explanation = `${target} usa ${anchor} como pista sonora.`;
    hint = `Procure o caractere composto com ${anchor}.`;
  } else if (relation === "tone_contrast") {
    prompt = lesson ? toneOperationPrompt(objective, lesson) : `Qual sílaba tem o contorno de ${target}?`;
    explanation = `${target} carrega o contorno-alvo deste contraste.`;
    hint = "Compare o movimento da voz, não a tradução.";
  } else if (relation === "numeric_value") {
    prompt = `Qual é o numeral ${target}?`;
    explanation = `${target} é o valor numérico deste passo.`;
    hint = `Escolha ${target}.`;
  } else if (relation === "hanzi_form" || (lesson?.skill === "hanzi" && singleTitle)) {
    const label = singleTitle ?? target;
    prompt = `Qual é o hànzì ${label}?`;
    explanation = `${target} é o hànzì central deste tema.`;
    hint = `Foque na forma de ${target}.`;
  } else {
    const usable = passObjectiveUsable(spec, pass, target);
    prompt = usable ?? `Qual opção é o núcleo (${target}) deste tema?`;
    explanation = `${target} é o item central desta passagem.`;
    hint = `Reconheça ${target}.`;
  }

  // Never ship vague "vizinhos" without a declared relation operation.
  if (VIZINHOS_RE.test(prompt) && relation !== "hanzi_form") {
    prompt = `Qual opção é ${target}?`;
  }
  if (VIZINHOS_RE.test(prompt) && relation === "hanzi_form") {
    prompt = `Qual é o hànzì ${singleTitle ?? target}?`;
  }

  // Never reuse a passObjective that names different hanzi than the answer.
  const namedInPrompt = flattenHanziChars(hanziTokens(prompt));
  if (namedInPrompt.length > 0 && !namedInPrompt.includes(target) && relation !== "phonetic_component") {
    if (relation === "tone_contrast" && lesson) {
      prompt = toneOperationPrompt(objective, lesson);
    } else if (relation === "numeric_value") {
      prompt = `Qual é o numeral ${target}?`;
    } else if (relation === "hanzi_form") {
      prompt = `Qual é o hànzì ${singleTitle ?? target}?`;
    } else {
      prompt = `Qual opção é ${target}?`;
    }
  }

  const distractors = defaultDistractors(target, objective, lesson ?? ({ libraryItems: [], steps: [], skill: "fala", id: "", title: "" } as Lesson));

  return {
    prompt,
    explanation,
    hint,
    audioTarget: target,
    distractors,
  };
}

export function assertGeneratedSurfacesCoherent(
  objective: GeneratedTaskObjective,
  surfaces: GeneratedTaskSurfaces
): string[] {
  const issues: string[] = [];
  const target = objective.targetRef;
  if (!target) {
    issues.push("objective.targetRef vazio");
    return issues;
  }

  const promptHanzi = flattenHanziChars(hanziTokens(surfaces.prompt));
  const explanationHanzi = flattenHanziChars(hanziTokens(surfaces.explanation));

  if (VIZINHOS_RE.test(surfaces.prompt) && !objective.relationType) {
    issues.push('prompt usa "vizinhos" sem relationType');
  }
  if (VIZINHOS_RE.test(surfaces.prompt) && objective.relationType === "phonetic_component") {
    issues.push("prompt fonético não deve usar vizinhos — use pista sonora");
  }
  if (objective.relationType === "phonetic_component") {
    if (!/pista sonora/i.test(surfaces.prompt)) {
      issues.push("prompt fonético deve perguntar pela pista sonora");
    }
    const anchor = objective.anchorRefs?.[0];
    if (anchor && !surfaces.prompt.includes(anchor)) {
      issues.push(`prompt fonético deve mencionar âncora ${anchor}`);
    }
    if (surfaces.audioTarget !== target) {
      issues.push("audioTarget deve ser o composto (resposta), não a âncora");
    }
  }
  if (objective.relationType === "tone_contrast") {
    if (/Aplicar o contraste em/i.test(surfaces.prompt)) {
      issues.push("prompt de contraste tonal não deve ser 'Aplicar o contraste em…'");
    }
    if (target !== GREETING_CHUNK && (surfaces.prompt.includes(GREETING_CHUNK) || surfaces.explanation.includes("sílabas de 你好"))) {
      issues.push("superfície de tom ma não deve usar 你好 como resposta/explicação");
    }
  }
  if (objective.relationType === "numeric_value") {
    if (!surfaces.prompt.includes(target)) {
      issues.push(`prompt numérico deve mencionar ${target}`);
    }
  }
  if (explanationHanzi.length > 0) {
    const explanationRuns = hanziTokens(surfaces.explanation);
    const mentionsTarget =
      explanationRuns.some((run) => run.includes(target) || target.includes(run)) ||
      (flattenHanziChars([target]).every((ch) => explanationHanzi.includes(ch)) &&
        flattenHanziChars([target]).length > 0);
    if (!mentionsTarget) {
      issues.push(`explanation nomeia hànzì diferentes de targetRef=${target}`);
    }
  }
  if (
    promptHanzi.length > 0 &&
    objective.relationType !== "phonetic_component" &&
    objective.relationType !== "tone_contrast" &&
    !promptHanzi.includes(target)
  ) {
    issues.push(`prompt nomeia hànzì diferentes de targetRef=${target}`);
  }
  if (!surfaces.distractors.includes(target)) {
    issues.push("distractors devem incluir targetRef como opção correta");
  }
  return issues;
}

export function attachSemanticTrace(
  step: LessonStep,
  objective: GeneratedTaskObjective
): LessonStep {
  return {
    ...step,
    generatedTaskTrace: {
      objectiveId: objective.id,
      targetRef: objective.targetRef,
      relationType: objective.relationType,
      anchorRefs: objective.anchorRefs,
      masteryPass: objective.masteryPass,
    },
  };
}

function intro(title: string, body: string): LessonStep {
  return { kind: "intro", title, body };
}

function listenSelect(
  title: string,
  audioText: string,
  options: string[],
  correctAnswer: string,
  explanation?: string
): LessonStep {
  return { kind: "listen_select", title, audioText, options, correctAnswer, explanation };
}

function dialogue(
  title: string,
  dialoguePrompt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "dialogue_choice",
    title,
    speaker: "Situação",
    dialoguePrompt,
    options,
    correctAnswer,
    explanation,
  };
}

function contextualChoice(
  title: string,
  situationPt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "contextual_choice",
    title,
    situationPt,
    dialoguePrompt: situationPt,
    correctAnswer,
    options,
    explanation,
    speaker: "Situação",
  };
}

function sentenceBuild(
  title: string,
  prompt: string,
  target: string[],
  bank: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "sentence_build",
    title,
    prompt,
    target,
    bank,
    explanation,
    correctAnswer: target.join(""),
  };
}

/**
 * Pass-shaped bonus steps matching genericFidelityBonus (intro / listen_select /
 * dialogue_choice / contextual_choice), driven by the resolved objective.
 */
export function buildGeneratedBonusStep(
  lesson: Lesson,
  pass: MasteryPass,
  spec: TopicMasterySpec | null | undefined
): LessonStep[] {
  const objective = resolveGeneratedTaskObjective(lesson, pass, spec);
  if (!objective.targetRef) return [];

  const surfaces = surfacesForObjective(objective, spec, pass, lesson);
  const integrity = assertGeneratedSurfacesCoherent(objective, surfaces);
  if (integrity.length > 0 && typeof console !== "undefined") {
    console.warn(`[generatedTaskObjective] ${lesson.id} pass ${pass}:`, integrity.join("; "));
  }

  const options = surfaces.distractors;
  const attach = (step: LessonStep) => attachSemanticTrace(step, objective);

  if (pass === 1) {
    return [
      attach(intro("O que este tema ensina", spec?.promise ?? lesson.title)),
      attach(
        listenSelect("Ouça o núcleo", surfaces.audioTarget, options, objective.targetRef, surfaces.explanation)
      ),
    ];
  }

  if (pass === 2) {
    return [
      attach(
        dialogue("Reconhecer de verdade", surfaces.prompt, objective.targetRef, options, surfaces.explanation)
      ),
    ];
  }

  if (pass === 3) {
    const produceGoal = spec?.mustProduce[0] ?? lesson.title;
    const assembleHanzi = /montar|monte|caractere/i.test(`${produceGoal} ${spec?.passObjectives[3] ?? ""}`);
    const parts = [...objective.targetRef];
    const say = makeReverseRecall(
      "Diga sem apoio extra",
      assembleHanzi ? "Diga o núcleo deste tema, sem ler a tradução." : produceGoal,
      objective.targetRef,
      [objective.targetRef]
    );

    if (assembleHanzi && parts.length === 1) {
      const builder =
        buildersForCharacter(objective.targetRef).find((item) => item.mode === "fragments") ??
        buildersForCharacter(objective.targetRef)[0];
      if (builder) {
        return [
          attach({
            kind: "hanzi_build",
            title: "Monte o caractere",
            builderId: builder.id,
            prompt: builder.promptPt,
            sourceMeaning: builder.meaningPt,
            correctAnswer: builder.character,
            explanation: builder.explanationPt,
          }),
          attach(say),
        ];
      }
    }

    // Pass 3 must be production — do not re-emit Pass 2's dialogue_choice
    // with the same target (validate:topic-mastery-depth treats that as overlap 1.0).
    if (objective.relationType === "tone_contrast" || objective.relationType === "numeric_value") {
      return [attach(say)];
    }

    const bank = uniquePreserve([...parts, "一", "人", "木"]).slice(0, 6);
    return [
      attach(
        sentenceBuild(
          "Produza o núcleo",
          surfaces.prompt.includes(objective.targetRef)
            ? `Monte ${objective.targetRef}.`
            : surfaces.prompt,
          parts,
          bank,
          surfaces.explanation
        )
      ),
      attach(say),
    ];
  }

  // pass 4
  return [
    attach(
      contextualChoice(
        "Situação nova",
        surfaces.prompt,
        objective.targetRef,
        options,
        surfaces.explanation
      )
    ),
  ];
}
