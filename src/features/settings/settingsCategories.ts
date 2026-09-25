import type { MessageKey } from "../../locales/pt-BR";

/**
 * RC2.2.14 · BS–CE — Configurações por categoria.
 *
 * No celular `/config` é um índice curto (no máximo 7 linhas) e cada
 * categoria abre em `/config/<id>` com o Voltar inteligente. No desktop a
 * página continua sendo uma só, na mesma ordem das categorias. Não é outro
 * sistema de ajustes: as seções são as mesmas de sempre, só agrupadas.
 */
export type SettingsCategoryId =
  | "conta"
  | "aprendizagem"
  | "som"
  | "notificacoes"
  | "aparencia"
  | "privacidade"
  | "avancado";

export interface SettingsCategory {
  id: SettingsCategoryId;
  titleKey: MessageKey;
  descKey: MessageKey;
}

export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  { id: "conta", titleKey: "settings.catAccount", descKey: "settings.catAccountDesc" },
  { id: "aprendizagem", titleKey: "settings.catLearning", descKey: "settings.catLearningDesc" },
  { id: "som", titleKey: "settings.catSound", descKey: "settings.catSoundDesc" },
  { id: "notificacoes", titleKey: "settings.catNotifications", descKey: "settings.catNotificationsDesc" },
  { id: "aparencia", titleKey: "settings.catAppearance", descKey: "settings.catAppearanceDesc" },
  { id: "privacidade", titleKey: "settings.catPrivacy", descKey: "settings.catPrivacyDesc" },
  { id: "avancado", titleKey: "settings.catAdvanced", descKey: "settings.catAdvancedDesc" },
] as const;

/** Limite do índice no celular. */
export const SETTINGS_INDEX_MAX = 7;

/** Links antigos com âncora (`/config#sons`) → categoria nova. */
export const SETTINGS_HASH_TO_CATEGORY: Record<string, SettingsCategoryId> = {
  dados: "conta",
  privacidade: "conta",
  idioma: "aprendizagem",
  "idioma-curso": "aprendizagem",
  exibicao: "aprendizagem",
  sons: "som",
  vibracao: "som",
  "audio-fala": "som",
  notificacoes: "notificacoes",
  permissoes: "notificacoes",
  tema: "aparencia",
  "privacidade-dados": "privacidade",
  "diagnostico-nativo": "avancado",
  "teste-sons": "avancado",
};

export function isSettingsCategory(value: unknown): value is SettingsCategoryId {
  return typeof value === "string" && SETTINGS_CATEGORIES.some((category) => category.id === value);
}
