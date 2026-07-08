// Modelo de dados do Longyu.
// Tudo em pt-BR nas glosas; pinyin com tom numérico para gerar áudio/cor.

export type ItemType = "char" | "chunk" | "radical";

/**
 * Domínio semântico de um item pedagógico. Agrupa vocabulário por situação
 * de uso (sobrevivência primeiro), não por classe gramatical acadêmica.
 */
export type VocabDomain =
  | "saudacao"
  | "apresentacao"
  | "cortesia"
  | "comida"
  | "bebida"
  | "numero"
  | "tempo"
  | "pessoa"
  | "familia"
  | "lugar"
  | "compras"
  | "transporte"
  | "estudo"
  | "trabalho"
  | "gostos"
  | "pergunta"
  | "negacao"
  | "verbo"
  | "particula"
  | "hanzi_basico"
  | "frase_social"
  | "sobrevivencia";

/**
 * Nível de progressão de um item:
 * - seed: primeiras lições — o aluno vê logo no começo;
 * - beginner: primeiras fases (cumprimentos, nome, números baixos);
 * - elementary: frases simples completas (gostos, família, compras);
 * - survival: kit de sobrevivência real (restaurante, transporte, loja);
 * - review: consolidação — aparece na revisão, não em lição nova;
 * - advancedPreview: além do MVP — aparece marcado como prévia, nunca cobrado.
 */
export type VocabLevel =
  | "seed"
  | "beginner"
  | "elementary"
  | "survival"
  | "review"
  | "advancedPreview";

/** Componente/radical reutilizável ("peça de Lego"). */
export interface Radical {
  id: string;
  glyph: string;
  /** Forma combinante quando vira radical lateral (ex.: 人 → 亻). */
  variant?: string;
  namePt: string;
  meaningPt: string;
  pinyin?: string;
  category: "agua" | "pessoa" | "natureza" | "fala" | "corpo" | "abstrato" | "objeto";
}

/** Caractere (hanzi). */
export interface Character {
  id: string;
  hanzi: string;
  pinyin: string; // com diacríticos, ex.: "xiū"
  toneless: string; // sem diacríticos, ex.: "xiu"
  tone: 1 | 2 | 3 | 4 | 5; // 5 = neutro
  meaningPt: string;
  freqRank: number;
  /** ids de Radical que compõem o caractere. */
  components: string[];
  /** id do componente que dá a pista de SOM (fono-semântico). Os demais dão sentido. */
  phonetic?: string;
  /** Mnemônico de desmontagem ("pessoa encostada na árvore = descansar"). */
  mnemonicPt?: string;
  exampleWords?: { hanzi: string; pinyin: string; pt: string }[];
}

/** Bloco de fala útil (chunk). */
export interface Chunk {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  literalPt?: string;
  tags: string[];
  /** Domínio semântico principal (o primeiro tag costuma coincidir). */
  domain?: VocabDomain;
  /** Nível de progressão em que o chunk é apresentado. */
  level?: VocabLevel;
}

/**
 * Entrada do banco de vocabulário curado (PT-BR → mandarim).
 * Diferente de Chunk (frases prontas), aqui vivem palavras e microfrases
 * com domínio e nível obrigatórios — a base consultável do aluno.
 */
export interface VocabEntry {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  domain: VocabDomain;
  level: VocabLevel;
  /** "word" = palavra; "phrase" = microfrase útil (2 a 5 caracteres). */
  kind: "word" | "phrase";
  literalPt?: string;
  /** Nota de uso curta (registro, armadilha comum para brasileiros). */
  notePt?: string;
  /** Origem: curado à mão agora; "first5000" habilita importação em massa depois. */
  source?: "curated" | "first5000";
}

/** Sílaba para o treinador de tons. */
export interface ToneSyllable {
  base: string; // "ma"
  forms: { tone: 1 | 2 | 3 | 4; hanzi: string; pinyin: string; meaningPt: string }[];
}

export interface Phase {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  goal: string;
  status: "done" | "current" | "locked";
}

export type LessonStepKind =
  | "listen"
  | "comprehend"
  | "produce"
  | "reveal-hanzi"
  | "microread";

export interface MicroText {
  id: string;
  title: string;
  /** Lição da jornada que libera este texto na biblioteca/leitura. */
  unlockAfterLesson: string;
  lines: { hanzi: string; pinyin: string; pt: string }[];
  glossary: { hanzi: string; pt: string }[];
  /**
   * Itens que o aluno precisa ter visto antes de ler ("chunk:id" | "char:id" | "vocab:id").
   * O validador de corpus confere que todos existem no repertório.
   */
  requiredItems?: string[];
  /** Fase/módulo recomendado para exibição ("Fase 3 · Frases iniciais"). */
  recommendedPhase?: string;
}
