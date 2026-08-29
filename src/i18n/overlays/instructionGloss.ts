/**
 * Instruction overlay: canonical copy stays pt-BR in journey data.
 * English is a lookup + pattern layer keyed by the Portuguese string.
 * Scoring uses PT identity (reverse map + aliases), never Olá === Hello as raw text.
 */

import instructionGlossEn from "./instructionGloss.en.json";
import { DEFAULT_LOCALE, type SupportedLocale } from "../config";

export const INSTRUCTION_GLOSS_EN: Record<string, string> = instructionGlossEn as Record<string, string>;

const CJK_RE = /[\u3400-\u9fff]/;
const PINYIN_MARK_CHARS = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/;

/** Extra EN answers that must canonicalise to the same PT identity. */
const EXTRA_EN_ALIASES: Record<string, string> = {
  Hi: "Olá",
  hi: "Olá",
  "Hello!": "Olá!",
  "Hello?": "Olá?",
  "I'm fine?": "Estou bem?",
  "Thank you": "Obrigado(a)",
  "Thank you.": "Obrigado(a).",
  Thanks: "Obrigado(a)",
  "Thanks.": "Obrigado(a).",
  Bye: "Até logo",
  "See you": "Até logo",
  "See you later!": "Até logo!",
  "How are you": "Tudo bem?",
  "I am fine": "Estou bem",
  "I'm well": "Estou bem",
  "I am well": "Estou bem",
  "You're welcome.": "De nada.",
  "Excuse me.": "Com licença.",
  Same: "Iguais",
  same: "Iguais",
  Different: "Diferentes",
  different: "Diferentes",
  "I'm Brazilian": "Sou brasileiro",
  "I am Brazilian": "Sou brasileiro",
  "How are you?": "Tudo bem?",
};

const EN_TO_PT = new Map<string, string>();
for (const [pt, en] of Object.entries(INSTRUCTION_GLOSS_EN)) {
  if (en && !EN_TO_PT.has(en)) EN_TO_PT.set(en, pt);
}
for (const [en, pt] of Object.entries(EXTRA_EN_ALIASES)) {
  EN_TO_PT.set(en, pt);
}

