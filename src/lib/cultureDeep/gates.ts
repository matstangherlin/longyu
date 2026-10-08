/**
 * RC2.3.3 — editorial / integrity gates for Culture Deep.
 */

import type { CultureItem, CultureItemKind } from "../../data/culture";
import { isYearSpecificSource, isEvergreenSource } from "../../data/culture";
import type { CultureMission } from "../../data/cultureQuest";
import { isKnownCultureVisual } from "./visuals";

export const CULTURE_KIND_PRESENTATION_MISMATCH = "CULTURE_KIND_PRESENTATION_MISMATCH";
export const CULTURE_UNSCOPED_ABSOLUTE_CLAIM = "CULTURE_UNSCOPED_ABSOLUTE_CLAIM";
export const CULTURE_SOURCE_COVERAGE = "CULTURE_SOURCE_COVERAGE";
export const YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN = "YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN";
export const CULTURE_LANGUAGE_LEAK = "CULTURE_LANGUAGE_LEAK";

export type CultureGateFinding = {
  code:
    | typeof CULTURE_KIND_PRESENTATION_MISMATCH
    | typeof CULTURE_UNSCOPED_ABSOLUTE_CLAIM
    | typeof CULTURE_SOURCE_COVERAGE
    | typeof YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN
    | typeof CULTURE_LANGUAGE_LEAK
    | null;
  itemId: string;
  field?: string;
  claim?: string;
  detail: string;
};

const ABSOLUTE_CLAIM_RE =
  /\b(chineses?\s+sempre|na\s+china\s+todos|nunca\s+se\s+faz|sempre\s+se\s+faz|todos\s+os\s+chineses|always\s+in\s+china|chinese\s+people\s+always|never\s+do\s+this|everyone\s+in\s+china)\b/gi;

/** Kind-appropriate presentation signals in mission steps. */
const KIND_EXPECTATIONS: Record<
  CultureItemKind,
  { requireDecision: boolean; forbidHistoryAsLegend: boolean; requireLabel?: "legend" | "literature" }
> = {
  documented_practice: { requireDecision: true, forbidHistoryAsLegend: false },
  festival: { requireDecision: false, forbidHistoryAsLegend: false },
  history: { requireDecision: false, forbidHistoryAsLegend: true },
  legend: { requireDecision: false, forbidHistoryAsLegend: false, requireLabel: "legend" },
  literature: { requireDecision: false, forbidHistoryAsLegend: false, requireLabel: "literature" },
  symbol: { requireDecision: false, forbidHistoryAsLegend: false },
};

function itemTextBlob(item: CultureItem): Array<{ field: string; text: string }> {
  return [
    ["titlePt", item.titlePt],
    ["titleEn", item.titleEn],
    ["summaryPt", item.summaryPt],
    ["summaryEn", item.summaryEn],
    ["bodyPt", item.bodyPt],
    ["bodyEn", item.bodyEn],
    ["situationPt", item.situationPt],
    ["situationEn", item.situationEn],
    ["whyPt", item.whyPt],
    ["whyEn", item.whyEn],
    ["practicePt", item.practicePt],
    ["practiceEn", item.practiceEn],
    ["variabilityPt", item.variabilityPt ?? ""],
    ["variabilityEn", item.variabilityEn ?? ""],
    ["noticePt", item.noticePt ?? ""],
    ["noticeEn", item.noticeEn ?? ""],
  ]
    .filter(([, t]) => Boolean(t))
    .map(([field, text]) => ({ field, text: String(text) }));
}

export function detectAbsoluteClaims(item: CultureItem): CultureGateFinding[] {
  const findings: CultureGateFinding[] = [];
  for (const { field, text } of itemTextBlob(item)) {
    ABSOLUTE_CLAIM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ABSOLUTE_CLAIM_RE.exec(text))) {
      findings.push({
        code: CULTURE_UNSCOPED_ABSOLUTE_CLAIM,
        itemId: item.id,
        field,
        claim: match[0],
        detail: `Unscoped absolute claim in ${field}`,
      });
    }
  }
  return findings;
}

export function assessSourceCoverage(item: CultureItem): CultureGateFinding[] {
  const findings: CultureGateFinding[] = [];
  if (!item.sources?.length) {
    findings.push({
      code: CULTURE_SOURCE_COVERAGE,
      itemId: item.id,
      field: "sources",
      detail: "sources.length === 0",
    });
    return findings;
  }
  const needsEvergreen = ["festival", "history", "legend", "literature", "symbol", "documented_practice"].includes(
    item.kind
  );
  if (needsEvergreen && !item.sources.some((s) => isEvergreenSource(s) || s.role === "primary" || !s.role)) {
    // Allow primary/secondary without explicit evergreen when at least one non-year_specific exists
    if (item.sources.every((s) => isYearSpecificSource(s))) {
      findings.push({
        code: CULTURE_SOURCE_COVERAGE,
        itemId: item.id,
        field: "sources",
        detail: "Only year_specific sources for evergreen kind",
      });
    }
  }
  return findings;
}

