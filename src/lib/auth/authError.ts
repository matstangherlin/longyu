/**
 * RC2.3.8 — structured auth error (ready for future observability).
 * Safe by construction: category, provider, stage and a short code — never a
 * token, authorization code, e-mail or provider message.
 */
import type { AuthProviderId } from "./providers";

export type AuthErrorCategory = "CANCELLED" | "PROVIDER" | "NETWORK" | "CONFIG" | "SESSION" | "CONFLICT" | "TIMEOUT" | "UNKNOWN";
/** Internal stages (learner never sees these names). */
export type AuthStage = "starting_provider" | "browser_opened" | "callback_received" | "session_exchanging" | "account_loading" | "linking" | "done";

export interface AuthError {
  category: AuthErrorCategory;
  provider: AuthProviderId;
  stage: AuthStage;
  safeCode: string;
}

export function makeAuthError(category: AuthErrorCategory, provider: AuthProviderId, stage: AuthStage, safeCode: string): AuthError {
  return { category, provider, stage, safeCode: safeCode.replace(/[^A-Za-z0-9_:-]/g, "").slice(0, 48) || "unknown" };
}

const PROVIDER_NAME: Record<AuthProviderId, string> = { email: "e-mail", google: "Google", apple: "Apple", microsoft: "Microsoft" };

/** Learner copy: no OAuthException, PKCE, HTTP codes or vendor names of infrastructure. */
export function authErrorCopyPt(error: AuthError): { title: string; body: string; actions: ("retry" | "other_method")[] } {
  const name = PROVIDER_NAME[error.provider];
  switch (error.category) {
    case "CANCELLED":
      return { title: "Acesso cancelado.", body: "Você pode tentar de novo quando quiser.", actions: ["retry", "other_method"] };
    case "CONFLICT":
      return { title: "Este método já está ligado a outra conta.", body: "Entre com a conta que já usa este método, ou escolha outro.", actions: ["other_method"] };
    case "NETWORK":
      return { title: "Sem conexão agora.", body: "Verifique a internet e tente novamente.", actions: ["retry", "other_method"] };
    case "TIMEOUT":
      return { title: "Isso demorou mais que o normal.", body: "Tente novamente ou use outro método.", actions: ["retry", "other_method"] };
    default:
      return { title: error.provider === "email" ? "Não foi possível concluir o acesso." : `Não foi possível entrar com ${name} agora.`, body: "Tente novamente ou use outro método.", actions: ["retry", "other_method"] };
  }
}
