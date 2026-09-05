import type { InstructionLocale } from "../i18n/config";
import type {
  LessonCapsule,
  LessonCapsuleCompletionRule,
  LessonCapsuleLocalizedContent,
  LessonCapsuleMediaType,
  LessonCapsuleSegment,
} from "./lessonCapsules";
import {
  verifyMediaUrl,
  type LessonMediaAsset,
  type LessonMediaDelivery,
  type LessonMediaFallback,
  type LessonMediaKind,
  type MediaCaptionCue,
} from "./lessonMediaAssets";

/**
 * V4.9.2B — Partes D/E/Z: o catálogo de aulas como DADO, não como código.
 *
 * O objetivo central da remessa é que publicar uma aula nova deixe de exigir
 * uma reconstrução da aplicação. Enquanto cápsulas e assets moram num array
 * TypeScript, toda aula nova é um build, um deploy e uma janela de risco — e
 * o professor depende de um programador para publicar conteúdo.
 *
 * Este módulo é a fronteira entre os dois mundos. Ele recebe JSON de origem
 * externa e devolve objetos do domínio, ou explica exatamente por que recusou.
 * Tudo aqui é função pura: nada de rede, nada de estado. Quem busca o arquivo
 * é `lessonCatalog.ts`; quem decide se o conteúdo é aceitável é este arquivo,
 * e o mesmo código roda no gate de autoria e no navegador do aluno. Um
 * catálogo que passa no `validate:lesson-catalog` não pode ser recusado em
 * produção, porque é literalmente a mesma função.
 *
 * A postura é de desconfiança: um manifesto é conteúdo de autoria, editável
 * por quem não escreve código e servido por HTTP. Campo desconhecido é
 * ignorado, campo inválido derruba só o seu próprio item, e nenhum erro de
 * autoria pode derrubar o app — uma aula malformada some do catálogo, não
 * quebra a Jornada de quem já estava estudando.
 */

export interface CatalogProblem {
  /** Caminho dentro do manifesto, para o autor achar o erro sem adivinhar. */
  at: string;
  code:
    | "NOT_AN_OBJECT"
    | "UNSUPPORTED_VERSION"
    | "MISSING_FIELD"
    | "INVALID_TYPE"
    | "INVALID_ENUM"
    | "UNSAFE_URL"
    | "DUPLICATE_ID"
    | "EMPTY_SEGMENTS"
    | "MISSING_LOCALE"
    | "UNKNOWN_MEDIA_ASSET"
    | "LOCALE_SPEAKS_WRONG_LANGUAGE";
  detail?: string;
}

export interface ParsedLessonCatalog {
  version: number;
  capsules: LessonCapsule[];
  assets: LessonMediaAsset[];
  problems: CatalogProblem[];
}

/** Só esta versão é lida. Um manifesto do futuro é recusado, não adivinhado. */
export const LESSON_CATALOG_VERSION = 1;

const MEDIA_TYPES: LessonCapsuleMediaType[] = ["ANIMATED_CAPSULE", "VIDEO_CAPSULE"];
const COMPLETION_RULES: LessonCapsuleCompletionRule[] = [
  "VIEW_ALL_SEGMENTS",
  "MEDIA_ENDED",
  "INTERACTION_COMPLETE",
];
const SEGMENT_KINDS: LessonCapsuleSegment["kind"][] = [
  "ORIENT",
  "EXPLAIN",
  "DEMONSTRATE",
  "REPLAY",
  "CHECK",
];
const MEDIA_KINDS: LessonMediaKind[] = ["VIDEO", "INTERNAL_ANIMATION"];
const DELIVERIES: LessonMediaDelivery[] = ["DIRECT_MP4", "HLS", "INTERNAL"];
const FALLBACKS: LessonMediaFallback[] = ["INTERACTIVE_SEGMENTS", "TRANSCRIPT_ONLY"];
const LOCALES: InstructionLocale[] = ["pt-BR", "en"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Texto de autoria. O limite não é estético: um campo sem teto vira vetor de
 * negação de serviço no layout, e nada legítimo numa legenda passa disso.
 */
const MAX_TEXT = 4000;

function readString(
  source: Record<string, unknown>,
  key: string,
  at: string,
  problems: CatalogProblem[],
  { required = true, max = MAX_TEXT }: { required?: boolean; max?: number } = {}
): string | undefined {
  const value = source[key];
  if (value === undefined || value === null || value === "") {
    if (required) problems.push({ at: `${at}.${key}`, code: "MISSING_FIELD" });
    return undefined;
  }
  if (typeof value !== "string") {
    problems.push({ at: `${at}.${key}`, code: "INVALID_TYPE", detail: typeof value });
    return undefined;
  }
  return value.slice(0, max);
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  at: string,
  problems: CatalogProblem[],
  { min = 0 }: { min?: number } = {}
): number | undefined {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    problems.push({ at: `${at}.${key}`, code: "INVALID_TYPE", detail: String(value) });
    return undefined;
  }
  return value;
}

function readEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  allowed: T[],
  at: string,
  problems: CatalogProblem[]
): T | undefined {
  const value = source[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    problems.push({ at: `${at}.${key}`, code: "INVALID_ENUM", detail: String(value) });
    return undefined;
  }
  return value as T;
}

function readCues(value: unknown, at: string, problems: CatalogProblem[]): MediaCaptionCue[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    problems.push({ at, code: "INVALID_TYPE", detail: "captions precisa ser lista" });
    return [];
  }
  const cues: MediaCaptionCue[] = [];
  value.forEach((entry, index) => {
    const where = `${at}[${index}]`;
    if (!isObject(entry)) {
      problems.push({ at: where, code: "NOT_AN_OBJECT" });
      return;
    }
    const start = readNumber(entry, "startSeconds", where, problems);
    const end = readNumber(entry, "endSeconds", where, problems);
    const text = readString(entry, "text", where, problems);
    if (start === undefined || end === undefined || text === undefined) return;
    if (end <= start) {
      problems.push({ at: where, code: "INVALID_TYPE", detail: "endSeconds precisa ser maior que startSeconds" });
      return;
    }
    cues.push({ startSeconds: start, endSeconds: end, text });
  });
  return cues;
}

function parseAsset(raw: unknown, index: number, problems: CatalogProblem[]): LessonMediaAsset | undefined {
  const at = `assets[${index}]`;
  if (!isObject(raw)) {
    problems.push({ at, code: "NOT_AN_OBJECT" });
    return undefined;
  }
  const id = readString(raw, "id", at, problems, { max: 200 });
  const version = readNumber(raw, "version", at, problems, { min: 1 });
  const kind = readEnum(raw, "kind", MEDIA_KINDS, at, problems);
  const delivery = readEnum(raw, "delivery", DELIVERIES, at, problems);
  const durationSeconds = readNumber(raw, "durationSeconds", at, problems, { min: 1 });
  const fallback = readEnum(raw, "fallback", FALLBACKS, at, problems);
  if (!id || version === undefined || !kind || !delivery || durationSeconds === undefined || !fallback) {
    return undefined;
  }

  const url = readString(raw, "url", at, problems, { required: kind === "VIDEO", max: 2000 });
  // Parte Y — a URL vem de arquivo de autoria e vai direto para um `src`.
  // Sem allowlist, cadastrar uma aula seria o bastante para injetar script.
  if (url !== undefined) {
    const verdict = verifyMediaUrl(url);
    if (!verdict.safe) {
      problems.push({ at: `${at}.url`, code: "UNSAFE_URL", detail: verdict.reason });
      return undefined;
    }
  }
  const poster = readString(raw, "poster", at, problems, { required: false, max: 2000 });
  if (poster !== undefined && !verifyMediaUrl(poster).safe) {
    problems.push({ at: `${at}.poster`, code: "UNSAFE_URL" });
    return undefined;
  }

  const spokenLocale = raw.spokenLocale;
  if (spokenLocale !== undefined && !LOCALES.includes(spokenLocale as InstructionLocale)) {
    problems.push({ at: `${at}.spokenLocale`, code: "INVALID_ENUM", detail: String(spokenLocale) });
    return undefined;
  }

  return {
    id,
    version,
    kind,
    delivery,
    url,
    poster,
    mimeType: readString(raw, "mimeType", at, problems, { required: false, max: 120 }),
    durationSeconds,
    spokenLocale: spokenLocale as InstructionLocale | undefined,
    languageNeutral: raw.languageNeutral === true,
    captions: readCues(raw.captions, `${at}.captions`, problems),
    transcript: readString(raw, "transcript", at, problems, { required: false }) ?? "",
    fallback,
  };
}

