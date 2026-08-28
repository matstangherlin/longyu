import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "../../supabase/functions/_shared/accountDeletion";
import { BACKEND_UNAVAILABLE_MESSAGE } from "../lib/auth/localAuthPolicy";
import { t, type TranslateVars } from "./catalog";
import type { MessageKey } from "../locales/pt-BR";

type MessagePattern = {
  test: (message: string) => boolean;
  key: MessageKey;
  vars?: TranslateVars;
};

function includesAny(message: string, needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

const PATTERNS: MessagePattern[] = [
  {
    test: (m) => m === BACKEND_UNAVAILABLE_MESSAGE || includesAny(m, ["não foi possível conectar ao longyu", "could not reach longyu"]),
    key: "errors.backendUnavailable",
  },
  {
    test: (m) => includesAny(m, ["invalid login credentials", "email ou senha incorretos", "incorrect email or password"]),
    key: "auth.errors.invalidCredentials",
  },
  {
    test: (m) => includesAny(m, ["email not confirmed", "email_not_confirmed", "confirme seu email antes de entrar"]),
    key: "auth.errors.emailNotConfirmed",
  },
  {
    test: (m) => includesAny(m, ["informe um email válido e senha", "enter a valid email and a password"]),
    key: "auth.errors.invalidEmailPassword",
  },
  {
    test: (m) =>
      includesAny(m, ["informe um email válido", "enter a valid email"]) &&
      !includesAny(m, ["senha", "password"]),
    key: "auth.errors.invalidEmail",
  },
  {
    test: (m) => includesAny(m, ["informe o email usado no cadastro", "email you used to sign up"]),
    key: "auth.errors.signupEmail",
  },
  {
    test: (m) => includesAny(m, ["confirme igual nos dois campos", "confirm it matches"]),
    key: "auth.errors.passwordMismatch",
  },
  {
    test: (m) => includesAny(m, ["nova senha precisa ter pelo menos", "new password must have at least"]),
    key: "auth.errors.passwordTooShort",
  },
  {
    test: (m) => includesAny(m, ["muitas tentativas", "too many attempts", "over_request_rate", "rate limit"]),
    key: "auth.errors.tooManyAttempts",
  },
  {
    test: (m) => includesAny(m, ["desafio de segurança", "security check", "captcha"]),
    key: "auth.errors.captchaFailed",
  },
  {
    test: (m) => includesAny(m, ["não foi possível criar a conta", "could not create the account"]),
    key: "auth.errors.createFailed",
  },
  {
    test: (m) => includesAny(m, ["falha ao criar conta", "could not create account"]),
    key: "auth.errors.createFailedShort",
  },
  {
    test: (m) => includesAny(m, ["user already registered", "already been registered", "já possui uma conta"]),
    key: "auth.errors.userAlreadyRegistered",
  },
  {
    test: (m) => includesAny(m, ["for security purposes", "aguarde um pouco antes"]),
    key: "auth.errors.rateLimited",
  },
  {
    test: (m) => includesAny(m, ["sessão não iniciada", "session not started"]),
    key: "auth.errors.sessionMissing",
  },
  {
    test: (m) => includesAny(m, ["sem sessão ativa", "no active session"]),
    key: "auth.errors.noActiveSession",
  },
  {
    test: (m) => includesAny(m, ["sessão encerrada", "signed out"]),
    key: "auth.errors.sessionEnded",
  },
  {
    test: (m) => includesAny(m, ["login realizado com sucesso", "signed in successfully"]),
    key: "auth.errors.loginSuccess",
  },
  {
    test: (m) => includesAny(m, ["senha atualizada com sucesso", "password updated"]),
    key: "auth.errors.passwordUpdated",
  },
  {
    test: (m) => includesAny(m, ["link inválido ou expirado", "link invalid or expired"]),
    key: "auth.errors.invalidResetLink",
  },
  {
    test: (m) => includesAny(m, ["se este email estiver cadastrado", "if this email is registered"]),
    key: "auth.errors.resetEmailSent",
  },
  {
    test: (m) => includesAny(m, ["novo link de confirmação", "new confirmation link"]),
    key: "auth.errors.confirmEmailSent",
  },
  {
    test: (m) => includesAny(m, ["próximas instruções por e-mail", "next steps by email"]),
    key: "auth.errors.pendingInstructions",
  },
  {
    test: (m) => includesAny(m, ["cliente supabase indisponível", "supabase client unavailable"]),
    key: "auth.errors.supabaseUnavailable",
  },
  {
    test: (m) => includesAny(m, ["contas reais ainda não estão ativas", "real accounts are not active"]),
    key: "auth.errors.notImplemented",
  },
  {
    test: (m) => includesAny(m, ["progresso sincroniza automaticamente", "progress syncs automatically"]),
    key: "auth.errors.syncReady",
  },
  {
    test: (m) => includesAny(m, ["email confirmado. vamos finalizar", "email confirmed. let’s finish", "email confirmed. let's finish"]),
    key: "auth.errors.emailConfirmedFinish",
  },
  {
    test: (m) => includesAny(m, ["backend em nuvem não está ativo", "cloud backend is not active"]),
    key: "auth.backendInactive",
  },
  {
    test: (m) => includesAny(m, ["não foi possível abrir o checkout", "could not open checkout"]),
    key: "pro.checkoutFailed",
  },
  {
    test: (m) => includesAny(m, ["não foi possível abrir o portal", "could not open the billing portal"]),
    key: "pro.portalFailed",
  },
  {
    test: (m) => includesAny(m, ["exclusão de conta na nuvem ainda não está ativa", "cloud account deletion is not active"]),
    key: "settings.deletionInactive",
  },
  {
    test: (m) => includesAny(m, ["faça login para solicitar exclusão", "sign in to request cloud account deletion"]),
    key: "settings.deletionNeedLogin",
  },
  {
    test: (m) => includesAny(m, ["confirmação inválida", "invalid confirmation"]),
    key: "settings.deletionInvalid",
    vars: { phrase: ACCOUNT_DELETION_CONFIRMATION_TEXT },
  },
  {
    test: (m) => includesAny(m, ["o servidor não confirmou a exclusão", "did not confirm account deletion"]),
    key: "settings.deletionUnconfirmed",
  },
  {
    test: (m) => includesAny(m, ["não foi possível excluir a conta", "could not delete the account"]),
    key: "settings.deletionFailed",
  },
  {
    test: (m) => includesAny(m, ["conta na nuvem necessária para amigos", "cloud account is required for friends"]),
    key: "settings.socialNeedCloud",
  },
  {
    test: (m) =>
      includesAny(m, ["faça login na nuvem", "sign in to the cloud"]) &&
      !includesAny(m, ["exclusão", "deletion"]),
    key: "settings.socialNeedLogin",
  },
  {
    test: (m) => includesAny(m, ["use 3–24 caracteres", "use 3-24 characters", "3–24 characters"]),
    key: "settings.socialUsernameRules",
  },
  {
    test: (m) => includesAny(m, ["este @apelido já está em uso", "this @username is already taken"]),
    key: "settings.socialUsernameTaken",
  },
];

function matchUserMessage(message: string | null | undefined): MessagePattern | null {
  const raw = String(message ?? "").trim();
  if (!raw) return null;
  for (const pattern of PATTERNS) {
    if (pattern.test(raw)) return pattern;
  }
  return null;
}

export function matchUserMessageKey(message: string | null | undefined): MessageKey | null {
  return matchUserMessage(message)?.key ?? null;
}

/** Map a known PT or EN/Supabase message onto the active catalog. Unknown text is returned as-is. */
export function localizeUserMessage(message: string | null | undefined): string {
  const raw = String(message ?? "").trim();
  if (!raw) return "";
  const match = matchUserMessage(raw);
  if (match) return t(match.key, match.vars);
  return raw;
}
