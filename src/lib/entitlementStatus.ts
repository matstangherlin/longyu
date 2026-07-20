import { create } from "zustand";

/**
 * Estado transitório (não persistido) da checagem de assinatura no servidor.
 * Fica fora do store persistido de propósito: um "checando" nunca deve
 * sobreviver a um reload nem ser gravado no localStorage.
 *
 * `checking` só fica true enquanto uma sessão cloud real está sendo consultada
 * (ver EntitlementBootstrap). Sem sessão, permanece false — então a UI grátis
 * aparece normalmente para quem não tem login, sem "Verificando..." fantasma.
 */
interface EntitlementStatusState {
  checking: boolean;
  beginCheck: () => void;
  endCheck: () => void;
}

export const useEntitlementStatus = create<EntitlementStatusState>((set) => ({
  checking: false,
  beginCheck: () => set({ checking: true }),
  endCheck: () => set({ checking: false }),
}));
