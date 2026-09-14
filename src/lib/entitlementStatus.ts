import { create } from "zustand";
import type { ServerEntitlement } from "./accessTier";

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
  /**
   * Última resposta do servidor, inteira: tier, origem, organização, família.
   *
   * Fica aqui, e não no store persistido, pelo mesmo motivo do `checking` — e
   * por um mais forte: entitlement gravado no navegador vira flag editável no
   * devtools. A tela pode mostrar a origem do acesso; ela não pode acreditar
   * nela na volta do reload. Nula até a primeira resposta.
   */
  detail: ServerEntitlement | null;
  beginCheck: () => void;
  endCheck: () => void;
  setDetail: (detail: ServerEntitlement | null) => void;
}

export const useEntitlementStatus = create<EntitlementStatusState>((set) => ({
  checking: false,
  detail: null,
  beginCheck: () => set({ checking: true }),
  endCheck: () => set({ checking: false }),
  setDetail: (detail) => set({ detail }),
}));
