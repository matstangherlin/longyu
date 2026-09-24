/**
 * RC2.2.11 · AP–BC — contrato de nome de usuário.
 *
 * Uma única fonte das regras usada pelo cadastro, pelo login por identificador
 * e pelo Perfil. A Edge Function `sign-in-identifier` e a migration pendente
 * espelham exatamente estas regras (o validador `username-contract` compara).
 *
 * Regras:
 * - 3–20 caracteres, só `a-z 0-9 _ .`, salvo sempre em minúsculas;
 * - não começa/termina com `.` e não tem `..` (não parece domínio nem email);
 * - Unicode FALHA FECHADO: qualquer caractere fora de ASCII é inválido — nada
 *   é "limpo" em silêncio (evita `аdmin` com "а" cirílico virar `admin`);
 * - nomes reservados vêm de um registro canônico, comparado sem caixa;
 * - unicidade é sem caixa (índice `lower(username)` em `public.profiles`).
 *
 * O cliente valida só a ESTRUTURA. Disponibilidade é do servidor; aqui não há
 * "✓ disponível" falso.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
/** Mesma expressão da constraint pendente `profiles_username_format_v2`. */
export const USERNAME_PATTERN = /^[a-z0-9_](?:[a-z0-9_]|\.(?!\.)){1,18}[a-z0-9_]$/;
export const USERNAME_SQL_PATTERN = "^[a-z0-9_]([a-z0-9_]|[.](?![.])){1,18}[a-z0-9_]$";

/**
 * Registro canônico de nomes reservados: papéis, marca, rotas do app e termos
 * que confundiriam a identidade de alguém ("você", "admin", "suporte").
 */
export const RESERVED_USERNAMES: readonly string[] = [
  // papéis e sistema
  "admin", "administrator", "administrador", "root", "system", "sistema", "staff", "moderator", "moderador",
  "mod", "support", "suporte", "help", "ajuda", "official", "oficial", "security", "seguranca", "owner",
  "null", "undefined", "anonymous", "anonimo", "guest", "convidado", "user", "usuario", "voce", "you", "me",
  // marca e mascote
  "longyu", "longyu_app", "longyuapp", "dragon", "dragao", "laoshi", "teacher", "professor",
  // rotas e infraestrutura
  "api", "www", "mail", "email", "login", "logout", "signup", "signin", "cadastro", "entrar", "sair", "conta",
  "account", "perfil", "profile", "settings", "ajustes", "jornada", "journey", "cultura", "culture", "revisao",
  "review", "imersao", "immersion", "ligas", "league", "loja", "shop", "pro", "amigos", "friends", "conquistas",
  "achievements", "atlas", "comecar", "privacy", "privacidade", "terms", "termos", "status", "billing",
];

const RESERVED_SET = new Set(RESERVED_USERNAMES.map((name) => name.toLowerCase()));

export type UsernameRejection =
  | "empty"
  | "too_short"
  | "too_long"
  | "non_ascii"
  | "invalid_chars"
  | "dot_edges"
  | "double_dot"
  | "reserved";

export type UsernameCheck = { ok: true; username: string } | { ok: false; reason: UsernameRejection };

/** Só ASCII imprimível; qualquer outra coisa falha fechado. */
function isPlainAscii(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x21 || code > 0x7e) return false;
  }
  return true;
}

/** Normaliza para a forma salva (trim + @ opcional + minúsculas ASCII). */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

export function isReservedUsername(raw: string): boolean {
  return RESERVED_SET.has(normalizeUsername(raw));
}

