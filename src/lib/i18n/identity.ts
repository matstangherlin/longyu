/**
 * Identidade de idioma do lancamento atual.
 *
 * Conceitos separados (nao derivar um do outro):
 * - country / country_code: pais do usuario (ISO 3166-1 alpha-2, lancamento BR)
 * - interface_locale: idioma da interface (pt-BR | en)
 * - instruction_locale: lingua usada para ensinar (pt-BR | en)
 * - native_language: lingua de instrucao selecionada pelo aluno (pt-BR | en)
 * - target_language: idioma estudado (lancamento zh-CN)
 *
 * Pais nunca infere idioma. launchLocaleFields() ignora country.
 *
 * Runtime de interface e de instrucao vive em `src/i18n/`, com preferencias
 * locais independentes. Este modulo gera o contrato sem inferir idioma por
 * pais e sem exigir as colunas hospedadas da #208.
 *
 * V4.8.1: a UI de onboarding/Placement segue a preferencia local. Ate a #208
 * ser aplicada, confirmar o email em outro browser nao persiste o idioma
 * da interface na nuvem. Isso nao bloqueia V4.8.1.
 *
 * A mesma conta pode estudar no par en -> zh-CN sem duplicar banco nem Journey.
 * Dados canonicos chineses (hanzi, pinyin, audio, estrutura) continuam
 * independentes do locale.
 */

import { COUNTRY_LABEL_ALIASES, COUNTRY_OPTIONS } from "../../data/countries";
import { getInterfaceLocale } from "../../i18n/locale";
import { getInstructionLocale } from "../../i18n/instructionLocale";
import type { InterfaceLocale, InstructionLocale } from "../../i18n/config";

export const LAUNCH_INTERFACE_LOCALE = "pt-BR";
export const LAUNCH_INSTRUCTION_LOCALE = "pt-BR";
export const LAUNCH_NATIVE_LANGUAGE = "pt-BR";
export const LAUNCH_TARGET_LANGUAGE = "zh-CN";
export const LAUNCH_COUNTRY_CODE = "BR";

/** Rotulo de UI no lancamento BR. Nao e o valor persistido. */
export const LAUNCH_COUNTRY_LABEL = "Brasil";

const LABEL_TO_CODE: Record<string, string> = { ...COUNTRY_LABEL_ALIASES };
const CODE_TO_LABEL: Record<string, string> = {};

for (const option of COUNTRY_OPTIONS) {
  CODE_TO_LABEL[option.code] = option.label;
  LABEL_TO_CODE[option.label.trim().toLowerCase()] = option.code;
}

export function canonicalCountryCode(input: string | null | undefined): string {
  const raw = String(input ?? "").trim();
  if (!raw) return LAUNCH_COUNTRY_CODE;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return LABEL_TO_CODE[raw.toLowerCase()] ?? LAUNCH_COUNTRY_CODE;
}

export function countryLabelForCode(code: string | null | undefined): string {
  const normalized = canonicalCountryCode(code);
  return CODE_TO_LABEL[normalized] ?? normalized;
}

export function launchLocaleFields(options: {
  interfaceLocale?: InterfaceLocale;
  instructionLocale?: InstructionLocale;
} = {}) {
  const interfaceLocale = options.interfaceLocale ?? getInterfaceLocale();
  const instructionLocale = options.instructionLocale ?? getInstructionLocale();
  return {
    interface_locale: interfaceLocale,
    instruction_locale: instructionLocale,
    native_language: instructionLocale,
    target_language: LAUNCH_TARGET_LANGUAGE,
    country_code: LAUNCH_COUNTRY_CODE,
  };
}
