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
  "conversation_scene",
  "hanzi_evolution",
  "hanzi_build",
  "tone_pair",
  "image_choice",
  "compare_with_image",
  "audio_discrimination",
  "dictation",
  "odd_one_out",
  "spot_error",
  "free_production",
  "transfer_task",
  "conversation_repair",
  "contextual_choice",
  "audio_to_action",
  "sentence_transform",
  "substitution_drill",
  "dialogue_completion",
  "reverse_recall",
  "map_direction",
  "place_label",
  "address_build",
  "city_context",
  "sign_reading",
  "menu_reading",
  "price_task",
  "route_sequence",
  "schedule_reading",
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
      if (step.pedagogyVariant === "dragon_dictation") {
        if (!step.audioText?.trim()) errors.push("dragon_dictation sem audioText");
        if (!step.dictationMode || step.dictationMode === "blocks") {
          errors.push("dragon_dictation escrito precisa de modo pinyin, hanzi ou immersion");
        }
        if (!step.isNoHint && step.helpMode !== "disabled") {
          errors.push("dragon_dictation precisa estar sem dica");
        }
        if (step.dictationMode === "immersion" && step.playbackLimit !== 1) {
          errors.push("dragon_dictation de imersão precisa limitar o áudio a 1 reprodução");
        }
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
      if (step.pedagogyVariant === "audio_same_different") {
        if (step.audioSequence?.length !== 2 || step.audioSequence.some((item) => !item?.trim())) {
          errors.push("audio_same_different precisa de exatamente 2 áudios");
        }
        if (!step.isNoHint && step.helpMode !== "disabled") {
          errors.push("audio_same_different precisa estar sem dica");
        }
      } else if (!audio?.trim()) errors.push("listen_select sem áudio (audioText/resposta)");
      const options = [...(step.options ?? []), ...(step.distractors ?? [])];
      checkChoice(errors, "listen_select", answer, options);
      checkPinyinLookAlike(errors, step, options);
      break;
    }

    case "audio_discrimination": {
      // Par mínimo: dois áudios e uma decisão binária. Sem o segundo áudio o
      // exercício não existe; com os dois iguais por engano, a resposta mente.
      if (!step.audioText?.trim()) errors.push("audio_discrimination sem primeiro áudio");
      if (!step.audioTextB?.trim()) errors.push("audio_discrimination sem segundo áudio");
      const answer = step.correctAnswer ?? step.answer;
      if (answer !== "same" && answer !== "different") {
        errors.push(`audio_discrimination: resposta precisa ser "same" ou "different" (veio "${String(answer)}")`);
      }
      const identical =
        Boolean(step.audioText) && normalize(step.audioText!) === normalize(step.audioTextB ?? "");
      if (identical && answer === "different") {
        errors.push("audio_discrimination: os dois áudios são idênticos mas a resposta diz 'diferentes'");
      }
      if (!identical && answer === "same") {
        errors.push("audio_discrimination: os dois áudios são diferentes mas a resposta diz 'iguais'");
      }
      break;
    }

    case "dictation": {
      const audio = step.audioText ?? step.hanzi;
      if (!audio?.trim()) errors.push("dictation sem áudio");
      const mode = step.dictationMode ?? "blocks";
      if (mode === "blocks") {
        const parts = step.targetParts ?? [];
        if (parts.length === 0) errors.push("dictation (blocos) sem targetParts");
        if (parts.some((piece) => !piece?.trim())) errors.push("dictation (blocos) com peça vazia");
        const bank = step.bank ?? [];
        for (const piece of parts) {
          if (!bank.some((candidate) => normalize(candidate) === normalize(piece))) {
            errors.push(`dictation (blocos): banco não contém a peça "${piece}"`);
          }
        }
      } else if (!(step.correctAnswer ?? step.answer)?.trim()) {
        errors.push(`dictation (${mode}) sem resposta escrita`);
      }
      break;
    }

    case "odd_one_out": {
      const answer = step.correctAnswer ?? step.answer;
      checkChoice(errors, "odd_one_out", answer, step.options);
      if ((step.options ?? []).length < 4) {
        // Com 3 opções o "não pertence" fica frouxo: 2 do grupo não formam grupo.
        errors.push("odd_one_out precisa de 4 alternativas (3 do grupo + 1 intruso)");
      }
      if (!step.explanation?.trim()) errors.push("odd_one_out sem explicação do grupo");
      break;
    }

    case "spot_error": {
      const answer = step.correctAnswer ?? step.answer;
      checkChoice(errors, "spot_error", answer, step.options);
      if ((step.options ?? []).length !== 2) {
        errors.push("spot_error compara exatamente 2 frases");
      }
      if (!step.prompt?.trim() && !step.dialoguePrompt?.trim()) {
        errors.push("spot_error sem intenção em português");
      }
      if (!step.explanation?.trim()) errors.push("spot_error sem a regra explicada");
      break;
    }

    case "sentence_build":
    case "translation_build":
    case "hanzi_build": {
      const parts = step.targetParts ?? [];
      if (parts.length === 0) errors.push(`${step.kind} sem targetParts`);
      if (parts.some((piece) => !piece?.trim())) errors.push(`${step.kind} com peça vazia`);
      if ((step.bank ?? []).some((piece) => !piece?.trim())) errors.push(`${step.kind} com peça vazia no banco`);
      for (const [index, accepted] of (step.acceptedTargetParts ?? []).entries()) {
        if (accepted.length === 0 || accepted.some((piece) => !piece?.trim())) {
          errors.push(`${step.kind}: acceptedTargetParts ${index + 1} inválido`);
        }
      }
      if (step.pedagogyVariant === "dragon_dictation") {
        if (step.dictationMode !== "blocks") errors.push("dragon_dictation por peças precisa do modo blocks");
        if (!step.audioText?.trim()) errors.push("dragon_dictation por peças sem audioText");
        if (!step.isNoHint && step.helpMode !== "disabled") errors.push("dragon_dictation precisa estar sem dica");
      }
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
    case "contextual_choice":
    case "dialogue_completion":
    case "audio_to_action":
    case "place_label":
    case "city_context":
    case "sign_reading":
    case "menu_reading":
    case "price_task":
    case "schedule_reading":
      if (!step.dialoguePrompt?.trim() && !step.prompt?.trim() && !step.situationPt?.trim() && !step.audioText?.trim() && !step.signHanzi?.trim() && !step.priceHanzi?.trim()) {
        errors.push(`${step.kind} sem fala/contexto`);
      }
      if (step.kind === "sign_reading" && !step.signHanzi?.trim()) errors.push("sign_reading sem signHanzi");
      if (step.kind === "menu_reading" && !(step.menuItems?.length)) errors.push("menu_reading sem menuItems");
      if (step.kind === "price_task" && !step.priceHanzi?.trim()) errors.push("price_task sem priceHanzi");
      if (step.kind === "schedule_reading" && !(step.scheduleRows?.length)) errors.push("schedule_reading sem scheduleRows");
      checkChoice(errors, step.kind, step.correctAnswer ?? step.answer, step.options);
      checkPinyinLookAlike(errors, step, step.options ?? []);
      break;

    case "map_direction": {
      if (!step.mapFromLabel?.trim() || !step.mapToLabel?.trim()) {
        errors.push("map_direction sem origem/destino");
      }
      if (!step.mapCorrectAction) errors.push("map_direction sem mapCorrectAction");
      const actions = step.mapActionOptions ?? [];
      if (actions.length < 2) errors.push("map_direction: menos de 2 ações");
      if (step.mapCorrectAction && !actions.includes(step.mapCorrectAction)) {
        errors.push(`map_direction: ação "${step.mapCorrectAction}" fora das opções`);
      }
      break;
    }

    case "address_build":
    case "route_sequence": {
      const parts = step.targetParts ?? step.routeParts ?? [];
      if (parts.length === 0) errors.push(`${step.kind} sem targetParts`);
      const bank = step.bank ?? [];
      for (const piece of parts) {
        if (!bank.some((candidate) => normalize(candidate) === normalize(piece))) {
          errors.push(`${step.kind}: banco não contém a peça "${piece}"`);
        }
      }
      break;
    }

    case "sentence_transform": {
      if (!step.sourceText?.trim()) errors.push("sentence_transform sem sourceText");
      const parts = step.targetParts ?? [];
      if (parts.length === 0) errors.push("sentence_transform sem targetParts");
      const bank = step.bank ?? [];
      for (const piece of parts) {
        if (!bank.some((candidate) => normalize(candidate) === normalize(piece))) {
          errors.push(`sentence_transform: banco não contém a peça "${piece}"`);
        }
      }
      break;
    }

    case "substitution_drill": {
      if (!step.blankAnswer?.trim()) errors.push("substitution_drill sem blankAnswer");
      if (!step.sentenceBefore?.trim() && !step.prompt?.trim()) {
        errors.push("substitution_drill sem padrão/contexto");
      }
      if (step.options?.length) {
        checkChoice(errors, "substitution_drill", step.blankAnswer, step.options);
      }
      break;
    }

    case "reverse_recall": {
      if (!step.situationPt?.trim() && !step.body?.trim()) errors.push("reverse_recall sem situação");
      if (!step.answer?.trim()) errors.push("reverse_recall sem resposta");
      break;
    }

    case "conversation_scene": {
      if (!step.sceneId?.trim()) errors.push("conversation_scene sem sceneId");
      if (!step.title?.trim()) errors.push("conversation_scene sem título");
      if (!step.setting) errors.push("conversation_scene sem setting");
      if (!step.characters || step.characters.length < 2) {
        errors.push("conversation_scene precisa de pelo menos 2 personagens");
      }
      // V2 (nós): cada nó precisa de fala completa e interações íntegras —
      // resposta correta presente, opções sem duplicata e destinos existentes.
      const nodes = step.nodes ?? [];
      if (nodes.length > 0) {
        const nodeIds = new Set<string>();
        for (const node of nodes) {
          if (!node.id?.trim()) errors.push("conversation_scene: nó sem id");
          else if (nodeIds.has(node.id)) errors.push(`conversation_scene: nó duplicado "${node.id}"`);
          nodeIds.add(node.id);
        }
        const entryId = step.entryNodeId ?? nodes[0]?.id;
        if (!entryId || !nodeIds.has(entryId)) {
          errors.push(`conversation_scene: entryNodeId desconhecido "${String(step.entryNodeId)}"`);
        }
        for (const node of nodes) {
          if (!node.hanzi?.trim()) errors.push(`conversation_scene nó "${node.id}" sem hanzi`);
          if (!node.pinyin?.trim()) errors.push(`conversation_scene nó "${node.id}" sem pinyin`);
          if (!node.speakerId?.trim()) errors.push(`conversation_scene nó "${node.id}" sem speakerId`);
          else if (step.characters && !step.characters.some((character) => character.id === node.speakerId)) {
            errors.push(`conversation_scene nó "${node.id}": speakerId desconhecido "${node.speakerId}"`);
          }
          if (node.nextNodeId && !nodeIds.has(node.nextNodeId)) {
            errors.push(`conversation_scene nó "${node.id}": nextNodeId desconhecido "${node.nextNodeId}"`);
          }
          const interaction = node.interaction;
          if (interaction) {
            if (!interaction.prompt?.trim()) errors.push(`conversation_scene nó "${node.id}": interação sem prompt`);
            if (!interaction.correctAnswer?.trim()) {
              errors.push(`conversation_scene nó "${node.id}": interação sem resposta correta`);
            }
            if (!interaction.correctNextNodeId || !nodeIds.has(interaction.correctNextNodeId)) {
              errors.push(`conversation_scene nó "${node.id}": correctNextNodeId desconhecido`);
            }
            if (interaction.wrongNextNodeId && !nodeIds.has(interaction.wrongNextNodeId)) {
              errors.push(`conversation_scene nó "${node.id}": wrongNextNodeId desconhecido`);
            }
            const options = interaction.options ?? [];
            if (options.length > 0) {
              const duplicate = findDuplicate(options);
              if (duplicate) errors.push(`conversation_scene nó "${node.id}": opção duplicada "${duplicate}"`);
            }
            if (interaction.type === "produce_reply") {
              // Sem apoio: qualquer alternativa na tela desfaz o exercício.
              if (options.length > 0) {
                errors.push(`conversation_scene nó "${node.id}": produce_reply não pode ter alternativas`);
              }
              if (!CJK_RE.test(interaction.correctAnswer ?? "")) {
                errors.push(`conversation_scene nó "${node.id}": produce_reply sem resposta em hànzì`);
              }
              if (!(interaction.accepts ?? []).some((value) => value?.trim())) {
                errors.push(`conversation_scene nó "${node.id}": produce_reply sem respostas aceitas`);
              }
              // Produzir sem rede: se errar e a conversa não tiver para onde
              // ir, o aluno fica preso numa tela que não perdoa.
              if (!interaction.wrongNextNodeId) {
                errors.push(`conversation_scene nó "${node.id}": produce_reply sem ramo de erro`);
              }
            } else if (interaction.type === "choose_reply" || interaction.type === "choose_meaning" || interaction.type === "fill_reply" || interaction.type === "listen_reply") {
              checkChoice(errors, `conversation_scene nó "${node.id}"`, interaction.correctAnswer, options);
              checkPinyinLookAlike(errors, step, options);
            }
            if (interaction.type === "order_reply" && options.length < 2) {
              errors.push(`conversation_scene nó "${node.id}": order_reply sem peças`);
            }
          }
        }
      }
      const lines = step.lines ?? [];
      if (lines.length === 0) errors.push("conversation_scene sem falas");
      for (const [index, line] of lines.entries()) {
        if (!line.hanzi?.trim()) errors.push(`conversation_scene fala ${index + 1} sem hanzi`);
        if (!line.pinyin?.trim()) errors.push(`conversation_scene fala ${index + 1} sem pinyin`);
        if (!line.speakerId?.trim()) errors.push(`conversation_scene fala ${index + 1} sem speakerId`);
        else if (step.characters && !step.characters.some((character) => character.id === line.speakerId)) {
          errors.push(`conversation_scene fala ${index + 1}: speakerId desconhecido "${line.speakerId}"`);
        }
      }
      const checkpoint = step.checkpoint;
      if (checkpoint) {
        if (!checkpoint.prompt?.trim()) errors.push("conversation_scene checkpoint sem prompt");
        if (!checkpoint.correctAnswer?.trim()) errors.push("conversation_scene checkpoint sem resposta correta");
        if (checkpoint.type === "choose_reply" || checkpoint.type === "choose_meaning" || checkpoint.type === "fill_reply") {
          checkChoice(errors, "conversation_scene checkpoint", checkpoint.correctAnswer, checkpoint.options);
          checkPinyinLookAlike(errors, step, checkpoint.options ?? []);
        }
        if (checkpoint.type === "order_reply") {
          if (!checkpoint.options || checkpoint.options.length < 2) {
            errors.push("conversation_scene order_reply sem peças");
          } else {
            const duplicate = findDuplicate(checkpoint.options);
            if (duplicate) errors.push(`conversation_scene order_reply: peça duplicada "${duplicate}"`);
          }
        }
      }
      // Batida de reparo: só entra se for jogável. Uma quebra de comunicação
      // sem movimento certo, ou com uma fala que o aluno não pode escrever,
      // deixaria a conversa presa — pior do que não ter reparo nenhum.
      const beat = step.conversationRepairBeat;
      if (beat) {
        if (!beat.npcHanzi?.trim()) errors.push("conversation_scene: batida de reparo sem a fala que trava");
        if (!CJK_RE.test(beat.targetHanzi ?? "")) {
          errors.push("conversation_scene: batida de reparo sem fala de recuperação em hànzì");
        }
        if ((beat.strategyOptions ?? []).length < 3) {
          errors.push("conversation_scene: batida de reparo com menos de 3 estratégias");
        }
        if (!beat.strategyOptions?.includes(beat.strategy)) {
          errors.push("conversation_scene: a estratégia correta do reparo não está entre as oferecidas");
        }
        if (new Set(beat.strategyOptions ?? []).size !== (beat.strategyOptions ?? []).length) {
          errors.push("conversation_scene: batida de reparo com estratégia repetida");
        }
        if (!(beat.accepts ?? []).some((value) => value?.trim())) {
          errors.push("conversation_scene: batida de reparo sem respostas aceitas");
        }
        if (!beat.whyPt?.trim()) errors.push("conversation_scene: batida de reparo sem o porquê");
      }
      if (!step.learnedRefs || step.learnedRefs.length === 0) {
        errors.push("conversation_scene sem learnedRefs");
      }
      break;
    }

    case "free_production":
    case "transfer_task": {
      // O ponto inteiro destes dois motores é a AUSÊNCIA de apoio. Uma opção,
      // um banco de peças ou hànzì no enunciado transformam produção em
      // reconhecimento — por isso aqui isso é erro, não estilo.
      if (!step.situationPt?.trim()) errors.push(`${step.kind} sem situação em português`);
      else if (CJK_RE.test(step.situationPt)) {
        errors.push(`${step.kind}: a situação mostra hànzì (viraria cópia, não produção)`);
      }
      const answer = step.correctAnswer ?? step.answer;
      if (!answer?.trim()) errors.push(`${step.kind} sem resposta modelo`);
      else if (!CJK_RE.test(answer)) errors.push(`${step.kind}: a resposta modelo não tem hànzì`);
      if ((step.options ?? []).length > 0) errors.push(`${step.kind} não pode oferecer alternativas`);
      if ((step.bank ?? []).length > 0 || (step.wordBank ?? []).length > 0) {
        errors.push(`${step.kind} não pode oferecer banco de peças`);
      }
      if ((step.targetParts ?? []).length > 0) errors.push(`${step.kind} não pode entregar a frase em peças`);
      if (!step.isNoHint && step.helpMode !== "disabled") errors.push(`${step.kind} precisa estar sem dica`);
      if (step.productionOpen) {
        // Aberta: o valor está em existir escolha. ask_name tem duas variantes naturais.
        const minOpen = step.productionGoal === "ask_name" ? 2 : 3;
        const answers = (step.accepts ?? []).filter((value) => CJK_RE.test(value ?? ""));
        if (new Set(answers.map(normalize)).size < minOpen) {
          errors.push(`produção aberta com menos de ${minOpen} respostas certas possíveis`);
        }
        if ((step.productionExamples ?? []).length < minOpen) {
          errors.push("produção aberta sem exemplos suficientes para a correção");
        }
        if (!step.productionGoal) errors.push("produção aberta sem objetivo comunicativo");
      } else if (step.productionFrameId) {
        // Scaffold STPVO-light: produção/transferência ancoradas em frame
        // precisam mostrar a ordem nomeada — senão o padrão volta a ser só "___".
        if (!step.patternSlots?.length) {
          errors.push(`${step.kind} com frame sem scaffold de slots (patternSlots)`);
        } else if (!step.patternSlots.some((slot) => slot.hole)) {
          errors.push(`${step.kind}: scaffold sem buraco`);
        }
      }
      if (step.kind === "transfer_task") {
        if (!step.transferAnchorHanzi?.trim()) errors.push("transfer_task sem frase-âncora ensinada");
        if (step.isNovelCombination !== true) {
          errors.push("transfer_task precisa cobrar uma combinação inédita (isNovelCombination)");
        }
        if (
          step.transferAnchorHanzi &&
          answer &&
          normalize(step.transferAnchorHanzi) === normalize(answer)
        ) {
          errors.push("transfer_task: a resposta é a própria âncora — não há transferência");
        }
      }
      break;
    }

    case "conversation_repair": {
      if (!step.repairNpcHanzi?.trim()) errors.push("conversation_repair sem a fala que travou a conversa");
      if (!step.repairStrategy) errors.push("conversation_repair sem estratégia correta");
      const strategies = step.repairStrategyOptions ?? [];
      if (strategies.length < 3) errors.push("conversation_repair precisa de pelo menos 3 estratégias");
      if (new Set(strategies).size !== strategies.length) {
        errors.push("conversation_repair com estratégia repetida");
      }
      if (step.repairStrategy && !strategies.includes(step.repairStrategy)) {
        errors.push("conversation_repair: a estratégia correta não está entre as oferecidas");
      }
      const recovery = step.correctAnswer ?? step.answer;
      if (!recovery?.trim()) errors.push("conversation_repair sem a fala de recuperação");
      else if (!CJK_RE.test(recovery)) errors.push("conversation_repair: fala de recuperação sem hànzì");
      if (!step.explanation?.trim()) errors.push("conversation_repair sem o porquê da estratégia");
      break;
    }

    case "image_choice": {
      if (!step.imageChoiceMode) errors.push("image_choice sem modo");
      if (!step.imageId && !step.iconId) errors.push("image_choice sem imageId/iconId");
      if (!step.promptPt?.trim() && !step.prompt?.trim()) errors.push("image_choice sem promptPt");
      const visualConcept = resolveVisualConcept(step.imageId ?? step.iconId);
      if (!visualConcept) {
        errors.push(`image_choice: conceito visual desconhecido "${step.imageId ?? step.iconId}"`);
      } else {
        if (!visualConcept.imageSrc && !visualConcept.emoji) errors.push("image_choice sem imagem nem fallback");
        if (!visualConcept.imageAltPt.trim()) errors.push("image_choice com alt vazio");
      }
      const imagePick =
        step.imageChoiceMode === "choose_image" || step.imageChoiceMode === "listen_and_choose_image";
      if (imagePick) {
        const answer = step.correctImageId;
        const options = step.imageOptions ?? [];
        checkChoice(errors, "image_choice", answer, options);
        for (const option of options) {
          const optionConcept = resolveVisualConcept(option);
          if (!optionConcept) errors.push(`image_choice: imageOption desconhecida "${option}"`);
          else if (!optionConcept.imageSrc && !optionConcept.emoji) {
            errors.push(`image_choice: imageOption sem imagem nem fallback "${option}"`);
          }
        }
      } else {
        checkChoice(errors, "image_choice", step.correctAnswer, step.options);
      }
      break;
    }

    case "compare_with_image": {
      if (!step.compareWithImageMode) errors.push("compare_with_image sem modo");
      if (![1, 2, 3].includes(step.compareWithImageLevel ?? 0)) {
        errors.push("compare_with_image sem nível 1–3");
      }
      if (!step.imageId && !step.iconId) errors.push("compare_with_image sem imageId/iconId");
      if (!step.promptPt?.trim() && !step.prompt?.trim()) errors.push("compare_with_image sem promptPt");
      const target = resolveVisualConcept(step.imageId ?? step.iconId);
      if (!target) {
        errors.push(`compare_with_image: conceito visual desconhecido "${step.imageId ?? step.iconId}"`);
      } else if (!target.imageSrc && !target.emoji) {
        errors.push("compare_with_image sem imagem nem fallback");
      } else if (target.imageOnlySafe === false) {
        errors.push(`compare_with_image: conceito relacional ambíguo "${target.id}"`);
      }

      if (step.compareWithImageMode === "word_to_image") {
        const options = step.imageOptions ?? [];
        checkChoice(errors, "compare_with_image", step.correctImageId, options);
        if (options.length !== 2) errors.push("compare_with_image palavra→imagem precisa de exatamente 2 opções");
        for (const option of options) {
          const concept = resolveVisualConcept(option);
          if (!concept) errors.push(`compare_with_image: imageOption desconhecida "${option}"`);
          else if (concept.imageOnlySafe === false) {
            errors.push(`compare_with_image: conceito relacional ambíguo sem apoio visual suficiente "${option}"`);
          }
        }
      } else {
        const options = step.options ?? [];
        checkChoice(errors, "compare_with_image", step.correctAnswer, options);
        if (options.length !== 2) errors.push("compare_with_image imagem→palavra precisa de exatamente 2 opções");
      }
      if (!step.explanation?.trim()) errors.push("compare_with_image sem feedback pedagógico");
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
