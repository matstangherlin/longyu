/**
 * RC1.3 · P16/P18 — ensinar o par ANTES de cobrar.
 *
 * A auditoria (P14) achou o buraco em `p1-o-que-e-tom`: a aula abre com quatro
 * passos `tone` — identificar o tom de 妈, 马, 麻 e 骂 — e só no passo 6 um
 * `match_pairs` finalmente mostra que 妈 é mãe e 马 é cavalo. Ou seja: o teste
 * tonal vem ANTES da apresentação do par (mutação 20), e o aluno é cobrado sobre
 * palavras cujo significado ainda não viu.
 *
 * A correção nunca mexe no currículo. `src/data/journey.ts` está congelado nesta
 * remessa (fingerprint 38e70062857d) e reescrever passos autorais mudaria o
 * hash. O contrato de ensino entra em RUNTIME: antes do primeiro item pontuado
 * que cobra um contraste, inserimos um cartão de ensino (`intro`, portanto não
 * pontuado) que apresenta os dois membros com hànzì, pinyin, tom, significado,
 * contorno e áudio — exatamente o que P16.1/P16.3/P17 pedem.
 *
 * Se o par já for ensinado antes do teste na própria aula, nada é inserido: o
 * enriquecimento corrige o que falta, não duplica o que existe.
 */

import type { Lesson, LessonStep } from "../../data/journey";
import {
  TONE_CONTRAST_SETS,
  toneContrastSetsForLesson,
  type ToneContrastSet,
} from "../../data/toneContrastSets";

declare module "../../data/journey" {
  interface LessonStep {
    /**
     * RC1.3 — cartão de contraste tonal. Vive só no plano em runtime; o passo
     * autoral no catálogo nunca carrega este campo (currículo congelado).
     */
    toneContrastSetId?: string;
    /** P19.1 — o passo demonstra vocabulário `contrastOnly`: não conta mastery. */
    toneContrastOnly?: boolean;
  }
}

const TEACHING_KINDS = new Set(["intro", "listen"]);

