import { CHARACTERS } from "./characters";
import { VOCABULARY } from "./vocabulary";
import type { VocabDomain } from "./types";

// ————————————————————————————————————————————————————————————————
// Motores de percepção e sentido.
//
// A jornada já sabia ensinar (ouvir → reconhecer → montar → usar). O que
// faltava era o aluno ser cobrado nas MESMAS palavras por caminhos
// diferentes. Este módulo é a fonte de conteúdo de quatro motores novos:
//
//   1. audio_discrimination — pares mínimos: "iguais ou diferentes?"
//   2. dictation            — ouvir e escrever (blocos / pinyin / hànzì)
//   3. odd_one_out          — qual não pertence ao grupo
//   4. spot_error           — qual frase faz sentido (e por quê)
//
// Regra de ouro: nada aqui inventa vocabulário. Pares mínimos e grupos
// semânticos são DERIVADOS do corpus (characters.ts / vocabulary.ts); só o
// banco de frases erradas é curado à mão — não dá para gerar mandarim errado
// de forma segura, e o erro precisa ser um erro REAL de quem fala português.
// ————————————————————————————————————————————————————————————————

export interface DrillItem {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
}

// ————————————————————————————————————————————————————————————————
// 1. Pares mínimos (audio_discrimination)
// ————————————————————————————————————————————————————————————————

export type MinimalPairContrast = "tone" | "initial" | "final";

export interface MinimalPairDrill {
  id: string;
  contrast: MinimalPairContrast;
  a: DrillItem;
  b: DrillItem;
  /** O que exatamente muda entre os dois sons (aparece na correção). */
  contrastLabelPt: string;
  /** Por que este par engana especificamente quem fala português. */
  notePt: string;
}

/** Iniciais do pinyin, das mais longas para as mais curtas (ordem importa). */
const PINYIN_INITIALS = [
  "zh", "ch", "sh",
  "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w",
];

function splitSyllable(toneless: string): { initial: string; final: string } {
  for (const initial of PINYIN_INITIALS) {
    if (toneless.startsWith(initial)) return { initial, final: toneless.slice(initial.length) };
  }
  return { initial: "", final: toneless };
}

/**
 * Contrastes de INICIAL que derrubam brasileiro. Cada grupo vira par mínimo
 * quando o corpus tem duas sílabas com a mesma final e iniciais do grupo.
 */
const CONFUSABLE_INITIALS: { ids: string[]; labelPt: string; notePt: string }[] = [
  { ids: ["zh", "j"], labelPt: "zh × j", notePt: "zh é retroflexo (língua enrolada para trás); j é palatal, quase o 'ti' do português carioca." },
  { ids: ["ch", "q"], labelPt: "ch × q", notePt: "ch sopra com a língua atrás; q sopra com a língua no céu da boca." },
  { ids: ["sh", "x"], labelPt: "sh × x", notePt: "sh é o 'x' de 'xícara' com a língua puxada para trás; x é mais fino, sorrindo." },
  { ids: ["z", "zh"], labelPt: "z × zh", notePt: "z é 'dz' na frente da boca; zh é 'dj' com a língua enrolada." },
  { ids: ["c", "ch"], labelPt: "c × ch", notePt: "c é 'ts' seco na frente; ch é o mesmo sopro com a língua atrás." },
  { ids: ["s", "sh"], labelPt: "s × sh", notePt: "s é o nosso 's'; sh puxa a língua para trás e escurece o som." },
  { ids: ["n", "l"], labelPt: "n × l", notePt: "Confusão comum: em português os dois soam parecidos em algumas regiões." },
  { ids: ["h", "f"], labelPt: "h × f", notePt: "h chinês raspa a garganta (como 'rr' carioca); f é o nosso f." },
];

/**
 * Contrastes de FINAL. O português nasaliza tudo — por isso -n × -ng é o
 * erro campeão: 'fen' e 'feng' viram a mesma coisa na boca de brasileiro.
 */
