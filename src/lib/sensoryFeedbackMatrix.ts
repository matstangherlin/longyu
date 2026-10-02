/**
 * RC2.2.32 — matriz evento → visual / som / haptic / duração / frequência.
 *
 * Documenta o contrato sensorial. A implementação física vive em
 * `haptics.ts`, `soundFx.ts` e nos call sites das atividades.
 */
import type { HapticEvent } from "./haptics";
import { HAPTIC_MAP } from "./haptics";

export type SensoryChannel = "visual" | "sound" | "haptic";

export interface SensoryFeedbackRow {
  event: string;
  visual: string;
  sound: string | null;
  haptic: HapticEvent | null;
  hapticPattern: string | null;
  durationMs: number;
  /** Quantas vezes por gesto/sessão é permitido (aprox.). */
  maxFrequency: string;
  allowed: boolean;
}

export const SENSORY_FEEDBACK_MATRIX: readonly SensoryFeedbackRow[] = [
  {
    event: "selection",
    visual: "highlight leve da opção/peça",
    sound: "pieceSelect (opcional)",
    haptic: "selection",
    hapticPattern: HAPTIC_MAP.selection,
    durationMs: 40,
    maxFrequency: "1 por gesto",
    allowed: true,
  },
  {
    event: "piecePlaced",
    visual: "snap da peça no slot",
    sound: "pieceSelect",
    haptic: "piecePlaced",
    hapticPattern: HAPTIC_MAP.piecePlaced,
    durationMs: 50,
    maxFrequency: "1 por peça",
    allowed: true,
  },
  {
    event: "pieceRemoved",
    visual: "peça volta à bandeja",
    sound: null,
    haptic: "pieceRemoved",
    hapticPattern: HAPTIC_MAP.pieceRemoved,
    durationMs: 40,
    maxFrequency: "1 por remoção",
    allowed: true,
  },
  {
    event: "answerCorrect",
    visual: "feedback positivo curto (verde / check)",
    sound: "success",
    haptic: "answerCorrect",
    hapticPattern: HAPTIC_MAP.answerCorrect,
    durationMs: 120,
    maxFrequency: "1 por resposta",
    allowed: true,
  },
  {
    event: "answerWrong",
    visual: "feedback claro sem punição exagerada",
    sound: "error",
    haptic: "answerWrong",
    hapticPattern: HAPTIC_MAP.answerWrong,
    durationMs: 120,
    maxFrequency: "1 por resposta",
    allowed: true,
  },
  {
    event: "practiceComplete",
    visual: "animação curta de atividade concluída",
    sound: "success",
    haptic: "practiceComplete",
    hapticPattern: HAPTIC_MAP.practiceComplete,
    durationMs: 200,
    maxFrequency: "1 por atividade",
    allowed: true,
  },
  {
    event: "lessonComplete",
    visual: "cerimônia sequencial existente",
    sound: "qiGain / completion",
    haptic: "lessonComplete",
    hapticPattern: HAPTIC_MAP.lessonComplete,
    durationMs: 400,
    maxFrequency: "1 por lição",
    allowed: true,
  },
  {
    event: "achievementReveal",
    visual: "revelação de medalha/marco",
    sound: "achievement",
    haptic: "achievementReveal",
    hapticPattern: HAPTIC_MAP.achievementReveal,
    durationMs: 300,
    maxFrequency: "1 por conquista",
    allowed: true,
  },
  {
    event: "streakMilestone",
    visual: "marco de ofensiva",
    sound: null,
    haptic: "streakMilestone",
    hapticPattern: HAPTIC_MAP.streakMilestone,
    durationMs: 250,
    maxFrequency: "1 por marco",
    allowed: true,
  },
  {
    event: "chestOpen",
    visual: "baú / recompensa",
    sound: "chest",
    haptic: "chestOpen",
    hapticPattern: HAPTIC_MAP.chestOpen,
    durationMs: 300,
    maxFrequency: "1 por baú",
    allowed: true,
  },
  {
    event: "blocked",
    visual: "shake / estado bloqueado",
    sound: null,
    haptic: "blocked",
    hapticPattern: HAPTIC_MAP.blocked,
    durationMs: 80,
    maxFrequency: "1 por gesto bloqueado",
    allowed: true,
  },
  // Proibidos
  {
    event: "scroll",
    visual: "nenhum",
    sound: null,
    haptic: null,
    hapticPattern: null,
    durationMs: 0,
    maxFrequency: "nunca",
    allowed: false,
  },
  {
    event: "navigation",
    visual: "nenhum",
    sound: null,
    haptic: null,
    hapticPattern: null,
    durationMs: 0,
    maxFrequency: "nunca",
    allowed: false,
  },
  {
    event: "openScreen",
    visual: "nenhum",
    sound: null,
    haptic: null,
    hapticPattern: null,
    durationMs: 0,
    maxFrequency: "nunca",
    allowed: false,
  },
  {
    event: "playAudio",
    visual: "estado playing no botão",
    sound: null,
    haptic: null,
    hapticPattern: null,
    durationMs: 0,
    maxFrequency: "nunca (háptico)",
    allowed: false,
  },
] as const;

export function sensoryAllowedEvents(): readonly SensoryFeedbackRow[] {
  return SENSORY_FEEDBACK_MATRIX.filter((row) => row.allowed);
}

export function sensoryForbiddenEvents(): readonly SensoryFeedbackRow[] {
  return SENSORY_FEEDBACK_MATRIX.filter((row) => !row.allowed);
}