function stepMentions(step: LessonStep, hanzi: string): boolean {
  const surfaces = [
    step.hanzi,
    step.text,
    step.audioText,
    step.prompt,
    step.body,
    step.title,
    step.explanation,
    step.correctAnswer,
    ...(step.options ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ];
  return surfaces.some((surface) => typeof surface === "string" && surface.includes(hanzi));
}

/** O passo ensina o membro (apresenta com significado), em vez de cobrá-lo? */
function teachesMember(step: LessonStep, hanzi: string, meaningPt: string, setId?: string): boolean {
  // O cartão de contraste ensina AMBOS os membros por definição: é ele que
  // mostra hànzì, pinyin, tom, significado, contorno e áudio dos dois.
  if (setId && step.toneContrastSetId === setId) return true;
  if (!TEACHING_KINDS.has(step.kind) && step.kind !== "match_pairs") return false;
  if (!stepMentions(step, hanzi)) return false;
  if (step.kind === "listen") {
    // `listen` com tradução é apresentação completa: som + forma + sentido.
    return Boolean(step.pt);
  }
  if (step.kind === "match_pairs") {
    return (step.pairs ?? []).some(
      (pair) => pair.left === hanzi || pair.right.toLowerCase().includes(meaningPt.toLowerCase())
    );
  }
  return true;
}

/** O passo COBRA o membro em algo pontuado? */
function testsMember(step: LessonStep, hanzi: string): boolean {
  if (TEACHING_KINDS.has(step.kind)) return false;
  return stepMentions(step, hanzi);
}

export interface ToneContrastGap {
  lessonId: string;
  setId: string;
  /** Índice do primeiro passo pontuado que cobra o contraste. */
  firstTestIndex: number;
  /** Índice do passo que ensina o par por completo, ou -1. */
  teachIndex: number;
}

/**
 * P16 / mutação 20 — onde o teste tonal chega antes da apresentação do par.
 *
 * Um contraste está "ensinado" quando os DOIS membros já apareceram com
 * significado antes do primeiro item pontuado que cobra qualquer um deles.
 */
export function findToneContrastGaps(lessonId: string, steps: readonly LessonStep[]): ToneContrastGap[] {
  const gaps: ToneContrastGap[] = [];
  for (const set of toneContrastSetsForLesson(lessonId)) {
    let taughtA = -1;
    let taughtB = -1;
    let firstTest = -1;
    steps.forEach((step, index) => {
      if (taughtA < 0 && teachesMember(step, set.a.hanzi, set.a.meaningPt, set.id)) taughtA = index;
      if (taughtB < 0 && teachesMember(step, set.b.hanzi, set.b.meaningPt, set.id)) taughtB = index;
      if (firstTest < 0 && (testsMember(step, set.a.hanzi) || testsMember(step, set.b.hanzi))) {
        firstTest = index;
      }
    });
    if (firstTest < 0) continue;
    const teachIndex = taughtA >= 0 && taughtB >= 0 ? Math.max(taughtA, taughtB) : -1;
    if (teachIndex >= 0 && teachIndex < firstTest) continue;
    gaps.push({ lessonId, setId: set.id, firstTestIndex: firstTest, teachIndex });
  }
  return gaps;
}

/**
 * O cartão de ensino: `intro`, não pontuado, com os dois membros e áudio.
 *
 * Sem `body`: a explicação do contraste já é renderizada DENTRO do cartão, com
 * os dois membros ao lado. Preencher `body` também imprimia o mesmo texto de
 * novo logo abaixo — o QA humano viu a frase duplicada na tela.
 */
export function toneContrastTeachingStep(set: ToneContrastSet): LessonStep {
  return {
    kind: "intro",
    title: `Mesma sílaba, outro tom: ${set.baseSyllable}`,
    toneContrastSetId: set.id,
    // P19.1 — o cartão demonstra; não introduz vocabulário pontuado.
    toneContrastOnly: set.a.contrastOnly === true || set.b.contrastOnly === true,
  } as LessonStep;
}

/**
 * Insere o cartão de ensino antes do primeiro item que cobra o contraste.
 *
 * Devolve o MESMO array quando não há nada a corrigir — o caminho comum não
 * paga nada, e uma aula já correta não ganha um passo a mais.
 */
export function withToneContrastTeaching(
  lesson: Pick<Lesson, "id">,
  steps: readonly LessonStep[]
): LessonStep[] {
  const gaps = findToneContrastGaps(lesson.id, steps);
  if (gaps.length === 0) return steps as LessonStep[];
  // Inserir de trás para frente mantém os índices válidos durante a inserção.
  const ordered = [...gaps].sort((a, b) => b.firstTestIndex - a.firstTestIndex);
  const out = [...steps];
  for (const gap of ordered) {
    const set = TONE_CONTRAST_SETS.find((candidate) => candidate.id === gap.setId);
    if (!set) continue;
    out.splice(gap.firstTestIndex, 0, toneContrastTeachingStep(set));
  }
  return out;
}

/**
 * P18.4 — recall atrasado.
 *
 * Depois de ensinar e testar, o contraste volta MAIS TARDE na mesma aula, com
 * abordagem diferente. Aqui só respondemos "qual abordagem usar agora", para que
 * a repetição não seja o mesmo card três vezes (P22.1).
 */
export type ToneContrastApproach = "audio_to_word" | "word_to_audio" | "audio_to_tone_number";

export function toneContrastApproachForOccurrence(occurrence: number): ToneContrastApproach {
  const ladder: ToneContrastApproach[] = ["audio_to_word", "audio_to_tone_number", "word_to_audio"];
  return ladder[Math.max(0, occurrence - 1) % ladder.length];
}

/**
 * P21.1/P21.2 — o que podemos e o que JAMAIS podemos prometer em fala de tom.
 *
 * Longyu não tem analisador acústico. `SpeechRecognition` devolve texto, não
 * contorno de F0: usá-lo para dizer "seu 3º tom está 87% correto" seria inventar
 * uma medida. Shadowing (ouça → repita → compare) é honesto; nota de pronúncia
 * não é.
 */
export const TONE_SPEAKING_ALLOWED_COPY_PT = [
  "Repita em voz alta.",
  "Compare com o áudio.",
  "Ouça de novo e imite o contorno.",
];

export const TONE_SPEAKING_FORBIDDEN_PATTERNS = [
  /\b\d{1,3}\s*%\s*(correto|certo|accurate|correct)/i,
  /pronúncia perfeita/i,
  /perfect pronunciation/i,
  /nota de pronúncia/i,
  /pronunciation score/i,
  /tone (score|accuracy)/i,
  /seu \d+º tom está/i,
];

export function claimsFakeToneScore(text: string): boolean {
  return TONE_SPEAKING_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}
