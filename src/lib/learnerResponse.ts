import { CHUNKS } from "../data/chunks";
import { CHARACTERS } from "../data/characters";
import { numericPinyinToDiacritics } from "./pinyin";

/**
 * V4.9.4 — P0: uma resposta, três formas de entrada.
 *
 * O campo de produção aberta diz ao aluno, em português e em inglês, que ele
 * pode responder "em hànzì ou pinyin". Até aqui isso era meia verdade: o
 * avaliador comparava o texto digitado com a resposta modelo depois de tirar
 * acentos e pontuação, então `再见` passava e `zài jiàn` não — a menos que
 * alguém tivesse lembrado de listar o pinyin à mão em `accepts`.
 *
 * O resultado é o beco sem saída que apareceu em uso real: o aluno sabe a
 * resposta, escreve exatamente o que a interface pediu, e a única saída é
 * "Pular". Uma promessa na tela que o código não cumpre é pior do que não ter
 * feito a promessa.
 *
 * Este módulo é a autoridade única de "o aluno conseguiu responder?". Ele não
 * é um segundo avaliador: a comparação em hànzì continua sendo a de sempre. O
 * que ele acrescenta é a ponte que faltava — comparar a digitação latina com o
 * pinyin CANÔNICO da resposta, tirado dos dados do próprio curso.
 *
 * De propósito NÃO existe aqui um conversor pinyin → hànzì por heurística.
 * Adivinhar caractere a partir de som é ambíguo em mandarim (zài pode ser 在,
 * 再, 载…), e um palpite errado reprovaria um aluno certo. A ponte é feita ao
 * contrário — do hànzì conhecido para o seu pinyin conhecido —, que é uma
 * direção sem ambiguidade porque a resposta esperada já é conhecida.
 */

export type ResponseModality = "HANZI" | "PINYIN" | "SPEECH";

export interface LearnerResponseVerdict {
  accepted: boolean;
  /** Como a resposta foi reconhecida. Diagnóstico, nunca nota diferente. */
  matchedAs?: "HANZI" | "PINYIN_TONED" | "PINYIN_TONELESS";
  /** A resposta aceita que casou, para o retorno mostrar a forma canônica. */
  matchedAnswer?: string;
}

const CJK = /[㐀-鿿豈-﫿]/;
const PUNCTUATION = /[，。！？、,.!?？;:：；"“”'‘’()[\]{}·]/g;

export function containsHanzi(value: string | undefined): boolean {
  return CJK.test(value ?? "");
}

/**
 * Normalização de hànzì: some pontuação e espaço, o caractere fica.
 *
 * Nada de aproximação: `再现` não pode passar por `再见`. Um caractere errado é
 * uma palavra errada, e aceitar "parecido" ensinaria o aluno a não olhar.
 */
export function normalizeHanziResponse(value: string | undefined): string {
  return (value ?? "").replace(PUNCTUATION, "").replace(/\s+/g, "").trim();
}

/**
 * Normalização de pinyin — a autoridade única da P0.7.
 *
 * `zai4` vira `zài` antes de qualquer coisa, então tone-number e tone-mark
 * chegam ao mesmo lugar. `keepTones` decide se o acento sobrevive: exercícios
 * que medem tom precisam da informação tonal, e apagá-la ali seria eliminar o
 * que a atividade existe para avaliar.
 */
export function normalizePinyinResponse(
  value: string | undefined,
  { keepTones = false }: { keepTones?: boolean } = {}
): string {
  const withMarks = numericPinyinToDiacritics(value ?? "");
  const base = withMarks.toLocaleLowerCase("en-US").replace(PUNCTUATION, "").replace(/\s+/g, "").trim();
  if (keepTones) return base.normalize("NFC").replace(/ü/g, "v");
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ü/g, "u");
}

/** Índice hànzì → pinyin, montado dos dados reais do curso. */
const PINYIN_BY_HANZI = new Map<string, string>();
for (const chunk of CHUNKS) {
  if (chunk.hanzi && chunk.pinyin) PINYIN_BY_HANZI.set(chunk.hanzi, chunk.pinyin);
}
for (const character of CHARACTERS) {
  if (character.hanzi && character.pinyin && !PINYIN_BY_HANZI.has(character.hanzi)) {
    PINYIN_BY_HANZI.set(character.hanzi, character.pinyin);
  }
}

/**
 * As leituras em pinyin de uma resposta em hànzì.
 *
 * Primeiro tenta a expressão inteira (是 `再见` → `zàijiàn`). Se ela não estiver
 * no léxico, compõe caractere a caractere — ainda a partir dos dados do curso,
 * nunca de palpite. Se algum caractere for desconhecido, devolve vazio: é
 * melhor não oferecer a ponte do que oferecer uma ponte errada.
 */
