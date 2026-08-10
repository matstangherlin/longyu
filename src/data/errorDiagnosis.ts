import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import { VOCABULARY } from "./vocabulary";
import { isLikelyPinyinSyllable, normalizePinyinBase, stripPinyinTone } from "../lib/pinyin";
import type { StepKind, PedagogyVariant } from "./journey";

// ————————————————————————————————————————————————————————————————
// Diagnóstico de erro (onda 4).
//
// As ondas 1–3 resolveram a VARIEDADE e a produção sem apoio: o mesmo conteúdo
// passou a ser cobrado por muitos caminhos, e o aluno passou a construir a
// frase sozinho. O que continuava raso era o passo seguinte:
//
//   o app sabia QUE o aluno errou   →  já sabia
//   o app sabia POR QUE ele errou   →  não sabia
//
// Até aqui o "motivo do erro" era derivado do FORMATO do exercício
// (mistakeReasonForStep), não da resposta do aluno. Quem escrevia 我茶要
// (ordem trocada) e quem escrevia 我要咖啡 (item errado) recebiam o mesmo
// motivo e a mesma remediação, porque os dois erraram no mesmo tipo de tela.
//
// Este módulo compara a resposta DADA com a ESPERADA e devolve uma causa
// linguística. A causa é o que passa a decidir:
//
//   1. o que o aluno lê no feedback   (frase específica, não genérica);
//   2. o formato da correção imediata (a modalidade que ataca aquela causa);
//   3. a variante A/B/C da próxima tentativa (rota pela fraqueza real).
//
// Nenhum motor novo entra aqui. O ganho é de PONTARIA: os motores que já
// existem passam a ser escolhidos pela causa em vez de por rodízio cego.
//
// Regra de ouro (a mesma de perceptionDrills.ts e productionTasks.ts): nada
// aqui inventa vocabulário. Hànzì, pinyin e componentes saem de
// CHARACTERS/CHUNKS/VOCABULARY; só os rótulos em português são curados.
// ————————————————————————————————————————————————————————————————

// Escapes explícitos, não os caracteres literais: escrito com literais, o
// início do segundo intervalo (U+F900) normaliza para U+8C48 em NFC e a classe
// passa a cobrir U+8C48–U+FAFF, engolindo Yi, Hangul e uso privado. Mesma
// correção já aplicada em perceptionDrills.ts e productionTasks.ts.
const HANZI_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const HANZI_GLOBAL_RE = /[\u3400-\u9fff\uf900-\ufaff]/gu;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()]/g;

/**
 * Causa linguística de um erro. É o eixo do diagnóstico: duas respostas
 * erradas no MESMO exercício podem ter causas diferentes, e é a causa — não o
 * exercício — que decide como o item volta.
 */
export type ErrorCause =
  // ——— Som ———
  /** Sílabas certas, tom errado (mǎi × mài). O contorno ainda não é estável. */
  | "tone"
  /** Hànzì diferente com o mesmo som — o ouvido acertou, a forma não. */
  | "homophone"
  /** A grafia do pinyin escorregou (-en × -eng, zh × z). */
  | "pinyin_spelling"
  /** O som não chegou inteiro: erro em tarefa de escuta sem padrão de forma. */
  | "listening"
  // ——— Forma escrita ———
  /** Hànzì visualmente parecido (compartilha componente): 木 × 本, 日 × 目. */
  | "grapheme"
  // ——— Estrutura ———
  /** As peças certas em ordem errada — o aluno tem o léxico, não a sintaxe. */
  | "word_order"
  /** Faltou peça na frase. */
  | "omission"
  /** Sobrou peça na frase. */
  | "intrusion"
  /** A partícula gramatical (了/吗/的/在…) faltou, sobrou ou trocou. */
  | "particle"
  /** O classificador (个/杯/本…) faltou, sobrou ou não combina com o nome. */
  | "classifier"
  // ——— Sentido e uso ———
  /** Estrutura certa, item lexical errado no buraco (chá × café). */
  | "lexical_choice"
  /** O significado em si não está firme (par hànzì ↔ português). */
  | "meaning"
  /** Frase válida, objetivo errado: disse algo correto que não era o pedido. */
  | "communicative"
  // ——— Sem sinal ———
  /** Não respondeu. Não é erro de conhecimento — é abandono ou tempo. */
  | "no_answer"
  /** Nenhum padrão reconhecido. Só entra quando nada acima explica. */
  | "unclassified";

