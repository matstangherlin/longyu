export const COURSE_PROFILE = {
  productName: "Longyu",
  targetLanguage: {
    code: "zh-CN",
    name: "Mandarim",
    nativeName: "中文",
  },
  sourceLanguage: {
    code: "pt-BR",
    name: "Português do Brasil",
    shortName: "PT-BR",
  },
  futureSourceLanguages: [
    {
      code: "en",
      name: "Inglês",
      shortName: "EN",
    },
  ],
  tagline: "Mandarim para brasileiros, pela lógica",
  shortTagline: "PT-BR → Mandarim",
  learningPromise:
    "Som primeiro, fala em blocos, hànzì em camadas e leitura guiada.",
} as const;

export type CourseProfile = typeof COURSE_PROFILE;
