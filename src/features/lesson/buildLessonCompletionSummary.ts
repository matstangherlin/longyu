/**
 * Resumo determinístico do fim de lição. Sem LLM.
 * Destaca um ponto forte e no máximo um foco — nunca um apelo genérico
 * para continuar estudando quando há evidência específica.
 */
export type LessonCompletionSkill = "tone" | "hanzi" | "listening" | "conversation" | "production" | "other";

export type LessonCompletionSummaryInput = {
  accuracy: number;
  errorCount: number;
  assistanceCount?: number;
  mistakesBySkill?: Partial<Record<LessonCompletionSkill, number>>;
  displayName?: string;
  locale?: "pt" | "en";
};

export type LessonCompletionSummary = {
  highlight: string;
  focus?: string;
  greeting?: string;
  perfect: boolean;
  /**
   * RC1.1 P14.4 — houve evidência positiva real por trás do destaque?
   *
   * Quando não houve, `highlight` é uma constatação neutra ("Você concluiu a
   * prática") e a tela não deve rotulá-la como "Ponto forte". Elogiar 20% de
   * precisão como ponto forte é o tipo de frase que ensina o aluno a não
   * confiar no que o app diz.
   */
  hasRealStrength: boolean;
};

const COPY = {
  pt: {
    perfectHighlight: "Você acertou tudo nesta sessão.",
    accuracyHighlight: "Precisão de {n}%.",
    conversationHighlight: "A conversa saiu com as suas palavras.",
    listeningHighlight: "O ouvido segurou as falas.",
    productionHighlight: "Você produziu a frase sem copiar alternativas.",
    toneFocus: "Tons: vale ouvir de novo o contorno.",
    hanziFocus: "Hànzì: releia a forma antes da próxima fala.",
    listeningFocus: "Escuta: o próximo passo é ouvir sem ler.",
    conversationFocus: "Conversa: tente a próxima fala com menos ajuda.",
    productionFocus: "Produção: diga de novo sem montar as peças.",
    greeting: "Mandou bem, {name}!",
    neutralHighlight: "Você concluiu a prática.",
    lowAccuracyFocus: "Refaça esta prática antes de seguir.",
  },
  en: {
    perfectHighlight: "You got everything right in this session.",
    accuracyHighlight: "{n}% accuracy.",
    conversationHighlight: "The conversation used your own words.",
    listeningHighlight: "Your ear held the lines.",
    productionHighlight: "You produced the phrase without copying choices.",
    toneFocus: "Tones: listen to the contour again.",
    hanziFocus: "Hànzì: check the shape before the next line.",
    listeningFocus: "Listening: next, hear it without reading.",
    conversationFocus: "Conversation: try the next line with less help.",
    productionFocus: "Production: say it again without the pieces.",
    greeting: "Nice work, {name}!",
    neutralHighlight: "You finished the practice.",
    lowAccuracyFocus: "Redo this practice before moving on.",
  },
} as const;

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function buildLessonCompletionSummary(input: LessonCompletionSummaryInput): LessonCompletionSummary {
  const locale = input.locale === "en" ? "en" : "pt";
  const copy = COPY[locale];
  const accuracy = Math.max(0, Math.min(100, Math.round(input.accuracy)));
  const mistakes = input.mistakesBySkill ?? {};
  const perfect = accuracy >= 100 && input.errorCount <= 0;
  const name = input.displayName?.trim().split(/\s+/)[0];
  const greeting = name && !["Aluno", "Novo", "Student"].includes(name) ? fill(copy.greeting, { name }) : undefined;

  // P14.6 — o destaque só existe quando há evidência positiva real.
  //
  // O default antigo era "Precisão de {n}%", o que produzia
  // "Ponto forte: precisão de 20%" — um elogio que contradiz o próprio número
  // exibido ao lado. Agora uma sessão ruim recebe uma constatação neutra, e o
  // que orienta o aluno é o foco.
  const MIN_STRENGTH_ACCURACY = 70;
  let highlight: string = copy.neutralHighlight;
  let hasRealStrength = false;

  if (perfect) {
    highlight = copy.perfectHighlight;
    hasRealStrength = true;
  } else if (accuracy >= MIN_STRENGTH_ACCURACY) {
    hasRealStrength = true;
    if ((mistakes.conversation ?? 0) === 0 && (mistakes.production ?? 0) === 0) {
      highlight = copy.conversationHighlight;
    } else if ((mistakes.listening ?? 0) === 0) {
      highlight = copy.listeningHighlight;
    } else if ((mistakes.production ?? 0) === 0) {
      highlight = copy.productionHighlight;
    } else {
      highlight = fill(copy.accuracyHighlight, { n: accuracy });
    }
  }

  if (perfect) {
    return { highlight, greeting, perfect: true, hasRealStrength: true };
  }

  const ranked: Array<[LessonCompletionSkill, string]> = [
    ["tone", copy.toneFocus],
    ["hanzi", copy.hanziFocus],
    ["listening", copy.listeningFocus],
    ["conversation", copy.conversationFocus],
    ["production", copy.productionFocus],
  ];
  const skillFocus = ranked
    .filter(([skill]) => (mistakes[skill] ?? 0) > 0)
    .sort((a, b) => (mistakes[b[0]] ?? 0) - (mistakes[a[0]] ?? 0))[0]?.[1];

  // P14.5 — uma sessão ruim sempre sai com um foco. Quando não há detalhe por
  // habilidade para apontar (sessão sem `mistakesBySkill`), o foco honesto é o
  // único fato disponível: a prática precisa ser refeita. Inventar
  // "tons" ou "hànzì" sem evidência seria o mesmo erro do elogio falso.
  const focus = skillFocus ?? (accuracy < MIN_STRENGTH_ACCURACY ? copy.lowAccuracyFocus : undefined);

  return { highlight, focus, greeting, perfect: false, hasRealStrength };
}
