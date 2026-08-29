#!/usr/bin/env node
/**
 * Author 51–80 EN overlay from dump + templates matching V4.8.3 phrasing.
 * Writes t5180-en.json, t5180-kinds.json and merges into instructionGloss.en.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dump = JSON.parse(readFileSync(path.join(root, "docs/localization/topics-51-80.dump.json"), "utf8"));
const glossPath = path.join(root, "src/i18n/overlays/instructionGloss.en.json");
const gloss = JSON.parse(readFileSync(glossPath, "utf8"));

const TITLE = {
  Amigo: "Friend",
  "Caracteres de frase": "Sentence Characters",
  "Números visuais": "Visual Numbers",
  "Peças da natureza": "Nature Pieces",
  "Repetir intensifica": "Repeating Intensifies",
  "Sol e lua": "Sun and Moon",
  "妈: sentido + som": "妈: meaning + sound",
  Água: "Water",
  "Céu e dia": "Sky and Day",
  Aplicar: "Apply",
  Distinguir: "Distinguish",
  "Frase curta": "Short sentence",
  "Conte em sequência": "Count in sequence",
  "Complete 明天": "Complete 明天",
  "Monte 我": "Build 我",
  "Monte 朋友": "Build 朋友",
  "Pedir água": "Ask for water",
  "Apontando a paisagem": "Pointing at the landscape",
  "Aponte o céu": "Point to the sky",
  "Promessa do tema": "Topic promise",
  Ser: "To be",
  claro: "bright",
  criança: "child",
  "sol/dia": "sun/day",
  "Sol + lua": "Sun + moon",
};

const IDEA = {
  pessoa: "a person",
  boca: "a mouth",
  "céu/dia": "the sky or a day",
  montanha: "a mountain",
  "sol/dia": "the sun or a day",
  "lua/mês": "the moon or a month",
  água: "water",
  fogo: "fire",
};

const GLOSS = {
  pessoa: "person",
  boca: "mouth",
  "céu/dia": "sky/day",
  montanha: "mountain",
  "sol/dia": "sun/day",
  "lua/mês": "moon/month",
  água: "water",
  fogo: "fire",
  céu: "sky",
  lua: "moon",
  sol: "sun",
  "árvore, madeira": "tree, wood",
  árvore: "tree",
  madeira: "wood",
  "lua, mês": "moon, month",
  grande: "big",
  pequeno: "small",
  mulher: "woman",
  criança: "child",
  amigo: "friend",
  amanhã: "tomorrow",
  bosque: "woods",
  floresta: "forest",
  descansar: "rest",
  bom: "good",
};

function titleEn(name) {
  if (TITLE[name]) return TITLE[name];
  return name;
}

function ideaEn(pt) {
  return IDEA[pt] ?? GLOSS[pt] ?? pt;
}

function glossEn(pt) {
  return GLOSS[pt] ?? TITLE[pt] ?? pt;
}

/** Unique pedagogical copy (not covered by the slice templates). */
const UNIQUE = {
  "+": "+",
  "=": "=",
  "1º × 3º tom": "1st × 3rd tone",
  "2º × 4º tom": "2nd × 4th tone",
  "abre 明天": "opens 明天",
  "Agora aponte para a lua.": "Now point to the moon.",
  Água: "Water",
  "Água?": "Water?",
  "Água.": "Water.",
  "Alguém pergunta o que você está fazendo agora. Responda que está isto.":
    "Someone asks what you are doing now. Answer that you are doing this.",
  amanhã: "tomorrow",
  amigo: "friend",
  Amigo: "Friend",
  Aplicar: "Apply",
  "Apontando a paisagem": "Pointing at the landscape",
  "Aponte o céu": "Point to the sky",
  "Aquilo é a lua?": "Is that the moon?",
  "Aquilo é a lua.": "That is the moon.",
  "aquilo é céu": "that is sky",
  "Aquilo é o céu.": "That is the sky.",
  "Aquilo é o sol?": "Is that the sun?",
  "aquilo é pessoa (pergunta)": "that is a person (question)",
  "Aquilo é uma montanha?": "Is that a mountain?",
  "Aquilo é uma montanha.": "That is a mountain.",
  "Aquilo é uma pessoa?": "Is that a person?",
  "aquilo; aquele, aquela": "that; that one",
  "base de 好": "base of 好",
  "base de 明": "base of 明",
  "base de 林 e 森": "base of 林 and 森",
  "Bāxī rén": "Bāxī rén",
  Bāxīrén: "Bāxīrén",
  "bom / bem": "good / well",
  bosque: "woods",
  "Caracteres de frase": "Sentence Characters",
  céu: "sky",
  "Céu e dia": "Sky and Day",
  claro: "bright",
  "claro; brilhante": "bright; clear",
  "Com três árvores vira 森 (floresta).": "With three trees it becomes 森 (forest).",
  "Combine as peças de 明.": "Put the pieces of 明 together.",
  "Como componente, água costuma apontar para líquidos e fluxo.":
    "As a component, water usually points to liquids and flow.",
  "Como radical lateral costuma aparecer como 氵.": "As a side radical it usually appears as 氵.",
  "Complete a palavra: __天. Qual hànzì abre 'amanhã'?":
    "Fill in the blank: __天. Which hànzì opens ‘tomorrow’?",
  "Complete 明天": "Complete 明天",
  "Complete: Aquilo é uma pessoa?.": "Complete: Is that a person?",
  "Complete: Você fala inglês?.": "Complete: Do you speak English?",
  "Conte em sequência": "Count in sequence",
  criança: "child",
  "Decorar 你好 em qualquer aula": "Memorize 你好 in any lesson",
  descansar: "rest",
  "dia; céu": "day; sky",
  Distinguir: "Distinguish",
  "Dizer que você fala um pouco de chinês.": "Say that you speak a little Chinese.",
  "Dois traços que se apoiam no topo e abrem para baixo.":
    "Two strokes that meet at the top and open downward.",
  "Duas árvores, lado a lado.": "Two trees, side by side.",
  "Duas faíscas no topo e duas chamas descendo.": "Two sparks at the top and two flames dropping down.",
  "Duas 月 lado a lado: companheiros que andam juntos.":
    "Two 月 side by side: companions who walk together.",
  "Era o mesmo som duas vezes: mā. O 1º é alto e reto; o 3º começa baixo e afunda.":
    "It was the same sound twice: mā. The 1st is high and level; the 3rd starts low and dips.",
  "Era o mesmo som duas vezes: má. Um sobe, o outro desce — mas em fala rápida a confusão acontece.":
    "It was the same sound twice: má. One rises, the other falls — but in fast speech they get mixed up.",
  "este, isto": "this",
  floresta: "forest",
  "Frase curta": "Short sentence",
  "Gancho no centro e um ponto de cada lado.": "A hook in the center and a dot on each side.",
  "Ganhar estrelas": "Earn stars",
  "Hã? A pista é água: 水.": "Huh? The hint is water: 水.",
  "hěn hǎo!": "hěn hǎo!",
  "hěnhǎo!": "hěnhǎo!",
  "Ignorar o contexto": "Ignore the context",
  "Ignorar o título": "Ignore the title",
  "isto é o quê": "what is this",
  "Isto é uma árvore.": "This is a tree.",
  "Isto é 木.": "This is 木.",
  jīntiānhěnhǎo: "jīntiānhěnhǎo",
  lua: "moon",
  "Lua?": "Moon?",
  "Monte a sequência: um, dois, três.": "Build the sequence: one, two, three.",
  "Monte o hànzì de água sem silhueta.": "Build the hànzì for water without a silhouette.",
  "Monte o hànzì que completa amanhã.": "Build the hànzì that completes tomorrow.",
  "Monte o hànzì que significa 'bom'.": "Build the hànzì that means ‘good’.",
  "Monte o hànzì que significa 'bosque'.": "Build the hànzì that means ‘woods’.",
  "Monte o hànzì que significa 'descansar'.": "Build the hànzì that means ‘rest’.",
  "Monte o hànzì que significa 'floresta'.": "Build the hànzì that means ‘forest’.",
  "Monte 人 sem molde.": "Build 人 without a template.",
  "Monte 我": "Build 我",
  "Monte 日 sem molde.": "Build 日 without a template.",
  "Monte 朋友": "Build 朋友",
  "Monte: amigo.": "Build: friend.",
  "Monte: aquilo é o céu.": "Build: that is the sky.",
  "Monte: isto é água.": "Build: this is water.",
  "Monte: isto é sol.": "Build: this is sun.",
  "Monte: Sou brasileiro.": "Build: I'm Brazilian.",
  "Mulher + criança.": "Woman + child.",
  multidão: "crowd",
  não: "no",
  "Não é isso. A pista é 月.": "That's not it. The hint is 月.",
  "Não é. A pista é 木.": "No. The hint is 木.",
  "Números visuais": "Visual Numbers",
  'O que "Repetir intensifica" quer que você consiga fazer?':
    'What does "Repeating Intensifies" want you to be able to do?',
  "O que é isto?": "What is this?",
  "O que Mei perguntou?": "What did Mei ask?",
  "O que 水 quer dizer?": "What does 水 mean?",
  olá: "hello",
  "Para montar 明 com 日 + 月, use o exercício de composição.":
    "To build 明 with 日 + 月, use the composition exercise.",
  "Peça água: eu quero água.": "Ask for water: I want water.",
  "Peças da natureza": "Nature Pieces",
  "Pedir água": "Ask for water",
  péngyou: "péngyou",
  "Pense na água que você pediu: 水.": "Think of the water you asked for: 水.",
  "Primeiro 女 (mulher), depois 子 (criança).": "First 女 (woman), then 子 (child).",
  "Procure o eixo central primeiro; depois encaixe as gotas laterais.":
    "Find the central axis first; then fit the side droplets.",
  "Promessa do tema": "Topic promise",
  "Pular para o próximo nó": "Skip to the next node",
  "Qual é o pinyin de árvore?": "What is the pinyin for tree?",
  "Qual hànzì combina com a imagem?": "Which hànzì matches the image?",
  "Qual hànzì combina com água?": "Which hànzì matches water?",
  "Qual hànzì combina com grande? (revisão visual)": "Which hànzì matches big? (visual review)",
  "Qual hànzì combina com o céu?": "Which hànzì matches the sky?",
  "Qual hànzì combina com o sol?": "Which hànzì matches the sun?",
  "Qual imagem combina com 子?": "Which image matches 子?",
  "Qual imagem combina com 小?": "Which image matches 小?",
  "Qual peça representa: amigo?": "Which piece stands for: friend?",
  "Repetir a mesma sessão de reconhecimento": "Repeat the same recognition session",
  "Repetir intensifica": "Repeating Intensifies",
  "Repetir só o drill inicial": "Repeat only the opening drill",
  "Repita a mesma peça: 木 + 木.": "Repeat the same piece: 木 + 木.",
  "Responda que isto é 木.": "Answer that this is 木.",
  "Retângulo com uma linha dividindo o meio.": "A rectangle with a line dividing the middle.",
  "Revisão visual: qual hànzì significa pessoa?": "Visual review: which hànzì means person?",
  "São três 木, não dois.": "There are three 木, not two.",
  "seguir; a partir de": "to follow; from",
  Ser: "To be",
  "Sim, aquilo é o sol.": "Yes, that is the sun.",
  "Só ganhar XP": "Just earn XP",
  sol: "sun",
  "Sol + lua": "Sun + moon",
  "Sol e lua": "Sun and Moon",
  "sol/dia": "sun/day",
  "Substituir o tema por 你好": "Replace the topic with 你好",
  "Três árvores empilhadas.": "Three trees stacked.",
  "Três hastes verticais apoiadas em uma base.": "Three vertical stems resting on a base.",
  "Três pertencem ao mesmo grupo. Qual sobra?": "Three belong to the same group. Which one is left over?",
  "Três pessoas (人): uma multidão.": "Three people (人): a crowd.",
  "Trocar o tema por 你好": "Swap the topic for 你好",
  "Tudo certo!": "All good!",
  "Um traço central com gotas abrindo dos dois lados.":
    "A central stroke with droplets opening on both sides.",
  "Uma horizontal no alto e duas pernas abrindo.": "A horizontal on top and two legs opening out.",
  "Uma pessoa (人) atrás da outra: seguir.": "One person (人) behind another: to follow.",
  "Uma pessoa (亻) encostada numa árvore (木) está descansando.":
    "A person (亻) leaning on a tree (木) is resting.",
  "Uma pessoa ao lado de uma árvore.": "A person next to a tree.",
  "Você quer água. Escolha o caractere de água.": "You want water. Choose the water character.",
  "Você quer dizer: água.": "You want to say: water.",
  "Você quer dizer: árvore, madeira.": "You want to say: tree, wood.",
  "Você quer dizer: lua, mês.": "You want to say: moon, month.",
  "Você quer dizer: Não falo chinês..": "You want to say: I don't speak Chinese.",
  wǒ: "wǒ",
  "wǒ bú huì shuō Zhōngwén": "wǒ bú huì shuō Zhōngwén",
  "wǒ huì shuō yìdiǎn Zhōngwén": "wǒ huì shuō yìdiǎn Zhōngwén",
  "wǒ shì Bāxī rén": "wǒ shì Bāxī rén",
  "wǒ zài xuéxiào xuéxí": "wǒ zài xuéxiào xuéxí",
  wǒbúhuìshuōZhōngwén: "wǒbúhuìshuōZhōngwén",
  wǒshìBāxīrén: "wǒshìBāxīrén",
  yú: "yú",
  "一 二 三 mostra a quantidade nos traços.": "一 二 三 shows the quantity in the strokes.",
  "人 são dois traços que se encontram no topo e abrem como pernas.":
    "人 is two strokes that meet at the top and open like legs.",
  "人 volta enquanto você prepara 中文.": "人 comes back while you get ready for 中文.",
  "亻 é a pessoa lateral; depois vem 木.": "亻 is the side-person component; then comes 木.",
  "今天很好 · jīntiān hěn hǎo — Hoje está ótimo.": "今天很好 · jīntiān hěn hǎo — Today is great.",
  "休 junta 亻 (pessoa) + 木 (árvore): alguém encostado numa árvore, descansando.":
    "休 joins 亻 (person) + 木 (tree): someone leaning on a tree, resting.",
  "你会说英语吗？ = Você fala inglês?.": "你会说英语吗？ = Do you speak English?",
  "口 (kǒu) = boca.": "口 (kǒu) = mouth.",
  "大 (dà) = grande.": "大 (dà) = big.",
  "大 é uma pessoa de braços abertos: uma linha e duas pernas.":
    "大 is a person with arms open: one line and two legs.",
  "大 volta como revisão visual; números também têm forma.":
    "大 returns as visual review; numbers have written form too.",
  "天 (tiān) = céu.": "天 (tiān) = sky.",
  "天 é céu — e também entra em 今天 (hoje). Depois de 日、月 e 山, você aponta o que está acima.":
    "天 is sky — and it also appears in 今天 (today). After 日, 月, and 山, you point to what is above.",
  "天 é o caractere de céu.": "天 is the sky character.",
  "女 (nǚ) = mulher.": "女 (nǚ) = woman.",
  "好 junta 女 + 子 — uma composição histórica. Hoje, a forma inteira significa bom ou bem.":
    "好 joins 女 + 子 — a historical composition. Today the whole form means good or well.",
  "妈: sentido + som": "妈: meaning + sound",
  "子 (zǐ) = criança.": "子 (zǐ) = child.",
  "小 (xiǎo) = pequeno.": "小 (xiǎo) = small.",
  "小 é um gancho central com dois pontinhos ao lado.":
    "小 is a central hook with two little dots beside it.",
  "山 são três picos sobre uma base, como uma montanha.":
    "山 is three peaks on a base, like a mountain.",
  "巴西人 · Bāxī rén — brasileiro.": "巴西人 · Bāxī rén — Brazilian.",
  "很好 · hěn hǎo! — Que bom!.": "很好 · hěn hǎo! — How nice!",
  "我 = eu.": "我 = I.",
  "我不会说中文 · wǒ bú huì shuō Zhōngwén — Não falo chinês.":
    "我不会说中文 · wǒ bú huì shuō Zhōngwén — I don't speak Chinese.",
  "我不会说中文 continua a troca de frases de Reparo comunicativo.":
    "我不会说中文 continues the Communication Repair exchange.",
  "我不会说中文 é a opção que comunica Não falo chinês..":
    "我不会说中文 is the option that communicates I don't speak Chinese.",
  "我会说一点中文 avisa o nível e quase sempre faz a outra pessoa simplificar.":
    "我会说一点中文 states your level and almost always makes the other person simplify.",
  "我会说中文。 (wǒ huì shuō zhōngwén.) — 会 acompanha a ação, e a coisa continua depois: 会说中文.":
    "我会说中文。 (wǒ huì shuō zhōngwén.) — 会 goes with the action, and the rest still follows: 会说中文.",
  "我在学校学习 (wǒ zài xuéxiào xuéxí) — 在 antes da ação marca 'agora / em progresso': 在 + ação. A ação não muda de forma.":
    "我在学校学习 (wǒ zài xuéxiào xuéxí) — 在 before the action marks ‘now / in progress’: 在 + action. The action itself does not change form.",
  "我在学校学习 = Eu estudo na escola.": "我在学校学习 = I study at school.",
  "我是巴西人 · wǒ shì Bāxī rén — Sou brasileiro.": "我是巴西人 · wǒ shì Bāxī rén — I'm Brazilian.",
  "我是巴西人 significa Sou brasileiro.": "我是巴西人 means I'm Brazilian.",
  "我要水 = eu quero água.": "我要水 = I want water.",
  "日 (rì) = sol / dia.": "日 (rì) = sun / day.",
  "日 (rì) = sol.": "日 (rì) = sun.",
  "日 + 月 cria uma ponte visual para luz e clareza.":
    "日 + 月 creates a visual bridge to light and clarity.",
  "日 é sol/dia; 那是日吗？ pergunta se aquilo é o sol.":
    "日 is sun/day; 那是日吗？ asks whether that is the sun.",
  "日, não 月. Tente de novo.": "日, not 月. Try again.",
  "明 = claro; brilhante.": "明 = bright; clear.",
  "明天 = amanhã. Aqui você escolhe o caractere 明, não monta 日 + 月.":
    "明天 = tomorrow. Here you choose the character 明; you do not build 日 + 月.",
  "明天 começa com 明.": "明天 starts with 明.",
  "是 significa ser/sim. Em 我是巴西人, liga eu + brasileiro.":
    "是 means to be / yes. In 我是巴西人, it links I + Brazilian.",
  "月 (yuè) = lua / mês.": "月 (yuè) = moon / month.",
  "月 = lua, mês": "月 = moon, month",
  "月 é a opção que comunica lua, mês.": "月 is the option that communicates moon, month.",
  "月 é lua; 那是月 aponta para ela.": "月 is moon; 那是月 points to it.",
  "朋 (péng) = amigo.": "朋 (péng) = friend.",
  "朋友 · péngyou — amigo.": "朋友 · péngyou — friend.",
  "朋友 carrega a ideia de amigo.": "朋友 carries the idea of friend.",
  "朋友 junta dois caracteres para formar amigo.": "朋友 joins two characters to form friend.",
  "木 é a opção que comunica árvore, madeira.": "木 is the option that communicates tree, wood.",
  "林 (lín) = bosque.": "林 (lín) = woods.",
  "林 junta 木 + 木: duas árvores formam um bosque.":
    "林 joins 木 + 木: two trees make a woods.",
  "森 é mais denso que 林.": "森 is denser than 林.",
  "森 junta 木 + 木 + 木: a repetição intensifica a ideia de árvore.":
    "森 joins 木 + 木 + 木: repeating intensifies the idea of tree.",
  "水 (shuǐ) = água.": "水 (shuǐ) = water.",
  "水 é a opção que comunica água.": "水 is the option that communicates water.",
  "水 é água.": "水 is water.",
  "水 é água. Como radical lateral, costuma aparecer em assuntos ligados a líquido.":
    "水 is water. As a side radical, it often appears in matters related to liquid.",
  "水 é o caractere de água.": "水 is the water character.",
  "水 quer dizer água.": "水 means water.",
  "水 tem um eixo central e quatro movimentos laterais, como gotas correndo.":
    "水 has a central axis and four side movements, like running droplets.",
  "水 tem um traço central e gotas dos dois lados, como água correndo.":
    "水 has a central stroke and droplets on both sides, like water running.",
  "火 (huǒ) = fogo.": "火 (huǒ) = fire.",
  "火 tem duas faíscas em cima e o corpo da chama embaixo.":
    "火 has two sparks on top and the body of the flame below.",
  "请慢一点 responde 你会说英语吗？ neste pacote (Reparo comunicativo).":
    "请慢一点 answers 你会说英语吗？ in this set (Communication Repair).",
  "这 = este, isto": "这 = this",
  "这是日 usa 日 em frase mínima.": "这是日 uses 日 in a minimal sentence.",
  "这是木 = isto é 木, árvore/madeira.": "这是木 = this is 木, tree/wood.",
  "这是水 usa 水 em frase mínima.": "这是水 uses 水 in a minimal sentence.",
  "那是人吗 = Aquilo é uma pessoa?.": "那是人吗 = Is that a person?",
  "那是天 aponta o céu na paisagem.": "那是天 points to the sky in the landscape.",
};

