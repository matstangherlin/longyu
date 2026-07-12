import type { LessonStep, StepKind } from "../../data/journey";
import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { glossFor } from "../../data/gloss";
import { HANZI_EVOLUTIONS } from "../../data/hanziPedagogy";
import { isNearDuplicatePinyinSet } from "../../lib/pinyin";
import { resolveVisualConcept } from "../../data/visualVocabulary";

// ————————————————————————————————————————————————————————————————
// validateExercise: nenhum passo de lição chega à tela sem passar aqui.
//
// - `errors` bloqueiam a renderização (o StepRenderer mostra um fallback
//   seguro e loga warning em dev, em vez de exibir exercício quebrado);
// - `warnings` não bloqueiam (ex.: hànzì sem gloss — o toque-para-traduzir
//   não abre, mas o exercício continua respondível).
//
// O teste de pular módulo tem seu próprio validador (examBuilder); este
// cobre as lições da jornada e qualquer tela que use StepRenderer.
// ————————————————————————————————————————————————————————————————

export interface ExerciseValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const KNOWN_KINDS: StepKind[] = [
  "intro",
  "listen",
  "tone",
  "comprehend",
  "produce",
  "write",
  "recognize",
  "decompose",
  "flashcard",
  "microread",
  "match_pairs",
  "listen_select",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "dialogue_choice",
  "hanzi_evolution",
  "hanzi_build",
  "tone_pair",
  "image_choice",
];

const CJK_RE = /[㐀-鿿]/u;

function cjkChars(text: string | undefined): string[] {
  if (!text) return [];
  return [...text].filter((ch) => CJK_RE.test(ch));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function findDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) return value;
    seen.add(key);
  }
  return null;
}

// Marca de tom pinyin (macron/caron/agudo/grave sobre a/e/i/o/u/ü). Serve para
// distinguir uma escolha de pinyin de uma escolha de significado (português).
const PINYIN_TONE_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu;
// Rótulo explícito de tom nas opções ("3º tom", "tom 2", "neutro").
const TONE_LABEL_RE = /\b[1-5]\s*º?\s*(?:tom|tone)s?\b|\btom\s*[1-5]\b|neutro/i;

