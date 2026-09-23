/**
 * RC2.2.8 · A1/A2 — quando o dragão fala na aba Cultura.
 *
 * Regra: o dragão só fala quando há algo útil a dizer — primeira visita,
 * coleção concluída, marco cultural recomendado. Cada fala tem uma chave; uma
 * chave já ouvida não volta. Trocar filtro, abrir card ou reabrir a aba não
 * gera fala nova, porque nada disso muda as entradas desta função.
 *
 * Selo novo não passa por aqui: tem cerimônia própria (CultureSealReveal).
 * Esta função é pura; a UI resolve o texto pelo catálogo.
 */

import { cultureCollectionProgress, type CultureCollectionId } from "../data/cultureCollections";
import { evaluateAllCultureProgressionGates, type CultureProgressionProgress } from "./cultureProgressionGate";

export type CultureGuideMessage =
  | { key: string; kind: "collection_done"; collectionId: CultureCollectionId }
  | { key: string; kind: "intro" }
  | { key: string; kind: "gate_mission"; gateTitlePt: string; gateTitleEn: string; itemId: string };

export const CULTURE_GUIDE_INTRO_KEY = "intro";

export function pickCultureGuideMessage(input: {
  progress: CultureProgressionProgress;
  seenKeys: ReadonlySet<string>;
}): CultureGuideMessage | null {
  const { progress, seenKeys } = input;

  // 1. Coleção concluída — conquista rara, fala primeiro.
  for (const row of cultureCollectionProgress([...(progress.cultureCompletedIds ?? [])])) {
    if (row.total === 0 || row.done < row.total) continue;
    const key = `collection:${row.id}`;
    if (!seenKeys.has(key)) return { key, kind: "collection_done", collectionId: row.id };
  }

  // 2. Primeira visita.
  if (!seenKeys.has(CULTURE_GUIDE_INTRO_KEY)) return { key: CULTURE_GUIDE_INTRO_KEY, kind: "intro" };

  // 3. Missão recomendada: o próximo marco trancado e o item que falta nele.
  const nextGate = evaluateAllCultureProgressionGates(progress).find((evaluation) => evaluation.status === "locked");
  if (nextGate?.nextItemId) {
    const key = `gate:${nextGate.gate.id}:${nextGate.nextItemId}`;
    if (!seenKeys.has(key)) {
      return {
        key,
        kind: "gate_mission",
        gateTitlePt: nextGate.gate.titlePt,
        gateTitleEn: nextGate.gate.titleEn,
        itemId: nextGate.nextItemId,
      };
    }
  }

  return null;
}

const SEEN_STORAGE_PREFIX = "longyu:culture-guide-seen:";

/** Conveniência por aparelho (não é progresso): falhas de storage viram "não visto". */
export function readCultureGuideSeen(accountId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(`${SEEN_STORAGE_PREFIX}${accountId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeCultureGuideSeen(accountId: string, keys: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(`${SEEN_STORAGE_PREFIX}${accountId}`, JSON.stringify([...keys].slice(-60)));
  } catch {
    /* storage bloqueado: o pior caso é o dragão repetir uma fala */
  }
}
