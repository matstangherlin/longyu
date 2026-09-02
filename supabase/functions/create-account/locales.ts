export type SignupInterfaceLocale = "pt-BR" | "en";
export type SignupInstructionLocale = "pt-BR" | "en";
export type SignupNativeLanguage = "pt-BR" | "en";
export type SignupTargetLanguage = "zh-CN";

export interface SignupLocaleInput {
  interfaceLocale?: unknown;
  instructionLocale?: unknown;
  nativeLanguage?: unknown;
  targetLanguage?: unknown;
}

export type SignupLocaleResult =
  | {
      ok: true;
      value: {
        interface_locale: SignupInterfaceLocale;
        instruction_locale: SignupInstructionLocale;
        native_language: SignupNativeLanguage;
        target_language: SignupTargetLanguage;
      };
    }
  | { ok: false; code: "invalid_locale_contract" };

function optionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return "__invalid_type__";
  const normalized = value.trim();
  return normalized || "__invalid_empty__";
}

/**
 * Resolve the V4.8.8 signup locale contract without deriving language from
 * country, billing market, browser locale or timezone. Invalid supplied
 * values fail closed; omitted fields keep the legacy pt-BR -> zh-CN default.
 */
export function resolveSignupLocales(input: SignupLocaleInput): SignupLocaleResult {
  const interfaceLocale = optionalString(input.interfaceLocale);
  const instructionLocale = optionalString(input.instructionLocale);
  const nativeLanguage = optionalString(input.nativeLanguage);
  const targetLanguage = optionalString(input.targetLanguage);
  const sourceAllowed = (value: string | null) => value == null || value === "pt-BR" || value === "en";

  if (
    !sourceAllowed(interfaceLocale) ||
    !sourceAllowed(instructionLocale) ||
    !sourceAllowed(nativeLanguage) ||
    (targetLanguage != null && targetLanguage !== "zh-CN")
  ) {
    return { ok: false, code: "invalid_locale_contract" };
  }

  const resolvedInstruction = (instructionLocale ?? "pt-BR") as SignupInstructionLocale;
  return {
    ok: true,
    value: {
      interface_locale: (interfaceLocale ?? "pt-BR") as SignupInterfaceLocale,
      instruction_locale: resolvedInstruction,
      native_language: (nativeLanguage ?? resolvedInstruction) as SignupNativeLanguage,
      target_language: "zh-CN",
    },
  };
}
