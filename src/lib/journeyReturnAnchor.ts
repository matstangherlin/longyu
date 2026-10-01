/**
 * RC2.2.24 — JourneyReturnAnchor: voltar à Jornada no PONTO PEDAGÓGICO.
 *
 * Problema: terminar Cultura / Tons / Revisão / Pinyin / Hànzì / Imersão /
 * Desafio e voltar à Jornada caía no topo (scrollY = 0) ou longe da unidade.
 * Não guardamos pixel de scroll: guardamos a âncora semântica (fase, unidade,
 * lição, nó, origem, motivo). Ao voltar: localizar a âncora → recalcular o
 * estado → centralizar. Se a atividade liberou nó novo, o destino é o nó
 * atual (não o topo, não o antigo).
 *
 * sessionStorage: é estado de navegação da aba, não progresso (nunca PII).
 */
export const JOURNEY_RETURN_SOURCES = ["CULTURE", "TONE_TRAINER", "REVIEW", "PINYIN", "HANZI", "IMMERSION", "PHASE_CHALLENGE", "LESSON", "TAB_SWITCH", "OTHER"] as const;
export type JourneyReturnSource = (typeof JOURNEY_RETURN_SOURCES)[number];

export type JourneyReturnReason = "REQUIRED_ACTIVITY" | "OPTIONAL_ACTIVITY" | "TAB_SWITCH";

export interface JourneyReturnAnchor {
  phaseId: string | null;
  unitId: string | null;
  lessonId: string;
  /** Nó da Jornada (journeyNode / momento de cultura), quando houver. */
  nodeId: string | null;
  activitySource: JourneyReturnSource;
  returnReason: JourneyReturnReason;
  /** Lições concluídas ao sair: se cresceu, a atividade liberou progresso. */
  completedAtLeave: number;
  createdAt: number;
}

const KEY = "longyu:journey-return-anchor";
/** A âncora velha (outra sessão de estudo) não sequestra a Jornada. */
export const JOURNEY_RETURN_TTL_MS = 6 * 60 * 60 * 1000;
/** RC2.2.25 — pulso discreto no nó de volta: entre 1 e 1,5 s, nunca piscando. */
export const JOURNEY_RETURN_PULSE_MS = 1300;

/** Origem pela rota de destino (o link que tirou o aluno da Jornada). */
export function journeyReturnSourceForPath(pathname: string): JourneyReturnSource {
  if (/^\/cultura/.test(pathname)) return "CULTURE";
  if (/^\/(som|tons)/.test(pathname)) return "TONE_TRAINER";
  if (/^\/revisao/.test(pathname)) return "REVIEW";
  if (/^\/pinyin/.test(pathname)) return "PINYIN";
  if (/^\/hanzi/.test(pathname)) return "HANZI";
  if (/^\/imersao/.test(pathname)) return "IMMERSION";
  if (/^\/(desafio|jornada\/desafio)/.test(pathname)) return "PHASE_CHALLENGE";
  if (/^\/licao\//.test(pathname)) return "LESSON";
  return "OTHER";
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function setJourneyReturnAnchor(anchor: JourneyReturnAnchor): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(anchor));
  } catch {
    /* modo privado: volta ao nó atual */
  }
}

export function peekJourneyReturnAnchor(now: number = Date.now()): JourneyReturnAnchor | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const anchor = JSON.parse(raw) as JourneyReturnAnchor;
    if (!anchor?.lessonId || now - (anchor.createdAt ?? 0) > JOURNEY_RETURN_TTL_MS) return null;
    return anchor;
  } catch {
    return null;
  }
}

export function consumeJourneyReturnAnchor(): JourneyReturnAnchor | null {
  const anchor = peekJourneyReturnAnchor();
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return anchor;
}

export interface JourneyReturnTarget {
  lessonId: string;
  why: "ANCHOR" | "NEW_PROGRESS_CURRENT_NODE" | "CURRENT_NODE";
}

/**
 * Para onde centralizar. NUNCA "topo": sem âncora válida, o nó atual.
 * Progresso novo desde a saída → o nó atual (o que acabou de abrir).
 */
export function resolveJourneyReturnTarget(anchor: JourneyReturnAnchor | null, state: { completedNow: number; currentLessonId: string | null; lessonExists: (id: string) => boolean }): JourneyReturnTarget | null {
  if (anchor && state.completedNow > anchor.completedAtLeave && state.currentLessonId) return { lessonId: state.currentLessonId, why: "NEW_PROGRESS_CURRENT_NODE" };
  if (anchor && state.lessonExists(anchor.lessonId)) return { lessonId: anchor.lessonId, why: "ANCHOR" };
  if (state.currentLessonId) return { lessonId: state.currentLessonId, why: "CURRENT_NODE" };
  return null;
}

/** Marcadores que o JourneyPage usa ao redor de cada lição (o nó e o que vem junto dele). */
export const JOURNEY_ANCHOR_ATTRS = [
  "data-lesson-id",
  "data-journey-inline-after",
  "data-journey-culture-gate-before",
  "data-journey-culture-moments-after",
  "data-journey-culture-recall-after",
  "data-journey-instruction-before",
] as const;
