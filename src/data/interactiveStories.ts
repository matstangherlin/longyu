import type { ReviewDomain } from "../lib/srs";
import type { Track } from "../lib/store";
import type { ImageChoiceMode } from "./visualVocabulary";
import type { ItemType } from "./types";

export type StoryStepKind =
  | "dialogue_line"
  | "choose_reply"
  | "choose_meaning"
  | "fill_hanzi"
  | "fill_pinyin"
  | "listen_choice"
  | "image_choice"
  | "mini_review";

export interface StoryReviewTarget {
  type: ItemType;
  itemId: string;
  domain: ReviewDomain;
  track: Track;
}

export interface StoryCharacter {
  id: string;
  name: string;
  role?: string;
  side?: "left" | "right";
  color?: string;
}

interface StoryStepBase {
  id: string;
  speaker?: string;
  hanzi?: string;
  pinyin?: string;
  translationPt?: string;
  promptPt?: string;
  options?: string[];
  answer?: string | string[];
  explanationPt?: string;
  noHint?: boolean;
  reviewTarget?: StoryReviewTarget;
  /** Vocabulário já ensinado na jornada — obrigatório para validação. */
  learnedRefs?: string[];
  /** Novidade controlada (preview) — deve estar em previewRefs da história ou do step. */
  previewRefs?: string[];
}

export type StoryStep =
  | (StoryStepBase & { kind: "dialogue_line" })
  | (StoryStepBase & { kind: "choose_reply" })
  | (StoryStepBase & { kind: "choose_meaning" })
  | (StoryStepBase & { kind: "fill_hanzi" })
  | (StoryStepBase & { kind: "fill_pinyin" })
  | (StoryStepBase & { kind: "listen_choice" })
  | (StoryStepBase & {
      kind: "image_choice";
      imageId?: string;
      imageOptions?: string[];
      correctImageId?: string;
      imageChoiceMode?: ImageChoiceMode;
      targetMeaningPt?: string;
    })
  | (StoryStepBase & { kind: "mini_review" });

export interface StoryScene {
  id: string;
  setting: string;
  backdrop?: string;
  characters: StoryCharacter[];
  steps: StoryStep[];
}

export interface InteractiveStory {
  id: string;
  title: string;
  description: string;
  level: number;
  requiredLessonIds: string[];
  premium?: boolean;
  rewardXp: number;
  rewardQi: number;
  rewardEnergy?: number;
  estimatedMinutes?: number;
  moduleId?: string;
  /** Refs ensinadas antes desta história (validação de vocabulário). */
  learnedRefs?: string[];
  /** Refs novas permitidas como preview nesta história. */
  previewRefs?: string[];
  scenes: StoryScene[];
}

export type FlatStoryStep = StoryStep & {
  sceneId: string;
  setting: string;
  characters: StoryCharacter[];
  globalIndex: number;
};

const LIN: StoryCharacter = { id: "lin", name: "Lin", role: "Amiga", side: "left", color: "#0d9488" };
const YOU: StoryCharacter = { id: "you", name: "Você", side: "right", color: "#2563eb" };
const TEACHER: StoryCharacter = { id: "teacher", name: "Professor", side: "left", color: "#7c3aed" };
const ANA: StoryCharacter = { id: "ana", name: "Ana", side: "left", color: "#db2777" };
const GUIDE: StoryCharacter = { id: "guide", name: "Guia", side: "left", color: "#059669" };

function rt(
  type: ItemType,
  itemId: string,
  domain: ReviewDomain,
  track: Track
): StoryReviewTarget {
  return { type, itemId, domain, track };
}

