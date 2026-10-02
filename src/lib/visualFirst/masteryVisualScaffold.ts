/**
 * RC2.3.1 — scaffold visual por Mastery Pass.
 * Pass ↑ → visual entrega menos a resposta e mais contexto.
 */
import type { ImageChoiceMode } from "../../data/visualVocabulary";

export type VisualScaffoldMode =
  | "show_all" // P1: image + hanzi + pinyin + audio
  | "image_to_hanzi"
  | "audio_to_image"
  | "hanzi_to_image"
  | "context_prompt" // P3: scene → produce/choose language
  | "transfer_scene"; // P4: scene only → independence

export function visualScaffoldForPass(masteryPass: number): VisualScaffoldMode {
  if (masteryPass <= 1) return "show_all";
  if (masteryPass === 2) return "audio_to_image";
  if (masteryPass === 3) return "context_prompt";
  return "transfer_scene";
}

export function preferredImageChoiceMode(masteryPass: number): ImageChoiceMode {
  if (masteryPass <= 1) return "choose_hanzi";
  if (masteryPass === 2) return "listen_and_choose_image";
  if (masteryPass === 3) return "choose_image";
  return "choose_image";
}

export function visualDeliversAnswer(mode: VisualScaffoldMode): boolean {
  return mode === "show_all" || mode === "image_to_hanzi" || mode === "audio_to_image" || mode === "hanzi_to_image";
}

export function validatePassVisualRole(input: {
  masteryPass: number;
  stepsHaveDirectImageAnswer: boolean;
  stepsHaveContextOnly: boolean;
}): { ok: boolean; detail: string } {
  if (input.masteryPass >= 4 && input.stepsHaveDirectImageAnswer && !input.stepsHaveContextOnly) {
    return { ok: false, detail: "Pass 4 still uses visual as direct answer crutch" };
  }
  if (input.masteryPass <= 1 && !input.stepsHaveDirectImageAnswer && !input.stepsHaveContextOnly) {
    return { ok: true, detail: "Pass 1 may rely on discovery visual without graded image pick" };
  }
  return { ok: true, detail: "ok" };
}
