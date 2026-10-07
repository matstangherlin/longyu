/**
 * RC2.3.1 — aplica Visual First ao plano da sessão (sem reescrever 134 lições).
 */
import type { LessonStep } from "../../data/journey";
import type { VisualConceptId } from "../../data/visualVocabulary";
import { resolveVisualConcept } from "../../data/visualVocabulary";
import {
  assertStyleFamilyConsistent,
  detectCurriculumLeak,
  resolveCurriculumVisual,
  visualDistractorsForPass,
} from "./resolveCurriculumVisual";
import { preferredImageChoiceMode, visualScaffoldForPass } from "./masteryVisualScaffold";
import { PEDAGOGY_VISUAL_SCENES, sceneAnchorAsset, scenePromptForPass } from "./contextScenes";
import { isAbstractPedagogyLesson } from "../pedagogyV6/earlyVisual";

export interface VisualFirstPlanResult {
  steps: LessonStep[];
  injectedImageChoices: number;
  injectedScenes: number;
  enrichedDiscovery: number;
  styleMismatches: number;
  curriculumLeaks: number;
  saturatedVisualsRemoved: number;
}

function stepBlob(step: LessonStep): string {
  return [step.hanzi, step.targetHanzi, step.correctAnswer, step.answer, step.text, step.audioText, step.promptPt]
    .filter(Boolean)
    .join("");
}

function alreadyHasVisual(step: LessonStep): boolean {
  return Boolean(
    step.imageId ||
      step.iconId ||
      step.correctImageId ||
      step.kind === "image_choice" ||
      step.kind === "compare_with_image"
  );
}

function presentationKey(step: LessonStep): string {
  return `${step.kind}|${step.imageId ?? step.correctImageId ?? ""}|${step.imageChoiceMode ?? ""}`;
}

/**
 * Diversifica aparições do mesmo visualConceptId / presentation na sessão.
 */
function diversifyVisualPresentations(steps: LessonStep[]): { steps: LessonStep[]; removed: number } {
  const out: LessonStep[] = [];
  const recentVisual: string[] = [];
  let removed = 0;
  for (const step of steps) {
    const vid = step.imageId || step.correctImageId || step.iconId;
    if (!vid || step.pedagogyRole === "discovery") {
      out.push(step);
      continue;
    }
    const near = recentVisual.filter((v) => v === vid).length;
    if (near >= 2 && step.kind === "image_choice") {
      // keep non-image graded work; drop redundant image pick
      removed += 1;
      continue;
    }
    out.push(step);
    recentVisual.push(String(vid));
    if (recentVisual.length > 5) recentVisual.shift();
  }
  void presentationKey;
  return { steps: out, removed };
}