export const ERROR_CAUSE_ORDER: readonly ErrorCause[] = [
  "tone",
  "homophone",
  "pinyin_spelling",
  "listening",
  "grapheme",
  "word_order",
  "omission",
  "intrusion",
  "particle",
  "classifier",
  "lexical_choice",
  "meaning",
  "communicative",
  "no_answer",
  "unclassified",
] as const;

/** Rótulo curto da causa — usado em relatório e no painel de erros. */
export const ERROR_CAUSE_LABELS: Record<ErrorCause, string> = {
  tone: "Tom",
  homophone: "Homófono",
  pinyin_spelling: "Grafia do pinyin",
  listening: "Escuta",
  grapheme: "Hànzì parecido",
  word_order: "Ordem da frase",
  omission: "Peça faltando",
  intrusion: "Peça sobrando",
  particle: "Partícula",
  classifier: "Classificador",
  lexical_choice: "Escolha da palavra",
  meaning: "Significado",
  communicative: "Objetivo da fala",
  no_answer: "Sem resposta",
  unclassified: "Não classificado",
};

/**
 * O que o ALUNO lê. Fala da causa, não do formato do exercício — é a diferença
 * entre "reveja este ponto" e "o som estava certo; o que escorregou foi o tom".
 */
export const ERROR_CAUSE_FEEDBACK: Record<ErrorCause, string> = {
  tone: "O som estava certo — o que mudou foi o tom.",
  homophone: "Você ouviu certo. O hànzì tem o mesmo som, mas outro sentido.",
  pinyin_spelling: "O som estava quase certo; a grafia do pinyin saiu diferente.",
  listening: "O áudio ainda não chegou inteiro. Ouça de novo antes de escrever.",
  grapheme: "Esse hànzì se parece com o certo, mas o componente muda o sentido.",
  word_order: "As palavras estavam certas. A ordem mudou.",
  omission: "Faltou uma peça na frase.",
  intrusion: "Sobrou uma peça na frase.",
  particle: "A partícula é que mudou — pequena, mas carrega a gramática.",
  classifier: "O classificador não combinou com o que você estava contando.",
  lexical_choice: "A estrutura estava certa; a palavra no buraco é que era outra.",
  meaning: "A ligação entre a forma e o significado ainda não está firme.",
  communicative: "A frase está correta — mas não é o que a situação pedia.",
  no_answer: "Ficou sem resposta. Vamos passar por isso de novo.",
  unclassified: "Vale rever este ponto em outro formato.",
};

/**
 * Modalidade que ATACA a causa. Neutra de propósito: a camada de features
 * traduz para o motor concreto (ver immediateRemediation.ts). O ponto é que a
 * correção deixa de ser "o mesmo exercício de novo".
 */
export type RemediationModality =
  | "tone_contrast"
  | "audio_discrimination"
  | "dictation"
  | "hanzi_form"
  | "slot_order"
  | "fill_gap"
  | "spot_error"
  | "meaning_pair"
  | "goal_production";

export const REMEDIATION_BY_CAUSE: Record<ErrorCause, RemediationModality> = {
  // Tom errado não se conserta relendo a frase: conserta-se contrastando tons.
  tone: "tone_contrast",
  // Mesmo som, forma errada — o par mínimo separa o que o ouvido juntou.
  homophone: "audio_discrimination",
  pinyin_spelling: "dictation",
  listening: "dictation",
  // Componente confundido volta pela montagem do caractere, não pela tradução.
  grapheme: "hanzi_form",
  // Ordem volta pelos slots nomeados (STPVO), que é o que o aluno não aplicou.
  word_order: "slot_order",
  omission: "fill_gap",
  intrusion: "spot_error",
  particle: "fill_gap",
  classifier: "fill_gap",
  lexical_choice: "meaning_pair",
  meaning: "meaning_pair",
  // Objetivo errado não é falta de forma: é falta de intenção. Volta produzindo.
  communicative: "goal_production",
  no_answer: "meaning_pair",
  unclassified: "meaning_pair",
};