const REWRITE = new Set([
  "Alguém pergunta o que você está fazendo agora. Responda que está isto.",
  "Combine as peças de 明.",
  "Hã? A pista é água: 水.",
  "Tudo certo!",
  "Só ganhar XP",
  "Pular para o próximo nó",
  "Decorar 你好 em qualquer aula",
  "Ganhar estrelas",
  "Ignorar o contexto",
  "Ignorar o título",
  "Repetir a mesma sessão de reconhecimento",
  "Repetir só o drill inicial",
  "Substituir o tema por 你好",
  "Trocar o tema por 你好",
  "Três pertencem ao mesmo grupo. Qual sobra?",
  "Você quer água. Escolha o caractere de água.",
  "Para montar 明 com 日 + 月, use o exercício de composição.",
  "明天 = amanhã. Aqui você escolhe o caractere 明, não monta 日 + 月.",
  "好 junta 女 + 子 — uma composição histórica. Hoje, a forma inteira significa bom ou bem.",
  "我会说一点中文 avisa o nível e quase sempre faz a outra pessoa simplificar.",
  "我在学校学习 (wǒ zài xuéxiào xuéxí) — 在 antes da ação marca 'agora / em progresso': 在 + ação. A ação não muda de forma.",
  "我会说中文。 (wǒ huì shuō zhōngwén.) — 会 acompanha a ação, e a coisa continua depois: 会说中文.",
  "人 volta enquanto você prepara 中文.",
  "大 volta como revisão visual; números também têm forma.",
  "天 é céu — e também entra em 今天 (hoje). Depois de 日、月 e 山, você aponta o que está acima.",
]);