const CONFUSABLE_FINALS: { ids: string[]; labelPt: string; notePt: string }[] = [
  { ids: ["an", "ang"], labelPt: "-an × -ang", notePt: "-n fecha com a língua nos dentes; -ng fica aberto no fundo da boca." },
  { ids: ["en", "eng"], labelPt: "-en × -eng", notePt: "Em português os dois viram 'ẽ'. Em mandarim mudam a palavra inteira." },
  { ids: ["in", "ing"], labelPt: "-in × -ing", notePt: "-in termina fechado; -ing termina com o fundo da língua levantado." },
  { ids: ["ian", "iang"], labelPt: "-ian × -iang", notePt: "Mesma armadilha nasal, agora depois do i." },
  { ids: ["u", "ü"], labelPt: "u × ü", notePt: "ü é 'u' com boca de 'i' — não existe em português." },
  { ids: ["ai", "ei"], labelPt: "-ai × -ei", notePt: "Ditongos próximos; a diferença está na abertura da primeira vogal." },
  { ids: ["ao", "ou"], labelPt: "-ao × -ou", notePt: "-ao abre e fecha; -ou já começa arredondado." },
];

interface CorpusSyllable {
  hanzi: string;
  pinyin: string;
  toneless: string;
  tone: number;
  meaningPt: string;
  initial: string;
  final: string;
}

const CORPUS_SYLLABLES: CorpusSyllable[] = CHARACTERS.map((char) => {
  const { initial, final } = splitSyllable(char.toneless);
  return {
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    toneless: char.toneless,
    tone: char.tone,
    meaningPt: char.meaningPt,
    initial,
    final,
  };
});

function toneDistanceLabel(a: number, b: number): string {
  const names: Record<number, string> = { 1: "1º", 2: "2º", 3: "3º", 4: "4º", 5: "neutro" };
  return `${names[a] ?? a} × ${names[b] ?? b} tom`;
}

const TONE_CONFUSION_NOTES: Record<string, string> = {
  "2-3": "O par mais difícil do mandarim: os dois sobem no final. A diferença é que o 3º cai antes de subir.",
  "1-4": "Os dois são 'firmes'. O 1º fica parado no alto; o 4º despenca.",
  "1-2": "O 1º não se mexe; o 2º sobe como uma pergunta em português.",
  "3-4": "O 3º afunda e volta; o 4º só desce, com força.",
  "2-4": "Um sobe, o outro desce — mas em fala rápida a confusão acontece.",
  "1-3": "O 1º é alto e reto; o 3º começa baixo e afunda.",
};

function toneNote(a: number, b: number): string {
  const key = [a, b].sort().join("-");
  return TONE_CONFUSION_NOTES[key] ?? "Mesma sílaba, tom diferente: em mandarim isso muda a palavra.";
}

function buildToneMinimalPairs(): MinimalPairDrill[] {
  const byBase = new Map<string, CorpusSyllable[]>();
  for (const syllable of CORPUS_SYLLABLES) {
    if (syllable.tone < 1 || syllable.tone > 4) continue; // neutro não vira par de tom
    byBase.set(syllable.toneless, [...(byBase.get(syllable.toneless) ?? []), syllable]);
  }
  const drills: MinimalPairDrill[] = [];
  for (const [base, group] of byBase) {
    const byTone = new Map<number, CorpusSyllable>();
    for (const syllable of group) if (!byTone.has(syllable.tone)) byTone.set(syllable.tone, syllable);
    const tones = [...byTone.keys()].sort();
    for (let i = 0; i < tones.length; i += 1) {
      for (let j = i + 1; j < tones.length; j += 1) {
        const a = byTone.get(tones[i])!;
        const b = byTone.get(tones[j])!;
        drills.push({
          id: `mp_tone_${base}_${tones[i]}${tones[j]}`,
          contrast: "tone",
          a: { hanzi: a.hanzi, pinyin: a.pinyin, meaningPt: a.meaningPt },
          b: { hanzi: b.hanzi, pinyin: b.pinyin, meaningPt: b.meaningPt },
          contrastLabelPt: toneDistanceLabel(tones[i], tones[j]),
          notePt: toneNote(tones[i], tones[j]),
        });
      }
    }
  }
  return drills;
}