/**
 * Variante A/B/C que mais exercita a causa. B carrega estrutura e intenção
 * (sentence_lab_distractors, meaning_intention_match, spot_error); C carrega
 * som e forma (sentence_lab_audio, dragon_dictation hanzi/immersion).
 * A permanece o percurso autoral e nunca é alvo — é o caminho da 1ª vez.
 */
export const PRACTICE_VARIANT_BY_CAUSE: Record<ErrorCause, "B" | "C"> = {
  tone: "C",
  homophone: "C",
  pinyin_spelling: "C",
  listening: "C",
  grapheme: "C",
  word_order: "B",
  omission: "B",
  intrusion: "B",
  particle: "B",
  classifier: "B",
  lexical_choice: "C",
  meaning: "C",
  communicative: "B",
  no_answer: "B",
  unclassified: "B",
};

/** Eixo pedagógico da causa — agrupa o relatório e o painel do aluno. */
export type ErrorAxis = "som" | "forma" | "estrutura" | "sentido" | "nenhum";

export const AXIS_BY_CAUSE: Record<ErrorCause, ErrorAxis> = {
  tone: "som",
  homophone: "som",
  pinyin_spelling: "som",
  listening: "som",
  grapheme: "forma",
  word_order: "estrutura",
  omission: "estrutura",
  intrusion: "estrutura",
  particle: "estrutura",
  classifier: "estrutura",
  lexical_choice: "sentido",
  meaning: "sentido",
  communicative: "sentido",
  no_answer: "nenhum",
  unclassified: "nenhum",
};

// ————————————————————————————————————————————————————————————————
// Classes fechadas de função gramatical
// ————————————————————————————————————————————————————————————————

/**
 * Partículas e marcadores gramaticais. Classe fechada: não cresce com o
 * vocabulário, por isso pode ser lista curada. Errar aqui é erro de GRAMÁTICA,
 * não de palavra — e a remediação precisa ser outra.
 */
export const GRAMMAR_PARTICLES = new Set(["了", "吗", "的", "呢", "吧", "不", "没", "在", "过", "着", "地", "得"]);

/**
 * Classificadores. Também classe fechada, e é o erro mais típico de brasileiro
 * (português não tem classificador obrigatório: "um chá", não "um copo-de chá").
 */
export const CLASSIFIERS = new Set(["个", "杯", "本", "只", "件", "张", "位", "条", "双", "碗", "瓶", "口", "块"]);

// ————————————————————————————————————————————————————————————————
// Índices do corpus
// ————————————————————————————————————————————————————————————————

/** Glifo → caractere. Só entradas de UM glifo: "你好" e "巴西人" ficam de fora. */
const CHAR_BY_GLYPH = new Map(
  CHARACTERS.filter((char) => [...char.hanzi].length === 1).map((char) => [char.hanzi, char])
);

/** Todas as formas conhecidas do corpus, normalizadas — usado por "communicative". */
const KNOWN_FORMS = new Set<string>(
  [
    ...CHUNKS.map((chunk) => chunk.hanzi),
    ...VOCABULARY.map((entry) => entry.hanzi),
    ...CHARACTERS.map((char) => char.hanzi),
  ].map((value) => cleanHanzi(value))
);

export function cleanHanzi(value: string | undefined): string {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
}

function hasHanzi(value: string | undefined): boolean {
  return HANZI_RE.test(String(value ?? ""));
}

function glyphsOf(value: string | undefined): string[] {
  return String(value ?? "").match(HANZI_GLOBAL_RE) ?? [];
}