function parseLocalized(
  raw: unknown,
  at: string,
  problems: CatalogProblem[]
): LessonCapsuleLocalizedContent | undefined {
  if (!isObject(raw)) {
    problems.push({ at, code: "NOT_AN_OBJECT" });
    return undefined;
  }
  const title = readString(raw, "title", at, problems, { max: 200 });
  const objective = readString(raw, "objective", at, problems, { max: 600 });
  if (!title || !objective) return undefined;

  const segmentsRaw = raw.segments;
  const segments: LessonCapsuleSegment[] = [];
  if (Array.isArray(segmentsRaw)) {
    segmentsRaw.forEach((entry, index) => {
      const where = `${at}.segments[${index}]`;
      if (!isObject(entry)) {
        problems.push({ at: where, code: "NOT_AN_OBJECT" });
        return;
      }
      const id = readString(entry, "id", where, problems, { max: 120 });
      const kind = readEnum(entry, "kind", SEGMENT_KINDS, where, problems);
      const segmentTitle = readString(entry, "title", where, problems, { max: 200 });
      const body = readString(entry, "body", where, problems, { max: 1200 });
      if (!id || !kind || !segmentTitle || !body) return;
      segments.push({
        id,
        kind,
        title: segmentTitle,
        body,
        hanzi: readString(entry, "hanzi", where, problems, { required: false, max: 120 }),
        pinyin: readString(entry, "pinyin", where, problems, { required: false, max: 200 }),
        meaning: readString(entry, "meaning", where, problems, { required: false, max: 400 }),
        audioText: readString(entry, "audioText", where, problems, { required: false, max: 200 }),
      });
    });
  }

  return {
    title,
    objective,
    transcript: readString(raw, "transcript", at, problems, { required: false }) ?? "",
    captions: readCues(raw.captions, `${at}.captions`, problems),
    segments,
    mediaAssetId: readString(raw, "mediaAssetId", at, problems, { required: false, max: 200 }),
  };
}

function parseCapsule(
  raw: unknown,
  index: number,
  assetsById: Map<string, LessonMediaAsset>,
  problems: CatalogProblem[]
): LessonCapsule | undefined {
  const at = `capsules[${index}]`;
  if (!isObject(raw)) {
    problems.push({ at, code: "NOT_AN_OBJECT" });
    return undefined;
  }
  const id = readString(raw, "id", at, problems, { max: 200 });
  const topicId = readString(raw, "topicId", at, problems, { max: 200 });
  const mediaType = readEnum(raw, "mediaType", MEDIA_TYPES, at, problems);
  const completionRule = readEnum(raw, "completionRule", COMPLETION_RULES, at, problems);
  const durationSeconds = readNumber(raw, "durationSeconds", at, problems, { min: 1 });
  if (!id || !topicId || !mediaType || !completionRule || durationSeconds === undefined) return undefined;

  const targets = Array.isArray(raw.knowledgeTargets)
    ? raw.knowledgeTargets.filter((value): value is string => typeof value === "string")
    : [];

  const localizedRaw = raw.localized;
  if (!isObject(localizedRaw)) {
    problems.push({ at: `${at}.localized`, code: "NOT_AN_OBJECT" });
    return undefined;
  }

  // Parte T: os dois cursos são cidadãos iguais. Publicar uma aula só em
  // português deixaria o aluno de inglês com uma cápsula em branco no meio da
  // Jornada — pior do que não ter a aula.
  const localized = {} as Record<InstructionLocale, LessonCapsuleLocalizedContent>;
  for (const locale of LOCALES) {
    const content = parseLocalized(localizedRaw[locale], `${at}.localized.${locale}`, problems);
    if (!content) {
      problems.push({ at: `${at}.localized.${locale}`, code: "MISSING_LOCALE" });
      return undefined;
    }
    if (content.mediaAssetId) {
      const asset = assetsById.get(content.mediaAssetId);
      if (!asset) {
        problems.push({
          at: `${at}.localized.${locale}.mediaAssetId`,
          code: "UNKNOWN_MEDIA_ASSET",
          detail: content.mediaAssetId,
        });
        return undefined;
      }
      // Um asset falado no idioma errado é pior do que nenhum: o aluno ouve
      // uma língua que não escolheu e não tem como saber que houve engano.
      if (!asset.languageNeutral && asset.spokenLocale && asset.spokenLocale !== locale) {
        problems.push({
          at: `${at}.localized.${locale}.mediaAssetId`,
          code: "LOCALE_SPEAKS_WRONG_LANGUAGE",
          detail: `${asset.id} fala ${asset.spokenLocale}`,
        });
        return undefined;
      }
    }
    localized[locale] = content;
  }

  // Segmentos são o fallback obrigatório da Parte O: sem eles, um vídeo que
  // não carrega deixa uma cápsula CORE sem saída.
  if (!localized["pt-BR"].segments.length || !localized.en.segments.length) {
    problems.push({ at: `${at}.localized`, code: "EMPTY_SEGMENTS" });
    return undefined;
  }

  return {
    id,
    topicId,
    afterTopicId: readString(raw, "afterTopicId", at, problems, { required: false, max: 200 }),
    mediaType,
    durationSeconds,
    poster: readString(raw, "poster", at, problems, { required: false, max: 2000 }),
    completionRule,
    knowledgeTargets: targets,
    localized,
  };
}

