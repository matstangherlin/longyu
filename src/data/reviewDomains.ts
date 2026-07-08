import type { ReviewDomain } from "../lib/srs";

export const REVIEW_DOMAIN_ORDER: ReviewDomain[] = ["som", "pinyin", "fala", "significado", "forma", "uso", "leitura"];

export const REVIEW_DOMAIN_META: Record<
  ReviewDomain,
  {
    label: string;
    shortLabel: string;
    helper: string;
    cardLabel: string;
    weaknessLabel: string;
  }
> = {
  som: {
    label: "Som",
    shortLabel: "Som",
    helper: "Ouça e tente lembrar o pinyin, o tom e a pronúncia.",
    cardLabel: "Áudio -> pinyin/tom",
    weaknessLabel: "som e tom",
  },
  fala: {
    label: "Fala",
    shortLabel: "Fala",
    helper: "Produza em voz alta antes de revelar. O foco é lembrar e falar, não só reconhecer.",
    cardLabel: "Português -> mandarim",
    weaknessLabel: "fala ativa",
  },
  pinyin: {
    label: "Pinyin",
    shortLabel: "Pinyin",
    helper: "Veja o hànzì ou ouça o áudio e escolha o pinyin correto.",
    cardLabel: "Hànzì -> pinyin",
    weaknessLabel: "pinyin e tom escrito",
  },
  significado: {
    label: "Significado",
    shortLabel: "Significado",
    helper: "Veja o mandarim e diga o significado em português.",
    cardLabel: "Mandarim -> significado",
    weaknessLabel: "significado",
  },
  forma: {
    label: "Forma",
    shortLabel: "Forma",
    helper: "Veja a pista e reconstrua o Hànzì ou a frase.",
    cardLabel: "Pista -> forma",
    weaknessLabel: "forma visual",
  },
  uso: {
    label: "Uso",
    shortLabel: "Uso",
    helper: "Parta do português e tente produzir uma resposta natural.",
    cardLabel: "Situação -> resposta",
    weaknessLabel: "uso em frase",
  },
  leitura: {
    label: "Leitura",
    shortLabel: "Leitura",
    helper: "Reconheça o item dentro de uma frase, com menos dependência do pinyin.",
    cardLabel: "Frase -> compreensão",
    weaknessLabel: "leitura em contexto",
  },
};
