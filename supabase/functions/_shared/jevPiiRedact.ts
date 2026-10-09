/**
 * JEV Wave 2 — redact probable secrets/PII before any external Jev call.
 * Original message stays in Longyu DB; Jev gets sanitized copy only.
 */

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g;
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi;
const API_KEY = /\b(?:sk|pk|rk|api)[_-](?:live|test)?[_-]?[A-Za-z0-9]{16,}\b/gi;
const OTP = /\b(?:OTP|código|codigo|code)\s*[:=]?\s*\d{4,8}\b/gi;
const OTP_BARE = /\b\d{6}\b/g; // common 6-digit OTP — only when context suggests
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const QUERY_SECRET = /([?&](?:token|access_token|refresh_token|code|key|api_key|apikey|password|otp)=)([^&\s]+)/gi;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

export interface RedactionResult {
  text: string;
  redacted: boolean;
  kinds: string[];
}

export function redactFeedbackText(input: string, options: { maxLen?: number } = {}): RedactionResult {
  const maxLen = options.maxLen ?? 1200;
  let text = String(input ?? "");
  const kinds: string[] = [];
  const hit = (kind: string, re: RegExp, repl: string) => {
    re.lastIndex = 0;
    if (!re.test(text)) {
      re.lastIndex = 0;
      return;
    }
    re.lastIndex = 0;
    kinds.push(kind);
    text = text.replace(re, repl);
    re.lastIndex = 0;
  };

  hit("email", EMAIL, "[EMAIL]");
  hit("jwt", JWT, "[JWT]");
  hit("bearer", BEARER, "[BEARER]");
  hit("api_key", API_KEY, "[API_KEY]");
  hit("otp", OTP, "[OTP]");
  hit("query_secret", QUERY_SECRET, "$1[REDACTED]");
  hit("uuid", UUID, "[ID]");
  hit("card", CARD, "[CARD]");
  hit("phone", PHONE, "[PHONE]");

  // Bare 6-digit only when OTP/código context already present or message is short auth-ish.
  OTP_BARE.lastIndex = 0;
  if (/\b(otp|código|codigo|verifica|confirm)/i.test(text) && OTP_BARE.test(text)) {
    OTP_BARE.lastIndex = 0;
    kinds.push("otp_digits");
    text = text.replace(OTP_BARE, "[OTP]");
    OTP_BARE.lastIndex = 0;
  }

  if (text.length > maxLen) {
    text = `${text.slice(0, maxLen)}…`;
    kinds.push("truncated");
  }

  return { text, redacted: kinds.length > 0, kinds: [...new Set(kinds)] };
}

/** Fail closed for gate tests: detect unredacted secrets still present. */
export function containsUnredactedSecrets(text: string): string[] {
  const found: string[] = [];
  const checks: [string, RegExp][] = [
    ["email", EMAIL],
    ["jwt", JWT],
    ["bearer", BEARER],
    ["api_key", API_KEY],
    ["card", CARD],
  ];
  for (const [name, re] of checks) {
    if (re.test(text)) found.push(name);
    re.lastIndex = 0;
  }
  return found;
}
