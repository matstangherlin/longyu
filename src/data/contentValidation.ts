import { CHARACTERS } from "./characters";
import {
  CONTENT_CATALOG,
  CONTENT_PHASE_ORDER,
  canAppearBeforePhase,
  contentByRef,
  phaseForJourneyOrder,
  type ContentPhaseId,
  type PedagogicalContentItem,
} from "./contentArchitecture";
import { ALL_LESSONS, type LessonStep } from "./journey";

export type ContentIssueSeverity = "error" | "warn";

export interface ContentValidationIssue {
  severity: ContentIssueSeverity;
  area: string;
  ref: string;
  message: string;
}

export interface DuplicateContentEntry {
  key: string;
  refs: string[];
}

export interface ContentAlternativeGap {
  ref: string;
  field: "hanzi" | "pinyin" | "meaningPt";
  available: number;
  required: number;
}

export interface ContentDiagnostics {
  missingPinyin: PedagogicalContentItem[];
  missingMeaning: PedagogicalContentItem[];
  missingHanzi: PedagogicalContentItem[];
  missingPhase: PedagogicalContentItem[];
  duplicates: DuplicateContentEntry[];
  earlyComplexWithoutExplanation: PedagogicalContentItem[];
  questionsWithoutAlternatives: ContentAlternativeGap[];
}

const issue = (
  severity: ContentIssueSeverity,
  area: string,
  ref: string,
  message: string
): ContentValidationIssue => ({ severity, area, ref, message });

const MIN_ALTERNATIVES = 2;
const EARLY_COMPLEX_PHASES = new Set<ContentPhaseId>(["coreMvp", "phase1"]);
const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((char) => [char.id, char]));

export function buildContentDiagnostics(): ContentDiagnostics {
  return {
    missingPinyin: CONTENT_CATALOG.filter((item) => !item.pinyin?.trim()),
    missingMeaning: CONTENT_CATALOG.filter((item) => !item.meaningPt?.trim()),
    missingHanzi: CONTENT_CATALOG.filter((item) => !item.hanzi?.trim()),
    missingPhase: CONTENT_CATALOG.filter((item) => !item.recommendedPhase),
    duplicates: duplicateContentEntries(),
    earlyComplexWithoutExplanation: CONTENT_CATALOG.filter(needsComplexCharacterExplanation),
    questionsWithoutAlternatives: alternativeGaps(),
  };
}

export function validateContentArchitecture(): ContentValidationIssue[] {
  return [
    ...validateContentMetadata(),
    ...validateContentReleaseRules(),
    ...validateComplexCharacterPacing(),
    ...validateReviewAlternativeReadiness(),
  ];
}

export function validateContentMetadata(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const byRef = new Set<string>();
  const diagnostics = buildContentDiagnostics();

  for (const item of CONTENT_CATALOG) {
    if (!item.id?.trim()) issues.push(issue("error", "content", item.ref || item.hanzi, "id vazio"));
    if (!item.ref?.trim()) issues.push(issue("error", "content", item.id || item.hanzi, "ref vazio"));
    if (!item.hanzi?.trim()) issues.push(issue("error", "content", item.ref, "hanzi vazio"));
    if (!item.pinyin?.trim()) issues.push(issue("error", "content", item.ref, "pinyin vazio"));
    if (!item.meaningPt?.trim()) issues.push(issue("error", "content", item.ref, "meaningPt vazio"));
    if (!item.itemType) issues.push(issue("error", "content", item.ref, "tipo pedagogico vazio"));
    if (typeof item.frequencyApprox !== "number") issues.push(issue("error", "content", item.ref, "frequencia aproximada ausente"));
    if (!item.recommendedPhase) issues.push(issue("error", "content", item.ref, "fase recomendada ausente"));
    if (!item.learningDomain) issues.push(issue("error", "content", item.ref, "dominio de aprendizagem ausente"));
    if (!item.tags.length) issues.push(issue("warn", "content", item.ref, "sem tags pedagogicas"));
    if (!item.audio?.tts?.trim()) issues.push(issue("error", "content", item.ref, "audio/TTS ausente"));
    if (!item.pedagogicalStatus) issues.push(issue("error", "content", item.ref, "status pedagogico ausente"));

    if (byRef.has(item.ref)) issues.push(issue("error", "content", item.ref, "ref duplicada"));
    byRef.add(item.ref);
  }

  for (const duplicate of diagnostics.duplicates) {
    issues.push(
      issue(
        "warn",
        "content",
        duplicate.key,
        `possivel duplicata pedagogica: ${duplicate.refs.join(", ")}`
      )
    );
  }

  return issues;
}