function buildSegmentMinimalPairs(): MinimalPairDrill[] {
  const drills: MinimalPairDrill[] = [];
  const seen = new Set<string>();

  const pushPair = (
    a: CorpusSyllable,
    b: CorpusSyllable,
    contrast: MinimalPairContrast,
    labelPt: string,
    notePt: string
  ) => {
    if (a.toneless === b.toneless) return;
    const key = [a.hanzi, b.hanzi].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    drills.push({
      // O id carrega os hànzì: 是×西 e 使×喜 têm as mesmas bases (shi/xi) e
      // colidiriam se o id usasse só a sílaba.
      id: `mp_${contrast}_${a.hanzi}${b.hanzi}`,
      contrast,
      a: { hanzi: a.hanzi, pinyin: a.pinyin, meaningPt: a.meaningPt },
      b: { hanzi: b.hanzi, pinyin: b.pinyin, meaningPt: b.meaningPt },
      contrastLabelPt: labelPt,
      notePt,
    });
  };

  for (const group of CONFUSABLE_INITIALS) {
    // Mesma final, iniciais confundíveis (ex.: shī × xī).
    const byFinal = new Map<string, CorpusSyllable[]>();
    for (const syllable of CORPUS_SYLLABLES) {
      if (!group.ids.includes(syllable.initial)) continue;
      byFinal.set(syllable.final, [...(byFinal.get(syllable.final) ?? []), syllable]);
    }
    for (const candidates of byFinal.values()) {
      for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
          if (candidates[i].initial === candidates[j].initial) continue;
          pushPair(candidates[i], candidates[j], "initial", group.labelPt, group.notePt);
        }
      }
    }
  }

  for (const group of CONFUSABLE_FINALS) {
    // Mesma inicial, finais confundíveis (ex.: fēn × fēng).
    const byInitial = new Map<string, CorpusSyllable[]>();
    for (const syllable of CORPUS_SYLLABLES) {
      if (!group.ids.includes(syllable.final)) continue;
      byInitial.set(syllable.initial, [...(byInitial.get(syllable.initial) ?? []), syllable]);
    }
    for (const candidates of byInitial.values()) {
      for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
          if (candidates[i].final === candidates[j].final) continue;
          pushPair(candidates[i], candidates[j], "final", group.labelPt, group.notePt);
        }
      }
    }
  }

  return drills;
}

/** Todos os pares mínimos derivados do corpus (tom + inicial + final). */
export const MINIMAL_PAIRS: MinimalPairDrill[] = [
  ...buildToneMinimalPairs(),
  ...buildSegmentMinimalPairs(),
];

/**
 * Pares mínimos disponíveis para um aluno: os dois lados precisam usar
 * glifos que ele já viu. Ordena pelo contraste mais urgente primeiro
 * (tom 2×3 > demais tons > inicial > final).
 */
