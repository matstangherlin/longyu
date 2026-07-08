import type { Radical } from "./types";

// "Repertório de peças" — radicais/componentes que o aluno desmonta.
export const RADICALS: Radical[] = [
  { id: "ren", glyph: "人", variant: "亻", namePt: "Pessoa", meaningPt: "ser humano, gente", pinyin: "rén", category: "pessoa" },
  { id: "mu", glyph: "木", namePt: "Árvore", meaningPt: "madeira, árvore", pinyin: "mù", category: "natureza" },
  { id: "shui", glyph: "水", variant: "氵", namePt: "Água", meaningPt: "água, líquido", pinyin: "shuǐ", category: "agua" },
  { id: "huo", glyph: "火", variant: "灬", namePt: "Fogo", meaningPt: "fogo, calor", pinyin: "huǒ", category: "natureza" },
  { id: "kou", glyph: "口", namePt: "Boca", meaningPt: "boca, abertura", pinyin: "kǒu", category: "corpo" },
  { id: "xin", glyph: "心", variant: "忄", namePt: "Coração", meaningPt: "coração, emoção", pinyin: "xīn", category: "corpo" },
  { id: "shan", glyph: "山", namePt: "Montanha", meaningPt: "montanha", pinyin: "shān", category: "natureza" },
  { id: "ri", glyph: "日", namePt: "Sol", meaningPt: "sol, dia", pinyin: "rì", category: "natureza" },
  { id: "yue", glyph: "月", namePt: "Lua", meaningPt: "lua, mês", pinyin: "yuè", category: "natureza" },
  { id: "nv", glyph: "女", namePt: "Mulher", meaningPt: "mulher, feminino", pinyin: "nǚ", category: "pessoa" },
  { id: "zi", glyph: "子", namePt: "Filho", meaningPt: "criança, filho", pinyin: "zǐ", category: "pessoa" },
  { id: "mian", glyph: "宀", namePt: "Teto", meaningPt: "teto, casa (radical)", pinyin: "mián", category: "objeto" },
  { id: "yan", glyph: "讠", namePt: "Fala", meaningPt: "fala, palavra (radical)", pinyin: "yán", category: "fala" },
  { id: "ma_h", glyph: "马", namePt: "Cavalo", meaningPt: "cavalo", pinyin: "mǎ", category: "objeto" },
  { id: "cao", glyph: "艹", namePt: "Planta", meaningPt: "erva, planta (radical)", pinyin: "cǎo", category: "natureza" },
  { id: "men_door", glyph: "门", namePt: "Porta", meaningPt: "porta, portão", pinyin: "mén", category: "objeto" },
  { id: "shi_food", glyph: "饣", namePt: "Comida", meaningPt: "comida, alimentação (radical)", pinyin: "shí", category: "objeto" },
  { id: "chuo", glyph: "辶", namePt: "Caminho", meaningPt: "andar, movimento (radical)", pinyin: "chuò", category: "abstrato" },
  { id: "tu", glyph: "土", namePt: "Terra", meaningPt: "terra, solo", pinyin: "tǔ", category: "natureza" },
];

export const radicalById = Object.fromEntries(RADICALS.map((r) => [r.id, r]));