/** Validação estrutural local (nunca afirma disponibilidade). */
export function checkUsername(raw: string): UsernameCheck {
  const username = normalizeUsername(raw);
  if (!username) return { ok: false, reason: "empty" };
  if (!isPlainAscii(username)) return { ok: false, reason: "non_ascii" };
  if (username.length < USERNAME_MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (username.length > USERNAME_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (!/^[a-z0-9_.]+$/.test(username)) return { ok: false, reason: "invalid_chars" };
  if (username.startsWith(".") || username.endsWith(".")) return { ok: false, reason: "dot_edges" };
  if (username.includes("..")) return { ok: false, reason: "double_dot" };
  if (!USERNAME_PATTERN.test(username)) return { ok: false, reason: "invalid_chars" };
  if (RESERVED_SET.has(username)) return { ok: false, reason: "reserved" };
  return { ok: true, username };
}

export function isValidUsername(raw: string): boolean {
  return checkUsername(raw).ok;
}

/** Chave i18n da mensagem de cada rejeição (hub de copy em `auth.*`). */
export const USERNAME_REJECTION_KEY: Record<UsernameRejection, string> = {
  empty: "auth.usernameEmpty",
  too_short: "auth.usernameTooShort",
  too_long: "auth.usernameTooLong",
  non_ascii: "auth.usernameInvalidChars",
  invalid_chars: "auth.usernameInvalidChars",
  dot_edges: "auth.usernameDots",
  double_dot: "auth.usernameDots",
  reserved: "auth.usernameReserved",
};

/** `@nome` para exibição; nunca devolve email. */
export function formatUsernameHandle(username: string | null | undefined): string | null {
  if (!username) return null;
  const check = checkUsername(username);
  return check.ok ? `@${check.username}` : null;
}

// ── Login por identificador ────────────────────────────────────────────────

export type LoginIdentifier =
  | { kind: "email"; value: string }
  | { kind: "username"; value: string }
  | { kind: "invalid" };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Um único campo "Email ou nome de usuário". Com `@` no meio é email; sem `@`
 * (ou só com `@` na frente, estilo handle) é nome de usuário.
 */
export function classifyLoginIdentifier(raw: string): LoginIdentifier {
  const value = raw.trim();
  if (!value) return { kind: "invalid" };
  const at = value.indexOf("@");
  if (at > 0) return EMAIL_SHAPE.test(value) ? { kind: "email", value } : { kind: "invalid" };
  const check = checkUsername(value);
  // Nome reservado continua "username" para o servidor responder genérico —
  // o cliente não revela se `admin` existe ou é só reservado.
  if (check.ok) return { kind: "username", value: check.username };
  if (check.reason === "reserved") return { kind: "username", value: normalizeUsername(value) };
  return { kind: "invalid" };
}

/** Anti-enumeração: a MESMA frase para usuário inexistente, email inexistente e senha errada. */
export const GENERIC_LOGIN_ERROR = "Usuário/email ou senha incorretos.";
export const GENERIC_LOGIN_ERROR_EN = "Incorrect username/email or password.";
export const LOGIN_RATE_LIMITED = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

/**
 * Contrato de rate limit do login por identificador (espelhado pela migration
 * pendente `check_and_record_login_rate`). Janela deslizante, por hash.
 */
export const LOGIN_RATE_LIMIT = {
  ipPer15Min: 20,
  identifierPer15Min: 8,
  comboPer15Min: 5,
} as const;

/**
 * Estado do login por nome de usuário na nuvem. A migration e a Edge Function
 * existem no repositório mas não foram aplicadas/deployadas: até o owner
 * aplicar, o cliente não chama a função e orienta a entrar com email.
 */
export const USERNAME_LOGIN_CLOUD_STATUS = "CLOUD_APPLIED_FLAG_OFF" as const;

export function usernameLoginCloudEnabled(env: Record<string, unknown> = import.meta.env ?? {}): boolean {
  return env.VITE_USERNAME_LOGIN_ENABLED === "true";
}

// ── Nome escolhido no cadastro, antes de existir conta ─────────────────────
// O cadastro não grava aluno anônimo no store (RC2.2.8 · J6). O nome fica
// pendente neste aparelho e vira `account.username` no primeiro login.

const PENDING_USERNAME_KEY = "longyu:pending-username:v1";

export function storePendingUsername(raw: string): void {
  const check = checkUsername(raw);
  if (!check.ok) return;
  try {
    localStorage.setItem(PENDING_USERNAME_KEY, check.username);
  } catch {
    // sem storage: o aluno escolhe de novo no Perfil depois
  }
}

/** Lê e apaga o nome pendente (só formato válido volta). */
export function takePendingUsername(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_USERNAME_KEY);
    localStorage.removeItem(PENDING_USERNAME_KEY);
    if (!raw) return null;
    const check = checkUsername(raw);
    return check.ok ? check.username : null;
  } catch {
    return null;
  }
}
