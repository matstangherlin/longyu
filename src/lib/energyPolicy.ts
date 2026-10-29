import { CHARGE_COST_ACTIVITY } from "../data/economy";

/**
 * RC2.2.23 — política de energia para a Beta ("zero Cargas ≠ app travado").
 *
 * QA 2026-10 · LGY-016 — este arquivo é a fonte canônica de QUEM cobra Carga.
 * `src/data/economy.ts` guarda só os números; a cobrança (`consumeCharge`), a
 * copy das telas ("Grátis" / "Usa 1 Carga") e o paywall de energia derivam de
 * `chargeCostFor` e `describeAccess`.
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

/** O que torna uma atividade de progressão gratuita agora. */
export interface ChargeContext {
  /** Pro não usa Cargas. */
  isPro?: boolean;
  /** lesson: já concluída — replay ou rodadas 2–4 de um tema já iniciado. */
  lessonCompleted?: boolean;
  /** immersion_session: já concluída ou já iniciada hoje (reouvir / continuar). */
  sessionCompleted?: boolean;
  /** immersion_session: história interativa livre, não sessão de áudio. */
  freeStory?: boolean;
}

/**
 * Quantas Cargas a atividade custa ao começar. A tabela R-07 sai daqui:
 * 1ª rodada de tema novo = 1, rodadas seguintes e replay = 0, teste de
 * módulo = 1, sessão de escuta nova = 1, história = 0, prática = 0.
 */
export function chargeCostFor(activity: EnergyActivity, context: ChargeContext = {}): number {
  if (context.isPro || !activityConsumesCharge(activity)) return 0;
  if (activity === "lesson" && !lessonStartConsumesCharge({ lessonCompleted: Boolean(context.lessonCompleted) })) return 0;
  if (
    activity === "immersion_session" &&
    !immersionStartConsumesCharge({ sessionCompleted: Boolean(context.sessionCompleted), freeStory: Boolean(context.freeStory) })
  ) {
    return 0;
  }
  return CHARGE_COST_ACTIVITY;
}

/**
 * LGY-033 — a vitória para antes de um começo que cobra: o próximo passo usa
 * Carga e o aluno não tem. Rodadas 2–4 do tema e o Reforço + são grátis
 * (`nextIsFree`), então nunca esperam.
 */
export function victoryWaitsForCharge(input: { nextIsFree: boolean; nextLessonCompleted: boolean; isPro: boolean; charges: number }): boolean {
  if (input.nextIsFree) return false;
  const cost = chargeCostFor("lesson", { isPro: input.isPro, lessonCompleted: input.nextLessonCompleted });
  return cost > 0 && input.charges < cost;
}

export type EnergyAccessLabel = "Grátis" | "Usa 1 Carga" | "Pro";

export type EnergyAccessReason =
  | "pro"
  | "newLesson"
  | "moduleChallenge"
  | "immersionSession"
  | "premiumPreview"
  | "replay"
  | "story"
  | "immersionReplay"
  | "practice"
  | "review"
  | "open";

export interface EnergyAccess {
  /** true = não desconta Carga. */
  free: boolean;
  /** Rótulo canônico (pt-BR); a tela mostra `labelKey`. */
  label: EnergyAccessLabel;
  labelKey: "energyAccess.label.free" | "energyAccess.label.usesCharge" | "energyAccess.label.pro";
  reasonKey: `energyAccess.reason.${EnergyAccessReason}`;
}

/** A copy de custo de cada tela vem daqui, nunca de texto fixo. */
export function describeAccess(activity: EnergyActivity, context: ChargeContext = {}): EnergyAccess {
  if (context.isPro) return { free: true, label: "Pro", labelKey: "energyAccess.label.pro", reasonKey: "energyAccess.reason.pro" };
  const cost = chargeCostFor(activity, context);
  if (cost > 0) {
    const reason: EnergyAccessReason =
      activity === "module_challenge" ? "moduleChallenge" : activity === "immersion_session" ? "immersionSession" : activity === "premium_preview" ? "premiumPreview" : "newLesson";
    return { free: false, label: "Usa 1 Carga", labelKey: "energyAccess.label.usesCharge", reasonKey: `energyAccess.reason.${reason}` };
  }
  const reason: EnergyAccessReason =
    activity === "lesson"
      ? "replay"
      : activity === "immersion_session"
        ? context.freeStory
          ? "story"
          : "immersionReplay"
        : activity === "extra_training"
          ? "practice"
          : activity === "essential_review"
            ? "review"
            : "open";
  return { free: true, label: "Grátis", labelKey: "energyAccess.label.free", reasonKey: `energyAccess.reason.${reason}` };
}

/**
 * LGY-034 — quando as Cargas voltam. O aparelho vira o dia à meia-noite local
 * (`todayKey`). A conta na nuvem segue o servidor: `user_economy.energy_day`
 * vira com `current_date`, e o Postgres de produção roda em UTC (conferido em
 * 27/10/2026). Então, na nuvem, a recarga é a meia-noite UTC no relógio local.
 */
export type ChargeDayClock = "local" | "utc";

export function nextChargeRefillAt(now: Date, clock: ChargeDayClock): Date {
  if (clock === "utc") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/** "HH:MM" no relógio do aparelho. */
export function chargeRefillClockLabel(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

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
