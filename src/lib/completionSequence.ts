/**
 * RC2.2.27 — COMPLETION MOMENT (só apresentação; não é reward engine).
 *
 * A cerimônia EXIBE deltas que já existem (XP da lição, Qi a resgatar,
 * ofensiva, progresso do tópico, medalha nova, função desbloqueada). Nunca
 * concede nada: quem concede continua sendo o fluxo de recompensa existente.
 *
 *   ✓ Lição concluída → +XP → (Qi OU ofensiva) → progresso → desbloqueio →
 *   medalha → resumo de uma linha · [Continuar]
 *
 * Regras: revelação sequencial e mínima (uma coisa por vez; recompensa sem
 * mudança não aparece); ≤ 2,5 s até tudo revelado; toque avança; Continuar
 * nunca fica sequestrado; som/vibração respeitam soundEffects/hapticsEnabled;
 * reduced motion = estado instantâneo; reabrir não repete som/vibração nem
 * "reconta" a recompensa (chave completion:<lessonId>:<completionId>).
 *
 * Puro (sem React, sem store): o gate executa este arquivo.
 */
export const COMPLETION_STAGES = ["CHECK", "XP", "QI", "STREAK", "PROGRESS", "UNLOCK", "MEDAL", "SUMMARY"] as const;
export type CompletionStage = (typeof COMPLETION_STAGES)[number];
export type CompletionKind = "LESSON" | "UNIT" | "PHASE";

/** Teto até a revelação completa (Continuar já está livre desde o início). */
export const COMPLETION_REVEAL_MAX_MS = 2500;

export interface CompletionInput {
  kind: CompletionKind;
  xpDelta: number;
  /** Qi que esta conclusão rendeu (0 = não mudou → não aparece). */
  qiDelta: number;
  /** A ofensiva avançou hoje com esta conclusão? */
  streakAdvanced: boolean;
  progress?: { before: number; after: number; total: number } | null;
  unlockLabel?: string | null;
  medalLabel?: string | null;
  summaryLine?: string | null;
}

/**
 * Etapas na ordem da cerimônia, só com o que MUDOU. Qi e ofensiva nunca juntos:
 * Qi se mudou; senão a ofensiva se avançou.
 */
export function buildCompletionStages(input: CompletionInput): CompletionStage[] {
  const stages: CompletionStage[] = ["CHECK"];
  if (input.xpDelta > 0) stages.push("XP");
  if (input.qiDelta > 0) stages.push("QI");
  else if (input.streakAdvanced) stages.push("STREAK");
  if (input.progress && input.progress.after > input.progress.before && input.progress.total > 0) stages.push("PROGRESS");
  if (input.unlockLabel) stages.push("UNLOCK");
  if (input.medalLabel) stages.push("MEDAL");
  if (input.summaryLine) stages.push("SUMMARY");
  return stages;
}

/** Instante (ms) em que cada etapa aparece. Reduced motion: tudo em 0 (sem animação). */
export function completionSchedule(stages: readonly CompletionStage[], reducedMotion: boolean): number[] {
  if (reducedMotion || stages.length <= 1) return stages.map(() => 0);
  const step = Math.min(500, Math.floor(COMPLETION_REVEAL_MAX_MS / Math.max(1, stages.length - 1)));
  return stages.map((_, index) => index * step);
}

/** Etapa que cada toque leva (avança uma; nunca volta). */
export function nextCompletionStage(current: number, total: number): number {
  return Math.min(total - 1, current + 1);
}

/** Etapas que interrompem o fluxo por um instante e depois saem (nunca todas juntas com as recompensas). */
export function isInterstitialStage(stage: CompletionStage): boolean {
  return stage === "UNLOCK" || stage === "MEDAL";
}

export interface CompletionFeedback {
  sound: "lessonComplete" | "moduleComplete" | "phase" | "medal" | null;
  haptic: "lessonComplete" | "achievementReveal" | null;
}

/**
 * Som/vibração por etapa (sons e vibrações EXISTENTES do Longyu). Só a
 * abertura e os marcos raros têm feedback; números contados não vibram.
 */
export function completionFeedback(stage: CompletionStage, kind: CompletionKind, prefs: { soundEffects: boolean; hapticsEnabled: boolean }, firstShow: boolean): CompletionFeedback {
  if (!firstShow) return { sound: null, haptic: null };
  let sound: CompletionFeedback["sound"] = null;
  let haptic: CompletionFeedback["haptic"] = null;
  if (stage === "CHECK") {
    sound = kind === "PHASE" ? "phase" : kind === "UNIT" ? "moduleComplete" : "lessonComplete";
    haptic = "lessonComplete";
  } else if (stage === "MEDAL") {
    sound = "medal";
    haptic = "achievementReveal";
  } else if (stage === "UNLOCK") {
    haptic = "achievementReveal";
  }
  return { sound: prefs.soundEffects ? sound : null, haptic: prefs.hapticsEnabled ? haptic : null };
}

/** Celebração maior só em unidade, fase ou medalha (lição comum é discreta). */
export function completionIntensity(kind: CompletionKind, stages: readonly CompletionStage[]): "MINIMAL" | "MAJOR" {
  return kind !== "LESSON" || stages.includes("MEDAL") ? "MAJOR" : "MINIMAL";
}

export function completionKey(lessonId: string, completionId: string): string {
  return `completion:${lessonId}:${completionId}`;
}

const SHOWN_KEY = "longyu:completion-shown";
const SHOWN_LIMIT = 80;

/**
 * Marca a cerimônia como exibida. Devolve `true` só na PRIMEIRA vez: voltar
 * ou reabrir a tela não repete som, vibração, contagem nem animação.
 */
export function claimCompletionShow(key: string, storage: Pick<Storage, "getItem" | "setItem"> | null): boolean {
  if (!storage) return true;
  try {
    const list = JSON.parse(storage.getItem(SHOWN_KEY) ?? "[]") as string[];
    if (list.includes(key)) return false;
    const next = [...list, key].slice(-SHOWN_LIMIT);
    storage.setItem(SHOWN_KEY, JSON.stringify(next));
    return true;
  } catch {
    return true;
  }
}
