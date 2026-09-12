function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function asRecord(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  return isPlainObject(value) ? value : fallback;
}

/**
 * Persist/cloud snapshots can overwrite defaults with `null`. The Jornada and
 * AchievementsWatcher then throw on `.length` / `.claimed` and React Router
 * replaces the whole shell.
 */
export function sanitizeHydratedLearnerFields<T extends Record<string, unknown>>(
  state: T,
  fallback: T
): T {
  const dailyMissions = asRecord(state.dailyMissions, asRecord(fallback.dailyMissions));
  return {
    ...state,
    srs: asRecord(state.srs, asRecord(fallback.srs)),
    learnedChunks: asArray(state.learnedChunks, asArray(fallback.learnedChunks, [])),
    learnedChars: asArray(state.learnedChars, asArray(fallback.learnedChars, [])),
    completedLessons: asArray(state.completedLessons, asArray(fallback.completedLessons, [])),
    today: isPlainObject(state.today) ? state.today : fallback.today,
    dailyMissions: {
      ...dailyMissions,
      claimed: asRecord(dailyMissions.claimed),
    },
    lessonStarsById: asRecord(state.lessonStarsById, asRecord(fallback.lessonStarsById)),
    lessonMasteryById: asRecord(state.lessonMasteryById, asRecord(fallback.lessonMasteryById)),
    lessonTaskProgress: asRecord(state.lessonTaskProgress, asRecord(fallback.lessonTaskProgress)),
    toneTrainer: isPlainObject(state.toneTrainer) ? state.toneTrainer : fallback.toneTrainer,
  };
}

/**
 * Faz a hidratação falhar fechada mesmo quando alguém altera manualmente o
 * payload e mantém a versão atual do persist. O servidor precisa reconfirmar
 * o entitlement cloud após cada carregamento.
 */
export function mergeWithoutPersistedServerEntitlement<T extends object>(
  persistedState: unknown,
  currentState: T
): T & { serverIsPro: false } {
  const persisted =
    persistedState && typeof persistedState === "object"
      ? (persistedState as Partial<T>)
      : {};
  const merged = {
    ...currentState,
    ...persisted,
    serverIsPro: false as const,
  };
  return sanitizeHydratedLearnerFields(
    merged as T & Record<string, unknown> & { serverIsPro: false },
    currentState as T & Record<string, unknown>
  ) as T & { serverIsPro: false };
}
