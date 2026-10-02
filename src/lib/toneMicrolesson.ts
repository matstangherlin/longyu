/**
 * RC2.2.23 — microaula de tom: UM conceito por tela, na ordem
 *
 *   VER → OUVIR → IMITAR → DISCRIMINAR → RECONHECER → USAR EM PALAVRA → USAR EM CONTEXTO
 *
 * Tom é altura da voz ao longo do tempo (pitch). Nada aqui explica tom por
 * posição de língua/boca — articulação é outro sistema (articulationTargets).
 * Não existe medição de pitch: IMITAR é "repita em voz alta", sem nota.
 *
 * Só apresentação: usa o que já existe em toneKnowledge + toneTrainer, sem
 * conteúdo novo de currículo e sem novo motor.
 */
import { toneGuidance, toneKnowledge, type MandarinToneNumber } from "../data/toneKnowledge";
import { TONE_TRAINER_PACKS, TONE_SHORT_LABEL, type MandarinTone } from "../data/toneTrainer";

// RC2.2.24 — + TRACE (rastrear o contorno com o dedo) depois de OUVIR.
export const TONE_MICROLESSON_STAGES = ["SEE", "HEAR", "TRACE", "IMITATE", "DISCRIMINATE", "RECOGNIZE", "USE_WORD", "USE_CONTEXT"] as const;
export type ToneMicrolessonStage = (typeof TONE_MICROLESSON_STAGES)[number];

/** O único conceito que a tela ensina/pede. */
export type ToneScreenConcept = "contour" | "sound" | "trace" | "imitation" | "contrast" | "recognition" | "word" | "context";

export interface ToneSample {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
}

export interface ToneMicrolessonScreen {
  stage: ToneMicrolessonStage;
  concept: ToneScreenConcept;
  tone: MandarinToneNumber;
  /** Uma frase curta (nunca parágrafo). */
  line: string;
  sample: ToneSample | null;
  /** DISCRIMINATE/RECOGNIZE: as opções (sempre 2 — o tom e um contraste). */
  choices?: MandarinToneNumber[];
}

/** Uma tela, uma frase: acima disso vira bloco. */
export const TONE_SCREEN_MAX_CHARS = 90;
/** Pitch explicado por língua/boca é proibido nas telas de tom. */
export const TONGUE_FOR_PITCH = /\b(l[íi]ngua|boca|dentes|tongue|mouth|teeth)\b/i;

const CONTRAST: Record<MandarinToneNumber, MandarinToneNumber> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 1 };

function roundsFor(tone: MandarinToneNumber) {
  return TONE_TRAINER_PACKS.filter((pack) => pack.kind !== "consonant").flatMap((pack) => pack.rounds).filter((round) => round.answerTone === (tone as MandarinTone));
}

function sampleFrom(round: { audioText: string; pinyin: string; meaningPt: string } | undefined): ToneSample | null {
  return round ? { hanzi: round.audioText, pinyin: round.pinyin, meaningPt: round.meaningPt } : null;
}

/** Palavra real e frase real com esse tom, tiradas dos packs que já existem. */
export function toneSamples(tone: MandarinToneNumber): { canonical: ToneSample; word: ToneSample | null; context: ToneSample | null } {
  const knowledge = toneKnowledge(tone);
  const rounds = roundsFor(tone);
  const single = (text: string) => [...text].length === 1;
  const word = rounds.find((round) => round.kind === "word" && single(round.audioText)) ?? rounds.find((round) => round.kind === "word");
  const context = rounds.find((round) => [...round.audioText].length >= 2 && round.audioText !== word?.audioText);
  return {
    canonical: { hanzi: knowledge.canonicalExample.hanzi, pinyin: knowledge.canonicalExample.pinyin, meaningPt: rounds.find((round) => round.audioText === knowledge.canonicalExample.hanzi)?.meaningPt ?? "" },
    word: sampleFrom(word),
    context: sampleFrom(context),
  };
}

export function buildToneMicrolesson(tone: MandarinToneNumber): ToneMicrolessonScreen[] {
  const guidance = toneGuidance(tone);
  const samples = toneSamples(tone);
  const label = TONE_SHORT_LABEL[tone as MandarinTone];
  const contrast = CONTRAST[tone];
  const screens: ToneMicrolessonScreen[] = [
    { stage: "SEE", concept: "contour", tone, line: `${label}: ${firstSentence(guidance.guidedPt)}`, sample: null },
    { stage: "HEAR", concept: "sound", tone, line: "Ouça o movimento da voz.", sample: samples.canonical },
    { stage: "TRACE", concept: "trace", tone, line: "Passe o dedo pela forma do tom.", sample: null },
    { stage: "IMITATE", concept: "imitation", tone, line: `${guidance.gesturePt} Repita em voz alta.`, sample: samples.canonical },
    { stage: "DISCRIMINATE", concept: "contrast", tone, line: "Qual contorno você ouviu?", sample: samples.canonical, choices: shuffleTwo(tone, contrast) },
    { stage: "RECOGNIZE", concept: "recognition", tone, line: `Qual é o ${label}?`, sample: null, choices: shuffleTwo(contrast, tone) },
  ];
  if (samples.word) screens.push({ stage: "USE_WORD", concept: "word", tone, line: "O mesmo tom numa palavra real.", sample: samples.word });
  if (samples.context) screens.push({ stage: "USE_CONTEXT", concept: "context", tone, line: "Agora dentro de uma frase.", sample: samples.context });
  return screens;
}

function firstSentence(text: string): string {
  const match = /^[^.!?]*[.!?]/.exec(text);
  return (match ? match[0] : text).trim();
}

/** Ordem estável (sem aleatório): a resposta nem sempre na mesma posição. */
function shuffleTwo(a: MandarinToneNumber, b: MandarinToneNumber): MandarinToneNumber[] {
  return (a + b) % 2 === 0 ? [a, b] : [b, a];
}

/** Lint de tela: um conceito, frase curta, sem língua explicando pitch. */
export function toneScreenViolations(screen: ToneMicrolessonScreen): string[] {
  const out: string[] = [];
  if (screen.line.length > TONE_SCREEN_MAX_CHARS) out.push("TONE_SCREEN_TOO_LONG");
  if (TONGUE_FOR_PITCH.test(screen.line)) out.push("PITCH_EXPLAINED_BY_TONGUE");
  const concepts = (screen as unknown as { concepts?: unknown[] }).concepts;
  if (Array.isArray(concepts) && concepts.length > 1) out.push("TONE_SCREEN_MULTIPLE_CONCEPTS");
  if ((screen.stage === "DISCRIMINATE" || screen.stage === "RECOGNIZE") && (screen.choices?.length ?? 0) !== 2) out.push("TONE_SCREEN_CHOICE_COUNT");
  return out;
}

/** Tons que o pack pede e que o aluno ainda não viu em nenhum pack. */
export function tonesNeedingMicrolesson(packOptions: readonly MandarinTone[], progress: Record<string, { attempts: number }>): MandarinToneNumber[] {
  const practiced = new Set<number>();
  for (const pack of TONE_TRAINER_PACKS) {
    if (pack.kind === "consonant" || !progress[pack.id]?.attempts) continue;
    for (const tone of pack.options) practiced.add(tone);
  }
  return packOptions.filter((tone) => tone !== 5 && !practiced.has(tone)).map((tone) => tone as MandarinToneNumber);
}