/**
 * Lê um manifesto e devolve o que der para aproveitar.
 *
 * Nunca lança. Um item inválido é descartado com a razão registrada; os
 * válidos continuam. Publicar conteúdo não pode ser uma operação em que um
 * erro de digitação tira a aplicação do ar.
 */
export function parseLessonCatalog(raw: unknown): ParsedLessonCatalog {
  const problems: CatalogProblem[] = [];
  try {
    return parseChecked(raw, problems);
  } catch (error) {
    // Rede de segurança, não tratamento de erro. Cada campo já é validado
    // acima; se algo escapar, a consequência precisa ser "esta aula não
    // aparece", nunca uma tela branca no meio do estudo de alguém.
    problems.push({
      at: "$",
      code: "INVALID_TYPE",
      detail: error instanceof Error ? error.message : String(error),
    });
    return { version: LESSON_CATALOG_VERSION, capsules: [], assets: [], problems };
  }
}

function parseChecked(raw: unknown, problems: CatalogProblem[]): ParsedLessonCatalog {
  const empty: ParsedLessonCatalog = { version: LESSON_CATALOG_VERSION, capsules: [], assets: [], problems };

  if (!isObject(raw)) {
    problems.push({ at: "$", code: "NOT_AN_OBJECT" });
    return empty;
  }
  if (raw.version !== LESSON_CATALOG_VERSION) {
    problems.push({ at: "$.version", code: "UNSUPPORTED_VERSION", detail: String(raw.version) });
    return empty;
  }

  const assets: LessonMediaAsset[] = [];
  const assetsById = new Map<string, LessonMediaAsset>();
  const rawAssets = Array.isArray(raw.assets) ? raw.assets : [];
  rawAssets.forEach((entry, index) => {
    const asset = parseAsset(entry, index, problems);
    if (!asset) return;
    if (assetsById.has(asset.id)) {
      problems.push({ at: `assets[${index}].id`, code: "DUPLICATE_ID", detail: asset.id });
      return;
    }
    assetsById.set(asset.id, asset);
    assets.push(asset);
  });

  const capsules: LessonCapsule[] = [];
  const capsuleIds = new Set<string>();
  const rawCapsules = Array.isArray(raw.capsules) ? raw.capsules : [];
  rawCapsules.forEach((entry, index) => {
    const capsule = parseCapsule(entry, index, assetsById, problems);
    if (!capsule) return;
    if (capsuleIds.has(capsule.id)) {
      problems.push({ at: `capsules[${index}].id`, code: "DUPLICATE_ID", detail: capsule.id });
      return;
    }
    capsuleIds.add(capsule.id);
    capsules.push(capsule);
  });

  return { version: LESSON_CATALOG_VERSION, capsules, assets, problems };
}
