// Personalização do nome do aluno nas tarefas.
//
// O nome-modelo usado em todo o conteúdo autoral é "Matheus" (em latim, sem
// transliteração para hànzì). Em runtime trocamos essas ocorrências pelo
// primeiro nome do usuário, para que as apresentações ("我叫…", "meu nome é…")
// e o avatar do aluno usem o nome real. Usado pelas lições (personalizeStep),
// pelas cenas de conversa, pelas histórias interativas e pela revisão.

import { useStore } from "./store";

/** Primeiro nome utilizável do aluno, ou undefined para nomes-placeholder. */
export function studentFirstName(name?: string): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || ["Aluno", "Novo"].includes(first)) return undefined;
  return first;
}

/** Hook: primeiro nome do aluno logado (undefined quando não definido). */
export function useStudentFirstName(): string | undefined {
  const account = useStore((s) => s.accounts?.[s.currentAccountId]);
  return studentFirstName(account?.name);
}

/**
 * RC2.3.13R.3.1 — `我叫` + nome com espaço canônico (legível para TTS e display).
 * Mantém `我叫 Nome` mesmo quando o autoral vinha colado (`我叫Matheus`).
 */
export function personalizeName(value: string | undefined, name: string | undefined): string | undefined {
  if (!value || !name) return value;
  return value
    .replaceAll("我叫Matheus", `我叫 ${name}`)
    .replaceAll("我叫 Matheus", `我叫 ${name}`)
    .replaceAll("Matheus", name);
}

/**
 * Personaliza prompts de conversa da Jornada: o avatar do aluno já se chama
 * Matheus (ou o nome real), mas textos legados ainda podem dizer "Lin".
 * Não usar em Imersão — lá "Lin" é NPC (林).
 */
export function personalizeConversationPrompt(
  value: string | undefined,
  name: string | undefined
): string | undefined {
  if (!value) return value;
  const withStudentAlias = value.replace(/\bLin\b/g, "Matheus");
  return personalizeName(withStudentAlias, name) ?? withStudentAlias;
}

/**
 * RC1.1 P3.1 — nomes em alfabeto latino que PODEM ser falados pela voz chinesa.
 *
 * A lista é fechada de propósito. O TTS pode dizer "我叫 Matheus。" porque
 * Matheus é o nome do aluno; não pode dizer "O que Matheus responde?", que é
 * copy de interface. Quem garante isso é a regra em `mandarinSpeechText`: um
 * nome só sobrevive quando o resto do texto é mandarim e pontuação.
 *
 * "Matheus" fica aqui mesmo quando o aluno tem outro nome: é o nome-modelo do
 * conteúdo autoral e ainda aparece em trechos não personalizados.
 */
const MODEL_STUDENT_NAME = "Matheus";
/** NPCs com grafia latina no catálogo de conversa. */
const KNOWN_NPC_NAMES = ["Lin", "Ana", "Bruno"] as const;
/** Nomes-reserva quando personalizar Matheus colidiria com um distractor já igual ao aluno. */
const COLLISION_ALTERNATES = ["Bruno", "Carla", "Diego", "Elena", "Felipe"] as const;

export function speakableProperNames(studentName?: string): string[] {
  const names = [MODEL_STUDENT_NAME, ...KNOWN_NPC_NAMES];
  const student = studentFirstName(studentName);
  if (student) names.unshift(student);
  return Array.from(new Set(names));
}

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function collisionAlternate(studentName: string): string {
  const lower = studentName.toLocaleLowerCase("pt-BR");
  return COLLISION_ALTERNATES.find((alt) => alt.toLocaleLowerCase("pt-BR") !== lower) ?? "Bruno";
}

/**
 * RC2.3.13R.3.1 — personaliza uma lista de opções sem criar duplicatas.
 *
 * Ex.: `["Ana", "Matheus", …]` com aluno "Ana" → Matheus não vira Ana de novo;
 * usa um nome-reserva para o slot que era o modelo.
 */
export function personalizeChoiceList(
  options: string[] | undefined,
  name: string | undefined
): string[] | undefined {
  if (!options) return options;
  if (!name) return options.map((option) => option);
  const seen = new Set<string>();
  return options.map((option) => {
    let next = personalizeName(option, name) ?? option;
    const key = normalizeKey(next);
    if (seen.has(key) && option.includes(MODEL_STUDENT_NAME)) {
      next = option.replaceAll(MODEL_STUDENT_NAME, collisionAlternate(name));
    }
    seen.add(normalizeKey(next));
    return next;
  });
}

