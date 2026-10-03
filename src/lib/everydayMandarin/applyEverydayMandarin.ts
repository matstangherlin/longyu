/**
 * RC2.3.2 — aplica Everyday Mandarin ao plano (runtime; sem mass rewrite 134).
 */
import type { LessonStep } from "../../data/journey";
import {
  inferEverydayIntentFromText,
  intentIsCommunicative,
  type EverydayIntent,
  type CommunicativeMetadata,
} from "./intents";
import {
  scenariosForUnit,
  scenarioBehaviorForPass,
  type EverydayScenario,
} from "./scenarios";
import {
  assessEverydayContextQuality,
  detectEverydayCurriculumLeak,
  isProductionKind,
} from "./quality";
import { resolveScene, sceneAnchorAsset } from "../visualFirst/contextScenes";

export interface EverydayPlanResult {
  steps: LessonStep[];
  annotated: number;
  humanizedPrompts: number;
  injectedScenarios: number;
  injectedDialogueCompletions: number;
  contextLeaks: number;
  curriculumLeaks: number;
  contextualReuseMarks: number;
}

function blobOf(step: LessonStep): string {
  return [step.dialoguePrompt, step.promptPt, step.prompt, step.title, step.body, step.hanzi, step.correctAnswer]
    .filter(Boolean)
    .join(" ");
}

function hasMetadata(step: LessonStep): boolean {
  return Boolean(step.everydayIntent);
}

function annotateStep(step: LessonStep, meta: CommunicativeMetadata): LessonStep {
  return {
    ...step,
    everydayIntent: meta.everydayIntent,
    realWorldDomain: meta.realWorldDomain,
    contextRole: meta.contextRole,
    learnerAgency: meta.learnerAgency,
    interactionPurpose: meta.interactionPurpose,
    humanContext: meta.humanContext,
  };
}