export function minimalPairsFor(
  seenGlyphs: ReadonlySet<string>,
  options: { contrast?: MinimalPairContrast; limit?: number } = {}
): MinimalPairDrill[] {
  const available = MINIMAL_PAIRS.filter(
    (drill) =>
      seenGlyphs.has(drill.a.hanzi) &&
      seenGlyphs.has(drill.b.hanzi) &&
      (!options.contrast || drill.contrast === options.contrast)
  );
  const weight = (drill: MinimalPairDrill) => {
    if (drill.contrast === "tone") return drill.contrastLabelPt.startsWith("2º × 3º") ? 0 : 1;
    if (drill.contrast === "initial") return 2;
    return 3;
  };
  const sorted = [...available].sort((a, b) => weight(a) - weight(b) || a.id.localeCompare(b.id));
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

// ————————————————————————————————————————————————————————————————
// 2. Grupos semânticos (odd_one_out)
// ————————————————————————————————————————————————————————————————

export interface OddOneOutSet {
  id: string;
  /** Rótulo do grupo em pt-BR ("bebidas", "família"...). */
  groupLabelPt: string;
  /** Os três que pertencem ao grupo. */
  members: DrillItem[];
  /** O intruso e de onde ele veio. */
  intruder: DrillItem;
  intruderGroupLabelPt: string;
}

/**
 * Domínios que dão grupo semântico NÍTIDO. Ficam de fora particula, verbo,
 * negacao e pergunta: "qual não pertence" só é justo quando a categoria é
 * óbvia depois de descoberta — senão vira adivinhação.
 */
const ODD_ONE_OUT_DOMAINS: Partial<Record<VocabDomain, string>> = {
  bebida: "bebidas",
  comida: "comidas",
  familia: "família",
  numero: "números",
  lugar: "lugares",
  transporte: "transporte",
  tempo: "tempo",
  saudacao: "saudações",
  pessoa: "pessoas",
  compras: "compras",
  estudo: "estudo",
};

/** Pares de domínio que não servem de intruso: são próximos demais. */
const TOO_CLOSE: Array<[VocabDomain, VocabDomain]> = [
  ["comida", "bebida"],
  ["pessoa", "familia"],
  ["saudacao", "cortesia"],
  ["lugar", "transporte"],
];

function tooClose(a: VocabDomain, b: VocabDomain): boolean {
  return TOO_CLOSE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// Escapes explícitos: com os caracteres literais, o início do segundo
// intervalo normaliza para U+8C48 e a classe deixa de ser "só hànzì".
const HANZI_ONLY_RE = /^[\u3400-\u9fff\uf900-\ufaff]+$/u;

function vocabDrillItems(domain: VocabDomain, seenGlyphs: ReadonlySet<string>): DrillItem[] {
  return VOCABULARY.filter(
    (entry) =>
      entry.domain === domain &&
      entry.kind === "word" &&
      HANZI_ONLY_RE.test(entry.hanzi) &&
      [...entry.hanzi].every((glyph) => seenGlyphs.has(glyph))
  ).map((entry) => ({ hanzi: entry.hanzi, pinyin: entry.pinyin, meaningPt: entry.meaningPt }));
}

/**
 * Monta grupos "qual não pertence" a partir dos domínios do corpus. Só
 * entram palavras cujos glifos o aluno já viu — o exercício testa SENTIDO,
 * nunca vocabulário novo.
 */
export function oddOneOutSetsFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number } = {}
): OddOneOutSet[] {
  const domains = Object.keys(ODD_ONE_OUT_DOMAINS) as VocabDomain[];
  const pools = new Map<VocabDomain, DrillItem[]>();
  for (const domain of domains) pools.set(domain, vocabDrillItems(domain, seenGlyphs));

  const sets: OddOneOutSet[] = [];
  for (const domain of domains) {
    const pool = pools.get(domain) ?? [];
    if (pool.length < 3) continue;
    const members = pool.slice(0, 3);
    const memberHanzi = new Set(members.map((item) => item.hanzi));
    for (const other of domains) {
      if (other === domain || tooClose(domain, other)) continue;
      const intruder = (pools.get(other) ?? []).find((item) => !memberHanzi.has(item.hanzi));
      if (!intruder) continue;
      sets.push({
        id: `ooo_${domain}_${other}`,
        groupLabelPt: ODD_ONE_OUT_DOMAINS[domain]!,
        members,
        intruder,
        intruderGroupLabelPt: ODD_ONE_OUT_DOMAINS[other]!,
      });
      break; // um intruso por grupo mantém a variedade de domínios
    }
  }
  return options.limit ? sets.slice(0, options.limit) : sets;
}

// ————————————————————————————————————————————————————————————————
// 3. Frase certa × frase errada (spot_error)
// ————————————————————————————————————————————————————————————————

export interface SpotErrorDrill {
  id: string;
  /** A intenção em português: o aluno escolhe qual frase FAZ ISSO. */
  intentPt: string;
  right: { hanzi: string; pinyin: string };
  wrong: { hanzi: string; pinyin: string };
  /** Regra em uma frase — é isso que fica, não o "errou". */
  whyPt: string;
  /** Etiqueta do tipo de erro, para agrupar no diagnóstico. */
  errorTag:
    | "copula"
    | "adjetivo"
    | "idade"
    | "negacao"
    | "classificador"
    | "posse"
    | "ordem"
    | "particula"
    | "quantidade";
}

/**
 * Banco curado. Cada item é um erro REAL de quem fala português — não uma
 * frase aleatoriamente embaralhada. A frase errada existe porque a estrutura
 * do português empurra para ela.
 */
