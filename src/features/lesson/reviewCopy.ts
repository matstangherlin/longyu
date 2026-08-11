/**
 * Copy da revisão imediata pós-erro / recuperação de estrela.
 * Tom: acolhedor, curto, objetivo — sem culpa e sem debug.
 */

export type ReviewPhase = "offer" | "review" | "last_chance" | "summary" | "recovered";

export function reviewModeLabel(args: {
  canRecover: boolean;
  isLastItem: boolean;
}): string {
  if (args.isLastItem && args.canRecover) return "Última chance";
  if (args.canRecover) return "Recuperação";
  return "Revisão";
}

export function reviewProgressLabel(index: number, total: number): string {
  return `${index + 1} de ${total}`;
}

export function reviewGoalLine(args: {
  canRecover: boolean;
  isLastItem: boolean;
  remaining: number;
}): string | undefined {
  if (!args.canRecover) {
    return args.isLastItem ? "Último item desta revisão." : undefined;
  }
  if (args.isLastItem) {
    return "Último item — acerte para recuperar a 3ª estrela.";
  }
  return "Acerte todos para recuperar a 3ª estrela.";
}

export const REVIEW_OFFER = {
  eyebrow: "Revisão da lição",
  score: (correct: number, total: number) => `Você acertou ${correct} de ${total}`,
  title: (count: number, canRecover: boolean) =>
    canRecover
      ? count === 1
        ? "Um item ficou para trás. Vamos recuperar juntos."
        : `${count} itens ficaram para trás. Vamos recuperar juntos.`
      : count === 1
        ? "Um item ficou para trás. Quer revisar agora?"
        : `${count} itens ficaram para trás. Quer revisar agora?`,
  happened: "O que aconteceu: você chegou perto, mas alguns pontos ainda travaram.",
  nextStep: "O que fazer agora: revisar só o que errou — curto e no mesmo contexto.",
  goalRecover: "Objetivo: acertar todos e recuperar a 3ª estrela.",
  goalReview: "Objetivo: firmar o que ainda está inseguro.",
  ctaPrimary: "Começar revisão",
  ctaLater: "Continuar com 2 estrelas",
} as const;

export const REVIEW_QUESTION = {
  eyebrow: "Revisão",
  doNowChoice: "Escolha a resposta certa.",
  doNowBuild: "Monte a resposta com as peças.",
  feedbackOk: "Isso mesmo!",
  feedbackRetry: "Quase — veja a resposta certa.",
  correctLabel: "Resposta certa",
  ctaContinue: "Continuar",
  ctaResult: "Ver resultado",
  ctaCheck: "Verificar",
} as const;

export const REVIEW_SUMMARY = {
  titleOk: "Revisão concluída",
  titlePartial: "Ainda falta um pouco",
  bodyOk: "Você corrigiu tudo desta tentativa.",
  bodyPartial: (remaining: number) =>
    remaining === 1
      ? "Falta 1 item. Você pode tentar de novo para buscar a 3ª estrela."
      : `Faltam ${remaining} itens. Você pode tentar de novo para buscar a 3ª estrela.`,
  correctedLabel: "Corrigidos",
  remainingLabel: "Ainda falta",
  ctaRetry: "Continuar revisão",
  ctaRetryLesson: "Refazer lição",
  ctaContinueTwo: "Continuar com 2 estrelas",
  ctaContinue: "Continuar",
} as const;

export const REVIEW_RECOVERED = {
  banner: "3 estrelas recuperadas — ótimo trabalho.",
} as const;
