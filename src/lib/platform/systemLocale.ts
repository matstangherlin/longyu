/**
 * RC2.2.14B — idioma do sistema, num lugar só.
 *
 * Web: `navigator.languages` (ordem de preferência do navegador/sistema).
 * Android: o WebView do Capacitor expõe o idioma do aparelho no mesmo
 * `navigator.languages`, então a mesma leitura vale para o app nativo — sem
 * plugin novo. Nenhum componente lê `navigator.language` diretamente: tudo
 * passa por `resolvePreferredInterfaceLocale()` (src/i18n/locale.ts).
 *
 * Fora do navegador (testes Node, pré-render) devolve lista vazia: quem chama
 * cai no padrão do produto.
 */
export function systemLanguageTags(): string[] {
  if (typeof window === "undefined" || typeof navigator === "undefined") return [];
  const list = Array.isArray(navigator.languages) && navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  return list.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

/**
 * Avisa quando o idioma do sistema muda com o app aberto (evento
 * `languagechange` do navegador). No Android a troca de idioma do aparelho
 * recria a Activity, e a próxima abertura já resolve de novo.
 */
export function onSystemLanguageChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("languagechange", listener);
  return () => window.removeEventListener("languagechange", listener);
}
