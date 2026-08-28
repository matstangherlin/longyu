/**
 * Copy da revisão imediata pós-erro / recuperação de estrela.
 * Tom: acolhedor, curto, objetivo — apoio real, sem culpa e sem dump.
 */

import { t } from "../../i18n/catalog";

export type ReviewPhase = "offer" | "review" | "last_chance" | "summary" | "recovered";

export function reviewModeLabel(args: {
  canRecover: boolean;
  isLastItem: boolean;
}): string {
  if (args.isLastItem && args.canRecover) return t("player.almostThere");
  if (args.canRecover) return t("player.support");
  return t("review.title");
}

export function reviewProgressLabel(index: number, total: number): string {
  return t("player.ofTotal", { index: index + 1, total });
}

export function reviewGoalLine(args: {
  canRecover: boolean;
  isLastItem: boolean;
  remaining: number;
}): string | undefined {
  if (!args.canRecover) {
    return args.isLastItem ? t("review.lastItem") : undefined;
  }
  if (args.isLastItem) {
    return t("review.lastStar");
  }
  return t("review.starReturns");
}

export const REVIEW_OFFER = {
  get eyebrow() {
    return t("review.offerEyebrow");
  },
  score: (correct: number, total: number) => t("review.score", { correct, total }),
  title: (count: number, canRecover: boolean) =>
    canRecover
      ? count === 1
        ? t("review.offerOneTogether")
        : t("review.offerManyTogether", { count })
      : count === 1
        ? t("review.offerOneAsk")
        : t("review.offerManyAsk", { count }),
  supportLine: (canRecover: boolean) =>
    canRecover ? t("review.offerSupportRecover") : t("review.offerSupport"),
  get ctaPrimary() {
    return t("player.continue");
  },
  get ctaLater() {
    return t("review.offerCtaLater");
  },
};

export const REVIEW_QUESTION = {
  get eyebrow() {
    return t("review.questionEyebrow");
  },
  get doNowChoice() {
    return t("review.doNowChoice");
  },
  get doNowBuild() {
    return t("review.doNowBuild");
  },
  get feedbackOk() {
    return t("review.feedbackOk");
  },
  get feedbackRetry() {
    return t("review.feedbackRetry");
  },
  get correctLabel() {
    return t("review.correctLabel");
  },
  get ctaContinue() {
    return t("player.continue");
  },
  get ctaResult() {
    return t("review.ctaResult");
  },
  get ctaCheck() {
    return t("review.ctaCheck");
  },
};

export const REVIEW_SUMMARY = {
  get titleOk() {
    return t("review.summaryOk");
  },
  get titlePartial() {
    return t("review.summaryPartial");
  },
  get bodyOk() {
    return t("review.bodyOk");
  },
  bodyPartial: (remaining: number) =>
    remaining === 1 ? t("review.lastStar") : t("journey.remainingMany", { n: remaining }),
  get correctedLabel() {
    return t("review.summaryOk");
  },
  get remainingLabel() {
    return t("review.summaryPartial");
  },
  get ctaRetry() {
    return t("review.continueReview");
  },
  get ctaRetryLesson() {
    return t("review.redoLesson");
  },
  get ctaContinueTwo() {
    return t("review.continueTwoStars");
  },
  get ctaContinue() {
    return t("player.continue");
  },
};

export const REVIEW_RECOVERED = {
  get banner() {
    return t("review.recoveredBanner");
  },
};