function kindFor(pt, en, via) {
  if (pt === en && /^[+=]$/.test(pt)) return "DIRECT_TRANSLATION";
  if (REWRITE.has(pt)) return "NATURAL_REWRITE";
  if (via === "teaches-named") return "NATURAL_REWRITE";
  if (via === "see-chars" || via === "use-context" || via === "read-build" || via === "build-choose" || via === "build-recognize" || via === "core-chars" || via === "distinguish-pieces") {
    return "NATURAL_REWRITE";
  }
  return "DIRECT_TRANSLATION";
}

function applyTemplate(pt) {
  let m;
  m = pt.match(/^Distinguir as peças e os caracteres vizinhos de (.+)\.$/);
  if (m) return { en: `Distinguish the components and similar characters in ${titleEn(m[1])}.`, via: "distinguish-pieces" };
  m = pt.match(/^Distinguir (.+) de caracteres vizinhos\.$/);
  if (m) return { en: `Distinguish ${m[1]} from similar characters.`, via: "distinguish-char" };
  m = pt.match(/^Encontrar (.+) num contexto conhecido, com menos pinyin\.$/);
  if (m) return { en: `Find ${m[1]} in a familiar context with less pinyin.`, via: "find-context" };
  m = pt.match(/^forma e som de (.+)$/);
  if (m) return { en: `the form and sound of ${m[1]}`, via: "form-sound" };
  m = pt.match(/^identificar\/montar (.+)$/);
  if (m) return { en: `identify/build ${m[1]}`, via: "identify-build" };
  m = pt.match(/^Ler e montar os hànzì de (.+)\.$/);
  if (m) return { en: `Read and build the hànzì from ${titleEn(m[1])}.`, via: "read-build" };
  m = pt.match(/^montar ou escolher os hànzì de (.+)$/);
  if (m) return { en: `build or choose the hànzì in ${titleEn(m[1])}`, via: "build-choose" };
  m = pt.match(/^Montar\/reconhecer os hànzì de (.+)\.$/);
  if (m) return { en: `Build or recognize the hànzì in ${titleEn(m[1])}.`, via: "build-recognize" };
  m = pt.match(/^os caracteres centrais de (.+)$/);
  if (m) return { en: `the core characters in ${titleEn(m[1])}`, via: "core-chars" };
  m = pt.match(/^Usar os hànzì de (.+) num contexto já ouvido\.$/);
  if (m) return { en: `Use the hànzì from ${titleEn(m[1])} in a context you've already heard.`, via: "use-context" };
  m = pt.match(/^Ver os caracteres de (.+) e o que eles representam\.$/);
  if (m) return { en: `See the characters from ${titleEn(m[1])} and what they represent.`, via: "see-chars" };
  m = pt.match(/^Ver (.+) e ligar à ideia de (.+)\.$/);
  if (m) return { en: `See ${m[1]} and connect it to the idea of ${ideaEn(m[2])}.`, via: "see-idea" };
  m = pt.match(/^ver (.+) numa palavra ou contexto já conhecido$/);
  if (m) return { en: `see ${m[1]} in a familiar word or context`, via: "see-known" };
  m = pt.match(/^Reconhecer e usar o hànzì (.+) \((.+)\)\.$/);
  if (m) return { en: `Recognize and use the hànzì ${m[1]} (${glossEn(m[2])}).`, via: "recognize-use" };
  m = pt.match(/^Reconhecer ou montar (.+)\.$/);
  if (m) return { en: `Recognize or build ${m[1]}.`, via: "recognize-build" };
  m = pt.match(/^(.+) ensina forma escrita, não só o som\.$/);
  if (m) {
    const name = m[1];
    if (TITLE[name] || !/[\u3400-\u9fff]/.test(name)) {
      return { en: `The ${titleEn(name)} topic teaches written forms, not just sounds.`, via: "teaches-named" };
    }
    return { en: `${name} teaches written form, not just sound.`, via: "teaches-hanzi" };
  }
  m = pt.match(/^(.+) é só um desenho, sem som\.$/);
  if (m) return { en: `${m[1]} is just a drawing, with no sound.`, via: "drawing" };
  m = pt.match(/^(.+) escreve a ideia de (.+)\.$/);
  if (m) return { en: `${m[1]} represents the idea of ${ideaEn(m[2])} in writing.`, via: "writes-idea" };
  return null;
}

