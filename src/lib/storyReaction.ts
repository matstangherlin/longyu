/**
 * RC2.2.23 — a cena REAGE à escolha do aluno (não só "Certo/Quase").
 *
 * Quem reage é o parceiro de cena: quem fala neste passo, ou o personagem
 * mais próximo na história (nunca o narrador, nunca o próprio aluno). As
 * reações são interjeições fixas de apresentação (对！/ 嗯？), não conteúdo
 * novo de currículo — o "porquê" continua em explanationPt.
 */
import { castForStorySpeaker, type StoryCastMember } from "../data/storyCast";

export interface StoryReaction {
  cast: StoryCastMember;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  correct: boolean;
}

export const STORY_REACTION_LINES = {
  correct: { hanzi: "对！", pinyin: "duì!", meaningPt: "Isso!" },
  wrong: { hanzi: "嗯？", pinyin: "ńg?", meaningPt: "Hum? Não entendi bem." },
} as const;

function isPartner(cast: StoryCastMember | null): cast is StoryCastMember {
  return Boolean(cast && !cast.learner && !cast.narrator);
}

export function storyScenePartner(steps: readonly { speaker?: string }[], index: number): StoryCastMember | null {
  for (let distance = 0; distance < steps.length; distance += 1) {
    for (const at of [index - distance, index + distance]) {
      const cast = at >= 0 && at < steps.length ? castForStorySpeaker(steps[at].speaker) : null;
      if (isPartner(cast)) return cast;
    }
  }
  return null;
}

export function storyReaction(steps: readonly { speaker?: string }[], index: number, correct: boolean): StoryReaction | null {
  const cast = storyScenePartner(steps, index);
  if (!cast) return null;
  return { cast, correct, ...(correct ? STORY_REACTION_LINES.correct : STORY_REACTION_LINES.wrong) };
}
