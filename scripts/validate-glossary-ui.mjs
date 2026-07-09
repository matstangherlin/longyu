import fs from "node:fs";
import path from "node:path";

const glossPath = path.resolve("src/data/gloss.ts");
const source = fs.readFileSync(glossPath, "utf8");
const errors = [];

if (!source.includes("export function isMandarinGlossableToken")) {
  errors.push("gloss.ts deveria exportar isMandarinGlossableToken");
}

if (!source.includes("if (!isMandarinGlossableToken(token)) return null;")) {
  errors.push("partForToken deveria ignorar token latino comum em vez de marcar como nome próprio");
}

if (source.includes('meaningPt: "nome próprio"') && !source.includes("PROPER_NAMES.some")) {
  errors.push('nome próprio não deveria ser fallback cego para token latino desconhecido');
}

const commonPortuguese = ["qual", "combina", "escolha", "correto", "frase", "resposta", "completar", "significado", "diálogo", "pergunta", "com"];
const pinyinLike = ["nǐ", "hǎo", "ma3", "zhong", "xué"];
const properNames = ["马修"];

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const LATIN_TOKEN_RE = /^[\p{Script=Latin}][\p{Script=Latin}'’.-]*[1-5]?$/u;
const NUMERIC_PINYIN_RE = /([A-Za-züÜvV:]+)([1-5])/g;
const PINYIN_INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w", ""];
const PINYIN_FINALS = new Set([
  "a","ai","an","ang","ao","e","ei","en","eng","er","i","ia","ian","iang","iao","ie","in","ing","iong","iu","o","ong","ou","u","ua","uai","uan","uang","ue","ui","un","uo","ü","üe","üan","ün",
]);

function containsNumericPinyin(input) {
  NUMERIC_PINYIN_RE.lastIndex = 0;
  return NUMERIC_PINYIN_RE.test(input);
}

function stripPinyinTone(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U");
}

function isLikelyPinyinToken(token) {
  const sanitized = stripPinyinTone(token)
    .replace(/[1-5]/g, "")
    .replace(/u:/gi, (match) => (match === "U:" ? "Ü" : "ü"))
    .replace(/v/gi, (match) => (match === "V" ? "Ü" : "ü"))
    .toLowerCase();
  if (!/^[a-zü]+$/u.test(sanitized)) return false;
  return PINYIN_INITIALS.some((initial) => sanitized.startsWith(initial) && PINYIN_FINALS.has(sanitized.slice(initial.length)));
}

function isMandarinGlossableToken(token) {
  const raw = token.trim();
  if (!raw) return false;
  if (CJK_RE.test(raw)) return true;
  if (!LATIN_TOKEN_RE.test(raw)) return false;
  if (properNames.includes(raw)) return true;
  if (raw.toLowerCase() === "pinyin") return false;
  return containsNumericPinyin(raw) || isLikelyPinyinToken(raw);
}

for (const token of commonPortuguese) {
  if (isMandarinGlossableToken(token)) {
    errors.push(`token português comum não deveria ser glossável: ${token}`);
  }
}

for (const token of pinyinLike) {
  if (!isMandarinGlossableToken(token)) {
    errors.push(`token de pinyin deveria continuar glossável em contexto explícito: ${token}`);
  }
}

for (const token of properNames) {
  if (!isMandarinGlossableToken(token)) {
    errors.push(`nome próprio permitido deveria continuar glossável: ${token}`);
  }
}

const prompt = "Qual pinyin combina com 你好?";
const glossablePromptTokens = prompt
  .match(/([\u3400-\u9fff\uf900-\ufaff]+|[\p{Script=Latin}][\p{Script=Latin}'’.-]*[1-5]?)/gu)
  ?.filter((token) => isMandarinGlossableToken(token)) ?? [];

if (glossablePromptTokens.join("|") !== "你好") {
  errors.push(`no prompt misto, só 你好 deveria ser glossável; atual: ${glossablePromptTokens.join(", ") || "(nenhum)"}`);
}

if (errors.length > 0) {
  console.error("ERRO: validate:glossary-ui falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:glossary-ui passou.");