export function isCanonicalZhOrPinyin(value: string | undefined | null): boolean {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (/^(same|different)$/i.test(text)) return true;
  if (/^[\u3400-\u9fff\s。？！，、…·]+$/.test(text)) return true;
  const withoutPinyinMarks = text.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/g, "");
  const foldedMarks = text.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/g, "a");
  if (CJK_RE.test(text) && !/[A-Za-zÀ-ÿ]/.test(withoutPinyinMarks)) return true;
  const pinyinOnly = /[ǎěǐǒǔǖǘǚǜāēīōūüìòù]/i.test(text);
  const portugueseOnly = /[ãõçâêô]/i.test(text);
  if (portugueseOnly) return false;
  if (
    pinyinOnly &&
    /^[a-züv\s\d'\-?!.,·]+$/i.test(foldedMarks)
  ) {
    return true;
  }
  if (
    /\s/.test(text) &&
    PINYIN_MARK_CHARS.test(text) &&
    /^[a-züv\s\d'\-?!.,·]+$/i.test(foldedMarks)
  ) {
    return true;
  }
  return false;
}

function lookupExact(pt: string): string | undefined {
  const direct = INSTRUCTION_GLOSS_EN[pt];
  if (typeof direct === "string" && direct.length > 0) return direct;
  const trimmed = pt.trim();
  if (trimmed !== pt) {
    const alt = INSTRUCTION_GLOSS_EN[trimmed];
    if (typeof alt === "string" && alt.length > 0) return alt;
  }
  return undefined;
}

function applyPatterns(pt: string, locale: SupportedLocale): string | undefined {
  const monte = pt.match(/^Monte:\s*(.+)$/);
  if (monte) return `Build: ${resolveInstructionText(monte[1], locale)}`;
  const complete = pt.match(/^Complete:\s*(.+)$/);
  if (complete) return `Complete: ${resolveInstructionText(complete[1], locale)}`;
  const want = pt.match(/^Você quer dizer:\s*(.+)$/);
  if (want) return `You want to say: ${resolveInstructionText(want[1], locale)}`;
  const which = pt.match(/^Qual hànzì significa [“"](.+)[”"]\?$/);
  if (which) return `Which hànzì means “${resolveInstructionText(which[1], locale)}”?`;
  const say = pt.match(/^Diga em mandarim:\s*(.+)$/);
  if (say) return `Say in Mandarin: ${resolveInstructionText(say[1], locale)}`;
  const lessonOf = pt.match(/^Lição (\d) de 4(?: · (.+))?$/);
  if (lessonOf) {
    const pass = lessonOf[2] ? ` · ${resolveInstructionText(lessonOf[2], locale)}` : "";
    return `Lesson ${lessonOf[1]} of 4${pass}`;
  }
  const lessonDone = pt.match(/^Lição (\d) de 4 concluída$/);
  if (lessonDone) return `Lesson ${lessonDone[1]} of 4 complete`;
  const remaining = pt.match(/^Faltam (\d) lições para dominar este tema\.$/);
  if (remaining) return `${remaining[1]} lessons left to master this topic.`;
  const de = pt.match(/^(\d+) de (\d+)$/);
  if (de) return `${de[1]} of ${de[2]}`;
  const means = pt.match(/^([\u3400-\u9fff].*?)\s+significa\s+(.+)$/);
  if (means) return `${means[1]} means ${resolveInstructionText(means[2], locale)}`;
  const equals = pt.match(/^([\u3400-\u9fff][^=]{0,24}?)\s*=\s+(.+)$/);
  if (equals && !isCanonicalZhOrPinyin(equals[2])) {
    return `${equals[1].trim()} = ${resolveInstructionText(equals[2].trim(), locale)}`;
  }
  const monteHanzi = pt.match(/^Monte o hànzì de (.+)\.$/);
  if (monteHanzi) return `Build the hànzì for ${resolveInstructionText(monteHanzi[1], locale)}.`;
  const youChose = pt.match(/^Você escolheu (.+), que significa (.+)\.$/);
  if (youChose) {
    return `You chose ${youChose[1]}, which means ${resolveInstructionText(youChose[2], locale)}.`;
  }
  const whichTone = pt.match(/^Qual é o tom de (.+)\?$/);
  if (whichTone) return `What is the tone of ${whichTone[1]}?`;
  const nthTone = pt.match(/^(\d)º tom$/);
  if (nthTone) return `tone ${nthTone[1]}`;
  const vemDe = pt.match(/^vem de (.+)$/);
  if (vemDe) return `comes from ${vemDe[1]}`;
  const parteDe = pt.match(/^parte de (.+)$/);
  if (parteDe) return `part of ${parteDe[1]}`;
  const baseDe = pt.match(/^base de (.+)$/);
  if (baseDe) return `base of ${baseDe[1]}`;
  const skipReq = pt.match(/^(\d+)% no bloco pontuado · itens essenciais obrigatórios · mín\. (\d+) perguntas$/);
  if (skipReq) {
    return `${skipReq[1]}% on the scored block · required essentials · min. ${skipReq[2]} questions`;
  }
  const connected = pt.match(/^Você está conectado como (.+)\. Ao sair, o progresso continua salvo na nuvem\.$/);
  if (connected) return `You are signed in as ${connected[1]}. Signing out keeps progress saved in the cloud.`;
  const acessoPro = pt.match(/^Acesso Pro até (.+)\.$/);
  if (acessoPro) return `Pro access until ${acessoPro[1]}.`;
  const ofensiva = pt.match(/^Ofensiva de (\d+) dias$/);
  if (ofensiva) return `${ofensiva[1]}-day streak`;
  const faseStar = pt.match(/^Fase (.+) com 3★$/);
  if (faseStar) return `Phase ${faseStar[1]} at 3★`;
  const pearlGoal = pt.match(/^(Erros corrigidos|Hànzì aprendidos|Treino de áudio|Produção\/fala) · (\d+)$/);
  if (pearlGoal) {
    const labels: Record<string, string> = {
      "Erros corrigidos": "Errors corrected",
      "Hànzì aprendidos": "Hànzì learned",
      "Treino de áudio": "Audio practice",
      "Produção/fala": "Speaking production",
    };
    return `${labels[pearlGoal[1]]} · ${pearlGoal[2]}`;
  }
  const medalhaDe = pt.match(/^Medalha de (.+)$/);
  if (medalhaDe) return `${medalhaDe[1]} medal`;
  const readyOpen = pt.match(/^(\d+) (pronto|prontos) para abrir$/);
  if (readyOpen) return `${readyOpen[1]} ready to open`;
  const skipQi = pt.match(/^Você já usou a tentativa grátis desta semana\. Junte (\d+) Qi ou um Passe de teste\.$/);
  if (skipQi) return `You already used this week's free attempt. Gather ${skipQi[1]} Qi or a Test Pass.`;
  const startClose = pt.match(/^Bom começo — faltam (\d+) peças para fechar\.$/);
  if (startClose) return `Good start — ${startClose[1]} pieces left to finish.`;
  const stillMissing = pt.match(/^Ainda faltam (\d+) peças\. Continue montando\.$/);
  if (stillMissing) return `${stillMissing[1]} pieces still missing. Keep building.`;
  const firstInPlace = pt.match(/^As (\d+) primeiras peças estão no lugar — ajuste a ordem das outras\.$/);
  if (firstInPlace) return `The first ${firstInPlace[1]} pieces are in place — adjust the order of the others.`;
  const firstCorrect = pt.match(/^As (\d+) primeiras estão certas\. Revise o restante\.$/);
  if (firstCorrect) return `The first ${firstCorrect[1]} are right. Check the rest.`;
  return undefined;
}

export function hasEnglishOverlay(pt: string | undefined | null): boolean {
  const text = String(pt ?? "");
  if (!text.trim()) return true;
  if (isCanonicalZhOrPinyin(text)) return true;
  if (lookupExact(text)) return true;
  if (applyPatterns(text, "en")) return true;
  return false;
}

export function resolveInstructionText(
  text: string | undefined | null,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  if (text == null) return "";
  if (locale === "pt-BR") return text;
  if (!text) return text;
  const mapped = lookupExact(text);
  if (mapped) return mapped;
  if (isCanonicalZhOrPinyin(text)) return text;
  const patterned = applyPatterns(text, locale);
  if (patterned) return patterned;
  return text;
}

export function toCanonicalAnswerIdentity(raw: string | undefined | null): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const extra = EXTRA_EN_ALIASES[text];
  if (extra) return extra;
  const reversed = EN_TO_PT.get(text);
  if (reversed) return reversed;
  return text;
}

function foldAnswer(raw: string): string {
  return toCanonicalAnswerIdentity(raw)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.!?。]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function answersEquivalent(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a === b) return true;
  return foldAnswer(a) === foldAnswer(b);
}

function compactAnswer(raw: string | undefined | null): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/[，。！？、,.!?\s：；;“”"（）()]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

/** Scoring: EN gloss aliases plus CJK/pinyin compact equality (order-reply, banks). */
export function scoredAnswersMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (answersEquivalent(a, b)) return true;
  const left = compactAnswer(a);
  const right = compactAnswer(b);
  if (!left || !right) return false;
  return left === right;
}

function mapSourcePiece(value: string, locale: SupportedLocale): string {
  if (isCanonicalZhOrPinyin(value)) return value;
  return resolveInstructionText(value, locale);
}

export function localizeStringList(
  values: readonly string[] | undefined,
  locale: SupportedLocale
): string[] | undefined {
  if (!values) return values;
  return values.map((value) => mapSourcePiece(value, locale));
}
