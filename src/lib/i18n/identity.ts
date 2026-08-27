/**
 * Identidade de idioma do lancamento atual.
 *
 * Conceitos separados (nao derivar um do outro):
 * - country / country_code: pais do usuario (ISO 3166-1 alpha-2, lancamento BR)
 * - interface_locale: idioma da interface (lancamento pt-BR)
 * - instruction_locale: lingua usada para ensinar (lancamento pt-BR)
 * - native_language: lingua principal do aluno (lancamento pt-BR)
 * - target_language: idioma estudado (lancamento zh-CN)
 *
 * Futuro (nao nesta PR): a mesma conta pode ter instruction_locale en
 * para o par en → zh-CN, sem duplicar banco nem a Journey. Dados canonicos
 * chineses (hanzi, pinyin, audio, estrutura) continuam independentes do locale.
 */

export const LAUNCH_INTERFACE_LOCALE = "pt-BR";
export const LAUNCH_INSTRUCTION_LOCALE = "pt-BR";
export const LAUNCH_NATIVE_LANGUAGE = "pt-BR";
export const LAUNCH_TARGET_LANGUAGE = "zh-CN";
export const LAUNCH_COUNTRY_CODE = "BR";

/** Rotulo de UI no lancamento BR. Nao e o valor persistido. */
export const LAUNCH_COUNTRY_LABEL = "Brasil";

const COUNTRY_LABEL_TO_CODE: Record<string, string> = {
  Brasil: "BR",
  Brazil: "BR",
  Portugal: "PT",
  China: "CN",
  "Estados Unidos": "US",
  USA: "US",
  "United States": "US",
};

export function canonicalCountryCode(input: string | null | undefined): string {
  const raw = String(input ?? "").trim();
  if (!raw) return LAUNCH_COUNTRY_CODE;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return COUNTRY_LABEL_TO_CODE[raw] ?? LAUNCH_COUNTRY_CODE;
}

export function countryLabelForCode(code: string | null | undefined): string {
  const normalized = canonicalCountryCode(code);
  if (normalized === "BR") return "Brasil";
  if (normalized === "PT") return "Portugal";
  if (normalized === "CN") return "China";
  if (normalized === "US") return "Estados Unidos";
  return normalized;
}

export function launchLocaleFields() {
  return {
    interface_locale: LAUNCH_INTERFACE_LOCALE,
    instruction_locale: LAUNCH_INSTRUCTION_LOCALE,
    native_language: LAUNCH_NATIVE_LANGUAGE,
    target_language: LAUNCH_TARGET_LANGUAGE,
    country_code: LAUNCH_COUNTRY_CODE,
  };
}