export const SPOT_ERROR_DRILLS: SpotErrorDrill[] = [
  {
    id: "se_agua",
    intentPt: "Pedir água.",
    right: { hanzi: "我要水。", pinyin: "wǒ yào shuǐ." },
    wrong: { hanzi: "我是水。", pinyin: "wǒ shì shuǐ." },
    whyPt: "是 é 'ser'. Para pedir, use 要 (querer). 我是水 diz 'eu sou água'.",
    errorTag: "copula",
  },
  {
    id: "se_estou_bem",
    intentPt: "Dizer que você está bem.",
    right: { hanzi: "我很好。", pinyin: "wǒ hěn hǎo." },
    wrong: { hanzi: "我是好。", pinyin: "wǒ shì hǎo." },
    whyPt: "Adjetivo em mandarim não pede 是. Ele vem sozinho, quase sempre com 很.",
    errorTag: "adjetivo",
  },
  {
    id: "se_idade",
    intentPt: "Dizer que você tem vinte anos.",
    right: { hanzi: "我二十岁。", pinyin: "wǒ èrshí suì." },
    wrong: { hanzi: "我有二十岁。", pinyin: "wǒ yǒu èrshí suì." },
    whyPt: "Idade não usa 有 ('ter'). Em mandarim você 'é' a idade: 我二十岁。",
    errorTag: "idade",
  },
  {
    id: "se_nao_tenho",
    intentPt: "Dizer que você não tem dinheiro.",
    right: { hanzi: "我没有钱。", pinyin: "wǒ méiyǒu qián." },
    wrong: { hanzi: "我不有钱。", pinyin: "wǒ bù yǒu qián." },
    whyPt: "有 é o único verbo que nega com 没, nunca com 不.",
    errorTag: "negacao",
  },
  {
    id: "se_nao_bebo",
    intentPt: "Dizer que você não bebe chá.",
    right: { hanzi: "我不喝茶。", pinyin: "wǒ bù hē chá." },
    wrong: { hanzi: "我喝不茶。", pinyin: "wǒ hē bù chá." },
    whyPt: "不 vem ANTES do verbo, nunca depois.",
    errorTag: "negacao",
  },
  {
    id: "se_amigo",
    intentPt: "Dizer que você tem um amigo.",
    right: { hanzi: "我有一个朋友。", pinyin: "wǒ yǒu yí ge péngyou." },
    wrong: { hanzi: "我有一朋友。", pinyin: "wǒ yǒu yī péngyou." },
    whyPt: "Entre número e substantivo entra sempre um classificador — aqui, 个.",
    errorTag: "classificador",
  },
  {
    id: "se_meu_livro",
    intentPt: "Dizer que este é o seu livro.",
    right: { hanzi: "这是我的书。", pinyin: "zhè shì wǒ de shū." },
    wrong: { hanzi: "这是我书。", pinyin: "zhè shì wǒ shū." },
    whyPt: "Posse com objeto pede 的: 我的书. (Família e pessoas próximas podem dispensar.)",
    errorTag: "posse",
  },
  {
    id: "se_amanha",
    intentPt: "Dizer que vocês vão amanhã.",
    right: { hanzi: "我们明天去。", pinyin: "wǒmen míngtiān qù." },
    wrong: { hanzi: "我们去明天。", pinyin: "wǒmen qù míngtiān." },
    whyPt: "Tempo vem antes do verbo em mandarim — o contrário do português.",
    errorTag: "ordem",
  },
  {
    id: "se_comer_arroz",
    intentPt: "Dizer que você quer comer arroz.",
    right: { hanzi: "我想吃米饭。", pinyin: "wǒ xiǎng chī mǐfàn." },
    wrong: { hanzi: "我想米饭吃。", pinyin: "wǒ xiǎng mǐfàn chī." },
    whyPt: "A ordem básica é sujeito → verbo → objeto. O objeto fica DEPOIS do verbo.",
    errorTag: "ordem",
  },
  {
    id: "se_pergunta_ma",
    intentPt: "Perguntar se ele é estudante.",
    right: { hanzi: "他是学生吗？", pinyin: "tā shì xuésheng ma?" },
    wrong: { hanzi: "他是吗学生？", pinyin: "tā shì ma xuésheng?" },
    whyPt: "吗 fecha a pergunta: vai sempre no FIM da frase.",
    errorTag: "particula",
  },
  {
    id: "se_em_casa",
    intentPt: "Dizer que ele está em casa.",
    right: { hanzi: "他在家。", pinyin: "tā zài jiā." },
    wrong: { hanzi: "他是在家。", pinyin: "tā shì zài jiā." },
    whyPt: "在 já é o verbo 'estar em'. Não precisa de 是 na frente.",
    errorTag: "copula",
  },
  {
    id: "se_quanto_custa",
    intentPt: "Perguntar o preço.",
    right: { hanzi: "多少钱？", pinyin: "duōshao qián?" },
    wrong: { hanzi: "几钱？", pinyin: "jǐ qián?" },
    whyPt: "几 é para números pequenos e contáveis. Preço usa 多少.",
    errorTag: "quantidade",
  },
  {
    id: "se_chamo",
    intentPt: "Dizer seu nome.",
    right: { hanzi: "我叫小明。", pinyin: "wǒ jiào Xiǎomíng." },
    wrong: { hanzi: "我是叫小明。", pinyin: "wǒ shì jiào Xiǎomíng." },
    whyPt: "叫 já é o verbo 'chamar-se'. Dois verbos seguidos não funcionam aqui.",
    errorTag: "copula",
  },
  {
    id: "se_ir_escola",
    intentPt: "Dizer que você vai à escola.",
    right: { hanzi: "我去学校。", pinyin: "wǒ qù xuéxiào." },
    wrong: { hanzi: "我去到学校。", pinyin: "wǒ qù dào xuéxiào." },
    whyPt: "去 já carrega o 'ir a'. O 到 do português ('ir até') sobra aqui.",
    errorTag: "ordem",
  },
  {
    id: "se_falo_chines",
    intentPt: "Dizer que você fala um pouco de chinês.",
    right: { hanzi: "我会说中文。", pinyin: "wǒ huì shuō zhōngwén." },
    wrong: { hanzi: "我会中文说。", pinyin: "wǒ huì zhōngwén shuō." },
    whyPt: "会 acompanha o verbo, e o objeto continua depois dele: 会说中文.",
    errorTag: "ordem",
  },
  {
    id: "se_e_professora",
    intentPt: "Dizer que ela é professora.",
    right: { hanzi: "她是老师。", pinyin: "tā shì lǎoshī." },
    wrong: { hanzi: "她很老师。", pinyin: "tā hěn lǎoshī." },
    whyPt: "很 é para adjetivo. Substantivo ('professora') pede 是.",
    errorTag: "adjetivo",
  },
];

