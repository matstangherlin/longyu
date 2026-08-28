/**
 * Stable pedagogical localization catalog for teaching topics 21–50.
 *
 * Runtime still resolves copy via the PT-text overlay (compatibility with
 * first 20 and with planner clones). This catalog is the durable identity:
 * topicId + pass + canonical/planned step index + field — not the Portuguese
 * string.
 *
 * First 20 are intentionally absent. Do not migrate them in V4.8.3.
 */

import catalog from "./stablePedagogy.en.json";
import { DEFAULT_LOCALE, type SupportedLocale } from "../config";
import { resolveInstructionText } from "./instructionGloss";

export type PedagogyLocKind =
  | "DIRECT_TRANSLATION"
  | "NATURAL_REWRITE"
  | "SOURCE_LANGUAGE_ADAPTATION";

export type PedagogyLocEntry = {
  id: string;
  pt: string;
  en: string;
  kind: PedagogyLocKind;
};

type StablePedagogyFile = {
  version: string;
  topicIds: string[];
  entries: PedagogyLocEntry[];
};

const DATA = catalog as StablePedagogyFile;

const BY_ID = new Map<string, PedagogyLocEntry>();
for (const entry of DATA.entries ?? []) {
  BY_ID.set(entry.id, entry);
}

export function stablePedagogyTopicIds(): readonly string[] {
  return DATA.topicIds;
}

export function lookupStablePedagogy(id: string | null | undefined): PedagogyLocEntry | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

/**
 * Prefer the stable loc id when present; otherwise the PT-text overlay.
 * First-20 callers omit locId and keep working.
 */
export function resolvePedagogyText(
  text: string | undefined | null,
  locale: SupportedLocale = DEFAULT_LOCALE,
  locId?: string | null
): string {
  if (locale === "pt-BR" || !text) return text ?? "";
  if (locId) {
    const entry = BY_ID.get(locId);
    if (entry?.en) return entry.en;
  }
  return resolveInstructionText(text, locale);
}

export function stablePedagogyEntryCount(): number {
  return BY_ID.size;
}
