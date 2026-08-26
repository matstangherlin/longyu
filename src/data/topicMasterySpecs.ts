/**
 * V4.6 — TopicMasterySpec
 *
 * Declarative promise per teaching topic. The four passes must deepen THIS
 * title, not four generic 你好 sessions.
 */

import type { MasteryPass } from "./masteryLoop";
import type { TopicLessonRef, TopicMasterySpec } from "./topicMastery";
import { isFoundationTopicMasteryId, isTopicMasteryLesson } from "./topicMastery";

type LessonForSpec = TopicLessonRef & {
  title: string;
  skill?: string;
  libraryItems?: string[];
  steps?: ReadonlyArray<{ kind?: string; audioText?: string; hanzi?: string; text?: string; correctAnswer?: string }>;
};

const AUTHORED: Record<string, TopicMasterySpec> = {
  "p1-o-que-e-mandarim": {
    topicId: "p1-o-que-e-mandarim",
    promise: "Mandarim é a língua padrão ensinada no Longyu — falada, distinta da escrita.",
    mustUnderstand: [
      "Mandarim é uma língua, a variedade padrão do chinês moderno ensinada aqui.",
      "Língua falada não é o mesmo que sistema de escrita.",
    ],
    mustRecognize: ["你好 de ouvido", "que 你好 é fala, nǐ hǎo é pinyin, 你好 escrito é hànzì, Olá é tradução"],
    mustProduce: ["devolver 你好 num cumprimento"],
    mustTransfer: ["usar 你好 numa microconversa nova e apontar som × pinyin × hànzì × sentido"],
    commonMisconceptions: [
      "Mandarim = caracteres.",
      "Pinyin é a língua.",
      "Toda palavra chinesa é um caractere isolado.",
    ],
    passObjectives: {
      1: "Ouvir mandarim de verdade e entender que é uma língua falada (não um alfabeto).",
      2: "Distinguir mandarim falado, pinyin, hànzì e tradução sem virar aula teórica.",
      3: "Recuperar 你好 e relacionar som ↔ intenção com menos apoio.",
      4: "Provar a diferença som / pinyin / hànzì / sentido numa microconversa nova.",
    },
    canonicalExamples: ["你好", "nǐ hǎo", "Olá"],
    prerequisites: [],
  },
  "p1-o-que-e-pinyin": {
    topicId: "p1-o-que-e-pinyin",
    promise: "Pinyin existe para representar a pronúncia — é uma ponte, não substituto do hànzì.",
    mustUnderstand: [
      "Pinyin é a romanização da pronúncia do mandarim.",
      "Serve para guiar o som, não para substituir hànzì para sempre.",
    ],
    mustRecognize: ["nǐ hǎo ↔ 你好", "inicial/final no nível da sílaba nǐ / hǎo", "marcas de tom no pinyin"],
    mustProduce: ["ler nǐ hǎo para pronunciar 你好 sem depender da tradução"],
    mustTransfer: ["usar pinyin como ferramenta e depois retirar parte do scaffold num exemplo novo"],
    commonMisconceptions: [
      "Pinyin é a escrita oficial do chinês.",
      "Pinyin traduz o significado.",
      "As marcas de tom são enfeite.",
    ],
    passObjectives: {
      1: "Ver que pinyin escreve o som: 你好 se lê nǐ hǎo, com áudio.",
      2: "Notar a sílaba (nǐ / hǎo) e ligar áudio ↔ pinyin.",
      3: "Reconhecer marcas de tom e recuperar o som sem traduzir.",
      4: "Usar pinyin para pronunciar e depois falar com menos pinyin à vista.",
    },
    canonicalExamples: ["nǐ hǎo", "你好"],
    prerequisites: ["p1-o-que-e-mandarim"],
  },
  "p1-o-que-e-tom": {
    topicId: "p1-o-que-e-tom",
    promise: "Tom é o contorno da voz e faz parte da palavra em mandarim.",
    mustUnderstand: ["O contorno tonal distingue palavras.", "Os quatro tons são curvas, não volume."],
    mustRecognize: ["1º × 3º em mā / mǎ", "os quatro contornos em ma"],
    mustProduce: ["identificar o tom de uma sílaba conhecida"],
    mustTransfer: ["ouvir o tom dentro de 你好, não só em ma isolado"],
    commonMisconceptions: [
      "Tom é ênfase ou emoção.",
      "Errar o tom não muda a palavra.",
    ],
    passObjectives: {
      1: "Ouvir o contorno: a curva da voz faz parte da palavra.",
      2: "Discriminar tons contrastantes (reta × vale) sem aula longa.",
      3: "Identificar o tom e começar a reproduzir o contorno.",
      4: "Aplicar o tom em 你好, um chunk que você já usa.",
    },
    canonicalExamples: ["mā", "mǎ", "你好"],
    prerequisites: ["p1-o-que-e-pinyin"],
  },
  "p1-o-que-e-hanzi": {
    topicId: "p1-o-que-e-hanzi",
    promise: "Hànzì é o sistema de escrita; um caractere não é automaticamente uma palavra.",
    mustUnderstand: [
      "Hànzì são caracteres do chinês escrito.",
      "Um caractere pode ser peça de uma palavra (你 + 好 = 你好).",
    ],
    mustRecognize: ["你 e 好 dentro de 你好", "que pinyin e hànzì mostram camadas diferentes"],
    mustProduce: ["escolher/montar os caracteres de uma palavra conhecida"],
    mustTransfer: ["reconhecer 你好 em contexto com menos pinyin"],
    commonMisconceptions: [
      "Cada caractere = uma palavra.",
      "Hànzì são desenhos aleatórios.",
      "Dá para abandonar hànzì e ficar só no pinyin.",
    ],
    passObjectives: {
      1: "Ver hànzì como sistema de escrita, começando por 你 e 好.",
      2: "Separar caractere de palavra e notar peças básicas.",
      3: "Reconhecer e montar 你好 a partir das peças.",
      4: "Ler 你好 em contexto conhecido com menos pinyin.",
    },
    canonicalExamples: ["你", "好", "你好"],
    prerequisites: ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin"],
  },
  "p1-primeiros-hanzi": {
    topicId: "p1-primeiros-hanzi",
    promise: "Montar os primeiros caracteres a partir de peças visíveis.",
    mustUnderstand: ["Caracteres se montam com componentes, não se copiam como um blob."],
    mustRecognize: ["peças dos primeiros hànzì da lição"],
    mustProduce: ["montar o caractere-alvo"],
    mustTransfer: ["reconhecer o mesmo caractere noutro arranjo"],
    commonMisconceptions: ["Hànzì se memoriza só como desenho inteiro."],
    passObjectives: {
      1: "Ver as peças dos primeiros hànzì.",
      2: "Distinguir caracteres parecidos pelas peças.",
      3: "Montar o caractere sem copiar um modelo completo.",
      4: "Reconhecer o caractere montado numa palavra já ouvida.",
    },
    canonicalExamples: ["木", "你好"],
    prerequisites: ["p1-o-que-e-hanzi"],
  },
  "p1-engine-2-lab": {
    topicId: "p1-engine-2-lab",
    promise: "Laboratório de exercícios: conhecer os tipos de atividade do Longyu com conteúdo já ouvido.",
    mustUnderstand: ["Cada motor cobra uma habilidade diferente (ouvir, escolher, montar)."],
    mustRecognize: ["o tipo de tarefa pelo enunciado"],
    mustProduce: ["completar uma tarefa de cada família com 你好"],
    mustTransfer: ["resolver um tipo de tarefa num item conhecido sem releitura da regra"],
    commonMisconceptions: ["Todos os exercícios pedem a mesma coisa."],
    passObjectives: {
      1: "Descobrir como cada tipo de exercício do laboratório funciona.",
      2: "Distinguir ouvir × escolher × montar neste laboratório.",
      3: "Completar as tarefas do laboratório com menos explicação.",
      4: "Aplicar o mesmo motor a um item já conhecido.",
    },
    canonicalExamples: ["你好"],
    prerequisites: ["p1-o-que-e-mandarim"],
    transferOptionalReason: "Laboratório de motores: transferência é reusar o motor, não combinação lexical nova.",
  },
  "p2-ma-primeiro-tom": {
    topicId: "p2-ma-primeiro-tom",
    promise: "O 1º tom é uma reta alta (mā).",
    mustUnderstand: ["1º tom = contorno alto e nivelado."],
    mustRecognize: ["mā contra outros tons de ma"],
    mustProduce: ["identificar 1º tom"],
    mustTransfer: ["ouvir 1º tom numa sílaba conhecida fora do drill isolado"],
    commonMisconceptions: ["Tom alto = falar mais forte."],
    passObjectives: {
      1: "Ouvir a reta alta do 1º tom.",
      2: "Discriminar 1º tom dos outros contornos de ma.",
      3: "Identificar mā sem ver a resposta.",
      4: "Reconhecer 1º tom numa palavra já usada.",
    },
    canonicalExamples: ["妈", "mā"],
    prerequisites: ["p1-o-que-e-tom"],
  },
  "p2-ma-segundo-tom": {
    topicId: "p2-ma-segundo-tom",
    promise: "O 2º tom sobe (má).",
    mustUnderstand: ["2º tom = contorno ascendente."],
    mustRecognize: ["má contra mā / mǎ / mà"],
    mustProduce: ["identificar 2º tom"],
    mustTransfer: ["ouvir 2º tom fora do par isolado"],
    commonMisconceptions: ["Subir a voz = pergunta em português."],
    passObjectives: {
      1: "Ouvir a subida do 2º tom.",
      2: "Discriminar 2º × outros tons de ma.",
      3: "Identificar má.",
      4: "Levar o 2º tom a uma sílaba conhecida.",
    },
    canonicalExamples: ["麻", "má"],
    prerequisites: ["p2-ma-primeiro-tom"],
  },
  "p2-ma-terceiro-tom": {
    topicId: "p2-ma-terceiro-tom",
    promise: "O 3º tom desce e volta (mǎ) — o vale.",
    mustUnderstand: ["3º tom = vale (desce e sobe)."],
    mustRecognize: ["mǎ contra mā / má / mà"],
    mustProduce: ["identificar 3º tom"],
    mustTransfer: ["ouvir 3º tom em 你 / 好"],
    commonMisconceptions: ["3º tom é só 'tom baixo'."],
    passObjectives: {
      1: "Ouvir o vale do 3º tom.",
      2: "Discriminar 3º × 1º (reta × vale).",
      3: "Identificar mǎ.",
      4: "Ouvir o 3º tom em 你好.",
    },
    canonicalExamples: ["马", "mǎ", "你"],
    prerequisites: ["p2-ma-segundo-tom"],
  },
  "p2-ma-quarto-tom": {
    topicId: "p2-ma-quarto-tom",
    promise: "O 4º tom cai (mà).",
    mustUnderstand: ["4º tom = queda nítida."],
    mustRecognize: ["mà contra os outros ma"],
    mustProduce: ["identificar 4º tom"],
    mustTransfer: ["ouvir 4º tom numa sílaba conhecida"],
    commonMisconceptions: ["4º tom = falar bravo."],
    passObjectives: {
      1: "Ouvir a queda do 4º tom.",
      2: "Discriminar 4º × 1º.",
      3: "Identificar mà.",
      4: "Reconhecer 4º tom fora do drill de ma.",
    },
    canonicalExamples: ["骂", "mà"],
    prerequisites: ["p2-ma-terceiro-tom"],
  },
  "p2-comparar-tom-1-4": {
    topicId: "p2-comparar-tom-1-4",
    promise: "Contraste 1º × 4º: reta alta versus queda.",
    mustUnderstand: ["A diferença útil agora é reta × queda."],
    mustRecognize: ["mā vs mà"],
    mustProduce: ["escolher qual dos dois ouviu"],
    mustTransfer: ["aplicar o contraste a outra sílaba conhecida"],
    commonMisconceptions: ["1º e 4º soam iguais se falados rápido."],
    passObjectives: {
      1: "Ouvir o par 1º × 4º lado a lado.",
      2: "Discriminar os dois com distratores próximos.",
      3: "Identificar qual tom soou sem ver o pinyin primeiro.",
      4: "Levar o contraste a uma palavra já usada.",
    },
    canonicalExamples: ["mā", "mà"],
    prerequisites: ["p2-ma-primeiro-tom", "p2-ma-quarto-tom"],
  },
  "p2-comparar-tom-2-3": {
    topicId: "p2-comparar-tom-2-3",
    promise: "Contraste 2º × 3º: sobe versus vale.",
    mustUnderstand: ["Subida contínua ≠ vale do 3º tom."],
    mustRecognize: ["má vs mǎ"],
    mustProduce: ["escolher qual dos dois ouviu"],
    mustTransfer: ["ouvir o contraste em sílabas de 你好"],
    commonMisconceptions: ["2º e 3º são o mesmo tom 'baixo-alto'."],
    passObjectives: {
      1: "Ouvir 2º × 3º como duas curvas diferentes.",
      2: "Discriminar subida × vale.",
      3: "Identificar o tom ouvido.",
      4: "Aplicar o contraste em 你 / 好.",
    },
    canonicalExamples: ["má", "mǎ"],
    prerequisites: ["p2-ma-segundo-tom", "p2-ma-terceiro-tom"],
  },
  "p2-tons-nihao": {
    topicId: "p2-tons-nihao",
    promise: "Os tons de 你好 na palavra real (incluindo sandhi).",
    mustUnderstand: ["Em 3º+3º você ouve ní hǎo, não dois vales iguais."],
    mustRecognize: ["os tons de 你 e 好 juntos"],
    mustProduce: ["identificar o contorno de 你好"],
    mustTransfer: ["usar 你好 com o contorno certo numa fala curta"],
    commonMisconceptions: ["Cada caractere guarda o tom do dicionário na fala rápida."],
    passObjectives: {
      1: "Ouvir 你好 como palavra, não duas sílabas isoladas.",
      2: "Discriminar o contorno real (sandhi) do dicionário.",
      3: "Identificar/reproduzir o contorno de 你好.",
      4: "Dizer 你好 numa situação breve com o tom certo.",
    },
    canonicalExamples: ["你好", "nǐ hǎo", "ní hǎo"],
    prerequisites: ["p1-o-que-e-tom", "p2-comparar-tom-2-3"],
  },
  "p2-tons-xiexie": {
    topicId: "p2-tons-xiexie",
    promise: "Os tons de 谢谢 na palavra que você já usa para agradecer.",
    mustUnderstand: ["谢谢 tem tom próprio; não se agradece 'no tom de 你好'."],
    mustRecognize: ["xiè xie de ouvido"],
    mustProduce: ["identificar 谢谢 pelo som"],
    mustTransfer: ["agradecer com 谢谢 numa fala curta"],
    commonMisconceptions: ["Todas as palavras de duas sílabas repetem o mesmo tom."],
    passObjectives: {
      1: "Ouvir 谢谢 e ligar ao agradecimento.",
      2: "Discriminar 谢谢 de 你好 pelo som.",
      3: "Reconhecer/produzir 谢谢.",
      4: "Agradecer numa micro-situação nova.",
    },
    canonicalExamples: ["谢谢", "xiè xie"],
    prerequisites: ["p2-tons-nihao"],
  },
  "p3-wohenhao": {
    topicId: "p3-wohenhao",
    promise: "Dizer 我很好 — estou bem — como resposta viva.",
    mustUnderstand: ["我很好 responde 'como você está', não é um cumprimento inicial."],
    mustRecognize: ["我很好 de ouvido e em hànzì"],
    mustProduce: ["responder 我很好"],
    mustTransfer: ["usar 我很好 depois de 你好吗？"],
    commonMisconceptions: ["我很好 significa olá."],
    passObjectives: {
      1: "Descobrir 我很好 como 'estou bem'.",
      2: "Distinguir 我很好 de 你好 / 谢谢.",
      3: "Produzir 我很好 ao responder.",
      4: "Encaixar 我很好 num mini-diálogo.",
    },
    canonicalExamples: ["我很好"],
    prerequisites: ["p1-o-que-e-mandarim"],
  },
  "p3-wobuhui-shuo-zhongwen": {
    topicId: "p3-wobuhui-shuo-zhongwen",
    promise: "Dizer 我不会说中文 quando você ainda não fala chinês com fluência.",
    mustUnderstand: ["不会说 = não sei falar; é sobrevivência, não gramática longa."],
    mustRecognize: ["我不会说中文"],
    mustProduce: ["dizer 我不会说中文"],
    mustTransfer: ["usar a frase quando alguém fala rápido demais"],
    commonMisconceptions: ["A frase significa 'eu não gosto de chinês'."],
    passObjectives: {
      1: "Ouvir e entender 我不会说中文.",
      2: "Reconhecer a frase entre cumprimentos.",
      3: "Produzir a frase de sobrevivência.",
      4: "Usá-la quando a conversa passa do que você sabe.",
    },
    canonicalExamples: ["我不会说中文"],
    prerequisites: ["p3-wohenhao"],
  },
  "p3-qing-zai-shuo-yibian": {
    topicId: "p3-qing-zai-shuo-yibian",
    promise: "Pedir 请再说一遍 quando não entendeu.",
    mustUnderstand: ["请再说一遍 pede para repetir, com cortesia."],
    mustRecognize: ["请再说一遍 de ouvido"],
    mustProduce: ["pedir repetição"],
    mustTransfer: ["usar o pedido quando a fala falha"],
    commonMisconceptions: ["A frase significa 'fale mais alto'."],
    passObjectives: {
      1: "Descobrir o pedido de repetição.",
      2: "Distinguir de 我不会说中文.",
      3: "Produzir 请再说一遍.",
      4: "Reparar uma microconversa pedindo para repetir.",
    },
    canonicalExamples: ["请再说一遍"],
    prerequisites: ["p3-wobuhui-shuo-zhongwen"],
  },
  "p4-num-123": {
    topicId: "p4-num-123",
    promise: "Contar 一 二 三 de verdade.",
    mustUnderstand: ["一、二、三 são os três primeiros números falados e escritos."],
    mustRecognize: ["yī èr sān de ouvido e em hànzì"],
    mustProduce: ["dizer 一 二 三 na ordem"],
    mustTransfer: ["usar um desses números numa quantidade mínima"],
    commonMisconceptions: ["Os números chineses são só os hànzì bonitos, sem som."],
    passObjectives: {
      1: "Ouvir e ver 一 二 三.",
      2: "Discriminar os três pelo som e pela forma.",
      3: "Dizer/montar 一 二 三.",
      4: "Usar um número numa micro-quantidade.",
    },
    canonicalExamples: ["一", "二", "三"],
    prerequisites: [],
  },
  "p4-num-45": {
    topicId: "p4-num-45",
    promise: "Aprender 四 e 五.",
    mustUnderstand: ["四 e 五 continuam a contagem depois de 三."],
    mustRecognize: ["sì / wǔ"],
    mustProduce: ["nomear 四 e 五"],
    mustTransfer: ["escolher 四 ou 五 numa quantidade"],
    commonMisconceptions: ["四 soa igual a 十."],
    passObjectives: {
      1: "Descobrir 四 e 五.",
      2: "Discriminar sì e wǔ de 一 二 三.",
      3: "Produzir 四 / 五.",
      4: "Usar 四 ou 五 para contar algo visível.",
    },
    canonicalExamples: ["四", "五"],
    prerequisites: ["p4-num-123"],
  },
  "p4-num-678": {
    topicId: "p4-num-678",
    promise: "Aprender 六 七 八.",
    mustUnderstand: ["六 七 八 expandem a contagem até 8."],
    mustRecognize: ["liù qī bā"],
    mustProduce: ["nomear 六 七 八"],
    mustTransfer: ["usar um deles numa quantidade"],
    commonMisconceptions: ["七 e 一 se confundem só pela forma."],
    passObjectives: {
      1: "Ouvir 六 七 八.",
      2: "Discriminar os três.",
      3: "Produzir 六 七 八.",
      4: "Contar até um desses números numa situação curta.",
    },
    canonicalExamples: ["六", "七", "八"],
    prerequisites: ["p4-num-45"],
  },
  "p4-num-910": {
    topicId: "p4-num-910",
    promise: "Fechar 1–10 com 九 e 十.",
    mustUnderstand: ["九 e 十 fecham a dezena."],
    mustRecognize: ["jiǔ / shí"],
    mustProduce: ["dizer 九 e 十"],
    mustTransfer: ["usar 十 como 'dez' numa micro-quantidade"],
    commonMisconceptions: ["十 é só um cruzamento visual, sem valor de dez."],
    passObjectives: {
      1: "Descobrir 九 e 十.",
      2: "Discriminar jiǔ e shí.",
      3: "Produzir 九 / 十.",
      4: "Usar 十 para fechar uma contagem.",
    },
    canonicalExamples: ["九", "十"],
    prerequisites: ["p4-num-678"],
  },
  l2: {
    topicId: "l2",
    promise: "Cumprimentar de verdade: 你好 (e 早上好 de manhã).",
    mustUnderstand: ["你好 é o cumprimento seguro ao encontrar alguém.", "早上好 marca o momento da manhã."],
    mustRecognize: ["你好 de ouvido", "早上好 como variação temporal"],
    mustProduce: ["dizer 你好 ao encontrar alguém"],
    mustTransfer: ["cumprimentar numa microconversa, não só no drill"],
    commonMisconceptions: ["Qualquer frase social serve como Olá."],
    passObjectives: {
      1: "Descobrir 你好 como cumprimento.",
      2: "Reconhecer 你好 e 早上好 de ouvido.",
      3: "Dizer ou montar o cumprimento.",
      4: "Usar 你好 numa situação de encontro.",
    },
    canonicalExamples: ["你好", "早上好"],
    prerequisites: ["p1-o-que-e-mandarim"],
  },
  l3: {
    topicId: "l3",
    promise: "Perguntar se a pessoa está bem e responder 我很好.",
    mustUnderstand: ["你好吗？ pergunta; 我很好 responde; 你呢？ devolve."],
    mustRecognize: ["你好吗？", "我很好", "你呢？"],
    mustProduce: ["perguntar 你好吗？ e responder 我很好"],
    mustTransfer: ["usar a pergunta e a resposta numa microconversa"],
    commonMisconceptions: ["你好 e 你好吗？ são a mesma fala."],
    passObjectives: {
      1: "Descobrir 你好吗？ e 我很好.",
      2: "Distinguir cumprimento × pergunta × resposta.",
      3: "Produzir a pergunta ou a resposta.",
      4: "Trocar ‘tudo bem?’ numa situação nova.",
    },
    canonicalExamples: ["你好吗？", "我很好"],
    prerequisites: ["l2"],
  },
  l4: {
    topicId: "l4",
    promise: "Agradecer e responder com cortesia: 谢谢 / 不客气.",
    mustUnderstand: ["谢谢 agradece; 不客气 responde ‘de nada’."],
    mustRecognize: ["谢谢", "不客气"],
    mustProduce: ["dizer 谢谢 e responder 不客气"],
    mustTransfer: ["agradecer numa situação curta de ajuda"],
    commonMisconceptions: ["谢谢 também significa olá."],
    passObjectives: {
      1: "Descobrir 谢谢.",
      2: "Reconhecer 谢谢 e 不客气.",
      3: "Produzir o agradecimento ou a resposta.",
      4: "Agradecer numa situação de ajuda.",
    },
    canonicalExamples: ["谢谢", "不客气"],
    prerequisites: ["l2"],
  },
  "p1-ate-logo": {
    topicId: "p1-ate-logo",
    promise: "Encerrar a conversa: 再见 (e 明天见 / 晚安 quando couber).",
    mustUnderstand: ["再见 fecha a conversa; não é um cumprimento de chegada."],
    mustRecognize: ["再见", "明天见"],
    mustProduce: ["dizer 再见 ao sair"],
    mustTransfer: ["despedir-se numa situação de partida"],
    commonMisconceptions: ["再见 serve para chegar e para sair."],
    passObjectives: {
      1: "Descobrir 再见 como despedida.",
      2: "Distinguir 再见 de 你好 e 谢谢.",
      3: "Produzir a despedida.",
      4: "Encerrar uma conversa curta.",
    },
    canonicalExamples: ["再见", "明天见"],
    prerequisites: ["l4"],
  },
  "p1-primeira-conversa": {
    topicId: "p1-primeira-conversa",
    promise: "Encadear cumprimento, ‘tudo bem?’ e despedida numa conversa curta.",
    mustUnderstand: ["Uma conversa junta atos que você já viu em temas separados."],
    mustRecognize: ["你好", "你好吗？", "谢谢", "再见"],
    mustProduce: ["responder no turno certo da conversa"],
    mustTransfer: ["fechar uma microconversa completa"],
    commonMisconceptions: ["Cada frase social vive só no drill isolado."],
    passObjectives: {
      1: "Rever os atos da primeira conversa.",
      2: "Ordenar cumprimento, pergunta e despedida.",
      3: "Produzir os turnos com menos apoio.",
      4: "Fechar a microconversa numa situação nova.",
    },
    canonicalExamples: ["你好", "你好吗？", "再见"],
    prerequisites: ["l2", "l3", "l4", "p1-ate-logo"],
  },
  l9: {
    topicId: "l9",
    promise: "Apresentar-se de verdade: nome, depois origem, depois perguntas, depois microconversa.",
    mustUnderstand: ["我叫 + nome diz quem você é.", "Origem (我是…人) não é o mesmo que o nome."],
    mustRecognize: ["我叫", "你叫什么", "我是巴西人"],
    mustProduce: ["responder com 我叫…", "responder origem"],
    mustTransfer: ["fechar uma microconversa de apresentação"],
    commonMisconceptions: ["Dizer só 你好 já é uma apresentação."],
    passObjectives: {
      1: "Descobrir 我叫 + nome.",
      2: "Acrescentar origem e distinguir nome × origem.",
      3: "Responder perguntas de apresentação com menos apoio.",
      4: "Fechar uma microconversa completa de apresentação.",
    },
    canonicalExamples: ["我叫", "我是巴西人"],
    prerequisites: ["p1-o-que-e-mandarim"],
  },
  l26: {
    topicId: "l26",
    promise: "Dizer fome e gosto — descobrir itens, reconhecer, nomear, usar numa situação de comida.",
    mustUnderstand: ["喜欢 expressa gosto; 饿 / querer comer é outro ato."],
    mustRecognize: ["我喜欢中文", "itens de comida da lição"],
    mustProduce: ["dizer o que você gosta ou quer"],
    mustTransfer: ["usar o gosto/pedido numa situação de refeição"],
    commonMisconceptions: ["Gosto e pedido são a mesma frase."],
    passObjectives: {
      1: "Descobrir os itens de fome e gosto.",
      2: "Reconhecer por áudio/imagem o que você já viu.",
      3: "Nomear ou pedir o núcleo do tema.",
      4: "Usar o tema numa micro-situação de comida.",
    },
    canonicalExamples: ["我喜欢中文"],
    prerequisites: [],
  },
  l26b: {
    topicId: "l26b",
    promise: "Pedir no cardápio: descobrir pratos, reconhecer, pedir, resolver um pedido novo.",
    mustUnderstand: ["我要 + prato é um pedido, não um cumprimento."],
    mustRecognize: ["饭", "菜", "肉", "鱼", "喝"],
    mustProduce: ["pedir um item do cardápio"],
    mustTransfer: ["fazer um pedido numa situação de restaurante"],
    commonMisconceptions: ["O cardápio se resolve só com 你好."],
    passObjectives: {
      1: "Descobrir os pratos e bebidas do cardápio.",
      2: "Reconhecer os itens por áudio/imagem.",
      3: "Nomear ou pedir um prato.",
      4: "Resolver um pedido num restaurante um pouco novo.",
    },
    canonicalExamples: ["饭", "菜", "我要这个"],
    prerequisites: ["l26"],
  },
};

