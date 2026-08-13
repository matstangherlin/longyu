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
  return {
    ...currentState,
    ...persisted,
    serverIsPro: false,
  };
}
