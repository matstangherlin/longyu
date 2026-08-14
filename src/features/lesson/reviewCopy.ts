/**
 * Copy da revisão imediata pós-erro / recuperação de estrela.
 * Tom: acolhedor, curto, objetivo — apoio real, sem culpa e sem dump.
 */

export type ReviewPhase = "offer" | "review" | "last_chance" | "summary" | "recovered";

export function reviewModeLabel(args: {
  canRecover: boolean;
  isLastItem: boolean;
}): string {
  if (args.isLastItem && args.canRecover) return "Quase lá";
  if (args.canRecover) return "Apoio";
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
    return "Último passo — acerte e a 3ª estrela volta.";
  }
  return "Revise com calma: a 3ª estrela volta se você acertar.";
}

export const REVIEW_OFFER = {
  eyebrow: "Revisão da lição",
  score: (correct: number, total: number) => `Você acertou ${correct} de ${total}`,
  title: (count: number, canRecover: boolean) =>
    canRecover
      ? count === 1
        ? "Um ponto para firmar. Vamos juntos?"
        : `${count} pontos para firmar. Vamos juntos?`
      : count === 1
        ? "Um ponto para firmar. Quer revisar agora?"
        : `${count} pontos para firmar. Quer revisar agora?`,
  /** Uma linha só — a oferta antiga tinha 3 cards redundantes. */
  supportLine: (canRecover: boolean) =>
    canRecover
      ? "Só o que travou, com mais apoio do que na lição. Acerte e recupera a 3ª estrela."
      : "Só o que travou — curto, no mesmo contexto, com mais apoio.",
  // A prática extra é OPCIONAL: concluir a lição já libera a próxima. Antes o
  // botão cheio era "Começar revisão" e o avanço ficava no botão discreto, o
  // que fazia a repetição parecer obrigatória.
  ctaPrimary: "Continuar",
  ctaLater: "Praticar o que travou",
} as const;

export const REVIEW_QUESTION = {
  eyebrow: "Revisão",
  doNowChoice: "Toque na resposta certa.",
  doNowBuild: "Monte com as peças — é mais fácil que digitar do zero.",
  feedbackOk: "Isso mesmo!",
  feedbackRetry: "Quase — veja a resposta certa.",
  correctLabel: "Resposta certa",
  ctaContinue: "Continuar",
  ctaResult: "Ver resultado",
  ctaCheck: "Verificar",
} as const;

export const REVIEW_SUMMARY = {
  titleOk: "Pronto — você firmou estes pontos",
  titlePartial: "Ainda falta um pouco",
  bodyOk: "Você corrigiu tudo desta tentativa. Bom trabalho.",
  bodyPartial: (remaining: number) =>
    remaining === 1
      ? "Falta 1 item. Pode tentar de novo quando quiser a 3ª estrela."
      : `Faltam ${remaining} itens. Pode tentar de novo quando quiser a 3ª estrela.`,
  correctedLabel: "Firmados",
  remainingLabel: "Ainda falta",
  ctaRetry: "Continuar revisão",
  ctaRetryLesson: "Refazer lição",
  ctaContinueTwo: "Continuar com 2 estrelas",
  ctaContinue: "Continuar",
} as const;

export const REVIEW_RECOVERED = {
  banner: "3 estrelas recuperadas — ótimo trabalho.",
} as const;
