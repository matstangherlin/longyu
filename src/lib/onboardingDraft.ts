/**
 * RC2.2.17 · AT–AU / AI–AJ / DY — rascunho do onboarding ANTES da conta.
 *
 * Vive só neste aparelho (localStorage, sobrevive ao "confirme seu e-mail").
 * Guarda três coisas e nada mais:
 *   - o Teste guiado foi concluído (e se o áudio tocou ou foi degradado);
 *   - a meta diária escolhida (minutos);
 *   - o caminho escolhido (começando do zero / já estudo).
 *
 * Nada aqui é progresso: sem lição concluída, domínio, XP, estrelas ou
 * ofensiva. Depois da conta criada, `applyOnboardingDraft` grava SOMENTE a
 * exposição ao Teste guiado (GUIDED_TRY_EXPOSURE) e a meta diária nas
 * preferências da conta, e apaga o rascunho.
 */

export const ONBOARDING_DRAFT_KEY = "longyu.onboardingDraft.v1";

/** Opções canônicas da meta diária (minutos). Sem julgamento, sem cobrança. */
export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;
export type DailyGoalMinutes = (typeof DAILY_GOAL_OPTIONS)[number];
/**
 * Sem escolha registrada, o app mantém o comportamento anterior (5 min por
 * trilha × 4 trilhas = 20 min) — nenhuma conta existente muda de meta.
 */
export const DEFAULT_DAILY_GOAL_MINUTES: DailyGoalMinutes = 20;

export type GuidedTryAudioResult = "AUDIO_HEARD" | "DEGRADED_AUDIO";
export type OnboardingPath = "beginner" | "experienced";

export interface OnboardingDraft {
  guidedTryCompleted: boolean;
  guidedTryAudio: GuidedTryAudioResult | null;
  guidedTryCompletedAt: number | null;
  dailyGoalMinutes: DailyGoalMinutes | null;
  path: OnboardingPath | null;
}

const EMPTY: OnboardingDraft = {
  guidedTryCompleted: false,
  guidedTryAudio: null,
  guidedTryCompletedAt: null,
  dailyGoalMinutes: null,
  path: null,
};

export function isDailyGoalMinutes(value: unknown): value is DailyGoalMinutes {
  return typeof value === "number" && (DAILY_GOAL_OPTIONS as readonly number[]).includes(value);
}

export function readOnboardingDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      guidedTryCompleted: parsed.guidedTryCompleted === true,
      guidedTryAudio: parsed.guidedTryAudio === "AUDIO_HEARD" || parsed.guidedTryAudio === "DEGRADED_AUDIO" ? parsed.guidedTryAudio : null,
      guidedTryCompletedAt: typeof parsed.guidedTryCompletedAt === "number" ? parsed.guidedTryCompletedAt : null,
      dailyGoalMinutes: isDailyGoalMinutes(parsed.dailyGoalMinutes) ? parsed.dailyGoalMinutes : null,
      path: parsed.path === "beginner" || parsed.path === "experienced" ? parsed.path : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeOnboardingDraft(patch: Partial<OnboardingDraft>): OnboardingDraft {
  const next = { ...readOnboardingDraft(), ...patch };
  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* modo privado: o fluxo segue, só não sobrevive a um recarregamento */
  }
  return next;
}

export function clearOnboardingDraft(): void {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Marca o Teste guiado como concluído no RASCUNHO (nunca no aluno). */
export function markGuidedTryCompleted(audio: GuidedTryAudioResult): OnboardingDraft {
  return writeOnboardingDraft({ guidedTryCompleted: true, guidedTryAudio: audio, guidedTryCompletedAt: Date.now(), path: "beginner" });
}