const authored = {};
const kinds = {};
const missing = [];
const newPts = dump.strings.filter((row) => !row.alreadyInGloss).map((row) => row.pt);

for (const pt of newPts) {
  if (UNIQUE[pt] != null) {
    authored[pt] = { en: UNIQUE[pt], kind: kindFor(pt, UNIQUE[pt], "unique") };
    kinds[pt] = authored[pt].kind;
    continue;
  }
  const templated = applyTemplate(pt);
  if (templated) {
    authored[pt] = { en: templated.en, kind: kindFor(pt, templated.en, templated.via) };
    kinds[pt] = authored[pt].kind;
    continue;
  }
  missing.push(pt);
}

if (missing.length) {
  console.error(`merge-t5180-overlay: ${missing.length} strings still unauthored`);
  for (const pt of missing) console.error(` - ${JSON.stringify(pt)}`);
  process.exit(1);
}

const enPack = {};
for (const [pt, row] of Object.entries(authored)) {
  enPack[pt] = row;
}

writeFileSync(path.join(root, "docs/localization/t5180-en.json"), `${JSON.stringify(enPack, null, 2)}\n`);
writeFileSync(path.join(root, "docs/localization/t5180-kinds.json"), `${JSON.stringify(kinds, null, 2)}\n`);

let added = 0;
for (const [pt, row] of Object.entries(authored)) {
  if (!gloss[pt]) {
    gloss[pt] = row.en;
    added += 1;
  }
}
writeFileSync(glossPath, `${JSON.stringify(gloss, null, 2)}\n`);

const kindCounts = { DIRECT_TRANSLATION: 0, NATURAL_REWRITE: 0, SOURCE_LANGUAGE_ADAPTATION: 0 };
for (const k of Object.values(kinds)) kindCounts[k] = (kindCounts[k] ?? 0) + 1;

console.log(
  `merge-t5180-overlay: ${newPts.length} authored · ${added} new gloss keys · kinds ${JSON.stringify(kindCounts)} · gloss size ${Object.keys(gloss).length}`
);