export function detectYearSpecificAsEvergreen(item: CultureItem): CultureGateFinding[] {
  const findings: CultureGateFinding[] = [];
  const yearOnly = item.sources.length > 0 && item.sources.every((s) => isYearSpecificSource(s));
  if (yearOnly) {
    findings.push({
      code: YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN,
      itemId: item.id,
      field: "sources",
      detail: "year_specific source used alone to sustain evergreen claim",
    });
  }
  // Body claiming "sempre" with only yearFacts backing holiday dates
  if (item.yearFacts?.length) {
    for (const { field, text } of itemTextBlob(item)) {
      if (/\b(sempre acontece|always happens|todos os anos na mesma data gregoriana)\b/i.test(text)) {
        findings.push({
          code: YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN,
          itemId: item.id,
          field,
          claim: text.slice(0, 80),
          detail: "Evergreen absolute timing language alongside yearFacts",
        });
      }
    }
  }
  return findings;
}

export function assessKindPresentation(
  item: CultureItem,
  mission: CultureMission | undefined
): CultureGateFinding[] {
  const findings: CultureGateFinding[] = [];
  const expect = KIND_EXPECTATIONS[item.kind];
  if (!mission) {
    findings.push({
      code: CULTURE_KIND_PRESENTATION_MISMATCH,
      itemId: item.id,
      detail: "Missing CultureMission for published item",
    });
    return findings;
  }

  const blob = mission.steps
    .map((s) => [s.body?.pt, s.body?.en, s.explanation?.pt, s.explanation?.en, s.prompt?.pt].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();

  if (expect.requireDecision) {
    const hasDecision = mission.steps.some(
      (s) => s.kind === "scenario_choice" || s.kind === "dialogue_choice"
    );
    if (!hasDecision) {
      findings.push({
        code: CULTURE_KIND_PRESENTATION_MISMATCH,
        itemId: item.id,
        detail: "documented_practice without decision step",
      });
    }
  }

  if (item.kind === "history") {
    if (/\b(lenda|legend|mythical hero|once upon)\b/i.test(blob) && !/\b(documented|históric|histor)/i.test(blob)) {
      findings.push({
        code: CULTURE_KIND_PRESENTATION_MISMATCH,
        itemId: item.id,
        detail: "history item presented with legend language",
      });
    }
  }

  if (item.kind === "legend" || item.kind === "literature") {
    const labelOk =
      /\b(lenda|legend|literatura|literature|obra|ficção|fiction|narrativa)\b/i.test(blob) ||
      Boolean(item.noticePt) ||
      Boolean(item.noticeEn);
    if (!labelOk) {
      findings.push({
        code: CULTURE_KIND_PRESENTATION_MISMATCH,
        itemId: item.id,
        detail: `${item.kind} missing explicit narrative/literature framing`,
      });
    }
    if (/\b(aconteceu de verdade|really happened|historical person|pessoa histórica)\b/i.test(blob)) {
      findings.push({
        code: CULTURE_KIND_PRESENTATION_MISMATCH,
        itemId: item.id,
        detail: `${item.kind} framed as verified historical fact`,
      });
    }
  }

  // Unknown visuals on story beats
  for (const step of mission.steps) {
    for (const beat of step.beats ?? []) {
      if (beat.visual && !isKnownCultureVisual(beat.visual)) {
        findings.push({
          code: CULTURE_KIND_PRESENTATION_MISMATCH,
          itemId: item.id,
          field: `beat:${beat.id}.visual`,
          detail: `Unknown visual id ${beat.visual}`,
        });
      }
    }
  }

  return findings;
}

/**
 * CULTURE_LANGUAGE_LEAK — production of related chunks that learner has not been taught.
 * When `taughtChunkRefs` is empty/undefined, only structural leaks are reported
 * (independent production prompts that quote relatedChunkRefs without teach beat).
 */
export function detectCultureLanguageLeak(
  item: CultureItem,
  mission: CultureMission | undefined,
  taughtChunkRefs?: ReadonlySet<string>
): CultureGateFinding[] {
  const findings: CultureGateFinding[] = [];
  const related = item.relatedChunkRefs ?? [];
  if (!related.length || !mission) return findings;

  for (const step of mission.steps) {
    if (step.role !== "independent" && step.kind !== "dialogue_choice") continue;
    const prompt = `${step.prompt?.pt ?? ""} ${step.prompt?.en ?? ""}`;
    for (const ref of related) {
      const demandsProduction =
        /produ[Zz]|diga|fale|escreva|say |write |produce/i.test(prompt) ||
        step.role === "independent";
      if (!demandsProduction) continue;
      if (taughtChunkRefs && !taughtChunkRefs.has(ref)) {
        findings.push({
          code: CULTURE_LANGUAGE_LEAK,
          itemId: item.id,
          field: step.id,
          claim: ref,
          detail: `Independent production of untaught chunk ${ref}`,
        });
      }
    }
  }
  return findings;
}

export function runCultureEditorialGates(
  item: CultureItem,
  mission: CultureMission | undefined,
  taughtChunkRefs?: ReadonlySet<string>
): CultureGateFinding[] {
  return [
    ...assessSourceCoverage(item),
    ...detectYearSpecificAsEvergreen(item),
    ...detectAbsoluteClaims(item),
    ...assessKindPresentation(item, mission),
    ...detectCultureLanguageLeak(item, mission, taughtChunkRefs),
  ];
}
