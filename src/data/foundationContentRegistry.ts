import { FOUNDATION_WAVE_1_CAPSULES } from "./foundationCapsules";
import { slotForCapsuleId } from "./coreInstructionSlots";
import { LESSON_MEDIA_ASSETS } from "./lessonMediaAssets";

/**
 * V4.9.3 — Parte X: o estado real de cada aula da wave 1.
 *
 * O registro existe para que "quanto falta" seja uma pergunta com resposta
 * verificável, e não uma impressão. E, principalmente, para que ninguém possa
 * marcar `VIDEO_ASSET_PT` como pronto sem existir um arquivo: os dois status
 * de vídeo são DERIVADOS dos assets realmente cadastrados, não declarados à
 * mão. A Parte K1 proíbe fingir que uma aula gravada existe, e a única forma
 * de proibir de verdade é não deixar ninguém escrever esse campo.
 *
 * `QA_PT` e `QA_EN` seguem a mesma regra: QA físico é coisa que uma pessoa
 * faz num aparelho. Enquanto isso não acontecer, o valor é `NOT_PROMOTED` —
 * nunca `PASS` porque a automação passou.
 */

export type ContentStatus = "READY" | "NONE" | "NOT_PROMOTED";

export interface FoundationContentRow {
  capsuleId: string;
  slotId: string | null;
  topicId: string;
  authored: ContentStatus;
  animatedReady: ContentStatus;
  videoScriptReady: ContentStatus;
  videoAssetPt: ContentStatus;
  videoAssetEn: ContentStatus;
  published: ContentStatus;
  qaPt: ContentStatus;
  qaEn: ContentStatus;
}

/** Um asset gravado para esta aula existe? Só o registro de mídia decide. */
function recordedAssetFor(capsuleId: string, locale: "pt-BR" | "en"): ContentStatus {
  const slug = capsuleId.replace(/^capsule:foundation:/, "").replace(/:v\d+$/, "");
  const found = LESSON_MEDIA_ASSETS.some(
    (asset) =>
      asset.kind === "VIDEO" &&
      Boolean(asset.url) &&
      asset.spokenLocale === locale &&
      asset.id.includes(slug)
  );
  return found ? "READY" : "NONE";
}

export const FOUNDATION_WAVE_1_REGISTRY: FoundationContentRow[] = FOUNDATION_WAVE_1_CAPSULES.map(
  (capsule) => {
    const slot = slotForCapsuleId(capsule.id);
    const bothLocales = Boolean(capsule.localized["pt-BR"] && capsule.localized.en);
    const hasSegments =
      (capsule.localized["pt-BR"]?.segments.length ?? 0) > 0 &&
      (capsule.localized.en?.segments.length ?? 0) > 0;

    return {
      capsuleId: capsule.id,
      slotId: slot?.id ?? null,
      topicId: capsule.topicId,
      authored: bothLocales ? "READY" : "NONE",
      // "Animada pronta" é ter os segmentos que o renderer sabe tocar nos dois
      // idiomas — não é um humano dizendo que está pronta.
      animatedReady: hasSegments && capsule.mediaType === "ANIMATED_CAPSULE" ? "READY" : "NONE",
      // O roteiro é gerado da própria cápsula, então existir cápsula autorada
      // é existir roteiro. `build:foundation-packs --check` garante o frescor.
      videoScriptReady: bothLocales ? "READY" : "NONE",
      videoAssetPt: recordedAssetFor(capsule.id, "pt-BR"),
      videoAssetEn: recordedAssetFor(capsule.id, "en"),
      // Publicado = servido pelo catálogo runtime. A wave 1 é embutida.
      published: "NONE",
      qaPt: "NOT_PROMOTED",
      qaEn: "NOT_PROMOTED",
    };
  }
);

export function countRegistry(field: keyof FoundationContentRow, value: ContentStatus): number {
  return FOUNDATION_WAVE_1_REGISTRY.filter((row) => row[field] === value).length;
}