const CJK_RE = /[㐀-鿿]/u;
const LATIN_NAME_RE = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,}/;

/** Utterance with Mandarin + Latin proper name — must use DYNAMIC speech path. */
export function isPersonalizedUtterance(text: string | undefined | null): boolean {
  const clean = String(text ?? "").trim();
  if (!clean) return false;
  return CJK_RE.test(clean) && LATIN_NAME_RE.test(clean);
}

/**
 * Alternativas que também carregam o nome do aluno (anti-vazamento).
 * Espelha a lógica de `nameCarryingOptions` em lessonTasks — mantida aqui
 * para o runtime pós-personalização sem dependência circular.
 */
export function nameCarryingDistractors(target: string, name: string): string[] | null {
  const clean = target.replace(/\s+/g, "");
  const raw = target.trim();
  if (!raw.includes(name)) return null;

  const ptMatch = /^(meu nome é)\s+/i.exec(raw);
  if (ptMatch) {
    const punct = raw.endsWith(".") ? "." : "";
    return [
      raw,
      `Eu sou ${name}${punct}`,
      `Você se chama ${name}?`,
      `Ele se chama ${name}${punct}`,
    ];
  }

  const hanziMatch = /^我叫\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*)$/.exec(clean);
  const pinyinMatch = /^wǒ\s*jiào\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*)$/i.exec(raw);
  if (pinyinMatch || /^wǒ\s*jiào/i.test(raw)) {
    return [raw.includes("wǒ") ? raw : `wǒ jiào ${name}`, `nǐ jiào ${name}`, `tā jiào ${name}`, `wǒ shì ${name}`];
  }
  if (hanziMatch || /我叫/.test(raw)) {
    const spaced = raw.includes("我叫") ? (raw.includes(`我叫 ${name}`) || raw.includes(`我叫${name}`) ? raw.replace(/我叫\s*/, "我叫 ") : `我叫 ${name}`) : `我叫 ${name}`;
    // Normalize spaced form for the correct option when answer was 我叫Name / 我叫 Name
    const correct = /我叫\s*/.test(raw) ? raw.replace(/我叫\s*/, "我叫 ") : spaced;
    return [correct, `你叫${name}`, `我是${name}`, `他叫${name}`];
  }
  return null;
}

/**
 * Se só a resposta correta contém o nome do aluno, reescreve o conjunto com
 * distractors estruturais que também carregam o nome.
 *
 * Não mexe em montagem por peças (opções = glifos curtos + nome solto).
 */
export function repairNameOnlyAnswerLeak<T extends {
  options?: string[];
  correctAnswer?: string;
  answer?: string;
  blankAnswer?: string;
}>(step: T, name: string | undefined): T {
  if (!name || !step.options || step.options.length < 2) return step;
  const answer = String(step.correctAnswer ?? step.answer ?? step.blankAnswer ?? "");
  if (!answer.includes(name)) return step;
  const withName = step.options.filter((option) => String(option).includes(name));
  if (withName.length !== 1) return step;

  const looksLikePhrase = /我叫|wǒ\s*jiào|meu nome/i.test(answer) || [...answer].filter((ch) => CJK_RE.test(ch)).length >= 2;
  if (!looksLikePhrase) return step;

  // Montagem: opções curtas (≤2 glifos) + o nome sozinho.
  const shortGlyphs = step.options.filter((option) => {
    if (option === name) return false;
    const cjk = [...option].filter((ch) => CJK_RE.test(ch));
    return cjk.length > 0 && cjk.length <= 2 && !LATIN_NAME_RE.test(option);
  });
  if (shortGlyphs.length >= 2 && step.options.includes(name)) return step;

  const repaired = nameCarryingDistractors(answer, name);
  if (!repaired || repaired.length < 2) return step;
  const nextOptions = repaired.slice(0, 4);
  if (step.correctAnswer != null) return { ...step, options: nextOptions, correctAnswer: repaired[0] };
  if (step.answer != null) return { ...step, options: nextOptions, answer: repaired[0] };
  if (step.blankAnswer != null) return { ...step, options: nextOptions, blankAnswer: repaired[0] };
  return { ...step, options: nextOptions };
}
