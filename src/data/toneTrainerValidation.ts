import { charById } from "./characters";
import { chunkById } from "./chunks";
import {
  MANDARIN_TONES,
  TONE_TRAINER_PACKS,
  type ToneTrainerPack,
  type ToneTrainerRound,
} from "./toneTrainer";

// ————————————————————————————————————————————————————————————————
// Validador do ToneTrainer.
//
// Regras:
// - ids de pack únicos; `order` sequencial 1..N sem repetição;
// - `requiredRounds >= 1`, `minimumCorrect >= 1` e `minimumCorrect <= requiredRounds`;
// - toda rodada tem audioText/displayText/pinyin/meaningPt/focusSyllable/explanation;
// - toda rodada tem `answerTone` válido;
// - a resposta correta de TODA rodada está entre as opções do pack
//   (pack de tom: `answerTone ∈ options`; pack de consoante: `answerInitial ∈ consonantOptions`);
// - pack de consoante: toda rodada tem `answerInitial` não vazio e `consonantOptions`
//   não vazio, sem duplicatas, e que cobre todos os `answerInitial` usados;
// - pack de tom: `options` não vazio, sem duplicatas, tudo em MANDARIN_TONES;
// - `itemRef` (quando presente) resolve para um caractere/chunk existente.
// Nota: ids de rodada podem se repetir entre packs e dentro do mesmo pack por
// design (`cycleRounds` reaproveita rodadas para completar requiredRounds).
//
// Uso: `npm run validate:tone-trainer` (script Node).
// ————————————————————————————————————————————————————————————————

export type ToneTrainerIssueSeverity = "error" | "warn";

export interface ToneTrainerIssue {
  severity: ToneTrainerIssueSeverity;
  area: string;
  ref: string;
  message: string;
}

export interface ToneTrainerValidationReport {
  issues: ToneTrainerIssue[];
  errors: ToneTrainerIssue[];
  warnings: ToneTrainerIssue[];
  stats: {
    packs: number;
    tonePacks: number;
    consonantPacks: number;
    rounds: number;
  };
}

const issue = (
  severity: ToneTrainerIssueSeverity,
  area: string,
  ref: string,
  message: string
): ToneTrainerIssue => ({ severity, area, ref, message });

