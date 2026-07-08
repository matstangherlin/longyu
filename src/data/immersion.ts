import { CHUNKS } from "./chunks";
import { microtextById } from "./microtexts";

export type ImmersionMode = "listen_repeat" | "auditory_review" | "guided_reading";

export interface ImmersionItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  audioText?: string;
}

export interface ImmersionSession {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  mode: ImmersionMode;
  items: ImmersionItem[];
  rewardXp: number;
  rewardQi: number;
  missionProgress: {
    audioHeard: number;
    phrasesSpoken?: number;
    microtextsRead?: number;
  };
  minutes: {
    som?: number;
    fala?: number;
    leitura?: number;
  };
}

const chunksById = Object.fromEntries(CHUNKS.map((chunk) => [chunk.id, chunk]));

function chunkItem(id: string): ImmersionItem {
  const chunk = chunksById[id];
  if (!chunk) throw new Error(`Chunk de imersão não encontrado: ${id}`);
  return {
    id: chunk.id,
    hanzi: chunk.hanzi,
    pinyin: chunk.pinyin,
    meaning: chunk.meaningPt,
  };
}

const presentationText = microtextById.apresentacao;
if (!presentationText) throw new Error("Microtexto de imersão não encontrado: apresentacao");

export const IMMERSION_SESSIONS: ImmersionSession[] = [
  {
    id: "primeiros-cumprimentos",
    title: "Primeiros cumprimentos",
    description: "Ouça, respire e repita cinco frases para abrir e encerrar uma conversa.",
    estimatedMinutes: 4,
    mode: "listen_repeat",
    items: ["nihao", "nihaoma", "xiexie", "bukeqi", "zaijian"].map(chunkItem),
    rewardXp: 15,
    rewardQi: 6,
    missionProgress: { audioHeard: 5, phrasesSpoken: 5 },
    minutes: { som: 2, fala: 2 },
  },
  {
    id: "me-apresentando",
    title: "Me apresentando",
    description: "Construa uma apresentação curta e útil, frase por frase.",
    estimatedMinutes: 4,
    mode: "listen_repeat",
    items: ["wojiao", "wature", "wohuishuoyidian", "wobuhui"].map(chunkItem),
    rewardXp: 15,
    rewardQi: 6,
    missionProgress: { audioHeard: 4, phrasesSpoken: 4 },
    minutes: { som: 2, fala: 2 },
  },
  {
    id: "tons-com-ma",
    title: "Tons com ma",
    description: "Escute os quatro contornos e tente reconhecer o tom antes da resposta.",
    estimatedMinutes: 3,
    mode: "auditory_review",
    items: [
      { id: "ma-1", hanzi: "妈", pinyin: "mā", meaning: "mãe" },
      { id: "ma-2", hanzi: "麻", pinyin: "má", meaning: "cânhamo; dormente" },
      { id: "ma-3", hanzi: "马", pinyin: "mǎ", meaning: "cavalo" },
      { id: "ma-4", hanzi: "骂", pinyin: "mà", meaning: "xingar" },
    ],
    rewardXp: 12,
    rewardQi: 5,
    missionProgress: { audioHeard: 4 },
    minutes: { som: 3 },
  },
  {
    id: "tons-com-yao",
    title: "Tons com yao",
    description: "Compare yāo, yáo, yǎo e yào sem depender da escrita.",
    estimatedMinutes: 3,
    mode: "auditory_review",
    items: [
      { id: "yao-1", hanzi: "腰", pinyin: "yāo", meaning: "cintura" },
      { id: "yao-2", hanzi: "摇", pinyin: "yáo", meaning: "balançar" },
      { id: "yao-3", hanzi: "咬", pinyin: "yǎo", meaning: "morder" },
      { id: "yao-4", hanzi: "要", pinyin: "yào", meaning: "querer; precisar" },
    ],
    rewardXp: 12,
    rewardQi: 5,
    missionProgress: { audioHeard: 4 },
    minutes: { som: 3 },
  },
  {
    id: "leia-comigo",
    title: "Leia comigo",
    description: "Acompanhe o microtexto “Me apresentando” uma frase por vez.",
    estimatedMinutes: 4,
    mode: "guided_reading",
    items: presentationText.lines.map((line, index) => ({
      id: `apresentacao-${index + 1}`,
      hanzi: line.hanzi,
      pinyin: line.pinyin,
      meaning: line.pt,
    })),
    rewardXp: 15,
    rewardQi: 6,
    missionProgress: { audioHeard: presentationText.lines.length, microtextsRead: 1 },
    minutes: { som: 1, leitura: 3 },
  },
];

export const IMMERSION_DAILY_FREE_LIMIT = 3;

export function immersionSessionById(id: string): ImmersionSession | undefined {
  return IMMERSION_SESSIONS.find((session) => session.id === id);
}