/** Transforma prompts de tradução direta em situação humana curta (Pass ≥ 1). */
function humanizeTranslationPrompt(step: LessonStep, masteryPass: number): LessonStep | null {
  const prompt = step.dialoguePrompt || step.promptPt || step.prompt || "";
  const answer = step.correctAnswer || step.targetHanzi || step.hanzi || "";
  if (!prompt || !answer) return null;

  // Já humanizado
  if (/você |alguém |encontrou|está com|quer saber|precisa|chegou/i.test(prompt)) return null;

  let nextPrompt: string | null = null;
  if (/tradução de\s*你好|significa\s*['"]?olá|qual.*(olá|hello)/i.test(prompt) || (answer === "你好" && /tradução|significa/i.test(prompt))) {
    nextPrompt = "Você encontra alguém. O que diz?";
  }
  if (/obrigad|谢谢|thank/i.test(prompt) && (answer.includes("谢谢") || /thank|obrigad/i.test(prompt))) {
    nextPrompt = "Alguém ajudou você. O que diz?";
  }
  if (/desculpa|对不起/i.test(prompt)) nextPrompt = "Você esbarrou em alguém. O que diz?";
  if (/até logo|adeus|再见|goodbye|拜拜/i.test(prompt)) nextPrompt = "É hora de se despedir. O que diz?";
  if (/quanto custa|preço|多少钱/i.test(prompt)) nextPrompt = "Você quer saber o preço. O que pergunta?";
  if (/quero água|我要水|com sede/i.test(prompt)) nextPrompt = "Você está com sede. Peça água.";
  if (/quero chá|我要茶/i.test(prompt)) nextPrompt = "No restaurante, peça chá.";
  if (/hospital|医院/i.test(prompt) && masteryPass >= 1) nextPrompt = "Você precisa de um médico. Qual lugar procura?";
  // Pass 3/4: qualquer framing de tradução restante → objetivo situacional genérico curto
  if (!nextPrompt && masteryPass >= 3 && /tradução|significa|qual (frase|hànzì|hanzi) significa/i.test(prompt)) {
    nextPrompt = /hànzì|hanzi|caractere/i.test(prompt)
      ? "Qual caractere combina com esta ideia?"
      : "Nesta situação, o que você diz?";
  }

  if (!nextPrompt) return null;
  if (step.dialoguePrompt) return { ...step, dialoguePrompt: nextPrompt };
  if (step.promptPt) return { ...step, promptPt: nextPrompt };
  return { ...step, prompt: nextPrompt };
}

function markContextualReuse(steps: LessonStep[]): { steps: LessonStep[]; marked: number } {
  const seenTargets = new Set<string>();
  let marked = 0;
  const out = steps.map((step) => {
    const target = (step.correctAnswer || step.targetHanzi || step.hanzi || "").replace(/[！？。]/g, "");
    if (!target) return step;
    const isPrimaryAsk =
      /o que (diz|significa)|tradução|qual.*(olá|obrigad)/i.test(
        [step.dialoguePrompt, step.promptPt, step.prompt].filter(Boolean).join(" ")
      ) || step.contextRole === "TARGET";
    if (seenTargets.has(target) && !isPrimaryAsk && step.kind !== "intro") {
      marked += 1;
      return { ...step, contextRole: "CONTEXTUAL_REUSE" as const };
    }
    if (step.contextRole !== "CONTEXTUAL_REUSE") seenTargets.add(target);
    return step;
  });
  return { steps: out, marked };
}

function buildScenarioStep(scenario: EverydayScenario, masteryPass: number, lessonId: string): LessonStep {
  const behavior = scenarioBehaviorForPass(scenario, masteryPass);
  const scene = scenario.visualSceneId ? resolveScene(scenario.visualSceneId) : undefined;
  const anchor = scene ? sceneAnchorAsset(scene) : null;
  const options =
    behavior.showOptions
      ? Array.from(
          new Set([
            scenario.expectedHanzi,
            ...(scenario.acceptableAlternatives ?? []),
            "谢谢",
            "再见",
            "多少钱？",
            "我要水",
          ])
        )
          .filter((o) => o && o !== scenario.expectedHanzi)
          .slice(0, 3)
          .concat([scenario.expectedHanzi])
          .sort(() => 0.5 - Math.random())
          .slice(0, 4)
      : undefined;

  // Stable options without Math.random for determinism in audits
  const stableOptions = behavior.showOptions
    ? [scenario.expectedHanzi, "谢谢", "再见", "我很好"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)
    : undefined;

  void options;
  void lessonId;

  if (behavior.agency === "PRODUCE" || behavior.agency === "TRANSFER") {
    return {
      kind: "dialogue_completion",
      title: scenario.goalPt,
      speaker: scenario.participantRolePt,
      dialoguePrompt: behavior.promptPt,
      correctAnswer: scenario.expectedHanzi,
      accepts: [scenario.expectedHanzi, ...(scenario.acceptableAlternatives ?? [])],
      options: behavior.showOptions ? stableOptions : undefined,
      explanation: behavior.showTranslation ? undefined : undefined,
      audioText: scenario.npcLineHanzi,
      pinyin: scenario.npcLinePinyin,
      sceneId: scenario.visualSceneId,
      imageId: anchor?.id,
      iconId: anchor?.id,
      everydayScenarioId: scenario.id,
      everydayIntent: scenario.intent,
      realWorldDomain: scenario.domain,
      contextRole: "TARGET",
      learnerAgency: behavior.agency,
      interactionPurpose: behavior.agency === "TRANSFER" ? "TRANSFER" : "RESPOND",
      humanContext: `${scenario.locationPt} · ${scenario.participantRolePt}`,
      pedagogyRole: "graded",
    };
  }

  return {
    kind: "dialogue_choice",
    title: scenario.goalPt,
    speaker: scenario.participantRolePt,
    dialoguePrompt: behavior.promptPt,
    options: stableOptions,
    correctAnswer: scenario.expectedHanzi,
    audioText: scenario.npcLineHanzi,
    pinyin: scenario.npcLinePinyin,
    sceneId: scenario.visualSceneId,
    imageId: anchor?.id,
    iconId: anchor?.id,
    everydayScenarioId: scenario.id,
    everydayIntent: scenario.intent,
    realWorldDomain: scenario.domain,
    contextRole: "TARGET",
    learnerAgency: behavior.agency,
    interactionPurpose: "RESPOND",
    humanContext: `${scenario.locationPt} · ${scenario.participantRolePt}`,
    pedagogyRole: "graded",
  };
}

function miniDialoguePair(scenario: EverydayScenario): LessonStep[] {
  if (!scenario.npcLineHanzi || scenario.intent !== "RESPOND_STATE") return [];
  return [
    {
      kind: "dialogue_completion",
      title: "Mini conversa",
      speaker: scenario.participantRolePt,
      dialoguePrompt: `NPC: ${scenario.npcLineHanzi}\nVocê: ___`,
      correctAnswer: scenario.expectedHanzi,
      accepts: [scenario.expectedHanzi, ...(scenario.acceptableAlternatives ?? [])],
      options: [scenario.expectedHanzi, "再见", "多少钱？", "谢谢"],
      everydayScenarioId: scenario.id,
      everydayIntent: scenario.intent,
      realWorldDomain: scenario.domain,
      contextRole: "TARGET",
      learnerAgency: "COMPLETE",
      interactionPurpose: "CONVERSE",
      humanContext: "pergunta → resposta",
      pedagogyRole: "graded",
    },
  ];
}

export function applyEverydayMandarinToPlan(input: {
  lessonId: string;
  masteryPass: number;
  unitIndex?: number;
  steps: LessonStep[];
  taughtHanzi?: readonly string[];
}): EverydayPlanResult {
  const unitIndex = input.unitIndex ?? 0;
  const taught = new Set(input.taughtHanzi ?? []);
  let steps = [...input.steps];
  let annotated = 0;
  let humanizedPrompts = 0;
  let injectedScenarios = 0;
  let injectedDialogueCompletions = 0;
  let contextLeaks = 0;
  let curriculumLeaks = 0;

  // 1) Annotate + humanize existing steps
  steps = steps.map((step) => {
    let next = step;
    if (!hasMetadata(next)) {
      const meta = inferEverydayIntentFromText(blobOf(next));
      next = annotateStep(next, meta);
      annotated += 1;
    }
    const humanized = humanizeTranslationPrompt(next, input.masteryPass);
    if (humanized) {
      humanizedPrompts += 1;
      next = humanized;
      if (!hasMetadata(next) || next.everydayIntent === "UNKNOWN" || next.everydayIntent === "METALINGUISTIC") {
        next = annotateStep(next, inferEverydayIntentFromText(blobOf(next)));
      }
    }
    for (const f of assessEverydayContextQuality(next, input.masteryPass)) {
      if (f.code === "CONTEXT_LEAKS_EXPECTED_ANSWER" && f.level === "ERROR") contextLeaks += 1;
    }
    return next;
  });

  // 2) Contextual reuse marks (你好 as tool, not target)
  const reuse = markContextualReuse(steps);
  steps = reuse.steps;

  // 3) Inject everyday scenario when session is too metalinguistic / lacks human response
  const humanCount = steps.filter((s) => intentIsCommunicative((s.everydayIntent as EverydayIntent) || "UNKNOWN")).length;
  const hasDialogue = steps.some((s) => /dialogue|conversation/.test(s.kind));
  const available = scenariosForUnit(unitIndex, input.masteryPass).filter((s) => {
    const leak = detectEverydayCurriculumLeak({
      scenario: s,
      taughtHanzi: taught.size ? taught : new Set(s.prerequisiteHanzi ?? [s.expectedHanzi]),
      allowDiscoveryIntro: input.masteryPass === 1 && taught.size === 0,
    });
    if (leak) {
      curriculumLeaks += 1;
      return taught.size === 0; // early sessions: allow if no taught map yet (discovery window)
    }
    return true;
  });

  const abstractFoundation = /^p1-o-que-e-(mandarim|pinyin|tom|hanzi)$/.test(input.lessonId);
  if (available.length && (humanCount < 2 || !hasDialogue || input.masteryPass >= 3)) {
    // Prefer greet on early foundation; otherwise domain-matched
    let pick =
      available.find((s) => abstractFoundation && s.intent === "GREET") ||
      available.find((s) => s.intent === "RESPOND_STATE" && input.masteryPass >= 2) ||
      available[0];
    if (pick && !steps.some((s) => s.everydayScenarioId === pick.id)) {
      const injected = buildScenarioStep(pick, input.masteryPass, input.lessonId);
      // Insert after intro/discovery head
      const head = steps.findIndex((s) => s.pedagogyRole !== "discovery" && s.kind !== "intro");
      const at = head < 0 ? steps.length : Math.min(head + 1, steps.length);
      steps = [...steps.slice(0, at), injected, ...steps.slice(at)];
      injectedScenarios += 1;
      if (input.masteryPass >= 2 && pick.intent === "RESPOND_STATE") {
        const pair = miniDialoguePair(pick);
        if (pair.length) {
          steps = [...steps.slice(0, at + 1), ...pair, ...steps.slice(at + 1)];
          injectedDialogueCompletions += pair.length;
        }
      }
    }
  }

  // 4) Pass 3/4: if no production, convert one dialogue_choice to dialogue_completion when possible
  if (input.masteryPass >= 3) {
    const productionShare = steps.filter((s) => isProductionKind(s.kind)).length / Math.max(1, steps.length);
    if (productionShare < 0.15) {
      const idx = steps.findIndex((s) => s.kind === "dialogue_choice" && s.correctAnswer);
      if (idx >= 0) {
        const s = steps[idx];
        steps[idx] = {
          ...s,
          kind: "dialogue_completion",
          learnerAgency: input.masteryPass >= 4 ? "TRANSFER" : "PRODUCE",
          options: input.masteryPass >= 4 ? undefined : s.options,
          interactionPurpose: input.masteryPass >= 4 ? "TRANSFER" : "RESPOND",
        };
        injectedDialogueCompletions += 1;
      }
    }
  }

  return {
    steps,
    annotated,
    humanizedPrompts,
    injectedScenarios,
    injectedDialogueCompletions,
    contextLeaks,
    curriculumLeaks,
    contextualReuseMarks: reuse.marked,
  };
}