export const INTERACTIVE_STORIES: InteractiveStory[] = [
  {
    id: "primeiro-encontro",
    title: "Primeiro encontro",
    description: "Cumprimente, diga seu nome e agradeça em um primeiro diálogo.",
    level: 1,
    requiredLessonIds: ["l1", "p1-o-que-e-mandarim"],
    rewardXp: 18,
    rewardQi: 2,
    rewardEnergy: 1,
    estimatedMinutes: 4,
    moduleId: "immersion-stories",
    learnedRefs: ["chunk:nihao", "chunk:xiexie", "char:wo", "char:ni", "chunk:wojiao"],
    previewRefs: ["char:ma_person"],
    scenes: [
      {
        id: "rua",
        setting: "Rua da universidade",
        backdrop: "street",
        characters: [LIN, YOU],
        steps: [
          {
            id: "cumprimento",
            kind: "dialogue_line",
            speaker: "Lin",
            hanzi: "你好！",
            pinyin: "nǐ hǎo",
            translationPt: "Olá!",
            learnedRefs: ["chunk:nihao"],
          },
          {
            id: "responder-cumprimento",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "你好！",
            pinyin: "nǐ hǎo",
            translationPt: "Olá!",
            promptPt: "Lin disse 你好. Como você responde?",
            options: ["你好！", "谢谢！", "再见！", "我是水。"],
            answer: "你好！",
            explanationPt: "你好 também serve como resposta natural para um cumprimento.",
            reviewTarget: rt("chunk", "nihao", "uso", "fala"),
            learnedRefs: ["chunk:nihao"],
          },
          {
            id: "apresentacao",
            kind: "dialogue_line",
            speaker: "Lin",
            hanzi: "我叫林。",
            pinyin: "wǒ jiào Lín",
            translationPt: "Eu me chamo Lin.",
            learnedRefs: ["chunk:wojiao", "char:wo"],
          },
          {
            id: "nome-lacuna",
            kind: "fill_hanzi",
            speaker: "Você",
            hanzi: "我叫马修。",
            pinyin: "wǒ jiào Mǎxiū",
            translationPt: "Eu me chamo Matheus.",
            promptPt: "Complete a frase: 我叫 ___。",
            options: ["马修", "谢谢", "水", "好"],
            answer: "马修",
            explanationPt: "我叫... é a forma simples de dizer seu nome.",
            noHint: true,
            reviewTarget: rt("chunk", "wojiao", "uso", "fala"),
            learnedRefs: ["chunk:wojiao", "char:wo"],
            previewRefs: ["char:ma_person"],
          },
          {
            id: "pergunta-nome",
            kind: "dialogue_line",
            speaker: "Lin",
            hanzi: "你叫什么？",
            pinyin: "nǐ jiào shénme",
            translationPt: "Como você se chama?",
            learnedRefs: ["char:ni", "chunk:wojiao"],
          },
          {
            id: "pinyin-nihao",
            kind: "fill_pinyin",
            hanzi: "你好",
            pinyin: "nǐ hǎo",
            translationPt: "Olá",
            promptPt: "Complete o pinyin: 你好 = nǐ ___.",
            options: ["hǎo", "xiè", "shuǐ", "rén"],
            answer: "hǎo",
            explanationPt: "好 tem o som hǎo, com terceiro tom.",
            noHint: true,
            reviewTarget: rt("chunk", "nihao", "pinyin", "som"),
            learnedRefs: ["chunk:nihao"],
          },
          {
            id: "significado-xiexie",
            kind: "choose_meaning",
            hanzi: "谢谢",
            pinyin: "xièxie",
            translationPt: "Obrigado(a)",
            promptPt: "O que significa 谢谢?",
            options: ["Obrigado(a).", "Olá.", "Até logo.", "Eu sou."],
            answer: "Obrigado(a).",
            explanationPt: "谢谢 é a palavra mais comum para agradecer.",
            reviewTarget: rt("chunk", "xiexie", "significado", "leitura"),
            learnedRefs: ["chunk:xiexie"],
          },
          {
            id: "agradecer-final",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "谢谢你！",
            pinyin: "xièxie nǐ",
            translationPt: "Obrigado(a)!",
            promptPt: "Lin ajudou você. O que você diz?",
            options: ["谢谢你！", "再见！", "你好！", "我很好。"],
            answer: "谢谢你！",
            explanationPt: "谢谢你 agradece de forma calorosa.",
            reviewTarget: rt("chunk", "xiexie", "uso", "fala"),
            learnedRefs: ["chunk:xiexie", "char:ni"],
          },
          {
            id: "recap-cumprimento",
            kind: "mini_review",
            promptPt: "Revisão rápida: qual cumprimento você ouviu no começo?",
            options: ["你好", "谢谢", "再见", "中文"],
            answer: "你好",
            explanationPt: "A história começou com 你好.",
            reviewTarget: rt("chunk", "nihao", "significado", "leitura"),
            learnedRefs: ["chunk:nihao"],
          },
        ],
      },
    ],
  },
  {
    id: "sala-de-aula",
    title: "Na sala de aula",
    description: "Professor, estudante e a frase 我不会说中文 em contexto.",
    level: 2,
    requiredLessonIds: ["l9", "p3-wobuhui-shuo-zhongwen"],
    rewardXp: 22,
    rewardQi: 3,
    rewardEnergy: 1,
    estimatedMinutes: 5,
    moduleId: "immersion-stories",
    learnedRefs: ["char:zhong", "chunk:wobuhui", "char:lao", "char:shi_teacher", "chunk:woshixuesheng", "chunk:nihao", "char:wo"],
    previewRefs: ["char:zhong", "char:tong", "char:xue", "char:sheng"],
    scenes: [
      {
        id: "sala",
        setting: "Sala de aula",
        backdrop: "classroom",
        characters: [TEACHER, YOU],
        steps: [
          {
            id: "entrada",
            kind: "dialogue_line",
            speaker: "Professor",
            hanzi: "同学们好。",
            pinyin: "tóngxuémen hǎo",
            translationPt: "Olá, turma.",
            learnedRefs: ["chunk:nihao"],
            previewRefs: ["char:tong", "char:xue", "char:sheng"],
          },
          {
            id: "significado-zhongwen",
            kind: "choose_meaning",
            hanzi: "中文",
            pinyin: "Zhōngwén",
            translationPt: "Chinês; língua chinesa",
            promptPt: "O que significa 中文?",
            options: ["Chinês, a língua.", "Água.", "Obrigado(a).", "Até logo."],
            answer: "Chinês, a língua.",
            explanationPt: "中文 é uma forma comum de dizer chinês como língua.",
            reviewTarget: rt("char", "zhong", "significado", "leitura"),
            learnedRefs: ["char:zhong"],
            previewRefs: ["char:zhong"],
          },
          {
            id: "lacuna-zhongwen",
            kind: "fill_hanzi",
            hanzi: "我不会说中文。",
            pinyin: "wǒ bú huì shuō Zhōngwén",
            translationPt: "Eu não sei falar chinês.",
            promptPt: "Complete a frase: 我不会说 ___.",
            options: ["中文", "水", "老师", "学生"],
            answer: "中文",
            explanationPt: "我不会说中文 significa que você ainda não sabe falar chinês.",
            noHint: true,
            reviewTarget: rt("chunk", "wobuhui", "uso", "fala"),
            learnedRefs: ["chunk:wobuhui", "char:zhong"],
          },
          {
            id: "ouvir-nao-sei",
            kind: "listen_choice",
            hanzi: "我不会说中文。",
            pinyin: "wǒ bú huì shuō Zhōngwén",
            translationPt: "Eu não sei falar chinês.",
            promptPt: "Qual frase você ouviu?",
            options: ["我不会说中文。", "我喝水。", "你叫什么？", "谢谢。"],
            answer: "我不会说中文。",
            explanationPt: "A frase contém 不会说: não sei falar.",
            noHint: true,
            reviewTarget: rt("chunk", "wobuhui", "som", "som"),
            learnedRefs: ["chunk:wobuhui"],
          },
          {
            id: "pinyin-laoshi",
            kind: "fill_pinyin",
            hanzi: "老师",
            pinyin: "lǎoshī",
            translationPt: "Professor(a)",
            promptPt: "Complete o pinyin: 老师 = lǎo ___.",
            options: ["shī", "shuǐ", "xie", "hao"],
            answer: "shī",
            explanationPt: "师 em 老师 soa shī, primeiro tom.",
            noHint: true,
            reviewTarget: rt("char", "shi_teacher", "pinyin", "som"),
            learnedRefs: ["char:lao", "char:shi_teacher"],
          },
          {
            id: "quem-responde",
            kind: "choose_reply",
            hanzi: "学生",
            pinyin: "xuésheng",
            translationPt: "Estudante",
            promptPt: "Quem responde ao professor na sala?",
            options: ["学生", "水", "谢谢", "中文"],
            answer: "学生",
            explanationPt: "学生 significa estudante ou aluno.",
            reviewTarget: rt("chunk", "woshixuesheng", "significado", "leitura"),
            learnedRefs: ["chunk:woshixuesheng"],
          },
          {
            id: "fechamento",
            kind: "dialogue_line",
            speaker: "Você",
            hanzi: "我是学生。",
            pinyin: "wǒ shì xuésheng",
            translationPt: "Eu sou estudante.",
            learnedRefs: ["chunk:woshixuesheng", "char:wo"],
          },
          {
            id: "recap-aula",
            kind: "mini_review",
            promptPt: "Na sala, você disse que ainda não fala chinês. Qual frase era?",
            options: ["我不会说中文。", "我很好。", "明天见。", "我想喝水。"],
            answer: "我不会说中文。",
            explanationPt: "我不会说中文 foi o ponto central desta cena.",
            reviewTarget: rt("chunk", "wobuhui", "significado", "leitura"),
            learnedRefs: ["chunk:wobuhui"],
          },
        ],
      },
    ],
  },
  {
    id: "pedindo-agua",
    title: "Pedindo água",
    description: "Peça água com 水 e agradeça depois.",
    level: 1,
    requiredLessonIds: ["p1-primeiros-hanzi", "l14-pecas-natureza"],
    rewardXp: 18,
    rewardQi: 2,
    rewardEnergy: 1,
    estimatedMinutes: 4,
    moduleId: "immersion-stories",
    learnedRefs: ["char:shui", "char:wo", "chunk:xiexie"],
    previewRefs: ["vocab:v_woxiangheshui", "char:kou", "char:xiang", "char:he", "chunk:bukeqi"],
    scenes: [
      {
        id: "cafe",
        setting: "Cafeteria",
        backdrop: "cafe",
        characters: [LIN, YOU],
        steps: [
          {
            id: "sede",
            kind: "dialogue_line",
            speaker: "Narrador",
            hanzi: "我口渴。",
            pinyin: "wǒ kǒu kě",
            translationPt: "Estou com sede.",
            learnedRefs: ["char:wo"],
            previewRefs: ["char:kou"],
          },
          {
            id: "pedido",
            kind: "dialogue_line",
            speaker: "Você",
            hanzi: "我想喝水。",
            pinyin: "wǒ xiǎng hē shuǐ",
            translationPt: "Eu quero beber água.",
            learnedRefs: ["char:wo", "char:shui"],
            previewRefs: ["vocab:v_woxiangheshui", "char:xiang", "char:he"],
          },
          {
            id: "significado-shui",
            kind: "choose_meaning",
            hanzi: "水",
            pinyin: "shuǐ",
            translationPt: "Água",
            promptPt: "O que significa 水?",
            options: ["Água.", "Pessoa.", "Professor.", "Adeus."],
            answer: "Água.",
            explanationPt: "水 significa água e tem terceiro tom: shuǐ.",
            reviewTarget: rt("char", "shui", "significado", "leitura"),
            learnedRefs: ["char:shui"],
          },
          {
            id: "lacuna-shui",
            kind: "fill_hanzi",
            hanzi: "我想喝水。",
            pinyin: "wǒ xiǎng hē shuǐ",
            translationPt: "Eu quero beber água.",
            promptPt: "Complete a frase: 我想喝 ___.",
            options: ["水", "你", "谢", "中"],
            answer: "水",
            explanationPt: "我想喝水 pede água de forma natural.",
            noHint: true,
            reviewTarget: rt("char", "shui", "forma", "hanzi"),
            learnedRefs: ["char:shui", "char:wo"],
            previewRefs: ["vocab:v_woxiangheshui"],
          },
          {
            id: "pinyin-shui",
            kind: "fill_pinyin",
            hanzi: "水",
            pinyin: "shuǐ",
            translationPt: "Água",
            promptPt: "Complete o pinyin: 水 = ___.",
            options: ["shuǐ", "hǎo", "xiè", "zhōng"],
            answer: "shuǐ",
            explanationPt: "水 se lê shuǐ, com terceiro tom.",
            noHint: true,
            reviewTarget: rt("char", "shui", "pinyin", "som"),
            learnedRefs: ["char:shui"],
          },
          {
            id: "ouvir-frase-agua",
            kind: "listen_choice",
            hanzi: "我想喝水。",
            pinyin: "wǒ xiǎng hē shuǐ",
            translationPt: "Eu quero beber água.",
            promptPt: "Qual frase você ouviu?",
            options: ["我想喝水。", "我叫马修。", "谢谢。", "你好。"],
            answer: "我想喝水。",
            explanationPt: "我想喝水 é o pedido de água desta história.",
            noHint: true,
            reviewTarget: rt("char", "shui", "som", "som"),
            learnedRefs: ["char:shui", "char:wo"],
            previewRefs: ["vocab:v_woxiangheshui"],
          },
          {
            id: "agradecer",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "谢谢！",
            pinyin: "xièxie",
            translationPt: "Obrigado(a)!",
            promptPt: "Lin te entrega água. O que você diz?",
            options: ["谢谢！", "再见！", "我不会。", "我是学生。"],
            answer: "谢谢！",
            explanationPt: "谢谢 é a resposta natural para agradecer.",
            reviewTarget: rt("chunk", "xiexie", "uso", "fala"),
            learnedRefs: ["chunk:xiexie"],
          },
          {
            id: "resposta",
            kind: "dialogue_line",
            speaker: "Lin",
            hanzi: "不客气。",
            pinyin: "bú kèqi",
            translationPt: "De nada.",
            learnedRefs: ["chunk:bukeqi"],
          },
        ],
      },
    ],
  },
  {
    id: "encontrando-arvore",
    title: "Encontrando uma árvore",
    description: "Reconheça 木, 人, 山 e 水 com imagens reais na trilha.",
    level: 2,
    requiredLessonIds: ["l14-pecas-natureza", "l19-logica-madeira"],
    rewardXp: 20,
    rewardQi: 3,
    rewardEnergy: 1,
    estimatedMinutes: 5,
    moduleId: "immersion-stories",
    learnedRefs: ["char:mu", "char:ren", "char:shan", "char:shui"],
    previewRefs: ["char:ni", "char:kan", "char:shi", "char:zhe"],
    scenes: [
      {
        id: "trilha",
        setting: "Trilha na montanha",
        backdrop: "forest",
        characters: [GUIDE, YOU],
        steps: [
          {
            id: "guia-intro",
            kind: "dialogue_line",
            speaker: "Guia",
            hanzi: "你看！",
            pinyin: "nǐ kàn",
            translationPt: "Olha!",
            learnedRefs: ["char:ni"],
            previewRefs: ["char:kan"],
          },
          {
            id: "imagem-agua",
            kind: "image_choice",
            promptPt: "Isto é água. Qual imagem mostra 水?",
            imageId: "water",
            imageOptions: ["water", "tree", "person", "mountain"],
            correctImageId: "water",
            imageChoiceMode: "choose_image",
            targetMeaningPt: "água",
            answer: "water",
            explanationPt: "水 é água — a foto mostra água em movimento.",
            reviewTarget: rt("char", "shui", "significado", "leitura"),
            learnedRefs: ["char:shui"],
          },
          {
            id: "imagem-pessoa",
            kind: "image_choice",
            promptPt: "Isto é uma pessoa. Qual imagem mostra 人?",
            imageId: "person",
            imageOptions: ["person", "tree", "water", "fire"],
            correctImageId: "person",
            imageChoiceMode: "choose_image",
            targetMeaningPt: "pessoa",
            answer: "person",
            explanationPt: "人 significa pessoa.",
            reviewTarget: rt("char", "ren", "significado", "leitura"),
            learnedRefs: ["char:ren"],
          },
          {
            id: "imagem-arvore",
            kind: "image_choice",
            promptPt: "Isto é uma árvore. Qual imagem mostra 木?",
            imageId: "tree",
            imageOptions: ["tree", "mountain", "moon", "mouth"],
            correctImageId: "tree",
            imageChoiceMode: "choose_image",
            targetMeaningPt: "árvore",
            answer: "tree",
            explanationPt: "木 é árvore ou madeira — a foto mostra uma árvore.",
            reviewTarget: rt("char", "mu", "significado", "leitura"),
            learnedRefs: ["char:mu"],
          },
          {
            id: "montanha-significado",
            kind: "choose_meaning",
            hanzi: "山",
            pinyin: "shān",
            translationPt: "Montanha",
            promptPt: "O que significa 山?",
            options: ["Montanha.", "Água.", "Pessoa.", "Árvore."],
            answer: "Montanha.",
            explanationPt: "山 significa montanha — você está numa trilha montanhosa.",
            reviewTarget: rt("char", "shan", "significado", "leitura"),
            learnedRefs: ["char:shan"],
          },
          {
            id: "frase-arvore",
            kind: "fill_hanzi",
            hanzi: "这是树。",
            pinyin: "zhè shì shù",
            translationPt: "Isto é uma árvore.",
            promptPt: "Complete: 这是 ___.",
            options: ["树", "人", "水", "山"],
            answer: "树",
            explanationPt: "树 é árvore em frase comum; 木 é o caractere base.",
            noHint: true,
            reviewTarget: rt("char", "mu", "uso", "fala"),
            learnedRefs: ["char:mu"],
            previewRefs: ["char:shi", "char:zhe"],
          },
          {
            id: "recap-natureza",
            kind: "mini_review",
            promptPt: "Qual caractere significa água?",
            options: ["水", "木", "人", "山"],
            answer: "水",
            explanationPt: "水 foi a primeira imagem da trilha.",
            reviewTarget: rt("char", "shui", "significado", "leitura"),
            learnedRefs: ["char:shui"],
          },
        ],
      },
    ],
  },
  {
    id: "despedida-no-parque",
    title: "Despedida no parque",
    description: "Pergunte como está, responda bem e combine de se ver amanhã.",
    level: 1,
    requiredLessonIds: ["l3", "l9-tudo-bem"],
    rewardXp: 18,
    rewardQi: 2,
    rewardEnergy: 1,
    estimatedMinutes: 4,
    moduleId: "immersion-stories",
    learnedRefs: ["chunk:zaijian", "chunk:mingtianjian", "chunk:nihaoma", "chunk:wohenhao", "char:ni", "char:wo"],
    previewRefs: ["chunk:jintianhenhao", "char:jin", "char:tian"],
    scenes: [
      {
        id: "parque",
        setting: "Parque ao entardecer",
        backdrop: "park",
        characters: [ANA, YOU],
        steps: [
          {
            id: "cumprimento-parque",
            kind: "dialogue_line",
            speaker: "Ana",
            hanzi: "你好吗？",
            pinyin: "nǐ hǎo ma?",
            translationPt: "Tudo bem?",
            learnedRefs: ["chunk:nihaoma", "char:ni"],
          },
          {
            id: "resposta-bem",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "我很好。",
            pinyin: "wǒ hěn hǎo",
            translationPt: "Estou bem.",
            promptPt: "Ana perguntou 你好吗. Como você responde?",
            options: ["我很好。", "我不会。", "多少钱？", "谢谢。"],
            answer: "我很好。",
            explanationPt: "我很好 é a resposta padrão para 'tudo bem?'.",
            reviewTarget: rt("chunk", "wohenhao", "uso", "fala"),
            learnedRefs: ["chunk:wohenhao", "char:wo"],
          },
          {
            id: "conversa-parque",
            kind: "dialogue_line",
            speaker: "Ana",
            hanzi: "今天很好。",
            pinyin: "jīntiān hěn hǎo",
            translationPt: "Hoje está ótimo.",
            learnedRefs: ["chunk:jintianhenhao"],
            previewRefs: ["char:jin", "char:tian"],
          },
          {
            id: "significado-zaijian",
            kind: "choose_meaning",
            hanzi: "再见",
            pinyin: "zàijiàn",
            translationPt: "Até logo.",
            promptPt: "O que significa 再见?",
            options: ["Até logo.", "Bom dia.", "Obrigado(a).", "Estou bem."],
            answer: "Até logo.",
            explanationPt: "再见 é a despedida mais comum no dia a dia.",
            reviewTarget: rt("chunk", "zaijian", "significado", "leitura"),
            learnedRefs: ["chunk:zaijian"],
          },
          {
            id: "responder-despedida",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "再见！",
            pinyin: "zàijiàn",
            translationPt: "Até logo!",
            promptPt: "Ana vai embora. Como você se despede?",
            options: ["再见！", "你好！", "我很好。", "我想喝水。"],
            answer: "再见！",
            explanationPt: "再见 responde naturalmente a uma despedida.",
            reviewTarget: rt("chunk", "zaijian", "uso", "fala"),
            learnedRefs: ["chunk:zaijian"],
          },
          {
            id: "amanha",
            kind: "dialogue_line",
            speaker: "Ana",
            hanzi: "明天见！",
            pinyin: "míngtiān jiàn",
            translationPt: "Até amanhã!",
            learnedRefs: ["chunk:mingtianjian"],
          },
          {
            id: "significado-mingtian",
            kind: "choose_meaning",
            hanzi: "明天见",
            pinyin: "míngtiān jiàn",
            translationPt: "Até amanhã.",
            promptPt: "O que significa 明天见?",
            options: ["Até amanhã.", "Tudo bem?", "Estou bem.", "Obrigado(a)."],
            answer: "Até amanhã.",
            explanationPt: "明天见 combina 明天 (amanhã) com 见 (ver).",
            reviewTarget: rt("chunk", "mingtianjian", "significado", "leitura"),
            learnedRefs: ["chunk:mingtianjian"],
          },
          {
            id: "ouvir-despedida",
            kind: "listen_choice",
            hanzi: "再见！",
            pinyin: "zàijiàn",
            translationPt: "Até logo!",
            promptPt: "Qual frase você ouviu?",
            options: ["再见！", "你好吗？", "我很好。", "谢谢！"],
            answer: "再见！",
            explanationPt: "A despedida curta é 再见.",
            noHint: true,
            reviewTarget: rt("chunk", "zaijian", "som", "som"),
            learnedRefs: ["chunk:zaijian"],
          },
          {
            id: "recap-parque",
            kind: "mini_review",
            promptPt: "Como você respondeu quando Ana perguntou 你好吗?",
            options: ["我很好。", "明天见。", "再见。", "谢谢。"],
            answer: "我很好。",
            explanationPt: "我很好 fecha o ciclo cumprimento → resposta.",
            reviewTarget: rt("chunk", "wohenhao", "significado", "leitura"),
            learnedRefs: ["chunk:wohenhao"],
          },
        ],
      },
    ],
  },
  {
    id: "bom-dia-em-casa",
    title: "Bom dia em casa",
    description: "Cumprimente a família de manhã e diga que está bem.",
    level: 2,
    requiredLessonIds: ["l9-tudo-bem"],
    premium: true,
    rewardXp: 24,
    rewardQi: 4,
    estimatedMinutes: 4,
    moduleId: "immersion-stories",
    learnedRefs: ["chunk:zaoshanghao", "chunk:nihaoma", "chunk:wohenhao", "char:jia"],
    scenes: [
      {
        id: "casa",
        setting: "Casa da família",
        backdrop: "home",
        characters: [
          { id: "mae", name: "Mãe", side: "left", color: "#be185d" },
          YOU,
        ],
        steps: [
          {
            id: "mae-cumprimento",
            kind: "dialogue_line",
            speaker: "Mãe",
            hanzi: "早上好！",
            pinyin: "zǎoshang hǎo",
            translationPt: "Bom dia!",
            learnedRefs: ["chunk:zaoshanghao"],
          },
          {
            id: "responder-bom-dia",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "早上好！",
            pinyin: "zǎoshang hǎo",
            translationPt: "Bom dia!",
            promptPt: "Sua mãe disse 早上好. Como você responde?",
            options: ["早上好！", "再见！", "我饿了。", "太贵了。"],
            answer: "早上好！",
            reviewTarget: rt("chunk", "zaoshanghao", "uso", "fala"),
            learnedRefs: ["chunk:zaoshanghao"],
          },
          {
            id: "pergunta-como-esta",
            kind: "dialogue_line",
            speaker: "Mãe",
            hanzi: "你好吗？",
            pinyin: "nǐ hǎo ma?",
            translationPt: "Tudo bem?",
            learnedRefs: ["chunk:nihaoma"],
          },
          {
            id: "resposta-bem-casa",
            kind: "choose_reply",
            speaker: "Você",
            hanzi: "我很好。",
            pinyin: "wǒ hěn hǎo",
            translationPt: "Estou bem.",
            promptPt: "Como você responde a 你好吗?",
            options: ["我很好。", "我不会。", "多少钱？", "请坐。"],
            answer: "我很好。",
            reviewTarget: rt("chunk", "wohenhao", "uso", "fala"),
            learnedRefs: ["chunk:wohenhao"],
          },
          {
            id: "recap-manha",
            kind: "mini_review",
            promptPt: "Qual cumprimento de manhã você ouviu?",
            options: ["早上好", "再见", "谢谢", "中文"],
            answer: "早上好",
            learnedRefs: ["chunk:zaoshanghao"],
          },
        ],
      },
    ],
  },
];

export const INTERACTIVE_STORY_BY_ID = Object.fromEntries(
  INTERACTIVE_STORIES.map((story) => [story.id, story])
) as Record<string, InteractiveStory>;
