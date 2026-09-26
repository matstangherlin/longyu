import {
  PENDING_COURSE_DIRECTION_STORAGE_KEY,
  isSupportedLocale,
  type InstructionLocale,
  type SupportedLocale,
} from "./config";
import { hasInstructionLocaleUserOverride, readPersistedInstructionLocale, setInstructionLocale } from "./instructionLocale";

/**
 * RC2.2.14B — CourseDirection: de qual idioma para qual se ensina.
 *
 * Idioma da INTERFACE (menus) e idioma-FONTE do curso (explicações,
 * traduções, dicas, glosas) são coisas diferentes: alguém com o Android em
 * inglês pode querer aprender a partir do português, e vice-versa.
 *
 *   interfaceLocale     — src/i18n/locale.ts (automático, sobrescrevível)
 *   courseDirection     — este registro (sempre escolha explícita)
 *   instructionLocale   — DERIVADO de courseDirection (cache para o runtime)
 *   targetLanguage      — "zh" (mandarim é o mesmo em todo curso)
 *
 * Trocar de curso não cria outro aluno nem mexe em progresso: lições,
 * mastery, hànzì, SRS, Cultura, XP e ofensiva são do mesmo perfil; só a
 * camada de instrução muda. O currículo é um só (conteúdo canônico +
 * overlays), nunca LESSONS_PT / LESSONS_EN.
 *
 * Para um curso novo (es-zh, fr-zh, de-zh): marque `available: true` e
 * registre a interface/overlays daquele idioma. A tela de escolha, a
 * recomendação e Configurações renderizam desta lista.
 */
export type CourseDirectionId = "pt-zh" | "en-zh" | "es-zh" | "fr-zh" | "de-zh";
export type CourseTargetLanguage = "zh";

export interface CourseDirection {
  id: CourseDirectionId;
  /** Idioma-fonte (BCP-47 curto): pt, en, es… */
  sourceLanguage: string;
  /** Locale de instrução do runtime; só cursos disponíveis têm um. */
  instructionLocale: InstructionLocale | null;
  targetLanguage: CourseTargetLanguage;
  available: boolean;
  /** Bandeira é apoio visual — o texto é obrigatório. */
  flag: string;
  /** Nome do idioma-fonte no próprio idioma ("Português", "English"). */
  sourceNativeName: string;
}

export const COURSE_TARGET_LANGUAGE: CourseTargetLanguage = "zh";

export const COURSE_DIRECTIONS: readonly CourseDirection[] = [
  { id: "pt-zh", sourceLanguage: "pt", instructionLocale: "pt-BR", targetLanguage: "zh", available: true, flag: "🇧🇷", sourceNativeName: "Português" },
  { id: "en-zh", sourceLanguage: "en", instructionLocale: "en", targetLanguage: "zh", available: true, flag: "🇺🇸", sourceNativeName: "English" },
  { id: "es-zh", sourceLanguage: "es", instructionLocale: null, targetLanguage: "zh", available: false, flag: "🇪🇸", sourceNativeName: "Español" },
  { id: "fr-zh", sourceLanguage: "fr", instructionLocale: null, targetLanguage: "zh", available: false, flag: "🇫🇷", sourceNativeName: "Français" },
  { id: "de-zh", sourceLanguage: "de", instructionLocale: null, targetLanguage: "zh", available: false, flag: "🇩🇪", sourceNativeName: "Deutsch" },
];

export function availableCourseDirections(): CourseDirection[] {
  return COURSE_DIRECTIONS.filter((direction) => direction.available && direction.instructionLocale != null);
}

export function isAvailableCourseDirection(value: unknown): value is CourseDirectionId {
  return availableCourseDirections().some((direction) => direction.id === value);
}

export function courseDirectionById(id: CourseDirectionId): CourseDirection | undefined {
  return COURSE_DIRECTIONS.find((direction) => direction.id === id);
}

export function instructionLocaleForDirection(id: CourseDirectionId): InstructionLocale | null {
  return courseDirectionById(id)?.instructionLocale ?? null;
}

/** Migração: quem já estudava com instructionLocale = pt-BR/en ganha o curso equivalente. */
export function courseDirectionForInstructionLocale(locale: unknown): CourseDirectionId | null {
  if (!isSupportedLocale(locale)) return null;
  return availableCourseDirections().find((direction) => direction.instructionLocale === locale)?.id ?? null;
}

/**
 * RC2.2.14B · L/M/N — recomendação pelo idioma do SISTEMA (nunca pelo
 * fallback da interface). Sem correspondência → nenhuma recomendação.
 */
export function recommendedCourseDirection(systemTags: readonly string[]): CourseDirectionId | null {
  for (const tag of systemTags) {
    const primary = String(tag).replace(/_/g, "-").split("-")[0]?.toLowerCase() ?? "";
    const match = availableCourseDirections().find((direction) => direction.sourceLanguage === primary);
    if (match) return match.id;
  }
  return null;
}

/**
 * RC2.2.14B · AQ — ordem do curso:
 *   1. curso da conta autenticada;
 *   2. escolha temporária do onboarding (antes da conta);
 *   3. migração de quem já estudava (instructionLocale existente);
 *   4. null → a pessoa escolhe. Nunca inferido só pelo sistema.
 */
export function resolveCourseDirection(input: {
  accountDirection?: unknown;
  pendingDirection?: unknown;
  legacyInstructionLocale?: unknown;
}): CourseDirectionId | null {
  if (isAvailableCourseDirection(input.accountDirection)) return input.accountDirection;
  if (isAvailableCourseDirection(input.pendingDirection)) return input.pendingDirection;
  return courseDirectionForInstructionLocale(input.legacyInstructionLocale);
}

// ── Escolha antes da conta (só este aparelho, não é perfil) ────────────────

export function readPendingCourseDirection(): CourseDirectionId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = localStorage.getItem(PENDING_COURSE_DIRECTION_STORAGE_KEY);
    return isAvailableCourseDirection(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePendingCourseDirection(id: CourseDirectionId | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (id == null) localStorage.removeItem(PENDING_COURSE_DIRECTION_STORAGE_KEY);
    else localStorage.setItem(PENDING_COURSE_DIRECTION_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/** Instrução legada gravada por escolha explícita (antes da RC2.2.14B). */
export function legacyInstructionLocale(): InstructionLocale | null {
  return hasInstructionLocaleUserOverride() ? readPersistedInstructionLocale() : null;
}

/** Aplica o curso ao runtime de instrução (fonte única: o curso). */
export function applyCourseDirection(id: CourseDirectionId): InstructionLocale | null {
  const locale = instructionLocaleForDirection(id);
  if (!locale) return null;
  setInstructionLocale(locale, { userOverride: true });
  return locale;
}

export type { SupportedLocale };
