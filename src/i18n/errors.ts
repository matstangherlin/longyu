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

// RC2.3.13R.3.2.5 — economy and sync notices are written in PT by the store
// and the sync services; the global banner shows them through the catalog,
// so an EN learner no longer reads Portuguese. Exact phrases, matched first.
const ECONOMY_SYNC_PHRASES: Array<[string, MessageKey]> = [
  ["salvo neste aparelho — confirmamos quando a conexão voltar", "errors.economyPendingOffline"],
  ["qi não confirmado pelo servidor", "errors.economyQiNotConfirmed"],
  ["recompensa não confirmada pelo servidor", "errors.economyRewardNotConfirmed"],
  ["esta recompensa é liberada quando o servidor confirmar a lição", "errors.economyRewardNeedsLesson"],
  ["missão ainda sem evidência no servidor", "errors.economyMissionNotConfirmed"],
  ["carga não confirmada pelo servidor", "errors.economyChargeNotConfirmed"],
  ["falha ao sincronizar carga", "errors.economyChargeSyncFailed"],
  ["energia da história não confirmada pelo servidor", "errors.economyStoryNotConfirmed"],
  ["ativação pendente — conecte-se para confirmar no servidor", "errors.economyActivationPending"],
  ["ativação pendente — aguardando o servidor", "errors.economyActivationWaiting"],
  ["falha ao ativar pro", "errors.economyProActivationFailed"],
  ["a sincronização demorou demais", "errors.syncTimeout"],
  ["seu progresso está salvo neste dispositivo. tentaremos sincronizar novamente", "errors.syncPersistent"],
];

const PATTERNS: MessagePattern[] = [
  ...ECONOMY_SYNC_PHRASES.map(([phrase, key]): MessagePattern => ({ test: (m) => includesAny(m, [phrase]), key })),
  {
    test: (m) =>
      m === BACKEND_UNAVAILABLE_MESSAGE ||
      includesAny(m, [
        "não foi possível conectar ao longyu",
        "could not reach longyu",
        "failed to fetch",
        // RC2.3.13R.3.2.5 — the other engines' words for the same failure.
        "load failed",
        "networkerror",
        "network request failed",
        "fetch failed",
        "network error",
        "ainda não estão ativas",
        "real accounts are not active",
      ]),
    key: "errors.backendUnavailable",
  },
  {
    test: (m) => includesAny(m, ["sua sessão expirou", "your session expired"]),
    key: "auth.errors.sessionExpired",
  },
  {
    test: (m) => includesAny(m, ["o servidor demorou para responder", "the server took too long to respond"]),
    key: "auth.errors.signInTimeout",
  },
  {
    test: (m) =>
      includesAny(m, [
        "invalid login credentials",
        "email ou senha incorretos",
        "incorrect email or password",
        "usuário/email ou senha incorretos",
        "incorrect username/email or password",
      ]),
    key: "auth.errors.invalidCredentials",
  },
  {
    test: (m) => includesAny(m, ["assinar pelo app android ainda não", "subscribing from the android app"]),
    key: "auth.errors.androidCheckoutUnavailable",
  },
  {
    test: (m) => includesAny(m, ["informe seu email ou nome de usuário", "enter your email or username"]),
    key: "auth.errors.invalidIdentifierPassword",
  },
  {
    test: (m) => includesAny(m, ["entrar com nome de usuário ainda não", "signing in with a username isn't"]),
    key: "auth.errors.usernameLoginUnavailable",
  },
  {
    test: (m) => includesAny(m, ["aguarde alguns minutos e tente de novo", "wait a few minutes and try again"]),
    key: "auth.errors.loginRateLimited",
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
    test: (m) =>
      includesAny(m, [
        "nova senha precisa ter pelo menos",
        "new password must have at least",
        "password should be at least",
      ]),
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
    test: (m) => includesAny(m, ["código inválido ou expirado", "invalid or expired code"]),
    key: "auth.errors.recoveryCodeInvalid",
  },
  {
    test: (m) => includesAny(m, ["código confirmado", "code confirmed"]),
    key: "auth.errors.recoveryCodeOk",
  },
  {
    test: (m) => includesAny(m, ["sem conexão. verifique a internet", "no connection. check the internet"]),
    key: "auth.errors.offline",
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
  {
    test: (m) => includesAny(m, ["envio de feedback temporariamente desativado", "feedback is temporarily disabled"]),
    key: "feedback.disabled",
  },
  {
    test: (m) => includesAny(m, ["aguarde alguns segundos antes de enviar outro feedback", "wait a few seconds before sending more feedback"]),
    key: "feedback.cooldown",
  },
  {
    test: (m) => includesAny(m, ["descreva o problema com pelo menos algumas palavras", "describe the problem in at least a few words"]),
    key: "feedback.tooShort",
  },
  {
    test: (m) => includesAny(m, ["remova senhas, tokens ou dados sensíveis", "remove passwords, tokens, or sensitive data"]),
    key: "feedback.stripSecrets",
  },
  {
    test: (m) => includesAny(m, ["muitos envios seguidos", "too many submissions"]),
    key: "feedback.rateLimited",
  },
  {
    test: (m) => includesAny(m, ["remova dados sensíveis da mensagem", "remove sensitive data from the message"]),
    key: "feedback.stripSensitive",
  },
  {
    test: (m) => includesAny(m, ["não encontramos o teste de nivelamento", "couldn't find placement on this account", "could not find placement"]),
    key: "onboarding.pendingMissingDraft",
  },
  {
    test: (m) => includesAny(m, ["não foi possível finalizar agora", "couldn't finish this now", "could not finish this now"]),
    key: "onboarding.pendingTempError",
  },
  {
    test: (m) => includesAny(m, ["use um email válido e uma senha", "use a valid email and a password with at least"]),
    key: "onboarding.invalidEmailPassword",
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

/**
 * RC2.3.13R.3.2.5 — text that is a machine's, not a sentence for a learner:
 * error class names, PostgREST / JWT / SQL wording, HTTP status lines and
 * snake_case reason codes. Such text never reaches the screen verbatim.
 * (The class-name branch is `[a-z]{2,}error` under /i — the same language as
 * `(?:[A-Z][a-z]+)+Error`, without the nested quantifier that backtracks.)
 */
const TECHNICAL_TEXT =
  /\b[a-z]{2,}error\b|\bPGRST\d+|\bjwt\b|permission denied|violates|duplicate key|relation "|database error|\bstatus(?: code)? \d{3}\b|\bHTTP \d{3}\b|unexpected_failure|\brpc\b|^[a-z]+(?:_[a-z]+)+$|\bat [\w.]+ \(|stack|undefined|null|NaN/i;

export function isTechnicalMessage(message: string): boolean {
  return TECHNICAL_TEXT.test(message);
}

/**
 * Map a known PT or EN/Supabase message onto the active catalog. Known copy is
 * translated; app copy we wrote passes through; technical text fails closed to
 * `errors.unknown` (the raw text belongs in diagnostics, not on screen).
 */
export function localizeUserMessage(message: string | null | undefined): string {
  const raw = String(message ?? "").trim();
  if (!raw) return "";
  const match = matchUserMessage(raw);
  if (match) return t(match.key, match.vars);
  if (isTechnicalMessage(raw)) return t("errors.unknown");
  return raw;
}