/**
 * Drills liberados: as DUAS frases (certa e errada) só podem usar glifos que
 * o aluno já viu — a pergunta é sobre estrutura, não sobre vocabulário novo.
 */
export function spotErrorDrillsFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number } = {}
): SpotErrorDrill[] {
  const knows = (text: string) =>
    [...text].every((glyph) => !HANZI_ONLY_RE.test(glyph) || seenGlyphs.has(glyph));
  const available = SPOT_ERROR_DRILLS.filter(
    (drill) => knows(drill.right.hanzi) && knows(drill.wrong.hanzi)
  );
  return options.limit ? available.slice(0, options.limit) : available;
}

// ————————————————————————————————————————————————————————————————
// 4. Ditado (dictation)
// ————————————————————————————————————————————————————————————————

/**
 * Níveis do ditado. Cada um cobra a MESMA frase por um canal diferente —
 * é o motor mais barato de reaproveitar, porque usa o áudio que já existe.
 */
export type DictationMode = "blocks" | "pinyin" | "hanzi";

export const DICTATION_MODE_LABELS: Record<DictationMode, string> = {
  blocks: "Ouça e monte",
  pinyin: "Ouça e escreva o pinyin",
  hanzi: "Ouça e escreva o hànzì",
};

export const DICTATION_MODE_HINTS: Record<DictationMode, string> = {
  blocks: "Toque nas peças na ordem em que você ouvir.",
  pinyin: "Escreva o que ouviu em pinyin. Acentos são opcionais.",
  hanzi: "Escreva o que ouviu em hànzì.",
};

/**
 * Nível de ditado adequado à fase: começa montando com peças, sobe para
 * pinyin e só depois cobra hànzì — a mesma ordem do blueprint
 * (som → fala → forma).
 *
 * O nível hànzì exige teclado chinês, que nem todo aluno tem. O passo gerado
 * sempre carrega também as peças de montagem, e a tela oferece a troca; aqui
 * só se decide o nível de partida.
 */
export function dictationModeForPhase(phaseOrder: number): DictationMode {
  if (phaseOrder <= 2) return "blocks";
  if (phaseOrder <= 4) return "pinyin";
  return "hanzi";
}