// Uma escolha "treina tom explicitamente" quando o enunciado fala em tom/acento
// ou quando as próprias opções trazem o rótulo do tom ("nǐ hǎo — 3º + 3º tom").
// Nesses casos opções que só diferem no tom são intencionais e permitidas.
function isToneTrainingChoice(step: LessonStep, options: string[]): boolean {
  const label = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""} ${step.speaker ?? ""}`.toLocaleLowerCase(
    "pt-BR"
  );
  if (/\btom\b|\btons\b|\btone\b|\bacento\b/.test(label)) return true;
  return options.some((option) => TONE_LABEL_RE.test(option));
}

// Rede de segurança de renderização: nunca deixa chegar à tela uma escolha de
// pinyin cujas opções só diferem no tom (parecem 4 opções iguais). Se detectar,
// bloqueia com erro (o StepRenderer mostra o fallback seguro e loga em dev).
function checkPinyinLookAlike(errors: string[], step: LessonStep, options: string[]) {
  const toned = options.filter((option) => PINYIN_TONE_MARK_RE.test(option));
  if (toned.length < 3) return; // opções em português (significados) não entram
  if (isToneTrainingChoice(step, options)) return; // treino de tom explícito: ok
  if (isNearDuplicatePinyinSet(options)) {
    errors.push(
      `${step.kind}: opções de pinyin diferem só no tom (parecem iguais) [${options.join(" | ")}]`
    );
  }
}

function checkChoice(
  errors: string[],
  label: string,
  answer: string | undefined,
  options: string[] | undefined
) {
  if (!answer?.trim()) {
    errors.push(`${label}: sem resposta`);
    return;
  }
  if (!options || options.length < 2) {
    errors.push(`${label}: menos de 2 alternativas`);
    return;
  }
  if (options.some((option) => !option?.trim())) {
    errors.push(`${label}: alternativa vazia`);
  }
  const duplicate = findDuplicate(options);
  if (duplicate) errors.push(`${label}: alternativa duplicada "${duplicate}"`);
  if (!options.some((option) => normalize(option) === normalize(answer))) {
    errors.push(`${label}: a resposta "${answer}" não está nas alternativas`);
  }
}

export function validateExercise(step: LessonStep | undefined | null): ExerciseValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!step) {
    return { valid: false, errors: ["passo inexistente"], warnings };
  }
  if (!KNOWN_KINDS.includes(step.kind)) {
    return { valid: false, errors: [`tipo desconhecido: ${String(step.kind)}`], warnings };
  }

  switch (step.kind) {
    case "intro":
      if (!step.title?.trim() && !step.body?.trim()) errors.push("intro sem título e sem corpo");
      break;

    case "listen":
      if (!step.text?.trim()) errors.push("listen sem texto para ouvir");
      break;

    case "tone":
      if (!step.hanzi?.trim()) errors.push("tone sem hanzi");
      if (!step.pinyin?.trim()) errors.push("tone sem pinyin");
      if (!step.tone || step.tone < 1 || step.tone > 4) errors.push("tone com tom inválido");
      break;

    case "comprehend":
      if (!step.hanzi?.trim()) errors.push("comprehend sem estímulo hanzi");
      checkChoice(errors, "comprehend", step.answer, step.options);
      checkPinyinLookAlike(errors, step, step.options ?? []);
      break;

    case "produce": {
      const target = step.target ?? [];
      if (target.length === 0) errors.push("produce sem alvo (target)");
      if (target.some((piece) => !piece?.trim())) errors.push("produce com peça vazia no alvo");
      if (!step.pt?.trim()) errors.push("produce sem enunciado em português");
      // O banco pode omitir ocorrências repetidas: buildPieceTokens completa
      // com ids únicos em runtime (谢谢 monta com duas peças 谢 independentes).
      break;
    }

    case "write": {
      const mode = step.mode ?? "free_reflection";
      if (mode !== "free_reflection" && !step.answer?.trim() && !(step.accepts ?? []).some((a) => a?.trim())) {
        errors.push("write guiado sem resposta nem variantes aceitas");
      }
      break;
    }

    case "recognize":
    case "decompose":
      if (!step.charId) errors.push(`${step.kind} sem charId`);
      else if (!charById[step.charId]) errors.push(`${step.kind}: charId desconhecido "${step.charId}"`);
      break;

    case "hanzi_evolution": {
      const charIds = step.charIds ?? [];
      if (charIds.length === 0) errors.push("hanzi_evolution sem charIds");
      for (const charId of charIds) {
        if (!charById[charId]) errors.push(`hanzi_evolution: charId desconhecido "${charId}"`);
        if (!HANZI_EVOLUTIONS[charId]) errors.push(`hanzi_evolution: sem evolução cadastrada para "${charId}"`);
      }
      break;
    }

    case "flashcard":
      if (!step.chunkId) errors.push("flashcard sem chunkId");
      else if (!chunkById[step.chunkId]) errors.push(`flashcard: chunkId desconhecido "${step.chunkId}"`);
      break;

    case "microread": {
      const lines = step.lines ?? [];
      if (lines.length === 0) errors.push("microread sem linhas");
      for (const line of lines) {
        if (!line.hanzi?.trim() || !line.pinyin?.trim() || !line.pt?.trim()) {
          errors.push(`microread com linha incompleta: "${line.hanzi ?? "?"}"`);
        }
      }
      break;
    }

    case "match_pairs":
    case "tone_pair": {
      const pairs = step.pairs ?? [];
      if (pairs.length < 2) errors.push(`${step.kind} com menos de 2 pares`);
      if (pairs.some((pair) => !pair.left?.trim() || !pair.right?.trim())) {
        errors.push(`${step.kind} com lado vazio`);
      }
      const left = findDuplicate(pairs.map((pair) => pair.left));
      const right = findDuplicate(pairs.map((pair) => pair.right));
      // Lado repetido cria pergunta ambígua (duas ligações corretas possíveis).
      if (left) errors.push(`${step.kind}: lado esquerdo repetido "${left}"`);
      if (right) errors.push(`${step.kind}: lado direito repetido "${right}"`);
      break;
    }

    case "listen_select": {
      const answer = step.correctAnswer ?? step.answer;
      const audio = step.audioText ?? answer;
      if (!audio?.trim()) errors.push("listen_select sem áudio (audioText/resposta)");
      const options = [...(step.options ?? []), ...(step.distractors ?? [])];
      checkChoice(errors, "listen_select", answer, options);
      checkPinyinLookAlike(errors, step, options);
      break;
    }

    case "sentence_build":
    case "translation_build":
    case "hanzi_build": {
      const parts = step.targetParts ?? [];
      if (parts.length === 0) errors.push(`${step.kind} sem targetParts`);
      if (parts.some((piece) => !piece?.trim())) errors.push(`${step.kind} com peça vazia`);
      if ((step.bank ?? []).some((piece) => !piece?.trim())) errors.push(`${step.kind} com peça vazia no banco`);
      break;
    }

    case "fill_blank": {
      if (!step.blankAnswer?.trim()) errors.push("fill_blank sem blankAnswer");
      if (!step.sentenceBefore?.trim() && !step.sentenceAfter?.trim()) {
        errors.push("fill_blank sem contexto de frase");
      }
      if (step.bank?.length) {
        const duplicate = findDuplicate(step.bank);
        if (duplicate) errors.push(`fill_blank: banco com duplicata "${duplicate}"`);
        if (step.blankAnswer && !step.bank.some((piece) => normalize(piece) === normalize(step.blankAnswer!))) {
          errors.push(`fill_blank: banco não contém a resposta "${step.blankAnswer}"`);
        }
      }
      break;
    }

    case "dialogue_choice":
      if (!step.dialoguePrompt?.trim() && !step.prompt?.trim()) {
        errors.push("dialogue_choice sem fala/contexto");
      }
      checkChoice(errors, "dialogue_choice", step.correctAnswer ?? step.answer, step.options);
      checkPinyinLookAlike(errors, step, step.options ?? []);
      break;

    case "image_choice": {
      if (!step.imageChoiceMode) errors.push("image_choice sem modo");
      if (!step.imageId && !step.iconId) errors.push("image_choice sem imageId/iconId");
      if (!step.promptPt?.trim() && !step.prompt?.trim()) errors.push("image_choice sem promptPt");
      if (!resolveVisualConcept(step.imageId ?? step.iconId)) {
        errors.push(`image_choice: conceito visual desconhecido "${step.imageId ?? step.iconId}"`);
      }
      const imagePick =
        step.imageChoiceMode === "choose_image" || step.imageChoiceMode === "listen_and_choose_image";
      if (imagePick) {
        const answer = step.correctImageId;
        const options = step.imageOptions ?? [];
        checkChoice(errors, "image_choice", answer, options);
        for (const option of options) {
          if (!resolveVisualConcept(option)) errors.push(`image_choice: imageOption desconhecida "${option}"`);
        }
      } else {
        checkChoice(errors, "image_choice", step.correctAnswer, step.options);
      }
      break;
    }
  }

  // Cobertura de gloss: hànzì visível sem gloss não quebra o exercício,
  // mas o toque-para-traduzir falha — vale warning para o autor corrigir.
  const visible = [
    step.text,
    step.hanzi,
    step.audioText,
    step.sentenceBefore,
    step.sentenceAfter,
    ...(step.options ?? []),
    ...(step.bank ?? []),
    ...(step.target ?? []),
    ...(step.targetParts ?? []),
    ...(step.lines ?? []).flatMap((line) => line.hanzi),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ];
  const missingGloss = new Set<string>();
  for (const field of visible) {
    for (const ch of cjkChars(field)) {
      if (!glossFor(ch)) missingGloss.add(ch);
    }
  }
  if (missingGloss.size > 0) {
    warnings.push(`hànzì sem gloss: ${[...missingGloss].join(" ")}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