export function pinyinFormsFor(hanzi: string): string[] {
  const clean = normalizeHanziResponse(hanzi);
  if (!clean) return [];

  const whole = PINYIN_BY_HANZI.get(clean) ?? PINYIN_BY_HANZI.get(hanzi.trim());
  if (whole) return [whole];

  const perCharacter: string[] = [];
  for (const character of [...clean]) {
    const reading = PINYIN_BY_HANZI.get(character);
    if (!reading) return [];
    perCharacter.push(reading);
  }
  return perCharacter.length ? [perCharacter.join(" ")] : [];
}

export interface EvaluateLearnerResponseInput {
  draft: string;
  /** Respostas canônicas já autorizadas pelo conteúdo (modelo + `accepts`). */
  acceptedAnswers: readonly string[];
  /**
   * A atividade mede TOM? Então pinyin sem tom não basta.
   *
   * O padrão é `false` porque produção aberta pergunta "você consegue
   * responder a esta pessoa?", e a modalidade de entrada não é a dificuldade
   * avaliada. Um exercício de tom passa `true` e continua exigindo o tom.
   */
  tonesRequired?: boolean;
}

/**
 * O veredito único: o aluno conseguiu responder?
 *
 * A ordem importa. Hànzì primeiro, porque é a forma canônica. Pinyin com tom
 * depois. Pinyin sem tom por último e só quando a atividade não mede tom E a
 * resposta é inequívoca dentro do conjunto aceito — se duas respostas
 * autorizadas colidem sem o tom, aceitar seria dizer "certo" para quem talvez
 * quisesse a outra.
 */
export function evaluateLearnerResponse({
  draft,
  acceptedAnswers,
  tonesRequired = false,
}: EvaluateLearnerResponseInput): LearnerResponseVerdict {
  const raw = (draft ?? "").trim();
  if (!raw) return { accepted: false };

  const answers = acceptedAnswers.filter((answer) => Boolean(answer?.trim()));

  // 1 — hànzì exato (sem pontuação, sem espaço).
  const hanziDraft = normalizeHanziResponse(raw);
  for (const answer of answers) {
    if (hanziDraft && hanziDraft === normalizeHanziResponse(answer)) {
      return { accepted: true, matchedAs: "HANZI", matchedAnswer: answer };
    }
  }

  // Digitou hànzì e não bateu: caractere errado é resposta errada.
  //
  // Saída explícita, não salvaguarda: a correção não depende dela, porque
  // texto CJK nunca normaliza para latim e portanto jamais casaria no ramo de
  // pinyin abaixo. Ela está aqui para deixar a intenção legível — quem lê o
  // arquivo não precisa deduzir isso — e porque encurta o caminho comum.
  // Verifiquei removendo-a: nenhum teste cai, exatamente como esperado.
  if (containsHanzi(raw)) return { accepted: false };

  // 2 — pinyin com tom, contra o pinyin canônico de cada resposta aceita.
  const tonedDraft = normalizePinyinResponse(raw, { keepTones: true });
  for (const answer of answers) {
    const forms = containsHanzi(answer) ? pinyinFormsFor(answer) : [answer];
    for (const form of forms) {
      if (tonedDraft && tonedDraft === normalizePinyinResponse(form, { keepTones: true })) {
        return { accepted: true, matchedAs: "PINYIN_TONED", matchedAnswer: answer };
      }
    }
  }

  if (tonesRequired) return { accepted: false };

  // 3 — pinyin sem tom, só se não houver colisão entre as respostas aceitas.
  const tonelessDraft = normalizePinyinResponse(raw);
  const tonelessForms = new Map<string, string>();
  let ambiguous = false;
  for (const answer of answers) {
    const forms = containsHanzi(answer) ? pinyinFormsFor(answer) : [answer];
    for (const form of forms) {
      const key = normalizePinyinResponse(form);
      if (!key) continue;
      const existing = tonelessForms.get(key);
      if (existing && normalizeHanziResponse(existing) !== normalizeHanziResponse(answer)) {
        ambiguous = true;
      }
      if (!existing) tonelessForms.set(key, answer);
    }
  }
  if (!ambiguous && tonelessDraft && tonelessForms.has(tonelessDraft)) {
    return {
      accepted: true,
      matchedAs: "PINYIN_TONELESS",
      matchedAnswer: tonelessForms.get(tonelessDraft),
    };
  }

  return { accepted: false };
}
