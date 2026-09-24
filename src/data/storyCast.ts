/**
 * RC2.2.11 · K–U — elenco canônico das cenas (Imersão + conversas da Jornada).
 *
 * Não é fonte de currículo: não cria fala, lição nem vocabulário. Dá a cada
 * personagem UM nome chinês estável (latino + Hànzì), um papel e um lado fixo
 * na cena, para a mesma pessoa ser reconhecida de uma cena para outra.
 * `characters.ts` é o registro de Hànzì — pessoas moram aqui.
 */

export type StoryCastSide = "left" | "right";

export type StoryCastMember = {
  id: string;
  /** Nome em romanização (como aparece na bolha). */
  nameLatin: string;
  /** Nome em Hànzì (opcional na UI; nunca obrigatório para entender). */
  nameHanzi?: string;
  namePinyin?: string;
  rolePt: string;
  roleEn: string;
  /** Aluno sempre à direita; todos os outros à esquerda. */
  side: StoryCastSide;
  /** Letra/caractere do avatar. */
  avatarGlyph: string;
  learner?: boolean;
  narrator?: boolean;
};

export const LEARNER_CAST_ID = "learner";
export const NARRATOR_CAST_ID = "narrator";

export const STORY_CAST: Record<string, StoryCastMember> = {
  lin: { id: "lin", nameLatin: "Lin", nameHanzi: "林", namePinyin: "Lín", rolePt: "colega de estudos", roleEn: "study partner", side: "left", avatarGlyph: "林" },
  mei: { id: "mei", nameLatin: "Chen Mei", nameHanzi: "陈美", namePinyin: "Chén Měi", rolePt: "amiga", roleEn: "friend", side: "left", avatarGlyph: "美" },
  wang: { id: "wang", nameLatin: "Wang Wei", nameHanzi: "王伟", namePinyin: "Wáng Wěi", rolePt: "amigo", roleEn: "friend", side: "left", avatarGlyph: "王" },
  hua: { id: "hua", nameLatin: "Hua Laoshi", nameHanzi: "华老师", namePinyin: "Huá lǎoshī", rolePt: "professora", roleEn: "teacher", side: "left", avatarGlyph: "华" },
  "zhang-ayi": { id: "zhang-ayi", nameLatin: "Zhang Ayi", nameHanzi: "张阿姨", namePinyin: "Zhāng āyí", rolePt: "mãe da família anfitriã", roleEn: "host mother", side: "left", avatarGlyph: "张" },
  [LEARNER_CAST_ID]: { id: LEARNER_CAST_ID, nameLatin: "Você", rolePt: "você", roleEn: "you", side: "right", avatarGlyph: "你", learner: true },
  [NARRATOR_CAST_ID]: { id: NARRATOR_CAST_ID, nameLatin: "Narrador", rolePt: "contexto", roleEn: "context", side: "left", avatarGlyph: "·", narrator: true },
};

/** Rótulo de `speaker` nos dados das histórias → membro do elenco. */
export const STORY_SPEAKER_TO_CAST: Record<string, string> = {
  Lin: "lin",
  "Você": LEARNER_CAST_ID,
  "Zhang Ayi": "zhang-ayi",
  "Chen Mei": "mei",
  "Wang Wei": "wang",
  "Hua Laoshi": "hua",
  Narrador: NARRATOR_CAST_ID,
};

/**
 * Quem fala neste passo. Sem `speaker` o passo é EXERCÍCIO (cartão neutro de
 * prática), não uma fala — devolve null. Rótulo desconhecido também é null:
 * o validador `character-identity` impede que isso chegue aos dados.
 */
export function castForStorySpeaker(speaker: string | undefined): StoryCastMember | null {
  if (!speaker) return null;
  const id = STORY_SPEAKER_TO_CAST[speaker];
  return id ? STORY_CAST[id] ?? null : null;
}

/**
 * Nome da linha do aluno: nome de exibição, senão @username, senão "Você".
 * Nunca email.
 */
export function learnerDisplayName(input: { firstName?: string; username?: string; fallback?: string }): string {
  const first = input.firstName?.trim();
  if (first) return first;
  if (input.username?.trim()) return `@${input.username.trim()}`;
  return input.fallback ?? "Você";
}

/**
 * Personagem de conversa da Jornada (conversationScenes.ts) → nome canônico.
 * Quem tem `role` na cena (recepcionista, atendente…) é um figurante com o
 * mesmo avatar — mostra o papel, não empresta o nome de Wang Wei.
 */
export function castNameForSceneCharacter(character: { id: string; name: string; role?: unknown }): {
  nameLatin: string;
  nameHanzi?: string;
} {
  if (character.id === "lin") return { nameLatin: character.name };
  if (character.role) return { nameLatin: character.name };
  const member = STORY_CAST[character.id];
  return member ? { nameLatin: member.nameLatin, nameHanzi: member.nameHanzi } : { nameLatin: character.name };
}