export function validateToneTrainer(): ToneTrainerValidationReport {
  const issues: ToneTrainerIssue[] = [];
  let tonePacks = 0;
  let consonantPacks = 0;
  let rounds = 0;

  const packIds = new Set<string>();
  const seenOrders = new Set<number>();

  for (const pack of TONE_TRAINER_PACKS) {
    const area = `pack:${pack.id}`;

    if (packIds.has(pack.id)) {
      issues.push(issue("error", "packs", pack.id, "id de pack duplicado."));
    }
    packIds.add(pack.id);

    if (seenOrders.has(pack.order)) {
      issues.push(issue("error", "packs", pack.id, `order ${pack.order} repetido.`));
    }
    seenOrders.add(pack.order);
    if (pack.order < 1) {
      issues.push(issue("error", "packs", pack.id, `order ${pack.order} deve ser >= 1.`));
    }

    if (!pack.title || !pack.shortTitle || !pack.focus || !pack.unlockCopy) {
      issues.push(issue("error", "packs", pack.id, "título/shortTitle/focus/unlockCopy obrigatórios."));
    }

    if (pack.requiredRounds < 1) {
      issues.push(issue("error", area, pack.id, "requiredRounds deve ser >= 1."));
    }
    if (pack.minimumCorrect < 1) {
      issues.push(issue("error", area, pack.id, "minimumCorrect deve ser >= 1."));
    }
    if (pack.minimumCorrect > pack.requiredRounds) {
      issues.push(
        issue("error", area, pack.id, "minimumCorrect não pode ser maior que requiredRounds.")
      );
    }

    const isConsonant = pack.kind === "consonant";

    if (isConsonant) {
      consonantPacks += 1;
      const consonantOptions = pack.consonantOptions ?? [];
      if (consonantOptions.length === 0) {
        issues.push(issue("error", area, pack.id, "pack de consoante sem consonantOptions."));
      }
      const seen = new Set<string>();
      for (const option of consonantOptions) {
        if (seen.has(option)) {
          issues.push(issue("error", area, pack.id, `consonantOption "${option}" duplicado.`));
        }
        seen.add(option);
      }
    } else {
      tonePacks += 1;
      if (pack.options.length === 0) {
        issues.push(issue("error", area, pack.id, "pack de tom sem options."));
      }
      const seen = new Set<number>();
      for (const option of pack.options) {
        if (!MANDARIN_TONES.includes(option)) {
          issues.push(issue("error", area, pack.id, `opção ${option} não é um tom válido.`));
        }
        if (seen.has(option)) {
          issues.push(issue("error", area, pack.id, `opção ${option} duplicada.`));
        }
        seen.add(option);
      }
    }

    if (pack.rounds.length === 0) {
      issues.push(issue("error", area, pack.id, "pack sem rodadas."));
    }

    for (const round of pack.rounds) {
      rounds += 1;
      const roundArea = `round:${round.id}`;

      if (!round.audioText || !round.displayText || !round.pinyin || !round.meaningPt) {
        issues.push(
          issue("error", roundArea, round.id, "audioText/displayText/pinyin/meaningPt obrigatórios.")
        );
      }
      if (!round.focusSyllable || !round.explanation) {
        issues.push(issue("error", roundArea, round.id, "focusSyllable/explanation obrigatórios."));
      }
      if (!MANDARIN_TONES.includes(round.answerTone)) {
        issues.push(issue("error", roundArea, round.id, "answerTone inválido."));
      }

      if (isConsonant) {
        const initial = round.answerInitial;
        if (!initial) {
          issues.push(
            issue("error", roundArea, round.id, "rodada de consoante sem answerInitial.")
          );
        } else if (!(pack.consonantOptions ?? []).includes(initial)) {
          issues.push(
            issue(
              "error",
              roundArea,
              round.id,
              `answerInitial "${initial}" não está entre as opções do pack.`
            )
          );
        }
      } else if (!pack.options.includes(round.answerTone)) {
        issues.push(
          issue(
            "error",
            roundArea,
            round.id,
            `answerTone ${round.answerTone} não está entre as opções do pack.`
          )
        );
      }

      if (round.itemRef) {
        if (round.itemRef.startsWith("char:")) {
          const id = round.itemRef.slice("char:".length);
          if (!charById[id]) {
            issues.push(
              issue("error", roundArea, round.id, `itemRef aponta para caractere inexistente (${id}).`)
            );
          }
        } else if (round.itemRef.startsWith("chunk:")) {
          const id = round.itemRef.slice("chunk:".length);
          if (!chunkById[id]) {
            issues.push(
              issue("error", roundArea, round.id, `itemRef aponta para chunk inexistente (${id}).`)
            );
          }
        } else {
          issues.push(issue("error", roundArea, round.id, "itemRef com prefixo inválido."));
        }
      }
    }

    // Ordem sequencial (1..N) — verifica se algum order está fora da faixa esperada.
    if (pack.order > TONE_TRAINER_PACKS.length) {
      issues.push(
        issue(
          "warn",
          area,
          pack.id,
          `order ${pack.order} acima do total de packs (${TONE_TRAINER_PACKS.length}).`
        )
      );
    }
  }

  return {
    issues,
    errors: issues.filter((item) => item.severity === "error"),
    warnings: issues.filter((item) => item.severity === "warn"),
    stats: {
      packs: TONE_TRAINER_PACKS.length,
      tonePacks,
      consonantPacks,
      rounds,
    },
  };
}

// Evita "unused" no tipo quando importado apenas para tipagem em outros lugares.
export type { ToneTrainerPack, ToneTrainerRound };