const CHAR_SPECS: Array<[string, string, string]> = [
  ["p4-char-mu", "木", "árvore/madeira"],
  ["p4-char-ren", "人", "pessoa"],
  ["p4-char-kou", "口", "boca"],
  ["p4-char-ri", "日", "sol/dia"],
  ["p4-char-yue", "月", "lua/mês"],
  ["p4-char-shan", "山", "montanha"],
  ["p4-char-shui", "水", "água"],
  ["p4-char-tian", "天", "céu/dia"],
  ["p4-char-huo", "火", "fogo"],
];

for (const [id, hanzi, meaning] of CHAR_SPECS) {
  AUTHORED[id] = hanziTopicSpec(id, hanzi, meaning);
}

function hanziTopicSpec(id: string, hanzi: string, meaningPt: string): TopicMasterySpec {
  return {
    topicId: id,
    promise: `Reconhecer e usar o hànzì ${hanzi} (${meaningPt}).`,
    mustUnderstand: [`${hanzi} escreve a ideia de ${meaningPt}.`],
    mustRecognize: [`forma e som de ${hanzi}`],
    mustProduce: [`identificar/montar ${hanzi}`],
    mustTransfer: [`ver ${hanzi} numa palavra ou contexto já conhecido`],
    commonMisconceptions: [`${hanzi} é só um desenho, sem som.`],
    passObjectives: {
      1: `Ver ${hanzi} e ligar à ideia de ${meaningPt}.`,
      2: `Distinguir ${hanzi} de caracteres vizinhos.`,
      3: `Reconhecer ou montar ${hanzi}.`,
      4: `Encontrar ${hanzi} num contexto conhecido, com menos pinyin.`,
    },
    canonicalExamples: [hanzi],
    prerequisites: ["p1-o-que-e-hanzi"],
  };
}