export function validateContentReleaseRules(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];

  for (const lesson of ALL_LESSONS) {
    const lessonPhase = phaseForJourneyOrder(lesson.phaseOrder);
    const refs = [
      ...(lesson.libraryItems ?? []).map((ref) => ({ ref, list: "libraryItems" })),
      ...(lesson.reviewItems ?? []).map((ref) => ({ ref, list: "reviewItems" })),
    ];

    for (const { ref, list } of refs) {
      const item = contentByRef[ref];
      if (!item) continue;
      if (!canAppearBeforePhase(item, lessonPhase)) {
        issues.push(
          issue(
            "error",
            "content-release",
            `${lesson.id}:${ref}`,
            `${list} apresenta item da fase ${item.recommendedPhase} antes de ${lessonPhase}`
          )
        );
      }
    }
  }

  return issues;
}

export function validateComplexCharacterPacing(): ContentValidationIssue[] {
  return buildContentDiagnostics().earlyComplexWithoutExplanation.map((item) =>
    issue(
      "warn",
      "content-pacing",
      item.ref,
      "hànzì complexo aparece cedo sem decomposição, mnemônico ou explicação explícita"
    )
  );
}

export function validateReviewAlternativeReadiness(): ContentValidationIssue[] {
  return buildContentDiagnostics().questionsWithoutAlternatives.map((gap) =>
    issue(
      "warn",
      "content-review",
      gap.ref,
      `banco de alternativas insuficiente para ${gap.field}: ${gap.available}/${gap.required}`
    )
  );
}

function duplicateContentEntries(): DuplicateContentEntry[] {
  const grouped = new Map<string, string[]>();
  for (const item of CONTENT_CATALOG) {
    const key = `${item.itemType}:${normalize(item.hanzi)}:${normalize(item.meaningPt)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item.ref]);
  }
  return [...grouped.entries()]
    .filter(([, refs]) => refs.length > 1)
    .map(([key, refs]) => ({ key, refs }));
}

function alternativeGaps(): ContentAlternativeGap[] {
  const gaps: ContentAlternativeGap[] = [];
  for (const item of CONTENT_CATALOG) {
    if (item.pedagogicalStatus !== "active") continue;
    for (const field of ["hanzi", "pinyin", "meaningPt"] as const) {
      const available = alternativeCount(item, field);
      if (available < MIN_ALTERNATIVES) {
        gaps.push({ ref: item.ref, field, available, required: MIN_ALTERNATIVES });
      }
    }
  }
  return gaps;
}

function alternativeCount(item: PedagogicalContentItem, field: "hanzi" | "pinyin" | "meaningPt"): number {
  const itemPhaseOrder = CONTENT_PHASE_ORDER[item.recommendedPhase];
  const answer = normalize(item[field]);
  const sameLane = CONTENT_CATALOG.filter((candidate) => {
    if (candidate.ref === item.ref) return false;
    if (candidate.pedagogicalStatus !== "active") return false;
    if (CONTENT_PHASE_ORDER[candidate.recommendedPhase] > itemPhaseOrder) return false;
    if (contentLane(candidate) !== contentLane(item)) return false;
    return normalize(candidate[field]) !== answer && Boolean(candidate[field]?.trim());
  });
  return new Set(sameLane.map((candidate) => normalize(candidate[field]))).size;
}

function contentLane(item: PedagogicalContentItem): "character" | "spoken" | "reading" {
  if (item.itemType === "character") return "character";
  if (item.itemType === "word") return item.learningDomain === "leitura" ? "reading" : "spoken";
  return "spoken";
}

function needsComplexCharacterExplanation(item: PedagogicalContentItem): boolean {
  if (item.itemType !== "character") return false;
  if (!EARLY_COMPLEX_PHASES.has(item.recommendedPhase)) return false;
  if (item.components.length < 2 && item.frequencyApprox <= 900) return false;
  const [, charId] = item.ref.split(":");
  const char = CHAR_BY_ID[charId];
  if (char?.mnemonicPt?.trim() || (char?.exampleWords?.length ?? 0) > 0) return false;
  return !lessonExplainsCharacter(charId, item.sourceMeta?.lessonId);
}

function lessonExplainsCharacter(charId: string | undefined, lessonId: string | undefined): boolean {
  if (!charId || !lessonId) return false;
  const lesson = ALL_LESSONS.find((candidate) => candidate.id === lessonId);
  if (!lesson) return false;
  return lesson.steps.some((step) => stepExplainsCharacter(step, charId));
}

function stepExplainsCharacter(step: LessonStep, charId: string): boolean {
  if ((step.kind === "decompose" || step.kind === "recognize") && step.charId === charId) return true;
  if (step.kind === "hanzi_evolution" && (step.charIds ?? []).includes(charId)) return true;
  if (step.kind === "hanzi_build") return true;
  return false;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}