export function applyVisualFirstToPlan(input: {
  lessonId: string;
  masteryPass: number;
  unitIndex?: number;
  steps: LessonStep[];
  taughtConceptIds?: readonly string[];
}): VisualFirstPlanResult {
  const unitIndex = input.unitIndex ?? 0;
  const abstract = isAbstractPedagogyLesson(input.lessonId);
  let steps = [...input.steps];
  let enrichedDiscovery = 0;
  let injectedImageChoices = 0;
  let injectedScenes = 0;
  let styleMismatches = 0;
  let curriculumLeaks = 0;

  // 1) Enrich discovery / concrete steps with curriculum visual
  steps = steps.map((step) => {
    if (abstract) return step;
    const blob = stepBlob(step);
    const resolved = resolveCurriculumVisual({
      text: blob,
      conceptId: step.imageId || step.discoveryMomentId,
      unitIndex,
      taughtConceptIds: input.taughtConceptIds,
      allowUntaughtTarget: step.pedagogyRole === "discovery" || input.masteryPass === 1,
    });
    if (!resolved.concept || !resolved.hasLocalAsset) return step;
    const firstExposureKind =
      step.pedagogyRole === "discovery" ||
      step.kind === "intro" ||
      step.kind === "listen" ||
      step.kind === "flashcard";
    if (
      !alreadyHasVisual(step) &&
      resolved.visualClass === "CONCRETE_VISUAL" &&
      (firstExposureKind || resolved.allowedByUnit)
    ) {
      if (firstExposureKind) enrichedDiscovery += 1;
      return {
        ...step,
        imageId: resolved.concept.id,
        iconId: resolved.concept.id,
        visualConceptId: resolved.concept.id,
      } as LessonStep;
    }
    return step;
  });

  // 2) Inject image_choice when pass wants visual association and session lacks it
  const hasImageExercise = steps.some((s) => s.kind === "image_choice" || s.kind === "compare_with_image");
  if (!abstract && !hasImageExercise && input.masteryPass <= 3) {
    const resolvedPerStep = steps.map((s) => resolveCurriculumVisual({ text: stepBlob(s), unitIndex, allowUntaughtTarget: true }));
    const sourceIndex = resolvedPerStep.findIndex((r) => r.concept && r.hasLocalAsset && r.visualClass === "CONCRETE_VISUAL");
    const candidate = sourceIndex >= 0 ? resolvedPerStep[sourceIndex] : undefined;
    if (candidate?.concept) {
      const mode = preferredImageChoiceMode(input.masteryPass);
      const distractors = visualDistractorsForPass({
        targetId: candidate.concept.id as VisualConceptId,
        masteryPass: input.masteryPass,
        unitIndex,
        count: 3,
      });
      const optionIds = [candidate.concept.id, ...distractors].slice(0, 4);
      const style = assertStyleFamilyConsistent(optionIds);
      if (!style.ok) styleMismatches += 1;
      const leaks = detectCurriculumLeak(optionIds, unitIndex);
      curriculumLeaks += leaks.length;
      const safeOptions = optionIds.filter((id) => !leaks.includes(id));
      if (safeOptions.length >= 2 && style.ok) {
        const isImagePick = mode === "choose_image" || mode === "listen_and_choose_image";
        const visual = candidate.concept;
        const injected: LessonStep = {
          kind: "image_choice",
          imageChoiceMode: mode,
          imageId: visual.id,
          promptPt:
            mode === "listen_and_choose_image"
              ? "Ouça e escolha a imagem."
              : mode === "choose_hanzi"
                ? "Qual Hànzì combina com a imagem?"
                : "Qual imagem combina?",
          targetHanzi: visual.hanzi,
          targetPinyin: visual.pinyin,
          targetMeaningPt: visual.meaningPt,
          pedagogyRole: "graded",
          visualConceptId: visual.id,
          ...(isImagePick
            ? { imageOptions: safeOptions, correctImageId: visual.id }
            : {
                options: safeOptions.map((id) => resolveVisualConcept(id)?.hanzi ?? id),
                correctAnswer: visual.hanzi,
              }),
        } as LessonStep;
        // Insert after discovery/intro head — and never before the alvo is
        // shown: teach-before-test exige a 1ª exposição do conceito (e o
        // ensino que a segue, ex. "Note a forma de 木") antes da cobrança.
        const headCount = steps.findIndex((s) => s.pedagogyRole !== "discovery" && s.kind !== "intro");
        let afterExposure = sourceIndex + 1;
        while (afterExposure < steps.length && steps[afterExposure].kind === "intro") afterExposure += 1;
        const at = Math.max(headCount < 0 ? 1 : Math.max(1, headCount), afterExposure);
        steps = [...steps.slice(0, at), injected, ...steps.slice(at)];
        injectedImageChoices += 1;
      }
    }
  }

  // 3) Context scene on Pass 3–4 when available for lesson themes
  const scaffold = visualScaffoldForPass(input.masteryPass);
  if (!abstract && (scaffold === "context_prompt" || scaffold === "transfer_scene")) {
    const scene = PEDAGOGY_VISUAL_SCENES.find((s) => unitIndex >= s.afterUnitIndex);
    if (scene && !steps.some((s) => (s as { sceneId?: string }).sceneId === scene.id)) {
      const anchor = sceneAnchorAsset(scene);
      if (anchor) {
        const passPrompt = scenePromptForPass(scene, input.masteryPass);
        const sceneStep: LessonStep = {
          kind: passPrompt.agency === "PRODUCE" || passPrompt.agency === "TRANSFER" ? "dialogue_completion" : "contextual_choice",
          title: scene.wherePt,
          promptPt: passPrompt.promptPt,
          body: passPrompt.showNpc ? scene.npcLinePt : undefined,
          hanzi: passPrompt.showNpc ? scene.npcLineHanzi : undefined,
          pinyin: passPrompt.showNpc ? scene.npcLinePinyin : undefined,
          imageId: anchor.id,
          iconId: anchor.id,
          correctAnswer: scene.expectedHanzi,
          options:
            passPrompt.agency === "TRANSFER"
              ? undefined
              : scene.expectedHanzi
                ? [scene.expectedHanzi, "谢谢", "再见"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)
                : undefined,
          pedagogyRole: "graded",
          sceneId: scene.id,
          visualConceptId: anchor.id,
          learnerAgency: passPrompt.agency,
          contextRole: "TARGET",
          humanContext: `${scene.wherePt} · ${scene.goalPt}`,
        } as LessonStep;
        steps = [...steps, sceneStep];
        injectedScenes += 1;
      }
    }
  }

  const diversified = diversifyVisualPresentations(steps);

  return {
    steps: diversified.steps,
    injectedImageChoices,
    injectedScenes,
    enrichedDiscovery,
    styleMismatches,
    curriculumLeaks,
    saturatedVisualsRemoved: diversified.removed,
  };
}
