/**
 * RC2.2.23 — política de energia para a Beta ("zero Cargas ≠ app travado").
 *
 * Três conceitos que NUNCA se misturam na copy:
 *   VIDAS  — erros dentro da tentativa (errou → perde Vida; não perde Carga).
 *   FÔLEGO — pular uma tarefa.
 *   CARGAS — iniciar NOVA progressão principal (lição nova, desafio de
 *            módulo, sessão de Imersão nova). Orçamento de progressão, não castigo.
 *
 * Com zero Cargas o Longyu continua utilizável: revisão, prática do que já foi
 * aprendido, replay do que já foi concluído, Cultura liberada, Atlas, histórias
 * livres, Missões, Perfil, Conta, Aparência e Configurações. Só a nova
 * progressão curricular espera. Pro remove fricção; nunca é o único caminho.
 */
export type EnergyActivity =
  | "lesson"
  | "module_challenge"
  | "immersion_session"
  | "extra_training"
  | "premium_preview"
  | "essential_review"
  | "library"
  | "atlas"
  | "settings"
  | "account"
  | "progress";

/** Só NOVA progressão principal consome Carga. Prática do que já foi aprendido, não. */
export const PROGRESSION_ACTIVITIES: readonly EnergyActivity[] = ["lesson", "module_challenge", "immersion_session", "premium_preview"];

export function activityConsumesCharge(activity: EnergyActivity): boolean {
  return PROGRESSION_ACTIVITIES.includes(activity);
}

/** Iniciar uma lição: replay de lição já concluída não é progressão nova. */
export function lessonStartConsumesCharge(input: { lessonCompleted: boolean }): boolean {
  return !input.lessonCompleted;
}

/** Imersão: sessão já concluída (replay) e histórias livres não cobram. */
export function immersionStartConsumesCharge(input: { sessionCompleted: boolean; freeStory: boolean }): boolean {
  return !input.sessionCompleted && !input.freeStory;
}

/** Errar custa Vida. NUNCA Carga (sem dupla punição). */
export const MISTAKE_CHARGE_COST = 0;

export interface FreeStudyLane {
  id: "review" | "practice" | "culture" | "story" | "hanzi" | "pinyin" | "atlas";
  to: string;
}

/** Caminhos gratuitos com zero Cargas (em ordem de sugestão). */
export const ZERO_CHARGE_FREE_LANES: readonly FreeStudyLane[] = [
  { id: "review", to: "/revisao" },
  { id: "practice", to: "/praticar" },
  { id: "culture", to: "/cultura" },
  { id: "story", to: "/imersao" },
  { id: "hanzi", to: "/hanzi" },
  { id: "pinyin", to: "/pinyin" },
  { id: "atlas", to: "/hanzi/atlas" },
];

/** Rotas que continuam abertas com zero Cargas (não são "energyBlocked"). */
export const ZERO_CHARGE_OPEN_ROUTES: readonly string[] = [
  "/revisao",
  "/praticar",
  "/treino",
  "/cultura",
  "/imersao",
  "/hanzi",
  "/hanzi/atlas",
  "/pinyin",
  "/som",
  "/missoes",
  "/perfil",
  "/conta",
  "/config/aparencia",
  "/configuracoes",
  "/loja",
  "/mais",
  "/jornada",
];

/**
 * Os caminhos gratuitos para oferecer AGORA (só os já liberados para o aluno),
 * sempre com pelo menos um: a revisão existe mesmo para quem acabou de começar.
 */
export function freeStudyPaths(available: (lane: FreeStudyLane["id"]) => boolean, max = 4): FreeStudyLane[] {
  const lanes = ZERO_CHARGE_FREE_LANES.filter((lane) => available(lane.id)).slice(0, max);
  return lanes.length > 0 ? lanes : [ZERO_CHARGE_FREE_LANES[0]];
}

/** Copy: cada palavra no seu conceito (o gate recusa misturar). */
export const ENERGY_COPY_CONCEPTS = {
  vidas: "erros dentro da tentativa",
  folego: "pular tarefa",
  cargas: "iniciar nova progressão principal",
} as const;