/** Palavras de uma resposta em português (montagem de tradução). */
function wordsOf(value: string | undefined): string[] {
  return String(value ?? "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[.,!?;:"'()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

/** Itens de `inner` que faltam em `outer`, contando repetição. */
function multisetDifference(outer: string[], inner: string[]): string[] {
  const counts = new Map<string, number>();
  for (const item of inner) counts.set(item, (counts.get(item) ?? 0) + 1);
  const missing: string[] = [];
  for (const item of outer) {
    const remaining = counts.get(item) ?? 0;
    if (remaining > 0) counts.set(item, remaining - 1);
    else missing.push(item);
  }
  return missing;
}

/** true quando `inner` cabe dentro de `outer` (subconjunto com repetição). */
function isSubmultiset(inner: string[], outer: string[]): boolean {
  return multisetDifference(inner, outer).length === 0;
}

/**
 * Parece pinyin: TODAS as sílabas precisam ser sílabas possíveis do mandarim.
 *
 * Exigir todas, e não alguma, é o que separa pinyin de português: "eu quero
 * chá" tem "chá", que é sílaba válida, e "de nada" tem "de". Se bastasse uma,
 * resposta em português cairia no ramo de pinyin e todo erro de significado
 * seria diagnosticado como grafia — trocando um diagnóstico útil por ruído.
 */
function looksLikePinyin(value: string | undefined): boolean {
  const base = normalizePinyinBase(value);
  if (!base || hasHanzi(value)) return false;
  const syllables = base.split(/[\s'-]+/).filter(Boolean);
  if (syllables.length === 0) return false;
  return syllables.every((syllable) => isLikelyPinyinSyllable(syllable));
}

/** Dois glifos com o mesmo som base (mesmo desconsiderando o tom). */
function shareSound(a: string, b: string, options: { ignoreTone: boolean }): boolean {
  const charA = CHAR_BY_GLYPH.get(a);
  const charB = CHAR_BY_GLYPH.get(b);
  if (!charA?.pinyin || !charB?.pinyin) return false;
  if (options.ignoreTone) return normalizePinyinBase(charA.pinyin) === normalizePinyinBase(charB.pinyin);
  return stripPinyinTone(charA.pinyin) === stripPinyinTone(charB.pinyin) && charA.tone === charB.tone;
}

/** Dois glifos que dividem componente — é o que faz 木/本 e 日/目 se confundirem. */
function shareComponent(a: string, b: string): boolean {
  const charA = CHAR_BY_GLYPH.get(a);
  const charB = CHAR_BY_GLYPH.get(b);
  if (!charA || !charB) return false;
  const componentsB = new Set(charB.components ?? []);
  return (charA.components ?? []).some((component) => componentsB.has(component));
}

function allIn(items: string[], set: Set<string>): boolean {
  return items.length > 0 && items.every((item) => set.has(item));
}

/** Alguma peça diferente é partícula/classificador? Decide a causa do desvio. */
function functionWordCause(changed: string[]): ErrorCause | undefined {
  if (allIn(changed, GRAMMAR_PARTICLES)) return "particle";
  if (allIn(changed, CLASSIFIERS)) return "classifier";
  return undefined;
}

// ————————————————————————————————————————————————————————————————
// Diagnóstico
// ————————————————————————————————————————————————————————————————

/** Contexto do exercício. Só o que muda a leitura do erro entra aqui. */
export interface DiagnosisInput {
  /** Motor do exercício (step.kind). */
  kind?: StepKind;
  /** Variante do motor, quando houver. */
  pedagogyVariant?: PedagogyVariant;
  /** Resposta correta, como o exercício a cobra. */
  expected?: string;
  /** O que o aluno respondeu. */
  given?: string;
  /** A tarefa era só de áudio (sem hànzì na tela). */
  audioOnly?: boolean;
  /** A tarefa cobrava um objetivo comunicativo (produção/transferência). */
  hasCommunicativeGoal?: boolean;
}

export interface ErrorDiagnosis {
  cause: ErrorCause;
  axis: ErrorAxis;
  /** Quanto o padrão observado sustenta a causa. */
  confidence: "high" | "medium" | "low";
  /** Frase para o aluno. */
  feedbackPt: string;
  /** Modalidade que ataca esta causa. */
  remediation: RemediationModality;
  /** Peças que diferem entre o esperado e o dado (hànzì ou palavras). */
  changed?: string[];
}

/**
 * A resposta é uma tentativa BEM FORMADA na língua alvo?
 *
 * Só hànzì, ou só pinyin plausível. Serve para separar "escreveu mandarim que
 * eu não conheço" de "escreveu qualquer coisa": a primeira merece o benefício
 * da dúvida, a segunda não.
 */
export function isWellFormedAttempt(value: string | undefined): boolean {
  const raw = cleanHanzi(value);
  if (raw.length === 0) return false;
  const glyphs = glyphsOf(raw);
  if (glyphs.length > 0) return glyphs.length === [...raw].length;
  return looksLikePinyin(value);
}

/**
 * O motor não consegue explicar esta resposta de produção.
 *
 * Produção livre e aberta cobram uma frase inteira, e o corpus nunca vai
 * enumerar todas as frases certas do mandarim. Quando a resposta é uma
 * tentativa bem formada e o diagnóstico saiu com confiança baixa — ou seja, o
 * próprio motor não achou padrão que a explique —, o honesto é dizer "não
 * reconheci", não "você errou".
 *
 * Tratar isso como erro custaria estrela, entraria no SRS e, desde a onda 4,
 * ainda envenenaria o perfil de fraqueza: mandarim possivelmente correto
 * desviando as próximas lições do aluno.
 */
export function isUnexplainedProduction(
  diagnosis: Pick<ErrorDiagnosis, "cause" | "confidence">,
  given: string | undefined
): boolean {
  if (diagnosis.cause === "no_answer") return false;
  if (diagnosis.confidence !== "low") return false;
  return isWellFormedAttempt(given);
}

/** Placeholders gravados quando o aluno não respondeu nada. */
const EMPTY_ANSWERS = new Set(["", "resposta incorreta", "sem resposta", "-", "—"]);

const AUDIO_FIRST_KINDS = new Set<StepKind>(["dictation", "listen_select", "audio_discrimination", "listen"]);

function build(
  cause: ErrorCause,
  confidence: ErrorDiagnosis["confidence"],
  changed?: string[]
): ErrorDiagnosis {
  return {
    cause,
    axis: AXIS_BY_CAUSE[cause],
    confidence,
    feedbackPt: ERROR_CAUSE_FEEDBACK[cause],
    remediation: REMEDIATION_BY_CAUSE[cause],
    ...(changed && changed.length > 0 ? { changed } : {}),
  };
}

/**
 * Compara a resposta dada com a esperada e devolve a CAUSA do erro.
 *
 * A ordem das checagens é de especificidade decrescente: um erro que é ao mesmo
 * tempo "ordem trocada" e "peça diferente" é ordem, porque ordem é o
 * diagnóstico mais informativo e mais acionável dos dois.
 */
export function diagnoseError(input: DiagnosisInput): ErrorDiagnosis {
  const expectedRaw = String(input.expected ?? "").trim();
  const givenRaw = String(input.given ?? "").trim();

  // 0. Sem resposta não é erro de conhecimento — não pode poluir o perfil.
  if (!givenRaw || EMPTY_ANSWERS.has(givenRaw.toLocaleLowerCase("pt-BR"))) {
    return build("no_answer", "high");
  }
  if (!expectedRaw) return build("unclassified", "low");

  const audioOnly = input.audioOnly ?? (input.kind ? AUDIO_FIRST_KINDS.has(input.kind) : false);

  // 1. Tarefa de tom: a resposta É um tom ("3º tom"), então o erro é de tom.
  if (input.kind === "tone" || input.kind === "tone_pair" || /\d\s*º?\s*tom/i.test(expectedRaw)) {
    return build("tone", "high");
  }

  // 2. Respostas em pinyin: o tom é separável da sílaba, então dá para dizer
  //    exatamente qual dos dois falhou — que é o diagnóstico mais útil do app.
  if (looksLikePinyin(expectedRaw) && looksLikePinyin(givenRaw)) {
    const sameBase = normalizePinyinBase(expectedRaw) === normalizePinyinBase(givenRaw);
    if (sameBase) return build("tone", "high");
    return build(audioOnly ? "listening" : "pinyin_spelling", "medium");
  }

  // 3. Respostas em hànzì: é onde mora a maior parte do sinal estrutural.
  if (hasHanzi(expectedRaw) && hasHanzi(givenRaw)) {
    const expectedGlyphs = glyphsOf(expectedRaw);
    const givenGlyphs = glyphsOf(givenRaw);

    if (cleanHanzi(expectedRaw) === cleanHanzi(givenRaw)) return build("unclassified", "low");

    // 3a. Mesmas peças, ordem diferente: o léxico está lá, a sintaxe não.
    if (sameMultiset(expectedGlyphs, givenGlyphs)) return build("word_order", "high");

    // 3b. Substituição de um único glifo — dá para nomear a confusão exata.
    if (expectedGlyphs.length === givenGlyphs.length) {
      const positions = expectedGlyphs
        .map((glyph, index) => (glyph === givenGlyphs[index] ? -1 : index))
        .filter((index) => index >= 0);
      if (positions.length === 1) {
        const index = positions[0];
        const expectedGlyph = expectedGlyphs[index];
        const givenGlyph = givenGlyphs[index];
        const changed = [expectedGlyph, givenGlyph];
        const functionCause = functionWordCause(changed);
        if (functionCause) return build(functionCause, "high", changed);
        if (shareSound(expectedGlyph, givenGlyph, { ignoreTone: false })) {
          return build("homophone", "high", changed);
        }
        if (shareSound(expectedGlyph, givenGlyph, { ignoreTone: true })) {
          return build("tone", "medium", changed);
        }
        if (shareComponent(expectedGlyph, givenGlyph)) return build("grapheme", "high", changed);
        return build("lexical_choice", "medium", changed);
      }
    }

    // 3c. Faltou peça: se o que faltou é função gramatical, o erro é de gramática.
    if (isSubmultiset(givenGlyphs, expectedGlyphs)) {
      const missing = multisetDifference(expectedGlyphs, givenGlyphs);
      return build(functionWordCause(missing) ?? "omission", "high", missing);
    }

    // 3d. Sobrou peça.
    if (isSubmultiset(expectedGlyphs, givenGlyphs)) {
      const extra = multisetDifference(givenGlyphs, expectedGlyphs);
      const functionCause = functionWordCause(extra);
      if (functionCause) return build(functionCause, "high", extra);
      // Numa tarefa com OBJETIVO, uma resposta que contém tudo o que se pedia e
      // ainda acrescenta conteúdo não é erro de forma — é uma frase mais rica
      // ("amanhã quero ir a um banco" para "diga que vai ao banco"). O motor não
      // tem como decidir se está certa, então marca confiança baixa e deixa o
      // benefício da dúvida para o aluno em vez de cobrar "peça sobrando".
      if (input.hasCommunicativeGoal) return build("intrusion", "low", extra);
      return build("intrusion", "high", extra);
    }

    // 3e. Frase inteiramente outra, mas que EXISTE no corpus: o aluno produziu
    //     mandarim válido que não cumpre o objetivo. Isso é erro de intenção,
    //     não de forma — e tratá-lo como erro de forma seria ensinar errado.
    if (input.hasCommunicativeGoal && KNOWN_FORMS.has(cleanHanzi(givenRaw))) {
      return build("communicative", "medium");
    }

    if (audioOnly) return build("listening", "medium");
    return build("lexical_choice", "low");
  }

  // 4. Uma das pontas é hànzì e a outra não: o aluno respondeu em outra
  //    modalidade (traduziu quando devia escrever, ou vice-versa).
  if (hasHanzi(expectedRaw) !== hasHanzi(givenRaw)) {
    if (audioOnly) return build("listening", "medium");
    return build("meaning", "medium");
  }

  // 5. Respostas em português (significado, montagem de tradução).
  const expectedWords = wordsOf(expectedRaw);
  const givenWords = wordsOf(givenRaw);
  if (expectedWords.length > 1 && sameMultiset(expectedWords, givenWords)) {
    return build("word_order", "high");
  }
  if (expectedWords.length > 1 && isSubmultiset(givenWords, expectedWords)) {
    return build("omission", "medium", multisetDifference(expectedWords, givenWords));
  }
  if (expectedWords.length > 1 && isSubmultiset(expectedWords, givenWords)) {
    return build("intrusion", "medium", multisetDifference(givenWords, expectedWords));
  }
  if (audioOnly) return build("listening", "medium");
  return build("meaning", "medium");
}
