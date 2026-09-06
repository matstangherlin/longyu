import { LOCALE_DISPLAY_NAME, SUPPORTED_LOCALES, type SupportedLocale } from "../../i18n/config";
import { setInstructionLocale } from "../../i18n/instructionLocale";
import { parseInterfaceLocale } from "../../i18n/locale";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * O único controle de idioma do onboarding.
 *
 * O produto distingue idioma da interface (`locale`) de idioma de instrução do
 * curso (`instructionLocale`), e essa distinção continua valendo — em
 * Configurações ela é útil, porque alguém pode querer a interface em inglês
 * estudando a partir do português. No primeiro contato ela não é útil: a tela
 * perguntava "idioma" duas vezes, com as mesmas duas opções, e nada explicava
 * a diferença. Quem chega para aprender mandarim não tem como saber qual das
 * duas responde à pergunta que ele nem sabe que existe.
 *
 * Então aqui uma escolha decide as duas.
 *
 * O `setLocale` sozinho não bastava: ele propaga para o curso através de
 * `followInterfaceLocale`, que respeita um override manual anterior. Ou seja,
 * para quem já tinha escolhido o curso à mão em algum momento, escolher
 * "English" no onboarding deixaria a interface em inglês e o curso em
 * português — exatamente a incoerência que esta remessa existe para apagar.
 * Por isso o valor de instrução é gravado direto.
 *
 * `userOverride: false` é deliberado: isto não é uma escolha separada de
 * curso, é a mesma escolha aplicada aos dois lugares. Marcar override aqui
 * quebraria, para todo mundo que passa pelo onboarding, o comportamento que
 * Configurações oferece de o curso acompanhar a interface enquanto ninguém
 * pediu o contrário.
 */
export function OnboardingLanguageSwitcher({ id = "onboarding-locale" }: { id?: string }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <label className="inline-flex items-center gap-2" htmlFor={id}>
      {/* Sem rótulo visível: no onboarding o seletor é um ajuste, não uma etapa. */}
      <span className="sr-only">{t("marketing.languageSwitcher")}</span>
      <select
        id={id}
        data-testid="interface-locale-select"
        value={locale}
        onChange={(event) => {
          const next = parseInterfaceLocale(event.target.value) as SupportedLocale;
          setLocale(next);
          setInstructionLocale(next, { userOverride: false });
        }}
        className="h-11 min-w-[7.5rem] rounded-xl border border-line bg-surface px-2.5 text-sm font-semibold text-ink outline-none transition focus:ring-2 focus:ring-accent/25"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_DISPLAY_NAME[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
