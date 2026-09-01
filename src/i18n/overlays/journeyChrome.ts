import type { MasteryLevel, MasteryPass } from "../../data/masteryLoop";
import { clampMasteryLevel } from "../../data/masteryLoop";
import { t, type TranslateVars } from "../catalog";
import { resolveInstructionText } from "./instructionGloss";
import { localizeLessonTitle } from "./localizeLesson";
import type { SupportedLocale } from "../config";
import { getInstructionLocale } from "../instructionLocale";

type TFn = (key: string, vars?: TranslateVars) => string;

const PASS_KEYS: Record<MasteryPass, string> = {
  1: "journey.passDiscovery",
  2: "journey.passConsolidation",
  3: "journey.passProduction",
  4: "journey.passMastery",
};

export function localizedPassLabel(pass: MasteryPass, translate: TFn = t): string {
  return translate(PASS_KEYS[pass]);
}

export function localizedTopicCta(
  level: MasteryLevel,
  inProgress: boolean,
  translate: TFn = t
): { primary: string; secondary?: string } {
  const clamped = clampMasteryLevel(level) as 0 | 1 | 2 | 3 | 4;
  if (clamped >= 4) {
    return { primary: translate("journey.ctaPracticeAgain"), secondary: translate("journey.ctaMastered") };
  }
  if (clamped === 0 && inProgress) {
    return { primary: translate("journey.ctaContinue"), secondary: translate("journey.ctaLessonOf", { n: 1 }) };
  }
  return {
    primary: clamped === 0 ? translate("journey.ctaStart") : translate("journey.ctaContinue"),
    secondary: translate("journey.ctaLessonOf", { n: clamped + 1 }),
  };
}

export function localizedTopicVictory(completedPass: 1 | 2 | 3 | 4, translate: TFn = t) {
  if (completedPass >= 4) {
    return {
      heading: translate("journey.ctaMastered"),
      lessonLine: translate("journey.masteredLine"),
      remainingLine: translate("journey.ctaMastered"),
      mastered: true,
    };
  }
  const remaining = 4 - completedPass;
  return {
    heading: translate("journey.lessonComplete"),
    lessonLine: translate("journey.lessonOfComplete", { n: completedPass }),
    remainingLine: remaining === 1 ? translate("journey.remainingOne") : translate("journey.remainingMany", { n: remaining }),
    mastered: false,
  };
}

export function displayLessonTitle(
  title: string,
  locale: SupportedLocale = getInstructionLocale()
): string {
  return localizeLessonTitle(title, locale);
}

export function displayInstruction(
  text: string | undefined | null,
  locale: SupportedLocale = getInstructionLocale()
): string {
  return resolveInstructionText(text ?? "", locale);
}

export function localizedReviewSessionLabel(
  split: { total: number; today: number },
  translate: TFn = t
): string {
  if (split.total === 0) return translate("hub.caughtUp");
  if (split.today === 1) return translate("review.todayReviewOne");
  return translate("review.todayReviewCount", { n: split.today });
}

export function localizedReviewPendingLabel(
  split: { pending: number },
  translate: TFn = t
): string | null {
  if (split.pending <= 0) return null;
  return translate("review.pendingExtra", { n: split.pending });
}

const UNLOCK_STATIC: Record<string, string> = {
  "Esta área é liberada no Longyu Pro.": "journey.proArea",
  "Próxima lição da Jornada.": "journey.nextLessonReason",
  "Lição não encontrada.": "player.lessonUnavailable",
  "Este conteúdo faz parte do Longyu Pro. A assinatura real será ativada no lançamento.": "journey.contentIsPro",
  "Lição já adquirida; você pode continuar o tema ou praticar.": "journey.lessonAlreadyAcquired",
  "Módulo não encontrado.": "journey.moduleNotFound",
  "Módulo já iniciado.": "journey.moduleAlreadyStarted",
};

/** Display helper for canStartLesson().reason — canonical PT stays in proAccess. */
export function localizeUnlockReason(
  reason: string,
  locale: SupportedLocale = getInstructionLocale(),
  translate: TFn = t
): string {
  if (!reason || locale === "pt-BR") return reason;
  const staticKey = UNLOCK_STATIC[reason];
  if (staticKey) return translate(staticKey);

  let match = reason.match(
    /^Complete as 4 lições de "(.+)" para manter a ordem pedagógica da Jornada\. O Pro abre ferramentas extras, mas a sequência das aulas continua guiada\.$/
  );
  if (match) return translate("journey.completeFourKeepOrder", { title: displayLessonTitle(match[1], locale) });

  match = reason.match(
    /^Conclua as 4 lições de "(.+)" \(e os demais temas da fase (.+)\) para avançar de fase\.$/
  );
  if (match) {
    return translate("journey.completePhase", {
      title: displayLessonTitle(match[1], locale),
      phase: displayInstruction(match[2], locale),
    });
  }

  match = reason.match(/^Conclua os temas da fase (.+) \(4\/4 em cada nó de ensino\) para avançar\.$/);
  if (match) return translate("journey.completePhaseTopics", { phase: displayInstruction(match[1], locale) });

  match = reason.match(/^Conclua "(.+)" com pelo menos 80% de precisão para liberar esta lição\.$/);
  if (match) return translate("journey.completeWithAccuracy", { title: displayLessonTitle(match[1], locale) });

  match = reason.match(/^Conclua as 4 lições de "(.+)" para liberar este tema\.$/);
  if (match) return translate("journey.completeFourUnlock", { title: displayLessonTitle(match[1], locale) });

  return displayInstruction(reason, locale);
}