function extractExample(lesson: LessonForSpec): string {
  for (const step of lesson.steps ?? []) {
    const candidate = step.hanzi || step.audioText || step.text || step.correctAnswer;
    if (candidate && /[\u3400-\u9fff]/.test(candidate)) {
      const match = candidate.match(/[\u3400-\u9fff]+/);
      if (match) return match[0];
    }
  }
  return lesson.title.replace(/[—:].*$/, "").trim() || lesson.title;
}

function defaultSpec(lesson: LessonForSpec): TopicMasterySpec {
  const title = lesson.title;
  const example = extractExample(lesson);
  const skill = lesson.skill ?? "fala";
  if (skill === "som") {
    return {
      topicId: lesson.id,
      promise: `Ouvir e discriminar o som de ${title}.`,
      mustUnderstand: [`O tema "${title}" treina o ouvido, não só a leitura.`],
      mustRecognize: [`o contraste sonoro de ${title}`],
      mustProduce: [`identificar o som-alvo de ${title}`],
      mustTransfer: [`ouvir o mesmo contraste numa palavra já conhecida`],
      commonMisconceptions: ["Se eu leio o pinyin, não preciso ouvir."],
      passObjectives: {
        1: `Descobrir de ouvido o que ${title} está ensinando.`,
        2: `Discriminar os sons de ${title} com pares próximos.`,
        3: `Identificar/produzir o contorno de ${title}.`,
        4: `Levar o som de ${title} a um chunk conhecido.`,
      },
      canonicalExamples: [example],
      prerequisites: [],
    };
  }
  if (skill === "hanzi") {
    return {
      topicId: lesson.id,
      promise: `Ler e montar os hànzì de ${title}.`,
      mustUnderstand: [`${title} ensina forma escrita, não só o som.`],
      mustRecognize: [`os caracteres centrais de ${title}`],
      mustProduce: [`montar ou escolher os hànzì de ${title}`],
      mustTransfer: [`reconhecer esses hànzì com menos pinyin`],
      commonMisconceptions: ["Hànzì se copia de cor sem peças."],
      passObjectives: {
        1: `Ver os caracteres de ${title} e o que eles representam.`,
        2: `Distinguir as peças e os caracteres vizinhos de ${title}.`,
        3: `Montar/reconhecer os hànzì de ${title}.`,
        4: `Usar os hànzì de ${title} num contexto já ouvido.`,
      },
      canonicalExamples: [example],
      prerequisites: ["p1-o-que-e-hanzi"],
    };
  }
  return {
    topicId: lesson.id,
    promise: `Usar de verdade o que o título promete: ${title}.`,
    mustUnderstand: [`O que ${title} permite dizer ou fazer em mandarim.`],
    mustRecognize: [`as frases/itens centrais de ${title}`],
    mustProduce: [`dizer ou montar o núcleo de ${title}`],
    mustTransfer: [`usar ${title} numa situação um pouco nova`],
    commonMisconceptions: ["Decorar a lição sem conseguir usar o título."],
    passObjectives: {
      1: `Descobrir os itens de ${title} com áudio e sentido.`,
      2: `Reconhecer e distinguir os itens de ${title} por áudio/imagem.`,
      3: `Nomear, pedir ou responder com o núcleo de ${title}.`,
      4: `Usar ${title} numa micro-situação nova.`,
    },
    canonicalExamples: [example],
    prerequisites: [],
  };
}

export function topicMasterySpecFor(lesson: LessonForSpec): TopicMasterySpec | null {
  if (!isTopicMasteryLesson(lesson)) return null;
  const authored = AUTHORED[lesson.id];
  if (authored) return authored;
  // Foundation topics must never silently fall back to a generic template.
  if (isFoundationTopicMasteryId(lesson.id)) return null;
  return defaultSpec(lesson);
}

export function authoredTopicMasterySpecIds(): string[] {
  return Object.keys(AUTHORED);
}

export function passObjective(spec: TopicMasterySpec, pass: MasteryPass): string {
  return spec.passObjectives[pass];
}
