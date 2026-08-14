/**
 * Pedagogia V3.4 — tipos compartilhados do currículo de conclusão (completion.ts).
 *
 * Espelha VocabRole / LexicalItemSpec / UnitLexicalTargets de masteryPilot.ts
 * (mesmo shape), mas SEM importar daquele arquivo: masteryPilot.ts importa
 * masteryCurriculum/index.ts para as 6 lições da V3.4, então um import de
 * volta criaria dependência circular. `lessonId` fica como `string` aqui
 * (mais largo que `MasteryPilotLessonId`) — masteryPilot.ts faz o cast ao
 * espalhar `COMPLETION_LEXICAL_TARGETS` em `PILOT_LEXICAL_TARGETS`.
 */
import type { MasteryPass } from "../masteryLoop";

export type VocabRole = "core" | "support" | "productive" | "receptive";

export interface LexicalItemSpec {
  ref: string;
  hanzi: string;
  pinyin?: string;
  meaningPt: string;
  role: VocabRole;
  /** Pass em que o item é introduzido (1–4). */
  introduceAtPass: MasteryPass;
}

export interface UnitLexicalTargets {
  lessonId: string;
  themePt: string;
  newVocabularyTarget: number;
  productiveVocabularyTarget: number;
  structuresTarget: string[];
  communicativeFunctions: string[];
  vocabulary: LexicalItemSpec[];
  /** Combinações estruturais novas esperadas (crescimento em rede). */
  networkChunks: string[];
}
