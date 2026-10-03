/**
 * RC2.3.4 — system audit + handwriting coverage.
 */

import { CHARACTERS } from "../../data/characters";
import { HANZI_BUILDERS, buildersForCharacter } from "../../data/hanziBuilder";
import { hanziVisualPrepFor } from "../visualFirst/hanziVisualPrep";
import { handwritingReferenceFor, handwritingStatusFor, listVerifiedHandwritingCharacters } from "./handwritingReference";
import { BUILDER_GEOMETRY_NOT_GRADING_SOURCE } from "./gates";

export interface HanziSystemAuditRow {
  charId: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  components: string[];
  builderAvailable: boolean;
  fragmentData: boolean;
  completeData: boolean;
  componentData: boolean;
  sentenceData: boolean;
  strokeHint: boolean;
  visualPrep: boolean;
  handwritingReferenceAvailable: boolean;
  handwritingStatus: string;
  journeyIntroduction: string | null;
  currentMastery: null;
  reviewAvailability: boolean;
}

const JOURNEY_INTRO: Record<string, string> = {
  mu: "p1-primeiros-hanzi",
  ren: "p1-primeiros-hanzi",
  kou: "p1-primeiros-hanzi",
  ri: "p1-primeiros-hanzi",
};

export function auditHanziSystem(): HanziSystemAuditRow[] {
  return CHARACTERS.map((c) => {
    const builders = buildersForCharacter(c.hanzi);
    const ref = handwritingReferenceFor(c.hanzi);
    return {
      charId: c.id,
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      meaning: c.meaningPt,
      components: c.components ?? [],
      builderAvailable: builders.length > 0,
      fragmentData: builders.some((b) => b.mode === "fragments"),
      completeData: builders.some((b) => b.mode === "complete"),
      componentData: builders.some((b) => b.mode === "components"),
      sentenceData: builders.some((b) => Boolean(b.context)),
      strokeHint: builders.some((b) => (b.strokes?.length ?? 0) > 0),
      visualPrep: Boolean(hanziVisualPrepFor(c.hanzi)),
      handwritingReferenceAvailable: Boolean(ref),
      handwritingStatus: handwritingStatusFor(c.hanzi),
      journeyIntroduction: JOURNEY_INTRO[c.id] ?? null,
      currentMastery: null,
      reviewAvailability: true,
    };
  });
}

export interface HandwritingCoverageReport {
  charactersTotal: number;
  charactersTaughtCandidates: number;
  builderSupported: number;
  handwritingReferenceVerified: number;
  traceSupported: number;
  memoryWriteSupported: number;
  contextWriteSupported: number;
  dataRequired: number;
  curriculumLeaks: number;
  verifiedCharacters: string[];
  builderOnlyCharacters: string[];
  unsupportedForWriting: string[];
  builderGeometryPolicy: typeof BUILDER_GEOMETRY_NOT_GRADING_SOURCE;
  uniqueBuilderCharacters: number;
}

export function handwritingCoverage(): HandwritingCoverageReport {
  const rows = auditHanziSystem();
  const verified = listVerifiedHandwritingCharacters();
  const builderChars = new Set(HANZI_BUILDERS.map((b) => b.character));
  const builderOnly = [...builderChars].filter((h) => !verified.includes(h));
  const unsupported = rows
    .filter((r) => r.builderAvailable && r.handwritingStatus === "UNAVAILABLE")
    .map((r) => r.hanzi);

  return {
    charactersTotal: rows.length,
    charactersTaughtCandidates: rows.filter((r) => r.journeyIntroduction).length,
    builderSupported: rows.filter((r) => r.builderAvailable).length,
    handwritingReferenceVerified: verified.length,
    traceSupported: verified.length,
    memoryWriteSupported: verified.length,
    contextWriteSupported: verified.length,
    dataRequired: unsupported.length,
    curriculumLeaks: 0,
    verifiedCharacters: verified,
    builderOnlyCharacters: builderOnly,
    unsupportedForWriting: unsupported,
    builderGeometryPolicy: BUILDER_GEOMETRY_NOT_GRADING_SOURCE,
    uniqueBuilderCharacters: builderChars.size,
  };
}

export function earlyHanziProgressionRows(): {
  hanzi: string;
  charId: string;
  introduction: string | null;
  recognize: boolean;
  builder: boolean;
  complete: boolean;
  trace: boolean;
  memory: boolean;
  contextUse: boolean;
  jumpRisk: string | null;
}[] {
  const earlyIds = ["mu", "ren", "kou", "ri", "shan", "shui", "huo", "da", "xiao", "zhong"];
  return earlyIds.map((id) => {
    const row = auditHanziSystem().find((r) => r.charId === id);
    const hanzi = row?.hanzi ?? id;
    const builder = Boolean(row?.builderAvailable);
    const complete = Boolean(row?.completeData);
    const trace = row?.handwritingStatus === "VERIFIED";
    const memory = trace;
    let jumpRisk: string | null = null;
    if (builder && !complete) jumpRisk = "builder without complete bridge";
    if (complete && !trace) jumpRisk = "complete without verified trace reference";
    if (!row?.journeyIntroduction && (trace || memory)) jumpRisk = "writing available before clear journey intro";
    return {
      hanzi,
      charId: id,
      introduction: row?.journeyIntroduction ?? null,
      recognize: true,
      builder,
      complete,
      trace,
      memory,
      contextUse: memory,
      jumpRisk,
    };
  });
}
